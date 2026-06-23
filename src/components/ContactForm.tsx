"use client";

import { useState, type FormEvent } from "react";
import { content } from "@/data/content";
import { useLanguage } from "@/context/LanguageContext";

type Status = "idle" | "sending" | "success" | "error";

export default function ContactForm() {
  const { lang } = useLanguage();
  const t = content[lang].contact;
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.append(
      "access_key",
      process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY ?? ""
    );

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      });
      const result = await response.json();
      if (result.success) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        required
        name="name"
        type="text"
        placeholder={t.formName}
        className="rounded-xl border border-white/10 bg-card px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
      />
      <input
        required
        name="email"
        type="email"
        placeholder={t.formEmail}
        className="rounded-xl border border-white/10 bg-card px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
      />
      <textarea
        required
        name="message"
        rows={4}
        placeholder={t.formMessage}
        className="resize-none rounded-xl border border-white/10 bg-card px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {status === "sending" ? t.formSending : t.formSubmit}
      </button>

      {status === "success" && (
        <p className="text-sm text-green-400">{t.formSuccess}</p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-400">{t.formError}</p>
      )}
    </form>
  );
}

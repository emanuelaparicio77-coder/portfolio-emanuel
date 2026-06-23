"use client";

import { content } from "@/data/content";
import { useLanguage } from "@/context/LanguageContext";
import { site } from "@/data/site";
import RevealSection from "./RevealSection";
import ContactForm from "./ContactForm";

export default function Contact() {
  const { lang } = useLanguage();
  const t = content[lang].contact;
  const waHref = `https://wa.me/${site.whatsappNumber}`;

  return (
    <section id="contact" className="scroll-mt-24 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <RevealSection>
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            {t.heading}
          </h2>
          <p className="mt-2 text-foreground/60">{t.subheading}</p>
        </RevealSection>

        <div className="mt-12 grid gap-10 md:grid-cols-2">
          <RevealSection delay={0.1} className="flex flex-col gap-4">
            <a
              href={`mailto:${site.email}`}
              className="group flex items-center gap-3 rounded-xl border border-white/10 bg-card px-5 py-4 transition-colors hover:border-accent/40"
            >
              <span className="text-foreground/50">Email</span>
              <span className="font-medium transition-colors group-hover:text-accent">
                {site.email}
              </span>
            </a>

            <a
              href={site.github}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-white/10 bg-card px-5 py-4 transition-colors hover:border-accent/40"
            >
              <span className="text-foreground/50">GitHub</span>
              <span className="font-medium transition-colors group-hover:text-accent">
                {site.github.replace("https://", "")}
              </span>
            </a>

            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-white/10 bg-card px-5 py-4 transition-colors hover:border-green-400/40"
            >
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
              </span>
              <span className="font-medium transition-colors group-hover:text-green-400">
                {t.whatsapp}
              </span>
            </a>
          </RevealSection>

          <RevealSection delay={0.2}>
            <ContactForm />
          </RevealSection>
        </div>
      </div>
    </section>
  );
}

"use client";

import { content } from "@/data/content";
import { useLanguage } from "@/context/LanguageContext";

export default function Footer() {
  const { lang } = useLanguage();
  const t = content[lang].footer;

  return (
    <footer className="border-t border-white/5 px-6 py-8 text-center text-sm text-foreground/50">
      <p>
        © {new Date().getFullYear()} Emanuel Aparicio. {t.rights}
      </p>
    </footer>
  );
}

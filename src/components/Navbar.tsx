"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { content } from "@/data/content";
import { useLanguage } from "@/context/LanguageContext";

const sections = [
  { id: "projects", key: "work" as const },
  { id: "about", key: "about" as const },
  { id: "contact", key: "contact" as const },
];

export default function Navbar() {
  const { lang, setLang } = useLanguage();
  const pathname = usePathname();
  const t = content[lang].nav;

  // When on /story, prefix hash links with "/" so they navigate home first
  const hp = pathname === "/" ? "" : "/";

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          Emanuel<span className="text-accent">.</span>
        </Link>

        <nav className="flex items-center gap-3 sm:gap-6">
          <div className="hidden items-center gap-4 sm:flex sm:gap-6">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`${hp}#${section.id}`}
                className="text-sm text-foreground/70 transition-colors hover:text-foreground"
              >
                {t[section.key]}
              </a>
            ))}
            <Link
              href="/story"
              className={`text-sm transition-colors hover:text-foreground ${
                pathname === "/story" ? "text-accent" : "text-foreground/70"
              }`}
            >
              {t.story}
            </Link>
          </div>

          <div className="flex items-center rounded-full border border-white/10 p-0.5 text-xs font-medium">
            {(["en", "es"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLang(option)}
                aria-pressed={lang === option}
                className={`rounded-full px-2.5 py-1 transition-colors ${
                  lang === option
                    ? "bg-accent text-white"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}

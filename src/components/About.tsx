"use client";

import { content } from "@/data/content";
import { useLanguage } from "@/context/LanguageContext";
import Chip from "./Chip";
import RevealSection from "./RevealSection";

const stack = ["Next.js", "Supabase", "Vercel", "TypeScript", "Godot", "n8n"];

export default function About() {
  const { lang } = useLanguage();
  const t = content[lang].about;

  return (
    <section id="about" className="scroll-mt-24 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <RevealSection>
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            {t.heading}
          </h2>
        </RevealSection>

        <div className="mt-12 flex flex-col items-center gap-10 md:flex-row md:items-start">
          <RevealSection delay={0.1} className="shrink-0">
            <div className="h-40 w-40 rounded-full bg-gradient-to-br from-accent to-[#2b1f6b] shadow-[0_0_60px_rgba(108,99,255,0.35)] ring-1 ring-white/10" />
          </RevealSection>

          <RevealSection delay={0.2} className="max-w-2xl">
            <p className="text-lg leading-relaxed text-foreground/80">
              {t.bio}
            </p>
            <h3 className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-foreground/50">
              {t.stackHeading}
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {stack.map((tech) => (
                <Chip key={tech} label={tech} />
              ))}
            </div>
          </RevealSection>
        </div>
      </div>
    </section>
  );
}

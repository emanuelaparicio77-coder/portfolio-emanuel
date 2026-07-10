"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { storyContent } from "@/data/story";
import RevealSection from "./RevealSection";
import type { Variant, Mode } from "./StoryScene";

const StoryScene = dynamic(() => import("./StoryScene"), {
  ssr: false,
  loading: () => <div className="w-full h-full animate-pulse bg-[#080610]" />,
});

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

export default function StoryContent() {
  const { lang } = useLanguage();
  const t = storyContent[lang];
  const [variant, setVariant] = useState<Variant>("pop");
  const [mode, setMode]       = useState<Mode>("personal");

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="pt-32 pb-10">
        <div className="mx-auto max-w-6xl px-6">
          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-3 text-sm uppercase tracking-[0.2em] text-accent"
          >
            Emanuel Aparicio
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl md:text-7xl"
          >
            {t.heading}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-5 max-w-xl text-lg text-foreground/60"
          >
            {t.subheading}
          </motion.p>

          {/* Toggles */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            {/* Style toggle */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-widest text-foreground/40">Style</span>
              <div className="flex rounded-full border border-white/10 p-0.5 text-xs font-bold">
                {(["pop", "neon"] as Variant[]).map((v) => (
                  <button key={v} type="button" onClick={() => setVariant(v)}
                    className={`rounded-full px-4 py-1.5 transition-all duration-300 ${
                      variant === v
                        ? v === "pop"
                          ? "bg-gradient-to-r from-[#ff6b6b] to-[#ffd700] text-black shadow-[0_0_14px_rgba(255,107,107,0.5)]"
                          : "bg-[#6c63ff] text-white shadow-[0_0_14px_rgba(108,99,255,0.7)]"
                        : "text-foreground/50 hover:text-foreground"
                    }`}
                  >
                    {v === "pop" ? "Pop" : "Neon"}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode toggle */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-widest text-foreground/40">Version</span>
              <div className="flex rounded-full border border-white/10 p-0.5 text-xs font-bold">
                {(["personal", "pro"] as Mode[]).map((m) => (
                  <button key={m} type="button" onClick={() => setMode(m)}
                    className={`rounded-full px-4 py-1.5 transition-all duration-300 ${
                      mode === m
                        ? m === "personal"
                          ? "bg-gradient-to-r from-[#a855f7] to-[#6c63ff] text-white shadow-[0_0_14px_rgba(168,85,247,0.5)]"
                          : "bg-foreground text-background shadow-[0_0_14px_rgba(255,255,255,0.15)]"
                        : "text-foreground/50 hover:text-foreground"
                    }`}
                  >
                    {m === "personal" ? "Personal" : "Pro"}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Floating islands world ────────────────────────── */}
      <div style={{ height: "clamp(480px, 68vh, 700px)", position: "relative", overflow: "hidden" }}>
        <StoryScene variant={variant} lang={lang} mode={mode} />

        {/* Hint */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2"
        >
          <span className="text-[11px] uppercase tracking-[0.22em] text-white/25">
            {lang === "en" ? "Drag to rotate · hover to explore" : "Arrastra para rotar · hover para explorar"}
          </span>
        </motion.div>
      </div>

      {/* ── Timeline ──────────────────────────────────────── */}
      <section className="py-20 pb-32">
        <div className="mx-auto max-w-2xl px-6">
          <RevealSection>
            <h2 className="mb-16 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              {t.timelineHeading}
            </h2>
          </RevealSection>

          <div className="relative pl-8">
            <div className="absolute left-0 top-2 bottom-2 w-px bg-gradient-to-b from-accent/60 via-accent/20 to-transparent" />

            {t.milestones.map((m, i) => (
              <RevealSection key={m.year} delay={i * 0.1} className="relative mb-14 last:mb-0">
                <div className="absolute -left-8 top-1.5 flex h-4 w-4 items-center justify-center">
                  <div className="h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-accent/20 ring-offset-1 ring-offset-background" />
                </div>

                <motion.div variants={itemVariants}>
                  <span className="font-display text-3xl font-extrabold text-accent">{m.year}</span>
                  <p className="mt-0.5 text-xs font-medium uppercase tracking-widest text-foreground/40">{m.location}</p>
                  <p className="mt-3 text-base leading-relaxed text-foreground/75">{m.text}</p>

                  <div className="mt-5 flex h-44 max-w-sm items-center justify-center rounded-xl border border-dashed border-white/15 bg-card/40">
                    <div className="text-center">
                      <svg className="mx-auto mb-2 h-7 w-7 text-foreground/20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M9 9.75a.75.75 0 100-1.5.75.75 0 000 1.5zm-3.75 9h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0018.75 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 005.25 19.5z" />
                      </svg>
                      <p className="text-xs text-foreground/25">Photo coming soon</p>
                    </div>
                  </div>
                </motion.div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

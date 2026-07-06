"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { storyContent, LOCATION_NAMES } from "@/data/story";
import RevealSection from "./RevealSection";

const StoryGlobe = dynamic(() => import("./StoryGlobe"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full animate-pulse rounded-2xl bg-card/30"
      style={{ height: "clamp(280px, 60vmin, 520px)" }}
    />
  ),
});

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

export default function StoryContent() {
  const { lang } = useLanguage();
  const t = storyContent[lang];

  return (
    <>
      {/* ── Hero ────────────────────────────────────────── */}
      <section className="pt-32 pb-12">
        <div className="mx-auto max-w-6xl px-6">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-3 text-sm uppercase tracking-[0.2em] text-accent"
          >
            Emanuel Aparicio
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl md:text-7xl"
          >
            {t.heading}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-5 max-w-xl text-lg text-foreground/60"
          >
            {t.subheading}
          </motion.p>
        </div>
      </section>

      {/* ── Globe ───────────────────────────────────────── */}
      <section className="py-8">
        <div className="mx-auto max-w-3xl px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="overflow-hidden rounded-2xl border border-white/5"
          >
            <StoryGlobe />
          </motion.div>

          {/* Location legend */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4"
          >
            {t.locations.map((loc, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 rounded-xl border border-white/8 bg-card px-3 py-2.5"
              >
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-accent">{loc.label}</p>
                  <p className="truncate text-xs text-foreground/50">{LOCATION_NAMES[i]}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Timeline ────────────────────────────────────── */}
      <section className="py-20 pb-32">
        <div className="mx-auto max-w-2xl px-6">
          <RevealSection>
            <h2 className="mb-16 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              {t.timelineHeading}
            </h2>
          </RevealSection>

          {/* Vertical timeline */}
          <div className="relative pl-8">
            {/* Continuous line */}
            <div className="absolute left-0 top-2 bottom-2 w-px bg-gradient-to-b from-accent/60 via-accent/20 to-transparent" />

            {t.milestones.map((m, i) => (
              <RevealSection key={m.year} delay={i * 0.1} className="relative mb-14 last:mb-0">
                {/* Timeline dot */}
                <div className="absolute -left-8 top-1.5 flex h-4 w-4 items-center justify-center">
                  <div className="h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-accent/20 ring-offset-1 ring-offset-background" />
                </div>

                {/* Content */}
                <motion.div variants={itemVariants}>
                  <span className="font-display text-3xl font-extrabold text-accent">
                    {m.year}
                  </span>
                  <p className="mt-0.5 text-xs font-medium uppercase tracking-widest text-foreground/40">
                    {m.location}
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-foreground/75">
                    {m.text}
                  </p>

                  {/* Photo placeholder */}
                  <div className="mt-5 flex h-44 max-w-sm items-center justify-center rounded-xl border border-dashed border-white/15 bg-card/40">
                    <div className="text-center">
                      <svg
                        className="mx-auto mb-2 h-7 w-7 text-foreground/20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        viewBox="0 0 24 24"
                      >
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

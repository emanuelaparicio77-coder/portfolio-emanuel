"use client";

import { motion, type Variants } from "framer-motion";
import { content } from "@/data/content";
import { useLanguage } from "@/context/LanguageContext";
import HeroDotGrid from "./HeroDotGrid";

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export default function Hero() {
  const { lang } = useLanguage();
  const t = content[lang].hero;

  return (
    <section
      id="hero"
      className="relative flex min-h-screen items-center overflow-hidden bg-background"
    >
      <HeroDotGrid />
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-24">
        <motion.div initial="hidden" animate="visible" variants={container}>
          <motion.p
            variants={item}
            className="mb-4 text-sm uppercase tracking-[0.2em] text-accent"
          >
            {t.kicker}
          </motion.p>
          <motion.h1
            variants={item}
            className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
          >
            {t.name}
          </motion.h1>
          <motion.p
            variants={item}
            className="mt-6 max-w-xl text-lg text-foreground/70 sm:text-xl"
          >
            {t.tagline}
          </motion.p>
          <motion.div variants={item} className="mt-10 flex flex-wrap gap-4">
            <a
              href="#projects"
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(108,99,255,0.5)]"
            >
              {t.ctaWork}
            </a>
            <a
              href="#contact"
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              {t.ctaContact}
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useLanguage } from "@/context/LanguageContext";
import Chip from "./Chip";

const StoryScene = dynamic(() => import("./StoryScene"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-[#080610]" />,
});

const COPY = {
  en: { badge: "Interactive · 3D", title: "My Journey", sub: "An interactive 3D world of islands — my story from Venezuela to Venestock.", cta: "Explore" },
  es: { badge: "Interactivo · 3D", title: "Mi Historia", sub: "Un mundo de islas 3D interactivo — mi historia de Venezuela a Venestock.", cta: "Explorar" },
} as const;

const STACK = ["React Three Fiber", "Three.js", "WebGL"];

export default function StoryCard() {
  const { lang } = useLanguage();
  const t = COPY[lang];
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  // Monta la escena WebGL solo cuando el tile está cerca del viewport.
  // Usa getBoundingClientRect + scroll (más robusto que IntersectionObserver
  // en pestañas throttled) y se auto-limpia al entrar en vista.
  useEffect(() => {
    let done = false;
    const check = () => {
      const el = ref.current;
      if (!el || done) return;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight + 300 && r.bottom > -300) {
        done = true;
        setInView(true);
        window.removeEventListener("scroll", check);
        window.removeEventListener("resize", check);
      }
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  return (
    <Link
      href="/story"
      aria-label={t.title}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_0_32px_rgba(108,99,255,0.25)]"
    >
      {/* Thumbnail = escena 3D en vivo, mismo 16:9 que las demás cards */}
      <div ref={ref} className="relative aspect-video overflow-hidden bg-[#060910]">
        {inView ? (
          <StoryScene variant="pop" lang={lang} mode="pro" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#0a1830] via-[#060910] to-[#0a0618]" />
        )}
        {/* Escudo de clic: evita drag/hover del canvas; el card entero navega a /story */}
        <div className="absolute inset-0" />
        {/* Badge */}
        <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/80 backdrop-blur">
          {t.badge}
        </span>
      </div>

      {/* Contenido — mismo layout que ProjectCard */}
      <div className="p-6">
        <h3 className="font-display text-xl font-bold">{t.title}</h3>
        <p className="mt-2 text-sm text-foreground/70">{t.sub}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {STACK.map((tech) => (
            <Chip key={tech} label={tech} />
          ))}
        </div>
        <div className="mt-6 flex gap-4 text-sm font-semibold">
          <span className="inline-flex items-center gap-1 text-accent transition-colors group-hover:text-white">
            {t.cta}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform duration-300 group-hover:translate-x-1">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

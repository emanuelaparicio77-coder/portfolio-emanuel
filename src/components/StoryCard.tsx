"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useLanguage } from "@/context/LanguageContext";

const StoryScene = dynamic(() => import("./StoryScene"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-[#080610]" />,
});

const COPY = {
  en: { badge: "Interactive · 3D", title: "My Journey", sub: "A world of islands built with React Three Fiber", cta: "Explore" },
  es: { badge: "Interactivo · 3D", title: "Mi Historia", sub: "Un mundo de islas hecho con React Three Fiber", cta: "Explorar" },
} as const;

export default function StoryCard() {
  const { lang } = useLanguage();
  const t = COPY[lang];
  const ref = useRef<HTMLAnchorElement>(null);
  const [inView, setInView] = useState(false);

  // Monta la escena WebGL solo cuando el tile está cerca del viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "250px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Link
      ref={ref}
      href="/story"
      aria-label={t.title}
      className="group relative block aspect-square h-full overflow-hidden rounded-2xl border border-white/10 bg-[#060910] transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_0_32px_rgba(108,99,255,0.25)]"
    >
      {/* Escena 3D en vivo (auto-rota) */}
      <div className="absolute inset-0">
        {inView ? (
          <StoryScene variant="pop" lang={lang} mode="personal" fov={60} camPos={[0, 9, 21]} />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#0a1830] via-[#060910] to-[#0a0618]" />
        )}
      </div>

      {/* Escudo de clic: bloquea drag/hover del canvas; todo el tile navega a /story */}
      <div className="absolute inset-0 z-10" />

      {/* Degradado + texto */}
      <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-black/85 via-black/10 to-black/35" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex p-5">
        <span className="rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/80 backdrop-blur">
          {t.badge}
        </span>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-6">
        <h3 className="font-display text-2xl font-extrabold text-white">{t.title}</h3>
        <p className="mt-1 max-w-[16rem] text-sm text-white/70">{t.sub}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent transition-colors group-hover:text-white">
          {t.cta}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform duration-300 group-hover:translate-x-1">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

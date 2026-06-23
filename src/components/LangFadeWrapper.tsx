"use client";

import type { ReactNode } from "react";
import { useLanguage } from "@/context/LanguageContext";

export default function LangFadeWrapper({ children }: { children: ReactNode }) {
  const { isTransitioning } = useLanguage();

  return (
    <div
      className={`transition-opacity duration-150 ${
        isTransitioning ? "opacity-0" : "opacity-100"
      }`}
    >
      {children}
    </div>
  );
}

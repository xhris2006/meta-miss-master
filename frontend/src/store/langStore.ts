"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { translations, type Lang } from "@/lib/i18n";

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: "fr" as Lang,
      setLang: (lang: Lang) => set({ lang }),
    }),
    { name: "mmm-lang" }
  )
);

// Hook raccourci — lit toujours depuis translations en live, jamais depuis le cache
// Ainsi les nouvelles clés ajoutées sont toujours disponibles
export function useT() {
  const lang = useLangStore((s) => s.lang);
  return translations[lang] ?? translations.fr;
}

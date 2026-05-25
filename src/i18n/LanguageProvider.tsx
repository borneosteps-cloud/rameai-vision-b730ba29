import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { DEFAULT_LANG, DICT, type LangCode } from "./dict";

type Ctx = {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<Ctx | undefined>(undefined);

const STORAGE_KEY = "rameal.lang";

function readStored(): LangCode {
  if (typeof window === "undefined") return DEFAULT_LANG;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "en" || v === "id" ? v : DEFAULT_LANG;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(DEFAULT_LANG);

  // Hydrate from localStorage on mount (avoids SSR mismatch).
  useEffect(() => {
    const stored = readStored();
    if (stored !== lang) setLangState(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLang = useCallback((l: LangCode) => {
    setLangState(l);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, l);
      document.documentElement.lang = l;
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = DICT[lang];
      const raw = dict[key] ?? DICT.en[key] ?? key;
      if (!vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>
  );
}

export function useLang(): Ctx {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used inside <LanguageProvider>");
  return ctx;
}

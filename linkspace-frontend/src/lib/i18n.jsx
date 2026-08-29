import { createContext, useContext, useMemo, useState } from "react";
import { copy } from "./copy.js";

const KEY = "linksparks.lang";
const I18nContext = createContext(null);

function detectLang() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "zh" || saved === "en") return saved;
  } catch {
    /* ignore */
  }
  const nav = navigator.language || "";
  return nav.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function interpolate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? "");
}

function lookup(dict, key) {
  return key.split(".").reduce((node, part) => node?.[part], dict);
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectLang);

  const value = useMemo(() => {
    const t = (key, vars = {}) => {
      const raw = lookup(copy[lang], key) ?? lookup(copy.en, key) ?? key;
      return typeof raw === "string" ? interpolate(raw, vars) : key;
    };
    const setLang = (next) => {
      setLangState(next);
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* ignore */
      }
      document.documentElement.lang = next === "zh" ? "zh-Hant" : "en";
    };
    document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en";
    return { lang, setLang, t };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

export function videoTitle(video, lang) {
  return lang === "zh" ? video.titleZh : video.titleEn;
}

export function clubCopy(club, lang) {
  if (lang === "zh") {
    return { name: club.nameZh, tagline: club.taglineZh };
  }
  return { name: club.nameEn, tagline: club.taglineEn };
}

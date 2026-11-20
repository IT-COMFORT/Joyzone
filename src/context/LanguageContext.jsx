import React, { createContext, useContext, useMemo, useState } from "react";
import { defaultContent } from "../data/defaultContent.js";
import { CONTENT_LANGUAGES, mergeSiteContent } from "../utils/content.js";
import { getStoredLanguage, setStoredLanguage } from "../utils/storageKeys.js";

export const LanguageContext = createContext({
  lang: "uz",
  setLang: () => {},
  content: defaultContent,
  contentLoading: false,
  contentError: "",
  isEditMode: false,
});

export function LanguageProvider({ children, content = defaultContent, ...providerState }) {
  const [lang, setLangRaw] = useState(() => getStoredLanguage("uz"));

  const setLang = (language) => {
    if (!CONTENT_LANGUAGES.includes(language)) return;
    setLangRaw(language);
    setStoredLanguage(language);
  };

  const value = useMemo(() => ({
    lang,
    setLang,
    content: mergeSiteContent(content),
    ...providerState,
  }), [lang, content, providerState]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

// For numbers: browsers have no Uzbek number format, and "1 500 000" reads right in both.
const NUMBER_LOCALES = { uz: "ru-RU", ru: "ru-RU", en: "en-GB" };

function fillText(text, vars) {
  if (!vars || typeof text !== "string") return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? vars[name] : match));
}

function pluralForm(lang, count) {
  if (lang === "en") return count === 1 ? "one" : "many";
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "one";
  return mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "few" : "many";
}

/**
 * Text lookup for the current language. t("key", { name }) fills {name};
 * plural("key", n) picks key_one / key_few / key_many and fills {n}.
 */
export function useText() {
  const { lang, content } = useLanguage();
  return useMemo(() => {
    const cms = content?.[lang] || defaultContent[lang] || {};
    const t = (key, vars) => fillText(cms[key] ?? key, vars);
    const plural = (key, count) => t(`${key}_${pluralForm(lang, count)}`, { n: count });
    return { lang, t, plural, locale: NUMBER_LOCALES[lang] || NUMBER_LOCALES.uz };
  }, [lang, content]);
}

export function useSiteContent() {
  const context = useLanguage();
  return {
    ...context,
    cms: context.content?.[context.lang] || defaultContent[context.lang] || {},
  };
}

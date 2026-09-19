import { useMemo } from "react";
import { en } from "./en";
import { ptBR } from "./pt-BR";
import type { Messages } from "./pt-BR";

export type Locale = "pt-BR" | "en";
export type { Messages };
export { en, ptBR };

export const DEFAULT_LOCALE: Locale = "pt-BR";
export const LOCALES: readonly Locale[] = ["pt-BR", "en"];

const catalogs: Record<Locale, Messages> = {
  "pt-BR": ptBR,
  en,
};

/**
 * Maps a `?lang=` or `navigator.language` value to a supported locale.
 * `en` / `en-*` → English; `pt` / `pt-*` → pt-BR; anything else is ignored.
 */
export const parseLangTag = (value: string | null | undefined): Locale | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  if (normalized === "pt" || normalized === "pt-br" || normalized.startsWith("pt-")) return "pt-BR";
  return null;
};

/**
 * `?lang=en|pt-BR` wins, then `navigator.language`, then pt-BR.
 * Unknown `lang` values fall through to the next source.
 */
export const resolveLocale = (
  search: string = typeof window === "undefined" ? "" : window.location.search,
  language: string = typeof navigator === "undefined" ? "" : navigator.language,
): Locale => parseLangTag(new URLSearchParams(search).get("lang"))
  ?? parseLangTag(language)
  ?? DEFAULT_LOCALE;

export const messagesFor = (locale: Locale = resolveLocale()): Messages =>
  catalogs[locale] ?? ptBR;

/** Replaces `{name}` placeholders. Unknown tokens are left unchanged. */
export const interpolate = (template: string, vars: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (token, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : token,
  );

/** Catalog for the locale implied by the current URL / browser. */
export const useI18n = (): Messages =>
  useMemo(() => messagesFor(resolveLocale()), []);

/** Keep `<html lang>` and the document title in sync with the active catalog. */
export const applyDocumentLocale = (locale: Locale = resolveLocale()): void => {
  const t = messagesFor(locale);
  document.documentElement.lang = t.document.htmlLang;
  document.title = t.document.title;
};

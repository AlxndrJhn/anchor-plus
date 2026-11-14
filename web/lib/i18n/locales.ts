/** The languages Anchor+ speaks. Add one here and in messages/ (README › Translations). */
export const LOCALES = ["en", "de", "pl"] as const;

export type Locale = (typeof LOCALES)[number];

/** The language setting: one of the languages, or the browser's. */
export type LanguagePreference = "system" | Locale;

export const DEFAULT_LOCALE: Locale = "en";

export const isLocale = (value: unknown): value is Locale =>
  LOCALES.includes(value as Locale);

/**
 * The first of the browser's languages Anchor+ speaks ("de-AT" is German),
 * or English.
 */
export function matchLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const base = language.toLowerCase().split(/[-_]/)[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

export const browserLanguages = (): readonly string[] => {
  if (typeof navigator === "undefined") return [];
  return navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
};

/** The language a setting stands for on this browser. */
export const resolveLocale = (preference: LanguagePreference | undefined) =>
  preference && preference !== "system"
    ? preference
    : matchLocale(browserLanguages());

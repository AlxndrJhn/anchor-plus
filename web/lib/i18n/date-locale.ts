import type { Locale as DateLocale } from "date-fns";
import { de, enUS, pl } from "date-fns/locale";
import type { Locale } from "./locales";
import { currentLocale } from "./messages";

const DATE_LOCALES: Record<Locale, DateLocale> = { en: enUS, de, pl };

/** date-fns's month and day names in the language on screen. */
export const dateLocale = (locale: Locale = currentLocale()) =>
  DATE_LOCALES[locale];

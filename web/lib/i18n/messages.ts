import { createTranslator, type useTranslations } from "next-intl";
import en from "@/messages/en";
import type { Locale } from "./locales";

export type Messages = typeof en;

type Tree = { [key: string]: string | Tree };

/** A translation over English, so a message not yet translated reads in English. */
function overEnglish(base: Tree, translated: Tree): Tree {
  const merged: Tree = { ...base };
  for (const [key, value] of Object.entries(translated)) {
    const fallback = base[key];
    merged[key] =
      typeof value === "object" && typeof fallback === "object"
        ? overEnglish(fallback, value)
        : value;
  }
  return merged;
}

/**
 * A language's messages. English is in the app; the others load when
 * chosen (the service worker keeps them, so they work offline).
 */
export async function loadMessages(locale: Locale): Promise<Messages> {
  if (locale === "en") return en;
  const translated =
    locale === "de"
      ? (await import("@/messages/de")).default
      : (await import("@/messages/pl")).default;
  return overEnglish(
    en as unknown as Tree,
    translated as unknown as Tree,
  ) as unknown as Messages;
}

/** The language on screen, for code outside React (toasts, menus built once). */
const current: { locale: Locale; messages: Messages } = {
  locale: "en",
  messages: en,
};

export function setCurrentMessages(locale: Locale, messages: Messages) {
  current.locale = locale;
  current.messages = messages;
}

export const currentLocale = () => current.locale;

/**
 * Translates outside React, in the language on screen. In components, use
 * next-intl's useTranslations, which also redraws on a language change.
 * Takes a namespace like useTranslations: translate("notes.card")("pin").
 */
export const translate: typeof useTranslations = ((namespace?: string) =>
  createTranslator({
    locale: current.locale,
    messages: current.messages,
    namespace,
  } as Parameters<typeof createTranslator>[0])) as typeof useTranslations;

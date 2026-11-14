"use client";

import { NextIntlClientProvider } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";
import { usePreferencesStore } from "@/features/preferences/store";
import en from "@/messages/en";
import { type Locale, resolveLocale } from "./locales";
import { loadMessages, type Messages, setCurrentMessages } from "./messages";

const timeZone =
  typeof Intl === "undefined"
    ? "UTC"
    : Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Speaks the language chosen in Settings, or the browser's. The page is
 * built in English, so it starts in English and switches once loaded.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const preference = usePreferencesStore((s) => s.ui.language);
  const [state, setState] = useState<{ locale: Locale; messages: Messages }>({
    locale: "en",
    messages: en,
  });

  useEffect(() => {
    const locale = resolveLocale(preference);
    let isCurrent = true;
    loadMessages(locale).then(
      (messages) => {
        if (!isCurrent) return;
        setCurrentMessages(locale, messages);
        document.documentElement.lang = locale;
        setState({ locale, messages });
      },
      () => {
        // Offline before the language was ever loaded: stay in English.
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [preference]);

  return (
    <NextIntlClientProvider
      locale={state.locale}
      messages={state.messages}
      timeZone={timeZone}
    >
      {children}
    </NextIntlClientProvider>
  );
}

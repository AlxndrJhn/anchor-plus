"use client";

import { useTranslations } from "next-intl";
import { RadioCards } from "@/components/ui/radio-cards";
import { usePreferencesStore } from "@/features/preferences";
import { type LanguagePreference, LOCALES, resolveLocale } from "@/lib/i18n";
import { Row, RowText, Section } from "./settings-blocks";

export function LanguageSection() {
  const t = useTranslations("common.language");
  const language = usePreferencesStore((s) => s.ui.language ?? "system");
  const setUI = usePreferencesStore((s) => s.setUIPreference);
  return (
    <Section id="language" title={t("title")}>
      <Row className="grid items-start gap-3.5">
        <RowText title={t("title")} text={t("help")} />
        <RadioCards<LanguagePreference>
          aria-label={t("title")}
          value={language}
          onValueChange={(value) => setUI("language", value)}
          className="grid-cols-4 max-md:grid-cols-2"
          options={[
            {
              value: "system",
              label: t("system"),
              description: t(resolveLocale("system")),
            },
            // Each language in its own words, so it can be found in any.
            ...LOCALES.map((locale) => ({
              value: locale,
              label: <span lang={locale}>{t(locale)}</span>,
            })),
          ]}
        />
      </Row>
    </Section>
  );
}

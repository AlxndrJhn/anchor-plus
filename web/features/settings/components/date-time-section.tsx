"use client";

import { useTranslations } from "next-intl";
import { RadioCards } from "@/components/ui/radio-cards";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  type DateDisplay,
  formatFullDate,
  formatTime,
  type TimeDisplay,
  usePreferencesStore,
  type WeekStart,
} from "@/features/preferences";
import { Row, RowText, Section } from "./settings-blocks";

// Named too, as 11/08 and 08/11 can't be told apart by the date alone.
const CHOSEN_DATE_FORMATS: {
  value: Exclude<DateDisplay, "auto">;
  order: "monthFirst" | "dayFirst" | "yearFirst";
}[] = [
  { value: "mdy", order: "monthFirst" },
  { value: "dmy", order: "dayFirst" },
  { value: "mdy-slash", order: "monthFirst" },
  { value: "dmy-slash", order: "dayFirst" },
  { value: "dmy-dot", order: "dayFirst" },
  { value: "iso", order: "yearFirst" },
];

export function DateTimeSection() {
  const t = useTranslations("settings.dateTime");
  const tc = useTranslations("common");
  const dateDisplay = usePreferencesStore((s) => s.ui.dateDisplay ?? "auto");
  const timeDisplay = usePreferencesStore((s) => s.ui.timeDisplay ?? "auto");
  const weekStart = usePreferencesStore((s) => s.ui.weekStart ?? "auto");
  const setUI = usePreferencesStore((s) => s.setUIPreference);
  const today = new Date();
  // An afternoon, so the two clocks read differently.
  const sampleTime = new Date(2026, 0, 1, 16, 30);
  return (
    <Section id="date-time" title={t("title")}>
      <Row className="grid items-start gap-3.5">
        <RowText title={t("dateFormat")} text={t("dateFormatText")} />
        <RadioCards<DateDisplay>
          aria-label={t("dateFormat")}
          value={dateDisplay}
          onValueChange={(value) => setUI("dateDisplay", value)}
          className="grid-cols-3 max-md:grid-cols-2"
          options={[
            {
              value: "auto",
              label: tc("automatic"),
              description: formatFullDate(today, "auto"),
            },
            ...CHOSEN_DATE_FORMATS.map(({ value, order }) => ({
              value,
              label: formatFullDate(today, value),
              description: t(order),
            })),
          ]}
        />
      </Row>
      <Row>
        <RowText
          title={t("timeFormat")}
          text={t("timeFormatText", {
            time: formatTime(sampleTime, timeDisplay),
          })}
        />
        <SegmentedControl<TimeDisplay>
          aria-label={t("timeFormat")}
          size="sm"
          value={timeDisplay}
          onValueChange={(value) => setUI("timeDisplay", value)}
          options={[
            { value: "auto", label: tc("automatic") },
            { value: "12h", label: t("hours12") },
            { value: "24h", label: t("hours24") },
          ]}
        />
      </Row>
      <Row>
        <RowText title={t("weekStart")} text={t("weekStartText")} />
        <SegmentedControl<WeekStart>
          aria-label={t("weekStart")}
          size="sm"
          value={weekStart}
          onValueChange={(value) => setUI("weekStart", value)}
          options={[
            { value: "auto", label: tc("automatic") },
            { value: "monday", label: t("mon") },
            { value: "saturday", label: t("sat") },
            { value: "sunday", label: t("sun") },
          ]}
        />
      </Row>
    </Section>
  );
}

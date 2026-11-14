"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import * as React from "react";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const endOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59);

/** How many days a date is past the start of its week. */
export const daysIntoWeek = (d: Date, weekStartsOn: number) =>
  (d.getDay() - weekStartsOn + 7) % 7;

/** The weekday letters across the top, from the day the week starts on, in the language. */
export const weekdayLetters = (weekStartsOn: number, locale = "en") => {
  const format = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
  // 1 November 2026 is a Sunday.
  const letters = Array.from({ length: 7 }, (_, i) =>
    format.format(new Date(2026, 10, 1 + i)),
  );
  return letters.map((_, i) => letters[(weekStartsOn + i) % 7]);
};

interface CalendarProps {
  value: Date | null;
  onChange: (day: Date) => void;
  now?: Date;
  noPast?: boolean;
  /** As Date.getDay() counts: 0 is Sunday, 1 is Monday. */
  weekStartsOn?: number;
}

export function Calendar({
  value,
  onChange,
  now = new Date(),
  noPast = true,
  weekStartsOn = 0,
}: CalendarProps) {
  const t = useTranslations("layout.ui.calendar");
  const locale = useLocale();
  const [month, setMonth] = React.useState(
    () => new Date((value ?? now).getFullYear(), (value ?? now).getMonth(), 1),
  );
  const gridRef = React.useRef<HTMLDivElement>(null);
  const [focusDay, setFocusDay] = React.useState<Date | null>(null);
  const monthLabel = month.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = addDays(
    firstOfMonth,
    -daysIntoWeek(firstOfMonth, weekStartsOn),
  );
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const tabStopDay =
    value && days.some((d) => isSameDay(d, value)) ? value : now;

  React.useEffect(() => {
    if (!focusDay) return;
    gridRef.current
      ?.querySelector<HTMLElement>(`[data-day="${focusDay.toDateString()}"]`)
      ?.focus();
  }, [focusDay]);

  const onDayKeyDown = (e: React.KeyboardEvent, day: Date) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[
      e.key
    ];
    let to: Date | null = null;
    if (step) to = addDays(day, step);
    else if (e.key === "PageUp" || e.key === "PageDown") {
      to = new Date(day);
      to.setMonth(day.getMonth() + (e.key === "PageUp" ? -1 : 1));
    } else if (e.key === "Home")
      to = addDays(day, -daysIntoWeek(day, weekStartsOn));
    else if (e.key === "End")
      to = addDays(day, 6 - daysIntoWeek(day, weekStartsOn));
    if (!to) return;
    e.preventDefault();
    if (noPast && endOfDay(to) < now) return;
    if (
      to.getMonth() !== month.getMonth() ||
      to.getFullYear() !== month.getFullYear()
    )
      setMonth(new Date(to.getFullYear(), to.getMonth(), 1));
    setFocusDay(to);
  };

  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between pb-1">
        <IconButton
          size="sm"
          label={t("previousMonth")}
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
        >
          <ChevronLeft />
        </IconButton>
        <b className="font-semibold text-ui">{monthLabel}</b>
        <IconButton
          size="sm"
          label={t("nextMonth")}
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
        >
          <ChevronRight />
        </IconButton>
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: a grid of day buttons, not a form fieldset */}
      <div
        ref={gridRef}
        role="group"
        aria-label={monthLabel}
        className="grid grid-cols-7 gap-0.5 text-center"
      >
        {weekdayLetters(weekStartsOn, locale).map((weekday, i) => (
          <span
            key={i}
            aria-hidden
            className="pt-0.5 pb-1 font-semibold text-caption text-muted-foreground uppercase tracking-[.04em]"
          >
            {weekday}
          </span>
        ))}
        {days.map((day) => {
          const isPast = noPast && endOfDay(day) < now;
          const selected = !!value && isSameDay(day, value);
          const isToday = isSameDay(day, now);
          return (
            <button
              key={day.toDateString()}
              type="button"
              data-day={day.toDateString()}
              tabIndex={isSameDay(day, tabStopDay) ? 0 : -1}
              aria-pressed={selected}
              aria-current={isToday ? "date" : undefined}
              aria-label={day.toLocaleDateString(locale, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
              disabled={isPast}
              onClick={() => onChange(day)}
              onKeyDown={(e) => onDayKeyDown(e, day)}
              className={cn(
                "aspect-square h-8.25 max-w-full cursor-pointer justify-self-center rounded-full border-0 bg-transparent font-medium text-meta tabular-nums hover:bg-foreground/7",
                day.getMonth() !== month.getMonth() && "text-muted-foreground",
                isPast &&
                  "cursor-default text-muted-foreground line-through decoration-muted-foreground/40 hover:bg-transparent",
                isToday &&
                  !selected &&
                  "font-bold text-accent-ink shadow-[inset_0_0_0_1.5px_var(--ring)]",
                selected &&
                  "bg-primary font-bold text-card shadow-none hover:bg-primary",
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

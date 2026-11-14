import {
  formatFullDate,
  formatShortDate,
  formatTime,
  formatWeekdayDate,
} from "@/features/preferences";
import { currentLocale, translate } from "@/lib/i18n";
import type { NoteReminder, ReminderRecurrence } from "./types";

/** One word, for the repeat toggles and the chip on a note card. */
const tr = () => translate("noteHooks.reminder");
const recurrenceShortLabel = (recurrence: ReminderRecurrence) =>
  tr()(`recurrence.${recurrence}`);

const pad = (value: number) => String(value).padStart(2, "0");

export function toWallClock(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function parseWallClock(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const date = new Date(y, mo - 1, d, h, mi);
  return Number.isNaN(date.getTime()) ? null : date;
}

export interface ReminderPreset {
  key: "later" | "tomorrow" | "weekend" | "monday" | "week" | "month";
  label: string;
  remindAt: string;
}

function roundUpToFiveMinutes(date: Date): Date {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  rounded.setMinutes(Math.ceil(rounded.getMinutes() / 5) * 5);
  return rounded;
}

export function presetReminders(now = new Date()): ReminderPreset[] {
  const at = (date: Date, hours: number, minutes = 0) => {
    const copy = new Date(date);
    copy.setHours(hours, minutes, 0, 0);
    return copy;
  };
  const laterToday = roundUpToFiveMinutes(
    new Date(now.getTime() + 3 * 60 * 60 * 1000),
  );

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);

  // The next Saturday, or Sunday when today is Saturday.
  const weekend = new Date(now);
  weekend.setDate(
    weekend.getDate() + (now.getDay() === 6 ? 1 : 6 - now.getDay()),
  );

  // Always a day ahead, so on a Monday it is the one after.
  const monday = new Date(now);
  monday.setDate(monday.getDate() + ((8 - now.getDay()) % 7 || 7));

  // The same day next month, clamped to the end of a short one.
  const nextMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    Math.min(now.getDate(), daysInMonth(now.getFullYear(), now.getMonth() + 1)),
  );

  return [
    ...(laterToday.toDateString() === now.toDateString()
      ? [
          {
            key: "later" as const,
            label: tr()("presets.later"),
            remindAt: toWallClock(laterToday),
          },
        ]
      : []),
    {
      key: "tomorrow",
      label: tr()("presets.tomorrow"),
      remindAt: toWallClock(at(tomorrow, 9)),
    },
    // Left out where they would repeat a row above or below.
    ...(sameDay(weekend, tomorrow)
      ? []
      : [
          {
            key: "weekend" as const,
            label: tr()("presets.weekend"),
            remindAt: toWallClock(at(weekend, 9)),
          },
        ]),
    ...(sameDay(monday, tomorrow) || sameDay(monday, nextWeek)
      ? []
      : [
          {
            key: "monday" as const,
            label: tr()("presets.monday"),
            remindAt: toWallClock(at(monday, 9)),
          },
        ]),
    {
      key: "week",
      label: tr()("presets.week"),
      remindAt: toWallClock(at(nextWeek, 9)),
    },
    {
      key: "month",
      label: tr()("presets.month"),
      remindAt: toWallClock(at(nextMonth, 9)),
    },
  ];
}

export function isReminderPast(
  reminder: NoteReminder,
  now = new Date(),
): boolean {
  if (reminder.recurrence !== "none") return false;
  const at = parseWallClock(reminder.remindAt);
  return at !== null && at.getTime() < now.getTime();
}

/** “Tomorrow, 9:00 AM · Weekly”, or “Oct 2, 9:00 AM” once passed. */
export function reminderLabel(
  reminder: NoteReminder,
  now = new Date(),
): string {
  const at = parseWallClock(reminder.remindAt);
  if (!at) return reminder.remindAt;
  const next = nextOccurrence(reminder, now) ?? at;
  const sameYear = next.getFullYear() === now.getFullYear();
  const when =
    next.getTime() <= now.getTime() || !sameYear
      ? `${sameYear ? formatShortDate(next) : formatFullDate(next)}, ${formatTime(next)}`
      : reminderTimeLabel(next, now);
  const repeat =
    reminder.recurrence === "none"
      ? ""
      : ` · ${recurrenceShortLabel(reminder.recurrence)}`;
  return `${when}${repeat}`;
}

const daysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();

// Steps whole days, rebuilding from calendar parts so the wall-clock time
// survives a daylight-saving change.
function advanceDays(anchor: Date, from: Date, step: number): Date {
  let next = anchor;
  while (next.getTime() < from.getTime()) {
    next = new Date(
      next.getFullYear(),
      next.getMonth(),
      next.getDate() + step,
      anchor.getHours(),
      anchor.getMinutes(),
    );
  }
  return next;
}

// Steps whole months, clamped to the end of short ones.
function advanceMonths(anchor: Date, from: Date, step: number): Date {
  let months = anchor.getFullYear() * 12 + anchor.getMonth();
  let next = anchor;
  while (next.getTime() < from.getTime()) {
    months += step;
    const year = Math.floor(months / 12);
    const month = months % 12;
    next = new Date(
      year,
      month,
      Math.min(anchor.getDate(), daysInMonth(year, month)),
      anchor.getHours(),
      anchor.getMinutes(),
    );
  }
  return next;
}

/** When the reminder next fires, or null if it does not repeat and has passed. */
export function nextOccurrence(
  reminder: NoteReminder,
  now = new Date(),
): Date | null {
  const anchor = parseWallClock(reminder.remindAt);
  if (!anchor) return null;
  if (anchor.getTime() >= now.getTime()) return anchor;

  switch (reminder.recurrence) {
    case "daily":
      return advanceDays(anchor, now, 1);
    case "weekly":
      return advanceDays(anchor, now, 7);
    case "monthly":
      return advanceMonths(anchor, now, 1);
    case "yearly":
      return advanceMonths(anchor, now, 12);
    default:
      return null;
  }
}

/** Reads "4:10 PM", "16:10", "9.30 a.m.", "4pm" or "9" into "HH:mm". */
export function parseTimeInput(text: string): string | null {
  const match = text
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})(?:[:.](\d{1,2}))?\s*(?:([ap])\.?\s?m\.?)?$/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  const meridiem = match[3];

  if (minutes > 59) return null;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (meridiem === "p" ? 12 : 0);
  } else if (hours > 23) {
    return null;
  }

  return `${pad(hours)}:${pad(minutes)}`;
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/** “Today, 3:05 PM”, “Tomorrow, 9:00 AM” or “Wed, Sep 30, 9:00 AM”. */
function reminderTimeLabel(at: Date, now = new Date()): string {
  const day = sameDay(at, now)
    ? tr()("today")
    : sameDay(at, addDays(now, 1))
      ? tr()("tomorrow")
      : formatWeekdayDate(at);
  return `${day}, ${formatTime(at)}`;
}

/** “In 20 minutes”, “In 3 hours”, “Tomorrow”, “In 5 days”. */
function reminderCountdownLabel(at: Date, now = new Date()): string {
  const minutes = Math.round((at.getTime() - now.getTime()) / 60000);
  if (minutes < 60) return tr()("inMinutes", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return tr()("inHours", { count: hours });
  const midnight = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((midnight(at) - midnight(now)) / 86400000);
  return days === 1 ? tr()("tomorrow") : tr()("inDays", { count: days });
}

function recurrenceLabel(at: Date, recurrence: ReminderRecurrence): string {
  const t = tr();
  if (recurrence === "daily") return t("repeatsDaily");
  if (recurrence === "weekly")
    return t("repeatsWeekly", {
      weekday: at.toLocaleDateString(currentLocale(), { weekday: "long" }),
    });
  if (recurrence === "monthly")
    return t("repeatsMonthly", { day: at.getDate() });
  if (recurrence === "yearly")
    return t("repeatsYearly", { date: formatShortDate(at) });
  return "";
}

/** `ok` is false when there is nothing to save. */
export function reminderSummary(
  at: Date | null,
  recurrence: ReminderRecurrence,
  now = new Date(),
): { headline: string; caption: string; ok: boolean; past?: boolean } {
  if (!at)
    return {
      headline: tr()("none"),
      caption: tr()("pickWhen"),
      ok: false,
    };
  if (recurrence === "none" && at.getTime() <= now.getTime())
    return {
      headline: tr()("passed"),
      caption: reminderTimeLabel(at, now),
      ok: false,
      past: true,
    };
  const next =
    nextOccurrence(
      { remindAt: toWallClock(at), recurrence, version: 0 },
      now,
    ) ?? at;
  return {
    headline: reminderTimeLabel(next, now),
    caption:
      recurrence === "none"
        ? reminderCountdownLabel(next, now)
        : recurrenceLabel(at, recurrence),
    ok: true,
  };
}

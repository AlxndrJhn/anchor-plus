/**
 * A date shortcut as Settings recorded it before keybindings: a key
 * combination by physical key. Only read to move it into keybindings.json.
 */
export interface Shortcut {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
  /** KeyboardEvent.code, e.g. "Semicolon". */
  code: string;
  label: string;
}

/** How an inserted date reads: "Oct 28th 2026" or "2026-10-28". */
export type DateFormat = "long" | "iso";

export const DEFAULT_DATE_FORMAT: DateFormat = "long";

const pad = (n: number) => String(Math.abs(n)).padStart(2, "0");

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const ENDINGS: Record<number, string> = { 1: "st", 2: "nd", 3: "rd" };

/** 1st, 2nd, 3rd, 4th … 11th, 12th, 13th … 21st. */
export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${ENDINGS[n % 10] ?? "th"}`;
}

/** Today's date, as on this device: "Oct 27th 2026", or "2026-10-27". */
export function formatDate(
  date: Date,
  format: DateFormat = DEFAULT_DATE_FORMAT,
): string {
  if (format === "long")
    return `${MONTHS[date.getMonth()]} ${ordinal(date.getDate())} ${date.getFullYear()}`;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The time with its offset from UTC: "2026-10-27T11:23:49+01:00". */
export function formatDateTime(date: Date): string {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  return (
    `${formatDate(date, "iso")}T${pad(date.getHours())}:${pad(date.getMinutes())}:` +
    `${pad(date.getSeconds())}${sign}${pad(Math.trunc(offset / 60))}:${pad(offset % 60)}`
  );
}

/** The date, or date and time, an insert command types. */
export function stampFor(
  command: "editor.insertDate" | "editor.insertDateTime",
  dateFormat: DateFormat | undefined,
  now = new Date(),
): string {
  return command === "editor.insertDateTime"
    ? formatDateTime(now)
    : formatDate(now, dateFormat);
}

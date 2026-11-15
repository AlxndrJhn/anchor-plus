import { format as formatDate } from "date-fns";
import { dateLocale } from "@/lib/i18n/date-locale";
import { browserLanguages } from "@/lib/i18n/locales";
import { currentLocale } from "@/lib/i18n/messages";
import { usePreferencesStore } from "./store";

/** How dates read across the app. "auto" follows the browser's language. */
export type DateDisplay =
  | "auto"
  | "mdy"
  | "dmy"
  | "mdy-slash"
  | "dmy-slash"
  | "dmy-dot"
  | "iso";

export type TimeDisplay = "auto" | "12h" | "24h";

export type WeekStart = "auto" | "monday" | "saturday" | "sunday";

/** A day as Date.getDay() counts them: 0 is Sunday. */
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface DatePatterns {
  /** Sep 22 */
  short: string;
  /** Sep 22, 2026 */
  full: string;
  /** September 22 */
  longShort: string;
  /** September 22, 2026 */
  long: string;
}

const PATTERNS: Record<Exclude<DateDisplay, "auto">, DatePatterns> = {
  mdy: {
    short: "MMM d",
    full: "MMM d, yyyy",
    longShort: "MMMM d",
    long: "MMMM d, yyyy",
  },
  dmy: {
    short: "d MMM",
    full: "d MMM yyyy",
    longShort: "d MMMM",
    long: "d MMMM yyyy",
  },
  "mdy-slash": {
    short: "MM/dd",
    full: "MM/dd/yyyy",
    longShort: "MM/dd",
    long: "MM/dd/yyyy",
  },
  "dmy-slash": {
    short: "dd/MM",
    full: "dd/MM/yyyy",
    longShort: "dd/MM",
    long: "dd/MM/yyyy",
  },
  "dmy-dot": {
    short: "dd.MM.",
    full: "dd.MM.yyyy",
    longShort: "dd.MM.",
    long: "dd.MM.yyyy",
  },
  iso: {
    short: "MM-dd",
    full: "yyyy-MM-dd",
    longShort: "MM-dd",
    long: "yyyy-MM-dd",
  },
};

/**
 * The language "auto" formats follow: the browser’s, or the language chosen
 * in Settings when it differs (German on an English browser reads 28.10.).
 */
const browserLocale = () => {
  const browser = browserLanguages()[0] ?? "en-US";
  const app = currentLocale();
  return browser.toLowerCase().startsWith(app) ? browser : app;
};

/** date-fns’s format, with month and day names in the app’s language. */
const format = (date: Date, pattern: string) =>
  formatDate(date, pattern, { locale: dateLocale() });

const dateOrders = new Map<string, Exclude<DateDisplay, "auto">>();

/** The format "auto" stands for: the language's order, in the app's words. */
export function resolveDateDisplay(
  display: DateDisplay,
  locale = browserLocale(),
): Exclude<DateDisplay, "auto"> {
  if (display !== "auto") return display;
  let order = dateOrders.get(locale);
  if (!order) {
    const first = new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).formatToParts(new Date(2026, 9, 28))[0].type;
    order = first === "year" ? "iso" : first === "month" ? "mdy" : "dmy";
    dateOrders.set(locale, order);
  }
  return order;
}

/** Whether times read as 4:10 PM rather than 16:10. */
export function uses12HourClock(
  display: TimeDisplay = usePreferencesStore.getState().ui.timeDisplay ??
    "auto",
  locale = browserLocale(),
): boolean {
  if (display !== "auto") return display === "12h";
  const { hourCycle } = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
  }).resolvedOptions();
  return hourCycle === "h11" || hourCycle === "h12";
}

const WEEK_STARTS: Record<Exclude<WeekStart, "auto">, WeekdayIndex> = {
  monday: 1,
  saturday: 6,
  sunday: 0,
};

/** The day calendars start on. Without week data for the language, Sunday. */
export function firstDayOfWeek(
  start: WeekStart = usePreferencesStore.getState().ui.weekStart ?? "auto",
  locale = browserLocale(),
): WeekdayIndex {
  if (start !== "auto") return WEEK_STARTS[start];
  // getWeekInfo is the newer name; some browsers have only weekInfo, or neither.
  const intlLocale = new Intl.Locale(locale) as Intl.Locale & {
    getWeekInfo?: () => { firstDay: number };
    weekInfo?: { firstDay: number };
  };
  const firstDay = (intlLocale.getWeekInfo?.() ?? intlLocale.weekInfo)
    ?.firstDay;
  return firstDay ? ((firstDay % 7) as WeekdayIndex) : 0;
}

const patterns = (display?: DateDisplay) =>
  PATTERNS[
    resolveDateDisplay(
      display ?? usePreferencesStore.getState().ui.dateDisplay ?? "auto",
    )
  ];

/** “Sep 22”, “22 Sep” or “22.09.”. */
export const formatShortDate = (date: Date, display?: DateDisplay) =>
  format(date, patterns(display).short);

/** “Sep 22, 2026”, “22 Sep 2026” or “22.09.2026”. */
export const formatFullDate = (date: Date, display?: DateDisplay) =>
  format(date, patterns(display).full);

/** “September 22”, “22 September” or “22.09.”. */
export const formatLongShortDate = (date: Date, display?: DateDisplay) =>
  format(date, patterns(display).longShort);

/** “September 22, 2026”, “22 September 2026” or “22.09.2026”. */
export const formatLongDate = (date: Date, display?: DateDisplay) =>
  format(date, patterns(display).long);

/** “Wed, Sep 30”, “Wed, 30 Sep” or “Wed, 30.09.”. */
export const formatWeekdayDate = (date: Date, display?: DateDisplay) =>
  `${format(date, "EEE")}, ${formatShortDate(date, display)}`;

/** “4:10 PM” or “16:10”. */
export const formatTime = (date: Date, display?: TimeDisplay) =>
  format(date, uses12HourClock(display) ? "h:mm a" : "HH:mm");

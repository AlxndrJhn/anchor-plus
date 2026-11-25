import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, ordinal, stampFor } from "./date-stamp";

describe("date stamps", () => {
  it("writes the date and the time with its offset", () => {
    const date = new Date(2026, 9, 27, 11, 23, 49);
    expect(formatDate(date)).toBe("Oct 27th 2026");
    expect(formatDate(date, "iso")).toBe("2026-10-27");
    const offset = -date.getTimezoneOffset();
    const sign = offset >= 0 ? "+" : "-";
    const hh = String(Math.trunc(Math.abs(offset) / 60)).padStart(2, "0");
    const mm = String(Math.abs(offset) % 60).padStart(2, "0");
    expect(formatDateTime(date)).toBe(`2026-10-27T11:23:49${sign}${hh}:${mm}`);
  });

  it("puts the right ending on the day", () => {
    const days = [1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 30, 31];
    expect(days.map(ordinal)).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "11th",
      "12th",
      "13th",
      "21st",
      "22nd",
      "23rd",
      "30th",
      "31st",
    ]);
    expect(formatDate(new Date(2026, 0, 1))).toBe("Jan 1st 2026");
  });

  it("types the date or the date and time for each insert command", () => {
    const date = new Date(2026, 9, 27, 11, 23, 49);
    expect(stampFor("editor.insertDate", undefined, date)).toBe(
      "Oct 27th 2026",
    );
    expect(stampFor("editor.insertDate", "iso", date)).toBe("2026-10-27");
    expect(stampFor("editor.insertDateTime", "long", date)).toBe(
      formatDateTime(date),
    );
  });
});

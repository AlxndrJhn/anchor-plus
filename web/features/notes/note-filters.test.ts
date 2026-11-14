import { describe, expect, it } from "vitest";
import {
  filterCount,
  filtersFromParams,
  hasChecklist,
  matchesFilters,
  writeFilterParams,
} from "./note-filters";
import type { Note } from "./types";

const note = (overrides: Partial<Note> = {}): Note =>
  ({
    id: "n",
    title: "",
    content: JSON.stringify({ ops: [{ insert: "Hello\n" }] }),
    isPinned: false,
    isArchived: false,
    state: "active",
    version: 1,
    createdAt: "",
    updatedAt: "",
    userId: "u",
    permission: "owner",
    ...overrides,
  }) as Note;

const checklist = JSON.stringify({
  ops: [
    { insert: "Milk" },
    { insert: "\n", attributes: { list: "unchecked" } },
  ],
});

describe("note filters", () => {
  it("round-trips through the address", () => {
    const params = new URLSearchParams("q=milk");
    writeFilterParams(params, {
      background: "color_red",
      tagId: "t1",
      picture: true,
      checklist: true,
      reminder: true,
    });
    expect(params.toString()).toBe(
      "q=milk&color=color_red&tag=t1&picture=1&checklist=1&reminder=1",
    );
    const filters = filtersFromParams(params);
    expect(filterCount(filters)).toBe(5);
    writeFilterParams(params, { picture: false });
    expect(params.toString()).toBe("q=milk");
  });

  it("finds checklists, ticked or not", () => {
    expect(hasChecklist(note({ content: checklist }))).toBe(true);
    expect(
      hasChecklist(
        note({ content: checklist.replace("unchecked", "checked") }),
      ),
    ).toBe(true);
    expect(hasChecklist(note())).toBe(false);
  });

  it("needs every filter to match", () => {
    const red = note({
      background: "color_red",
      tagIds: ["t1"],
      imagePreviewIds: ["a"],
      content: checklist,
      reminder: { remindAt: "2030-01-01T00:00:00Z", recurrence: "none" },
    } as Partial<Note>);
    const all = {
      background: "color_red",
      tagId: "t1",
      picture: true,
      checklist: true,
      reminder: true,
    };
    expect(matchesFilters(red, all)).toBe(true);
    expect(matchesFilters(note(), {})).toBe(true);
    for (const key of Object.keys(all) as (keyof typeof all)[])
      expect(matchesFilters(note(), { [key]: all[key] })).toBe(false);
  });

  it("ignores filters no longer offered, such as an old invisible=1", () => {
    const params = new URLSearchParams("invisible=1&reminder=1");
    expect(filtersFromParams(params)).toEqual({ reminder: true });
  });
});

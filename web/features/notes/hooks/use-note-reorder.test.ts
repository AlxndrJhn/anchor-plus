import { describe, expect, it } from "vitest";
import type { Note } from "../types";
import { placeBefore, placesForDrop } from "./use-note-reorder";

const note = (
  id: string,
  fields: Partial<Note> & { updatedAt: string },
): Note =>
  ({
    id,
    title: id,
    createdAt: fields.updatedAt,
    position: null,
    positionedAt: null,
    isPinned: false,
    isArchived: false,
    ...fields,
  }) as Note;

describe("placesForDrop", () => {
  const a = note("a", { updatedAt: "2026-01-03T00:00:00Z" });
  const b = note("b", { updatedAt: "2026-01-02T00:00:00Z" });
  const c = note("c", { updatedAt: "2026-01-01T00:00:00Z" });
  const now = Date.parse("2026-02-01T00:00:00Z");

  it("numbers every note in the order shown when the sort turns custom", () => {
    // Last edited: a, b, c. c is dragged to the top.
    const places = placesForDrop({
      all: [a, b, c],
      drop: { noteId: "c", from: "others", to: "others", ids: ["c", "a", "b"] },
      isCustom: false,
      sortBy: "updatedAt",
      sortOrder: "desc",
      now,
    });
    expect(places).toEqual([
      { id: "c", position: now },
      { id: "a", position: now - 1000 },
      { id: "b", position: now - 2000 },
    ]);
  });

  it("places only the moved note when already custom", () => {
    const placed = [
      { ...a, position: 3000 },
      { ...b, position: 2000 },
      { ...c, position: 1000 },
    ];
    const places = placesForDrop({
      all: placed,
      drop: { noteId: "c", from: "others", to: "others", ids: ["a", "c", "b"] },
      isCustom: true,
      sortBy: "custom",
      sortOrder: "desc",
      now,
    });
    expect(places).toEqual([{ id: "c", position: 2500 }]);
  });

  it("renumbers when there is no room left between the neighbours", () => {
    const placed = [
      { ...a, position: 1000.0001 },
      { ...b, position: 1000 },
      { ...c, position: 10 },
    ];
    const places = placesForDrop({
      all: placed,
      drop: { noteId: "c", from: "others", to: "others", ids: ["a", "c", "b"] },
      isCustom: true,
      sortBy: "custom",
      sortOrder: "desc",
      now,
    });
    expect(places.map((p) => p.id)).toEqual(["a", "c", "b"]);
    expect(places[0].position).toBeGreaterThan(places[1].position as number);
  });
});

describe("placeBefore", () => {
  it("under Last edited, forgets a place an edit has since overtaken", () => {
    const stale = note("a", {
      updatedAt: "2026-01-05T00:00:00Z",
      position: 5,
      positionedAt: "2026-01-01T00:00:00Z",
    });
    expect(placeBefore(stale, "updatedAt", "desc")).toBeNull();
    expect(placeBefore(stale, "title", "asc")).toBe(5);
    const fresh = { ...stale, positionedAt: "2026-01-06T00:00:00Z" };
    expect(placeBefore(fresh, "updatedAt", "desc")).toBe(5);
  });
});

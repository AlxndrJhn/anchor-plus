import { describe, expect, it } from "vitest";
import type { SortBy, SortOrder } from "@/features/preferences";
import {
  compareNotes,
  keptPlace,
  positionBetween,
  type SortableNote,
  sortKey,
} from "./sort";

const note = (
  id: string,
  updatedAt: string,
  title = "note",
  createdAt = "2026-01-01T00:00:00.000Z",
): SortableNote => ({ id, title, createdAt, updatedAt });

describe("compareNotes", () => {
  it("puts the newest first and breaks ties on the id, descending", () => {
    const tied = "2026-08-16T10:00:00.000Z";
    const notes = [
      note("b", tied),
      note("a", "2026-08-16T09:00:00.000Z"),
      note("c", tied),
    ];

    expect(
      [...notes].sort(compareNotes("updatedAt", "desc")).map((n) => n.id),
    ).toEqual(["c", "b", "a"]);
  });

  it("keeps the id tie-break descending when the sort is ascending", () => {
    const tied = "2026-08-16T10:00:00.000Z";
    const notes = [note("a", tied), note("c", tied), note("b", tied)];

    expect(
      [...notes].sort(compareNotes("updatedAt", "asc")).map((n) => n.id),
    ).toEqual(["c", "b", "a"]);
  });

  it("keeps every sort option's own key first", () => {
    const older = note("z", "2026-08-01T00:00:00.000Z", "b", "2026-01-01");
    const newer = note("a", "2026-08-02T00:00:00.000Z", "a", "2026-02-01");
    const pair = [older, newer];

    const ids = (sortBy: SortBy, sortOrder: SortOrder) =>
      [...pair].sort(compareNotes(sortBy, sortOrder)).map((n) => n.id);

    expect(ids("updatedAt", "desc")).toEqual(["a", "z"]);
    expect(ids("updatedAt", "asc")).toEqual(["z", "a"]);
    expect(ids("createdAt", "desc")).toEqual(["a", "z"]);
    expect(ids("createdAt", "asc")).toEqual(["z", "a"]);
    expect(ids("title", "asc")).toEqual(["a", "z"]);
    expect(ids("title", "desc")).toEqual(["z", "a"]);
  });

  it("breaks title and createdAt ties the same way", () => {
    const notes = [
      note("a", "2026-08-16T09:00:00.000Z", "same"),
      note("b", "2026-08-16T10:00:00.000Z", "same"),
    ];

    expect(
      [...notes].sort(compareNotes("title", "desc")).map((n) => n.id),
    ).toEqual(["b", "a"]);
    expect(
      [...notes].sort(compareNotes("createdAt", "desc")).map((n) => n.id),
    ).toEqual(["b", "a"]);
  });

  it("ignores spaces around a title", () => {
    const notes = [
      note("z", "2026-08-16T10:00:00.000Z", " Zulu"),
      note("a", "2026-08-16T10:00:00.000Z", "Alpha "),
    ];

    expect(
      [...notes].sort(compareNotes("title", "asc")).map((n) => n.id),
    ).toEqual(["a", "z"]);
  });

  it("orders a fully tied list the same whatever order it arrives in", () => {
    const tied = "2026-08-16T10:00:00.000Z";
    const ids = ["d", "a", "c", "b"];
    const forwards = ids.map((id) => note(id, tied));
    const backwards = [...forwards].reverse();

    const sort = (notes: SortableNote[]) =>
      [...notes].sort(compareNotes("updatedAt", "desc")).map((n) => n.id);

    expect(sort(forwards)).toEqual(["d", "c", "b", "a"]);
    expect(sort(backwards)).toEqual(["d", "c", "b", "a"]);
  });
});

describe("compareNotes by title", () => {
  const titled = (id: string, title: string) =>
    note(id, "2026-01-01T00:00:00.000Z", title);
  const notes = [
    titled("1", "Zebra"),
    titled("2", ""),
    titled("3", "apple"),
    titled("4", "   "),
  ];
  const ids = (sortOrder: SortOrder) =>
    [...notes].sort(compareNotes("title", sortOrder)).map((n) => n.id);

  it("puts untitled notes after the titled ones, A to Z", () => {
    expect(ids("asc").slice(0, 2)).toEqual(["3", "1"]);
    expect(ids("asc").slice(2).sort()).toEqual(["2", "4"]);
  });

  it("puts untitled notes last, Z to A too", () => {
    expect(ids("desc").slice(0, 2)).toEqual(["1", "3"]);
    expect(ids("desc").slice(2).sort()).toEqual(["2", "4"]);
  });
});

describe("compareNotes by size", () => {
  const sized = (id: string, storageSize?: number) => ({
    ...note(id, "2026-01-01T00:00:00.000Z"),
    storageSize,
  });
  const notes = [sized("1", 200), sized("2"), sized("3", 5_000_000)];
  const ids = (sortOrder: SortOrder) =>
    [...notes].sort(compareNotes("size", sortOrder)).map((n) => n.id);

  it("puts the largest first", () => {
    expect(ids("desc")).toEqual(["3", "1", "2"]);
  });

  it("puts the smallest first, a note without a size as empty", () => {
    expect(ids("asc")).toEqual(["2", "1", "3"]);
  });
});

describe("dragged notes in newest-first order", () => {
  const n = (
    id: string,
    updatedAt: string,
    position?: number,
    positionedAt?: string,
  ) => ({
    id,
    title: id,
    createdAt: updatedAt,
    updatedAt,
    position: position ?? null,
    positionedAt: positionedAt ?? null,
  });
  const order = (notes: ReturnType<typeof n>[]) =>
    [...notes].sort(compareNotes("updatedAt", "desc")).map((x) => x.id);
  const a = n("a", "2026-01-03T00:00:00Z");
  const b = n("b", "2026-01-02T00:00:00Z");
  const c = n("c", "2026-01-01T00:00:00Z");

  it("sorts by last edit until a note is dragged", () => {
    expect(order([c, a, b])).toEqual(["a", "b", "c"]);
  });

  it("keeps a dragged note where it was put", () => {
    // a dragged below b.
    const moved = n(
      "a",
      "2026-01-03T00:00:00Z",
      positionBetween(b, c),
      "2026-01-04T00:00:00Z",
    );
    expect(order([moved, b, c])).toEqual(["b", "a", "c"]);
    expect(sortKey(moved)).toBe((sortKey(b) + sortKey(c)) / 2);
  });

  it("moves a dragged note back to the top when it is edited again", () => {
    const editedLater = n(
      "c",
      "2026-01-05T00:00:00Z",
      positionBetween(b, undefined),
      "2026-01-04T00:00:00Z",
    );
    expect(order([a, b, editedLater])).toEqual(["c", "a", "b"]);
  });

  it("keeps a note ticked from its card where it was, tick after tick", () => {
    // b, edited on the 2nd, is ticked on the 6th: still between a and c.
    const once = {
      ...b,
      updatedAt: "2026-01-06T00:00:00Z",
      position: keptPlace(b),
      positionedAt: "2026-01-06T00:00:00Z",
    };
    expect(order([a, once, c])).toEqual(["a", "b", "c"]);
    // Ticked again: a new place each time, so the server stamps it again.
    const twice = {
      ...once,
      updatedAt: "2026-01-07T00:00:00Z",
      position: keptPlace(once),
      positionedAt: "2026-01-07T00:00:00Z",
    };
    expect(twice.position).not.toBe(once.position);
    expect(order([a, twice, c])).toEqual(["a", "b", "c"]);
  });

  it("places a note between neighbours, or just past the ends", () => {
    expect(positionBetween(a, b)).toBe((sortKey(a) + sortKey(b)) / 2);
    expect(positionBetween(undefined, a)).toBe(sortKey(a) + 1000);
    expect(positionBetween(c, undefined)).toBe(sortKey(c) - 1000);
  });

  it("ignores places in oldest-first order", () => {
    const moved = n("a", "2026-01-03T00:00:00Z", 0, "2026-01-04T00:00:00Z");
    expect(
      [moved, b, c].sort(compareNotes("updatedAt", "asc")).map((x) => x.id),
    ).toEqual(["c", "b", "a"]);
  });
});

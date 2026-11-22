import type { SortBy, SortOrder } from "@/features/preferences";
import { hasTitle } from "./title";
import type { Note } from "./types";

export type SortableNote = Pick<
  Note,
  | "id"
  | "title"
  | "createdAt"
  | "updatedAt"
  | "position"
  | "positionedAt"
  | "storageSize"
>;

/**
 * Where a note sorts in "Last edited, newest first", as in Google Keep: by
 * its last edit, unless it was dragged since, in which case where it was
 * put. Both are milliseconds, so dragged and edited notes mix.
 */
export function sortKey(
  note: Pick<Note, "updatedAt" | "position" | "positionedAt">,
): number {
  const edited = new Date(note.updatedAt).getTime();
  if (note.position == null || !note.positionedAt) return edited;
  return new Date(note.positionedAt).getTime() >= edited
    ? note.position
    : edited;
}

/**
 * Where a note sorts now, to keep it there rather than move it up when it's
 * changed from its card. A hair off its current place, so the server, which
 * only stamps a place that changed, records it as placed after the change.
 */
export function keptPlace(
  note: Pick<Note, "updatedAt" | "position" | "positionedAt">,
): number {
  return sortKey(note) - 0.01;
}

/**
 * Where a note sorts in "Custom": where it was put or, never placed, when it
 * was made, so new notes come out on top. Edits never move it.
 */
export function customKey(note: Pick<Note, "createdAt" | "position">): number {
  return note.position ?? new Date(note.createdAt).getTime();
}

/** Places closer than this are renumbered rather than split again. */
export const MIN_GAP = 0.001;
/** The gap between notes when a whole order is numbered. */
export const STEP = 1000;

/**
 * The place for a note dropped between `above` and `below` (either may be
 * missing at the ends), in `customKey` terms; null when the two are too
 * close to fit another place between them.
 */
export function positionBetween(
  above: Pick<Note, "createdAt" | "position"> | undefined,
  below: Pick<Note, "createdAt" | "position"> | undefined,
  now = Date.now(),
): number | null {
  if (above && below) {
    const high = customKey(above);
    const low = customKey(below);
    return high - low < MIN_GAP * 2 ? null : (high + low) / 2;
  }
  if (above) return customKey(above) - STEP;
  // On top: no lower than now, so a note made later still comes out above.
  if (below) return Math.max(customKey(below) + STEP, now);
  return now;
}

/**
 * Places for a whole order, top first: down from `now` in even steps, so
 * they read like the times they stand in for.
 */
export function numberOrder(ids: readonly string[], now = Date.now()) {
  return ids.map((id, i) => ({ id, position: now - i * STEP }));
}

/**
 * The full order with `noteId` moved next to its new neighbours in
 * `groupIds`, a part of it (one section, or a tag's notes): right after the
 * one above it, or else right before the one below.
 */
export function moveNextToNeighbours(
  orderIds: readonly string[],
  noteId: string,
  groupIds: readonly string[],
): string[] {
  const rest = orderIds.filter((id) => id !== noteId);
  const at = groupIds.indexOf(noteId);
  const above = groupIds[at - 1];
  const below = groupIds[at + 1];
  const index =
    above !== undefined && rest.includes(above)
      ? rest.indexOf(above) + 1
      : below !== undefined && rest.includes(below)
        ? rest.indexOf(below)
        : rest.length;
  rest.splice(index, 0, noteId);
  return rest;
}

export const compareNotes =
  (sortBy: SortBy, sortOrder: SortOrder) =>
  (a: SortableNote, b: SortableNote) => {
    let comparison = 0;
    if (sortBy === "title") {
      // Untitled notes come last whichever way titles are ordered.
      const aUntitled = !hasTitle(a.title);
      if (aUntitled !== !hasTitle(b.title)) return aUntitled ? 1 : -1;
      comparison = a.title.trim().localeCompare(b.title.trim());
    } else if (sortBy === "updatedAt") {
      // Newest first takes dragged places into account; oldest first is the
      // plain edit time.
      comparison =
        sortOrder === "desc"
          ? sortKey(a) - sortKey(b)
          : new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    } else if (sortBy === "createdAt") {
      comparison =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortBy === "custom") {
      // Highest place first, whichever way round: the order is the person's.
      const placed = customKey(b) - customKey(a);
      if (placed !== 0) return placed;
    } else if (sortBy === "size") {
      comparison = (a.storageSize ?? 0) - (b.storageSize ?? 0);
    }

    const ordered = sortOrder === "asc" ? comparison : -comparison;
    if (ordered !== 0) return ordered;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  };

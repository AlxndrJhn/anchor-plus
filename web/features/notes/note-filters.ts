import type { Note } from "./types";

/**
 * Narrows a list of notes on top of a search. Kept in the address, like the
 * search, so Back from an opened note finds the same results.
 */
export interface NoteFilters {
  /** A background id (a colour or a pattern). */
  background?: string;
  tagId?: string;
  picture?: boolean;
  checklist?: boolean;
  reminder?: boolean;
}

export const FILTER_PARAMS = {
  background: "color",
  tagId: "tag",
  picture: "picture",
  checklist: "checklist",
  reminder: "reminder",
} as const satisfies Record<keyof NoteFilters, string>;

export const NO_FILTERS: NoteFilters = {};

export function filtersFromParams(params: {
  get(name: string): string | null;
}): NoteFilters {
  const filters: NoteFilters = {};
  const background = params.get(FILTER_PARAMS.background);
  const tagId = params.get(FILTER_PARAMS.tagId);
  if (background) filters.background = background;
  if (tagId) filters.tagId = tagId;
  if (params.get(FILTER_PARAMS.picture) === "1") filters.picture = true;
  if (params.get(FILTER_PARAMS.checklist) === "1") filters.checklist = true;
  if (params.get(FILTER_PARAMS.reminder) === "1") filters.reminder = true;
  return filters;
}

/** Writes the filters into `params`, removing the ones that are off. */
export function writeFilterParams(params: URLSearchParams, f: NoteFilters) {
  for (const key of Object.keys(FILTER_PARAMS) as (keyof NoteFilters)[]) {
    const value = f[key];
    const name = FILTER_PARAMS[key];
    if (value === undefined || value === false) params.delete(name);
    else params.set(name, value === true ? "1" : value);
  }
}

export function filterCount(f: NoteFilters) {
  return Object.values(f).filter((v) => v !== undefined && v !== false).length;
}

const checklistByNote = new WeakMap<Note, boolean>();

/** Whether the note has a checklist item, ticked or not. */
export function hasChecklist(note: Note) {
  let found = checklistByNote.get(note);
  if (found === undefined) {
    found = /"list"\s*:\s*"(?:un)?checked"/.test(note.content ?? "");
    checklistByNote.set(note, found);
  }
  return found;
}

export function hasPicture(note: Note) {
  return (note.imagePreviewIds?.length ?? 0) > 0;
}

export function matchesFilters(note: Note, f: NoteFilters) {
  return (
    (!f.background || note.background === f.background) &&
    (!f.tagId || !!note.tagIds?.includes(f.tagId)) &&
    (!f.picture || hasPicture(note)) &&
    (!f.checklist || hasChecklist(note)) &&
    (!f.reminder || !!note.reminder)
  );
}

import type { Note } from "./types";

export const TRASH_RETENTION_DAYS = 30;

export function deletionDate(note: Note): Date {
  const since = new Date(note.stateChangedAt ?? note.updatedAt);
  return new Date(since.getTime() + TRASH_RETENTION_DAYS * 86400000);
}

export function daysUntilDeletion(note: Note, now = new Date()): number {
  return Math.max(
    1,
    Math.ceil((deletionDate(note).getTime() - now.getTime()) / 86400000),
  );
}

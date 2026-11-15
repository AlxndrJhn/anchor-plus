import { format, isSameDay } from "date-fns";
import { formatLongDate, formatTime } from "@/features/preferences";
import { translate } from "@/lib/i18n";
import type {
  Note,
  NoteRevisionAuthor,
  NoteRevisionCause,
  NoteRevisionPage,
  NoteRevisionSummary,
} from "./types";

export const CURRENT_ENTRY_ID = "current";

export interface TimelineEntry {
  id: string;
  createdAt: string;
  title: string;
  author: NoteRevisionAuthor | null;
  revision: NoteRevisionSummary | null;
}

export interface TimelineDay {
  key: string;
  label: string;
  entries: TimelineEntry[];
}

export function revisionLabel(cause: NoteRevisionCause): string {
  return translate("noteHooks.history")(`cause.${cause}`);
}

export function revisionAuthorName(
  entry: { author: NoteRevisionAuthor | null },
  currentUserId: string | null,
): string {
  if (!entry.author) return translate("noteHooks.history")("someone");
  return entry.author.id === currentUserId
    ? translate("noteHooks.history")("you")
    : entry.author.name;
}

export function revisionTime(entry: { createdAt: string }): string {
  return formatTime(new Date(entry.createdAt));
}

export function revisionDayTime(
  entry: { createdAt: string },
  now: Date = new Date(),
): string {
  const date = new Date(entry.createdAt);
  return translate("noteHooks.history")("dayAtTime", {
    day: dayLabel(date, now),
    time: formatTime(date),
  });
}

export function historyHasMultipleAuthors(
  revisions: NoteRevisionSummary[],
): boolean {
  const authors = new Set(
    revisions.map((revision) => revision.author?.id ?? "unknown"),
  );
  return authors.size > 1;
}

export function canRestoreRevisions(note: Note | null): boolean {
  if (!note) return false;
  return (
    note.state === "active" && note.permission !== "viewer" && !note.isFrozen
  );
}

export function revisionsFromPages(
  pages: NoteRevisionPage[] | undefined,
): NoteRevisionSummary[] {
  return pages?.flatMap((page) => page.revisions) ?? [];
}

export function timelineEntries(
  revisions: NoteRevisionSummary[],
): TimelineEntry[] {
  return revisions.map((revision) => ({
    id: revision.id,
    createdAt: revision.createdAt,
    title: revision.title,
    author: revision.author,
    revision,
  }));
}

export function comparisonTargetId(
  revisions: NoteRevisionSummary[],
  revisionId: string,
): string | null {
  const index = revisions.findIndex((revision) => revision.id === revisionId);
  if (index < 0 || revisions[index].cause === "conflict") return null;

  for (let i = index - 1; i >= 0; i--) {
    if (revisions[i].cause !== "conflict") return revisions[i].id;
  }
  return null;
}

export function groupTimelineByDay(
  entries: TimelineEntry[],
  now: Date = new Date(),
): TimelineDay[] {
  const days: TimelineDay[] = [];

  for (const entry of entries) {
    const date = new Date(entry.createdAt);
    const key = format(date, "yyyy-MM-dd");
    const last = days[days.length - 1];

    if (last?.key === key) {
      last.entries.push(entry);
      continue;
    }

    days.push({ key, label: dayLabel(date, now), entries: [entry] });
  }

  return days;
}

function dayLabel(date: Date, now: Date): string {
  if (isSameDay(date, now)) return translate("noteHooks.history")("today");

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday))
    return translate("noteHooks.history")("yesterday");

  return formatLongDate(date);
}

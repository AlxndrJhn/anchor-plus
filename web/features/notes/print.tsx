"use client";

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { toast } from "@/components/ui/toast";
import { translate } from "@/lib/i18n";
import { fetchAttachmentBlob, getNoteAttachments } from "./api";
import { NoteBody } from "./components/note-body";
import { deltaToBlocks } from "./note-blocks";
import { isLockHidden, useUnlockedNotes } from "./note-lock";
import { hasTitle } from "./title";
import type { Note } from "./types";

/** What gets printed of a note. */
export interface PrintableNote {
  id: string;
  title: string;
  content: string | null | undefined;
  /** Its pictures, in order; looked up when unknown (see `pictureIdsOf`). */
  pictureIds?: string[];
  /** The note's first pictures and how many files it has, from a list. */
  imagePreviewIds?: string[];
  attachmentCount?: number;
  /** Locked and not opened: only its title is printed. */
  locked?: boolean;
}

export const PRINT_ROOT_ID = "print-notes";

/** A list gives a note's first four pictures; more means asking for all. */
async function pictureIdsOf(note: PrintableNote): Promise<string[]> {
  if (note.locked) return [];
  if (note.pictureIds) return note.pictureIds;
  const previews = note.imagePreviewIds ?? [];
  if ((note.attachmentCount ?? 0) <= previews.length) return previews;
  try {
    const attachments = await getNoteAttachments(note.id);
    return attachments
      .filter((a) => a.type === "image")
      .sort((a, b) => a.position - b.position)
      .map((a) => a.id);
  } catch {
    return previews;
  }
}

function PrintSheet({
  notes,
  pictures,
}: {
  notes: PrintableNote[];
  pictures: string[][];
}) {
  return notes.map((note, i) => (
    <article key={note.id} className="print-note">
      {hasTitle(note.title) && (
        <h1 className="print-title" dir="auto">
          {note.title.trim()}
        </h1>
      )}
      {note.locked ? (
        <p className="print-locked">{translate("noteHooks.print")("locked")}</p>
      ) : (
        <NoteBody blocks={deltaToBlocks(note.content)} variant="full" />
      )}
      {pictures[i].length > 0 && (
        <div className="print-pictures">
          {pictures[i].map((src) => (
            <img key={src} src={src} alt="" />
          ))}
        </div>
      )}
    </article>
  ));
}

let printing = false;

/**
 * Opens the system's print dialog with [notes], one after another, in the
 * light theme whatever the app's. Everything else on the page stays out
 * of the print (see `#print-notes` in base.css).
 */
export async function printNotes(notes: PrintableNote[]) {
  if (printing || notes.length === 0) return;
  printing = true;
  const urls: string[] = [];
  try {
    const pictures = await Promise.all(
      notes.map(async (note) => {
        const ids = await pictureIdsOf(note);
        const blobs = await Promise.all(
          ids.map((id) => fetchAttachmentBlob(note.id, id).catch(() => null)),
        );
        return blobs.flatMap((blob) => {
          if (!blob) return [];
          const url = URL.createObjectURL(blob);
          urls.push(url);
          return [url];
        });
      }),
    );

    document.getElementById(PRINT_ROOT_ID)?.remove();
    const host = document.createElement("div");
    host.id = PRINT_ROOT_ID;
    // A white note's colours: highlights, ticked boxes, muted text.
    host.dataset.note = "";
    document.body.append(host);
    const root = createRoot(host);
    flushSync(() =>
      root.render(<PrintSheet notes={notes} pictures={pictures} />),
    );
    await Promise.all(
      [...host.querySelectorAll("img")].map((img) =>
        img.decode().catch(() => undefined),
      ),
    );

    const html = document.documentElement;
    const wasDark = html.classList.contains("dark");
    const previousTitle = document.title;
    // The browser offers the title as the PDF's file name.
    if (notes.length === 1 && hasTitle(notes[0].title))
      document.title = notes[0].title.trim();
    if (wasDark) html.classList.remove("dark");

    let cleaned = false;
    const cleanUp = () => {
      if (cleaned) return;
      cleaned = true;
      window.removeEventListener("afterprint", cleanUp);
      if (wasDark) html.classList.add("dark");
      document.title = previousTitle;
      root.unmount();
      host.remove();
      for (const url of urls) URL.revokeObjectURL(url);
      printing = false;
    };
    window.addEventListener("afterprint", cleanUp);
    window.print();
    // Where print() returns at once and afterprint never comes (some
    // phones), the next touch of the page tidies up.
    window.setTimeout(() => {
      window.addEventListener("pointerdown", cleanUp, { once: true });
      window.addEventListener("focus", cleanUp, { once: true });
    }, 1000);
  } catch (error) {
    for (const url of urls) URL.revokeObjectURL(url);
    printing = false;
    throw error;
  }
}

/** Prints notes from a list, locked ones not opened this session as titles. */
export function printNoteList(notes: Note[]) {
  const unlocked = useUnlockedNotes.getState().ids;
  printNotes(
    notes.map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      imagePreviewIds: note.imagePreviewIds,
      attachmentCount: note.attachmentCount,
      locked: isLockHidden(note, unlocked),
    })),
  ).catch(() =>
    toast.error(
      translate("noteHooks.print")("failed", { count: notes.length }),
    ),
  );
}

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "@/components/ui/toast";
import { usePreferencesStore } from "@/features/preferences";
import { saveNote, setNotePosition } from "../api";
import { appendTextToContent } from "../quill";
import { toggleChecklistItem } from "../quill-checklist";
import { keptPlace } from "../sort";
import type { Note } from "../types";

/** Whether this person may tick a note's items from its card. */
export function canTickFromCard(note: Note) {
  return (
    note.permission !== "viewer" &&
    note.state !== "trashed" &&
    !note.isArchived &&
    !note.isFrozen
  );
}

/**
 * Changes a note's content from its card, without opening the note: the
 * lists show it at once, then it is saved on top of the note's version, and
 * re-applied once if someone else changed the note meanwhile.
 */
function useCardContentChange() {
  const queryClient = useQueryClient();

  const putInLists = useCallback(
    (note: Note) => {
      queryClient.setQueriesData<Note[]>({ queryKey: ["notes"] }, (list) =>
        Array.isArray(list)
          ? list.map((n) => (n.id === note.id ? { ...n, ...note } : n))
          : list,
      );
      queryClient.setQueryData<Note>(["notes", note.id], (old) =>
        old ? { ...old, ...note } : old,
      );
    },
    [queryClient],
  );

  return useCallback(
    async (
      note: Note,
      change: (content: string | null | undefined) => string | null,
      failure: string,
      { keepPlace = false }: { keepPlace?: boolean } = {},
    ) => {
      const content = change(note.content);
      if (content === null) return;
      const place = keptPlace(note);
      putInLists({ ...note, content });

      let outcome = await saveNote(note.id, {
        content,
        baseVersion: note.version,
      });
      if (outcome.status === "conflict") {
        const again = change(outcome.serverNote.content);
        outcome = again
          ? await saveNote(note.id, {
              content: again,
              baseVersion: outcome.serverNote.version,
            })
          : outcome;
      }
      // In "Custom" an edit never moves a note, so its place stays as it is.
      const { sortBy } = usePreferencesStore.getState().notes;
      if (outcome.status === "saved" && keepPlace && sortBy !== "custom") {
        // Placed where it was, as a dragged note is: still there until it's
        // next edited in the note itself.
        putInLists({
          ...outcome.note,
          position: place,
          positionedAt: outcome.note.updatedAt,
        });
        await setNotePosition(note.id, place).catch(() => undefined);
      } else if (outcome.status === "saved") putInLists(outcome.note);
      else {
        putInLists(note);
        toast.error(failure);
      }
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    [putInLists, queryClient],
  );
}

/**
 * Ticks or unticks a checklist item from a note's card. The note stays
 * where it is in the list, so several items can be ticked in a row.
 */
export function useCardChecklist() {
  const changeContent = useCardContentChange();
  const sort = usePreferencesStore((s) => s.editor.sortChecklistItems);
  return useCallback(
    (note: Note, line: number) =>
      changeContent(
        note,
        (content) => toggleChecklistItem(content, line, sort),
        "Couldn’t save that tick. Open the note to try again.",
        { keepPlace: true },
      ),
    [changeContent, sort],
  );
}

/**
 * Adds lines of text at the end of a note from its card ("Grab image text"
 * on a picture opened there).
 */
export function useCardAppendText() {
  const changeContent = useCardContentChange();
  return useCallback(
    (note: Note, text: string) =>
      changeContent(
        note,
        (content) => (text.trim() ? appendTextToContent(content, text) : null),
        "Couldn’t add the text. Open the note to try again.",
      ),
    [changeContent],
  );
}

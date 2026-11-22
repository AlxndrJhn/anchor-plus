"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "@/components/ui/toast";
import type { SortBy, SortOrder } from "@/features/preferences";
import { bulkPinNotes, getNotes, setNotePositions } from "../api";
import type { NoteDrop } from "../components/notes-board";
import { orderSaveOptions, pullAfterLastOrderSave } from "../order-saves";
import {
  compareNotes,
  moveNextToNeighbours,
  numberOrder,
  positionBetween,
} from "../sort";
import type { Note } from "../types";
import type { NoteList } from "./use-note-list";

interface Place {
  id: string;
  position: number | null;
}

interface OrderWrite {
  places: Place[];
  pin?: { noteId: string; isPinned: boolean };
}

/**
 * The place a note had, to put back with Undo. Under "Last edited" a place
 * counts only until the note's next edit; one that no longer counts goes
 * back to none, so the note sorts by its edit again.
 */
export function placeBefore(note: Note, sortBy: SortBy, sortOrder: SortOrder) {
  if (note.position == null) return null;
  if (sortBy !== "updatedAt" || sortOrder !== "desc") return note.position;
  const counts =
    !!note.positionedAt &&
    new Date(note.positionedAt).getTime() >= new Date(note.updatedAt).getTime();
  return counts ? note.position : null;
}

/**
 * The places a drop gives, in "Custom" terms. Already custom, the note goes
 * between its new neighbours; otherwise (or with no room left between them)
 * every note is numbered in the order shown, with the drop applied, so the
 * custom order starts as what the person sees.
 */
export function placesForDrop({
  all,
  drop,
  isCustom,
  sortBy,
  sortOrder,
  now = Date.now(),
}: {
  /** Every note in the list, not only a tag's. */
  all: Note[];
  drop: NoteDrop;
  isCustom: boolean;
  sortBy: SortBy;
  sortOrder: SortOrder;
  now?: number;
}): Place[] {
  const byId = new Map(all.map((n) => [n.id, n]));
  if (isCustom) {
    const at = drop.ids.indexOf(drop.noteId);
    const position = positionBetween(
      byId.get(drop.ids[at - 1]),
      byId.get(drop.ids[at + 1]),
      now,
    );
    if (position !== null) return [{ id: drop.noteId, position }];
  }
  const order = [...all]
    .sort(compareNotes(isCustom ? "custom" : sortBy, sortOrder))
    .map((n) => n.id);
  const moved = moveNextToNeighbours(order, drop.noteId, drop.ids);
  return numberOrder(moved, now).filter(
    ({ id, position }) => byId.get(id)?.position !== position,
  );
}

/**
 * Dragging notes on the Notes page: works out the new places, shows them at
 * once and saves them one after another. The first drag in another sort
 * switches to "Custom" (with Undo, which puts the sort and places back);
 * a note dropped into or out of Pinned is pinned or unpinned.
 */
export function useNoteReorder({
  list,
  notes,
  tagId,
}: {
  list: NoteList;
  notes: Note[];
  tagId: string | null;
}) {
  const t = useTranslations("notes.notesPage");
  const queryClient = useQueryClient();

  const showInCache = React.useCallback(
    ({ places, pin }: OrderWrite) => {
      const placed = new Map(places.map((p) => [p.id, p.position]));
      const now = new Date().toISOString();
      queryClient.setQueriesData<unknown>(
        { queryKey: ["notes"] },
        (data: unknown) =>
          Array.isArray(data)
            ? (data as Note[]).map((n) => {
                let note = n;
                if (placed.has(n.id)) {
                  const position = placed.get(n.id) ?? null;
                  note = {
                    ...note,
                    position,
                    positionedAt: position === null ? null : now,
                  };
                }
                if (pin?.noteId === n.id)
                  note = { ...note, isPinned: pin.isPinned };
                return note;
              })
            : data,
      );
    },
    [queryClient],
  );

  const save = useMutation({
    ...orderSaveOptions("notes"),
    mutationFn: async ({ places, pin }: OrderWrite) => {
      if (pin) await bulkPinNotes([pin.noteId], pin.isPinned);
      if (places.length)
        await setNotePositions(
          places.map(({ id, position }) => ({ noteId: id, position })),
        );
    },
    onError: (_, { pin }) =>
      toast.error(
        pin
          ? pin.isPinned
            ? t("couldNotPinOne")
            : t("couldNotUnpinOne")
          : t("couldNotMove"),
      ),
    onSettled: () => pullAfterLastOrderSave(queryClient),
  });

  // A tag's view places notes among all of them.
  const allNotes = React.useCallback(async (): Promise<Note[]> => {
    if (!tagId) return notes;
    return queryClient.ensureQueryData({
      queryKey: ["notes", null],
      queryFn: () => getNotes({}),
    });
  }, [notes, queryClient, tagId]);

  const { sortBy, sortOrder, setSort, prepareCardMotion } = list;
  const place = React.useCallback(
    async (drop: NoteDrop) => {
      const all = (await allNotes()).filter((n) => !n.isArchived);
      const isCustom = sortBy === "custom";
      const places = placesForDrop({ all, drop, isCustom, sortBy, sortOrder });
      const pin =
        drop.from === drop.to
          ? undefined
          : { noteId: drop.noteId, isPinned: drop.to === "pinned" };

      await queryClient.cancelQueries({ queryKey: ["notes"] });
      prepareCardMotion();
      const write: OrderWrite = { places, pin };
      showInCache(write);
      save.mutate(write);
      if (isCustom) return;

      const byId = new Map(all.map((n) => [n.id, n]));
      const back: OrderWrite = {
        places: places.map(({ id }) => {
          const note = byId.get(id);
          return {
            id,
            position: note ? placeBefore(note, sortBy, sortOrder) : null,
          };
        }),
        pin: pin && { noteId: pin.noteId, isPinned: !pin.isPinned },
      };
      setSort("custom", "desc");
      toast(t("switchedToCustom"), {
        undo: () => {
          prepareCardMotion();
          setSort(sortBy, sortOrder);
          showInCache(back);
          save.mutate(back);
        },
      });
    },
    [
      allNotes,
      prepareCardMotion,
      queryClient,
      save,
      setSort,
      showInCache,
      sortBy,
      sortOrder,
      t,
    ],
  );

  return { onReorder: place };
}

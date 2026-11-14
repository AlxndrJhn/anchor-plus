"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import * as React from "react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";
import { eachLimited } from "@/lib/each";
import { useLastShown } from "@/lib/hooks/use-last-shown";
import { saveNote } from "../api";
import type { Note } from "../types";
import { BackgroundPicker } from "./background-picker";

interface BulkColorPickerProps {
  anchor: HTMLElement | null;
  notes: Note[];
  onClose: () => void;
  onDone: () => void;
}

/** One colour or pattern for every selected note the person can edit. */
export function BulkColorPicker({
  anchor,
  notes,
  onClose,
  onDone,
}: BulkColorPickerProps) {
  const t = useTranslations("notes.bulkColorPicker");
  const tc = useTranslations("common");
  const queryClient = useQueryClient();
  const shownAnchor = useLastShown(anchor, !!anchor);
  const anchorRef = React.useMemo(
    () => ({
      current: {
        getBoundingClientRect: () => {
          if (!shownAnchor) return new DOMRect();
          const button = shownAnchor.getBoundingClientRect();
          const bar = (
            shownAnchor.closest("[data-slot=selection-bar]") ?? shownAnchor
          ).getBoundingClientRect();
          return new DOMRect(button.x, bar.y, button.width, bar.height);
        },
      },
    }),
    [shownAnchor],
  );

  const editable = notes.filter(
    (n) => n.permission !== "viewer" && !n.isFrozen,
  );
  const backgrounds = new Set(editable.map((n) => n.background ?? null));
  const shared = backgrounds.size === 1 ? [...backgrounds][0] : undefined;

  const showBackgrounds = (change: Map<string, string | null>) =>
    queryClient.setQueriesData<unknown>(
      { queryKey: ["notes"] },
      (data: unknown) =>
        Array.isArray(data)
          ? (data as Note[]).map((note) =>
              change.has(note.id)
                ? { ...note, background: change.get(note.id) ?? null }
                : note,
            )
          : data,
    );

  const send = (change: Map<string, string | null>) =>
    eachLimited([...change.keys()], async (id) => {
      const result = await saveNote(id, { background: change.get(id) ?? null });
      if (result.status !== "saved") throw new Error("not saved");
    });

  const apply = (background: string | null) => {
    const before = new Map(editable.map((n) => [n.id, n.background ?? null]));
    const after = new Map(editable.map((n) => [n.id, background]));
    onClose();
    onDone();
    showBackgrounds(after);
    const refresh = () =>
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    send(after).then(
      () => {
        refresh();
        const skipped = notes.length - editable.length;
        toast.success(
          skipped
            ? t("changedSkipped", { count: editable.length, skipped })
            : t("changed", { count: editable.length }),
          {
            undo: () => {
              showBackgrounds(before);
              send(before).then(refresh, () => {
                refresh();
                toast.error(tc("couldNotUndo"));
              });
            },
          },
        );
      },
      () => {
        refresh();
        toast.error(t("couldNotChange"), {
          retry: () => apply(background),
        });
      },
    );
  };

  return (
    <Popover open={!!anchor} onOpenChange={(open) => !open && onClose()}>
      <PopoverAnchor virtualRef={anchorRef} />
      <PopoverContent
        side="top"
        align="center"
        className="p-0"
        onInteractOutside={(e) => {
          if (shownAnchor?.contains(e.target as Node)) e.preventDefault();
        }}
      >
        {editable.length === 0 ? (
          <p className="m-0 max-w-64 p-3.5 text-muted-foreground text-ui">
            {t("viewOnly")}
          </p>
        ) : (
          <BackgroundPicker
            value={shared === undefined ? "" : shared}
            onChange={apply}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { usePreferencesStore } from "@/features/preferences";
import { getTags } from "./api";
import type { Tag, TagLabel } from "./types";
import { sortTags } from "./utils";

const NO_TAGS: TagLabel[] = [];

// Without counts, archiving or trashing a note doesn't redraw every card.
const toLabels = (tags: Tag[]): TagLabel[] =>
  tags.map(({ id, name, color, position }) => ({ id, name, color, position }));

/** How tags are listed: "custom" (dragged order) unless set to by name. */
export function useTagSort() {
  return usePreferencesStore((s) => s.notes.tagSort ?? "custom");
}

/** Puts tags in the order the person lists them, everywhere tags show. */
export function useTagOrder() {
  const mode = useTagSort();
  return useCallback(
    <T extends Pick<Tag, "name" | "position">>(tags: readonly T[]) =>
      sortTags(tags, mode),
    [mode],
  );
}

export function useTags() {
  return useQuery({ queryKey: ["tags"], queryFn: getTags });
}

export function useTagMap(): Map<string, TagLabel> {
  const { data: tags = NO_TAGS } = useQuery({
    queryKey: ["tags"],
    queryFn: getTags,
    select: toLabels,
  });
  return useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);
}

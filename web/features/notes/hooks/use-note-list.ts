"use client";

import { useSearchParams } from "next/navigation";
import * as React from "react";
import {
  type SortBy,
  type SortOrder,
  usePreferencesStore,
  type ViewMode,
} from "@/features/preferences";
import { NOTES_WILL_CHANGE } from "@/lib/destroy";
import { hasOverlay, isTypingTarget } from "@/lib/hooks/use-shortcuts";
import { hasShortcutKey } from "@/lib/platform";
import { useFlip } from "@/lib/use-flip";
import {
  filterCount,
  filtersFromParams,
  matchesFilters,
  type NoteFilters,
  writeFilterParams,
} from "../note-filters";
import { matchesSearch } from "../search";
import { compareNotes } from "../sort";
import type { Note } from "../types";
import { QUERY_PARAM } from "../url-with-query";

export { matchesSearch };

/** Keeps the search and filters in the address, so Back from an opened note
 * finds the same results. */
function writeListParams(query: string, filters: NoteFilters) {
  const url = new URL(window.location.href);
  const before = url.search;
  if (query) url.searchParams.set(QUERY_PARAM, query);
  else url.searchParams.delete(QUERY_PARAM);
  writeFilterParams(url.searchParams, filters);
  if (url.search === before) return;
  window.history.replaceState(window.history.state, "", url);
}

const NO_NOTES: Note[] = [];

interface Finding {
  term: string;
  filters: NoteFilters;
  activeFilters: number;
}

function findAndSort(
  notes: Note[],
  { term, filters, activeFilters }: Finding,
  sortBy: SortBy,
  sortOrder: SortOrder,
) {
  const found =
    term || activeFilters
      ? notes.filter(
          (note) => matchesSearch(note, term) && matchesFilters(note, filters),
        )
      : notes;
  return [...found].sort(compareNotes(sortBy, sortOrder));
}

export function useNoteList(
  notes: Note[],
  {
    pinnedFirst = false,
    archived,
  }: {
    pinnedFirst?: boolean;
    archived?: {
      notes: Note[];
      isSearchOnly: boolean;
      canFold: boolean;
      /** Ignored while searching. */
      isFolded: boolean;
    };
  } = {},
) {
  const {
    viewMode,
    sortBy: storedSortBy,
    sortOrder,
    showPictures,
  } = usePreferencesStore((s) => s.notes);
  // A "Custom" sort saved by an earlier version: dragging now works in the
  // default order instead.
  const sortBy: SortBy =
    (storedSortBy as string) === "custom" ? "updatedAt" : storedSortBy;
  const setNotesPreference = usePreferencesStore((s) => s.setNotesPreference);
  const boardRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const flip = useFlip(boardRef);
  // A note deleted while open burns in this list, then goes: its cards
  // strike into their places.
  const { prepare } = flip;
  React.useEffect(() => {
    const strike = () => prepare("strike");
    window.addEventListener(NOTES_WILL_CHANGE, strike);
    return () => window.removeEventListener(NOTES_WILL_CHANGE, strike);
  }, [prepare]);
  const searchParams = useSearchParams();
  // Kept in the address, so Back from an opened note finds the same results.
  const [query, setQueryValue] = React.useState(
    () => searchParams.get(QUERY_PARAM) ?? "",
  );
  const [filters, setFiltersValue] = React.useState<NoteFilters>(() =>
    filtersFromParams(searchParams),
  );
  const searchedQuery = React.useDeferredValue(query);
  const term = searchedQuery.trim().toLowerCase();
  React.useEffect(() => {
    const timer = window.setTimeout(() => writeListParams(query, filters), 250);
    return () => window.clearTimeout(timer);
  }, [query, filters]);
  const activeFilters = filterCount(filters);
  const [picking, setPicking] = React.useState(false);
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const lastPick = React.useRef<string | null>(null);

  const finding = React.useMemo(
    () => ({ term, filters, activeFilters }),
    [term, filters, activeFilters],
  );
  const visible = React.useMemo(
    () => findAndSort(notes, finding, sortBy, sortOrder),
    [notes, finding, sortBy, sortOrder],
  );
  // Archived notes come into a search or a filter.
  const isSearching = term !== "" || activeFilters > 0;
  const hasArchived = !!archived && (isSearching || !archived.isSearchOnly);
  const archivedNotes = (hasArchived && archived?.notes) || NO_NOTES;
  const archivedVisible = React.useMemo(
    () => findAndSort(archivedNotes, finding, sortBy, sortOrder),
    [archivedNotes, finding, sortBy, sortOrder],
  );
  const isArchivedFoldable = hasArchived && !!archived?.canFold && !isSearching;
  const isArchivedOpen =
    hasArchived && !(isArchivedFoldable && archived?.isFolded);
  const pinned = React.useMemo(
    () => (pinnedFirst ? visible.filter((n) => n.isPinned) : []),
    [pinnedFirst, visible],
  );
  const others = React.useMemo(
    () => (pinnedFirst ? visible.filter((n) => !n.isPinned) : visible),
    [pinnedFirst, visible],
  );
  const shown = React.useMemo(
    () =>
      pinned.length || isArchivedOpen
        ? [...pinned, ...others, ...(isArchivedOpen ? archivedVisible : [])]
        : others,
    [pinned, others, isArchivedOpen, archivedVisible],
  );
  const shownRef = React.useRef(shown);
  React.useLayoutEffect(() => {
    shownRef.current = shown;
  });

  const stopPicking = React.useCallback(() => {
    setPicking(false);
    setPicked(new Set());
    lastPick.current = null;
  }, []);

  React.useEffect(() => {
    if (!picking) return;
    // An Esc that closed a menu, pop-over or dialog stops there.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) stopPicking();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [picking, stopPicking]);

  React.useEffect(() => {
    // Select every note shown, as in Google Keep.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || !hasShortcutKey(e) || e.altKey || e.shiftKey)
        return;
      if (e.key.toLowerCase() !== "a") return;
      if (isTypingTarget(e.target) || hasOverlay()) return;
      const ids = shownRef.current.map((n) => n.id);
      if (!ids.length) return;
      e.preventDefault();
      window.getSelection()?.removeAllRanges();
      setPicking(true);
      setPicked(new Set(ids));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    const shownIds = new Set(shown.map((note) => note.id));
    setPicked((prev) => {
      const kept = [...prev].filter((id) => shownIds.has(id));
      return kept.length === prev.size ? prev : new Set(kept);
    });
  }, [shown]);

  const isEmpty = notes.length === 0 && archivedNotes.length === 0;
  React.useEffect(() => {
    if (picking && isEmpty) stopPicking();
  }, [picking, isEmpty, stopPicking]);

  const onPick = React.useCallback((id: string, range: boolean) => {
    const ids = shownRef.current.map((n) => n.id);
    const from = lastPick.current ? ids.indexOf(lastPick.current) : -1;
    const to = ids.indexOf(id);
    lastPick.current = id;
    setPicking(true);
    setPicked((prev) => {
      const next = new Set(prev);
      if (range && from >= 0 && to >= 0)
        for (const rangeId of ids.slice(
          Math.min(from, to),
          Math.max(from, to) + 1,
        ))
          next.add(rangeId);
      else if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = () =>
    setPicked(
      picked.size === shown.length
        ? new Set()
        : new Set(shown.map((n) => n.id)),
    );
  const chosen = shown.filter((n) => picked.has(n.id));

  return {
    boardRef,
    searchRef,
    prepareCardMotion: flip.prepare,
    query,
    /** The searched term, lowercase and trimmed; lags typing a little. */
    term,
    setQuery: (value: string) => {
      flip.prepare();
      setQueryValue(value);
    },
    filters,
    /** How many filters are on. */
    activeFilters,
    setFilters: (next: NoteFilters) => {
      flip.prepare();
      setFiltersValue(next);
    },
    /** Whether a search or a filter narrows the list. */
    searching: isSearching,
    /** Puts the search in the address now, as the field loses focus. */
    flushQueryToUrl: () => writeListParams(query, filters),
    layout: viewMode,
    setLayout: (layout: ViewMode) => {
      flip.prepare();
      setNotesPreference("viewMode", layout);
    },
    sortBy,
    sortOrder,
    showPictures: showPictures !== false,
    setShowPictures: (show: boolean) => {
      flip.prepare();
      setNotesPreference("showPictures", show);
    },
    setSort: (by: SortBy, order: SortOrder) => {
      flip.prepare();
      setNotesPreference("sortBy", by);
      setNotesPreference("sortOrder", order);
    },
    visible,
    pinned,
    others,
    isSearching,
    hasArchived,
    archived: archivedVisible,
    isArchivedFoldable,
    isArchivedOpen,
    shown,
    picking,
    togglePicking: () => (picking ? stopPicking() : setPicking(true)),
    picked,
    chosen,
    onPick,
    toggleAll,
    stopPicking,
  };
}

export type NoteList = ReturnType<typeof useNoteList>;

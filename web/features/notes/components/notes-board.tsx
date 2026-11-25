"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  commandForKey,
  useCommands,
  useContextKey,
} from "@/features/keybindings";
import { useTagMap } from "@/features/tags/hooks";
import { moveItem } from "@/features/tags/utils";
import { useDelayedFlag } from "@/lib/hooks/use-delayed-flag";
import { hasOverlay } from "@/lib/hooks/use-shortcuts";
import { cn } from "@/lib/utils";
import {
  type Direction,
  focusEdgeCard,
  moveCardFocus,
  reachFollowedCard,
  refocusLeftCard,
} from "../card-focus";
import type { DropTarget } from "../columns";
import { useCardColumns } from "../hooks/use-card-columns";
import { type DragPreview, useCardDrag } from "../hooks/use-card-drag";
import type { Note } from "../types";
import { type CardLayout, NoteCard } from "./note-card";

/** Commands a focused card runs through onCardKey. */
export type CardCommand =
  | "list.togglePin"
  | "list.toggleArchive"
  | "list.trash";

const MOVES = {
  "list.focusUp": "up",
  "list.focusDown": "down",
  "list.focusLeft": "left",
  "list.focusRight": "right",
} as const satisfies Record<string, Direction>;
const MOVE_COMMANDS = [
  "list.focusUp",
  "list.focusDown",
  "list.focusLeft",
  "list.focusRight",
  "list.open",
] as const;
const CARD_COMMANDS = [
  ...MOVE_COMMANDS,
  "list.togglePin",
  "list.toggleArchive",
  "list.trash",
] as const;

interface NotesBoardGroup {
  key: string;
  label?: string;
  icon?: React.ReactNode;
  notes: Note[];
  fold?: { isOpen: boolean; onToggle: () => void };
  fallback?: React.ReactNode;
  /** Its notes keep their places when others are dragged. */
  isFixed?: boolean;
  /**
   * Shown while a note is dragged and the group has none, as a place to drop
   * it ("Drop here to pin"). Such a group is left out while it's empty.
   */
  dropHint?: string;
}

/** A note let go at a new place, maybe in another group. */
export interface NoteDrop {
  noteId: string;
  from: string;
  to: string;
  /** The new order of the group it landed in. */
  ids: string[];
}

interface NotesBoardProps {
  groups: NotesBoardGroup[];
  layout: CardLayout;
  picking: boolean;
  picked: Set<string>;
  /** Leave out for cards that can't be picked. */
  onPick?: (noteId: string, range: boolean) => void;
  onShare?: (note: Note) => void;
  /** Pins or unpins a note from its card. Keep it stable. */
  onTogglePin?: (note: Note) => void;
  /** Keep it stable, or every card redraws. */
  renderActions?: (note: Note) => React.ReactNode;
  dateLabel?: (note: Note) => string;
  /** The search the notes were found by. */
  searchTerm?: string;
  /**
   * Lets cards be dragged to new places, as in Google Keep, also into
   * another group; called when one is let go. Alt+Arrow keys on a card move
   * it one place within its group.
   */
  onReorder?: (drop: NoteDrop) => void;
  /** A finger held a card and let go without moving it. */
  onHold?: (noteId: string) => void;
  /**
   * A command run by a key on a focused card while nothing is selected,
   * such as list.trash; returns whether it acted.
   */
  onCardKey?: (note: Note, command: CardCommand) => boolean;
  /** Columns: where a card opens, and which note is open beside the list. */
  noteHref?: (noteId: string) => string;
  openId?: string | null;
  /** Columns: cards, or all picked ones, can be let go on the sidebar. */
  onDropOut?: (noteIds: string[], target: DropTarget) => void;
}

export const NotesBoard = React.forwardRef<HTMLDivElement, NotesBoardProps>(
  (
    {
      groups,
      layout,
      picking,
      picked,
      onPick,
      onShare,
      onTogglePin,
      renderActions,
      dateLabel,
      searchTerm,
      onReorder,
      onHold,
      onCardKey,
      noteHref,
      openId,
      onDropOut,
    },
    ref,
  ) => {
    const t = useTranslations("notes.notesBoard");
    const isList = layout === "list";
    const tagMap = useTagMap();
    const boardRef = React.useRef<HTMLDivElement>(null);
    const rulerRef = React.useRef<HTMLDivElement>(null);
    const boardId = React.useId();
    React.useImperativeHandle(ref, () => boardRef.current as HTMLDivElement);
    useCardColumns(boardRef, rulerRef);
    const shownIds = React.useMemo(
      () => groups.flatMap((g) => g.notes.map((n) => n.id)),
      [groups],
    );
    const drag = useCardDrag({
      enabled: !!onReorder && !picking,
      onDrop: (noteId, from, to, ids) => onReorder?.({ noteId, from, to, ids }),
      onHold,
      dropOut: onDropOut ? { picked, shownIds, onDrop: onDropOut } : undefined,
    });
    // Keyboard moves: Alt+Arrow keys on a focused card.
    const [announcement, setAnnouncement] = React.useState("");
    const refocus = React.useRef<string | null>(null);
    const live = React.useRef({ groups, onReorder });
    live.current = { groups, onReorder };
    const canMove = drag.enabled;
    const moveCard = React.useCallback(
      (noteId: string, step: -1 | 1) => {
        const { groups, onReorder } = live.current;
        const group = groups.find(
          (g) => !g.isFixed && g.notes.some((n) => n.id === noteId),
        );
        if (!group || !onReorder) return;
        const ids = group.notes.map((n) => n.id);
        const to = ids.indexOf(noteId) + step;
        if (to < 0 || to >= ids.length) return;
        refocus.current = noteId;
        onReorder({
          noteId,
          from: group.key,
          to: group.key,
          ids: moveItem(ids, ids.indexOf(noteId), to),
        });
        setAnnouncement(t("movedTo", { position: to + 1, total: ids.length }));
      },
      [t],
    );
    // The moved card is put back in the list; focus goes with it.
    // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the order changes
    React.useEffect(() => {
      const id = refocus.current;
      if (!id) return;
      refocus.current = null;
      const link = boardRef.current?.querySelector<HTMLElement>(
        `.nc[data-flip="${CSS.escape(id)}"] > .nc-link`,
      );
      if (link && document.activeElement !== link) link.focus();
    }, [groups]);

    // Every group a dragged note may land in, with its order.
    const dropGroups = Object.fromEntries(
      groups
        .filter((g) => !g.isFixed)
        .map((g) => [g.key, g.notes.map((n) => n.id)]),
    );
    const allNotes = new Map(
      groups.flatMap((g) => g.notes.map((n) => [n.id, n] as const)),
    );

    // A let-go order is held until the notes arrive in it.
    const { preview, settled } = drag;
    React.useEffect(() => {
      if (!preview?.settling) return;
      const group = groups.find((g) => g.key === preview.group);
      if (group)
        settled(
          group.key,
          group.notes.map((n) => n.id),
        );
    }, [preview, groups, settled]);
    // A card acted on by key keeps focus where it moves (pinned), or hands it
    // to its neighbour when it leaves (archived, deleted).
    const kept = React.useRef<{ id: string; next?: string; at: number }>(null);
    // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the notes change
    React.useLayoutEffect(() => {
      const keep = kept.current;
      if (!keep) return;
      if (performance.now() - keep.at > 10000) {
        kept.current = null;
        return;
      }
      const find = (id?: string) =>
        id
          ? boardRef.current?.querySelector<HTMLElement>(
              `.nc[data-flip="${CSS.escape(id)}"] > .nc-link`,
            )
          : null;
      const own = find(keep.id);
      const link = own ?? find(keep.next);
      if (!own) kept.current = null;
      const active = document.activeElement;
      if (link && (!active || active === document.body)) link.focus();
    }, [groups]);
    React.useLayoutEffect(() => {
      if (!groups.some((g) => g.notes.length)) return;
      refocusLeftCard();
      reachFollowedCard();
    }, [groups]);
    // With no card focused, J and K start at the first card, as do the
    // arrows with nothing focused at all (L is the notes page's new list);
    // G goes to the last. The first of two boards takes the key.
    useCommands({
      "list.focusFirst": () => focusEdgeCard("first"),
      "list.focusLast": () => focusEdgeCard("last"),
    });
    useContextKey("notesList", true);
    React.useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (e.defaultPrevented || e.target !== document.body) return;
        if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
        if (!e.key.startsWith("Arrow") || hasOverlay()) return;
        if (focusEdgeCard("first")) e.preventDefault();
      };
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }, []);
    const onKeyDown = (e: React.KeyboardEvent) => {
      const link = e.target as HTMLElement;
      if (!link.classList.contains("nc-link") || e.defaultPrevented) return;
      // While picking, the selection bar takes pin, archive and delete.
      const command = commandForKey(
        e.nativeEvent,
        picking ? MOVE_COMMANDS : CARD_COMMANDS,
        { cardFocus: true, selecting: !!picking },
      );
      if (!command) return;
      if (command in MOVES) {
        e.preventDefault();
        moveCardFocus(link, MOVES[command as keyof typeof MOVES]);
        return;
      }
      if (command === "list.open") {
        e.preventDefault();
        link.click();
        return;
      }
      if (onCardKey) {
        const id = link.closest<HTMLElement>(".nc")?.dataset.flip;
        const note = groups.flatMap((g) => g.notes).find((n) => n.id === id);
        if (note && onCardKey(note, command as CardCommand)) {
          e.preventDefault();
          const links = [
            ...(boardRef.current?.querySelectorAll<HTMLElement>(".nc-link") ??
              []),
          ];
          const at = links.indexOf(link);
          const next = links[at + 1] ?? links[at - 1];
          kept.current = {
            id: note.id,
            next: next?.closest<HTMLElement>(".nc")?.dataset.flip,
            at: performance.now(),
          };
        }
      }
    };
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: keys pressed on the focused card links bubble here
      <div
        ref={boardRef}
        data-hold-width
        className="relative grid min-w-0 gap-3.5"
        onKeyDown={onKeyDown}
      >
        <div
          ref={rulerRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-0"
        />
        {groups.map((group) => {
          const shownNotes = inPreviewOrder(group, drag.preview, allNotes);
          if (group.dropHint && !shownNotes.length) {
            if (!drag.preview || drag.preview.settling) return null;
            return (
              <div
                key={group.key}
                data-drag-group={group.key}
                className={cn("cards-drop", isList && "list")}
              >
                {group.icon}
                {group.dropHint}
              </div>
            );
          }
          const heading = (
            <>
              {group.icon}
              {group.label}
              <span className="ml-0.5 font-medium tracking-normal tabular-nums">
                {shownNotes.length}
              </span>
            </>
          );
          const cardsId = `${boardId}-${group.key}`;
          const isShown = !group.fold || group.fold.isOpen;
          return (
            <React.Fragment key={group.key}>
              {group.label && (
                <h2
                  data-flip={`grp:${group.key}`}
                  className={cn(
                    "m-0 mt-1.5 flex items-center gap-1.5 px-0.5 text-label text-muted-foreground uppercase [&+div]:-mt-1 [&_svg]:size-3.25",
                    isList && "w-full max-w-195 justify-self-center",
                  )}
                >
                  {group.fold ? (
                    <button
                      type="button"
                      aria-expanded={group.fold.isOpen}
                      aria-controls={group.fold.isOpen ? cardsId : undefined}
                      onClick={group.fold.onToggle}
                      className="-mx-0.5 -my-1.5 flex cursor-pointer items-center gap-1.5 rounded-sm border-0 bg-transparent px-0.5 py-1.5 text-inherit uppercase transition-colors duration-(--duration-hover) hover:text-foreground max-md:flex-1 pointer-coarse:-my-3.5 pointer-coarse:py-3.5"
                    >
                      {heading}
                      <ChevronRight
                        aria-hidden
                        className={cn(
                          "transition-transform duration-(--duration-move) ease-standard max-md:ml-auto",
                          group.fold.isOpen && "rotate-90",
                        )}
                      />
                    </button>
                  ) : (
                    heading
                  )}
                </h2>
              )}
              {isShown && group.fallback}
              {isShown && !group.fallback && (
                // biome-ignore lint/a11y/noStaticElementInteractions: the pointer drag surface; Alt+Arrow keys on each card move it
                <div
                  id={cardsId}
                  data-drag-group={
                    drag.active && (!group.isFixed || onDropOut)
                      ? group.key
                      : undefined
                  }
                  className={cn("cards", layout, picking && "picking")}
                  // A card is a link; the browser's own link dragging would
                  // take the pointer away from ours.
                  onDragStart={
                    drag.active ? (e) => e.preventDefault() : undefined
                  }
                  onPointerDown={
                    group.isFixed && !onDropOut
                      ? undefined
                      : group.isFixed
                        ? (e) =>
                            drag.onPointerDown(
                              e,
                              group.key,
                              { [group.key]: group.notes.map((n) => n.id) },
                              false,
                            )
                        : (e) => drag.onPointerDown(e, group.key, dropGroups)
                  }
                >
                  {shownNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      tagMap={tagMap}
                      layout={layout}
                      picking={picking}
                      picked={picked.has(note.id)}
                      onPick={onPick}
                      onShare={onShare}
                      onTogglePin={onTogglePin}
                      renderActions={renderActions}
                      dateLabel={dateLabel?.(note)}
                      searchTerm={searchTerm}
                      onMove={canMove && !group.isFixed ? moveCard : undefined}
                      href={noteHref?.(note.id)}
                      isOpen={note.id === openId}
                    />
                  ))}
                </div>
              )}
            </React.Fragment>
          );
        })}
        <div className="sr-only" aria-live="polite">
          {announcement}
        </div>
      </div>
    );
  },
);
NotesBoard.displayName = "NotesBoard";

/**
 * A group's notes in the order a drag is showing, if one is under way: the
 * group it would land in shows it, the one it left goes without.
 */
function inPreviewOrder(
  group: NotesBoardGroup,
  preview: DragPreview | null,
  allNotes: Map<string, Note>,
): Note[] {
  if (!preview) return group.notes;
  if (preview.group !== group.key)
    return preview.from === group.key
      ? group.notes.filter((n) => n.id !== preview.draggedId)
      : group.notes;
  const shown = preview.ids.flatMap((id) => allNotes.get(id) ?? []);
  // A note that arrived during the drag goes at the end.
  for (const note of group.notes)
    if (!preview.ids.includes(note.id) && note.id !== preview.draggedId)
      shown.push(note);
  return shown;
}

export function NotesBoardSkeleton({ loading }: { loading: boolean }) {
  const t = useTranslations("notes.notesBoard");
  const shown = useDelayedFlag(loading);
  const boardRef = React.useRef<HTMLDivElement>(null);
  const rulerRef = React.useRef<HTMLDivElement>(null);
  useCardColumns(boardRef, rulerRef);
  if (!shown) return null;
  return (
    <div
      ref={boardRef}
      role="status"
      aria-label={t("loading")}
      className="relative"
    >
      <div
        ref={rulerRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-0"
      />
      <div className="cards masonry">
        {[5, 3, 4, 2, 4, 3, 5, 2].map((lines, index) => (
          <div
            key={index}
            className="grid gap-2 rounded-card bg-card p-4 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--border)_60%,transparent)]"
          >
            <Skeleton className="h-3.5 w-[62%] bg-[linear-gradient(90deg,var(--muted)_30%,color-mix(in_srgb,var(--muted)_40%,var(--card))_50%,var(--muted)_70%)]" />
            {Array.from({ length: lines }, (_, i) => (
              <Skeleton
                key={i}
                className="bg-[linear-gradient(90deg,var(--muted)_30%,color-mix(in_srgb,var(--muted)_40%,var(--card))_50%,var(--muted)_70%)]"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

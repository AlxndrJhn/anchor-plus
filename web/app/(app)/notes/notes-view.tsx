"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  Hash,
  Images,
  Lock,
  Palette,
  Pin,
  PinOff,
  Plus,
  Printer,
  Snowflake,
  Tag as TagIcon,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { AppPage, Fab, PageTitle } from "@/components/layout/app-page";
import { newNoteHref } from "@/components/layout/sidebar";
import { Button, IconButton } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  EmptyState,
  LoadFailedRow,
  LoadFailedState,
} from "@/components/ui/empty-state";
import { SelectionBar } from "@/components/ui/selection-bar";
import { toast } from "@/components/ui/toast";
import { Tip } from "@/components/ui/tooltip";
import {
  bulkArchiveNotes,
  bulkDeleteNotes,
  bulkPinNotes,
  getNotes,
  restoreNote,
  setNotePosition,
  unarchiveNote,
} from "@/features/notes/api";
import { BulkColorPicker } from "@/features/notes/components/bulk-color-picker";
import { BulkTagPicker } from "@/features/notes/components/bulk-tag-picker";
import { BulkLockDialog } from "@/features/notes/components/lock/bulk-lock-dialog";
import {
  NoSearchResults,
  NoteListActions,
} from "@/features/notes/components/note-list-actions";
import {
  NotesBoard,
  NotesBoardSkeleton,
} from "@/features/notes/components/notes-board";
import { ShareDialog } from "@/features/notes/components/share-dialog";
import { storageSizeLabel } from "@/features/notes/file-size";
import { useArchivedNotes } from "@/features/notes/hooks/use-archived-notes";
import {
  isOwnFrozen,
  useApplyFreeze,
} from "@/features/notes/hooks/use-note-freeze";
import { useNoteList } from "@/features/notes/hooks/use-note-list";
import { useRefreshNotes } from "@/features/notes/hooks/use-refresh-notes";
import { matchesFilters } from "@/features/notes/note-filters";
import { printNoteList } from "@/features/notes/print";
import { positionBetween } from "@/features/notes/sort";
import type { Note } from "@/features/notes/types";
import { usePictureMatches } from "@/features/picture-search/use-picture-matches";
import { tagColorStyle, useTagMap } from "@/features/tags";
import { burnNoteCards } from "@/lib/destroy";
import { eachLimited } from "@/lib/each";
import { useDocumentTitle } from "@/lib/hooks/use-document-title";
import { useShortcuts } from "@/lib/hooks/use-shortcuts";
import { rememberNewNoteButton } from "@/lib/morph";

const NO_NOTES: Note[] = [];
const NO_PICKS = new Set<string>();

const UNDOABLE_ACTIONS = {
  pin: {
    run: (ids: string[]) => bulkPinNotes(ids, true),
    undo: (ids: string[]) => bulkPinNotes(ids, false),
    done: "notesPinned",
    failed: "couldNotPin",
  },
  unpin: {
    run: (ids: string[]) => bulkPinNotes(ids, false),
    undo: (ids: string[]) => bulkPinNotes(ids, true),
    done: "notesUnpinned",
    failed: "couldNotUnpin",
  },
  archive: {
    run: (ids: string[]) => bulkArchiveNotes(ids),
    undo: (ids: string[]) => eachLimited(ids, unarchiveNote),
    done: "notesArchived",
    failed: "couldNotArchive",
    isArchived: true,
  },
  unarchive: {
    run: (ids: string[]) => eachLimited(ids, unarchiveNote),
    undo: (ids: string[]) => bulkArchiveNotes(ids),
    done: "notesUnarchived",
    failed: "couldNotUnarchive",
    isArchived: false,
  },
} satisfies Record<
  string,
  {
    run: (ids: string[]) => Promise<unknown>;
    undo: (ids: string[]) => Promise<unknown>;
    done: "notesPinned" | "notesUnpinned" | "notesArchived" | "notesUnarchived";
    failed:
      | "couldNotPin"
      | "couldNotUnpin"
      | "couldNotArchive"
      | "couldNotUnarchive";
    isArchived?: boolean;
  }
>;

type NoteActionKind = keyof typeof UNDOABLE_ACTIONS | "trash";

export default function NotesPage() {
  const tagId = useSearchParams().get("tagId");
  // Next keeps the page mounted when only the tag changes.
  return <NotesView key={tagId ?? ""} tagId={tagId} />;
}

function NotesView({ tagId }: { tagId: string | null }) {
  const t = useTranslations("notes.notesPage");
  const tb = useTranslations("notes.bulkDelete");
  const tc = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const refresh = useRefreshNotes();
  const tagMap = useTagMap();
  const tag = tagId ? tagMap.get(tagId) : undefined;
  const [tagAnchor, setTagAnchor] = React.useState<HTMLElement | null>(null);
  const [colorAnchor, setColorAnchor] = React.useState<HTMLElement | null>(
    null,
  );
  const [sharingNote, setSharingNote] = React.useState<Note | null>(null);
  const [locking, setLocking] = React.useState(false);
  const [confirmRemove, setConfirmRemove] = React.useState<{
    ids: string[];
    sharedCount: number;
  } | null>(null);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["notes", tagId],
    queryFn: () => getNotes({ tagId: tagId || undefined }),
  });
  const notes = data ?? NO_NOTES;
  const loadFailed = isError && !data;

  const archived = useArchivedNotes(tagId, notes);
  const list = useNoteList(notes, {
    pinnedFirst: true,
    archived: archived.listOptions,
  });
  const { visible, pinned, others, chosen } = list;
  const isArchiveLoading = list.hasArchived && archived.query.isLoading;
  const archiveFailed =
    list.hasArchived && archived.query.isError && !archived.query.data;

  // Filtering without typing a search also brings in archived notes.
  const loadArchived = archived.loadForSearch;
  React.useEffect(() => {
    if (list.activeFilters > 0) loadArchived();
  }, [list.activeFilters, loadArchived]);

  // Notes whose pictures look like the search, for those who turned
  // picture search on: after the notes that match by their words.
  const pictureCandidates = React.useMemo(
    () =>
      [...notes, ...(list.hasArchived ? archived.tagged : [])].filter((n) =>
        matchesFilters(n, list.filters),
      ),
    [notes, list.hasArchived, archived.tagged, list.filters],
  );
  const shownNotes = React.useMemo(
    () => [...visible, ...list.archived],
    [visible, list.archived],
  );
  const pictureMatches = usePictureMatches(
    list.searching ? list.term : "",
    pictureCandidates,
    shownNotes,
  );

  const allPinned = chosen.length > 0 && chosen.every((n) => n.isPinned);
  const allArchived = chosen.length > 0 && chosen.every((n) => n.isArchived);

  /**
   * A note let go at a new place, as in Google Keep: it goes between its new
   * neighbours, and stays there until it is next edited.
   */
  // Pinned or unpinned from its card: it moves to its section at once.
  const prepareCardMotion = list.prepareCardMotion;
  const togglePin = React.useCallback(
    (note: Note) => {
      const isPinned = !note.isPinned;
      const place = (pinned: boolean) =>
        queryClient.setQueriesData<unknown>(
          { queryKey: ["notes"] },
          (data: unknown) =>
            Array.isArray(data)
              ? (data as Note[]).map((n) =>
                  n.id === note.id ? { ...n, isPinned: pinned } : n,
                )
              : data,
        );
      prepareCardMotion();
      place(isPinned);
      bulkPinNotes([note.id], isPinned)
        .catch(() => {
          prepareCardMotion();
          place(!isPinned);
          toast.error(isPinned ? t("couldNotPinOne") : t("couldNotUnpinOne"));
        })
        .finally(() => refresh());
    },
    [prepareCardMotion, queryClient, refresh, t],
  );

  const reorderNote = (noteId: string, ids: string[]) => {
    const index = ids.indexOf(noteId);
    const byId = new Map(notes.map((n) => [n.id, n]));
    const position = positionBetween(
      byId.get(ids[index - 1]),
      byId.get(ids[index + 1]),
    );
    const before = byId.get(noteId);
    const place = (fields: Pick<Note, "position" | "positionedAt">) =>
      queryClient.setQueriesData<unknown>(
        { queryKey: ["notes"] },
        (data: unknown) =>
          Array.isArray(data)
            ? (data as Note[]).map((n) =>
                n.id === noteId ? { ...n, ...fields } : n,
              )
            : data,
      );
    place({ position, positionedAt: new Date().toISOString() });
    setNotePosition(noteId, position).catch(() => {
      list.prepareCardMotion();
      place({
        position: before?.position ?? null,
        positionedAt: before?.positionedAt ?? null,
      });
      toast.error(t("couldNotMove"), {
        retry: () => reorderNote(noteId, ids),
      });
    });
  };

  const noteAction = useMutation({
    mutationFn: async ({
      kind,
      ids,
    }: {
      kind: NoteActionKind;
      ids: string[];
    }) => {
      if (kind === "trash") {
        // Deleted cards burn away in place; the others strike into place after.
        const burn = burnNoteCards(ids);
        await burn.done;
        list.prepareCardMotion("strike");
        await bulkDeleteNotes(ids).catch((error: unknown) => {
          burn.restore();
          throw error;
        });
      } else await UNDOABLE_ACTIONS[kind].run(ids);
    },
    onMutate: ({ kind, ids }) => {
      if (kind === "trash") setConfirmRemove(null);
      else list.prepareCardMotion();
      return {
        ownedIds: ids.filter(
          (id) =>
            [...notes, ...archived.all].find((n) => n.id === id)?.permission ===
            "owner",
        ),
      };
    },
    onSuccess: (_, { kind, ids }, context) => {
      refresh();
      list.stopPicking();
      setConfirmRemove(null);
      const undo = async (run: () => Promise<unknown>) => {
        list.prepareCardMotion();
        try {
          await run();
        } catch {
          toast.error(tc("couldNotUndo"));
        }
        refresh();
      };
      if (kind === "trash") {
        const ownedIds = context?.ownedIds ?? [];
        toast.success(
          tb("deleted", {
            owned: ownedIds.length,
            shared: ids.length - ownedIds.length,
          }),
          ownedIds.length
            ? { undo: () => undo(() => eachLimited(ownedIds, restoreNote)) }
            : undefined,
        );
        return;
      }
      const action = UNDOABLE_ACTIONS[kind];
      const isArchived = "isArchived" in action ? action.isArchived : null;
      if (isArchived !== null) archived.setArchivedInCache(ids, isArchived);
      toast.success(t(action.done, { count: ids.length }), {
        undo: () =>
          undo(async () => {
            await action.undo(ids);
            if (isArchived !== null)
              archived.setArchivedInCache(ids, !isArchived);
          }),
      });
    },
    onError: (_, { kind, ids }) => {
      toast.error(
        kind === "trash"
          ? tb("couldNotDelete", { count: ids.length })
          : t(UNDOABLE_ACTIONS[kind].failed, { count: ids.length }),
        { retry: () => noteAction.mutate({ kind, ids }) },
      );
    },
  });

  const deleteNotes = (notes: Note[]) => {
    // Frozen notes stay where they are.
    const deletable = notes.filter((n) => !isOwnFrozen(n));
    if (!deletable.length) {
      toast.info(tb("frozenCantDelete"));
      return;
    }
    const ids = deletable.map((n) => n.id);
    const sharedCount = deletable.filter(
      (n) => n.permission !== "owner",
    ).length;
    if (sharedCount) setConfirmRemove({ ids, sharedCount });
    else noteAction.mutate({ kind: "trash", ids });
  };

  // The selection bar's keys, for the focused card when nothing is selected.
  const onCardKey = (note: Note, key: string) => {
    if (key === "Delete") deleteNotes([note]);
    else if (key === "e")
      noteAction.mutate({
        kind: note.isArchived ? "unarchive" : "archive",
        ids: [note.id],
      });
    else if (key === "f") togglePin(note);
    else return false;
    return true;
  };

  const applyFreeze = useApplyFreeze();
  const ownChosen = chosen.filter((n) => n.permission === "owner");
  const allFrozen = ownChosen.length > 0 && ownChosen.every((n) => n.isFrozen);
  const freezeChosen = () => {
    const isFrozen = !allFrozen;
    const ids = ownChosen
      .filter((n) => !!n.isFrozen !== isFrozen)
      .map((n) => n.id);
    list.stopPicking();
    applyFreeze(ids, isFrozen).then(
      () =>
        toast.success(
          t(isFrozen ? "frozen" : "unfrozen", { count: ids.length }),
          {
            undo: () =>
              void applyFreeze(ids, !isFrozen).catch(() =>
                toast.error(tc("couldNotUndo")),
              ),
          },
        ),
      () =>
        toast.error(
          t(isFrozen ? "couldNotFreeze" : "couldNotUnfreeze", {
            count: ids.length,
          }),
        ),
    );
  };

  const newNote = newNoteHref("/notes", tagId);
  useShortcuts({
    c: () => router.push(newNote),
    l: () => router.push(newNoteHref("/notes", tagId, { list: true })),
  });
  // Esc drops the search, then leaves a tag for all notes, once there's no
  // selection to drop.
  const leaveTag = () => router.push("/notes");
  const clearSearch = () => list.setQuery("");
  useShortcuts(
    { Escape: list.query ? clearSearch : leaveTag },
    (!!list.query || !!tagId) && !list.picking,
  );
  const noNotes =
    !isLoading &&
    !loadFailed &&
    notes.length === 0 &&
    !list.isSearching &&
    !(tagId && (isArchiveLoading || archiveFailed || archived.tagged.length));
  const hasArchivedSection = list.archived.length > 0 || archiveFailed;
  const noResults =
    list.isSearching &&
    visible.length === 0 &&
    !hasArchivedSection &&
    !isArchiveLoading &&
    !pictureMatches.length;
  const count =
    isLoading || loadFailed || isArchiveLoading
      ? undefined
      : visible.length + list.archived.length;
  const newNoteButton = (
    <Button asChild>
      <Link
        href={newNote}
        data-new-note="empty"
        onClick={(e) => rememberNewNoteButton(e.currentTarget)}
      >
        <Plus aria-hidden />
        {t("newNote")}
      </Link>
    </Button>
  );

  useDocumentTitle(tag ? tag.name : t("title"));
  const title = tag ? (
    <div className="flex min-w-0 items-center gap-1">
      <PageTitle
        count={count}
        icon={
          <span
            aria-hidden
            style={tagColorStyle(tag.color)}
            className="tag-color inline-grid text-(--hash) [&_svg]:size-5.25 [&_svg]:stroke-[2.75]"
          >
            <Hash />
          </span>
        }
      >
        {tag.name}
      </PageTitle>
      <Tip label={t("showAllNotes")}>
        <IconButton
          size="sm"
          label={t("showAllNotes")}
          onClick={() => router.push("/notes")}
        >
          <X />
        </IconButton>
      </Tip>
    </div>
  ) : (
    <PageTitle count={count}>{t("title")}</PageTitle>
  );

  const removeCount = confirmRemove?.ids.length ?? 0;
  const removeSharedCount = confirmRemove?.sharedCount ?? 0;
  return (
    <>
      <AppPage
        scrollKey={`notes:${tagId ?? ""}`}
        title={title}
        actions={
          !noNotes &&
          !loadFailed && (
            <NoteListActions
              list={list}
              placeholder={
                tag ? t("searchTag", { name: tag.name }) : t("searchNotes")
              }
              autoFocus={searchParams.has("search")}
              showTagFilter={!tagId}
              onSearchFocus={archived.loadForSearch}
            />
          )
        }
      >
        <NotesBoardSkeleton
          loading={
            isLoading ||
            (isArchiveLoading &&
              (list.isSearching ? !visible.length : !notes.length))
          }
        />
        {loadFailed && (
          <LoadFailedState
            title={t("couldNotLoad")}
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        )}
        {noNotes &&
          (tag ? (
            <EmptyState
              illustration="notes"
              title={t("noNotesTagged", { name: tag.name })}
              action={newNoteButton}
            >
              {t("noNotesTaggedHelp")}
            </EmptyState>
          ) : (
            <EmptyState
              illustration="notes"
              title={t("noNotesYet")}
              action={newNoteButton}
            >
              {t("noNotesYetHelp")}
            </EmptyState>
          ))}
        {noResults && <NoSearchResults list={list} />}
        {(visible.length > 0 || (hasArchivedSection && !isLoading)) && (
          <NotesBoard
            searchTerm={list.term || undefined}
            dateLabel={list.sortBy === "size" ? storageSizeLabel : undefined}
            onReorder={
              list.sortBy === "updatedAt" &&
              list.sortOrder === "desc" &&
              !list.searching &&
              !list.picking
                ? reorderNote
                : undefined
            }
            ref={list.boardRef}
            layout={list.layout}
            picking={list.picking}
            picked={list.picked}
            onPick={list.onPick}
            onShare={setSharingNote}
            onTogglePin={togglePin}
            onCardKey={onCardKey}
            groups={[
              ...(pinned.length
                ? [
                    {
                      key: "pinned",
                      label: t("pinned"),
                      icon: <Pin aria-hidden />,
                      notes: pinned,
                    },
                  ]
                : []),
              ...(others.length
                ? [
                    {
                      key: "others",
                      label: pinned.length ? t("others") : undefined,
                      notes: others,
                    },
                  ]
                : []),
              ...(hasArchivedSection
                ? [
                    {
                      key: "archived",
                      label: t("archived"),
                      icon: <Archive aria-hidden />,
                      notes: list.archived,
                      isFixed: true,
                      fold: list.isArchivedFoldable
                        ? {
                            isOpen: list.isArchivedOpen,
                            onToggle: () => {
                              list.prepareCardMotion();
                              archived.toggleFold();
                            },
                          }
                        : undefined,
                      fallback: archiveFailed ? (
                        <LoadFailedRow
                          message={t("couldNotLoadArchived")}
                          onRetry={() => archived.query.refetch()}
                          isRetrying={archived.query.isFetching}
                        />
                      ) : undefined,
                    },
                  ]
                : []),
            ]}
          />
        )}
        {pictureMatches.length > 0 && !list.picking && (
          <NotesBoard
            layout={list.layout}
            picking={false}
            picked={NO_PICKS}
            onShare={setSharingNote}
            onTogglePin={togglePin}
            onCardKey={onCardKey}
            groups={[
              {
                key: "pictures",
                label: t("picturesMayMatch"),
                icon: <Images aria-hidden />,
                notes: pictureMatches,
              },
            ]}
          />
        )}
      </AppPage>

      {!list.picking && (
        <Fab label={t("newNote")} asChild>
          <Link
            href={newNote}
            data-new-note="fab"
            onClick={(e) => rememberNewNoteButton(e.currentTarget)}
          >
            <Plus aria-hidden />
          </Link>
        </Fab>
      )}

      <SelectionBar
        open={list.picking}
        count={chosen.length}
        total={list.shown.length}
        onToggleAll={list.toggleAll}
        onClose={list.stopPicking}
        actions={[
          {
            key: "tag",
            label: t("tag"),
            icon: <TagIcon aria-hidden />,
            onClick: (button) =>
              setTagAnchor((current) => (current ? null : button)),
          },
          {
            key: "color",
            label: t("colour"),
            icon: <Palette aria-hidden />,
            onClick: (button) =>
              setColorAnchor((current) => (current ? null : button)),
          },
          allPinned
            ? {
                key: "unpin",
                label: t("unpin"),
                icon: <PinOff aria-hidden />,
                keys: ["f"],
                onClick: () =>
                  noteAction.mutate({
                    kind: "unpin",
                    ids: chosen.map((n) => n.id),
                  }),
              }
            : {
                key: "pin",
                label: t("pin"),
                icon: <Pin aria-hidden />,
                keys: ["f"],
                onClick: () =>
                  noteAction.mutate({
                    kind: "pin",
                    ids: chosen.filter((n) => !n.isPinned).map((n) => n.id),
                  }),
              },
          {
            key: "lock",
            label: t("lock"),
            icon: <Lock aria-hidden />,
            onClick: () => setLocking(true),
          },
          ...(ownChosen.length
            ? [
                {
                  key: "freeze",
                  label: allFrozen ? t("unfreeze") : t("freeze"),
                  icon: <Snowflake aria-hidden />,
                  onClick: freezeChosen,
                },
              ]
            : []),
          {
            key: "print",
            label: t("print"),
            icon: <Printer aria-hidden />,
            onClick: () => printNoteList(chosen),
          },
          allArchived
            ? {
                key: "unarchive",
                label: t("unarchive"),
                icon: <ArchiveRestore aria-hidden />,
                keys: ["e"],
                onClick: () =>
                  noteAction.mutate({
                    kind: "unarchive",
                    ids: chosen.map((n) => n.id),
                  }),
              }
            : {
                key: "archive",
                label: t("archive"),
                icon: <Archive aria-hidden />,
                keys: ["e"],
                onClick: () =>
                  noteAction.mutate({
                    kind: "archive",
                    ids: chosen.filter((n) => !n.isArchived).map((n) => n.id),
                  }),
              },
          {
            key: "delete",
            label: tc("delete"),
            icon: <Trash2 aria-hidden />,
            onClick: () => deleteNotes(chosen),
            keys: ["Delete"],
          },
        ]}
      />

      <ConfirmationDialog
        open={!!confirmRemove}
        onOpenChange={(open) => !open && setConfirmRemove(null)}
        title={tb("deleteTitle", { count: removeCount })}
        description={tb("deleteWarning", {
          owned: removeCount - removeSharedCount,
          shared: removeSharedCount,
        })}
        confirmLabel={tc("delete")}
        busyLabel={tb("deleting")}
        isPending={noteAction.isPending}
        onConfirm={() =>
          confirmRemove &&
          noteAction.mutate({ kind: "trash", ids: confirmRemove.ids })
        }
      />

      <BulkColorPicker
        anchor={colorAnchor}
        notes={chosen}
        onClose={() => setColorAnchor(null)}
        onDone={list.stopPicking}
      />
      <BulkLockDialog
        notes={chosen}
        open={locking}
        onOpenChange={setLocking}
        onDone={list.stopPicking}
      />
      <BulkTagPicker
        anchor={tagAnchor}
        notes={chosen}
        onClose={() => setTagAnchor(null)}
      />
      {sharingNote && (
        <ShareDialog
          open
          noteId={sharingNote.id}
          title={sharingNote.title}
          onOpenChange={(open) => !open && setSharingNote(null)}
        />
      )}
    </>
  );
}

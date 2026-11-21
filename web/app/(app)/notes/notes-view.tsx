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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  bulkAddTagsToNotes,
  bulkArchiveNotes,
  bulkDeleteNotes,
  bulkPinNotes,
  getNotes,
  restoreNote,
  saveNote,
  setNotePosition,
  unarchiveNote,
} from "@/features/notes/api";
import { type DropTarget, noteHref } from "@/features/notes/columns";
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
import { NotePaneHidden } from "@/features/notes/note-pane";
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
import { isMac } from "@/lib/platform";

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

const openNoteId = (pathname: string) => {
  const id = pathname.startsWith("/notes/")
    ? decodeURIComponent(pathname.slice("/notes/".length))
    : null;
  return id && id !== "new" ? id : null;
};

/**
 * The notes of one tag, or all of them. In columns, `openNote` is the page
 * beside the list: the open note, or nothing yet.
 */
export function NotesView({
  tagId,
  openNote,
}: {
  tagId: string | null;
  openNote?: React.ReactNode;
}) {
  const t = useTranslations("notes.notesPage");
  const tb = useTranslations("notes.bulkDelete");
  const tc = useTranslations("common");
  const isColumns = openNote !== undefined;
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const openId = isColumns ? openNoteId(pathname) : null;
  const listHref = tagId
    ? `/notes?tagId=${encodeURIComponent(tagId)}`
    : "/notes";
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
        // The open note went to the trash: close it.
        if (openId && ids.includes(openId)) router.replace(listHref);
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

  // The first Ctrl-click beside an open note picks that note too.
  const { picking, onPick: pick, shown } = list;
  const onPick = React.useCallback(
    (id: string, range: boolean) => {
      if (
        !picking &&
        openId &&
        openId !== id &&
        shown.some((n) => n.id === openId)
      )
        pick(openId, false);
      pick(id, range);
    },
    [picking, pick, shown, openId],
  );

  const tagNotes = useMutation({
    mutationFn: async ({ tagId, ids }: { tagId: string; ids: string[] }) => {
      await bulkAddTagsToNotes(ids, [tagId]);
    },
    onSuccess: (_, { tagId, ids }) => {
      refresh();
      list.stopPicking();
      const before = new Map(
        list.shown.map((n) => [n.id, n.tagIds ?? []] as const),
      );
      toast.success(
        t("notesTagged", {
          count: ids.length,
          name: tagMap.get(tagId)?.name ?? "",
        }),
        {
          undo: async () => {
            try {
              await eachLimited(ids, async (id) => {
                const result = await saveNote(id, {
                  tagIds: before.get(id) ?? [],
                });
                if (result.status !== "saved") throw new Error("not saved");
              });
            } catch {
              toast.error(tc("couldNotUndo"));
            }
            refresh();
          },
        },
      );
    },
    onError: (_, variables) =>
      toast.error(t("couldNotTag", { count: variables.ids.length }), {
        retry: () => tagNotes.mutate(variables),
      }),
  });

  // Columns: cards let go on a tag, Archive or Trash in the sidebar.
  const dropNotes = (ids: string[], target: DropTarget) => {
    const dropped = list.shown.filter((n) => ids.includes(n.id));
    if (target.kind === "trash") return deleteNotes(dropped);
    if (target.kind === "archive") {
      const toArchive = dropped.filter((n) => !n.isArchived).map((n) => n.id);
      if (toArchive.length)
        noteAction.mutate({ kind: "archive", ids: toArchive });
      return;
    }
    const untagged = dropped.filter(
      (n) => !(n.tagIds ?? []).includes(target.tagId),
    );
    if (untagged.length)
      tagNotes.mutate({
        tagId: target.tagId,
        ids: untagged.map((n) => n.id),
      });
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
    // A note open beside the list (columns) has Esc for itself.
    (!!list.query || (!!tagId && !openId)) && !list.picking,
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
  const page = (
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
          onPick={onPick}
          onShare={setSharingNote}
          onTogglePin={togglePin}
          onCardKey={onCardKey}
          noteHref={isColumns ? (id) => noteHref(id, tagId) : undefined}
          openId={openId}
          onDropOut={isColumns ? dropNotes : undefined}
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
  );
  const fab = !list.picking && (
    <Fab label={t("newNote")} asChild>
      <Link
        href={newNote}
        data-new-note="fab"
        onClick={(e) => rememberNewNoteButton(e.currentTarget)}
      >
        <Plus aria-hidden />
      </Link>
    </Fab>
  );
  const selectionBar = (
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
  );

  return (
    <>
      {isColumns ? (
        <div data-columns className="flex min-h-0 min-w-0 flex-1">
          <section
            aria-label={t("notesList")}
            className="notes-pane flex w-84 shrink-0 flex-col border-divider border-r"
          >
            {page}
          </section>
          <div className="@container/pane relative flex min-w-0 flex-1 flex-col">
            {/* Stays mounted while picking, so Esc brings the note back. */}
            <div
              hidden={list.picking}
              className="absolute inset-0 flex flex-col"
            >
              <NotePaneHidden.Provider value={list.picking}>
                {openNote}
              </NotePaneHidden.Provider>
            </div>
            {list.picking && <PickedSummary notes={chosen} />}
            {selectionBar}
          </div>
        </div>
      ) : (
        <>
          {page}
          {fab}
          {selectionBar}
        </>
      )}

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

function PickedSummary({ notes }: { notes: Note[] }) {
  const t = useTranslations("notes.notesPage");
  const titles = notes.map((note) => note.title.trim() || t("untitled"));
  const named = titles.slice(0, 3).join(", ");
  return (
    <div className="grid flex-1 place-content-center justify-items-center gap-2 px-6 pb-24 text-center">
      <div aria-hidden className="mb-4 grid w-72 *:col-start-1 *:row-start-1">
        {titles
          .slice(0, 3)
          .reverse()
          .map((title, i, shown) => (
            <div
              key={`${i}-${title}`}
              style={{
                translate: `0 ${(shown.length - 1 - i) * -10}px`,
                scale: 1 - (shown.length - 1 - i) * 0.05,
              }}
              className="truncate rounded-card bg-card px-4.5 py-4 text-left font-semibold text-card-title shadow-[inset_0_0_0_1px_var(--border)]"
            >
              {title}
            </div>
          ))}
      </div>
      <h2 className="m-0 text-heading">
        {notes.length
          ? t("notesSelected", { count: notes.length })
          : t("selectNotes")}
      </h2>
      <p className="m-0 max-w-90 text-muted-foreground text-ui">
        {notes.length
          ? notes.length > 3
            ? t("andMore", { titles: named, count: notes.length - 3 })
            : named
          : t("selectNotesHelp", { key: isMac() ? "⌘" : "Ctrl" })}
      </p>
    </div>
  );
}

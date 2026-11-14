"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArchiveRestore, Lock, Printer, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { AppPage, PageTitle } from "@/components/layout/app-page";
import { IconButton } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { EmptyState, LoadFailedState } from "@/components/ui/empty-state";
import { SelectionBar } from "@/components/ui/selection-bar";
import { toast } from "@/components/ui/toast";
import { Tip } from "@/components/ui/tooltip";
import {
  bulkArchiveNotes,
  bulkDeleteNotes,
  restoreNote,
  unarchiveNote,
} from "@/features/notes/api";
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
import { isOwnFrozen } from "@/features/notes/hooks/use-note-freeze";
import { useNoteList } from "@/features/notes/hooks/use-note-list";
import { useRefreshNotes } from "@/features/notes/hooks/use-refresh-notes";
import { printNoteList } from "@/features/notes/print";
import { archivedNotesQuery } from "@/features/notes/queries";
import type { Note } from "@/features/notes/types";
import { burnNoteCards } from "@/lib/destroy";
import { eachLimited } from "@/lib/each";
import { useDocumentTitle } from "@/lib/hooks/use-document-title";

const NO_NOTES: Note[] = [];

export default function ArchivePage() {
  const t = useTranslations("notes.archivePage");
  const tb = useTranslations("notes.bulkDelete");
  const tc = useTranslations("common");
  useDocumentTitle(tc("archive"));
  const refresh = useRefreshNotes();
  const [confirmRemove, setConfirmRemove] = React.useState<{
    ids: string[];
    sharedCount: number;
  } | null>(null);
  const [sharingNote, setSharingNote] = React.useState<Note | null>(null);
  const [locking, setLocking] = React.useState(false);
  const { data, isLoading, isError, isFetching, refetch } =
    useQuery(archivedNotesQuery);
  const notes = data ?? NO_NOTES;
  const loadFailed = isError && !data;
  const list = useNoteList(notes);

  const undo = async (run: () => Promise<unknown>) => {
    list.prepareCardMotion();
    try {
      await run();
    } catch {
      toast.error(tc("couldNotUndo"));
    }
    refresh();
  };

  const noteAction = useMutation({
    mutationFn: async ({
      kind,
      ids,
    }: {
      kind: "unarchive" | "trash";
      ids: string[];
    }) => {
      if (kind === "unarchive") await eachLimited(ids, unarchiveNote);
      else {
        // Deleted cards burn away in place; the others strike into place after.
        const burn = burnNoteCards(ids);
        await burn.done;
        list.prepareCardMotion("strike");
        await bulkDeleteNotes(ids).catch((error: unknown) => {
          burn.restore();
          throw error;
        });
      }
    },
    onMutate: ({ kind, ids }) => {
      if (kind === "trash") setConfirmRemove(null);
      else list.prepareCardMotion();
      return {
        ownedIds: ids.filter(
          (id) => notes.find((n) => n.id === id)?.permission === "owner",
        ),
      };
    },
    onSuccess: (_, { kind, ids }, context) => {
      refresh();
      list.stopPicking();
      setConfirmRemove(null);
      if (kind === "unarchive") {
        toast.success(t("unarchived", { count: ids.length }), {
          undo: () => undo(() => bulkArchiveNotes(ids)),
        });
        return;
      }
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
    },
    onError: (_, variables) => {
      toast.error(
        variables.kind === "unarchive"
          ? t("couldNotUnarchive", { count: variables.ids.length })
          : tb("couldNotDelete", { count: variables.ids.length }),
        { retry: () => noteAction.mutate(variables) },
      );
    },
  });

  const mutateNotes = noteAction.mutate;
  const renderActions = React.useCallback(
    (note: Note) => (
      <Tip label={t("unarchive")}>
        <IconButton
          size="sm"
          label={t("unarchive")}
          onClick={() => mutateNotes({ kind: "unarchive", ids: [note.id] })}
        >
          <ArchiveRestore />
        </IconButton>
      </Tip>
    ),
    [mutateNotes, t],
  );

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

  const hasNotes = notes.length > 0;
  const removeCount = confirmRemove?.ids.length ?? 0;
  const removeSharedCount = confirmRemove?.sharedCount ?? 0;
  return (
    <>
      <AppPage
        scrollKey="archive"
        title={
          <PageTitle
            count={isLoading || loadFailed ? undefined : list.visible.length}
          >
            {tc("archive")}
          </PageTitle>
        }
        actions={
          hasNotes && <NoteListActions list={list} placeholder={t("search")} />
        }
      >
        <p className="m-0 -mt-2 mb-1 text-muted-foreground text-ui">
          {t("hiddenFromList")}
        </p>
        <NotesBoardSkeleton loading={isLoading} />
        {loadFailed && (
          <LoadFailedState
            title={t("couldNotLoad")}
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        )}
        {!isLoading && !loadFailed && !hasNotes && (
          <EmptyState illustration="archive" title={t("empty")}>
            {t("emptyHelp")}
          </EmptyState>
        )}
        {hasNotes && !list.visible.length && <NoSearchResults list={list} />}
        {list.visible.length > 0 && (
          <NotesBoard
            searchTerm={list.term || undefined}
            ref={list.boardRef}
            layout={list.layout}
            picking={list.picking}
            picked={list.picked}
            onPick={list.onPick}
            onShare={setSharingNote}
            renderActions={renderActions}
            onCardKey={(note, key) => {
              if (key === "Delete") deleteNotes([note]);
              else if (key === "e")
                noteAction.mutate({ kind: "unarchive", ids: [note.id] });
              else return false;
              return true;
            }}
            groups={[{ key: "all", notes: list.shown }]}
          />
        )}
      </AppPage>

      <SelectionBar
        open={list.picking}
        count={list.chosen.length}
        total={list.shown.length}
        onToggleAll={list.toggleAll}
        onClose={list.stopPicking}
        actions={[
          {
            key: "unarchive",
            label: t("unarchive"),
            icon: <ArchiveRestore aria-hidden />,
            keys: ["e"],
            onClick: () =>
              noteAction.mutate({
                kind: "unarchive",
                ids: list.chosen.map((n) => n.id),
              }),
          },
          {
            key: "lock",
            label: t("lock"),
            icon: <Lock aria-hidden />,
            onClick: () => setLocking(true),
          },
          {
            key: "print",
            label: t("print"),
            icon: <Printer aria-hidden />,
            onClick: () => printNoteList(list.chosen),
          },
          {
            key: "delete",
            label: tc("delete"),
            icon: <Trash2 aria-hidden />,
            onClick: () => deleteNotes(list.chosen),
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
      <BulkLockDialog
        notes={list.chosen}
        open={locking}
        onOpenChange={setLocking}
        onDone={list.stopPicking}
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

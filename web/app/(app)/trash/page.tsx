"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { RotateCcw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { AppPage, PageTitle, TopBarButton } from "@/components/layout/app-page";
import { IconButton } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { EmptyState, LoadFailedState } from "@/components/ui/empty-state";
import { SelectionBar } from "@/components/ui/selection-bar";
import { toast } from "@/components/ui/toast";
import { Tip } from "@/components/ui/tooltip";
import {
  deleteNote,
  getTrashedNotes,
  permanentDeleteNote,
  restoreNote,
} from "@/features/notes/api";
import {
  NoSearchResults,
  NoteListActions,
} from "@/features/notes/components/note-list-actions";
import {
  NotesBoard,
  NotesBoardSkeleton,
} from "@/features/notes/components/notes-board";
import { useNoteList } from "@/features/notes/hooks/use-note-list";
import { useRefreshNotes } from "@/features/notes/hooks/use-refresh-notes";
import {
  daysUntilDeletion,
  TRASH_RETENTION_DAYS,
} from "@/features/notes/trash";
import type { Note } from "@/features/notes/types";
import { burnNoteCards } from "@/lib/destroy";
import { eachLimited } from "@/lib/each";
import { useDocumentTitle } from "@/lib/hooks/use-document-title";

const NO_NOTES: Note[] = [];

export default function TrashPage() {
  const t = useTranslations("notes.trashPage");
  const tc = useTranslations("common");
  useDocumentTitle(tc("trash"));
  const timeLeft = (note: Note) =>
    t("daysLeft", { count: daysUntilDeletion(note) });
  const refresh = useRefreshNotes();
  const [pendingDelete, setPendingDelete] = React.useState<{
    ids: string[];
    all?: boolean;
  } | null>(null);
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["notes", "trashed"],
    queryFn: getTrashedNotes,
  });
  const notes = data ?? NO_NOTES;
  const loadFailed = isError && !data;
  const list = useNoteList(notes);

  const restore = useMutation({
    mutationFn: (ids: string[]) => eachLimited(ids, restoreNote),
    onMutate: (ids) => {
      list.prepareCardMotion();
      return new Map(
        ids.map((id) => [id, notes.find((n) => n.id === id)?.stateChangedAt]),
      );
    },
    onSuccess: (_, ids, trashDates) => {
      refresh();
      list.stopPicking();
      toast.success(t("restored", { count: ids.length }), {
        undo: async () => {
          list.prepareCardMotion();
          try {
            await eachLimited(ids, (id) => deleteNote(id, trashDates?.get(id)));
          } catch {
            toast.error(tc("couldNotUndo"));
          }
          refresh();
        },
      });
    },
    onError: (_, ids) =>
      toast.error(t("couldNotRestore", { count: ids.length }), {
        retry: () => restore.mutate(ids),
      }),
  });

  const remove = useMutation({
    mutationFn: async ({ ids }: { ids: string[]; all?: boolean }) => {
      // Deleted cards burn away in place; the others strike into place after.
      const burn = burnNoteCards(ids);
      await burn.done;
      list.prepareCardMotion("strike");
      await eachLimited(ids, permanentDeleteNote).catch((error: unknown) => {
        burn.restore();
        throw error;
      });
    },
    onMutate: () => setPendingDelete(null),
    onSuccess: async (_, { ids, all }) => {
      await refresh();
      list.stopPicking();
      setPendingDelete(null);
      toast.success(
        all ? t("emptied") : t("deletedForever", { count: ids.length }),
      );
    },
    onError: (_, variables) => {
      refresh();
      toast.error(
        variables.all
          ? t("couldNotEmpty")
          : t("couldNotDelete", { count: variables.ids.length }),
        { retry: () => remove.mutate(variables) },
      );
    },
  });

  const restoreNotes = restore.mutate;
  const renderActions = React.useCallback(
    (note: Note) => (
      <>
        <Tip label={t("restore")}>
          <IconButton
            size="sm"
            label={t("restore")}
            onClick={() => restoreNotes([note.id])}
          >
            <RotateCcw />
          </IconButton>
        </Tip>
        <Tip label={t("deleteForever")}>
          <IconButton
            size="sm"
            tone="danger"
            label={t("deleteForever")}
            onClick={() => setPendingDelete({ ids: [note.id] })}
          >
            <Trash2 />
          </IconButton>
        </Tip>
      </>
    ),
    [restoreNotes, t],
  );

  const hasNotes = notes.length > 0;
  const chosenIds = list.chosen.map((n) => n.id);
  const deleteCount = pendingDelete?.ids.length ?? 0;
  return (
    <>
      <AppPage
        scrollKey="trash"
        title={
          <PageTitle
            count={isLoading || loadFailed ? undefined : list.visible.length}
          >
            {tc("trash")}
          </PageTitle>
        }
        actions={
          hasNotes && (
            <NoteListActions list={list} placeholder={t("search")}>
              <TopBarButton
                icon={<Trash2 aria-hidden />}
                onClick={() =>
                  setPendingDelete({ ids: notes.map((x) => x.id), all: true })
                }
              >
                {t("emptyTrash")}
              </TopBarButton>
            </NoteListActions>
          )
        }
      >
        <p className="m-0 -mt-2 mb-1 text-muted-foreground text-ui">
          {t("retention", { days: TRASH_RETENTION_DAYS })}
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
          <EmptyState illustration="trash" title={t("empty")}>
            {t("emptyHelp", { days: TRASH_RETENTION_DAYS })}
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
            renderActions={renderActions}
            dateLabel={timeLeft}
            onCardKey={(note, key) => {
              if (key !== "Delete") return false;
              setPendingDelete({ ids: [note.id] });
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
            key: "restore",
            label: t("restore"),
            icon: <RotateCcw aria-hidden />,
            onClick: () => restore.mutate(chosenIds),
          },
          {
            key: "forever",
            label: t("deleteForever"),
            icon: <Trash2 aria-hidden />,
            onClick: () => setPendingDelete({ ids: chosenIds }),
            keys: ["Delete"],
          },
        ]}
      />

      <ConfirmationDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={
          pendingDelete?.all
            ? t("emptyTitle")
            : t("deleteForeverTitle", { count: deleteCount })
        }
        description={
          pendingDelete?.all
            ? t("emptyDescription", { count: deleteCount })
            : t("deleteForeverDescription", { count: deleteCount })
        }
        confirmLabel={pendingDelete?.all ? t("emptyTrash") : t("deleteForever")}
        busyLabel={pendingDelete?.all ? t("emptying") : t("deleting")}
        isPending={remove.isPending}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete)}
      />
    </>
  );
}

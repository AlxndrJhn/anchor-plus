import type { QueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "@/components/ui/toast";
import { useAuthStore } from "@/features/auth/store";
import { useSyncStatus } from "@/features/sync/status";
import { translate } from "@/lib/i18n";
import { newId } from "@/lib/id";
import { createNote, isRetryableError, saveNote } from "./api";
import { type OutboxEntry, readOutbox, writeOutboxEntry } from "./outbox";
import {
  createNoteSaveQueue,
  draftUpdate,
  type NoteDraft,
  type NoteSaveQueue,
  noteDraftsEqual,
  noteToDraft,
  rebaseDraft,
  replacesText,
  type SaveFailure,
  type SaveOutcome,
  toReminderInput,
} from "./save-queue";
import type { Note, UpdateNoteDto } from "./types";

interface EditorLink {
  buildUpdate: (draft: NoteDraft, baseVersion?: number) => UpdateNoteDto;
  onSaved: (draft: NoteDraft, note: Note) => void;
  onConflict: (
    serverNote: Note,
    draft: NoteDraft,
    canRetry: boolean,
  ) => NoteDraft | null;
  onFailed: (failure: SaveFailure) => void;
  onBusyChange: (busy: boolean) => void;
  /** The server's copy the editor's draft is made from. */
  base: () => NoteDraft | null;
  save: () => void;
  retryCreate: () => void;
  flush: () => void;
  openHistory: () => void;
}

// The app's query client, for queues that save with no editor open.
let queryClient: QueryClient | null = null;

/** Puts a note the server saved into the notes lists and its own query. */
function showSaved(note: Note) {
  if (!queryClient) return;
  queryClient.setQueryData(["notes", note.id], note);
  queryClient.setQueriesData<unknown>(
    { queryKey: ["notes"] },
    (data: unknown) =>
      Array.isArray(data)
        ? (data as Note[]).map((n) => (n.id === note.id ? note : n))
        : data,
  );
}

/** Puts a note the server doesn't have yet at the top of the notes lists. */
function showNew(noteId: string, note: Note) {
  queryClient?.setQueriesData<unknown>(
    { queryKey: ["notes"] },
    (data: unknown) =>
      Array.isArray(data) && !(data as Note[]).some((n) => n.id === noteId)
        ? [note, ...data]
        : data,
  );
}

/** Shows an unsent draft on the note's card in every loaded list. */
function showDraft(noteId: string, draft: NoteDraft) {
  queryClient?.setQueriesData<unknown>(
    { queryKey: ["notes"] },
    (data: unknown) =>
      Array.isArray(data)
        ? (data as Note[]).map((n) =>
            n.id === noteId
              ? {
                  ...n,
                  title: draft.title,
                  content: draft.content,
                  isPinned: draft.isPinned,
                  background: draft.background,
                  tagIds: draft.tagIds,
                }
              : n,
          )
        : data,
  );
}

/** A queue's stand-in when no editor has the note open. */
function unlinkedEditor(noteId: string): EditorLink {
  return {
    buildUpdate: (draft, baseVersion) =>
      draftUpdate(draft, null, { isViewer: false, baseVersion }),
    onSaved: (_draft, note) => showSaved(note),
    // Keeps the fields changed offline and takes the rest from the server.
    // Text changed on both sides goes into a note of its own.
    onConflict: (serverNote, draft) => {
      const server = noteToDraft(serverNote);
      const base = readOutbox()[noteId]?.base ?? server;
      const next = replacesText(draft, base, server)
        ? keepConflictCopy(draft, base, server)
        : rebaseDraft(draft, base, server);
      if (!noteDraftsEqual(next, server)) return next;
      showSaved(serverNote);
      return null;
    },
    onFailed: (failure) => {
      if (failure.retryable) return;
      writeOutboxEntry(noteId, null);
      toast.error(translate("noteHooks.saveQueues")("offlineEditFailed"));
    },
    onBusyChange: () => {},
    base: () => null,
    save: () => {},
    retryCreate: () => {},
    flush: () => {},
    openHistory: () => {},
  };
}

/** Shows a note the server doesn't have yet and sends it when it can. */
function sendNewNote(noteId: string, draft: NoteDraft) {
  const userId = useAuthStore.getState().user?.id;
  if (userId) {
    const note = localNote(noteId, { draft, base: null, create: true }, userId);
    queryClient?.setQueryData(["notes", noteId], note);
    showNew(noteId, note);
  }
  noteSaveQueue(noteId).queue.push(draft);
}

/** What this copy of the app runs on, as a conflict copy's title names it. */
function deviceName() {
  if (!(window as { anchorDesktop?: unknown }).anchorDesktop) return "web";
  const agent = navigator.userAgent;
  if (/mac/i.test(agent)) return "mac";
  return /windows/i.test(agent) ? "windows" : "linux";
}

export function conflictTitle(title: string, now = new Date()) {
  return `(conflict ${deviceName()} ${format(now, "yyyy-MM-dd")}) ${title}`;
}

/**
 * Text edited here while it was also changed elsewhere: this edit becomes a
 * new note, titled as a conflict copy, and the note keeps the other edit.
 * Returns the draft to save on the note: the server's text with this
 * device's other changes (pin, colour, tags, reminder).
 */
export function keepConflictCopy(
  draft: NoteDraft,
  base: NoteDraft,
  server: NoteDraft,
): NoteDraft {
  const copyId = newId();
  const copy: NoteDraft = {
    ...draft,
    title: conflictTitle(draft.title),
    isPinned: false,
    reminder: null,
  };
  keepNewNote(copyId, copy);
  sendNewNote(copyId, copy);
  const t = translate("noteHooks.saveQueues");
  toast.info(t("conflictCopyKept", { title: draft.title || t("untitled") }));
  return rebaseDraft(
    { ...draft, title: base.title, content: base.content },
    base,
    server,
  );
}

/** Creates a note made offline, then saves anything newer than what it got. */
async function createThenSave(
  noteId: string,
  draft: NoteDraft,
): Promise<SaveOutcome> {
  let created: Note;
  try {
    created = await createNote({
      id: noteId,
      ...draft,
      reminder: toReminderInput(draft.reminder),
    });
  } catch (error) {
    return {
      status: "failed",
      httpStatus: null,
      retryable: isRetryableError(error),
    };
  }
  const entry = readOutbox()[noteId];
  if (entry) writeOutboxEntry(noteId, { ...entry, create: false });
  queryClient?.invalidateQueries({ queryKey: ["tags"] });
  if (noteDraftsEqual(noteToDraft(created), draft))
    return { status: "saved", note: created };
  return saveNote(
    noteId,
    draftUpdate(draft, created.reminder ?? null, {
      isViewer: false,
      baseVersion: created.version,
    }),
  );
}

const saveQueues = new Map<
  string,
  { queue: NoteSaveQueue; live: { current: EditorLink } }
>();

/**
 * Writes what the queue still has to send into the outbox, or clears it.
 * Called after a save settles: until then the queue still counts the draft
 * as on its way.
 */
function keepLater(noteId: string) {
  window.setTimeout(() => keep(noteId), 0);
}

function keep(noteId: string) {
  const entry = saveQueues.get(noteId);
  if (!entry) return;
  const draft = entry.queue.newestDraft();
  const before = readOutbox()[noteId];
  if (!draft) {
    // A note made offline stays in the outbox until the server has it.
    if (before && !before.create) writeOutboxEntry(noteId, null);
    return;
  }
  writeOutboxEntry(noteId, {
    draft,
    base: entry.live.current.base() ?? before?.base ?? null,
    baseVersion: entry.queue.baseVersion(),
    create: before?.create,
  });
}

/** One save queue per note, kept across visits while it has text to send. */
export function noteSaveQueue(noteId: string) {
  let entry = saveQueues.get(noteId);
  if (!entry) {
    const live = { current: unlinkedEditor(noteId) };
    const queue = createNoteSaveQueue({
      // Offline nothing is sent; it all goes once the server is back.
      save: (draft, baseVersion) => {
        if (!useSyncStatus.getState().online)
          return Promise.resolve<SaveOutcome>({
            status: "failed",
            httpStatus: null,
            retryable: true,
          });
        return readOutbox()[noteId]?.create
          ? createThenSave(noteId, draft)
          : saveNote(noteId, live.current.buildUpdate(draft, baseVersion));
      },
      onSaved: (draft, note) => {
        live.current.onSaved(draft, note);
        keepLater(noteId);
      },
      onConflict: (serverNote, draft, canRetry) => {
        const next = live.current.onConflict(serverNote, draft, canRetry);
        keepLater(noteId);
        return next;
      },
      onFailed: (failure) => {
        live.current.onFailed(failure);
        keepLater(noteId);
      },
      onBusyChange: (busy) => live.current.onBusyChange(busy),
    });
    const push = queue.push;
    queue.push = (draft) => {
      push(draft);
      keep(noteId);
      showDraft(noteId, draft);
    };
    entry = { queue, live };
    saveQueues.set(noteId, entry);
  }
  return entry;
}

export function savesSettled(noteId: string): Promise<void> {
  return saveQueues.get(noteId)?.queue.settled() ?? Promise.resolve();
}

export function releaseSaveQueue(noteId: string) {
  const entry = saveQueues.get(noteId);
  if (!entry) return;
  const link = entry.live.current;
  void entry.queue.settled().then(() => {
    if (saveQueues.get(noteId) !== entry || entry.live.current !== link) return;
    // A note made offline whose editor closed: the queue creates it later.
    const made = readOutbox()[noteId];
    if (
      made?.create &&
      !entry.queue.newestDraft() &&
      !useSyncStatus.getState().online
    ) {
      entry.live.current = unlinkedEditor(noteId);
      sendNewNote(noteId, made.draft);
      return;
    }
    // Still unsent: the queue carries on without the editor.
    if (entry.queue.newestDraft()) entry.live.current = unlinkedEditor(noteId);
    else saveQueues.delete(noteId);
  });
}

/** Records a note made offline, before its first save reaches the server. */
export function keepNewNote(noteId: string, draft: NoteDraft | null) {
  const before = readOutbox()[noteId];
  if (!draft) {
    if (before?.create) writeOutboxEntry(noteId, null);
    return;
  }
  writeOutboxEntry(noteId, { draft, base: null, create: true });
}

/** A note made offline that the server doesn't have yet, as a card. */
export function localNote(
  noteId: string,
  entry: OutboxEntry,
  userId: string,
): Note {
  const now = new Date().toISOString();
  return {
    id: noteId,
    title: entry.draft.title,
    content: entry.draft.content,
    isPinned: entry.draft.isPinned,
    isArchived: false,
    background: entry.draft.background,
    tagIds: entry.draft.tagIds,
    reminder: entry.draft.reminder,
    state: "active",
    version: 0,
    createdAt: now,
    updatedAt: now,
    userId,
    permission: "owner",
  };
}

/**
 * Refills the save queues from the outbox, so edits made before a reload go
 * up once the server can be reached. Notes made offline join the lists.
 */
export function restoreOutbox(client: QueryClient, userId: string) {
  queryClient = client;
  for (const [noteId, entry] of Object.entries(readOutbox())) {
    if (entry.create) {
      const note = localNote(noteId, entry, userId);
      client.setQueryData(
        ["notes", noteId],
        (old: Note | undefined) => old ?? note,
      );
      showNew(noteId, note);
    }
    const { queue } = noteSaveQueue(noteId);
    if (queue.newestDraft()) continue;
    queue.setBaseVersion(entry.baseVersion);
    queue.push(entry.draft);
  }
}

/** Sends what every queue holds now, without waiting out its backoff. */
export function retryAllSaves() {
  for (const { queue, live } of saveQueues.values()) {
    live.current.retryCreate();
    queue.retryNow();
  }
}

/** Whether every edit, made here or kept from before a reload, is saved. */
export async function allSaved(): Promise<boolean> {
  const entries = Array.from(saveQueues.values());
  await Promise.all(entries.map(({ queue }) => queue.settled()));
  return (
    entries.every(({ queue }) => !queue.newestDraft()) &&
    Object.keys(readOutbox()).length === 0
  );
}

if (typeof window !== "undefined")
  window.addEventListener("online", retryAllSaves);

import { HTTPError } from "ky";
import { getAccessToken } from "@/features/auth/store";
import { api, getJson } from "@/lib/api/client";
import { uploadWithProgress } from "@/lib/api/upload";
import { fitsKeepalive } from "@/lib/page-close";
import { closeLiveImages } from "./live-hub";
import type { SaveOutcome } from "./save-queue";
import type {
  CreateNoteDto,
  Note,
  NoteAttachment,
  NoteLockKind,
  NoteLockSecrets,
  NoteRevision,
  NoteRevisionPage,
  NoteShare,
  NoteShareLink,
  NoteSharePermission,
  SharedNote,
  UpdateNoteDto,
  UserSearchResult,
} from "./types";

export async function getNotes(params?: { tagId?: string }): Promise<Note[]> {
  const url = params?.tagId
    ? `api/notes?${new URLSearchParams({ tagId: params.tagId })}`
    : "api/notes";
  return getJson<Note[]>(url);
}

export async function getNote(id: string): Promise<Note> {
  return getJson<Note>(`api/notes/${id}`);
}

export async function createNote(data: CreateNoteDto): Promise<Note> {
  return api.post("api/notes", { json: data }).json<Note>();
}

/** Moves a note in this person's own order ("Custom" sort). */
export async function setNotePosition(
  id: string,
  position: number | null,
): Promise<void> {
  await api.patch(`api/notes/${id}/position`, { json: { position } });
}

/** Locks the note for this person with `lock`, or takes the lock off. */
export async function setNoteLock(
  id: string,
  lock: NoteLockKind | null,
): Promise<void> {
  await api.patch(`api/notes/${id}/lock`, { json: { lock } });
}

export async function getNoteLockSecrets(): Promise<NoteLockSecrets> {
  return getJson<NoteLockSecrets>("api/note-locks");
}

/**
 * Sets this person's PIN or pattern. Replacing one takes the old one
 * (`current`) or the account password.
 */
export async function setNoteLockSecret(
  kind: "pin" | "pattern",
  body: { secret: string; current?: string; password?: string },
): Promise<NoteLockSecrets> {
  return api
    .put(`api/note-locks/${kind}`, { json: body })
    .json<NoteLockSecrets>();
}

export async function verifyNoteLock(
  kind: "pin" | "pattern" | "password",
  secret: string,
): Promise<boolean> {
  const { ok } = await api
    .post("api/note-locks/verify", { json: { kind, secret } })
    .json<{ ok: boolean }>();
  return ok;
}

/**
 * Freezes the note, or unfreezes it (owner only); answers with the note at
 * its new version.
 */
export async function setNoteFrozen(
  id: string,
  isFrozen: boolean,
): Promise<Note> {
  return api
    .patch(`api/notes/${id}/freeze`, { json: { isFrozen } })
    .json<Note>();
}

/** "Make a copy": the server copies the text, colour, tags and attachments. */
export async function copyNote(id: string): Promise<Note> {
  return api.post(`api/notes/${id}/copy`).json<Note>();
}

function isWorthAnotherTry(httpStatus: number): boolean {
  return httpStatus >= 500 || httpStatus === 408 || httpStatus === 429;
}

export function isRetryableError(error: unknown): boolean {
  return (
    !(error instanceof HTTPError) || isWorthAnotherTry(error.response.status)
  );
}

export async function saveNote(
  id: string,
  data: UpdateNoteDto,
): Promise<SaveOutcome> {
  const response = await api
    .patch(`api/notes/${id}`, { json: data, throwHttpErrors: false })
    .catch(() => null);

  if (!response) {
    return { status: "failed", httpStatus: null, retryable: true };
  }

  if (response.status === 409) {
    const body = await response.json<{ serverNote: Note }>();
    return { status: "conflict", serverNote: body.serverNote };
  }

  if (!response.ok) {
    return {
      status: "failed",
      httpStatus: response.status,
      retryable: isWorthAnotherTry(response.status),
    };
  }

  return { status: "saved", note: await response.json<Note>() };
}

// Sent while the page is closing; it carries no base version, so the text on
// screen wins.
export function flushNoteUpdate(id: string, data: UpdateNoteDto): void {
  const token = getAccessToken();
  const body = JSON.stringify(data);

  void fetch(`/api/notes/${id}`, {
    method: "PATCH",
    keepalive: fitsKeepalive(body),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
  }).catch(() => {});
}

/** `trashedAt` puts back the old trash date when a restore is undone. */
export async function deleteNote(
  id: string,
  trashedAt?: string,
): Promise<void> {
  // At once, before the server tells every other device to.
  closeLiveImages(id);
  await api.delete(`api/notes/${id}`, {
    searchParams: trashedAt ? { trashedAt } : undefined,
  });
}

export async function getTrashedNotes(): Promise<Note[]> {
  return getJson<Note[]>("api/notes/trash");
}

export async function restoreNote(id: string): Promise<Note> {
  return api.patch(`api/notes/${id}/restore`).json<Note>();
}

export async function permanentDeleteNote(id: string): Promise<void> {
  closeLiveImages(id);
  await api.delete(`api/notes/${id}/permanent`);
}

export async function getArchivedNotes(): Promise<Note[]> {
  return getJson<Note[]>("api/notes/archive");
}

export async function archiveNote(id: string): Promise<Note> {
  return api
    .patch(`api/notes/${id}`, { json: { isArchived: true } })
    .json<Note>();
}

export async function unarchiveNote(id: string): Promise<Note> {
  return api
    .patch(`api/notes/${id}`, { json: { isArchived: false } })
    .json<Note>();
}

const BULK_NOTE_IDS_PER_REQUEST = 200;

async function inBulkBatches(
  noteIds: string[],
  send: (batch: string[]) => Promise<{ count: number }>,
): Promise<{ count: number }> {
  let count = 0;
  for (let i = 0; i < noteIds.length; i += BULK_NOTE_IDS_PER_REQUEST) {
    const result = await send(noteIds.slice(i, i + BULK_NOTE_IDS_PER_REQUEST));
    count += result.count;
  }
  return { count };
}

export async function bulkDeleteNotes(
  noteIds: string[],
): Promise<{ count: number }> {
  for (const id of noteIds) closeLiveImages(id);
  return inBulkBatches(noteIds, (batch) =>
    api
      .post("api/notes/bulk/delete", { json: { noteIds: batch } })
      .json<{ count: number }>(),
  );
}

export async function bulkArchiveNotes(
  noteIds: string[],
): Promise<{ count: number }> {
  return inBulkBatches(noteIds, (batch) =>
    api
      .post("api/notes/bulk/archive", { json: { noteIds: batch } })
      .json<{ count: number }>(),
  );
}

export async function bulkPinNotes(
  noteIds: string[],
  isPinned: boolean,
): Promise<{ count: number }> {
  return inBulkBatches(noteIds, (batch) =>
    api
      .post("api/notes/bulk/pin", { json: { noteIds: batch, isPinned } })
      .json<{ count: number }>(),
  );
}

export async function bulkLockNotes(
  noteIds: string[],
  lock: NoteLockKind | null,
): Promise<{ count: number }> {
  return inBulkBatches(noteIds, (batch) =>
    api
      .post("api/notes/bulk/lock", { json: { noteIds: batch, lock } })
      .json<{ count: number }>(),
  );
}

export async function bulkFreezeNotes(
  noteIds: string[],
  isFrozen: boolean,
): Promise<{ count: number }> {
  return inBulkBatches(noteIds, (batch) =>
    api
      .post("api/notes/bulk/freeze", { json: { noteIds: batch, isFrozen } })
      .json<{ count: number }>(),
  );
}

export async function bulkAddTagsToNotes(
  noteIds: string[],
  tagIds: string[],
): Promise<{ count: number }> {
  return inBulkBatches(noteIds, (batch) =>
    api
      .post("api/notes/bulk/tags", { json: { noteIds: batch, tagIds } })
      .json<{ count: number }>(),
  );
}

export async function getNoteRevisions(
  noteId: string,
  cursor?: string,
): Promise<NoteRevisionPage> {
  return getJson<NoteRevisionPage>(`api/notes/${noteId}/revisions`, {
    searchParams: cursor ? { cursor } : {},
  });
}

export async function getNoteRevision(
  noteId: string,
  revisionId: string,
): Promise<NoteRevision> {
  return getJson<NoteRevision>(`api/notes/${noteId}/revisions/${revisionId}`);
}

export async function restoreNoteRevision(
  noteId: string,
  revisionId: string,
): Promise<Note> {
  return api
    .post(`api/notes/${noteId}/revisions/${revisionId}/restore`)
    .json<Note>();
}

// Sharing APIs
export async function shareNote(
  noteId: string,
  sharedWithUserId: string,
  permission: NoteSharePermission,
): Promise<NoteShare> {
  return api
    .post(`api/notes/${noteId}/shares`, {
      json: { sharedWithUserId, permission },
    })
    .json<NoteShare>();
}

export async function getNoteShares(noteId: string): Promise<NoteShare[]> {
  return api.get(`api/notes/${noteId}/shares`).json<NoteShare[]>();
}

export async function getNoteShareLink(
  noteId: string,
): Promise<NoteShareLink | null> {
  const { link } = await api
    .get(`api/notes/${noteId}/link`)
    .json<{ link: NoteShareLink | null }>();
  return link;
}

/** Makes the note's link, or changes what it lets people do. */
export async function setNoteShareLink(
  noteId: string,
  permission: NoteSharePermission,
): Promise<NoteShareLink> {
  const { link } = await api
    .put(`api/notes/${noteId}/link`, { json: { permission } })
    .json<{ link: NoteShareLink }>();
  return link;
}

export async function removeNoteShareLink(noteId: string): Promise<void> {
  await api.delete(`api/notes/${noteId}/link`);
}

/** Where a note's link opens it. */
export function shareLinkUrl(token: string): string {
  return `${window.location.origin}/s/${token}`;
}

export async function getSharedNote(token: string): Promise<SharedNote> {
  return getJson<SharedNote>(`api/shared/${token}`);
}

export async function updateSharedNote(
  token: string,
  data: { title?: string; content?: string; baseVersion?: number },
): Promise<SharedNote> {
  return api.patch(`api/shared/${token}`, { json: data }).json<SharedNote>();
}

export async function updateNoteSharePermission(
  noteId: string,
  shareId: string,
  permission: NoteSharePermission,
): Promise<NoteShare> {
  return api
    .patch(`api/notes/${noteId}/shares/${shareId}`, { json: { permission } })
    .json<NoteShare>();
}

export async function revokeShare(
  noteId: string,
  shareId: string,
): Promise<{ success: boolean }> {
  return api
    .delete(`api/notes/${noteId}/shares/${shareId}`)
    .json<{ success: boolean }>();
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }
  return api
    .get("api/users/search", {
      searchParams: { q: query.trim() },
    })
    .json<UserSearchResult[]>();
}

export async function getRecentContacts(): Promise<UserSearchResult[]> {
  return api.get("api/users/recent-contacts").json<UserSearchResult[]>();
}

export async function uploadAttachment(
  noteId: string,
  file: File,
  options: { onProgress?: (done: number) => void; signal?: AbortSignal } = {},
): Promise<NoteAttachment> {
  const formData = new FormData();
  formData.append("file", file);
  return uploadWithProgress<NoteAttachment>(
    `api/notes/${noteId}/attachments`,
    formData,
    options,
  );
}

export async function getNoteAttachments(
  noteId: string,
): Promise<NoteAttachment[]> {
  return api.get(`api/notes/${noteId}/attachments`).json<NoteAttachment[]>();
}

let linkToken: string | null = null;

/**
 * On a page opened by a share link: its note's files are fetched through
 * the link, not the account.
 */
export function setAttachmentLink(token: string | null) {
  linkToken = token;
}

export async function fetchAttachmentBlob(
  noteId: string,
  attachmentId: string,
): Promise<Blob> {
  const response = await api.get(
    linkToken
      ? `api/shared/${linkToken}/attachments/${attachmentId}`
      : `api/notes/${noteId}/attachments/${attachmentId}`,
  );
  return response.blob();
}

export async function deleteAttachment(
  noteId: string,
  attachmentId: string,
): Promise<{ success: boolean }> {
  return api
    .delete(`api/notes/${noteId}/attachments/${attachmentId}`)
    .json<{ success: boolean }>();
}

export async function reorderAttachments(
  noteId: string,
  orderedIds: string[],
): Promise<NoteAttachment[]> {
  return api
    .patch(`api/notes/${noteId}/attachments/reorder`, { json: { orderedIds } })
    .json<NoteAttachment[]>();
}

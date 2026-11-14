// The data the serverless app keeps: one person's notes, tags, pictures and
// history. "local" keeps it in IndexedDB, "demo" only in memory.

import type {
  NoteLockKind,
  NoteReminder,
  NoteRevisionCause,
} from "@/features/notes/types";
import { idbDelete, idbGet, idbSet } from "@/lib/offline/idb";

export interface StoredNote {
  id: string;
  title: string;
  content: string | null;
  version: number;
  background: string | null;
  state: "active" | "trashed" | "deleted";
  isFrozen: boolean;
  createdAt: string;
  updatedAt: string;
  stateChangedAt: string;
  tagIds: string[];
  isPinned: boolean;
  isArchived: boolean;
  position: number | null;
  positionedAt: string | null;
  lock: NoteLockKind | null;
  reminder: NoteReminder | null;
}

export interface StoredTag {
  id: string;
  name: string;
  color?: string;
  position: number | null;
  version: number;
  updatedAt: string;
}

export interface StoredAttachment {
  id: string;
  noteId: string;
  type: "image" | "audio" | "file";
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  position: number;
  uploadedByUserId: string;
  createdAt: string;
}

export interface StoredRevision {
  id: string;
  noteId: string;
  version: number;
  title: string;
  content: string | null;
  cause: NoteRevisionCause;
  createdAt: string;
}

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  profileImage?: string;
  lockPin: string | null;
  lockPattern: string | null;
  createdAt: string;
}

export interface Data {
  user: StoredUser;
  notes: StoredNote[];
  tags: StoredTag[];
  attachments: StoredAttachment[];
  revisions: StoredRevision[];
}

const DATA_KEY = "local-backend";
const blobKey = (id: string) => `local-backend-file:${id}`;

export const LOCAL_USER_ID = "00000000-0000-4000-8000-000000000001";

export function emptyData(): Data {
  const now = new Date().toISOString();
  return {
    user: {
      id: LOCAL_USER_ID,
      email: "you@this.browser",
      name: "You",
      lockPin: null,
      lockPattern: null,
      createdAt: now,
    },
    notes: [],
    tags: [],
    attachments: [],
    revisions: [],
  };
}

/** Where the data lives: this browser's IndexedDB, or only this page. */
export interface Storage {
  load(): Promise<Data | undefined>;
  save(data: Data): Promise<void>;
  getFile(id: string): Promise<Blob | undefined>;
  putFile(id: string, blob: Blob): Promise<void>;
  deleteFile(id: string): Promise<void>;
}

export function browserStorage(): Storage {
  return {
    load: () => idbGet<Data>(DATA_KEY),
    save: async (data) => {
      await idbSet(DATA_KEY, data);
    },
    getFile: (id) => idbGet<Blob>(blobKey(id)),
    putFile: async (id, blob) => {
      await idbSet(blobKey(id), blob);
    },
    deleteFile: async (id) => {
      await idbDelete(blobKey(id));
    },
  };
}

/** Kept only by this page; `initial` is what it starts with. */
export function memoryStorage(
  initial?: () => { data: Data; files: Map<string, Blob> },
): Storage {
  const files = new Map<string, Blob>();
  return {
    load: async () => {
      if (!initial) return undefined;
      const start = initial();
      for (const [id, blob] of start.files) files.set(id, blob);
      return start.data;
    },
    save: async () => {},
    getFile: async (id) => files.get(id),
    putFile: async (id, blob) => {
      files.set(id, blob);
    },
    deleteFile: async (id) => {
      files.delete(id);
    },
  };
}

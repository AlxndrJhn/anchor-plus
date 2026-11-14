type NoteState = "active" | "trashed" | "deleted";
export type NoteSharePermission = "viewer" | "editor";
type NotePermission = "owner" | NoteSharePermission;

type AttachmentType = "image" | "audio" | "file";

export interface NoteAttachment {
  id: string;
  noteId: string;
  type: AttachmentType;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  position: number;
  uploadedByUserId?: string | null;
  createdAt: string;
}

export interface NoteShare {
  id: string;
  sharedWithUser: {
    id: string;
    name: string;
    email: string;
    profileImage?: string | null;
  };
  permission: NoteSharePermission;
  createdAt: string;
  updatedAt: string;
}

/** A link that opens the note without an account. */
export interface NoteShareLink {
  token: string;
  permission: NoteSharePermission;
  createdAt: string;
  updatedAt: string;
}

/** A note as its share link opens it: nothing about whose it is. */
export interface SharedNote {
  title: string;
  content: string | null;
  background: string | null;
  version: number;
  updatedAt: string;
  isFrozen: boolean;
  permission: NoteSharePermission;
  canEdit: boolean;
  attachments: Pick<
    NoteAttachment,
    "id" | "type" | "originalFilename" | "mimeType" | "fileSize" | "position"
  >[];
}

export type ReminderRecurrence =
  | "none"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly";

export interface NoteReminder {
  remindAt: string;
  recurrence: ReminderRecurrence;
  version: number;
}

export interface Note {
  id: string;
  title: string;
  content?: string | null;
  isPinned: boolean;
  isArchived: boolean;
  background?: string | null;
  state: NoteState;
  version: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
  tagIds?: string[];
  permission: NotePermission;
  shareIds?: string[];
  /** What anyone with the note's link can do; null when no link opens it. */
  publicLink?: NoteSharePermission | null;
  sharedBy?: {
    id: string;
    name: string;
    email: string;
    profileImage?: string | null;
  };
  attachmentCount?: number;
  imagePreviewIds?: string[];
  /** The text read from the note's pictures, which search also looks in. */
  pictureText?: string;
  reminder?: NoteReminder | null;
  stateChangedAt?: string;
  /** Where this person dragged the note, and when (see `sortKey`). */
  position?: number | null;
  positionedAt?: string | null;
  /** What opens the note for this person, if they locked it. */
  lock?: NoteLockKind | null;
  /** Frozen by its owner: nobody can change, trash or delete it. */
  isFrozen?: boolean;
}

/** The ways a person can lock a note for themselves. */
export type NoteLockKind = "biometric" | "pin" | "pattern" | "tap";

/** This person's PIN and pattern, as hashes (see `lockSecretMatches`). */
export interface NoteLockSecrets {
  pin: string | null;
  pattern: string | null;
  hasPassword: boolean;
}

// "conflict" holds content the server turned down, which never reached the note.
export type NoteRevisionCause = "edit" | "conflict" | "restore";

export interface NoteRevisionAuthor {
  id: string;
  name: string;
  email: string;
  profileImage?: string | null;
}

export interface NoteRevisionSummary {
  id: string;
  noteId: string;
  version: number;
  title: string;
  cause: NoteRevisionCause;
  createdAt: string;
  author: NoteRevisionAuthor | null;
}

export interface NoteRevision extends NoteRevisionSummary {
  content: string | null;
}

export interface NoteRevisionPage {
  revisions: NoteRevisionSummary[];
  nextCursor: string | null;
}

export interface UserSearchResult {
  id: string;
  name: string;
  email: string;
  profileImage?: string | null;
}

export interface CreateNoteDto {
  id?: string;
  title: string;
  content?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  background?: string | null;
  tagIds?: string[];
  reminder?: NoteReminderInput | null;
}

export interface UpdateNoteDto {
  title?: string;
  content?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  background?: string | null;
  tagIds?: string[];
  reminder?: NoteReminderInput | null;
  baseVersion?: number;
  replacesOtherEdit?: boolean;
}

export interface NoteReminderInput {
  remindAt: string;
  recurrence?: ReminderRecurrence;
}

import {
  AttachmentType,
  NoteLockKind,
  NoteSharePermission,
  ReminderRecurrence,
} from 'src/generated/prisma/enums';

// Type definitions for transformed note structures
export type NotePermission = 'owner' | NoteSharePermission;

// remindAt is a local wall clock ("YYYY-MM-DDTHH:mm"), not an instant.
export interface TransformedReminder {
  remindAt: string;
  recurrence: ReminderRecurrence;
  version: number;
}

interface SharedByUser {
  id: string;
  name: string;
  email: string;
  profileImage?: string | null;
}

export interface TransformedNote {
  id: string;
  title: string;
  content: string | null;
  version: number;
  isPinned: boolean;
  isArchived: boolean;
  background: string | null;
  state: string;
  // Frozen by the owner: can't be changed, trashed or deleted.
  isFrozen: boolean;
  updatedAt: string;
  createdAt: string;
  userId: string;
  tagIds: string[];
  permission: NotePermission;
  shareIds?: string[];
  sharedBy?: SharedByUser;
  // What anyone with the note's link can do; null when no link opens it.
  // Absent means "not loaded".
  publicLink?: NoteSharePermission | null;
  stateChangedAt?: string;
  attachmentCount?: number;
  imagePreviewIds?: string[];
  /**
   * The bytes the note takes on the server: its title and text, and every
   * picture, recording and file attached to it. Absent means "not loaded".
   */
  storageSize?: number;
  /** The text read from the note's pictures, for search; absent if none. */
  pictureText?: string;
  // Absent means "not loaded"; null means "this user has no reminder".
  reminder?: TransformedReminder | null;
  // Where this user dragged the note, and when; null when they never did.
  // Absent means "not loaded". A note edited after it was dragged sorts by
  // the edit again, as in Google Keep.
  position?: number | null;
  positionedAt?: string | null;
  // What this user locked the note with; null when it isn't locked.
  // Absent means "not loaded".
  lock?: NoteLockKind | null;
}

// Input type for notes from Prisma with includes
interface NoteWithIncludes {
  id: string;
  title: string;
  content: string | null;
  version: number;
  background: string | null;
  state: string;
  isFrozen: boolean;
  createdAt: Date;
  updatedAt: Date;
  stateChangedAt?: Date;
  userId: string;
  pins?: Array<{ userId: string }>;
  archives: Array<{ userId: string }>;
  orders?: Array<{ position: number; updatedAt: Date }>;
  locks?: Array<{ kind: NoteLockKind }>;
  reminders?: Array<{
    remindAt: string;
    recurrence: ReminderRecurrence;
    version: number;
  }>;
  tags?: Array<{ id: string; userId: string }>;
  sharedWith?: Array<{
    id: string;
    sharedWithUserId: string;
    permission: NoteSharePermission;
    sharedByUser: SharedByUser;
  }>;
  shareLink?: { permission: NoteSharePermission } | null;
  _count?: { attachments?: number; files?: number };
  // Only pictures, unless a type is given.
  attachments?: Array<{
    id: string;
    text?: string | null;
    type?: AttachmentType;
    fileSize?: number;
  }>;
  files?: Array<{ fileSize: number }>;
}

// The bytes a note takes on the server: its text and its attachments.
function storageSizeOf(
  note: { title: string; content: string | null },
  attachments: Array<{ fileSize?: number }>,
  files: Array<{ fileSize: number }>,
): number {
  let size =
    Buffer.byteLength(note.title, 'utf8') +
    Buffer.byteLength(note.content ?? '', 'utf8');
  for (const attachment of attachments) size += attachment.fileSize ?? 0;
  for (const file of files) size += file.fileSize;
  return size;
}

// Convert Date to ISO string
function toISOString(date: Date): string {
  return date.toISOString();
}

// Transform a note with includes to a clean response format
// Automatically determines ownership and extracts share metadata from sharedWith
export function transformNote(
  note: NoteWithIncludes,
  userId: string,
): TransformedNote {
  const {
    tags,
    sharedWith,
    shareLink,
    _count,
    attachments,
    files,
    pins,
    archives,
    orders,
    locks,
    reminders,
    stateChangedAt,
    ...rest
  } = note;

  const pictures = attachments?.filter(
    (a) => a.type === undefined || a.type === AttachmentType.image,
  );

  // Determine if user is owner or shared user
  const isOwner = note.userId === userId;
  const isPinned = (pins?.length ?? 0) > 0;
  const isArchived = archives.some((archive) => archive.userId === userId);

  // Filter tags to only include those owned by the requesting user
  const filteredTags = tags?.filter((t) => t.userId === userId) || [];

  // Extract share metadata for shared notes
  let permission: NotePermission = 'owner';
  let sharedBy: SharedByUser | undefined;

  if (!isOwner && sharedWith) {
    const userShare = sharedWith.find(
      (share) => share.sharedWithUserId === userId,
    );
    if (userShare) {
      permission = userShare.permission;
      sharedBy = userShare.sharedByUser;
    }
  }

  const transformed: TransformedNote = {
    ...rest,
    isPinned,
    isArchived,
    tagIds: filteredTags.map((t) => t.id),
    createdAt: toISOString(rest.createdAt),
    updatedAt: toISOString(rest.updatedAt),
    permission,
    attachmentCount: (_count?.attachments ?? 0) + (_count?.files ?? 0),
    imagePreviewIds: pictures?.slice(0, 4).map((a) => a.id) ?? [],
  };

  if (attachments) {
    transformed.storageSize = storageSizeOf(note, attachments, files ?? []);
  }

  const pictureText = pictures
    ?.map((a) => a.text)
    .filter(Boolean)
    .join('\n\n');
  if (pictureText) transformed.pictureText = pictureText;

  if (orders) {
    transformed.position = orders[0]?.position ?? null;
    transformed.positionedAt = orders[0]
      ? toISOString(orders[0].updatedAt)
      : null;
  }

  if (locks) {
    transformed.lock = locks[0]?.kind ?? null;
  }

  if (note.state === 'trashed' && stateChangedAt) {
    transformed.stateChangedAt = toISOString(stateChangedAt);
  }

  // Add shareIds for owners
  if (isOwner && sharedWith) {
    transformed.shareIds = sharedWith.map((share) => share.id);
  }

  // Add sharedBy for shared notes
  if (sharedBy) {
    transformed.sharedBy = sharedBy;
  }

  if (reminders) {
    transformed.reminder = reminders[0] ?? null;
  }

  // Everyone with the note sees this, so nobody writes in it unaware. In the
  // trash the link doesn't open, so it isn't public until it's restored.
  if (shareLink !== undefined) {
    transformed.publicLink =
      note.state === 'active' ? (shareLink?.permission ?? null) : null;
  }

  return transformed;
}

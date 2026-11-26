import { BadRequestException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AttachmentType } from 'src/generated/prisma/enums';
import {
  ATTACHMENT_AUDIO_MIME_TYPES,
  ATTACHMENT_IMAGE_MIME_TYPES,
  ATTACHMENT_MAX_FILE_SIZE,
} from '../constants/notes.constants';
import { coded, ErrorCode } from '../../common/errors/coded';
import { pathInside } from '../../common/utils/file-system.util';

export function assertValidAttachmentFile(file?: Express.Multer.File): void {
  if (!file) {
    throw coded(
      new BadRequestException('No file provided'),
      ErrorCode.FILE_MISSING,
    );
  }
  if (file.size > ATTACHMENT_MAX_FILE_SIZE) {
    const maxMb = ATTACHMENT_MAX_FILE_SIZE / 1024 / 1024;
    throw coded(
      new BadRequestException(`File size exceeds ${maxMb}MB limit`),
      ErrorCode.FILE_TOO_LARGE,
      { maxMb },
    );
  }
}

/**
 * An attachment's type as the apps see it: a picture or recording, or any
 * other file (stored as a NoteFile, not a NoteAttachment).
 */
export type AttachmentKind = AttachmentType | 'file';

/** Pictures and recordings the clients show; anything else is a file. */
export function attachmentTypeForMime(mimeType: string): AttachmentKind {
  if (ATTACHMENT_IMAGE_MIME_TYPES.has(mimeType)) return AttachmentType.image;
  if (ATTACHMENT_AUDIO_MIME_TYPES.has(mimeType)) return AttachmentType.audio;
  return 'file';
}

/**
 * The Content-Type an attachment is served with. A file is sent as bytes to
 * download, never as something the browser would render (HTML, SVG) on the
 * app's own origin.
 */
export function servedMimeType(type: AttachmentKind, mimeType: string) {
  return type === 'file' ? 'application/octet-stream' : mimeType;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The folder a note's attachments live in. Note ids become a path segment,
 * so anything but a UUID (`..`, a slash) is refused rather than let out of
 * [attachmentsDir].
 */
export function noteAttachmentDir(attachmentsDir: string, noteId: string) {
  if (!isStorableNoteId(noteId)) {
    throw coded(
      new BadRequestException('Invalid note id'),
      ErrorCode.NOTE_ID_INVALID,
    );
  }
  return pathInside(attachmentsDir, noteId);
}

export function isStorableNoteId(noteId: string): boolean {
  return UUID.test(noteId);
}

/**
 * Deletes a note's attachments folder. Never throws: a failure is logged.
 * A note saved with a non-UUID id (before ids were checked) has no folder of
 * its own, and removing its "folder" could reach outside, so it's skipped.
 */
export async function removeNoteAttachmentDir(
  attachmentsDir: string,
  noteId: string,
  logger: Logger,
): Promise<void> {
  if (!isStorableNoteId(noteId)) {
    logger.warn(`Not deleting files for note with bad id ${noteId}`);
    return;
  }
  try {
    await fs.rm(pathInside(attachmentsDir, noteId), {
      recursive: true,
      force: true,
    });
  } catch (error) {
    logger.error(
      `Failed to delete attachments directory for note ${noteId}: ${String(error)}`,
    );
  }
}

/** An id a client picked for its upload, if it is a usable one. */
export function clientAttachmentId(id: unknown): string | undefined {
  return typeof id === 'string' && UUID.test(id) ? id : undefined;
}

/**
 * The uploaded name's extension, kept on the stored file when it is a plain
 * one (`.jpg`, `.tar.gz`'s `.gz`); anything else is dropped.
 */
export function storedExtension(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  return /^.[a-z0-9]{1,16}$/.test(ext) ? ext : '';
}

export async function writeAttachmentFile(
  noteDir: string,
  originalName: string,
  data: Buffer,
): Promise<{ storedFilename: string; filePath: string }> {
  await fs.mkdir(noteDir, { recursive: true });

  const storedFilename = `${crypto.randomUUID()}-${Date.now()}${storedExtension(originalName)}`;
  const filePath = pathInside(noteDir, storedFilename);

  await fs.writeFile(filePath, data);
  return { storedFilename, filePath };
}

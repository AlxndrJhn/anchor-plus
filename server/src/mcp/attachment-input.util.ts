import * as path from 'path';
import { ATTACHMENT_MAX_FILE_SIZE } from '../notes/constants/notes.constants';

/** An attachment as an MCP client sends it: a name and base64 bytes. */
export interface AttachmentInput {
  filename: string;
  data: string;
  mimeType?: string;
}

/** A decoded attachment, ready for NoteAttachmentsService.upload. */
export type DecodedAttachment = Pick<
  Express.Multer.File,
  'originalname' | 'mimetype' | 'buffer' | 'size'
>;

/** All files sent in one call together: enough for one of the biggest. */
export const ATTACHMENTS_MAX_SENT_BYTES = ATTACHMENT_MAX_FILE_SIZE;

/**
 * The JSON an MCP request may carry (app.setup.ts): the attachments above,
 * which base64 grows by a third, and room for the rest of the call.
 */
export const MCP_REQUEST_MAX_BYTES =
  Math.ceil((ATTACHMENTS_MAX_SENT_BYTES * 4) / 3) + 2 * 1024 * 1024;

const DATA_URL = /^data:([^;,]*)(?:;[^,]*)?;base64,/i;
const BASE64 = /^[A-Za-z0-9+/_-]*={0,2}$/;

// Types for the names a client is likeliest to send without one: the
// pictures and recordings the apps show, and common documents.
const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.heic': 'image/heic',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.aac': 'audio/aac',
  '.weba': 'audio/webm',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.html': 'text/html',
  '.zip': 'application/zip',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
};

/** A file's type from its name, for a client that didn't say. */
export function mimeTypeForFilename(filename: string): string {
  return (
    MIME_BY_EXTENSION[path.extname(filename).toLowerCase()] ??
    'application/octet-stream'
  );
}

/**
 * Decodes the attachments sent with a tool call, refusing the lot (before
 * anything is stored) when one is not base64, is empty or is too big.
 */
export function decodeAttachments(
  inputs: AttachmentInput[],
): DecodedAttachment[] {
  let total = 0;
  return inputs.map(({ filename, data, mimeType }) => {
    const name = path.basename(filename.replace(/\\/g, '/')).trim();
    if (!name) throw new AttachmentInputError('An attachment has no filename.');

    let encoded = data.trim();
    const dataUrl = DATA_URL.exec(encoded);
    if (dataUrl) encoded = encoded.slice(dataUrl[0].length);
    encoded = encoded.replace(/\s+/g, '');
    if (!encoded || !BASE64.test(encoded)) {
      throw new AttachmentInputError(
        `The data of ${name} is not base64; send the file's bytes as base64.`,
      );
    }

    const buffer = Buffer.from(encoded, 'base64');
    if (buffer.length === 0) {
      throw new AttachmentInputError(`${name} is empty.`);
    }
    if (buffer.length > ATTACHMENT_MAX_FILE_SIZE) {
      throw new AttachmentInputError(
        `${name} is bigger than the ${ATTACHMENT_MAX_FILE_SIZE / 1024 / 1024} ` +
          'MB an attachment can be.',
      );
    }
    total += buffer.length;
    if (total > ATTACHMENTS_MAX_SENT_BYTES) {
      throw new AttachmentInputError(
        'These attachments are too big to send in one call; they can be ' +
          `${ATTACHMENTS_MAX_SENT_BYTES / 1024 / 1024} MB together.`,
      );
    }

    const type =
      mimeType?.trim().toLowerCase() ||
      dataUrl?.[1]?.trim().toLowerCase() ||
      mimeTypeForFilename(name);
    return {
      originalname: name,
      mimetype: type,
      buffer,
      size: buffer.length,
    };
  });
}

export class AttachmentInputError extends Error {}

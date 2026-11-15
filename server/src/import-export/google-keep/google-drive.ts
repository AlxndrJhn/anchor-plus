import { createWriteStream } from 'fs';
import { unlink } from 'fs/promises';
import { Readable, Transform } from 'stream';
import { pipeline } from 'stream/promises';
import type { ReadableStream as WebReadableStream } from 'stream/web';

const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';

/** Drive file ids are URL-safe base64-ish strings. */
export const DRIVE_FILE_ID_RE = /^[A-Za-z0-9_-]{10,200}$/;

export class DriveDownloadError extends Error {}

export type DriveFileInfo = { name: string; size: number; mimeType: string };

/**
 * Downloads a file the person picked in the Google Picker, with the
 * short-lived drive.file token the Picker gave their browser. The token is
 * used for these two requests only and never stored.
 */
export async function driveFileInfo(
  fileId: string,
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DriveFileInfo> {
  const response = await fetchImpl(
    `${DRIVE_FILES_URL}/${encodeURIComponent(fileId)}?fields=name,size,mimeType&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new DriveDownloadError(
      response.status === 401 || response.status === 403
        ? 'Google Drive refused access to the file; choose it again'
        : `Google Drive answered ${response.status}`,
    );
  }
  const body = (await response.json()) as {
    name?: string;
    size?: string;
    mimeType?: string;
  };
  return {
    name: body.name ?? fileId,
    size: Number(body.size ?? 0),
    mimeType: body.mimeType ?? 'application/octet-stream',
  };
}

export async function downloadDriveFile(
  fileId: string,
  accessToken: string,
  destination: string,
  maxBytes: number,
  onBytes: (bytes: number) => void,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const response = await fetchImpl(
    `${DRIVE_FILES_URL}/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok || !response.body) {
    throw new DriveDownloadError(`Google Drive answered ${response.status}`);
  }

  let received = 0;
  const counter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      received += chunk.length;
      if (received > maxBytes) {
        callback(
          new DriveDownloadError(
            'The export is larger than this server accepts',
          ),
        );
        return;
      }
      onBytes(chunk.length);
      callback(null, chunk);
    },
  });
  try {
    await pipeline(
      Readable.fromWeb(response.body as WebReadableStream<Uint8Array>),
      counter,
      createWriteStream(destination),
    );
  } catch (error) {
    await unlink(destination).catch(() => undefined);
    throw error;
  }
}

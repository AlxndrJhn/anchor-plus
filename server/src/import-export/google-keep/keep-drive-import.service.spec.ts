import { readFile, mkdtemp, rm } from 'fs/promises';
import { createWriteStream } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ZipArchive } from 'archiver';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PayloadTooLargeException } from '@nestjs/common';
import type { ImportService } from '../import.service';
import type { ImportNotesDto } from '../dto/import-notes.dto';
import {
  KeepDriveImportService,
  type KeepImportJobView,
} from './keep-drive-import.service';

const USER = 'user-1';
const FILE_ID = 'drive-file-0001';
const TOKEN = 'ya29.token';

const config = {
  enabled: true,
  clientId: 'client',
  apiKey: 'key',
  appId: '123',
  maxMb: 100,
};

const keepNote = (overrides: Record<string, unknown>) =>
  JSON.stringify({
    title: 'Groceries',
    textContent: 'Milk',
    userEditedTimestampUsec: 1_700_000_000_000_000,
    createdTimestampUsec: 1_690_000_000_000_000,
    color: 'YELLOW',
    labels: [{ name: 'home' }],
    ...overrides,
  });

async function zipOf(files: Record<string, string | Buffer>): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), 'keep-spec-'));
  const path = join(dir, 'takeout.zip');
  const archive = new ZipArchive();
  const done = new Promise<void>((resolve, reject) => {
    const out = createWriteStream(path);
    out.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(out);
  });
  for (const [name, content] of Object.entries(files)) {
    archive.append(content, { name });
  }
  await archive.finalize();
  await done;
  const bytes = await readFile(path);
  await rm(dir, { recursive: true, force: true });
  return bytes;
}

function stubDrive(zip: Buffer, status = 200) {
  const fetchMock = vi.fn<typeof fetch>((input) => {
    const url = String(input as string);
    if (status !== 200) {
      return Promise.resolve(new Response('no', { status }));
    }
    if (url.includes('alt=media')) {
      return Promise.resolve(new Response(new Uint8Array(zip)));
    }
    return Promise.resolve(
      Response.json({
        name: 'takeout.zip',
        size: String(zip.length),
        mimeType: 'application/zip',
      }),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function finished(
  service: KeepDriveImportService,
  jobId: string,
): Promise<KeepImportJobView> {
  for (let i = 0; i < 200; i++) {
    const job = service.job(USER, jobId);
    if (job.phase === 'done' || job.phase === 'failed') return job;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('import did not finish');
}

describe('KeepDriveImportService', () => {
  let importNotes: ReturnType<typeof vi.fn>;
  let importAttachment: ReturnType<typeof vi.fn>;
  let service: KeepDriveImportService;

  beforeEach(() => {
    importNotes = vi.fn((_user: string, dto: ImportNotesDto) =>
      Promise.resolve({
        results: dto.notes.map((note, index) => ({
          ref: note.ref,
          status: 'created',
          noteId: `note-${index}`,
        })),
        tags: { created: 0, reused: 0 },
      }),
    );
    importAttachment = vi.fn(() => Promise.resolve({}));
    service = new KeepDriveImportService(
      { importNotes, importAttachment } as unknown as ImportService,
      config,
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it('imports the notes and pictures of a Takeout export from Drive', async () => {
    const fetchMock = stubDrive(
      await zipOf({
        'Takeout/Keep/Groceries.json': keepNote({
          attachments: [{ filePath: 'photo.jpeg', mimetype: 'image/jpeg' }],
        }),
        'Takeout/Keep/photo.jpg': Buffer.from('jpeg-bytes'),
        'Takeout/Keep/Old.json': keepNote({ title: 'Old', isTrashed: true }),
        'Takeout/Keep/Groceries.html': '<html></html>',
      }),
    );

    const { jobId } = service.start(USER, {
      fileIds: [FILE_ID],
      accessToken: TOKEN,
    });
    const job = await finished(service, jobId);

    expect(job).toMatchObject({
      phase: 'done',
      notesCreated: 1,
      attachmentsImported: 1,
    });
    expect(job.skipped).toEqual([
      { item: 'Old', reason: 'Trashed in Google Keep' },
    ]);
    for (const [, init] of fetchMock.mock.calls) {
      expect(init?.headers).toEqual({ Authorization: `Bearer ${TOKEN}` });
    }

    const dto = importNotes.mock.calls[0][1] as ImportNotesDto;
    expect(dto.notes).toHaveLength(1);
    expect(dto.notes[0]).toMatchObject({
      ref: 'keep:Takeout/Keep/Groceries.json',
      title: 'Groceries',
      background: 'color_yellow',
      tagNames: ['home'],
      createdAt: '2023-07-22T04:26:40.000Z',
    });
    expect(JSON.parse(dto.notes[0].content!)).toEqual({
      ops: [{ insert: 'Milk\n' }],
    });
    expect(dto.tags).toEqual([{ name: 'home' }]);

    const [user, noteId, file, position] = importAttachment.mock
      .calls[0] as unknown[];
    expect([user, noteId, position]).toEqual([USER, 'note-0', 0]);
    expect(file).toMatchObject({
      originalname: 'photo.jpg',
      mimetype: 'image/jpeg',
      size: 10,
    });
  });

  it('notes a picture that no longer fits the storage quota', async () => {
    importAttachment.mockRejectedValue(new PayloadTooLargeException());
    stubDrive(
      await zipOf({
        'Takeout/Keep/A.json': keepNote({
          attachments: [{ filePath: 'a.png', mimetype: 'image/png' }],
        }),
        'Takeout/Keep/a.png': Buffer.from('png'),
      }),
    );
    const { jobId } = service.start(USER, {
      fileIds: [FILE_ID],
      accessToken: TOKEN,
    });
    const job = await finished(service, jobId);
    expect(job.phase).toBe('done');
    expect(job.skipped).toEqual([
      { item: 'a.png', reason: 'Your storage is full' },
    ]);
  });

  it('says so when the picked file holds no Keep notes', async () => {
    stubDrive(await zipOf({ 'Takeout/Drive/readme.txt': 'hi' }));
    const { jobId } = service.start(USER, {
      fileIds: [FILE_ID],
      accessToken: TOKEN,
    });
    expect(await finished(service, jobId)).toMatchObject({
      phase: 'failed',
      error: 'No Google Keep notes in this export',
    });
    expect(importNotes).not.toHaveBeenCalled();
  });

  it('says so when Drive refuses the token', async () => {
    stubDrive(Buffer.alloc(0), 401);
    const { jobId } = service.start(USER, {
      fileIds: [FILE_ID],
      accessToken: TOKEN,
    });
    expect(await finished(service, jobId)).toMatchObject({
      phase: 'failed',
      error: 'Google Drive refused access to the file; choose it again',
    });
  });

  it('refuses an export larger than the server accepts', async () => {
    service = new KeepDriveImportService(
      { importNotes, importAttachment } as unknown as ImportService,
      { ...config, maxMb: 0 },
    );
    stubDrive(await zipOf({ 'Takeout/Keep/A.json': keepNote({}) }));
    const { jobId } = service.start(USER, {
      fileIds: [FILE_ID],
      accessToken: TOKEN,
    });
    expect(await finished(service, jobId)).toMatchObject({
      phase: 'failed',
      error: 'The export is larger than this server accepts',
    });
  });

  it('runs one import per person and keeps jobs to their owner', async () => {
    stubDrive(await zipOf({ 'Takeout/Keep/A.json': keepNote({}) }));
    const { jobId } = service.start(USER, {
      fileIds: [FILE_ID],
      accessToken: TOKEN,
    });
    expect(() =>
      service.start(USER, { fileIds: [FILE_ID], accessToken: TOKEN }),
    ).toThrow('already running');
    expect(() => service.job('user-2', jobId)).toThrow('No such import');
    await finished(service, jobId);
  });

  it('is off without a Google Cloud project', () => {
    service = new KeepDriveImportService(
      { importNotes, importAttachment } as unknown as ImportService,
      { ...config, enabled: false },
    );
    expect(service.clientConfig()).toEqual({ enabled: false });
    expect(() =>
      service.start(USER, { fileIds: [FILE_ID], accessToken: TOKEN }),
    ).toThrow('off on this server');
  });
});

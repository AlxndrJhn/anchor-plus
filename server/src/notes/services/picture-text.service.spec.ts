import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import sharp from 'sharp';
import { flawedJpeg } from '../../../test/flawed-jpeg';
import * as os from 'os';
import * as path from 'path';
import { createWorker } from 'tesseract.js';
import { PictureTextService, cleanText } from './picture-text.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { SyncEmitterService } from '../../sync/sync-emitter.service';

const recognize = vi.fn();
const terminate = vi.fn().mockResolvedValue(undefined);
vi.mock('tesseract.js', () => ({
  OEM: { LSTM_ONLY: 1 },
  createWorker: vi.fn(() => Promise.resolve({ recognize, terminate })),
}));

interface Row {
  id: string;
  noteId: string;
  storedFilename: string;
  type: 'image' | 'audio';
  text: string | null;
  textReadAt: Date | null;
}

describe('PictureTextService', () => {
  let rows: Row[];
  let dir: string;
  let emitted: unknown[];
  let service: PictureTextService;

  const noteAttachment = {
    findMany: vi.fn(({ where, take }: { where: Partial<Row>; take: number }) =>
      Promise.resolve(
        rows
          .filter((r) => r.type === where.type && r.textReadAt === null)
          .slice(0, take),
      ),
    ),
    updateMany: vi.fn(
      ({
        where,
        data,
      }: {
        where: { id: string };
        data: Pick<Row, 'text' | 'textReadAt'>;
      }) => {
        const row = rows.find((r) => r.id === where.id);
        if (row) Object.assign(row, data);
        return Promise.resolve({ count: row ? 1 : 0 });
      },
    ),
  };
  const prisma = {
    noteAttachment,
    $transaction: (work: (tx: unknown) => Promise<unknown>) =>
      work({ noteAttachment }),
  } as unknown as PrismaService;
  const syncEmitter = {
    noteRecipients: vi.fn().mockResolvedValue(['owner']),
    emit: vi.fn((_tx: unknown, emissions: unknown[]) => {
      emitted.push(...emissions);
      return Promise.resolve();
    }),
  } as unknown as SyncEmitterService;

  function picture(
    id: string,
    type: Row['type'] = 'image',
    data: Buffer = png,
  ): Row {
    fs.mkdirSync(path.join(dir, 'note-1'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'note-1', `${id}.png`), data);
    return {
      id,
      noteId: 'note-1',
      storedFilename: `${id}.png`,
      type,
      text: null,
      textReadAt: null,
    };
  }

  function create(enabled = true) {
    return new PictureTextService(
      prisma,
      syncEmitter,
      { attachmentsDir: dir } as never,
      { enabled },
    );
  }

  /** Lets the background round finish. */
  async function settle(s: PictureTextService) {
    s.kick();
    await (s as unknown as { running: Promise<void> | null }).running;
  }

  let png: Buffer;
  beforeAll(async () => {
    png = await sharp({
      create: { width: 8, height: 8, channels: 3, background: 'white' },
    })
      .png()
      .toBuffer();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'picture-text-'));
    rows = [];
    emitted = [];
    service = create();
  });

  it('reads unread pictures, keeps the text and tells the apps', async () => {
    rows = [picture('a'), picture('b'), picture('voice', 'audio')];
    recognize
      .mockResolvedValueOnce({
        data: { text: '  Kassenbon  \n\n\n\nEUR 4,20 ' },
      })
      .mockResolvedValueOnce({ data: { text: '   ' } });

    await settle(service);

    expect(rows[0].text).toBe('Kassenbon\n\nEUR 4,20');
    expect(rows[0].textReadAt).toBeInstanceOf(Date);
    // Read, but nothing found: not read again, nothing to tell.
    expect(rows[1].text).toBeNull();
    expect(rows[1].textReadAt).toBeInstanceOf(Date);
    // Only pictures are read.
    expect(rows[2].textReadAt).toBeNull();
    expect(recognize).toHaveBeenCalledTimes(2);
    expect(emitted).toHaveLength(1);
  });

  it("marks a picture it can't read as read, so it isn't tried again", async () => {
    rows = [picture('broken')];
    recognize.mockRejectedValueOnce(new Error('Unknown format'));

    await settle(service);

    expect(rows[0].textReadAt).toBeInstanceOf(Date);
    expect(rows[0].text).toBeNull();
    expect(emitted).toHaveLength(0);
  });

  it('reads a JPEG with a small flaw, as viewers show it', async () => {
    rows = [picture('scan', 'image', await flawedJpeg())];
    recognize.mockResolvedValueOnce({ data: { text: 'Karte' } });

    await settle(service);

    expect(rows[0].text).toBe('Karte');
    // Handed over decoded, so the reader's own strict decoder isn't involved.
    const given = recognize.mock.calls[0][0] as Buffer;
    expect((await sharp(given).metadata()).format).toBe('png');
  });

  it('marks a file that is no picture as read', async () => {
    rows = [picture('junk', 'image', Buffer.from('not a picture'))];

    await settle(service);

    expect(rows[0].textReadAt).toBeInstanceOf(Date);
    expect(rows[0].text).toBeNull();
    expect(recognize).not.toHaveBeenCalled();
  });

  it('tells nobody about a picture deleted while it was read', async () => {
    rows = [picture('gone')];
    recognize.mockImplementationOnce(() => {
      rows = [];
      return Promise.resolve({ data: { text: 'Hello' } });
    });

    await settle(service);

    expect(emitted).toHaveLength(0);
  });

  // tesseract.js throws a failed read outside any caller unless the worker
  // has an error handler, which took the whole server down.
  it('gives the reader an error handler', async () => {
    rows = [picture('a')];
    recognize.mockResolvedValueOnce({ data: { text: 'x' } });

    await settle(service);

    expect(vi.mocked(createWorker).mock.calls[0][2]).toHaveProperty(
      'errorHandler',
    );
  });

  it('reads nothing when PICTURE_TEXT is off', async () => {
    rows = [picture('a')];
    const off = create(false);

    await settle(off);

    expect(recognize).not.toHaveBeenCalled();
    expect(rows[0].textReadAt).toBeNull();
  });
});

describe('cleanText', () => {
  it('trims lines and keeps at most one empty line', () => {
    expect(cleanText(' a \n\n\n\n b\n')).toBe('a\n\nb');
  });

  it('keeps search text to a sensible size', () => {
    expect(cleanText('x'.repeat(50_000))).toHaveLength(20_000);
  });
});

import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createWorker, OEM, type Worker } from 'tesseract.js';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SyncEmitterService,
  attachmentsEmissions,
} from '../../sync/sync-emitter.service';
import { PictureTextConfig, StorageConfig } from '../../config/configuration';

/** Languages read, with their data shipped in @tesseract.js-data. */
const LANGUAGES = ['eng', 'deu'];

/** Pictures read per round; the next round picks up the rest. */
const BATCH = 20;

/** An idle reader is closed after this long, to give its memory back. */
const IDLE_MS = 2 * 60 * 1000;

/** Text kept per picture, enough for search. */
const MAX_TEXT = 20_000;

/**
 * Reads the text in note pictures, in the background, so search finds
 * notes by what their pictures say (screenshots, receipts, documents). The
 * text is stored on the attachment and reaches the apps with it.
 */
@Injectable()
export class PictureTextService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(PictureTextService.name);
  private worker: Promise<Worker> | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private running: Promise<void> | null = null;
  private again = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncEmitter: SyncEmitterService,
    @Inject(StorageConfig.KEY)
    private readonly storage: ConfigType<typeof StorageConfig>,
    @Inject(PictureTextConfig.KEY)
    private readonly config: ConfigType<typeof PictureTextConfig>,
  ) {}

  onApplicationBootstrap() {
    // Pictures added before this existed, or while the server was down.
    this.kick();
  }

  async onModuleDestroy() {
    await this.running;
    await this.closeWorker();
  }

  /** A picture was added: read it soon. */
  kick() {
    if (!this.config.enabled) return;
    if (this.running) {
      this.again = true;
      return;
    }
    this.running = this.drain().finally(() => {
      this.running = null;
      if (this.again) {
        this.again = false;
        this.kick();
      }
    });
  }

  /** In case a kick was missed, e.g. a failed round. */
  @Cron(CronExpression.EVERY_10_MINUTES)
  sweep() {
    this.kick();
  }

  /** Reads unread pictures until there are none left. */
  private async drain() {
    try {
      for (;;) {
        const pending = await this.prisma.noteAttachment.findMany({
          where: { type: 'image', textReadAt: null },
          orderBy: { createdAt: 'desc' },
          take: BATCH,
          select: { id: true, noteId: true, storedFilename: true },
        });
        if (pending.length === 0) return;
        for (const picture of pending) await this.readOne(picture);
      }
    } catch (error) {
      this.logger.error('Reading picture text failed', error);
    }
  }

  private async readOne(picture: {
    id: string;
    noteId: string;
    storedFilename: string;
  }) {
    const file = path.join(
      this.storage.attachmentsDir,
      picture.noteId,
      picture.storedFilename,
    );
    let text = '';
    try {
      text = cleanText(await this.read(file));
    } catch (error) {
      // Unreadable (an animation, a broken file): don't try it again.
      this.logger.warn(
        `Couldn't read text in attachment ${picture.id}: ${String(error)}`,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.noteAttachment.updateMany({
        where: { id: picture.id },
        data: { text: text || null, textReadAt: new Date() },
      });
      // Deleted meanwhile: nothing to tell anyone.
      if (updated.count === 0 || !text) return;
      const recipients = await this.syncEmitter.noteRecipients(
        tx,
        picture.noteId,
      );
      await this.syncEmitter.emit(
        tx,
        attachmentsEmissions(recipients, picture.noteId),
      );
    });
  }

  private async read(file: string): Promise<string> {
    const picture = await readablePicture(file);
    const worker = await this.getWorker();
    const { data } = await worker.recognize(picture);
    this.scheduleClose();
    return data.text;
  }

  private getWorker(): Promise<Worker> {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.worker ??= createWorker(LANGUAGES, OEM.LSTM_ONLY, {
      langPath: languageDir(),
      cachePath: languageDir(),
      gzip: true,
      // Without one, a picture it can't read throws outside any caller and
      // takes the server down; the read itself still fails, and is caught.
      errorHandler: () => undefined,
    }).catch((error: unknown) => {
      this.worker = null;
      throw error;
    });
    return this.worker;
  }

  private scheduleClose() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => void this.closeWorker(), IDLE_MS);
    this.idleTimer.unref();
  }

  private async closeWorker() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
    const worker = this.worker;
    this.worker = null;
    if (worker) await (await worker).terminate().catch(() => undefined);
  }
}

/**
 * The language data, gathered in one folder (the reader takes one), from
 * the packages that ship it.
 */
let languages: string | null = null;
function languageDir(): string {
  if (languages) return languages;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'anchor-tessdata-'));
  for (const lang of LANGUAGES) {
    fs.copyFileSync(
      require.resolve(
        `@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`,
      ),
      path.join(dir, `${lang}.traineddata.gz`),
    );
  }
  languages = dir;
  return dir;
}

/**
 * The picture as a PNG the reader takes, upright. The reader's own JPEG
 * decoder rejects pictures with small flaws that every viewer shows fine
 * (some scanner and phone apps write them), so sharp decodes it, leniently.
 */
async function readablePicture(file: string): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  return sharp(file, { animated: false, failOn: 'truncated' })
    .rotate()
    .png()
    .toBuffer();
}

/** Tidies OCR output: trimmed lines, at most one empty line in a row. */
export function cleanText(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_TEXT);
}

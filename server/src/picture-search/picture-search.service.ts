import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  Optional,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { Prisma } from 'src/generated/prisma/client';
import { NoteState } from 'src/generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { PictureSearchConfig, StorageConfig } from '../config/configuration';
import { noteAccessibleBy } from '../notes/constants/notes.constants';
import { MODEL_ID, PictureModel, type ModelState } from './picture-model';
import { LABELS } from './labels';
import { LABEL_WORDS } from './label-words';
import { labelLanguage } from './label-words/words';

const LANGUAGES = new Set(Object.keys(LABEL_WORDS));

/** Pictures done per round; the next round picks up the rest. */
const BATCH = 20;

/** A picture matches when it's at least this close to the description… */
export const MIN_SCORE = 0.06;
/** …and not far behind the best match. */
export const BEST_WINDOW = 0.03;
/** Notes returned, best first. */
const MAX_RESULTS = 30;

/** Detected tags shown for a picture, at most… */
const MAX_LABELS = 6;
/** …and only those close to the best one. */
const LABEL_WINDOW = 0.02;

/** How a word is put to the model: as a short sentence, which it knows. */
export const labelPrompt = (word: string) =>
  `a photo of ${/^[aeiou]/i.test(word) ? 'an' : 'a'} ${word}`;

export interface PictureLabel {
  en: string;
  /** For phone builds from before `text`, which pick German or English. */
  de: string;
  /** In the language asked for, else English. */
  text: string;
  score: number;
}

export interface PictureMatch {
  noteId: string;
  attachmentId: string;
  score: number;
}

export interface PictureSearchStatus {
  /** Whether this server offers it at all (PICTURE_SEARCH=off doesn't). */
  available: boolean;
  /** Whether this user turned it on. */
  enabled: boolean;
  model: ModelState;
  /** The user's pictures done, of all of them. */
  indexed: number;
  total: number;
}

/** Pictures whose notes someone who turned picture search on can see. */
const forOptedIn: Prisma.NoteAttachmentWhereInput = {
  type: 'image',
  note: {
    state: { not: NoteState.deleted },
    OR: [
      { user: { pictureSearch: true } },
      {
        sharedWith: {
          some: { isDeleted: false, sharedWithUser: { pictureSearch: true } },
        },
      },
    ],
  },
};

/**
 * Finds notes by what their pictures show ("Sonnenuntergang am Meer"), for
 * users who turn it on: each picture becomes a vector once, in the
 * background, and a search compares the description's vector with them.
 */
@Injectable()
export class PictureSearchService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PictureSearchService.name);
  private readonly model: PictureModel;
  private readonly attachmentsDir: string;
  private readonly modelDir: string;
  /** The words' vectors, worked out once and kept next to the model. */
  private labelVectors: Promise<Float32Array[]> | null = null;
  private running: Promise<void> | null = null;
  private again = false;
  /** Vectors never change, so they're kept once read. */
  private readonly vectors = new Map<string, Float32Array>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(StorageConfig.KEY)
    storage: ConfigType<typeof StorageConfig>,
    @Inject(PictureSearchConfig.KEY)
    private readonly config: ConfigType<typeof PictureSearchConfig>,
    // A stand-in, for tests.
    @Optional() model?: PictureModel,
  ) {
    this.attachmentsDir = storage.attachmentsDir;
    this.modelDir = path.join(storage.root, 'models', MODEL_ID);
    this.model = model ?? new PictureModel(this.modelDir, config.modelUrl);
  }

  onApplicationBootstrap() {
    this.kick();
  }

  /** New pictures, or someone turned it on: get to work. */
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

  @Cron(CronExpression.EVERY_10_MINUTES)
  sweep() {
    this.kick();
  }

  private async drain() {
    try {
      for (;;) {
        const pending = await this.prisma.noteAttachment.findMany({
          where: { ...forOptedIn, embedding: null },
          orderBy: { createdAt: 'desc' },
          take: BATCH,
          select: { id: true, noteId: true, storedFilename: true },
        });
        if (pending.length === 0) {
          await this.warmLabels();
          return;
        }
        await this.model.ensureDownloaded();
        for (const picture of pending) await this.embed(picture);
      }
    } catch (error) {
      this.logger.error('Indexing pictures for search failed', error);
    }
  }

  private async embed(picture: {
    id: string;
    noteId: string;
    storedFilename: string;
  }) {
    const file = path.join(
      this.attachmentsDir,
      picture.noteId,
      picture.storedFilename,
    );
    let vector: Float32Array;
    try {
      vector = await this.model.embedImage(file);
    } catch (error) {
      // Unreadable: an empty vector, so it isn't tried again.
      this.logger.warn(
        `Couldn't index attachment ${picture.id}: ${String(error)}`,
      );
      vector = new Float32Array(0);
    }
    await this.prisma.pictureEmbedding
      .create({
        data: {
          attachmentId: picture.id,
          model: MODEL_ID,
          vector: Uint8Array.from(
            new Uint8Array(vector.buffer, vector.byteOffset, vector.byteLength),
          ),
        },
      })
      // Deleted meanwhile.
      .catch(() => undefined);
  }

  async status(userId: string): Promise<PictureSearchStatus> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pictureSearch: true },
    });
    const enabled = this.config.enabled && !!user?.pictureSearch;
    const mine: Prisma.NoteAttachmentWhereInput = {
      type: 'image',
      note: { AND: [noteAccessibleBy(userId), { state: NoteState.active }] },
    };
    const [total, indexed] = enabled
      ? await Promise.all([
          this.prisma.noteAttachment.count({ where: mine }),
          this.prisma.noteAttachment.count({
            where: { ...mine, embedding: { isNot: null } },
          }),
        ])
      : [0, 0];
    return {
      available: this.config.enabled,
      enabled,
      model: this.model.state,
      indexed,
      total,
    };
  }

  async setEnabled(userId: string, enabled: boolean) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pictureSearch: enabled && this.config.enabled },
    });
    if (enabled) this.kick();
    return this.status(userId);
  }

  /** The user's notes whose pictures look like [query], best first. */
  async search(userId: string, query: string): Promise<PictureMatch[]> {
    const q = query.trim();
    if (!this.config.enabled || q.length < 2) return [];
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pictureSearch: true },
    });
    if (!user?.pictureSearch || this.model.state.state !== 'ready') return [];

    const pictures = await this.prisma.noteAttachment.findMany({
      where: {
        type: 'image',
        note: { AND: [noteAccessibleBy(userId), { state: NoteState.active }] },
        embedding: { model: MODEL_ID },
      },
      select: { id: true, noteId: true },
    });
    if (pictures.length === 0) return [];
    await this.loadVectors(pictures.map((p) => p.id));

    const target = await this.model.embedText(q);
    return bestMatches(
      pictures.map((p) => ({
        noteId: p.noteId,
        attachmentId: p.id,
        score: dot(this.vectors.get(p.id), target),
      })),
    );
  }

  /**
   * The words that best describe a picture the user can see ("Show
   * detected tags"); none while picture search is off for them or the
   * picture isn't indexed yet.
   */
  /**
   * The words that best describe a picture, in `language` (a language tag
   * or Accept-Language header) when the words come in it, else English.
   */
  async labels(
    userId: string,
    attachmentId: string,
    language?: string,
  ): Promise<PictureLabel[]> {
    if (!this.config.enabled) return [];
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pictureSearch: true },
    });
    if (!user?.pictureSearch || this.model.state.state !== 'ready') return [];
    const picture = await this.prisma.noteAttachment.findFirst({
      where: {
        id: attachmentId,
        type: 'image',
        note: noteAccessibleBy(userId),
      },
      select: { id: true },
    });
    if (!picture) return [];
    await this.loadVectors([picture.id]);
    const vector = this.vectors.get(picture.id);
    if (!vector?.length) return [];
    return bestLabels(
      vector,
      await this.loadLabelVectors(),
      labelLanguage(language, LANGUAGES),
    );
  }

  /**
   * Works the words for "Show detected tags" out ahead of time, once
   * someone uses picture search, so the first picture opened needn't wait.
   */
  private async warmLabels() {
    if (this.labelVectors || this.model.state.state !== 'ready') return;
    const users = await this.prisma.user.count({
      where: { pictureSearch: true },
    });
    if (users > 0) await this.loadLabelVectors();
  }

  private loadLabelVectors(): Promise<Float32Array[]> {
    this.labelVectors ??= (async () => {
      const words = LABELS.map((en) => labelPrompt(en));
      const key = createHash('sha256').update(words.join('\n')).digest('hex');
      const file = path.join(this.modelDir, `labels-${key.slice(0, 16)}.f32`);
      const cached = readIfExists(file);
      if (cached) {
        const all = toFloats(cached);
        const size = all.length / words.length;
        return words.map((_, i) => all.slice(i * size, (i + 1) * size));
      }
      const vectors: Float32Array[] = [];
      for (const word of words) vectors.push(await this.model.embedText(word));
      const bytes = Buffer.concat(
        vectors.map((v) => Buffer.from(v.buffer, v.byteOffset, v.byteLength)),
      );
      fs.mkdirSync(this.modelDir, { recursive: true });
      fs.writeFileSync(file, bytes);
      return vectors;
    })().catch((error: unknown) => {
      this.labelVectors = null;
      throw error;
    });
    return this.labelVectors;
  }

  private async loadVectors(ids: string[]) {
    const missing = ids.filter((id) => !this.vectors.has(id));
    if (missing.length === 0) return;
    const rows = await this.prisma.pictureEmbedding.findMany({
      where: { attachmentId: { in: missing } },
      select: { attachmentId: true, vector: true },
    });
    for (const row of rows) {
      this.vectors.set(row.attachmentId, toFloats(row.vector));
    }
  }
}

/** Each note once, by its best picture; only close matches, best first. */
export function bestMatches(scored: PictureMatch[]): PictureMatch[] {
  const best = Math.max(...scored.map((s) => s.score), -1);
  const byNote = new Map<string, PictureMatch>();
  for (const match of scored) {
    if (match.score < MIN_SCORE || match.score < best - BEST_WINDOW) continue;
    const kept = byNote.get(match.noteId);
    if (!kept || kept.score < match.score) byNote.set(match.noteId, match);
  }
  return [...byNote.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map((m) => ({ ...m, score: Math.round(m.score * 1e4) / 1e4 }));
}

/** The words closest to a picture's vector, best first. */
export function bestLabels(
  picture: Float32Array,
  labels: Float32Array[],
  language = 'en',
): PictureLabel[] {
  const words = LABEL_WORDS[language];
  const scored = LABELS.map((en, i) => ({
    en,
    de: LABEL_WORDS.de[en],
    text: words?.[en] ?? en,
    score: dot(labels[i], picture),
  })).sort((a, b) => b.score - a.score);
  const best = scored[0]?.score ?? -1;
  // Some languages have one word for two of them ("brod", boat and ship).
  const seen = new Set<string>();
  return scored
    .filter((l) => l.score >= best - LABEL_WINDOW)
    .filter((l) => !seen.has(l.text) && !!seen.add(l.text))
    .slice(0, MAX_LABELS)
    .map((l) => ({ ...l, score: Math.round(l.score * 1e4) / 1e4 }));
}

function dot(a: Float32Array | undefined, b: Float32Array): number {
  if (!a || a.length !== b.length) return -1;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

/** A file's bytes, or null when there is no such file. */
function readIfExists(file: string): Buffer | null {
  try {
    return fs.readFileSync(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

function toFloats(bytes: Uint8Array): Float32Array {
  // Copied: a database buffer needn't be aligned for Float32Array.
  const copy = new Uint8Array(bytes);
  return new Float32Array(copy.buffer, 0, copy.byteLength / 4);
}

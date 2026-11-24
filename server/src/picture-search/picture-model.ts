import { Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import type { InferenceSession, Tensor } from 'onnxruntime-web';

/**
 * SigLIP 2 (base, 224 px): a picture and a description in most languages
 * become vectors that lie close together when they match. The int8 models
 * run on the CPU through ONNX Runtime's WebAssembly build, which works on
 * the Alpine image (the native build needs glibc).
 */
export const MODEL_ID = 'siglip2-base-patch16-224-int8';

const REVISION = 'ba1f3b0843f24bc5417d38e19c37b287d719b2f4';
export const DEFAULT_MODEL_URL = `https://huggingface.co/onnx-community/siglip2-base-patch16-224-ONNX/resolve/${REVISION}`;

/** The files the model needs; the large ones are checked against SHA-256. */
const FILES: { name: string; sha256?: string; size?: number }[] = [
  { name: 'tokenizer.json' },
  { name: 'tokenizer_config.json' },
  {
    name: 'onnx/vision_model_int8.onnx',
    sha256: '0dd31785a2713f1113ef2272472165c69d580473dae38d7b47568ac587795e70',
    size: 94_553_333,
  },
  {
    name: 'onnx/text_model_int8.onnx',
    sha256: '3a0603d3a00c05a80a6ded4743c16aaac7b1e62cdcc7e362e7ce418659b96400',
    size: 283_438_275,
  },
];

const IMAGE_SIZE = 224;
const TEXT_LENGTH = 64;

/** Loaded models are let go after this long unused (they take ~1 GB). */
const IDLE_MS = 10 * 60 * 1000;

export type ModelState =
  | { state: 'absent' }
  | { state: 'downloading'; progress: number }
  | { state: 'ready' }
  | { state: 'failed'; error: string };

interface Loaded {
  vision: InferenceSession;
  text: InferenceSession;
  tokenizer: { encode(text: string): { ids: number[] } | number[] };
  padId: number;
  ort: typeof import('onnxruntime-web');
}

/** Downloads, loads and runs the picture search model. */
export class PictureModel {
  private readonly logger = new Logger(PictureModel.name);
  private download: Promise<void> | null = null;
  private downloadState: ModelState = { state: 'absent' };
  private loaded: Promise<Loaded> | null = null;
  private idleTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly dir: string,
    private readonly baseUrl: string = DEFAULT_MODEL_URL,
  ) {}

  get state(): ModelState {
    if (this.downloadState.state === 'downloading') return this.downloadState;
    if (this.isDownloaded()) return { state: 'ready' };
    return this.downloadState;
  }

  private isDownloaded(): boolean {
    return FILES.every((file) => fs.existsSync(path.join(this.dir, file.name)));
  }

  /** Downloads the model unless it's there; resolves once it is. */
  ensureDownloaded(): Promise<void> {
    if (this.isDownloaded()) return Promise.resolve();
    this.download ??= this.fetchAll().finally(() => {
      this.download = null;
    });
    return this.download;
  }

  private async fetchAll() {
    const total = FILES.reduce((sum, f) => sum + (f.size ?? 0), 0);
    let done = 0;
    this.downloadState = { state: 'downloading', progress: 0 };
    try {
      for (const file of FILES) {
        const target = path.join(this.dir, file.name);
        if (fs.existsSync(target)) {
          done += file.size ?? 0;
          continue;
        }
        await this.fetchFile(file, target, (bytes) => {
          this.downloadState = {
            state: 'downloading',
            progress: total ? Math.min(1, (done + bytes) / total) : 0,
          };
        });
        done += file.size ?? 0;
      }
      this.downloadState = { state: 'ready' };
      this.logger.log(`Picture search model ${MODEL_ID} downloaded`);
    } catch (error) {
      this.downloadState = { state: 'failed', error: String(error) };
      this.logger.error('Downloading the picture search model failed', error);
      throw error;
    }
  }

  private async fetchFile(
    file: (typeof FILES)[number],
    target: string,
    onProgress: (bytes: number) => void,
  ) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const partial = `${target}.part`;
    const response = await fetch(`${this.baseUrl}/${file.name}`);
    if (!response.ok || !response.body) {
      throw new Error(`${file.name}: HTTP ${response.status}`);
    }
    const hash = createHash('sha256');
    let bytes = 0;
    const body = Readable.fromWeb(
      response.body as import('stream/web').ReadableStream,
    );
    body.on('data', (chunk: Buffer) => {
      hash.update(chunk);
      bytes += chunk.length;
      onProgress(bytes);
    });
    await pipeline(body, fs.createWriteStream(partial));
    if (file.sha256 && hash.digest('hex') !== file.sha256) {
      fs.rmSync(partial, { force: true });
      throw new Error(`${file.name}: the download doesn't match its checksum`);
    }
    fs.renameSync(partial, target);
  }

  private load(): Promise<Loaded> {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.loaded ??= (async () => {
      await this.ensureDownloaded();
      // Loaded when first needed: ~1 GB once the models are in.
      const ort = await import('onnxruntime-web');
      ort.env.wasm.numThreads = Math.max(1, Math.min(4, os.cpus().length));
      const { Tokenizer } = (await import('@huggingface/tokenizers')) as {
        Tokenizer: new (json: object, config: object) => Loaded['tokenizer'];
      };
      const read = (name: string) => fs.readFileSync(path.join(this.dir, name));
      const tokenizer = new Tokenizer(
        JSON.parse(read('tokenizer.json').toString()) as object,
        JSON.parse(read('tokenizer_config.json').toString()) as object,
      );
      const vision = await ort.InferenceSession.create(
        read('onnx/vision_model_int8.onnx'),
      );
      const text = await ort.InferenceSession.create(
        read('onnx/text_model_int8.onnx'),
      );
      return { ort, tokenizer, vision, text, padId: 0 };
    })().catch((error: unknown) => {
      this.loaded = null;
      throw error;
    });
    return this.loaded;
  }

  private scheduleUnload() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => void this.unload(), IDLE_MS);
    this.idleTimer.unref();
  }

  async unload() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
    const loaded = this.loaded;
    this.loaded = null;
    if (!loaded) return;
    const { vision, text } = await loaded.catch(() => ({
      vision: null,
      text: null,
    }));
    await vision?.release();
    await text?.release();
  }

  /** What a picture file shows, as a unit vector. */
  async embedImage(file: string): Promise<Float32Array> {
    const model = await this.load();
    try {
      const pixels = await imagePixels(file);
      const input = new model.ort.Tensor('float32', pixels, [
        1,
        3,
        IMAGE_SIZE,
        IMAGE_SIZE,
      ]);
      const out = await model.vision.run({ pixel_values: input });
      return normalize(out.pooler_output);
    } finally {
      this.scheduleUnload();
    }
  }

  /** A description, as a unit vector to compare with pictures'. */
  async embedText(query: string): Promise<Float32Array> {
    const model = await this.load();
    try {
      const ids = tokenIds(model.tokenizer, query, model.padId);
      const input = new model.ort.Tensor(
        'int64',
        BigInt64Array.from(ids, (id) => BigInt(id)),
        [1, TEXT_LENGTH],
      );
      const out = await model.text.run({ input_ids: input });
      return normalize(out.pooler_output);
    } finally {
      this.scheduleUnload();
    }
  }
}

/**
 * The model's input for a picture: 224 × 224, RGB, channels first, values
 * from -1 to 1 (SigLIP's processor: resize, rescale 1/255, normalize 0.5).
 */
export async function imagePixels(file: string): Promise<Float32Array> {
  const sharp = (await import('sharp')).default;
  // Leniently, as viewers show them: some scanner apps write small flaws.
  const data = await sharp(file, { animated: false, failOn: 'truncated' })
    .rotate() // Upright, as the picture is shown.
    .removeAlpha()
    .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: 'fill', kernel: 'linear' })
    .raw()
    .toBuffer();
  const area = IMAGE_SIZE * IMAGE_SIZE;
  const out = new Float32Array(3 * area);
  for (let i = 0; i < area; i++) {
    for (let c = 0; c < 3; c++) out[c * area + i] = data[i * 3 + c] / 127.5 - 1;
  }
  return out;
}

/**
 * The model's input for a description: its tokens, padded to 64. SigLIP 2
 * learned from lowercase text, and matches far better given it.
 */
export function tokenIds(
  tokenizer: Loaded['tokenizer'],
  query: string,
  padId: number,
): number[] {
  const encoded = tokenizer.encode(query.toLowerCase());
  const ids = (Array.isArray(encoded) ? encoded : encoded.ids).slice(
    0,
    TEXT_LENGTH,
  );
  while (ids.length < TEXT_LENGTH) ids.push(padId);
  return ids;
}

function normalize(tensor: Tensor): Float32Array {
  const values = Float32Array.from(tensor.data as Float32Array);
  let sum = 0;
  for (const v of values) sum += v * v;
  const length = Math.sqrt(sum) || 1;
  for (let i = 0; i < values.length; i++) values[i] /= length;
  return values;
}

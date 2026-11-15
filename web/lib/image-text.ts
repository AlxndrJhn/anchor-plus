import { translate } from "@/lib/i18n";

/** A word found in a picture, and where it is, in the picture's pixels. */
export interface ImageWord {
  text: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  /** The line and paragraph it belongs to, counted through the picture. */
  line: number;
  block: number;
}

/** The words found in a picture, in reading order, and the picture's size. */
export interface ImageText {
  words: ImageWord[];
  width: number;
  height: number;
}

/**
 * Puts words back together as text: spaces within a line, a line break
 * between lines and, with `paragraphs`, an empty line between paragraphs.
 */
export function joinImageWords(
  words: readonly ImageWord[],
  { paragraphs = true } = {},
): string {
  let out = "";
  let previous: ImageWord | undefined;
  for (const word of words) {
    if (previous)
      out +=
        word.block !== previous.block && paragraphs
          ? "\n\n"
          : word.line !== previous.line || word.block !== previous.block
            ? "\n"
            : " ";
    out += word.text;
    previous = word;
  }
  return out.trim();
}

/**
 * The index of the word at a point (in the picture's pixels), or null.
 *
 * A finger is wider than the gap between words, so a point just beside a
 * word, up to `slop` away or twice the word's height along its line, counts
 * as the nearest word.
 */
export function imageWordAt(
  words: readonly ImageWord[],
  x: number,
  y: number,
  slop = 12,
): number | null {
  let nearest: number | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  words.forEach((word, i) => {
    if (y < word.top - slop || y > word.bottom + slop) return;
    const dx =
      x < word.left ? word.left - x : x > word.right ? x - word.right : 0;
    if (dx > (word.bottom - word.top) * 2 + slop) return;
    // Ties (a point between two lines) go to the line nearer its middle.
    const distance = dx + Math.abs(y - (word.top + word.bottom) / 2) / 1000;
    if (distance < nearestDistance) {
      nearest = i;
      nearestDistance = distance;
    }
  });
  return nearest;
}

/** A box in the picture's pixels, drawn from any corner to the opposite. */
export interface ImageBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** The indices of the words a box touches, in reading order. */
export function imageWordsIn(
  words: readonly ImageWord[],
  box: ImageBox,
): number[] {
  const indices: number[] = [];
  words.forEach((word, i) => {
    if (
      word.left < box.right &&
      word.right > box.left &&
      word.top < box.bottom &&
      word.bottom > box.top
    )
      indices.push(i);
  });
  return indices;
}

interface TesseractBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** What Tesseract finds, as far as it matters here. */
export interface TesseractBlock {
  paragraphs: {
    lines: { words: { text: string; bbox: TesseractBox }[] }[];
  }[];
}

/** Tesseract's blocks as words in reading order, a paragraph per block. */
export function wordsFromBlocks(
  blocks: readonly TesseractBlock[],
): ImageWord[] {
  const words: ImageWord[] = [];
  let line = 0;
  let block = 0;
  for (const { paragraphs } of blocks)
    for (const paragraph of paragraphs) {
      for (const { words: lineWords } of paragraph.lines) {
        let any = false;
        for (const { text, bbox } of lineWords) {
          if (!text.trim()) continue;
          any = true;
          words.push({
            text: text.trim(),
            left: bbox.x0,
            top: bbox.y0,
            right: bbox.x1,
            bottom: bbox.y1,
            line,
            block,
          });
        }
        if (any) line++;
      }
      block++;
    }
  return words;
}

/** The picture's size in pixels. */
function pictureSize(url: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () =>
      reject(new Error(translate("layout.api")("pictureNotLoaded")));
    img.src = url;
  });
}

/**
 * "Grab image text": finds the English words in a picture in the browser
 * with Tesseract. Its code and language data load from a CDN the first time,
 * so this needs a connection.
 */
export async function recognizeImageText(url: string): Promise<ImageText> {
  const [{ createWorker }, size] = await Promise.all([
    import("tesseract.js"),
    pictureSize(url),
  ]);
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(url, {}, { blocks: true });
    return { words: wordsFromBlocks(data.blocks ?? []), ...size };
  } finally {
    await worker.terminate();
  }
}

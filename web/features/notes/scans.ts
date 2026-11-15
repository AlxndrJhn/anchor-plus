// Scanned documents in a note's text: a Delta embed, `{"scan": "<json>"}`,
// holding pages that each name the original photo (an attachment, never
// changed) and how to turn it into a clean page: its corners, a turn, a
// colour profile and a few adjustments. Both apps render pages the same way
// from that data (mobile/lib/core/files/scan_document.dart), so a scan made
// on the phone can be fine-tuned here and the other way round.

import { translate } from "@/lib/i18n";

export const SCAN_EMBED = "scan";

export type ScanProfile = "bw" | "whiteboard" | "text" | "color";
export const SCAN_PROFILES: ScanProfile[] = [
  "bw",
  "whiteboard",
  "text",
  "color",
];

export type PageSize = "a4" | "letter" | "fit";
export type PdfQuality = "small" | "standard" | "high";
export const PDF_MARGINS = [0, 5, 10, 15] as const;

/** A point as shares (0 to 1) of the photo's width and height. */
export type Corner = [number, number];
/** Top left, top right, bottom right, bottom left. */
export type Corners = [Corner, Corner, Corner, Corner];

export interface ScanPage {
  /** The original photo's attachment id. */
  id: string;
  /** Missing for the whole picture. */
  corners?: Corners;
  rotate: 0 | 90 | 180 | 270;
  profile: ScanProfile;
  /** -100 to 100. */
  brightness: number;
  contrast: number;
  /** Where black turns white in "bw", -100 to 100. */
  threshold: number;
  /** 0 to 100: how much paper shading is evened out. */
  cleanup: number;
}

export interface PdfSettings {
  size: PageSize;
  /** Millimetres. */
  margin: number;
  quality: PdfQuality;
}

export interface ScanDocument {
  title?: string;
  pages: ScanPage[];
  pdf: PdfSettings;
}

export const DEFAULT_PDF: PdfSettings = {
  size: "a4",
  margin: 0,
  quality: "standard",
};

export function newScanPage(id: string, corners?: Corners): ScanPage {
  return {
    id,
    corners,
    rotate: 0,
    profile: "text",
    brightness: 0,
    contrast: 0,
    threshold: 0,
    cleanup: 50,
  };
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

function num(value: unknown, fallback: number, lo: number, hi: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? clamp(Math.round(value), lo, hi)
    : fallback;
}

function parseCorners(value: unknown): Corners | undefined {
  if (!Array.isArray(value) || value.length !== 4) return undefined;
  const points: Corner[] = [];
  for (const p of value) {
    if (
      !Array.isArray(p) ||
      p.length !== 2 ||
      typeof p[0] !== "number" ||
      typeof p[1] !== "number" ||
      !Number.isFinite(p[0]) ||
      !Number.isFinite(p[1])
    )
      return undefined;
    points.push([clamp(p[0], 0, 1), clamp(p[1], 0, 1)]);
  }
  return points as Corners;
}

function parsePage(value: unknown): ScanPage | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  if (typeof p.id !== "string" || !p.id) return null;
  const turn = num(p.rotate, 0, 0, 359);
  const rotate = ((Math.round(turn / 90) * 90) % 360) as ScanPage["rotate"];
  return {
    id: p.id,
    corners: parseCorners(p.corners),
    rotate,
    profile: SCAN_PROFILES.includes(p.profile as ScanProfile)
      ? (p.profile as ScanProfile)
      : "text",
    brightness: num(p.brightness, 0, -100, 100),
    contrast: num(p.contrast, 0, -100, 100),
    threshold: num(p.threshold, 0, -100, 100),
    cleanup: num(p.cleanup, 50, 0, 100),
  };
}

export function parseScan(value: unknown): ScanDocument | null {
  if (typeof value !== "string") return null;
  let data: unknown;
  try {
    data = JSON.parse(value);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const pages = Array.isArray(d.pages)
    ? d.pages.map(parsePage).filter((p): p is ScanPage => p !== null)
    : [];
  const pdf = (d.pdf && typeof d.pdf === "object" ? d.pdf : {}) as Record<
    string,
    unknown
  >;
  const margin = typeof pdf.margin === "number" ? pdf.margin : 0;
  return {
    title:
      typeof d.title === "string" && d.title.trim()
        ? d.title.trim()
        : undefined,
    pages,
    pdf: {
      size: (["a4", "letter", "fit"] as const).includes(pdf.size as PageSize)
        ? (pdf.size as PageSize)
        : "a4",
      // The nearest margin offered.
      margin: PDF_MARGINS.reduce((best, m) =>
        Math.abs(m - margin) < Math.abs(best - margin) ? m : best,
      ),
      quality: (["small", "standard", "high"] as const).includes(
        pdf.quality as PdfQuality,
      )
        ? (pdf.quality as PdfQuality)
        : "standard",
    },
  };
}

const round4 = (v: number) => Math.round(v * 10000) / 10000;

/** The embed's value: only what differs from the defaults. */
export function encodeScan(scan: ScanDocument): string {
  const pages = scan.pages.map((p) => ({
    id: p.id,
    ...(p.corners
      ? { corners: p.corners.map(([x, y]) => [round4(x), round4(y)]) }
      : {}),
    ...(p.rotate ? { rotate: p.rotate } : {}),
    ...(p.profile !== "text" ? { profile: p.profile } : {}),
    ...(p.brightness ? { brightness: p.brightness } : {}),
    ...(p.contrast ? { contrast: p.contrast } : {}),
    ...(p.threshold ? { threshold: p.threshold } : {}),
    ...(p.cleanup !== 50 ? { cleanup: p.cleanup } : {}),
  }));
  const pdf: Partial<PdfSettings> = {};
  if (scan.pdf.size !== DEFAULT_PDF.size) pdf.size = scan.pdf.size;
  if (scan.pdf.margin !== DEFAULT_PDF.margin) pdf.margin = scan.pdf.margin;
  if (scan.pdf.quality !== DEFAULT_PDF.quality) pdf.quality = scan.pdf.quality;
  const title = scan.title?.trim();
  return JSON.stringify({
    ...(title ? { title } : {}),
    pages,
    ...(Object.keys(pdf).length ? { pdf } : {}),
  });
}

/** The scans in a note's stored content, in order. */
export function scansIn(content: string | null | undefined): ScanDocument[] {
  if (!content) return [];
  let ops: unknown;
  try {
    ops = (JSON.parse(content) as { ops?: unknown })?.ops;
  } catch {
    return [];
  }
  if (!Array.isArray(ops)) return [];
  const found: ScanDocument[] = [];
  for (const op of ops) {
    const insert = (op as { insert?: unknown })?.insert;
    if (!insert || typeof insert !== "object") continue;
    const scan = parseScan((insert as Record<string, unknown>)[SCAN_EMBED]);
    if (scan?.pages.length) found.push(scan);
  }
  return found;
}

/** The photos every scan in a note's stored content uses. */
export function scanAttachmentIds(content: string | null | undefined) {
  const ids = new Set<string>();
  for (const scan of scansIn(content))
    for (const page of scan.pages) ids.add(page.id);
  return ids;
}

export function scanTitle(scan: ScanDocument) {
  return scan.title || translate("noteHooks.scans")("scan");
}

export function pagesLabel(count: number) {
  return translate("noteHooks.scans")("pages", { count });
}

export const PROFILE_LABELS: Record<ScanProfile, string> = {
  get bw() {
    return translate("noteHooks.scans")("profiles.bw");
  },
  get whiteboard() {
    return translate("noteHooks.scans")("profiles.whiteboard");
  },
  get text() {
    return translate("noteHooks.scans")("profiles.text");
  },
  get color() {
    return translate("noteHooks.scans")("profiles.color");
  },
};

// ─── Pixels ────────────────────────────────────────────────────────────────

/** RGBA pixels, as an ImageData has them. */
export interface Pixels {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export function makePixels(width: number, height: number): Pixels {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

export const WHOLE: Corners = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

type Pt = { x: number; y: number };
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** The size a page with `corners` (in pixels) comes out at. */
export function straightenedSize(corners: Pt[], maxSide: number) {
  const [tl, tr, br, bl] = corners;
  let w = Math.max(dist(tr, tl), dist(br, bl));
  let h = Math.max(dist(bl, tl), dist(br, tr));
  const scale = Math.min(1, maxSide / Math.max(w, h));
  w *= scale;
  h *= scale;
  return {
    width: Math.max(1, Math.round(w)),
    height: Math.max(1, Math.round(h)),
  };
}

/**
 * The perspective that takes the unit square onto four corners (top left,
 * top right, bottom right, bottom left), after Heckbert's "Fundamentals of
 * Texture Mapping and Image Warping".
 */
export function squareToQuad(q: Pt[]) {
  const [p0, p1, p2, p3] = q;
  const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy3 = p0.y - p1.y + p2.y - p3.y;
  let a: number;
  let b: number;
  let d: number;
  let e: number;
  let g: number;
  let h: number;
  const c = p0.x;
  const f = p0.y;
  if (Math.abs(dx3) < 1e-9 && Math.abs(dy3) < 1e-9) {
    a = p1.x - p0.x;
    b = p3.x - p0.x;
    d = p1.y - p0.y;
    e = p3.y - p0.y;
    g = 0;
    h = 0;
  } else {
    const dx1 = p1.x - p2.x;
    const dx2 = p3.x - p2.x;
    const dy1 = p1.y - p2.y;
    const dy2 = p3.y - p2.y;
    const den = dx1 * dy2 - dx2 * dy1;
    g = (dx3 * dy2 - dx2 * dy3) / den;
    h = (dx1 * dy3 - dx3 * dy1) / den;
    a = p1.x - p0.x + g * p1.x;
    b = p3.x - p0.x + h * p3.x;
    d = p1.y - p0.y + g * p1.y;
    e = p3.y - p0.y + h * p3.y;
  }
  return (u: number, v: number): [number, number] => {
    const w = g * u + h * v + 1;
    return [(a * u + b * v + c) / w, (d * u + e * v + f) / w];
  };
}

/** The page whose corners (as shares) are given, stretched flat. */
export function straighten(
  src: Pixels,
  corners: Corners = WHOLE,
  maxSide = 1200,
): Pixels {
  const sw = src.width;
  const sh = src.height;
  const points = corners.map(([x, y]) => ({
    x: clamp(x, 0, 1) * sw,
    y: clamp(y, 0, 1) * sh,
  }));
  const { width, height } = straightenedSize(points, maxSide);
  const map = squareToQuad(points);
  const out = makePixels(width, height);
  const s = src.data;
  const o = out.data;
  const maxX = sw - 1;
  const maxY = sh - 1;
  let i = 0;
  for (let y = 0; y < height; y++) {
    const v = (y + 0.5) / height;
    for (let x = 0; x < width; x++) {
      const [px, py] = map((x + 0.5) / width, v);
      const fx = clamp(px - 0.5, 0, maxX);
      const fy = clamp(py - 0.5, 0, maxY);
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const x1 = Math.min(x0 + 1, maxX);
      const y1 = Math.min(y0 + 1, maxY);
      const ax = fx - x0;
      const ay = fy - y0;
      const i00 = (y0 * sw + x0) * 4;
      const i10 = (y0 * sw + x1) * 4;
      const i01 = (y1 * sw + x0) * 4;
      const i11 = (y1 * sw + x1) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const top = s[i00 + ch] + (s[i10 + ch] - s[i00 + ch]) * ax;
        const bottom = s[i01 + ch] + (s[i11 + ch] - s[i01 + ch]) * ax;
        o[i + ch] = Math.round(top + (bottom - top) * ay);
      }
      o[i + 3] = 255;
      i += 4;
    }
  }
  return out;
}

/** Turned clockwise by `degrees` (0, 90, 180 or 270). */
export function rotate(src: Pixels, degrees: number): Pixels {
  const turn = ((degrees % 360) + 360) % 360;
  if (!turn) return src;
  const { width: w, height: h, data: s } = src;
  const sideways = turn === 90 || turn === 270;
  const out = makePixels(sideways ? h : w, sideways ? w : h);
  const ow = out.width;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let nx: number;
      let ny: number;
      if (turn === 90) {
        nx = h - 1 - y;
        ny = x;
      } else if (turn === 180) {
        nx = w - 1 - x;
        ny = h - 1 - y;
      } else {
        nx = y;
        ny = w - 1 - x;
      }
      const from = (y * w + x) * 4;
      const to = (ny * ow + nx) * 4;
      out.data[to] = s[from];
      out.data[to + 1] = s[from + 1];
      out.data[to + 2] = s[from + 2];
      out.data[to + 3] = 255;
    }
  }
  return out;
}

/**
 * Lifts the paper's shading towards white by `strength` (0 to 1), in place:
 * each channel is divided by the brightest it is nearby (the brightest of
 * each cell, softened over two cells around, then spread between cell
 * centres). The same as evenOutPaper in mobile's scan_render.dart.
 */
export function evenOutPaper(px: Pixels, strength: number) {
  if (strength <= 0) return;
  const { width: w, height: h, data: b } = px;
  const cell = Math.max(8, Math.round(Math.min(w, h) / 40));
  const gw = Math.ceil(w / cell);
  const gh = Math.ceil(h / cell);
  const grid = new Float64Array(gw * gh * 3);
  for (let y = 0; y < h; y++) {
    const gy = Math.floor(y / cell);
    for (let x = 0; x < w; x++) {
      const g = (gy * gw + Math.floor(x / cell)) * 3;
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++)
        if (b[i + c] > grid[g + c]) grid[g + c] = b[i + c];
    }
  }
  const soft = new Float64Array(grid.length);
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let n = 0;
        for (let yy = Math.max(0, gy - 2); yy <= Math.min(gh - 1, gy + 2); yy++)
          for (
            let xx = Math.max(0, gx - 2);
            xx <= Math.min(gw - 1, gx + 2);
            xx++
          ) {
            sum += grid[(yy * gw + xx) * 3 + c];
            n++;
          }
        soft[(gy * gw + gx) * 3 + c] = sum / n;
      }
    }
  }
  for (let y = 0; y < h; y++) {
    const fy = clamp((y + 0.5) / cell - 0.5, 0, gh - 1);
    const y0 = Math.floor(fy);
    const y1 = Math.min(y0 + 1, gh - 1);
    const ay = fy - y0;
    for (let x = 0; x < w; x++) {
      const fx = clamp((x + 0.5) / cell - 0.5, 0, gw - 1);
      const x0 = Math.floor(fx);
      const x1 = Math.min(x0 + 1, gw - 1);
      const ax = fx - x0;
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const top =
          soft[(y0 * gw + x0) * 3 + c] * (1 - ax) +
          soft[(y0 * gw + x1) * 3 + c] * ax;
        const bottom =
          soft[(y1 * gw + x0) * 3 + c] * (1 - ax) +
          soft[(y1 * gw + x1) * 3 + c] * ax;
        const paper = top * (1 - ay) + bottom * ay;
        const v = b[i + c];
        const even = Math.min(255, (255 * v) / Math.max(paper, 1));
        b[i + c] = clamp(Math.round(v + (even - v) * strength), 0, 255);
      }
    }
  }
}

const luma = (b: Uint8ClampedArray, i: number) =>
  (b[i] * 77 + b[i + 1] * 150 + b[i + 2] * 29) >> 8;

function saturate(b: Uint8ClampedArray, amount: number) {
  for (let i = 0; i < b.length; i += 4) {
    const l = luma(b, i);
    for (let c = 0; c < 3; c++)
      b[i + c] = clamp(Math.round(l + (b[i + c] - l) * amount), 0, 255);
  }
}

/** Contrast `k` around the middle grey, then brightness (-100 to 100). */
function tone(b: Uint8ClampedArray, k: number, brightness: number) {
  const lift = brightness * 1.28;
  const table = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++)
    table[v] = clamp(Math.round((v - 128) * k + 128 + lift), 0, 255);
  for (let i = 0; i < b.length; i += 4) {
    b[i] = table[b[i]];
    b[i + 1] = table[b[i + 1]];
    b[i + 2] = table[b[i + 2]];
  }
}

/**
 * The page's colours as its profile and adjustments make them, as a new
 * picture. The same steps as applyScanLook in mobile's scan_render.dart.
 */
export function applyProfile(src: Pixels, page: ScanPage): Pixels {
  const out: Pixels = {
    width: src.width,
    height: src.height,
    data: new Uint8ClampedArray(src.data),
  };
  const b = out.data;
  if (page.profile !== "color") evenOutPaper(out, page.cleanup / 100);
  switch (page.profile) {
    case "bw": {
      const k = 1 + (page.contrast + 25) / 100;
      const cut = 150 + page.threshold;
      for (let i = 0; i < b.length; i += 4) {
        const l = (luma(b, i) - 128) * k + 128 + page.brightness * 1.28;
        const v = l < cut ? 0 : 255;
        b[i] = v;
        b[i + 1] = v;
        b[i + 2] = v;
      }
      break;
    }
    case "whiteboard":
      saturate(b, 1.6);
      tone(b, 1 + (page.contrast + 35) / 100, page.brightness);
      break;
    case "text":
      tone(b, 1 + (page.contrast + 25) / 100, page.brightness);
      break;
    case "color":
      tone(b, 1 + page.contrast / 100, page.brightness);
      break;
  }
  return out;
}

/** The finished page from its original photo's pixels. */
export function renderPage(
  photo: Pixels,
  page: ScanPage,
  maxSide: number,
): Pixels {
  const flat = straighten(photo, page.corners ?? WHOLE, maxSide);
  return applyProfile(rotate(flat, page.rotate), page);
}

// ─── Finding the page ──────────────────────────────────────────────────────

/**
 * Finds a sheet of paper in a small picture: the biggest patch that's
 * lighter (or darker) than the rest and close to a four-sided shape. Its
 * corners as shares, or null. The same as page_scan.dart on the phone.
 */
export function findPageCorners(src: Pixels): Corners | null {
  const { width, height } = src;
  if (width < 8 || height < 8) return null;
  const gray = blurred(luminance(src), width, height);
  const threshold = otsu(gray);
  let best: Corners | null = null;
  let bestScore = 0;
  for (const light of [true, false]) {
    const found = quadOfLargestPatch(gray, width, height, threshold, light);
    if (found && found.score > bestScore) {
      best = found.corners;
      bestScore = found.score;
    }
  }
  return best;
}

function luminance(src: Pixels) {
  const out = new Uint8Array(src.width * src.height);
  const d = src.data;
  for (let i = 0, j = 0; i < out.length; i++, j += 4) {
    out[i] = (d[j] * 77 + d[j + 1] * 150 + d[j + 2] * 29) >> 8;
  }
  return out;
}

function blurred(gray: Uint8Array, width: number, height: number) {
  let a = gray;
  for (let pass = 0; pass < 2; pass++) {
    const tmp = new Uint8Array(a.length);
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let n = 0;
        for (let k = Math.max(0, x - 2); k <= Math.min(width - 1, x + 2); k++) {
          sum += a[row + k];
          n++;
        }
        tmp[row + x] = Math.trunc(sum / n);
      }
    }
    const out = new Uint8Array(a.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let n = 0;
        for (
          let k = Math.max(0, y - 2);
          k <= Math.min(height - 1, y + 2);
          k++
        ) {
          sum += tmp[k * width + x];
          n++;
        }
        out[y * width + x] = Math.trunc(sum / n);
      }
    }
    a = out;
  }
  return a;
}

function otsu(gray: Uint8Array) {
  const histogram = new Array<number>(256).fill(0);
  for (const v of gray) histogram[v]++;
  const total = gray.length;
  let sumAll = 0;
  for (let i = 0; i < 256; i++) sumAll += i * histogram[i];
  let sumBelow = 0;
  let countBelow = 0;
  let best = 0;
  let threshold = 128;
  for (let t = 0; t < 256; t++) {
    countBelow += histogram[t];
    if (countBelow === 0) continue;
    const countAbove = total - countBelow;
    if (countAbove === 0) break;
    sumBelow += t * histogram[t];
    const meanBelow = sumBelow / countBelow;
    const meanAbove = (sumAll - sumBelow) / countAbove;
    const between =
      countBelow *
      countAbove *
      (meanBelow - meanAbove) *
      (meanBelow - meanAbove);
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

function quadOfLargestPatch(
  gray: Uint8Array,
  width: number,
  height: number,
  threshold: number,
  light: boolean,
): { corners: Corners; score: number } | null {
  const n = width * height;
  const label = new Int32Array(n);
  const queue = new Int32Array(n);
  let bestLabel = 0;
  let bestSize = 0;
  let next = 0;
  const side = (i: number) => gray[i] > threshold === light;
  for (let start = 0; start < n; start++) {
    if (label[start] !== 0 || !side(start)) continue;
    next++;
    label[start] = next;
    let head = 0;
    let tail = 0;
    let size = 0;
    queue[tail++] = start;
    while (head < tail) {
      const i = queue[head++];
      size++;
      const x = i % width;
      const visit = (j: number) => {
        if (label[j] === 0 && side(j)) {
          label[j] = next;
          queue[tail++] = j;
        }
      };
      if (x > 0) visit(i - 1);
      if (x < width - 1) visit(i + 1);
      if (i >= width) visit(i - width);
      if (i < n - width) visit(i + width);
    }
    if (size > bestSize) {
      bestSize = size;
      bestLabel = next;
    }
  }
  if (bestSize < n * 0.12) return null;
  const edge: Pt[] = [];
  for (let y = 0; y < height; y++) {
    let left = -1;
    let right = -1;
    for (let x = 0; x < width; x++) {
      if (label[y * width + x] === bestLabel) {
        if (left < 0) left = x;
        right = x;
      }
    }
    if (left >= 0) {
      edge.push({ x: left, y }, { x: right + 1, y });
      edge.push({ x: left, y: y + 1 }, { x: right + 1, y: y + 1 });
    }
  }
  const hull = convexHull(edge);
  if (hull.length < 4) return null;
  const quad = largestQuad(hull);
  const quadArea = polygonArea(quad);
  const hullArea = polygonArea(hull);
  if (quadArea < n * 0.12) return null;
  const fit = quadArea / hullArea;
  const solidity = bestSize / hullArea;
  if (fit < 0.9 || solidity < 0.8) return null;
  return {
    corners: orderCorners(
      quad.map((p) => [p.x / width, p.y / height] as Corner),
    ),
    score: (quadArea / n) * fit * solidity,
  };
}

function convexHull(points: Pt[]) {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Pt, a: Pt, b: Pt) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    )
      lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    )
      upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

const triangle = (a: Pt, b: Pt, c: Pt) =>
  Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2;

function polygonArea(polygon: Pt[]) {
  let sum = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

function largestQuad(hull: Pt[]) {
  const n = hull.length;
  const at = (i: number) => hull[i % n];
  let best = 0;
  let quad = [hull[0], hull[1], hull[2], hull[3]];
  for (let i = 0; i < n; i++) {
    let j = i + 1;
    let l = i + 3;
    for (let k = i + 2; k < i + n - 1; k++) {
      if (j >= k) j = k - 1;
      while (
        j + 1 < k &&
        triangle(at(i), at(j + 1), at(k)) >= triangle(at(i), at(j), at(k))
      )
        j++;
      if (l <= k) l = k + 1;
      while (
        l + 1 < i + n &&
        triangle(at(k), at(l + 1), at(i)) >= triangle(at(k), at(l), at(i))
      )
        l++;
      const area =
        triangle(at(i), at(j), at(k)) + triangle(at(k), at(l), at(i));
      if (area > best) {
        best = area;
        quad = [at(i), at(j), at(k), at(l)];
      }
    }
  }
  return quad;
}

/** Corners in the order top left, top right, bottom right, bottom left. */
export function orderCorners(corners: Corner[]): Corners {
  const cx = corners.reduce((s, p) => s + p[0], 0) / corners.length;
  const cy = corners.reduce((s, p) => s + p[1], 0) / corners.length;
  const around = [...corners].sort(
    (a, b) =>
      Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx),
  );
  let first = 0;
  for (let i = 1; i < 4; i++) {
    if (around[i][0] + around[i][1] < around[first][0] + around[first][1])
      first = i;
  }
  return [0, 1, 2, 3].map((i) => around[(first + i) % 4]) as Corners;
}

/** Whether corners (in order) make a four-sided shape that doesn't fold. */
export function isPageShape(corners: Corners) {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    const c = corners[(i + 2) % 4];
    const turn = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(turn) < 1e-4) return false;
    const s = Math.sign(turn);
    if (!sign) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

// ─── PDF ───────────────────────────────────────────────────────────────────

/** The longest side a page is rendered at for the PDF. */
export const PDF_MAX_SIDE: Record<PdfQuality, number> = {
  small: 1240,
  standard: 1754,
  high: 2480,
};
export const PDF_JPEG_QUALITY: Record<PdfQuality, number> = {
  small: 0.6,
  standard: 0.8,
  high: 0.92,
};
const FIT_DPI: Record<PdfQuality, number> = {
  small: 110,
  standard: 150,
  high: 220,
};
const SIZES = { a4: [595.28, 841.89], letter: [612, 792] } as const;

/** Where an image of `width` × `height` pixels goes on its PDF page, in pt. */
export function pdfPageLayout(
  width: number,
  height: number,
  settings: PdfSettings,
) {
  const margin = (settings.margin * 72) / 25.4;
  if (settings.size === "fit") {
    const dpi = FIT_DPI[settings.quality];
    const w = (width * 72) / dpi;
    const h = (height * 72) / dpi;
    return {
      pageWidth: w + margin * 2,
      pageHeight: h + margin * 2,
      x: margin,
      y: margin,
      width: w,
      height: h,
    };
  }
  const [short, long] = SIZES[settings.size];
  const landscape = width > height;
  const pageWidth = landscape ? long : short;
  const pageHeight = landscape ? short : long;
  const room = { w: pageWidth - margin * 2, h: pageHeight - margin * 2 };
  const scale = Math.min(room.w / width, room.h / height);
  const w = width * scale;
  const h = height * scale;
  return {
    pageWidth,
    pageHeight,
    x: (pageWidth - w) / 2,
    y: (pageHeight - h) / 2,
    width: w,
    height: h,
  };
}

export interface PdfImage {
  jpeg: Uint8Array;
  width: number;
  height: number;
}

const fmt = (v: number) => Number(v.toFixed(2)).toString();

/** `text` as a PDF string: plain when it's ASCII, UTF-16 otherwise, as on Android. */
export function pdfText(text: string): string {
  if (/^[\x20-\x7e]*$/.test(text)) {
    return `(${text.replace(/([\\()])/g, "\\$1")})`;
  }
  let hex = "<FEFF";
  for (let i = 0; i < text.length; i++) {
    hex += text.charCodeAt(i).toString(16).padStart(4, "0").toUpperCase();
  }
  return `${hex}>`;
}

/** A PDF with one JPEG per page, laid out by `settings`. */
export function buildPdf(
  images: PdfImage[],
  settings: PdfSettings,
  title?: string,
): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (part: string | Uint8Array) => {
    const bytes = typeof part === "string" ? encoder.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (id: number, body: () => void) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
    body();
    push("\nendobj\n");
  };
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  // 1: catalog, 2: pages, 3: info; then three per page.
  const pageIds = images.map((_, i) => 4 + i * 3);
  object(1, () => push("<< /Type /Catalog /Pages 2 0 R >>"));
  object(2, () =>
    push(
      `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${images.length} >>`,
    ),
  );
  object(3, () =>
    push(
      `<< /Title ${pdfText(title ?? translate("noteHooks.scans")("scan"))} /Producer (Anchor+) >>`,
    ),
  );
  images.forEach((image, i) => {
    const id = pageIds[i];
    const l = pdfPageLayout(image.width, image.height, settings);
    const content = `q ${fmt(l.width)} 0 0 ${fmt(l.height)} ${fmt(l.x)} ${fmt(l.y)} cm /Im0 Do Q`;
    object(id, () =>
      push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmt(l.pageWidth)} ${fmt(l.pageHeight)}] /Resources << /XObject << /Im0 ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R >>`,
      ),
    );
    object(id + 1, () =>
      push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`),
    );
    object(id + 2, () => {
      push(
        `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.jpeg.length} >>\nstream\n`,
      );
      push(image.jpeg);
      push("\nendstream");
    });
  });
  const count = 4 + images.length * 3;
  const xref = length;
  let table = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let id = 1; id < count; id++) {
    table += `${String(offsets[id] ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  push(table);
  push(
    `trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`,
  );
  const out = new Uint8Array(length);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

/** A file name for the PDF, from the title. */
export function pdfFileName(scan: ScanDocument) {
  const base = scanTitle(scan)
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${base || translate("noteHooks.scans")("scan")}.pdf`;
}

/**
 * Whether a note's text still shows attachment `id`: as a picture in the
 * text or as the photo of a scan page.
 */
export function attachmentShownIn(
  ops: readonly { insert?: unknown }[],
  id: string,
): boolean {
  for (const op of ops) {
    const insert = op.insert;
    if (!insert || typeof insert !== "object") continue;
    const embed = insert as Record<string, unknown>;
    const scan = parseScan(embed[SCAN_EMBED]);
    if (scan?.pages.some((p) => p.id === id)) return true;
    const image = embed["note-image"];
    if (typeof image === "string") {
      try {
        if ((JSON.parse(image) as { id?: unknown })?.id === id) return true;
      } catch {
        // Not a picture we know.
      }
    }
  }
  return false;
}

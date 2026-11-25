/**
 * Writes a debug report as one MP4 (ISO-BMFF) file, the same format the
 * Android app's `mp4_muxer.dart` writes (`anchor-debug/1`):
 *
 * - video: H.264 (`avc1`, which every browser plays) when the browser could
 *   encode it, else the frames as Motion-JPEG (`jpeg`);
 * - timed metadata (`meta` handler, `mett` entry of application/json): what
 *   happened, each sample a JSON array lasting until the next;
 * - the summary document in `moov/udta/meta` as a QuickTime `mdta` item under
 *   {@link DEBUG_SUMMARY_KEY}, which `ffprobe` shows as a format tag.
 *
 * Layout is `ftyp`, `moov`, `mdat`: the index first, so a player can start
 * before it has the whole file. All times are in milliseconds.
 */

export const DEBUG_SUMMARY_KEY = "com.anchor.debug";
const EVENTS_MIME = "application/json";

/** One picture, shown from `tMs` on. */
export interface VideoSample {
  tMs: number;
  data: Uint8Array;
  /** Decodable on its own. Every JPEG is. */
  key: boolean;
}

export interface H264Track {
  kind: "h264";
  width: number;
  height: number;
  /** The encoder's AVCDecoderConfigurationRecord (`avcC` payload). */
  avcC: Uint8Array;
  samples: VideoSample[];
}

export interface JpegTrack {
  kind: "jpeg";
  width: number;
  height: number;
  samples: VideoSample[];
}

export type VideoTrack = H264Track | JpegTrack;

/** One sample of the metadata track: the JSON of what happened at `tMs`. */
export interface MetaSample {
  tMs: number;
  json: string;
}

const enc = new TextEncoder();

type Part = Uint8Array | number[];

export function muxDebugMp4({
  video,
  durationMs,
  events = [],
  summary,
}: {
  video: VideoTrack;
  durationMs: number;
  events?: MetaSample[];
  summary?: string;
}): Uint8Array {
  if (!video.samples.length) throw new Error("A recording needs a frame");
  const duration = Math.max(1, Math.round(durationMs));
  const meta = fillMetaTimeline(events);
  const isH264 = video.kind === "h264";

  const ftyp = box("ftyp", [
    fourcc("isom"),
    u32(0x200),
    fourcc("isom"),
    fourcc("iso2"),
    ...(isH264 ? [fourcc("avc1")] : []),
    fourcc("mp41"),
  ]);

  const videoPayloads = video.samples.map((s) => s.data);
  const videoDurations = durations(
    video.samples.map((s) => s.tMs),
    duration,
  );
  const sampleEntry = isH264
    ? avc1Entry(video)
    : jpegEntry(video.width, video.height);
  // Without an stss every sample counts as a key frame.
  const syncSamples =
    isH264 && video.samples.some((s) => !s.key)
      ? video.samples.flatMap((s, i) => (s.key ? [i + 1] : []))
      : undefined;

  const metaPayloads = meta.map((s) => enc.encode(s.json));
  const metaDurations = durations(
    meta.map((s) => s.tMs),
    duration,
  );
  const videoBytes = sum(videoPayloads.map((p) => p.length));
  const mdatPayload = videoBytes + sum(metaPayloads.map((p) => p.length));

  // The offsets don't change the index's size: build it once to measure it,
  // then again with the samples where they end up.
  const moov = (videoOffset: number) =>
    box("moov", [
      mvhd(duration, 3),
      trak({
        trackId: 1,
        duration,
        width: video.width,
        height: video.height,
        handler: "vide",
        handlerName: "Anchor screen",
        mediaHeader: fullBox("vmhd", 0, 1, [u16(0), u16(0), u16(0), u16(0)]),
        sampleEntry,
        durations: videoDurations,
        sizes: videoPayloads.map((p) => p.length),
        chunkOffset: videoOffset,
        syncSamples,
      }),
      ...(meta.length
        ? [
            trak({
              trackId: 2,
              duration,
              width: 0,
              height: 0,
              handler: "meta",
              handlerName: "Anchor state",
              mediaHeader: fullBox("nmhd", 0, 0, []),
              sampleEntry: mettEntry(),
              durations: metaDurations,
              sizes: metaPayloads.map((p) => p.length),
              chunkOffset: videoOffset + videoBytes,
              // The events describe the video track.
              reference: box("tref", [box("cdsc", [u32(1)])]),
            }),
          ]
        : []),
      ...(summary != null ? [udta(summary)] : []),
    ]);

  const index = moov(ftyp.length + moov(0).length + 8);
  return concat([
    ftyp,
    index,
    u32(mdatPayload + 8),
    fourcc("mdat"),
    ...videoPayloads,
    ...metaPayloads,
  ]);
}

/**
 * Events at the same millisecond share a sample (a JSON array), and an empty
 * array covers the time before the first one: a metadata track has no gaps.
 */
function fillMetaTimeline(events: MetaSample[]): MetaSample[] {
  if (!events.length) return [];
  const sorted = [...events]
    .map((e) => ({ ...e, tMs: Math.max(0, Math.round(e.tMs)) }))
    .sort((a, b) => a.tMs - b.tMs);
  const out: MetaSample[] = [];
  if (sorted[0].tMs > 0) out.push({ tMs: 0, json: "[]" });
  let i = 0;
  while (i < sorted.length) {
    const t = sorted[i].tMs;
    const group: string[] = [];
    while (i < sorted.length && sorted[i].tMs === t)
      group.push(sorted[i++].json);
    out.push({ tMs: t, json: `[${group.join(",")}]` });
  }
  return out;
}

/** Until the next sample starts, the last until `total`; the first from 0. */
function durations(starts: number[], total: number): number[] {
  return starts.map((s, i) => {
    const start = i === 0 ? 0 : Math.round(s);
    const end = i + 1 < starts.length ? Math.round(starts[i + 1]) : total;
    return Math.max(1, end - start);
  });
}

function trak(o: {
  trackId: number;
  duration: number;
  width: number;
  height: number;
  handler: string;
  handlerName: string;
  mediaHeader: Uint8Array;
  sampleEntry: Uint8Array;
  durations: number[];
  sizes: number[];
  chunkOffset: number;
  reference?: Uint8Array;
  syncSamples?: number[];
}): Uint8Array {
  const mediaDuration = sum(o.durations);
  return box("trak", [
    tkhd(o.trackId, o.duration, o.width, o.height, o.handler === "vide"),
    ...(o.reference ? [o.reference] : []),
    box("mdia", [
      fullBox("mdhd", 0, 0, [
        u32(0),
        u32(0),
        u32(1000),
        u32(mediaDuration),
        u16(0x55c4), // "und"
        u16(0),
      ]),
      fullBox("hdlr", 0, 0, [
        u32(0),
        fourcc(o.handler),
        u32(0),
        u32(0),
        u32(0),
        cString(o.handlerName),
      ]),
      box("minf", [
        o.mediaHeader,
        box("dinf", [
          fullBox("dref", 0, 0, [u32(1), fullBox("url ", 0, 1, [])]),
        ]),
        box("stbl", [
          fullBox("stsd", 0, 0, [u32(1), o.sampleEntry]),
          stts(o.durations),
          ...(o.syncSamples
            ? [
                fullBox("stss", 0, 0, [
                  u32(o.syncSamples.length),
                  ...o.syncSamples.map(u32),
                ]),
              ]
            : []),
          fullBox("stsc", 0, 0, [u32(1), u32(1), u32(o.sizes.length), u32(1)]),
          fullBox("stsz", 0, 0, [
            u32(0),
            u32(o.sizes.length),
            ...o.sizes.map(u32),
          ]),
          fullBox("stco", 0, 0, [u32(1), u32(o.chunkOffset)]),
        ]),
      ]),
    ]),
  ]);
}

function stts(ds: number[]): Uint8Array {
  const runs: [number, number][] = [];
  for (const d of ds) {
    const last = runs[runs.length - 1];
    if (last && last[1] === d) last[0]++;
    else runs.push([1, d]);
  }
  return fullBox("stts", 0, 0, [
    u32(runs.length),
    ...runs.flatMap(([n, d]) => [u32(n), u32(d)]),
  ]);
}

const mvhd = (duration: number, nextTrackId: number) =>
  fullBox("mvhd", 0, 0, [
    u32(0),
    u32(0),
    u32(1000),
    u32(duration),
    u32(0x00010000), // rate 1.0
    u16(0x0100), // volume 1.0
    new Uint8Array(10),
    matrix(),
    new Uint8Array(24),
    u32(nextTrackId),
  ]);

const tkhd = (
  trackId: number,
  duration: number,
  width: number,
  height: number,
  isVideo: boolean,
) =>
  fullBox("tkhd", 0, isVideo ? 3 : 1, [
    u32(0),
    u32(0),
    u32(trackId),
    u32(0),
    u32(duration),
    new Uint8Array(8),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    matrix(),
    u32(width * 65536),
    u32(height * 65536),
  ]);

function visualEntry(
  type: string,
  width: number,
  height: number,
  compressor: string,
  extra: Uint8Array[] = [],
) {
  return box(type, [
    new Uint8Array(6),
    u16(1), // data reference index
    new Uint8Array(16),
    u16(width),
    u16(height),
    u32(0x00480000), // 72 dpi
    u32(0x00480000),
    u32(0),
    u16(1), // frames per sample
    pascal32(compressor),
    u16(0x18), // depth
    u16(0xffff), // no colour table
    ...extra,
  ]);
}

const jpegEntry = (width: number, height: number) =>
  visualEntry("jpeg", width, height, "Photo - JPEG");

const avc1Entry = (video: H264Track) =>
  visualEntry("avc1", video.width, video.height, "", [
    box("avcC", [video.avcC]),
  ]);

const mettEntry = () =>
  box("mett", [new Uint8Array(6), u16(1), cString(""), cString(EVENTS_MIME)]);

/** The way ffmpeg writes `-movflags use_metadata_tags`. */
const udta = (summary: string) =>
  box("udta", [
    fullBox("meta", 0, 0, [
      fullBox("hdlr", 0, 0, [
        u32(0),
        fourcc("mdta"),
        u32(0),
        u32(0),
        u32(0),
        new Uint8Array(1),
      ]),
      fullBox("keys", 0, 0, [
        u32(1),
        box("mdta", [enc.encode(DEBUG_SUMMARY_KEY)]),
      ]),
      box("ilst", [
        boxOfType(u32(1), [
          box("data", [u32(1), u32(0), enc.encode(summary)]), // 1 = UTF-8
        ]),
      ]),
    ]),
  ]);

/** The summary {@link muxDebugMp4} stored, or null. */
export function readDebugSummary(mp4: Uint8Array): string | null {
  const moov = findBox(mp4, ["moov"]);
  if (!moov) return null;
  const meta = findBox(mp4, ["udta", "meta"], moov[0], moov[1]);
  if (!meta) return null;
  // `meta` is a full box: skip its version and flags.
  const data = findBox(mp4, ["ilst", "", "data"], meta[0] + 4, meta[1]);
  if (!data) return null;
  return new TextDecoder().decode(mp4.subarray(data[0] + 8, data[1]));
}

/** The payload range of the box at `path`; "" matches any box. */
export function findBox(
  bytes: Uint8Array,
  path: string[],
  start = 0,
  end = bytes.length,
): [number, number] | null {
  let from = start;
  let to = end;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (const name of path) {
    let found: [number, number] | null = null;
    for (let pos = from; pos + 8 <= to; ) {
      const size = view.getUint32(pos);
      const type = String.fromCharCode(...bytes.subarray(pos + 4, pos + 8));
      if (size < 8 || pos + size > to) break;
      if (!name || type === name) {
        found = [pos + 8, pos + size];
        break;
      }
      pos += size;
    }
    if (!found) return null;
    [from, to] = found;
  }
  return [from, to];
}

function matrix() {
  const m = new DataView(new ArrayBuffer(36));
  m.setUint32(0, 0x00010000);
  m.setUint32(16, 0x00010000);
  m.setUint32(32, 0x40000000);
  return new Uint8Array(m.buffer);
}

const box = (type: string, parts: Part[]) => boxOfType(fourcc(type), parts);

function boxOfType(type: Uint8Array, parts: Part[]): Uint8Array {
  const size = 8 + sum(parts.map((p) => p.length));
  return concat([u32(size), type, ...parts]);
}

const fullBox = (type: string, version: number, flags: number, parts: Part[]) =>
  box(type, [u32(((version << 24) | flags) >>> 0), ...parts]);

function u32(v: number) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, v >>> 0);
  return b;
}

function u16(v: number) {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, v);
  return b;
}

const fourcc = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));

const cString = (s: string) => concat([enc.encode(s), [0]]);

function pascal32(s: string) {
  const out = new Uint8Array(32);
  const bytes = enc.encode(s);
  out[0] = bytes.length;
  out.set(bytes, 1);
  return out;
}

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

function concat(parts: Part[]): Uint8Array {
  const out = new Uint8Array(sum(parts.map((p) => p.length)));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

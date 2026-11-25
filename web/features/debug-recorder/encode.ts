import type { VideoSample, VideoTrack } from "./mp4";

/** H.264 profiles to try, simplest first: Baseline, Main, High; level 4.2. */
const AVC_CODECS = ["avc1.42002a", "avc1.4d002a", "avc1.64002a"];
const KEY_EVERY_MS = 2000;

/**
 * Turns the recorder's canvas into video as it goes: H.264 through WebCodecs
 * where the browser has it (every browser plays that), else one JPEG per
 * frame, as Android does when its phone can't encode.
 */
export interface FrameEncoder {
  add(canvas: HTMLCanvasElement, tMs: number): void;
  finish(): Promise<VideoTrack>;
  close(): void;
}

export async function createFrameEncoder(
  width: number,
  height: number,
): Promise<FrameEncoder> {
  const h264 = await createH264Encoder(width, height).catch(() => null);
  return h264 ?? createJpegEncoder(width, height);
}

async function createH264Encoder(
  width: number,
  height: number,
): Promise<FrameEncoder | null> {
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined")
    return null;
  let config: VideoEncoderConfig | null = null;
  for (const codec of AVC_CODECS) {
    const candidate: VideoEncoderConfig = {
      codec,
      width,
      height,
      bitrate: 1_500_000,
      framerate: 25,
      latencyMode: "quality",
      avc: { format: "avc" },
    };
    const support = await VideoEncoder.isConfigSupported(candidate);
    if (support.supported) {
      config = candidate;
      break;
    }
  }
  if (!config) return null;

  const samples: VideoSample[] = [];
  let avcC: Uint8Array | null = null;
  let failure: unknown = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      const desc = meta?.decoderConfig?.description;
      if (desc && !avcC) avcC = toBytes(desc);
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      samples.push({
        tMs: chunk.timestamp / 1000,
        data,
        key: chunk.type === "key",
      });
    },
    error: (e) => {
      failure = e;
    },
  });
  encoder.configure(config);
  let lastKey = -Infinity;

  return {
    add(canvas, tMs) {
      if (failure || encoder.state !== "configured") return;
      // Don't pile up frames the encoder can't keep up with.
      if (encoder.encodeQueueSize > 4) return;
      const frame = new VideoFrame(canvas, {
        timestamp: Math.round(tMs * 1000),
      });
      const key = tMs - lastKey >= KEY_EVERY_MS;
      if (key) lastKey = tMs;
      encoder.encode(frame, { keyFrame: key });
      frame.close();
    },
    async finish() {
      if (encoder.state === "configured") await encoder.flush();
      encoder.close();
      if (failure) throw failure;
      if (!avcC || !samples.length) throw new Error("Nothing was encoded");
      samples.sort((a, b) => a.tMs - b.tMs);
      return { kind: "h264", width, height, avcC, samples };
    },
    close() {
      if (encoder.state !== "closed") encoder.close();
    },
  };
}

function createJpegEncoder(width: number, height: number): FrameEncoder {
  const pending: Promise<VideoSample | null>[] = [];
  return {
    add(canvas, tMs) {
      if (pending.length > 1200) return;
      pending.push(
        new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.82),
        ).then(async (blob) =>
          blob
            ? { tMs, data: new Uint8Array(await blob.arrayBuffer()), key: true }
            : null,
        ),
      );
    },
    async finish() {
      const samples = (await Promise.all(pending)).filter(
        (s): s is VideoSample => s !== null,
      );
      if (!samples.length) throw new Error("Nothing was encoded");
      samples.sort((a, b) => a.tMs - b.tMs);
      return { kind: "jpeg", width, height, samples };
    },
    close() {},
  };
}

function toBytes(source: AllowSharedBufferSource): Uint8Array {
  if (source instanceof ArrayBuffer) return new Uint8Array(source.slice(0));
  const view = source as ArrayBufferView;
  return new Uint8Array(
    view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength),
  );
}

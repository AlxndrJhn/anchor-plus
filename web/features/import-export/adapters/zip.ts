import { inflate, inflateSync, strFromU8 } from "fflate";
import { translate } from "@/lib/i18n";
import { ImportFileError } from "./types";

/** Read-only archive access. Also backs files picked without a zip around them. */
export type ZipArchive = {
  names: string[];
  has(path: string): boolean;
  /** Notes and manifests (.json, .md, .markdown), read when the archive opens. */
  text(path: string): string;
  /** Any entry, read only when asked for. */
  blob(path: string): Blob | Promise<Blob>;
};

const TEXT_ENTRY = /\.(json|md|markdown)$/i;
/** A note or manifest larger than this is not one; it stays unread. */
const MAX_TEXT_ENTRY = 256 * 1024 * 1024;
/** Text entries read at the same time while the archive opens. */
const TEXT_READS_AT_ONCE = 16;

const EOCD_SIG = 0x06054b50;
const ZIP64_LOCATOR_SIG = 0x07064b50;
const ZIP64_EOCD_SIG = 0x06064b50;
const CENTRAL_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;
const EOCD_SIZE = 22;
const MAX_COMMENT = 0xffff;
const U32_MAX = 0xffffffff;
const U16_MAX = 0xffff;

type Entry = {
  method: number;
  encrypted: boolean;
  compressedSize: number;
  size: number;
  localOffset: number;
};

/** Not a ZIP this reader understands; the message can be shown as it is. */
export class ZipReadError extends ImportFileError {
  constructor(reason: "notZip" | "zipDamaged" | "zipPassword") {
    super(translate("settings.importExport.adapters")(reason));
  }
}

const utf8 = new TextDecoder();

async function bytesAt(source: Blob, start: number, end: number) {
  return new Uint8Array(await source.slice(start, end).arrayBuffer());
}

const view = (bytes: Uint8Array) =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

const u64 = (data: DataView, offset: number) =>
  Number(data.getBigUint64(offset, true));

/**
 * Reads a ZIP from a picked file without loading it: the central directory
 * at its end lists the entries, and each one is read from its place in the
 * file when needed. Exports of several GB (ZIP64 included) open on phones,
 * where reading the whole file into memory would crash the tab.
 */
export async function openZip(source: Blob): Promise<ZipArchive> {
  const entries = await readCentralDirectory(source);

  const dataStart = async (entry: Entry) => {
    const header = view(
      await bytesAt(source, entry.localOffset, entry.localOffset + 30),
    );
    if (header.byteLength < 30 || header.getUint32(0, true) !== LOCAL_SIG) {
      throw new ZipReadError("zipDamaged");
    }
    return (
      entry.localOffset +
      30 +
      header.getUint16(26, true) +
      header.getUint16(28, true)
    );
  };

  const raw = async (entry: Entry) => {
    if (entry.encrypted) {
      throw new ZipReadError("zipPassword");
    }
    const start = await dataStart(entry);
    return source.slice(start, start + entry.compressedSize);
  };

  const readText = async (path: string, entry: Entry) => {
    const data = new Uint8Array(await (await raw(entry)).arrayBuffer());
    return strFromU8(
      entry.method === 0 ? data : inflateEntry(path, entry, data),
    );
  };

  const texts = new Map<string, string>();
  const textPaths = [...entries]
    .filter(
      ([path, entry]) => TEXT_ENTRY.test(path) && entry.size <= MAX_TEXT_ENTRY,
    )
    .map(([path]) => path);
  for (let i = 0; i < textPaths.length; i += TEXT_READS_AT_ONCE) {
    await Promise.all(
      textPaths.slice(i, i + TEXT_READS_AT_ONCE).map(async (path) => {
        try {
          texts.set(path, await readText(path, entries.get(path) as Entry));
        } catch (error) {
          if (error instanceof ZipReadError) throw error;
          // One damaged entry leaves the rest readable; text() reports it.
        }
      }),
    );
  }

  return {
    names: [...entries.keys()],
    has: (path) => entries.has(path),
    text: (path) => {
      const text = texts.get(path);
      if (text === undefined)
        throw new Error(`Zip entry not readable: ${path}`);
      return text;
    },
    blob: async (path) => {
      const entry = entries.get(path);
      if (!entry) throw new Error(`Zip entry not found: ${path}`);
      const data = await raw(entry);
      // Stored entries are handed over as a slice of the file, never copied.
      if (entry.method === 0) return data;
      const inflated = await inflateAsync(
        new Uint8Array(await data.arrayBuffer()),
        entry.size,
      );
      return new Blob([inflated as Uint8Array<ArrayBuffer>]);
    },
  };
}

function inflateEntry(path: string, entry: Entry, data: Uint8Array) {
  if (entry.method !== 8) {
    throw new Error(`Unsupported compression in ${path}`);
  }
  return inflateSync(data, { out: new Uint8Array(entry.size) });
}

// Large pictures inflate off the main thread, so the page stays responsive.
function inflateAsync(data: Uint8Array, size: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) =>
    inflate(data, { size }, (error, out) =>
      error ? reject(error) : resolve(out),
    ),
  );
}

async function readCentralDirectory(source: Blob): Promise<Map<string, Entry>> {
  const tailStart = Math.max(0, source.size - EOCD_SIZE - MAX_COMMENT);
  const tail = await bytesAt(source, tailStart, source.size);
  const tailView = view(tail);

  let eocd = -1;
  for (let i = tail.length - EOCD_SIZE; i >= 0; i--) {
    if (tailView.getUint32(i, true) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ZipReadError("notZip");

  let count = tailView.getUint16(eocd + 10, true);
  let dirSize = tailView.getUint32(eocd + 12, true);
  let dirOffset = tailView.getUint32(eocd + 16, true);

  if (count === U16_MAX || dirSize === U32_MAX || dirOffset === U32_MAX) {
    const locatorAt = eocd - 20;
    if (
      locatorAt < 0 ||
      tailView.getUint32(locatorAt, true) !== ZIP64_LOCATOR_SIG
    ) {
      throw new ZipReadError("zipDamaged");
    }
    const zip64At = u64(tailView, locatorAt + 8);
    const zip64 = view(await bytesAt(source, zip64At, zip64At + 56));
    if (zip64.getUint32(0, true) !== ZIP64_EOCD_SIG) {
      throw new ZipReadError("zipDamaged");
    }
    count = u64(zip64, 32);
    dirSize = u64(zip64, 40);
    dirOffset = u64(zip64, 48);
  }

  const dir = await bytesAt(source, dirOffset, dirOffset + dirSize);
  const dirView = view(dir);
  const entries = new Map<string, Entry>();
  let at = 0;
  for (let n = 0; n < count; n++) {
    if (at + 46 > dir.length || dirView.getUint32(at, true) !== CENTRAL_SIG) {
      throw new ZipReadError("zipDamaged");
    }
    const flags = dirView.getUint16(at + 8, true);
    const method = dirView.getUint16(at + 10, true);
    let compressedSize = dirView.getUint32(at + 20, true);
    let size = dirView.getUint32(at + 24, true);
    const nameLength = dirView.getUint16(at + 28, true);
    const extraLength = dirView.getUint16(at + 30, true);
    const commentLength = dirView.getUint16(at + 32, true);
    let localOffset = dirView.getUint32(at + 42, true);
    const name = utf8.decode(dir.subarray(at + 46, at + 46 + nameLength));

    // ZIP64 sizes and offsets sit in extra field 0x0001, in this order, for
    // each value whose 32-bit slot is full.
    let extra = at + 46 + nameLength;
    const extraEnd = extra + extraLength;
    while (extra + 4 <= extraEnd) {
      const id = dirView.getUint16(extra, true);
      const length = dirView.getUint16(extra + 2, true);
      if (id === 0x0001) {
        let field = extra + 4;
        if (size === U32_MAX) {
          size = u64(dirView, field);
          field += 8;
        }
        if (compressedSize === U32_MAX) {
          compressedSize = u64(dirView, field);
          field += 8;
        }
        if (localOffset === U32_MAX) localOffset = u64(dirView, field);
      }
      extra += 4 + length;
    }

    if (!name.endsWith("/")) {
      entries.set(name, {
        method,
        encrypted: (flags & 1) === 1,
        compressedSize,
        size,
        localOffset,
      });
    }
    at = extraEnd + commentLength;
  }
  return entries;
}

/** A picked file and the path it had inside the folder it came from. */
export type PickedFile = { path: string; file: File };

/**
 * Presents picked files as an archive. Text files are read up front;
 * attachments stay on disk until uploaded.
 */
export async function readFiles(picked: PickedFile[]): Promise<ZipArchive> {
  const files = new Map(picked.map(({ path, file }) => [path, file]));
  const texts = new Map(
    await Promise.all(
      [...files]
        .filter(([path]) => TEXT_ENTRY.test(path))
        .map(async ([path, file]) => [path, await file.text()] as const),
    ),
  );

  return {
    names: [...files.keys()],
    has: (path) => files.has(path),
    text: (path) => {
      const text = texts.get(path);
      if (text === undefined) throw new Error(`Text file not found: ${path}`);
      return text;
    },
    blob: (path) => {
      const file = files.get(path);
      if (!file) throw new Error(`File not found: ${path}`);
      return file;
    },
  };
}

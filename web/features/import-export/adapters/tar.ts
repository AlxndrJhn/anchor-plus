import { translate } from "@/lib/i18n";
import { ImportFileError } from "./types";
import { TEXT_ENTRY, type ZipArchive } from "./zip";

/**
 * Reads a tar file (Joplin's .jex export) without loading it: the 512-byte
 * headers are read one after another, and each file's bytes stay in place
 * until asked for.
 */

const BLOCK = 512;
const MAX_TEXT_ENTRY = 64 * 1024 * 1024;

const latin1 = new TextDecoder("latin1");
const utf8 = new TextDecoder();

function cString(bytes: Uint8Array, start: number, length: number): string {
  const slice = bytes.subarray(start, start + length);
  const end = slice.indexOf(0);
  return utf8.decode(end === -1 ? slice : slice.subarray(0, end));
}

function octal(bytes: Uint8Array, start: number, length: number): number {
  const text = latin1
    .decode(bytes.subarray(start, start + length))
    .replace(/\0.*$/, "")
    .trim();
  return text ? Number.parseInt(text, 8) : 0;
}

/** PAX headers ("path=…") can carry a long name for the next entry. */
function paxPath(text: string): string | undefined {
  for (const record of text.split("\n")) {
    const match = /^\d+ path=(.*)$/.exec(record);
    if (match) return match[1];
  }
  return undefined;
}

type Entry = { start: number; size: number };

export async function openTar(source: Blob): Promise<ZipArchive> {
  const entries = new Map<string, Entry>();
  let offset = 0;
  let longName: string | undefined;

  while (offset + BLOCK <= source.size) {
    const header = new Uint8Array(
      await source.slice(offset, offset + BLOCK).arrayBuffer(),
    );
    if (header.every((byte) => byte === 0)) break;

    const magic = latin1.decode(header.subarray(257, 262));
    const checksum = octal(header, 148, 8);
    let sum = 0;
    for (let i = 0; i < BLOCK; i++) {
      sum += i >= 148 && i < 156 ? 32 : header[i];
    }
    if (sum !== checksum) {
      throw new ImportFileError(
        translate("settings.importExport.adapters")("tarDamaged"),
      );
    }

    const size = octal(header, 124, 12);
    const type = String.fromCharCode(header[156] || 48);
    const prefix = magic === "ustar" ? cString(header, 345, 155) : "";
    const name = cString(header, 0, 100);
    const dataStart = offset + BLOCK;
    const next = dataStart + Math.ceil(size / BLOCK) * BLOCK;

    if (type === "L" || type === "x") {
      const text = utf8.decode(
        new Uint8Array(
          await source.slice(dataStart, dataStart + size).arrayBuffer(),
        ),
      );
      longName = type === "L" ? text.replace(/\0+$/, "") : paxPath(text);
    } else if (type === "0" || type === "7") {
      const path = (longName ?? (prefix ? `${prefix}/${name}` : name)).replace(
        /^\.\//,
        "",
      );
      entries.set(path, { start: dataStart, size });
      longName = undefined;
    } else {
      longName = undefined;
    }
    offset = next;
  }

  const texts = new Map<string, string>();
  for (const [path, entry] of entries) {
    if (!TEXT_ENTRY.test(path) || entry.size > MAX_TEXT_ENTRY) continue;
    texts.set(
      path,
      await source.slice(entry.start, entry.start + entry.size).text(),
    );
  }

  return {
    names: [...entries.keys()],
    has: (path) => entries.has(path),
    text: (path) => {
      const text = texts.get(path);
      if (text === undefined)
        throw new Error(`Tar entry not readable: ${path}`);
      return text;
    },
    blob: (path) => {
      const entry = entries.get(path);
      if (!entry) throw new Error(`Tar entry not found: ${path}`);
      return source.slice(entry.start, entry.start + entry.size);
    },
  };
}

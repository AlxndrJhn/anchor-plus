import type { QuillDelta, QuillOp } from "@/features/notes/quill";
import { stringifyDelta } from "@/features/notes/quill";
import { translate } from "@/lib/i18n";
import {
  type CanonicalAttachment,
  type CanonicalNote,
  IMPORT_MAX_CONTENT_LENGTH,
  type ImportSkippedItem,
  type ParsedImport,
} from "../types";

/** Helpers shared by the adapters for other note apps. */

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  heic: "image/heic",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/x-m4a",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  aac: "audio/aac",
  weba: "audio/webm",
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
  zip: "application/zip",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  mp4: "video/mp4",
  mov: "video/quicktime",
};

export const basename = (path: string) => path.split("/").pop() ?? path;

/** The file's type from its extension, or a generic one. */
export function mimeFromName(name: string): string {
  const extension = name.includes(".")
    ? (name.split(".").pop()?.toLowerCase() ?? "")
    : "";
  return MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
}

/** The server takes any file: pictures and recordings show in the note, the rest as files. */
export function fileAttachment(
  filename: string,
  mimeType: string,
  getBlob: () => Promise<Blob>,
): CanonicalAttachment {
  return {
    filename,
    mimeType: mimeType || mimeFromName(filename),
    supported: true,
    getBlob,
  };
}

/** Each line as it is; nothing is read as formatting. */
export function plainTextToDelta(text: string): QuillDelta {
  const body = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const trimmed = body.replace(/\n+$/, "");
  if (!trimmed) return { ops: [{ insert: "\n" }] };
  return { ops: [{ insert: `${trimmed}\n` }] };
}

export const isTooLarge = (delta: QuillDelta) =>
  stringifyDelta(delta).length > IMPORT_MAX_CONTENT_LENGTH;

/** "First line is the title", as Simplenote and plain text apps keep notes. */
export function splitFirstLine(text: string): { title: string; body: string } {
  const lines = text.replace(/^﻿/, "").split(/\r\n|\r|\n/);
  const first = lines.findIndex((line) => line.trim());
  if (first === -1) return { title: "", body: "" };
  const title = lines[first]
    .trim()
    .replace(/^#{1,6}[ \t]+/, "")
    .slice(0, 255);
  let rest = lines.slice(first + 1);
  while (rest.length && !rest[0].trim()) rest = rest.slice(1);
  return { title, body: rest.join("\n") };
}

/** An ISO date, or nothing when the value is not a date. */
export function toIso(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const date =
    typeof value === "number"
      ? // Seconds or milliseconds since 1970
        new Date(value < 1e11 ? value * 1000 : value)
      : new Date(String(value));
  const time = date.getTime();
  if (Number.isNaN(time) || time <= 0) return undefined;
  return date.toISOString();
}

export const adapterText = translate("settings.importExport.adapters");

export function tooLargeSkip(item: string): ImportSkippedItem {
  return { item, reason: adapterText("noteTooLarge") };
}

/** The import summary every adapter hands back. */
export function buildParsedImport(
  formatId: ParsedImport["formatId"],
  formatLabel: string,
  notes: CanonicalNote[],
  skipped: ImportSkippedItem[],
): ParsedImport {
  const names = new Set<string>();
  for (const note of notes) {
    for (const name of note.tagNames) names.add(name);
    for (const name of note.folderTags ?? []) names.add(name);
  }
  const hasFolders = notes.some((note) => note.folderTags?.length);
  return {
    formatId,
    formatLabel,
    notes,
    tags: [...names].map((name) => ({ name, color: null })),
    attachmentCount: notes.reduce(
      (sum, note) => sum + note.attachments.filter((a) => a.supported).length,
      0,
    ),
    skipped,
    ...(hasFolders ? { hasFolders } : {}),
  };
}

/** Decodes base64 text in pieces, so a large picture never needs one huge string. */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, "");
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  // A multiple of 4, so every piece decodes on its own
  const step = 4 * 256 * 1024;
  for (let i = 0; i < clean.length; i += step) {
    const binary = atob(clean.slice(i, i + step));
    const bytes = new Uint8Array(binary.length);
    for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j);
    chunks.push(bytes);
  }
  return new Blob(chunks, { type: mimeType });
}

const XML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** Decodes the entities XML text and attribute values may carry. */
export function decodeXmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body) => {
    const name = String(body);
    if (name[0] === "#") {
      const code =
        name[1] === "x" || name[1] === "X"
          ? Number.parseInt(name.slice(2), 16)
          : Number.parseInt(name.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : whole;
    }
    return XML_ENTITIES[name.toLowerCase()] ?? whole;
  });
}

const sameAttributes = (a: QuillOp, b: QuillOp) =>
  JSON.stringify(a.attributes ?? {}) === JSON.stringify(b.attributes ?? {});

/**
 * Merges neighbouring text with the same formatting, as the editor would,
 * and makes sure the delta ends with a line break.
 */
export function finishDelta(ops: QuillOp[]): QuillDelta {
  const out: QuillOp[] = [];
  for (const op of ops) {
    const last = out[out.length - 1];
    if (
      last &&
      typeof last.insert === "string" &&
      typeof op.insert === "string" &&
      sameAttributes(last, op)
    ) {
      last.insert += op.insert;
    } else {
      out.push({ ...op });
    }
  }
  const last = out[out.length - 1];
  if (!last || typeof last.insert !== "string" || !last.insert.endsWith("\n")) {
    out.push({ insert: "\n" });
  }
  return { ops: out };
}

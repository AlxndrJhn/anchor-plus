import { anchorAdapter } from "./anchor";
import { evernoteAdapter } from "./evernote";
import { googleKeepAdapter } from "./google-keep";
import { joplinAdapter } from "./joplin";
import { markdownAdapter, notionAdapter } from "./markdown";
import { simplenoteAdapter } from "./simplenote";
import { standardNotesAdapter } from "./standard-notes";
import { openTar } from "./tar";
import type { ImportAdapter } from "./types";
import { openZip, type PickedFile, readFiles, type ZipArchive } from "./zip";

// Detection runs in order; anchor's manifest check is the cheapest and most
// specific, markdown the loosest. New formats register here.
const ADAPTERS: ImportAdapter[] = [
  anchorAdapter,
  googleKeepAdapter,
  evernoteAdapter,
  simplenoteAdapter,
  standardNotesAdapter,
  joplinAdapter,
  notionAdapter,
  markdownAdapter,
];

const isZip = (file: File) =>
  file.name.toLowerCase().endsWith(".zip") ||
  file.type === "application/zip" ||
  file.type === "application/x-zip-compressed";

const isTar = (file: File) => /\.(jex|tar)$/i.test(file.name);

const isIgnored = (path: string) =>
  path
    .split("/")
    .some((segment) => segment.startsWith(".") || segment === "__MACOSX");

/**
 * Notion splits large exports into zips inside the zip it hands out; their
 * entries are read as one archive, each under its own zip's name.
 */
async function unwrapNestedZips(zip: ZipArchive): Promise<ZipArchive> {
  const names = zip.names.filter((path) => !isIgnored(path));
  if (!names.length || !names.every((path) => /\.zip$/i.test(path))) {
    return zip;
  }
  const parts = await Promise.all(
    names.map(async (path) => ({
      prefix: `${path.replace(/\.zip$/i, "")}/`,
      archive: await openZip(await zip.blob(path)),
    })),
  );
  const owner = new Map<string, { archive: ZipArchive; path: string }>();
  for (const { prefix, archive } of parts) {
    for (const path of archive.names) {
      owner.set(`${prefix}${path}`, { archive, path });
    }
  }
  const find = (path: string) => {
    const found = owner.get(path);
    if (!found) throw new Error(`Zip entry not found: ${path}`);
    return found;
  };
  return {
    names: [...owner.keys()],
    has: (path) => owner.has(path),
    text: (path) => {
      const { archive, path: inner } = find(path);
      return archive.text(inner);
    },
    blob: (path) => {
      const { archive, path: inner } = find(path);
      return archive.blob(inner);
    },
    modifiedAt: (path) => {
      const found = owner.get(path);
      return found?.archive.modifiedAt?.(found.path);
    },
  };
}

async function openPicked(files: PickedFile[]): Promise<ZipArchive> {
  if (files.length === 1) {
    const { file } = files[0];
    if (isZip(file)) return unwrapNestedZips(await openZip(file));
    if (isTar(file)) return openTar(file);
  }
  return readFiles(files);
}

export async function detectFormat(
  files: PickedFile[],
): Promise<{ adapter: ImportAdapter; zip: ZipArchive } | null> {
  if (!files.length) return null;

  const zip = await openPicked(files);

  for (const adapter of ADAPTERS) {
    if (await adapter.detect(zip)) {
      return { adapter, zip };
    }
  }
  return null;
}

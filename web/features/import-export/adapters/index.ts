import { anchorAdapter } from "./anchor";
import { googleKeepAdapter } from "./google-keep";
import { markdownAdapter } from "./markdown";
import type { ImportAdapter } from "./types";
import { openZip, type PickedFile, readFiles, type ZipArchive } from "./zip";

// Detection runs in order; anchor's manifest check is the cheapest and most
// specific, markdown the loosest. New formats register here.
const ADAPTERS: ImportAdapter[] = [
  anchorAdapter,
  googleKeepAdapter,
  markdownAdapter,
];

const isZip = (file: File) =>
  file.name.toLowerCase().endsWith(".zip") ||
  file.type === "application/zip" ||
  file.type === "application/x-zip-compressed";

export async function detectFormat(
  files: PickedFile[],
): Promise<{ adapter: ImportAdapter; zip: ZipArchive } | null> {
  if (!files.length) return null;

  const zip =
    files.length === 1 && isZip(files[0].file)
      ? await openZip(files[0].file)
      : await readFiles(files);

  for (const adapter of ADAPTERS) {
    if (await adapter.detect(zip)) {
      return { adapter, zip };
    }
  }
  return null;
}

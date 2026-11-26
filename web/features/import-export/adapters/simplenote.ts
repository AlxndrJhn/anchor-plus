import type { CanonicalNote, ImportSkippedItem } from "../types";
import { markdownToDelta } from "./markdown-mapping";
import {
  adapterText,
  buildParsedImport,
  isTooLarge,
  plainTextToDelta,
  splitFirstLine,
  toIso,
  tooLargeSkip,
} from "./shared";
import type { ImportAdapter } from "./types";
import type { ZipArchive } from "./zip";

/**
 * Simplenote's export (Settings → Export notes) is a zip holding one .txt
 * per note and source/notes.json with everything, which is what's read.
 */

type SimplenoteNote = {
  id?: string;
  content?: string;
  creationDate?: string | number;
  lastModified?: string | number;
  tags?: string[];
  pinned?: boolean;
  markdown?: boolean;
  systemTags?: string[];
};

type SimplenoteExport = {
  activeNotes?: SimplenoteNote[];
  trashedNotes?: SimplenoteNote[];
};

function findExport(
  zip: ZipArchive,
): { path: string; data: SimplenoteExport } | null {
  const candidates = zip.names
    .filter((path) => /(^|\/)notes\.json$/i.test(path))
    .sort((a, b) => a.length - b.length);
  for (const path of candidates) {
    try {
      const data = JSON.parse(zip.text(path)) as SimplenoteExport;
      if (Array.isArray(data?.activeNotes)) return { path, data };
    } catch {
      // Not this one
    }
  }
  return null;
}

export const simplenoteAdapter: ImportAdapter = {
  id: "simplenote",
  label: "Simplenote",

  async detect(zip) {
    return findExport(zip) !== null;
  },

  async parse(zip) {
    const found = findExport(zip);
    const notes: CanonicalNote[] = [];
    const skipped: ImportSkippedItem[] = [];
    if (!found)
      return buildParsedImport("simplenote", this.label, notes, skipped);

    found.data.activeNotes?.forEach((note, index) => {
      const { title, body } = splitFirstLine(note.content ?? "");
      const displayName = title || `#${index + 1}`;
      const isMarkdown =
        note.markdown === true ||
        note.systemTags?.includes("markdown") === true;
      const contentDelta = isMarkdown
        ? markdownToDelta(body)
        : plainTextToDelta(body);
      if (isTooLarge(contentDelta)) {
        skipped.push(tooLargeSkip(displayName));
        return;
      }
      notes.push({
        ref: `simplenote:${note.id ?? index}`,
        title,
        contentDelta,
        isPinned:
          note.pinned === true || note.systemTags?.includes("pinned") === true,
        isArchived: false,
        isTrashed: false,
        background: null,
        tagNames: (note.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
        createdAt: toIso(note.creationDate),
        updatedAt: toIso(note.lastModified),
        attachments: [],
      });
    });

    for (const note of found.data.trashedNotes ?? []) {
      skipped.push({
        item: splitFirstLine(note.content ?? "").title || "—",
        reason: adapterText("trashedInApp", { app: this.label }),
      });
    }

    return buildParsedImport("simplenote", this.label, notes, skipped);
  },
};

import type {
  CanonicalAttachment,
  CanonicalNote,
  ImportSkippedItem,
} from "../types";
import { htmlToDelta } from "./html-mapping";
import {
  adapterText,
  base64ToBlob,
  basename,
  buildParsedImport,
  decodeXmlEntities,
  fileAttachment,
  isTooLarge,
  mimeFromName,
  tooLargeSkip,
} from "./shared";
import type { ImportAdapter } from "./types";
import type { ZipArchive } from "./zip";

/**
 * Evernote exports notebooks as .enex files: XML with one <note> per note,
 * its text as ENML (HTML) and its files base64 encoded alongside.
 */

const ENEX = /\.enex$/i;

const enexEntries = (zip: ZipArchive) =>
  zip.names
    .filter((path) => ENEX.test(path) && !basename(path).startsWith("."))
    .sort();

function readable(zip: ZipArchive, path: string): string | null {
  try {
    return zip.text(path);
  } catch {
    return null;
  }
}

/** The text of the first <tag> in [xml], entities decoded and CDATA unwrapped. */
function field(xml: string, tag: string): string | undefined {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(
    xml,
  );
  return match ? textOf(match[1]) : undefined;
}

function fields(xml: string, tag: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "g");
  for (let match = re.exec(xml); match; match = re.exec(xml)) {
    out.push(textOf(match[1]));
  }
  return out;
}

function textOf(raw: string): string {
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(raw);
  return cdata ? cdata[1] : decodeXmlEntities(raw);
}

/** "20230415T093000Z" → ISO */
export function enexDateToIso(value: string | undefined): string | undefined {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(
    value?.trim() ?? "",
  );
  if (!match) return undefined;
  const [, y, mo, d, h, mi, s] = match;
  const date = new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function resourcesOf(
  noteXml: string,
  title: string,
): { attachments: CanonicalAttachment[]; skipped: ImportSkippedItem[] } {
  const attachments: CanonicalAttachment[] = [];
  const skipped: ImportSkippedItem[] = [];
  const re = /<resource>([\s\S]*?)<\/resource>/g;
  let index = 0;
  for (let match = re.exec(noteXml); match; match = re.exec(noteXml)) {
    index++;
    const resource = match[1];
    const data = /<data(?:\s[^>]*)?>([\s\S]*?)<\/data>/.exec(resource)?.[1];
    const mime = field(resource, "mime")?.trim() ?? "";
    const name =
      field(resource, "file-name")?.trim() ||
      `${title || "attachment"}-${index}.${mime.split("/")[1]?.split(/[+;]/)[0] || "bin"}`;
    if (!data?.trim()) {
      skipped.push({
        item: name,
        reason: adapterText("attachmentNotFoundInExport"),
      });
      continue;
    }
    const mimeType = mime || mimeFromName(name);
    attachments.push(
      fileAttachment(name, mimeType, () =>
        Promise.resolve(base64ToBlob(data, mimeType)),
      ),
    );
  }
  return { attachments, skipped };
}

export const evernoteAdapter: ImportAdapter = {
  id: "evernote",
  label: "Evernote",

  async detect(zip) {
    return enexEntries(zip).some((path) =>
      /<en-export[\s>]/.test(readable(zip, path)?.slice(0, 4096) ?? ""),
    );
  },

  async parse(zip) {
    const entries = enexEntries(zip);
    const notes: CanonicalNote[] = [];
    const skipped: ImportSkippedItem[] = [];
    const notebooks = new Set<string>();

    for (const path of entries) {
      const xml = readable(zip, path);
      if (xml === null) {
        skipped.push({
          item: basename(path),
          reason: adapterText("unreadableNote"),
        });
        continue;
      }
      // Each .enex file is one notebook
      const notebook = basename(path).replace(ENEX, "").trim();
      notebooks.add(notebook);

      const re = /<note>([\s\S]*?)<\/note>/g;
      let index = 0;
      for (let match = re.exec(xml); match; match = re.exec(xml)) {
        index++;
        const noteXml = match[1];
        // Note fields only, so text in the note or its files can't pass for one
        const meta = noteXml
          .replace(/<content>[\s\S]*?<\/content>/, "")
          .replace(/<resource>[\s\S]*?<\/resource>/g, "");
        const title = field(meta, "title")?.trim() ?? "";
        const displayName = title || `${notebook} #${index}`;

        const content = field(noteXml, "content") ?? "";
        if (/<en-crypt[\s>]/.test(content)) {
          skipped.push({
            item: displayName,
            reason: adapterText("encryptedText"),
          });
        }
        const contentDelta = htmlToDelta(content);
        if (isTooLarge(contentDelta)) {
          skipped.push(tooLargeSkip(displayName));
          continue;
        }

        const resources = resourcesOf(noteXml, title);
        skipped.push(...resources.skipped);

        notes.push({
          ref: `evernote:${path}#${index}`,
          title,
          contentDelta,
          isPinned: false,
          isArchived: false,
          isTrashed: false,
          background: null,
          tagNames: fields(meta, "tag")
            .map((tag) => tag.trim())
            .filter(Boolean),
          folderTags: notebook ? [notebook] : [],
          createdAt: enexDateToIso(field(meta, "created")),
          updatedAt: enexDateToIso(field(meta, "updated")),
          attachments: resources.attachments,
        });
      }
    }

    // A single notebook says nothing a tag would add
    if (notebooks.size < 2) {
      for (const note of notes) note.folderTags = [];
    }

    return buildParsedImport("evernote", this.label, notes, skipped);
  },
};

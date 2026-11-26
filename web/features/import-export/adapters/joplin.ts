import type {
  CanonicalAttachment,
  CanonicalNote,
  ImportSkippedItem,
} from "../types";
import { htmlToDelta } from "./html-mapping";
import { markdownToDelta } from "./markdown-mapping";
import {
  adapterText,
  basename,
  buildParsedImport,
  fileAttachment,
  isTooLarge,
  mimeFromName,
  toIso,
  tooLargeSkip,
} from "./shared";
import type { ImportAdapter } from "./types";
import type { ZipArchive } from "./zip";

/**
 * A Joplin export (File → Export all → JEX) is a tar of one .md file per
 * item: notes, notebooks, tags, the links between notes and tags, and
 * resources, whose files sit in resources/. Each .md ends with its
 * properties as "key: value" lines.
 */

const TYPE_NOTE = 1;
const TYPE_FOLDER = 2;
const TYPE_RESOURCE = 4;
const TYPE_TAG = 5;
const TYPE_NOTE_TAG = 6;

type JoplinItem = {
  title: string;
  body: string;
  props: Record<string, string>;
  type: number;
};

const ITEM_FILE = /^[0-9a-f]{32}\.md$/;
const PROP_LINE = /^([a-z_]+): ?(.*)$/;

/** Splits a Joplin item into its title, body and trailing properties. */
export function parseJoplinItem(text: string): JoplinItem | null {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();

  const props: Record<string, string> = {};
  let i = lines.length - 1;
  for (; i >= 0; i--) {
    const match = PROP_LINE.exec(lines[i]);
    if (!match) break;
    props[match[1]] = match[2];
  }
  const type = Number(props.type_);
  if (!props.id || !Number.isInteger(type)) return null;

  const content = lines.slice(0, i + 1);
  while (content.length && !content[content.length - 1].trim()) content.pop();
  const title = content[0] ?? "";
  // The body starts after the title and the blank line under it
  const body = content.slice(content[1] === "" ? 2 : 1).join("\n");
  return { title, body, props, type };
}

const isTrue = (value: string | undefined) => value === "1" || value === "true";

const isJexArchive = (zip: ZipArchive) =>
  zip.names.filter((path) => ITEM_FILE.test(path)).length > 0;

export const joplinAdapter: ImportAdapter = {
  id: "joplin",
  label: "Joplin",

  async detect(zip) {
    if (!isJexArchive(zip)) return false;
    const first = zip.names.find((path) => ITEM_FILE.test(path));
    try {
      return first !== undefined && parseJoplinItem(zip.text(first)) !== null;
    } catch {
      return false;
    }
  },

  async parse(zip) {
    const items = new Map<string, JoplinItem>();
    const skipped: ImportSkippedItem[] = [];
    for (const path of zip.names.filter((name) => ITEM_FILE.test(name))) {
      let item: JoplinItem | null = null;
      try {
        item = parseJoplinItem(zip.text(path));
      } catch {
        item = null;
      }
      if (!item) {
        skipped.push({ item: path, reason: adapterText("unreadableNote") });
        continue;
      }
      items.set(item.props.id, item);
    }

    const byType = (type: number) =>
      [...items.values()].filter((item) => item.type === type);

    // Notebooks nest, so a note's folder tags are the whole path down to it
    const folders = new Map(byType(TYPE_FOLDER).map((f) => [f.props.id, f]));
    const folderPath = (id: string | undefined): string[] => {
      const path: string[] = [];
      const seen = new Set<string>();
      let current = id ? folders.get(id) : undefined;
      while (current && !seen.has(current.props.id)) {
        seen.add(current.props.id);
        if (current.title.trim()) path.unshift(current.title.trim());
        current = folders.get(current.props.parent_id);
      }
      return path;
    };

    const tags = new Map(
      byType(TYPE_TAG).map((t) => [t.props.id, t.title.trim()]),
    );
    const tagsByNote = new Map<string, string[]>();
    for (const link of byType(TYPE_NOTE_TAG)) {
      const name = tags.get(link.props.tag_id);
      if (!name) continue;
      const noteId = link.props.note_id;
      tagsByNote.set(noteId, [...(tagsByNote.get(noteId) ?? []), name]);
    }

    const resources = new Map(
      byType(TYPE_RESOURCE).map((r) => [r.props.id, r]),
    );
    const resourcePath = (id: string) =>
      zip.names.find(
        (path) =>
          path.startsWith("resources/") &&
          basename(path).replace(/\.[^.]*$/, "") === id,
      );

    const notes: CanonicalNote[] = [];
    for (const note of byType(TYPE_NOTE)) {
      const { props } = note;
      const title = note.title.trim();
      const displayName = title || props.id;

      if (props.deleted_time && props.deleted_time !== "0") {
        skipped.push({
          item: displayName,
          reason: adapterText("trashedInApp", { app: this.label }),
        });
        continue;
      }
      if (isTrue(props.encryption_applied)) {
        skipped.push({
          item: displayName,
          reason: adapterText("encryptedNote"),
        });
        continue;
      }

      // Resource links (":/<id>") become attachments; links to other notes keep their text
      const attachments: CanonicalAttachment[] = [];
      const attached = new Set<string>();
      /** Attaches the resource; false when [id] is another note. */
      const attach = (id: string): boolean => {
        const resource = resources.get(id);
        if (!resource) return false;
        if (attached.has(id)) return true;
        attached.add(id);
        const path = resourcePath(id);
        if (!path) {
          skipped.push({
            item: resource.title || id,
            reason: adapterText("attachmentNotFoundInExport"),
          });
          return true;
        }
        const filename =
          resource.title.trim() ||
          `${id}.${resource.props.file_extension || path.split(".").pop()}`;
        attachments.push(
          fileAttachment(
            filename,
            resource.props.mime || mimeFromName(path),
            () => Promise.resolve(zip.blob(path)),
          ),
        );
        return true;
      };
      const body = note.body
        .split("\n")
        .flatMap((line) => {
          const next = line
            .replace(
              /!?\[([^\]]*)\]\(:\/([0-9a-f]{32})\)/g,
              (_whole, label: string, id: string) => (attach(id) ? "" : label),
            )
            .replace(
              /<img[^>]*src=["']:\/([0-9a-f]{32})["'][^>]*>/g,
              (whole, id: string) => (attach(id) ? "" : whole),
            );
          // A line that only held a picture goes with it
          return next.trim() || !line.trim() ? [next] : [];
        })
        .join("\n");

      const contentDelta =
        props.markup_language === "2"
          ? htmlToDelta(body)
          : markdownToDelta(body);
      if (isTooLarge(contentDelta)) {
        skipped.push(tooLargeSkip(displayName));
        continue;
      }

      notes.push({
        ref: `joplin:${props.id}`,
        title,
        contentDelta,
        isPinned: false,
        isArchived: false,
        isTrashed: false,
        background: null,
        tagNames: [...new Set(tagsByNote.get(props.id) ?? [])],
        folderTags: folderPath(props.parent_id),
        createdAt: toIso(props.user_created_time || props.created_time),
        updatedAt: toIso(props.user_updated_time || props.updated_time),
        attachments,
      });
    }

    return buildParsedImport("joplin", this.label, notes, skipped);
  },
};

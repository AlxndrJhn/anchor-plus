import type { QuillDelta, QuillOp } from "@/features/notes/quill";
import { MAX_LIST_INDENT } from "@/features/notes/quill-lines";
import type { CanonicalNote, ImportSkippedItem } from "../types";
import { htmlToDelta } from "./html-mapping";
import { markdownToDelta } from "./markdown-mapping";
import {
  adapterText,
  buildParsedImport,
  finishDelta,
  isTooLarge,
  plainTextToDelta,
  toIso,
  tooLargeSkip,
} from "./shared";
import { type ImportAdapter, ImportFileError } from "./types";
import type { ZipArchive } from "./zip";

/**
 * A Standard Notes backup (Settings → Backups → Download backup, decrypted)
 * is one JSON file, "Standard Notes Backup and Import File.txt", either on
 * its own or in a zip.
 */

type Reference = { uuid: string; content_type?: string };

type Item = {
  uuid: string;
  content_type: string;
  content: unknown;
  created_at?: string;
  updated_at?: string;
  deleted?: boolean;
};

type NoteContent = {
  title?: string;
  text?: string;
  noteType?: string;
  trashed?: boolean;
  archived?: boolean;
  pinned?: boolean;
  appData?: Record<string, Record<string, unknown>>;
};

type TagContent = { title?: string; references?: Reference[] };

function findBackup(zip: ZipArchive): { path: string; items: Item[] } | null {
  const candidates = zip.names
    .filter((path) => /\.(txt|json)$/i.test(path))
    // The backup file's own name first
    .sort(
      (a, b) =>
        Number(!/standard notes/i.test(b)) -
          Number(!/standard notes/i.test(a)) || a.length - b.length,
    );
  for (const path of candidates) {
    let text: string;
    try {
      text = zip.text(path);
    } catch {
      continue;
    }
    if (!text.trimStart().startsWith("{") || !text.includes("content_type"))
      continue;
    try {
      const data = JSON.parse(text) as { items?: Item[] };
      if (
        Array.isArray(data.items) &&
        data.items.some((item) => typeof item?.content_type === "string")
      ) {
        return { path, items: data.items };
      }
    } catch {
      // Not this one
    }
  }
  return null;
}

const isNoteContent = (content: unknown): content is NoteContent =>
  typeof content === "object" && content !== null;

// Lexical (the "Super" editor) text format bits
const BOLD = 1;
const ITALIC = 2;
const STRIKE = 4;
const UNDERLINE = 8;
const HIGHLIGHT = 128;

type LexicalNode = {
  type?: string;
  text?: string;
  format?: number;
  tag?: string;
  listType?: string;
  checked?: boolean;
  url?: string;
  children?: LexicalNode[];
};

/** Super notes store Lexical's JSON; this keeps their structure and formatting. */
export function lexicalToDelta(json: string): QuillDelta | null {
  let root: LexicalNode;
  try {
    root = (JSON.parse(json) as { root?: LexicalNode }).root as LexicalNode;
  } catch {
    return null;
  }
  if (!root || !Array.isArray(root.children)) return null;

  const ops: QuillOp[] = [];
  const pushText = (text: string, attributes: Record<string, unknown>) => {
    if (!text) return;
    ops.push(
      Object.keys(attributes).length
        ? { insert: text, attributes }
        : { insert: text },
    );
  };
  const endLine = (attributes: Record<string, unknown>) =>
    ops.push(
      Object.keys(attributes).length
        ? { insert: "\n", attributes }
        : { insert: "\n" },
    );

  const inline = (
    nodes: LexicalNode[],
    marks: Record<string, unknown>,
    line: Record<string, unknown>,
  ) => {
    for (const node of nodes) {
      if (node.type === "linebreak") {
        endLine(line);
      } else if (node.type === "link" || node.type === "autolink") {
        inline(
          node.children ?? [],
          node.url ? { ...marks, link: node.url } : marks,
          line,
        );
      } else if (typeof node.text === "string") {
        const format = node.format ?? 0;
        const attributes: Record<string, unknown> = { ...marks };
        if (format & BOLD) attributes.bold = true;
        if (format & ITALIC) attributes.italic = true;
        if (format & STRIKE) attributes.strike = true;
        if (format & UNDERLINE && !attributes.link) attributes.underline = true;
        if (format & HIGHLIGHT) attributes.highlight = "yellow";
        pushText(node.text, line["code-block"] ? {} : attributes);
      } else if (node.children) {
        inline(node.children, marks, line);
      }
    }
  };

  const block = (node: LexicalNode, depth: number, listType?: string) => {
    switch (node.type) {
      case "heading": {
        const level = Math.min(Number(node.tag?.slice(1)) || 1, 3);
        inline(node.children ?? [], {}, { header: level });
        endLine({ header: level });
        return;
      }
      case "quote":
        inline(node.children ?? [], {}, { blockquote: true });
        endLine({ blockquote: true });
        return;
      case "code":
        inline(node.children ?? [], {}, { "code-block": true });
        endLine({ "code-block": true });
        return;
      case "list":
        for (const child of node.children ?? [])
          block(child, depth, node.listType);
        return;
      case "listitem": {
        const nested = (node.children ?? []).filter(
          (child) => child.type === "list",
        );
        const own = (node.children ?? []).filter(
          (child) => child.type !== "list",
        );
        if (own.length) {
          const level = Math.min(depth, MAX_LIST_INDENT);
          const line = {
            list:
              listType === "check"
                ? node.checked
                  ? "checked"
                  : "unchecked"
                : listType === "number"
                  ? "ordered"
                  : "bullet",
            ...(level ? { indent: level } : {}),
          };
          inline(own, {}, line);
          endLine(line);
        }
        for (const list of nested) block(list, depth + 1);
        return;
      }
      case "horizontalrule":
        return;
      default:
        if (
          node.children?.some(
            (child) => child.type === "paragraph" || child.type === "list",
          )
        ) {
          for (const child of node.children) block(child, depth, listType);
          return;
        }
        inline(node.children ?? [], {}, {});
        endLine({});
    }
  };

  for (const child of root.children) block(child, 0);
  return finishDelta(ops);
}

function noteDelta(content: NoteContent): QuillDelta {
  const text = content.text ?? "";
  const type = content.noteType ?? "";
  if (type === "super") return lexicalToDelta(text) ?? plainTextToDelta(text);
  if (type === "markdown") return markdownToDelta(text);
  if (
    type === "rich-text" ||
    /^\s*<(p|div|h[1-6]|ul|ol|br|span)[\s>/]/i.test(text)
  ) {
    return htmlToDelta(text);
  }
  return plainTextToDelta(text);
}

export const standardNotesAdapter: ImportAdapter = {
  id: "standard-notes",
  label: "Standard Notes",

  async detect(zip) {
    return findBackup(zip) !== null;
  },

  async parse(zip) {
    const backup = findBackup(zip);
    const notes: CanonicalNote[] = [];
    const skipped: ImportSkippedItem[] = [];
    if (!backup)
      return buildParsedImport("standard-notes", this.label, notes, skipped);

    const live = backup.items.filter((item) => !item.deleted);
    const noteItems = live.filter((item) => item.content_type === "Note");
    if (
      noteItems.length &&
      noteItems.every((item) => typeof item.content === "string")
    ) {
      throw new ImportFileError(adapterText("encryptedBackup"));
    }

    const tagsByNote = new Map<string, string[]>();
    for (const item of live) {
      if (item.content_type !== "Tag" || !isNoteContent(item.content)) continue;
      const tag = item.content as TagContent;
      const name = tag.title?.trim();
      if (!name) continue;
      for (const ref of tag.references ?? []) {
        if (ref.content_type && ref.content_type !== "Note") continue;
        tagsByNote.set(ref.uuid, [...(tagsByNote.get(ref.uuid) ?? []), name]);
      }
    }

    for (const item of noteItems) {
      if (!isNoteContent(item.content)) continue;
      const content = item.content;
      const title = content.title?.trim() ?? "";
      const displayName = title || item.uuid;
      if (content.trashed) {
        skipped.push({
          item: displayName,
          reason: adapterText("trashedInApp", { app: this.label }),
        });
        continue;
      }
      const contentDelta = noteDelta(content);
      if (isTooLarge(contentDelta)) {
        skipped.push(tooLargeSkip(displayName));
        continue;
      }
      const appData = content.appData?.["org.standardnotes.sn"] ?? {};
      notes.push({
        ref: `standard-notes:${item.uuid}`,
        title,
        contentDelta,
        isPinned: content.pinned === true || appData.pinned === true,
        isArchived: content.archived === true || appData.archived === true,
        isTrashed: false,
        background: null,
        tagNames: [...new Set(tagsByNote.get(item.uuid) ?? [])],
        createdAt: toIso(item.created_at),
        updatedAt: toIso(appData.client_updated_at ?? item.updated_at),
        attachments: [],
      });
    }

    return buildParsedImport("standard-notes", this.label, notes, skipped);
  },
};

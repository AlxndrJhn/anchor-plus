import { toIso } from "./shared";

/**
 * The YAML block at the top of a Markdown file (Obsidian, Bear, Joplin,
 * Logseq and others write one). Only the simple shapes those apps use are
 * read: "key: value", "key: [a, b]" and "key:" followed by "- item" lines.
 */

export type FrontMatter = {
  title?: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
  isPinned: boolean;
  isArchived: boolean;
};

const OPEN = /^---[ \t]*$/;
const CLOSE = /^(---|\.\.\.)[ \t]*$/;

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function inlineList(value: string): string[] {
  const trimmed = value.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1).split(",").map(unquote).filter(Boolean);
  }
  // "tags: a, b" and "tags: #a #b" are both common
  if (trimmed.includes(","))
    return trimmed.split(",").map(unquote).filter(Boolean);
  if (/^#\S/.test(trimmed)) return trimmed.split(/\s+/).filter(Boolean);
  return trimmed ? [unquote(trimmed)] : [];
}

const TITLE_KEYS = ["title"];
const TAG_KEYS = ["tags", "tag", "keywords", "categories", "category"];
const CREATED_KEYS = [
  "created",
  "created_at",
  "date",
  "creation date",
  "date created",
  "created_time",
];
const UPDATED_KEYS = [
  "updated",
  "updated_at",
  "modified",
  "last modified",
  "date modified",
  "updated_time",
  "lastmod",
];

const isTrue = (value: string | undefined) =>
  /^(true|yes|1)$/i.test(value?.trim() ?? "");

/** Splits the front matter from the body; a file without one comes back as it is. */
export function splitFrontMatter(text: string): {
  frontMatter: FrontMatter | null;
  body: string;
} {
  const lines = text.replace(/^﻿/, "").split(/\r\n|\r|\n/);
  if (!OPEN.test(lines[0] ?? "")) return { frontMatter: null, body: text };
  const end = lines.findIndex((line, index) => index > 0 && CLOSE.test(line));
  if (end === -1) return { frontMatter: null, body: text };

  const values = new Map<string, string[]>();
  let listKey: string | null = null;
  for (const line of lines.slice(1, end)) {
    const item = /^[ \t]+-[ \t]+(.*)$|^-[ \t]+(.*)$/.exec(line);
    if (item && listKey) {
      values.get(listKey)?.push(unquote(item[1] ?? item[2] ?? ""));
      continue;
    }
    const pair = /^([A-Za-z][\w -]*?)[ \t]*:[ \t]*(.*)$/.exec(line);
    if (!pair) {
      listKey = null;
      continue;
    }
    const key = pair[1].toLowerCase();
    const value = pair[2];
    if (value.trim()) {
      values.set(key, [value]);
      listKey = null;
    } else {
      values.set(key, []);
      listKey = key;
    }
  }

  // A block that holds no "key: value" lines is a thematic break, not front matter
  if (!values.size) return { frontMatter: null, body: text };

  const first = (keys: string[]) => {
    for (const key of keys) {
      const value = values.get(key);
      if (value?.length) return value;
    }
    return undefined;
  };

  const tagValues = first(TAG_KEYS) ?? [];
  const tags = [
    ...new Set(
      (tagValues.length === 1 ? inlineList(tagValues[0]) : tagValues)
        .map((tag) => unquote(tag).replace(/^#/, "").trim())
        .filter(Boolean),
    ),
  ];

  const title = first(TITLE_KEYS)?.[0];
  let body = lines.slice(end + 1);
  while (body.length && !body[0].trim()) body = body.slice(1);

  return {
    frontMatter: {
      title: title ? unquote(title) : undefined,
      tags,
      createdAt: toIso(unquote(first(CREATED_KEYS)?.[0] ?? "")),
      updatedAt: toIso(unquote(first(UPDATED_KEYS)?.[0] ?? "")),
      isPinned: isTrue(values.get("pinned")?.[0]),
      isArchived: isTrue(values.get("archived")?.[0]),
    },
    body: body.join("\n"),
  };
}

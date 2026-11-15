/**
 * Turning the notes of a Google Takeout export of Keep into import items, on
 * the server. Mirrors web/features/import-export/adapters/keep-mapping.ts,
 * which does the same for a ZIP picked in the browser.
 */

import {
  IMPORT_MAX_TAG_NAME_LENGTH,
  IMPORT_MAX_TAGS_PER_NOTE,
  IMPORT_MAX_TITLE_LENGTH,
} from '../constants/import.constants';
import type { ImportNoteItemDto } from '../dto/import-notes.dto';

/** One .json per note in Takeout; only the fields the import reads. */
export type KeepNote = {
  title?: string;
  textContent?: string;
  listContent?: { text: string; isChecked: boolean }[];
  isTrashed?: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
  labels?: { name: string }[];
  color?: string;
  createdTimestampUsec?: number;
  userEditedTimestampUsec?: number;
  attachments?: { filePath: string; mimetype: string }[];
  annotations?: { url?: string; title?: string }[];
};

type DeltaOp = { insert: string; attributes?: Record<string, string> };

// DEFAULT and GRAY have no Anchor background.
const KEEP_COLOR_TO_BACKGROUND: Record<string, string | null> = {
  DEFAULT: null,
  RED: 'color_red',
  ORANGE: 'color_orange',
  YELLOW: 'color_yellow',
  GREEN: 'color_green',
  TEAL: 'color_teal',
  BLUE: 'color_blue',
  CERULEAN: 'color_dark_blue',
  PURPLE: 'color_purple',
  PINK: 'color_pink',
  BROWN: 'color_brown',
  GRAY: null,
};

export function keepColorToBackground(color?: string): string | null {
  if (!color) return null;
  return KEEP_COLOR_TO_BACKGROUND[color] ?? null;
}

export function keepTimestampToIso(usec?: number): string | undefined {
  if (!usec || usec <= 0) return undefined;
  return new Date(Math.floor(usec / 1000)).toISOString();
}

/** Text lines, checklist lines, then the note's links on lines of their own. */
export function keepContentToDelta(note: KeepNote): { ops: DeltaOp[] } {
  const ops: DeltaOp[] = [];

  if (note.listContent?.length) {
    for (const item of note.listContent) {
      if (item.text) ops.push({ insert: item.text });
      ops.push({
        insert: '\n',
        attributes: { list: item.isChecked ? 'checked' : 'unchecked' },
      });
    }
  } else if (note.textContent) {
    ops.push({
      insert: note.textContent.endsWith('\n')
        ? note.textContent
        : `${note.textContent}\n`,
    });
  }

  const urls = (note.annotations ?? [])
    .map((annotation) => annotation.url)
    .filter((url): url is string => Boolean(url));
  if (urls.length) {
    if (ops.length) ops.push({ insert: '\n' });
    for (const url of urls) {
      ops.push({ insert: url, attributes: { link: url } });
      ops.push({ insert: '\n' });
    }
  }

  if (!ops.length) ops.push({ insert: '\n' });
  return { ops };
}

const basename = (path: string) =>
  (path.split('/').pop() ?? path).toLowerCase();
const stem = (path: string) => basename(path).replace(/\.[^.]+$/, '');

/**
 * The archive entry a note's attachment refers to. Keep sometimes names a
 * ".jpeg" that is stored as ".jpg" (or the other way round), so a file with
 * the same name but another extension counts too.
 */
export function resolveKeepMediaPath(
  filePath: string,
  mediaPaths: string[],
): string | undefined {
  const wanted = basename(filePath);
  const exact = mediaPaths.find((path) => basename(path) === wanted);
  if (exact) return exact;
  const wantedStem = stem(filePath);
  return mediaPaths.find((path) => stem(path) === wantedStem);
}

const KEEP_FOLDER_RE = /(^|\/)Keep\//;

export const parentDir = (path: string) =>
  path.includes('/') ? path.slice(0, path.lastIndexOf('/') + 1) : '';

/** The entries in Takeout's Keep folder that may be notes. */
export function keepJsonCandidates(names: string[]): string[] {
  const inKeepFolder = names.filter(
    (name) => name.endsWith('.json') && KEEP_FOLDER_RE.test(name),
  );
  // Takeout translates the folder name, so any .json may be a note then.
  return (
    inKeepFolder.length
      ? inKeepFolder
      : names.filter((name) => name.endsWith('.json'))
  ).sort();
}

export function parseKeepNote(text: string): KeepNote | null {
  try {
    const note = JSON.parse(text) as KeepNote;
    return typeof note?.userEditedTimestampUsec === 'number' ? note : null;
  } catch {
    return null;
  }
}

export type KeepAttachmentRef = {
  entry: string;
  filename: string;
  mimeType: string;
};

export type KeepImportNote = {
  item: ImportNoteItemDto;
  attachments: KeepAttachmentRef[];
};

export type KeepSkipped = { item: string; reason: string };

/**
 * Import items for the notes found, with the archive entries of their
 * pictures and recordings. Trashed notes stay behind.
 */
export function keepNotesToImport(
  notes: { entry: string; note: KeepNote }[],
  allNames: string[],
): { notes: KeepImportNote[]; skipped: KeepSkipped[] } {
  const noteDirs = new Set(notes.map(({ entry }) => parentDir(entry)));
  const mediaPaths = allNames.filter(
    (name) =>
      noteDirs.has(parentDir(name)) &&
      !name.endsWith('.json') &&
      !name.endsWith('.html'),
  );

  const skipped: KeepSkipped[] = [];
  const result: KeepImportNote[] = [];
  for (const { entry, note } of notes) {
    const displayName =
      note.title?.trim() ||
      (entry.split('/').pop() ?? entry).replace(/\.json$/, '');
    if (note.isTrashed) {
      skipped.push({ item: displayName, reason: 'Trashed in Google Keep' });
      continue;
    }

    const attachments: KeepAttachmentRef[] = [];
    for (const ref of note.attachments ?? []) {
      const resolved = resolveKeepMediaPath(ref.filePath, mediaPaths);
      if (!resolved) {
        skipped.push({
          item: ref.filePath,
          reason: 'Attachment file not found in export',
        });
        continue;
      }
      attachments.push({
        entry: resolved,
        filename: resolved.split('/').pop() ?? ref.filePath,
        mimeType: ref.mimetype || 'application/octet-stream',
      });
    }

    const tagNames = [
      ...new Set(
        (note.labels ?? [])
          .map((label) =>
            label.name?.trim().slice(0, IMPORT_MAX_TAG_NAME_LENGTH),
          )
          .filter((name): name is string => Boolean(name)),
      ),
    ].slice(0, IMPORT_MAX_TAGS_PER_NOTE);

    result.push({
      item: {
        ref: `keep:${entry}`.slice(0, 256),
        title: (note.title ?? '').slice(0, IMPORT_MAX_TITLE_LENGTH),
        content: JSON.stringify(keepContentToDelta(note)),
        isPinned: note.isPinned === true,
        isArchived: note.isArchived === true,
        isTrashed: false,
        background: keepColorToBackground(note.color) ?? undefined,
        tagNames: tagNames.length ? tagNames : undefined,
        createdAt: keepTimestampToIso(note.createdTimestampUsec),
        updatedAt: keepTimestampToIso(note.userEditedTimestampUsec),
      },
      attachments,
    });
  }
  return { notes: result, skipped };
}

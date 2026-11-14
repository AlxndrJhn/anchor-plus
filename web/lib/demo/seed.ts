// Sample notes for the demo: each feature's demo starts from a set of them.

import { INLINE_IMAGE_EMBED } from "@/features/notes/inline-images";
import type { NoteRevisionCause } from "@/features/notes/types";
import {
  type Data,
  emptyData,
  type StoredAttachment,
  type StoredNote,
  type StoredTag,
} from "@/lib/local-backend/db";

type Op = { insert: string | object; attributes?: Record<string, unknown> };

/**
 * One line of a note: plain text, a checklist item, or one of the note's
 * pictures placed in the text, as the Android app puts it there.
 */
export type Line =
  | string
  | { item: string; done?: boolean }
  | { picture: string; width?: number; caption?: string };

export function delta(lines: Line[]): string {
  const ops: Op[] = [];
  for (const line of lines) {
    if (typeof line === "string") ops.push({ insert: `${line}\n` });
    else if ("picture" in line) {
      const { picture: id, ...rest } = line;
      ops.push({
        insert: { [INLINE_IMAGE_EMBED]: JSON.stringify({ id, ...rest }) },
      });
      ops.push({ insert: "\n" });
    } else {
      ops.push({ insert: line.item });
      ops.push({
        insert: "\n",
        attributes: { list: line.done ? "checked" : "unchecked" },
      });
    }
  }
  return JSON.stringify({ ops });
}

const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60_000).toISOString();

export interface SeedNote {
  id: string;
  title: string;
  lines?: Line[];
  background?: string;
  tags?: string[];
  pinned?: boolean;
  archived?: boolean;
  frozen?: boolean;
  trashed?: boolean;
  lock?: "tap" | "pin" | "pattern" | "biometric";
  /** How long ago it was last edited, in minutes; sets the order. */
  age?: number;
  /** Earlier versions, oldest first. */
  history?: { title?: string; lines: Line[]; age: number }[];
  pictures?: { id: string; name: string; hue: number; label: string }[];
}

export interface Seed {
  notes: SeedNote[];
  tags?: { id: string; name: string; color: string }[];
}

export function buildData(seed: Seed): {
  data: Data;
  files: Map<string, Blob>;
} {
  const data = emptyData();
  data.user.name = "Demo";
  data.user.email = "demo@anchor";
  const tags: StoredTag[] = (seed.tags ?? []).map((tag, position) => ({
    ...tag,
    position,
    version: 1,
    updatedAt: minutesAgo(600),
  }));
  data.tags = tags;
  const files = new Map<string, Blob>();
  seed.notes.forEach((note, index) => {
    const age = note.age ?? (index + 1) * 7;
    const stored: StoredNote = {
      id: note.id,
      title: note.title,
      content: note.lines ? delta(note.lines) : null,
      version: (note.history?.length ?? 0) + 1,
      background: note.background ?? null,
      state: note.trashed ? "trashed" : "active",
      isFrozen: !!note.frozen,
      createdAt: minutesAgo(age + 60 * 24),
      updatedAt: minutesAgo(age),
      stateChangedAt: minutesAgo(age),
      tagIds: (note.tags ?? []).map(
        (name) => tags.find((tag) => tag.name === name)?.id ?? name,
      ),
      isPinned: !!note.pinned,
      isArchived: !!note.archived,
      position: null,
      positionedAt: null,
      lock: note.lock ?? null,
      reminder: null,
    };
    data.notes.push(stored);
    note.history?.forEach((version, i) => {
      data.revisions.push({
        id: `${note.id}-v${i + 1}`,
        noteId: note.id,
        version: i + 1,
        title: version.title ?? note.title,
        content: delta(version.lines),
        cause: "edit" as NoteRevisionCause,
        createdAt: minutesAgo(version.age),
      });
    });
    note.pictures?.forEach((picture, position) => {
      const blob = pictureBlob(picture.hue, picture.label);
      const attachment: StoredAttachment = {
        id: picture.id,
        noteId: note.id,
        type: "image",
        originalFilename: picture.name,
        mimeType: "image/png",
        fileSize: blob.size,
        position,
        uploadedByUserId: data.user.id,
        createdAt: minutesAgo(age),
      };
      data.attachments.push(attachment);
      files.set(picture.id, blob);
    });
  });
  return { data, files };
}

/** A small made-up picture: a landscape in one hue, with a caption. */
export function pictureBlob(hue: number, label: string): Blob {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 420;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new Blob([], { type: "image/png" });
  const sky = ctx.createLinearGradient(0, 0, 0, 420);
  sky.addColorStop(0, `hsl(${hue} 70% 82%)`);
  sky.addColorStop(1, `hsl(${hue} 60% 62%)`);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 640, 420);
  ctx.fillStyle = `hsl(${(hue + 30) % 360} 90% 70%)`;
  ctx.beginPath();
  ctx.arc(480, 120, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `hsl(${hue} 40% 35%)`;
  ctx.beginPath();
  ctx.moveTo(0, 420);
  ctx.lineTo(0, 300);
  ctx.lineTo(160, 190);
  ctx.lineTo(300, 290);
  ctx.lineTo(430, 210);
  ctx.lineTo(640, 330);
  ctx.lineTo(640, 420);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.9)";
  ctx.fillRect(32, 340, 576, 56);
  ctx.fillStyle = "#1f2937";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText(label, 52, 378);
  const url = canvas.toDataURL("image/png");
  const bytes = Uint8Array.from(atob(url.split(",")[1]), (c) =>
    c.charCodeAt(0),
  );
  return new Blob([bytes], { type: "image/png" });
}

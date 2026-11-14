// Answers the app's /api requests in the browser, as an Anchor server would,
// for the builds that have none (see ./mode). It follows the server's rules
// (versions, conflicts, frozen notes, history) for its one person.

import { zipSync } from "fflate";
import type {
  Note,
  NoteAttachment,
  NoteLockKind,
  NoteReminderInput,
  NoteRevisionCause,
} from "@/features/notes/types";
import { newId } from "@/lib/id";
import {
  type Data,
  emptyData,
  type Storage,
  type StoredAttachment,
  type StoredNote,
  type StoredTag,
} from "./db";

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION;
const REVISION_COLLAPSE_WINDOW_MS = 10 * 60 * 1000;
const REVISION_PAGE_SIZE = 30;
const TRASH_RETENTION_DAYS = 30;
const FROZEN = "This note is frozen; unfreeze it first";
const NOT_FOUND = "Note not found";

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(typeof body === "string" ? body : "HTTP error");
  }
}

const fail = (status: number, message: string): never => {
  throw new HttpError(status, { statusCode: status, message });
};

const json = (body: unknown, status = 200) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const now = () => new Date().toISOString();

interface Request {
  method: string;
  path: string[];
  query: URLSearchParams;
  body: unknown;
  form?: FormData;
}

type Body = Record<string, unknown>;

export class LocalServer {
  private data: Data = emptyData();
  private ready: Promise<void>;
  /** Saves one after another, the newest last. */
  private saving = Promise.resolve();

  constructor(private storage: Storage) {
    this.ready = storage.load().then((data) => {
      if (data) this.data = { ...emptyData(), ...data };
      this.purgeExpiredTrash();
    });
  }

  /** Replaces everything, as the demos do before they play. */
  async reset(data: Data, files: Map<string, Blob> = new Map()) {
    await this.ready;
    for (const attachment of this.data.attachments)
      await this.storage.deleteFile(attachment.id);
    this.data = data;
    for (const [id, blob] of files) await this.storage.putFile(id, blob);
    this.persist();
  }

  async handle(request: globalThis.Request): Promise<Response> {
    await this.ready;
    const url = new URL(request.url);
    const path = url.pathname
      .slice(url.pathname.indexOf("/api/") + "/api/".length)
      .split("/")
      .filter(Boolean)
      .map(decodeURIComponent);
    let body: unknown;
    let form: FormData | undefined;
    const type = request.headers.get("Content-Type") ?? "";
    if (type.includes("multipart/form-data")) form = await request.formData();
    else {
      const text = await request.text();
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = undefined;
        }
      }
    }
    try {
      const response = await this.route({
        method: request.method.toUpperCase(),
        path,
        query: url.searchParams,
        body,
        form,
      });
      return response instanceof Response ? response : json(response);
    } catch (error) {
      if (error instanceof HttpError) return json(error.body, error.status);
      console.error("Local backend:", error);
      return json({ statusCode: 500, message: String(error) }, 500);
    }
  }

  private persist() {
    const snapshot = structuredClone(this.data);
    this.saving = this.saving.then(() =>
      this.storage.save(snapshot).catch(() => {}),
    );
  }

  private async route(req: Request): Promise<unknown> {
    const [area, ...rest] = req.path;
    const result = await this.dispatch(area, rest, req);
    if (req.method !== "GET") this.persist();
    return result;
  }

  private dispatch(
    area: string,
    rest: string[],
    req: Request,
  ): unknown | Promise<unknown> {
    const { method } = req;
    const body = (req.body ?? {}) as Body;
    switch (area) {
      case "health":
        return { status: "ok", app: "anchor", version: APP_VERSION };
      case "auth":
        return this.auth(method, rest, req);
      case "notes":
        return this.notes(method, rest, req);
      case "note-locks":
        return this.noteLocks(method, rest, body);
      case "tags":
        return this.tags(method, rest, body);
      case "users":
        return [];
      case "picture-search":
        if (rest[0] === "status")
          return {
            available: false,
            enabled: false,
            model: { state: "absent" },
            indexed: 0,
            total: 0,
          };
        if (rest[0] === "attachments") return { labels: [] };
        return { results: [] };
      case "export":
        return this.export(req.query.get("format"));
      case "import":
        return this.import(method, rest, req);
      case "admin":
        return fail(403, "There is no server to manage");
    }
    return fail(404, `Cannot ${method} /api/${[area, ...rest].join("/")}`);
  }

  // Auth: this browser is signed in as its one person.

  private me() {
    const { lockPin, lockPattern, ...user } = this.data.user;
    return { ...user, isAdmin: false, hasPassword: false };
  }

  private session() {
    return {
      access_token: "local",
      refresh_token: "local",
      user: this.me(),
    };
  }

  private async auth(method: string, rest: string[], req: Request) {
    const body = (req.body ?? {}) as Body;
    const route = rest.join("/");
    if (route === "me") return this.me();
    if (route === "login" || route === "register" || route === "refresh")
      return this.session();
    if (route === "logout") return undefined;
    if (route === "registration-mode") return { mode: "enabled" };
    if (route === "oidc/config")
      return {
        enabled: false,
        providerName: "",
        disableInternalAuth: false,
      };
    if (route === "api-token") return { apiToken: null };
    if (route === "profile" && method === "PATCH") {
      if (typeof body.name === "string" && body.name.trim())
        this.data.user.name = body.name.trim();
      return this.me();
    }
    if (route === "profile/image") {
      if (method === "DELETE") delete this.data.user.profileImage;
      else {
        const image = req.form?.get("image");
        if (image instanceof Blob)
          this.data.user.profileImage = await dataUrl(image);
      }
      return this.me();
    }
    return fail(400, "Not available without a server");
  }

  // Notes

  private find(id: string, { deleted = false } = {}): StoredNote {
    const note = this.data.notes.find((n) => n.id === id);
    if (!note || (!deleted && note.state === "deleted"))
      return fail(404, NOT_FOUND);
    return note;
  }

  private toNote(note: StoredNote): Note {
    const attachments = this.attachmentsOf(note.id);
    const pictures = attachments.filter((a) => a.type === "image");
    const tagIds = note.tagIds.filter((id) =>
      this.data.tags.some((tag) => tag.id === id),
    );
    return {
      id: note.id,
      title: note.title,
      content: note.content,
      version: note.version,
      isPinned: note.isPinned,
      isArchived: note.isArchived,
      background: note.background,
      state: note.state,
      isFrozen: note.isFrozen,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      userId: this.data.user.id,
      tagIds,
      permission: "owner",
      shareIds: [],
      attachmentCount: attachments.length,
      imagePreviewIds: pictures.slice(0, 4).map((a) => a.id),
      reminder: note.reminder,
      position: note.position,
      positionedAt: note.positionedAt,
      lock: note.lock,
      ...(note.state === "trashed"
        ? { stateChangedAt: note.stateChangedAt }
        : {}),
    };
  }

  private list(filter: (note: StoredNote) => boolean): Note[] {
    return this.data.notes
      .filter(filter)
      .sort(
        (a, b) =>
          b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id),
      )
      .map((note) => this.toNote(note));
  }

  private async notes(method: string, rest: string[], req: Request) {
    const body = (req.body ?? {}) as Body;
    const [id, action, subId, subAction] = rest;
    if (!id) {
      if (method === "POST") return this.createNote(body);
      const tagId = req.query.get("tagId");
      const search = req.query.get("search")?.toLowerCase();
      return this.list(
        (n) =>
          n.state === "active" &&
          !n.isArchived &&
          (!tagId || n.tagIds.includes(tagId)) &&
          (!search ||
            n.title.toLowerCase().includes(search) ||
            (n.content ?? "").toLowerCase().includes(search)),
      );
    }
    if (id === "trash" && method === "GET")
      return this.list((n) => n.state === "trashed");
    if (id === "archive" && method === "GET")
      return this.list((n) => n.state === "active" && n.isArchived);
    if (id === "bulk") return this.bulk(action, body);

    if (action === "revisions")
      return this.revisions(method, id, subId, subAction, req);
    if (action === "attachments")
      return this.attachments(method, id, subId, req);
    if (action === "shares") {
      this.find(id);
      if (method === "GET") return [];
      return fail(400, "Sharing needs an Anchor server");
    }
    if (action === "link") {
      this.find(id);
      if (method === "GET") return { link: null };
      return fail(400, "Share links need an Anchor server");
    }

    const note = this.find(id);
    switch (`${method} ${action ?? ""}`) {
      case "GET ":
        return this.toNote(note);
      case "PATCH ":
        return this.updateNote(note, body);
      case "DELETE ":
        return this.trash(note, req.query.get("trashedAt") ?? undefined);
      case "PATCH restore":
        if (note.state !== "trashed") fail(404, "Note is not in trash");
        note.state = "active";
        note.version++;
        note.stateChangedAt = now();
        return this.toNote(note);
      case "DELETE permanent":
        if (note.isFrozen) fail(403, FROZEN);
        await this.destroy(note);
        return this.toNote(note);
      case "PATCH position":
        note.position = (body.position as number | null) ?? null;
        note.positionedAt = note.position === null ? null : now();
        return { id, position: note.position };
      case "PATCH lock":
        note.lock = (body.lock as NoteLockKind | null) ?? null;
        return { id, lock: note.lock };
      case "PATCH freeze": {
        const isFrozen = !!body.isFrozen;
        if (isFrozen && note.state !== "active")
          fail(400, "Only active notes can be frozen");
        if (note.isFrozen !== isFrozen) {
          note.isFrozen = isFrozen;
          note.version++;
        }
        return this.toNote(note);
      }
      case "POST copy":
        return this.copyNote(note);
    }
    return fail(404, `Cannot ${method} /api/notes/${rest.join("/")}`);
  }

  private createNote(body: Body): Note {
    const id = typeof body.id === "string" ? body.id : newId();
    const existing = this.data.notes.find((n) => n.id === id);
    if (existing) return this.toNote(existing);
    const time = now();
    const note: StoredNote = {
      id,
      title: String(body.title ?? ""),
      content: typeof body.content === "string" ? body.content : null,
      version: 1,
      background: (body.background as string | null | undefined) ?? null,
      state: "active",
      isFrozen: false,
      createdAt: time,
      updatedAt: time,
      stateChangedAt: time,
      tagIds: this.ownTagIds(body.tagIds),
      isPinned: !!body.isPinned,
      isArchived: !!body.isArchived,
      position: null,
      positionedAt: null,
      lock: null,
      reminder: null,
    };
    this.setReminder(note, body.reminder as NoteReminderInput | null);
    this.data.notes.push(note);
    return this.toNote(note);
  }

  private updateNote(note: StoredNote, body: Body) {
    if (note.state === "deleted") fail(404, NOT_FOUND);
    const title = body.title as string | undefined;
    const content = body.content as string | null | undefined;
    const background = body.background as string | null | undefined;
    const contentChanged =
      (title !== undefined && title !== note.title) ||
      (content !== undefined && content !== note.content);
    const changed =
      contentChanged ||
      (background !== undefined && background !== note.background);
    if (changed && note.isFrozen) fail(403, FROZEN);
    const baseVersion = body.baseVersion as number | undefined;
    if (baseVersion !== undefined && baseVersion !== note.version) {
      if (contentChanged)
        this.recordConflict(note, title ?? note.title, content, baseVersion);
      throw new HttpError(409, {
        statusCode: 409,
        message: "Note was changed by someone else",
        serverNote: this.toNote(note),
      });
    }
    if (changed) {
      if (contentChanged)
        this.recordRevision(note, "edit", !body.replacesOtherEdit);
      if (title !== undefined) note.title = title;
      if (content !== undefined) note.content = content;
      if (background !== undefined) note.background = background;
      note.version++;
    }
    if (body.isPinned !== undefined) note.isPinned = !!body.isPinned;
    if (body.isArchived !== undefined) {
      if (!!body.isArchived !== note.isArchived) note.updatedAt = now();
      note.isArchived = !!body.isArchived;
    }
    if (body.tagIds !== undefined) note.tagIds = this.ownTagIds(body.tagIds);
    this.setReminder(note, body.reminder as NoteReminderInput | null);
    if (changed) note.updatedAt = now();
    return this.toNote(note);
  }

  private setReminder(
    note: StoredNote,
    input: NoteReminderInput | null | undefined,
  ) {
    if (input === undefined) return;
    if (input === null) {
      note.reminder = null;
      return;
    }
    const recurrence = input.recurrence ?? "none";
    const prior = note.reminder;
    if (
      prior &&
      prior.remindAt === input.remindAt &&
      prior.recurrence === recurrence
    )
      return;
    note.reminder = {
      remindAt: input.remindAt,
      recurrence,
      version: (prior?.version ?? 0) + 1,
    };
  }

  private trash(note: StoredNote, trashedAt?: string) {
    if (note.isFrozen) fail(403, FROZEN);
    if (note.state !== "trashed") {
      note.state = "trashed";
      note.version++;
      note.stateChangedAt =
        trashedAt && !Number.isNaN(Date.parse(trashedAt))
          ? new Date(trashedAt).toISOString()
          : now();
    }
    return this.toNote(note);
  }

  private async destroy(note: StoredNote) {
    if (note.state !== "deleted") {
      note.state = "deleted";
      note.version++;
      note.stateChangedAt = now();
    }
    for (const attachment of this.attachmentsOf(note.id))
      await this.removeAttachment(attachment);
    this.data.revisions = this.data.revisions.filter(
      (r) => r.noteId !== note.id,
    );
  }

  private purgeExpiredTrash() {
    const cutoff = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    for (const note of this.data.notes)
      if (
        note.state === "trashed" &&
        !note.isFrozen &&
        Date.parse(note.stateChangedAt) < cutoff
      )
        void this.destroy(note);
    this.data.notes = this.data.notes.filter((n) => n.state !== "deleted");
  }

  private async copyNote(original: StoredNote) {
    const copy = this.createNote({
      title: original.title,
      content: original.content ?? undefined,
      background: original.background ?? undefined,
      tagIds: original.tagIds,
    });
    const stored = this.find(copy.id);
    const ids = new Map<string, string>();
    for (const attachment of this.attachmentsOf(original.id)) {
      const blob = await this.storage.getFile(attachment.id);
      const id = newId();
      ids.set(attachment.id, id);
      this.data.attachments.push({ ...attachment, id, noteId: stored.id });
      if (blob) await this.storage.putFile(id, blob);
    }
    if (stored.content) {
      let content = stored.content;
      for (const [from, to] of ids) content = content.split(from).join(to);
      stored.content = content;
    }
    stored.lock = original.lock;
    return this.toNote(stored);
  }

  private bulk(action: string, body: Body) {
    const ids = new Set((body.noteIds as string[] | undefined) ?? []);
    const notes = this.data.notes.filter(
      (n) => ids.has(n.id) && n.state !== "deleted",
    );
    let count = notes.length;
    for (const note of notes) {
      switch (action) {
        case "delete":
          if (note.isFrozen) count--;
          else if (note.state !== "trashed") {
            note.state = "trashed";
            note.version++;
            note.stateChangedAt = now();
          }
          break;
        case "archive":
          note.isArchived = true;
          break;
        case "pin":
          note.isPinned = !!body.isPinned;
          break;
        case "lock":
          note.lock = (body.lock as NoteLockKind | null) ?? null;
          break;
        case "freeze": {
          const isFrozen = !!body.isFrozen;
          if (isFrozen && note.state !== "active") count--;
          else if (note.isFrozen !== isFrozen) {
            note.isFrozen = isFrozen;
            note.version++;
          }
          break;
        }
        case "tags":
          note.tagIds = [
            ...new Set([...note.tagIds, ...this.ownTagIds(body.tagIds)]),
          ];
          break;
        default:
          return fail(404, `Cannot POST /api/notes/bulk/${action}`);
      }
    }
    return { count };
  }

  // History

  private recordRevision(
    note: StoredNote,
    cause: NoteRevisionCause,
    collapse = false,
  ) {
    const newest = this.revisionsOf(note.id)[0];
    if (
      collapse &&
      cause === "edit" &&
      newest?.cause === "edit" &&
      Date.now() - Date.parse(newest.createdAt) < REVISION_COLLAPSE_WINDOW_MS
    )
      return;
    this.data.revisions.push({
      id: newId(),
      noteId: note.id,
      version: note.version,
      title: note.title,
      content: note.content,
      cause,
      createdAt: now(),
    });
  }

  private recordConflict(
    note: StoredNote,
    title: string,
    content: string | null | undefined,
    baseVersion: number,
  ) {
    const rejected = content !== undefined ? content : note.content;
    if (
      this.revisionsOf(note.id).some(
        (r) => r.title === title && r.content === rejected,
      )
    )
      return;
    this.data.revisions.push({
      id: newId(),
      noteId: note.id,
      version: baseVersion,
      title,
      content: rejected,
      cause: "conflict",
      createdAt: now(),
    });
  }

  private revisionsOf(noteId: string) {
    return this.data.revisions
      .filter((r) => r.noteId === noteId)
      .sort(
        (a, b) =>
          b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
      );
  }

  private revisions(
    method: string,
    noteId: string,
    revisionId: string | undefined,
    action: string | undefined,
    req: Request,
  ) {
    const note = this.find(noteId);
    const author = {
      id: this.data.user.id,
      name: this.data.user.name,
      email: this.data.user.email,
      profileImage: this.data.user.profileImage ?? null,
    };
    const all = this.revisionsOf(noteId);
    if (!revisionId) {
      const cursor = req.query.get("cursor");
      const start = cursor ? all.findIndex((r) => r.id === cursor) + 1 : 0;
      const page = all.slice(start, start + REVISION_PAGE_SIZE);
      return {
        revisions: page.map(({ content: _, ...r }) => ({ ...r, author })),
        nextCursor:
          start + REVISION_PAGE_SIZE < all.length
            ? page[page.length - 1].id
            : null,
      };
    }
    const revision = all.find((r) => r.id === revisionId);
    if (!revision) return fail(404, "Revision not found");
    if (method === "POST" && action === "restore") {
      if (note.state !== "active") fail(404, NOT_FOUND);
      if (note.isFrozen) fail(403, FROZEN);
      if (revision.title !== note.title || revision.content !== note.content) {
        this.recordRevision(note, "restore");
        note.title = revision.title;
        note.content = revision.content;
        note.version++;
        note.updatedAt = now();
      }
      return this.toNote(note);
    }
    return { ...revision, author };
  }

  // Attachments

  private attachmentsOf(noteId: string) {
    return this.data.attachments
      .filter((a) => a.noteId === noteId)
      .sort((a, b) => a.position - b.position);
  }

  private async removeAttachment(attachment: StoredAttachment) {
    this.data.attachments = this.data.attachments.filter(
      (a) => a.id !== attachment.id,
    );
    await this.storage.deleteFile(attachment.id);
  }

  private async addAttachment(
    note: StoredNote,
    file: File,
    clientId?: string,
    position?: number,
  ): Promise<NoteAttachment> {
    const taken = clientId
      ? this.data.attachments.find((a) => a.id === clientId)
      : undefined;
    if (taken && taken.noteId === note.id) return taken;
    const id = clientId && !taken ? clientId : newId();
    if (position === undefined)
      for (const a of this.attachmentsOf(note.id)) a.position++;
    const attachment: StoredAttachment = {
      id,
      noteId: note.id,
      type: attachmentType(file.type),
      originalFilename: file.name || "file",
      mimeType: file.type || "application/octet-stream",
      fileSize: file.size,
      position: position ?? 0,
      uploadedByUserId: this.data.user.id,
      createdAt: now(),
    };
    await this.storage.putFile(id, file);
    this.data.attachments.push(attachment);
    note.updatedAt = now();
    return attachment;
  }

  private async attachments(
    method: string,
    noteId: string,
    id: string | undefined,
    req: Request,
  ) {
    const note = this.find(noteId);
    if (!id) {
      if (method === "GET") return this.attachmentsOf(noteId);
      if (note.isFrozen) fail(403, FROZEN);
      const file = req.form?.get("file");
      if (!(file instanceof File)) return fail(400, "No file");
      const clientId = req.form?.get("id");
      return this.addAttachment(
        note,
        file,
        typeof clientId === "string" ? clientId : undefined,
      );
    }
    if (id === "reorder" && method === "PATCH") {
      const order = ((req.body as Body)?.orderedIds as string[]) ?? [];
      order.forEach((attachmentId, position) => {
        const attachment = this.data.attachments.find(
          (a) => a.id === attachmentId && a.noteId === noteId,
        );
        if (attachment) attachment.position = position;
      });
      note.updatedAt = now();
      return this.attachmentsOf(noteId);
    }
    const attachment = this.data.attachments.find(
      (a) => a.id === id && a.noteId === noteId,
    );
    if (!attachment) return fail(404, "Attachment not found");
    if (method === "DELETE") {
      if (note.isFrozen) fail(403, FROZEN);
      await this.removeAttachment(attachment);
      note.updatedAt = now();
      return { success: true };
    }
    const blob = await this.storage.getFile(id);
    if (!blob) return fail(404, "Attachment not found");
    return new Response(blob, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(blob.size),
      },
    });
  }

  // Note locks

  private async noteLocks(method: string, rest: string[], body: Body) {
    const user = this.data.user;
    const secrets = () => ({
      pin: user.lockPin,
      pattern: user.lockPattern,
      hasPassword: false,
    });
    const [kind] = rest;
    if (!kind) return secrets();
    if (kind === "verify") {
      const stored =
        body.kind === "pin"
          ? user.lockPin
          : body.kind === "pattern"
            ? user.lockPattern
            : null;
      return {
        ok: !!stored && (await lockSecretMatches(String(body.secret), stored)),
      };
    }
    if (method === "PUT" && (kind === "pin" || kind === "pattern")) {
      const secret = String(body.secret ?? "");
      if (kind === "pin" ? !/^\d{4,12}$/.test(secret) : secret.length < 4)
        fail(
          400,
          kind === "pin"
            ? "A PIN is 4 to 12 digits"
            : "A pattern joins at least 4 dots",
        );
      const stored = kind === "pin" ? user.lockPin : user.lockPattern;
      if (
        stored &&
        !(
          typeof body.current === "string" &&
          (await lockSecretMatches(body.current, stored))
        )
      )
        fail(403, kind === "pin" ? "Wrong PIN" : "Wrong pattern");
      const hash = await hashLockSecret(secret);
      if (kind === "pin") user.lockPin = hash;
      else user.lockPattern = hash;
      return secrets();
    }
    return fail(404, "Not found");
  }

  // Tags

  private ownTagIds(ids: unknown): string[] {
    if (!Array.isArray(ids)) return [];
    return ids.filter((id) => this.data.tags.some((tag) => tag.id === id));
  }

  private toTag(tag: StoredTag) {
    return {
      ...tag,
      _count: {
        notes: this.data.notes.filter(
          (n) => n.state === "active" && n.tagIds.includes(tag.id),
        ).length,
      },
    };
  }

  private allTags() {
    return [...this.data.tags]
      .sort(
        (a, b) =>
          (a.position ?? Number.POSITIVE_INFINITY) -
            (b.position ?? Number.POSITIVE_INFINITY) ||
          a.name.localeCompare(b.name),
      )
      .map((tag) => this.toTag(tag));
  }

  private tags(method: string, rest: string[], body: Body) {
    const [id] = rest;
    if (!id) {
      if (method === "GET") return this.allTags();
      const name = String(body.name ?? "").trim();
      if (this.data.tags.some((t) => t.name === name))
        fail(409, "A tag with this name already exists");
      const tag: StoredTag = {
        id: newId(),
        name,
        color: body.color as string | undefined,
        position: null,
        version: 1,
        updatedAt: now(),
      };
      this.data.tags.push(tag);
      return this.toTag(tag);
    }
    if (id === "order" && method === "PUT") {
      const ids = (body.ids as string[]) ?? [];
      ids.forEach((tagId, position) => {
        const tag = this.data.tags.find((t) => t.id === tagId);
        if (tag) tag.position = position;
      });
      return this.allTags();
    }
    const tag = this.data.tags.find((t) => t.id === id);
    if (!tag) return fail(404, "Tag not found");
    if (method === "GET") return this.toTag(tag);
    if (method === "DELETE") {
      this.data.tags = this.data.tags.filter((t) => t !== tag);
      for (const note of this.data.notes)
        note.tagIds = note.tagIds.filter((tagId) => tagId !== id);
      return { ...tag, isDeleted: true };
    }
    if (method === "PATCH") {
      const name = body.name as string | undefined;
      if (name && this.data.tags.some((t) => t.name === name && t !== tag))
        fail(409, "A tag with this name already exists");
      if (body.baseVersion !== undefined && body.baseVersion !== tag.version)
        throw new HttpError(409, {
          statusCode: 409,
          message: "Tag was changed by someone else",
          serverTag: this.toTag(tag),
        });
      const changed =
        (name !== undefined && name !== tag.name) ||
        (body.color !== undefined && body.color !== tag.color);
      if (name !== undefined) tag.name = name;
      if (body.color !== undefined) tag.color = body.color as string;
      if (changed) tag.version++;
      tag.updatedAt = now();
      return this.toTag(tag);
    }
    return fail(404, "Not found");
  }

  // Import and export, in the server's "anchor" format.

  private async export(format: string | null) {
    if (format === "markdown")
      fail(400, "Markdown export needs an Anchor server");
    const files: Record<string, Uint8Array> = {};
    const notes = [];
    for (const note of this.data.notes) {
      if (note.state === "deleted") continue;
      const attachments = [];
      for (const a of this.attachmentsOf(note.id)) {
        const ext = a.originalFilename.match(/\.[^.]+$/)?.[0].toLowerCase();
        const archivePath = `attachments/${note.id}/${a.id}${ext ?? ""}`;
        const blob = await this.storage.getFile(a.id);
        if (blob) files[archivePath] = new Uint8Array(await blob.arrayBuffer());
        attachments.push({
          id: a.id,
          type: a.type,
          originalFilename: a.originalFilename,
          mimeType: a.mimeType,
          fileSize: a.fileSize,
          position: a.position,
          archivePath,
        });
      }
      notes.push({
        id: note.id,
        origin: "owned",
        title: note.title,
        content: note.content,
        state: note.state,
        isArchived: note.isArchived,
        isPinned: note.isPinned,
        background: note.background,
        tagIds: note.tagIds,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        attachments,
        ...(note.reminder
          ? {
              reminder: {
                remindAt: note.reminder.remindAt,
                recurrence: note.reminder.recurrence,
              },
            }
          : {}),
      });
    }
    const manifest = {
      format: "anchor-export",
      version: 1,
      exportedAt: now(),
      server: { version: APP_VERSION ?? null },
      user: { id: this.data.user.id, email: this.data.user.email },
      counts: {
        notes: notes.length,
        tags: this.data.tags.length,
        attachments: notes.reduce((sum, n) => sum + n.attachments.length, 0),
      },
      tags: this.data.tags.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color ?? null,
      })),
      notes,
      warnings: [],
    };
    files["manifest.json"] = new TextEncoder().encode(
      JSON.stringify(manifest, null, 2),
    );
    const zip = zipSync(files, { level: 0 });
    const date = now().slice(0, 10);
    return new Response(new Blob([zip as BlobPart]), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="anchor-export-${date}.zip"`,
      },
    });
  }

  private async import(method: string, rest: string[], req: Request) {
    if (method !== "POST" || rest[0] !== "notes") return fail(404, "Not found");
    if (rest[1]) {
      const note = this.find(rest[1]);
      const file = req.form?.get("file");
      if (!(file instanceof File)) return fail(400, "No file");
      const position = Number(req.form?.get("position") ?? 0);
      return this.addAttachment(note, file, undefined, position);
    }
    const body = (req.body ?? {}) as Body;
    const palette = (body.tags as { name: string; color?: string }[]) ?? [];
    const items = (body.notes as Body[]) ?? [];
    const idByName = new Map(this.data.tags.map((t) => [t.name, t.id]));
    let created = 0;
    let reused = 0;
    const names = new Set(items.flatMap((n) => (n.tagNames as string[]) ?? []));
    for (const name of names) {
      if (idByName.has(name)) {
        reused++;
        continue;
      }
      const tag: StoredTag = {
        id: newId(),
        name,
        color: palette.find((p) => p.name === name)?.color,
        position: null,
        version: 1,
        updatedAt: now(),
      };
      this.data.tags.push(tag);
      idByName.set(name, tag.id);
      created++;
    }
    const results = items.map((item) => {
      const ref = String(item.ref);
      const id = typeof item.id === "string" ? item.id : undefined;
      const existing = id && this.data.notes.find((n) => n.id === id);
      if (existing && body.skipExisting && existing.state !== "deleted")
        return { ref, status: "skipped", noteId: id };
      const note = this.createNote({
        id: existing ? undefined : id,
        title: item.title,
        content: item.content,
        background: item.background,
        isPinned: item.isPinned,
        isArchived: item.isArchived,
        tagIds: ((item.tagNames as string[]) ?? []).map((n) => idByName.get(n)),
      });
      const stored = this.find(note.id);
      if (typeof item.createdAt === "string") stored.createdAt = item.createdAt;
      if (typeof item.updatedAt === "string") stored.updatedAt = item.updatedAt;
      if (item.isTrashed) {
        stored.state = "trashed";
        stored.stateChangedAt = now();
      }
      return {
        ref,
        status: existing ? "remapped" : "created",
        noteId: note.id,
      };
    });
    return { results, tags: { created, reused } };
  }
}

function attachmentType(mime: string): StoredAttachment["type"] {
  if (/^image\/(jpeg|png|webp|gif)$/.test(mime)) return "image";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// PIN and pattern hashes, in the server's format (PBKDF2-SHA256).
const LOCK_HASH_ITERATIONS = 20000;

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text: string) =>
  Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function pbkdf2(
  secret: string,
  salt: Uint8Array,
  iterations: number,
  length: number,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

async function hashLockSecret(secret: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(secret, salt, LOCK_HASH_ITERATIONS, 32);
  return [
    "pbkdf2-sha256",
    LOCK_HASH_ITERATIONS,
    toBase64(salt),
    toBase64(hash),
  ].join("$");
}

async function lockSecretMatches(secret: string, stored: string) {
  const [scheme, iterations, salt, hash] = stored.split("$");
  if (scheme !== "pbkdf2-sha256" || !salt || !hash) return false;
  const expected = fromBase64(hash);
  const actual = await pbkdf2(
    secret,
    fromBase64(salt),
    Number(iterations),
    expected.length,
  );
  return toBase64(actual) === toBase64(expected);
}

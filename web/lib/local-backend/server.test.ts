import { unzipSync } from "fflate";
import { beforeEach, describe, expect, it } from "vitest";
import type { Note } from "@/features/notes/types";
import { memoryStorage } from "./db";
import { LocalServer } from "./server";

let server: LocalServer;

async function call<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; body: T }> {
  const response = await server.handle(
    new Request(`http://localhost/api/${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

const createNote = async (title = "Plan", content?: string) =>
  (await call<Note>("POST", "notes", { title, content })).body;

beforeEach(() => {
  server = new LocalServer(memoryStorage());
});

describe("LocalServer", () => {
  it("signs in its one person", async () => {
    const me = await call<{ name: string; hasPassword: boolean }>(
      "GET",
      "auth/me",
    );
    expect(me.status).toBe(200);
    expect(me.body.name).toBe("You");
    expect(me.body.hasPassword).toBe(false);
  });

  it("lists active notes, newest first, without archived or trashed ones", async () => {
    const first = await createNote("First");
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await createNote("Second");
    const archived = await createNote("Archived");
    await call("PATCH", `notes/${archived.id}`, { isArchived: true });
    const trashed = await createNote("Trashed");
    await call("DELETE", `notes/${trashed.id}`);

    const notes = (await call<Note[]>("GET", "notes")).body;
    expect(notes.map((n) => n.id)).toEqual([second.id, first.id]);
    expect((await call<Note[]>("GET", "notes/archive")).body).toHaveLength(1);
    const trash = (await call<Note[]>("GET", "notes/trash")).body;
    expect(trash.map((n) => n.id)).toEqual([trashed.id]);
    expect(trash[0].stateChangedAt).toBeDefined();
  });

  it("counts a note's text and attachments as its size", async () => {
    const note = await createNote("Café", "hi");
    const form = new FormData();
    form.append(
      "file",
      new File([new Uint8Array(300)], "a.png", { type: "image/png" }),
    );
    await server.handle(
      new Request(`http://localhost/api/notes/${note.id}/attachments`, {
        method: "POST",
        body: form,
      }),
    );

    const [listed] = (await call<Note[]>("GET", "notes")).body;
    // "Café" is 5 bytes, "hi" 2.
    expect(listed.storageSize).toBe(5 + 2 + 300);
  });

  it("refuses an edit made on an older version, keeping it in the history", async () => {
    const note = await createNote("Plan", "a");
    const saved = await call<Note>("PATCH", `notes/${note.id}`, {
      content: "b",
      baseVersion: note.version,
    });
    expect(saved.body.version).toBe(note.version + 1);

    const stale = await call<{ serverNote: Note }>(
      "PATCH",
      `notes/${note.id}`,
      {
        content: "c",
        baseVersion: note.version,
      },
    );
    expect(stale.status).toBe(409);
    expect(stale.body.serverNote.content).toBe("b");

    const history = await call<{ revisions: { cause: string }[] }>(
      "GET",
      `notes/${note.id}/revisions`,
    );
    expect(history.body.revisions.map((r) => r.cause).sort()).toEqual([
      "conflict",
      "edit",
    ]);
  });

  it("keeps a frozen note as it is", async () => {
    const note = await createNote("Plan", "a");
    const frozen = await call<Note>("PATCH", `notes/${note.id}/freeze`, {
      isFrozen: true,
    });
    expect(frozen.body.isFrozen).toBe(true);
    expect(
      (await call("PATCH", `notes/${note.id}`, { content: "b" })).status,
    ).toBe(403);
    expect((await call("DELETE", `notes/${note.id}`)).status).toBe(403);
    // Pins don't change the note.
    expect(
      (await call("PATCH", `notes/${note.id}`, { isPinned: true })).status,
    ).toBe(200);
    expect(
      (
        await call<{ count: number }>("POST", "notes/bulk/delete", {
          noteIds: [note.id],
        })
      ).body.count,
    ).toBe(0);
  });

  it("restores a version, recording the text it replaces", async () => {
    const note = await createNote("Plan", "first");
    await call("PATCH", `notes/${note.id}`, { content: "second" });
    const { revisions } = (
      await call<{ revisions: { id: string }[] }>(
        "GET",
        `notes/${note.id}/revisions`,
      )
    ).body;
    const restored = await call<Note>(
      "POST",
      `notes/${note.id}/revisions/${revisions[0].id}/restore`,
    );
    expect(restored.body.content).toBe("first");
    const after = (
      await call<{ revisions: { cause: string }[] }>(
        "GET",
        `notes/${note.id}/revisions`,
      )
    ).body.revisions;
    expect(after.map((r) => r.cause)).toContain("restore");
  });

  it("copies a note with its tags", async () => {
    const tag = (await call<{ id: string }>("POST", "tags", { name: "Work" }))
      .body;
    const note = (
      await call<Note>("POST", "notes", { title: "Plan", tagIds: [tag.id] })
    ).body;
    const copy = (await call<Note>("POST", `notes/${note.id}/copy`)).body;
    expect(copy.id).not.toBe(note.id);
    expect(copy.tagIds).toEqual([tag.id]);
    const tags = (await call<{ _count: { notes: number } }[]>("GET", "tags"))
      .body;
    expect(tags[0]._count.notes).toBe(2);
  });

  it("deleting a tag takes it off its notes", async () => {
    const tag = (await call<{ id: string }>("POST", "tags", { name: "Work" }))
      .body;
    const note = (
      await call<Note>("POST", "notes", { title: "Plan", tagIds: [tag.id] })
    ).body;
    expect((await call("POST", "tags", { name: "Work" })).status).toBe(409);
    await call("DELETE", `tags/${tag.id}`);
    expect((await call<Note>("GET", `notes/${note.id}`)).body.tagIds).toEqual(
      [],
    );
  });

  it("checks a note lock PIN against its hash", async () => {
    const secrets = await call<{ pin: string }>("PUT", "note-locks/pin", {
      secret: "1234",
    });
    expect(secrets.body.pin).toMatch(/^pbkdf2-sha256\$/);
    const verify = (secret: string) =>
      call<{ ok: boolean }>("POST", "note-locks/verify", {
        kind: "pin",
        secret,
      });
    expect((await verify("1234")).body.ok).toBe(true);
    expect((await verify("9999")).body.ok).toBe(false);
    // Replacing it takes the old one.
    expect(
      (await call("PUT", "note-locks/pin", { secret: "5678" })).status,
    ).toBe(403);
  });

  it("exports a backup the import reads back", async () => {
    const tag = (await call<{ id: string }>("POST", "tags", { name: "Work" }))
      .body;
    await call("POST", "notes", { title: "Plan", tagIds: [tag.id] });
    const response = await server.handle(
      new Request("http://localhost/api/export?format=anchor"),
    );
    const files = unzipSync(new Uint8Array(await response.arrayBuffer()));
    const manifest = JSON.parse(
      new TextDecoder().decode(files["manifest.json"]),
    );
    expect(manifest.format).toBe("anchor-export");
    expect(manifest.notes[0]).toMatchObject({
      title: "Plan",
      tagIds: [tag.id],
    });

    server = new LocalServer(memoryStorage());
    const imported = await call<{ results: { status: string }[] }>(
      "POST",
      "import/notes",
      {
        notes: [{ ref: "1", title: "Plan", tagNames: ["Work"] }],
        tags: [{ name: "Work", color: "#64B5F6" }],
      },
    );
    expect(imported.body.results[0].status).toBe("created");
    const notes = (await call<Note[]>("GET", "notes")).body;
    expect(notes[0].tagIds).toHaveLength(1);
  });

  it("answers what needs a server with an error", async () => {
    expect((await call("GET", "admin/stats")).status).toBe(403);
    expect((await call("GET", "nothing/here")).status).toBe(404);
  });
});

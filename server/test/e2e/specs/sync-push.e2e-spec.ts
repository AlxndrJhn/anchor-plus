import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  Actor,
  createE2EApp,
  E2EApp,
  NoteOnWire,
  SyncTagOnWire,
  TagOnWire,
} from '../support';

/**
 * The push half of the sync endpoint: the version check every write goes
 * through, what a losing write leaves behind, and the same contract as the web
 * client sees it on PATCH.
 */
describe('sync push', () => {
  let ctx: E2EApp;
  let user: Actor;

  beforeAll(async () => {
    ctx = await createE2EApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await ctx.resetDb();
    user = await ctx.registerUser();
  });

  it('a push with the current baseVersion applies, bumps version, and preserves a revision', async () => {
    const note = await user.notes.create({ title: 'original', content: 'one' });

    const res = await user.sync.push([
      {
        type: 'note',
        id: note.id,
        baseVersion: 1,
        title: 'pushed',
        content: 'two',
      },
    ]);

    expect(res.results).toEqual([
      { type: 'note', id: note.id, status: 'applied', version: 2 },
    ]);
    const row = await ctx.prisma.note.findUniqueOrThrow({
      where: { id: note.id },
    });
    expect(row).toMatchObject({ title: 'pushed', version: 2 });
    expect(
      await ctx.prisma.noteRevision.findFirst({ where: { noteId: note.id } }),
    ).toMatchObject({ title: 'original', content: 'one', cause: 'edit' });
  });

  // An item ticked from the card: the note keeps its place in the list.
  it('a note placed after its edit keeps its place; otherwise the edit moves it up', async () => {
    const placedAt = async (id: string) => {
      const [note, order] = await Promise.all([
        ctx.prisma.note.findUniqueOrThrow({ where: { id } }),
        ctx.prisma.noteOrder.findUniqueOrThrow({
          where: { userId_noteId: { userId: user.id, noteId: id } },
        }),
      ]);
      return order.updatedAt.getTime() - note.updatedAt.getTime();
    };
    const kept = await user.notes.create({ title: 'list', content: 'one' });
    const moved = await user.notes.create({ title: 'list', content: 'one' });

    await user.sync.push([
      {
        type: 'note',
        id: kept.id,
        baseVersion: 1,
        title: 'list',
        content: 'ticked',
        position: 1000,
        placedAfterEdit: true,
      },
      {
        type: 'note',
        id: moved.id,
        baseVersion: 1,
        title: 'list',
        content: 'edited',
        position: 2000,
      },
    ]);

    expect(await placedAt(kept.id)).toBeGreaterThanOrEqual(0);
    expect(await placedAt(moved.id)).toBeLessThanOrEqual(0);
  });

  it('a stale or absent baseVersion conflicts, preserving the payload as a conflict revision', async () => {
    const note = await user.notes.create({ title: 'original' });
    await user.notes.update(note.id, { title: 'edited' });

    const stale = await user.sync.push([
      { type: 'note', id: note.id, baseVersion: 1, title: 'from stale device' },
    ]);
    expect(stale.results[0].status).toBe('conflict');
    expect(stale.results[0].serverCopy).toMatchObject({
      id: note.id,
      title: 'edited',
      version: 2,
    });

    // The absent-baseVersion form (mid-cutover race) loses the same way.
    const absent = await user.sync.push([
      { type: 'note', id: note.id, title: 'unreconciled' },
    ]);
    expect(absent.results[0].status).toBe('conflict');

    const conflicts = await ctx.prisma.noteRevision.findMany({
      where: { noteId: note.id, cause: 'conflict' },
      orderBy: { createdAt: 'asc' },
    });
    expect(conflicts).toHaveLength(2);
    expect(conflicts[0]).toMatchObject({
      title: 'from stale device',
      version: 1,
    });
    expect(conflicts[1]).toMatchObject({ title: 'unreconciled', version: 0 });

    // Server content survived both pushes.
    expect(
      (await ctx.prisma.note.findUniqueOrThrow({ where: { id: note.id } }))
        .title,
    ).toBe('edited');
  });

  it('an unknown id creates the note at version 1', async () => {
    const id = crypto.randomUUID();
    const res = await user.sync.push([
      { type: 'note', id, title: 'device-born', content: 'body' },
    ]);

    expect(res.results).toEqual([
      { type: 'note', id, status: 'applied', version: 1 },
    ]);
    expect(
      await ctx.prisma.note.findUniqueOrThrow({ where: { id } }),
    ).toMatchObject({ userId: user.id, title: 'device-born', version: 1 });
  });

  // Older apps still send the dropped invisible flag; it is stripped, not refused.
  it('ignores a retired isInvisible flag from older apps', async () => {
    const id = crypto.randomUUID();
    const res = await user.sync.push([
      { type: 'note', id, title: 'old app', content: null, isInvisible: true },
    ]);
    expect(res.results).toEqual([
      { type: 'note', id, status: 'applied', version: 1 },
    ]);

    await user.http
      .patch(`/api/notes/${id}`)
      .send({ title: 'old web', baseVersion: 1, isInvisible: false })
      .expect(200);
    await user.http
      .post('/api/notes')
      .send({ title: 'old create', isInvisible: true })
      .expect(201);
  });

  it('refuses an id that is not a UUID, which would name a folder outside attachments', async () => {
    await user.http
      .post('/api/sync')
      .send({ changes: [{ type: 'note', id: '../escape', title: 'x' }] })
      .expect(400);
    expect(
      await ctx.prisma.note.findUnique({ where: { id: '../escape' } }),
    ).toBeNull();
  });

  it('a push carrying a baseVersion for a purged note is denied, not recreated', async () => {
    const id = crypto.randomUUID();

    const res = await user.sync.push([
      { type: 'note', id, baseVersion: 3, title: 'long offline' },
    ]);

    expect(res.results).toEqual([{ type: 'note', id, status: 'denied' }]);
    expect(await ctx.prisma.note.findUnique({ where: { id } })).toBeNull();
  });

  it('a redelivered push acks at the current version instead of conflicting', async () => {
    const note = await user.notes.create({ title: 'original' });
    const change = {
      type: 'note',
      id: note.id,
      baseVersion: 1,
      title: 'typed once',
    };

    const first = await user.sync.push([change]);
    expect(first.results[0]).toMatchObject({ status: 'applied', version: 2 });

    const retry = await user.sync.push([change]);

    expect(retry.results).toEqual([
      { type: 'note', id: note.id, status: 'applied', version: 2 },
    ]);
    expect(
      await ctx.prisma.noteRevision.count({
        where: { noteId: note.id, cause: 'conflict' },
      }),
    ).toBe(0);
  });

  it('a push against an inaccessible note is denied and writes nothing', async () => {
    const stranger = await ctx.registerUser();
    const note = await stranger.notes.create({ title: 'private' });

    const res = await user.sync.push([
      { type: 'note', id: note.id, baseVersion: 1, title: 'intruder' },
      { type: 'pin', id: note.id, isPinned: true },
    ]);

    expect(res.results.map((r) => r.status)).toEqual(['denied', 'denied']);
    expect(
      (await ctx.prisma.note.findUniqueOrThrow({ where: { id: note.id } }))
        .title,
    ).toBe('private');
  });

  it('viewers lose content pushes as conflicts but their pins apply', async () => {
    const viewer = await ctx.registerUser();
    const note = await user.notes.create({ title: 'shared' });
    await user.shares.grant(note.id, viewer.id, 'viewer');

    const res = await viewer.sync.push([
      { type: 'note', id: note.id, baseVersion: 1, title: 'viewer edit' },
      { type: 'pin', id: note.id, isPinned: true },
    ]);

    expect(res.results[0].status).toBe('conflict');
    expect(res.results[1].status).toBe('applied');
    expect(
      await ctx.prisma.notePin.findUnique({
        where: { userId_noteId: { userId: viewer.id, noteId: note.id } },
      }),
    ).toBeTruthy();
    // The viewer's rejected text still made it into history.
    expect(
      await ctx.prisma.noteRevision.findFirst({
        where: { noteId: note.id, cause: 'conflict' },
      }),
    ).toMatchObject({ title: 'viewer edit', authorUserId: viewer.id });
  });

  it('pin pushes round-trip through the feed without touching note versions', async () => {
    const note = await user.notes.create({ title: 'pinnable' });
    const { cursor } = await user.sync.drain();

    await user.sync.push([{ type: 'pin', id: note.id, isPinned: true }]);
    let delta = await user.sync.pull({ cursor });
    expect(delta.entries).toEqual([
      expect.objectContaining({
        entityType: 'pin',
        entityId: note.id,
        op: 'upsert',
      }),
    ]);

    await user.sync.push([{ type: 'pin', id: note.id, isPinned: false }]);
    delta = await user.sync.pull({ cursor: delta.nextCursor! });
    expect(delta.entries[0]).toMatchObject({ entityType: 'pin', op: 'remove' });
    expect(
      (await ctx.prisma.note.findUniqueOrThrow({ where: { id: note.id } }))
        .version,
    ).toBe(1);
  });

  it('tag lifecycle: create, stale rename conflicts, matching delete removes', async () => {
    const id = crypto.randomUUID();
    const created = await user.sync.push([{ type: 'tag', id, name: 'inbox' }]);
    expect(created.results[0]).toMatchObject({ status: 'applied', version: 1 });

    const stale = await user.sync.push([
      { type: 'tag', id, name: 'renamed', baseVersion: 5 },
    ]);
    expect(stale.results[0].status).toBe('conflict');
    expect((stale.results[0].serverCopy as SyncTagOnWire).id).toBe(id);

    const deleted = await user.sync.push([
      { type: 'tag', id, name: 'inbox', baseVersion: 1, isDeleted: true },
    ]);
    expect(deleted.results[0]).toMatchObject({ status: 'applied', version: 2 });
    const row = (
      await ctx.prisma.changeLog.findMany({
        where: { recipientUserId: user.id, entityType: 'tag' },
      })
    )[0];
    expect(row.op).toBe('remove');
  });

  it('a tag rename bumps the version, so an older rename conflicts', async () => {
    const id = crypto.randomUUID();
    await user.sync.push([{ type: 'tag', id, name: 'inbox' }]);

    const renamed = await user.sync.push([
      { type: 'tag', id, name: 'work', baseVersion: 1 },
    ]);
    expect(renamed.results[0]).toMatchObject({ status: 'applied', version: 2 });

    // Another device still on version 1 must not undo the rename.
    const stale = await user.sync.push([
      { type: 'tag', id, name: 'home', baseVersion: 1 },
    ]);
    expect(stale.results[0].status).toBe('conflict');
    expect(stale.results[0].serverCopy as SyncTagOnWire).toMatchObject({
      name: 'work',
      version: 2,
    });
  });

  it('a tag create colliding on name returns the surviving tag as a merge instruction', async () => {
    const existing = await user.tags.create({ name: 'work' });
    const localId = crypto.randomUUID();

    const res = await user.sync.push([
      { type: 'tag', id: localId, name: 'work' },
    ]);

    expect(res.results[0].status).toBe('conflict');
    // serverCopy carries a DIFFERENT id: merge the local tag into it.
    expect((res.results[0].serverCopy as SyncTagOnWire).id).toBe(existing.id);
    expect(
      await ctx.prisma.tag.findUnique({ where: { id: localId } }),
    ).toBeNull();
  });

  it('repeated changes for one entity coalesce to the last occurrence', async () => {
    const id = crypto.randomUUID();
    const res = await user.sync.push([
      { type: 'note', id, title: 'first' },
      { type: 'note', id, title: 'last' },
    ]);

    expect(res.results).toHaveLength(1);
    expect(
      (await ctx.prisma.note.findUniqueOrThrow({ where: { id } })).title,
    ).toBe('last');
  });

  it('web PATCH with a stale baseVersion 409s with the server copy and keeps a conflict revision', async () => {
    const note = await user.notes.create({ title: 'original', content: 'one' });
    await user.notes.update(note.id, { title: 'edited', baseVersion: 1 });

    const res = await user.http
      .patch(`/api/notes/${note.id}`)
      .send({ title: 'stale tab', content: 'stale body', baseVersion: 1 })
      .expect(409);
    const body = res.body as { serverNote: NoteOnWire & { version: number } };
    expect(body.serverNote).toMatchObject({
      id: note.id,
      title: 'edited',
      version: 2,
    });
    expect(
      await ctx.prisma.noteRevision.findFirst({
        where: { noteId: note.id, cause: 'conflict' },
      }),
    ).toMatchObject({ title: 'stale tab', content: 'stale body', version: 1 });

    // Legacy PATCH without baseVersion still writes unconditionally.
    await user.notes.update(note.id, { title: 'legacy' });
  });

  it('tag PATCH with a stale baseVersion 409s with the server copy', async () => {
    const tag = await user.tags.create({ name: 'work' });
    await user.tags.update(tag.id, { name: 'renamed', baseVersion: 1 });

    const res = await user.http
      .patch(`/api/tags/${tag.id}`)
      .send({ name: 'stale', baseVersion: 1 })
      .expect(409);
    expect((res.body as { serverTag: TagOnWire }).serverTag).toMatchObject({
      id: tag.id,
      name: 'renamed',
    });
    expect(
      (await ctx.prisma.tag.findUniqueOrThrow({ where: { id: tag.id } })).name,
    ).toBe('renamed');
  });
});

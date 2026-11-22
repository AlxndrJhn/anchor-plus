import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Actor, createE2EApp, E2EApp } from '../support';

/**
 * Several notes put in place at once (PUT /api/notes/positions): a whole
 * list's order when it turns custom on the web, or putting it back with
 * Undo. Places are each person's own and never touch a note's version.
 */
describe('note positions in bulk', () => {
  let ctx: E2EApp;
  let owner: Actor;
  let sharee: Actor;

  beforeAll(async () => {
    ctx = await createE2EApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await ctx.resetDb();
    owner = await ctx.registerUser('Owner');
    sharee = await ctx.registerUser('Sharee');
  });

  const positionOf = async (actor: Actor, id: string) =>
    (await actor.notes.read(id)).position ?? null;

  it('places every note given and leaves the version alone', async () => {
    const a = await owner.notes.create({ title: 'a' });
    const b = await owner.notes.create({ title: 'b' });

    const res = await owner.notes
      .setPositions([
        { noteId: a.id, position: 2000 },
        { noteId: b.id, position: 1000 },
      ])
      .expect(200);

    expect(res.body).toEqual({ count: 2 });
    expect(await positionOf(owner, a.id)).toBe(2000);
    expect(await positionOf(owner, b.id)).toBe(1000);
    const after = await owner.notes.read(a.id);
    expect(after.version).toBe(a.version);
    expect(after.updatedAt).toBe(a.updatedAt);
  });

  it('null forgets a place, as Undo does for a note never placed', async () => {
    const note = await owner.notes.create();
    await owner.notes
      .setPositions([{ noteId: note.id, position: 5 }])
      .expect(200);

    await owner.notes
      .setPositions([{ noteId: note.id, position: null }])
      .expect(200);

    expect(await positionOf(owner, note.id)).toBeNull();
  });

  it("a sharee's order is their own", async () => {
    const note = await owner.notes.create({ title: 'shared' });
    await owner.shares.grant(note.id, sharee.id, 'viewer');
    await owner.notes
      .setPositions([{ noteId: note.id, position: 10 }])
      .expect(200);

    await sharee.notes
      .setPositions([{ noteId: note.id, position: 99 }])
      .expect(200);

    expect(await positionOf(owner, note.id)).toBe(10);
    expect(await positionOf(sharee, note.id)).toBe(99);
  });

  it("leaves out notes the person can't see", async () => {
    const mine = await owner.notes.create();
    const theirs = await sharee.notes.create();

    const res = await owner.notes
      .setPositions([
        { noteId: mine.id, position: 1 },
        { noteId: theirs.id, position: 2 },
      ])
      .expect(200);

    expect(res.body).toEqual({ count: 1 });
    expect(await positionOf(sharee, theirs.id)).toBeNull();
  });

  it('sends the change only to the mover, and only for notes that moved', async () => {
    const moved = await owner.notes.create({ title: 'moved' });
    const still = await owner.notes.create({ title: 'still' });
    await owner.shares.grant(moved.id, sharee.id, 'viewer');
    await owner.notes
      .setPositions([{ noteId: still.id, position: 7 }])
      .expect(200);
    const ownerCursor = (await owner.sync.drain()).cursor;
    const shareeCursor = (await sharee.sync.drain()).cursor;

    await owner.notes
      .setPositions([
        { noteId: moved.id, position: 3 },
        { noteId: still.id, position: 7 },
      ])
      .expect(200);

    const ownerEntries = (await owner.sync.drain({ cursor: ownerCursor }))
      .entries;
    expect(ownerEntries.map((e) => e.entityId)).toEqual([moved.id]);
    expect(ownerEntries[0].note?.position).toBe(3);
    const shareeEntries = (await sharee.sync.drain({ cursor: shareeCursor }))
      .entries;
    expect(shareeEntries).toEqual([]);
  });

  it('rejects bad places and too many notes at once', async () => {
    const note = await owner.notes.create();
    await owner.notes
      .setPositions([{ noteId: note.id, position: 'top' as unknown as number }])
      .expect(400);
    await owner.notes.setPositions([{ noteId: '', position: 1 }]).expect(400);
    await owner.notes
      .setPositions(
        Array.from({ length: 501 }, (_, i) => ({
          noteId: note.id,
          position: i,
        })),
      )
      .expect(400);
  });
});

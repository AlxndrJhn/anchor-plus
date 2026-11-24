import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { NoteShareLinksService } from 'src/notes/services/note-share-links.service';
import { Actor, createE2EApp, E2EApp, entryFor } from '../support';

interface LinkOnWire {
  token: string;
  permission: 'viewer' | 'editor';
}

/**
 * A note's share link opens it without an account: to read it, or with an
 * editing link to change its title and text, until the owner takes it away.
 */
describe('share links', () => {
  let ctx: E2EApp;
  let owner: Actor;
  let other: Actor;

  beforeAll(async () => {
    ctx = await createE2EApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await ctx.resetDb();
    owner = await ctx.registerUser('Owner');
    other = await ctx.registerUser('Other');
  });

  const anyone = () => request(ctx.http);

  const makeLink = async (
    noteId: string,
    permission: LinkOnWire['permission'],
  ) => {
    const res = await owner.http
      .put(`/api/notes/${noteId}/link`)
      .send({ permission })
      .expect(200);
    return (res.body as { link: LinkOnWire }).link;
  };

  it('opens the note read-only without an account', async () => {
    const note = await owner.notes.create({ title: 'Plan', content: 'x' });
    const empty = await owner.http
      .get(`/api/notes/${note.id}/link`)
      .expect(200);
    expect(empty.body).toEqual({ link: null });

    const link = await makeLink(note.id, 'viewer');
    expect(link.token).toMatch(/^[\w-]{43}$/);

    const opened = await anyone().get(`/api/shared/${link.token}`).expect(200);
    expect(opened.body).toMatchObject({
      title: 'Plan',
      content: 'x',
      permission: 'viewer',
      canEdit: false,
      version: 1,
    });
    expect(opened.body).not.toHaveProperty('userId');
    expect(opened.headers['cache-control']).toBe('no-store');

    await anyone()
      .patch(`/api/shared/${link.token}`)
      .send({ content: 'y' })
      .expect(403);
    expect((await owner.notes.read(note.id)).content).toBe('x');
  });

  it('tells everyone with the note that it is public, without the token', async () => {
    const note = await owner.notes.create({ title: 'Plan', content: 'x' });
    await owner.http
      .post(`/api/notes/${note.id}/shares`)
      .send({ sharedWithUserId: other.id, permission: 'viewer' })
      .expect(201);
    expect((await owner.notes.read(note.id)).publicLink).toBeNull();
    const ownerStart = await owner.sync.drain();
    const otherStart = await other.sync.drain();

    const link = await makeLink(note.id, 'editor');

    for (const [actor, start] of [
      [owner, ownerStart],
      [other, otherStart],
    ] as const) {
      const pulled = await actor.sync.drain({ cursor: start.cursor });
      const seen = entryFor(pulled.entries, 'note', note.id).note!;
      expect(seen.publicLink).toBe('editor');
      expect(JSON.stringify(seen)).not.toContain(link.token);
    }

    const beforeOff = await other.sync.drain({ cursor: otherStart.cursor });
    await owner.http.delete(`/api/notes/${note.id}/link`).expect(200);
    const off = await other.sync.drain({ cursor: beforeOff.cursor });
    expect(entryFor(off.entries, 'note', note.id).note!.publicLink).toBeNull();
  });

  it('does not call a trashed note public: its link does not open', async () => {
    const note = await owner.notes.create({ title: 'Plan', content: 'x' });
    await makeLink(note.id, 'viewer');
    expect((await owner.notes.read(note.id)).publicLink).toBe('viewer');
    const { cursor } = await owner.sync.drain();

    await owner.http.delete(`/api/notes/${note.id}`).expect(200);
    const trashed = await owner.sync.drain({ cursor });
    expect(
      entryFor(trashed.entries, 'note', note.id).note!.publicLink,
    ).toBeNull();

    await owner.http.patch(`/api/notes/${note.id}/restore`).expect(200);
    const restored = await owner.sync.drain({ cursor: trashed.cursor });
    expect(entryFor(restored.entries, 'note', note.id).note!.publicLink).toBe(
      'viewer',
    );
  });

  it('lets an editing link change the text, and syncs it to the owner', async () => {
    const note = await owner.notes.create({ title: 'Plan', content: 'x' });
    const link = await makeLink(note.id, 'editor');
    const { cursor } = await owner.sync.drain();

    const saved = await anyone()
      .patch(`/api/shared/${link.token}`)
      .send({ content: 'y', baseVersion: 1 })
      .expect(200);
    expect(saved.body).toMatchObject({ content: 'y', version: 2 });

    const pulled = await owner.sync.drain({ cursor });
    expect(entryFor(pulled.entries, 'note', note.id).note).toMatchObject({
      content: 'y',
    });
    expect((await owner.notes.read(note.id)).content).toBe('y');

    // The text it replaced is in the history, by no one in particular.
    const history = await owner.revisions.list(note.id);
    expect(history.revisions[0]).toMatchObject({ version: 1, author: null });

    // A stale edit gets the note as it is now.
    const stale = await anyone()
      .patch(`/api/shared/${link.token}`)
      .send({ content: 'z', baseVersion: 1 })
      .expect(409);
    expect((stale.body as { serverNote: unknown }).serverNote).toMatchObject({
      content: 'y',
      version: 2,
    });
  });

  it('stops working when taken away, trashed or frozen', async () => {
    const note = await owner.notes.create({ title: 'Plan' });
    const link = await makeLink(note.id, 'editor');

    await owner.http
      .patch(`/api/notes/${note.id}/freeze`)
      .send({ isFrozen: true })
      .expect(200);
    const frozen = await anyone().get(`/api/shared/${link.token}`).expect(200);
    expect(frozen.body).toMatchObject({ canEdit: false, isFrozen: true });
    await anyone()
      .patch(`/api/shared/${link.token}`)
      .send({ title: 'New' })
      .expect(403);
    await owner.http
      .patch(`/api/notes/${note.id}/freeze`)
      .send({ isFrozen: false })
      .expect(200);

    await owner.notes.trash(note.id);
    await anyone().get(`/api/shared/${link.token}`).expect(404);
    await owner.notes.restore(note.id);
    await anyone().get(`/api/shared/${link.token}`).expect(200);

    await owner.http.delete(`/api/notes/${note.id}/link`).expect(200);
    await anyone().get(`/api/shared/${link.token}`).expect(404);

    // A new link is a new token.
    const again = await makeLink(note.id, 'viewer');
    expect(again.token).not.toBe(link.token);
  });

  it('gives chat apps the note to preview, unless it is locked or gone', async () => {
    const preview = (token: string) =>
      ctx.app.get(NoteShareLinksService).previewLink(token);
    const note = await owner.notes.create({
      title: 'Anki',
      content: JSON.stringify({ ops: [{ insert: 'Spaced repetition\n' }] }),
    });
    const link = await makeLink(note.id, 'viewer');

    expect(await preview(link.token)).toEqual({
      title: 'Anki',
      description: 'Spaced repetition',
    });
    expect(await preview('no-such-token')).toBeNull();

    await ctx.prisma.noteLock.create({
      data: { userId: other.id, noteId: note.id, kind: 'pin' },
    });
    expect(await preview(link.token)).toBeNull();
    await ctx.prisma.noteLock.deleteMany({ where: { noteId: note.id } });

    await owner.notes.trash(note.id);
    expect(await preview(link.token)).toBeNull();
  });

  it('changes what a link allows without changing the link', async () => {
    const note = await owner.notes.create({ title: 'Plan' });
    const link = await makeLink(note.id, 'viewer');
    const changed = await makeLink(note.id, 'editor');
    expect(changed).toMatchObject({ token: link.token, permission: 'editor' });
  });

  it('only the owner manages the link', async () => {
    const note = await owner.notes.create({ title: 'Plan' });
    await owner.shares.grant(note.id, other.id, 'editor');

    await other.http.get(`/api/notes/${note.id}/link`).expect(403);
    await other.http
      .put(`/api/notes/${note.id}/link`)
      .send({ permission: 'editor' })
      .expect(403);
    await other.http.delete(`/api/notes/${note.id}/link`).expect(403);
    await anyone()
      .put(`/api/notes/${note.id}/link`)
      .send({ permission: 'editor' })
      .expect(401);
  });

  it('serves the note’s attachments, and only its own', async () => {
    const note = await owner.notes.create({ title: 'Pictures' });
    const picture = await owner.attachments.upload(note.id);
    const elsewhere = await owner.notes.create({ title: 'Other' });
    const otherPicture = await owner.attachments.upload(elsewhere.id);
    const link = await makeLink(note.id, 'viewer');

    const opened = await anyone().get(`/api/shared/${link.token}`).expect(200);
    expect((opened.body as { attachments: unknown }).attachments).toEqual([
      expect.objectContaining({ id: picture.id, type: 'image' }),
    ]);

    const file = await anyone()
      .get(`/api/shared/${link.token}/attachments/${picture.id}`)
      .expect(200);
    expect(file.headers['content-type']).toBe('image/png');
    await anyone()
      .get(`/api/shared/${link.token}/attachments/${otherPicture.id}`)
      .expect(404);
    await anyone()
      .get(`/api/shared/not-a-token/attachments/${picture.id}`)
      .expect(404);
  });
});

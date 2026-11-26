import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import request from 'supertest';
import { SYNC_EVENTS_PING_INTERVAL_MS } from 'src/sync/sync.constants';
import { Actor, createE2EApp, E2EApp } from '../support';
import { openSyncEventStream } from '../support/api/events.api';
import type { NoteOnWire } from '../support/wire';

/**
 * The contract the Home Assistant integration (felixschndr/ha-anchor-integration)
 * relies on. It turns a note's checkboxes into a to-do list and talks to the
 * server like this, with nothing but an API token and no protocol header:
 *
 *   GET   /api/health                  app must be "anchor"; version shown in HA
 *   GET   /api/notes                   pick a note; "viewer" notes are hidden
 *   GET   /api/notes/:id               content is Quill Delta JSON, plus version
 *   PATCH /api/notes/:id               { content, baseVersion }; 409 → serverNote
 *   GET   /api/sync/events             SSE; any event makes it refetch the note
 *   401 anywhere                       "token rejected", asks for a new token
 *
 * If one of these tests has to change, the integration breaks for its users.
 */

const UNCHECKED = 'unchecked';
const CHECKED = 'checked';

type Op = { insert: unknown; attributes?: Record<string, unknown> };

/** Builds the content the integration reads, one `[text, checkbox]` per line. */
function delta(...lines: [string, string | null][]): string {
  const ops: Op[] = [];
  for (const [text, checkbox] of lines) {
    if (text) ops.push({ insert: text });
    ops.push(
      checkbox
        ? { insert: '\n', attributes: { list: checkbox } }
        : { insert: '\n' },
    );
  }
  return JSON.stringify({ ops });
}

/** The integration's `delta.parse`: the note's lines with their checkbox state. */
function lines(content: string | null): [string, string | null][] {
  if (!content) return [];
  const ops = (JSON.parse(content) as { ops: Op[] }).ops;
  const result: [string, string | null][] = [];
  let text = '';
  for (const op of ops) {
    if (typeof op.insert !== 'string' || !op.insert.includes('\n')) {
      if (typeof op.insert === 'string') text += op.insert;
      continue;
    }
    const parts = op.insert.split('\n');
    const rest = parts.pop()!;
    const list = op.attributes?.list;
    const checkbox = list === CHECKED || list === UNCHECKED ? list : null;
    for (const part of parts) {
      result.push([text + part, checkbox]);
      text = '';
    }
    text += rest;
  }
  if (text) result.push([text, null]);
  return result;
}

const SHOPPING = delta(
  ['Groceries', null],
  ['Milk', UNCHECKED],
  ['Bread', CHECKED],
  ['Some text', null],
);

describe('Home Assistant integration (ha-anchor-integration)', () => {
  let ctx: E2EApp;
  let user: Actor;
  let apiToken: string;

  /** Like clicking "regenerate" in the settings; signs in with the JWT. */
  async function regenerateToken(actor: Actor): Promise<string> {
    const res = await request(ctx.http)
      .post('/api/auth/api-token/regenerate')
      .set(actor.auth)
      .expect(200);
    const token = (res.body as { apiToken: string }).apiToken;
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    return token;
  }

  /** Requests exactly as the integration sends them: bearer token, nothing else. */
  const as = (token: string) => ({
    get: (path: string) =>
      request(ctx.http).get(path).set('Authorization', `Bearer ${token}`),
    patch: (path: string, body: object) =>
      request(ctx.http)
        .patch(path)
        .set('Authorization', `Bearer ${token}`)
        .send(body),
  });

  beforeAll(async () => {
    ctx = await createE2EApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await ctx.resetDb();
    user = await ctx.registerUser();
    apiToken = await regenerateToken(user);
  });

  afterEach(() => {
    ctx.closeEventStreams();
  });

  describe('server step of the config flow', () => {
    it('answers /api/health without auth as an Anchor server', async () => {
      const res = await request(ctx.http).get('/api/health').expect(200);
      const body = res.body as { app: unknown; version: unknown };

      expect(body.app).toBe('anchor');
      expect(typeof body.version).toBe('string');
    });
  });

  describe('note step of the config flow', () => {
    it('lists notes with id, title, content and permission for an API token', async () => {
      const note = await user.notes.create({
        title: 'Groceries',
        content: SHOPPING,
      });

      const res = await as(apiToken).get('/api/notes').expect(200);
      const notes = res.body as NoteOnWire[];

      expect(Array.isArray(notes)).toBe(true);
      const listed = notes.find((n) => n.id === note.id)!;
      expect(listed).toMatchObject({
        id: note.id,
        title: 'Groceries',
        permission: 'owner',
      });
      expect(lines(listed.content)).toEqual(lines(SHOPPING));
    });

    it("marks notes shared read-only as 'viewer' and editable ones as 'editor'", async () => {
      const owner = await ctx.registerUser();
      const readOnly = await owner.notes.create({ title: 'read only' });
      const editable = await owner.notes.create({ title: 'editable' });
      await owner.shares.grant(readOnly.id, user.id, 'viewer');
      await owner.shares.grant(editable.id, user.id, 'editor');

      const res = await as(apiToken).get('/api/notes').expect(200);
      const permissions = Object.fromEntries(
        (res.body as NoteOnWire[]).map((n) => [n.title, n.permission]),
      );

      expect(permissions).toMatchObject({
        'read only': 'viewer',
        editable: 'editor',
      });
    });
  });

  describe('reading a note', () => {
    it('returns the checkbox lines as Quill Delta with list attributes, and a version', async () => {
      const note = await user.notes.create({
        title: 'Groceries',
        content: SHOPPING,
      });

      const res = await as(apiToken).get(`/api/notes/${note.id}`).expect(200);
      const body = res.body as NoteOnWire;

      expect(body.title).toBe('Groceries');
      expect(typeof body.version).toBe('number');
      expect(typeof body.content).toBe('string');
      expect(lines(body.content)).toEqual([
        ['Groceries', null],
        ['Milk', UNCHECKED],
        ['Bread', CHECKED],
        ['Some text', null],
      ]);
    });
  });

  describe('editing a note from Home Assistant', () => {
    it('saves { content, baseVersion } and answers with the new note', async () => {
      const note = await user.notes.create({
        title: 'Groceries',
        content: SHOPPING,
      });
      const read = (await as(apiToken).get(`/api/notes/${note.id}`))
        .body as NoteOnWire;
      // What the integration writes after "add Eggs, check Milk, remove Bread".
      const edited = delta(
        ['Groceries', null],
        ['Milk', CHECKED],
        ['Eggs', UNCHECKED],
        ['Some text', null],
      );

      const res = await as(apiToken)
        .patch(`/api/notes/${note.id}`, {
          content: edited,
          baseVersion: read.version,
        })
        .expect(200);
      const saved = res.body as NoteOnWire;

      expect(saved.id).toBe(note.id);
      expect(saved.version).toBeGreaterThan(read.version);
      expect(lines(saved.content)).toEqual(lines(edited));
      // The title is left alone when only content is sent.
      expect(saved.title).toBe('Groceries');
      // And the next read sees the same thing.
      const reread = (await as(apiToken).get(`/api/notes/${note.id}`))
        .body as NoteOnWire;
      expect(reread.version).toBe(saved.version);
      expect(lines(reread.content)).toEqual(lines(edited));
    });

    it('answers a stale baseVersion with 409 and the current note as serverNote', async () => {
      const note = await user.notes.create({
        title: 'Groceries',
        content: SHOPPING,
      });
      const stale = (await as(apiToken).get(`/api/notes/${note.id}`))
        .body as NoteOnWire;
      // Someone edits the note in the app meanwhile.
      const fromApp = delta(['Groceries', null], ['Butter', UNCHECKED]);
      const current = await user.notes.update(note.id, { content: fromApp });

      const res = await as(apiToken)
        .patch(`/api/notes/${note.id}`, {
          content: delta(['Lost edit', UNCHECKED]),
          baseVersion: stale.version,
        })
        .expect(409);
      const serverNote = (res.body as { serverNote: NoteOnWire }).serverNote;

      expect(serverNote.version).toBe(current.version);
      expect(lines(serverNote.content)).toEqual(lines(fromApp));

      // The integration re-applies its edit on top and retries with that version.
      await as(apiToken)
        .patch(`/api/notes/${note.id}`, {
          content: delta(['Groceries', null], ['Butter', CHECKED]),
          baseVersion: serverNote.version,
        })
        .expect(200);
    });

    it('lets an editor of a shared note save it with their own API token', async () => {
      const owner = await ctx.registerUser();
      const note = await owner.notes.create({
        title: 'Shared',
        content: SHOPPING,
      });
      await owner.shares.grant(note.id, user.id, 'editor');
      const read = (await as(apiToken).get(`/api/notes/${note.id}`))
        .body as NoteOnWire;

      const edited = delta(['Milk', CHECKED]);
      await as(apiToken)
        .patch(`/api/notes/${note.id}`, {
          content: edited,
          baseVersion: read.version,
        })
        .expect(200);

      expect(lines((await owner.notes.read(note.id)).content)).toEqual(
        lines(edited),
      );
    });
  });

  describe('live updates over the event stream', () => {
    it('accepts the API token and sends SSE frames when the note changes in the app', async () => {
      const note = await user.notes.create({
        title: 'Groceries',
        content: SHOPPING,
      });
      const stream = await openSyncEventStream(ctx.address, apiToken);
      try {
        expect(stream.status).toBe(200);
        expect(stream.headers['content-type']).toContain('text/event-stream');

        await user.notes.update(note.id, {
          content: delta(['Milk', CHECKED]),
        });

        // The integration yields one event per blank-line-terminated frame,
        // named by its `event:` line.
        await stream.waitFor('\n\n');
        expect(stream.read()).toMatch(/^event: ?\S+$/m);
        expect(stream.read()).toMatch(/\n\n/);
      } finally {
        stream.close();
      }
    });

    it("pushes the owner's edit of a shared note to the editor's stream", async () => {
      const owner = await ctx.registerUser();
      const note = await owner.notes.create({ title: 'Shared' });
      await owner.shares.grant(note.id, user.id, 'editor');
      const stream = await openSyncEventStream(ctx.address, apiToken);
      try {
        await owner.notes.update(note.id, {
          content: delta(['Milk', UNCHECKED]),
        });

        await stream.waitFor('event: sync');
      } finally {
        stream.close();
      }
    });

    it('pings well within the 90 s read timeout the integration uses', () => {
      expect(SYNC_EVENTS_PING_INTERVAL_MS).toBeLessThan(90_000);
    });
  });

  describe('token rejected (the "invalid token" repair issue)', () => {
    it('answers 401, not 403 or 404, for an unknown token on every call', async () => {
      const note = await user.notes.create({ title: 'Groceries' });
      const bad = as('not-a-real-token');

      await bad.get('/api/notes').expect(401);
      await bad.get(`/api/notes/${note.id}`).expect(401);
      await bad
        .patch(`/api/notes/${note.id}`, { content: SHOPPING, baseVersion: 1 })
        .expect(401);
      const stream = await openSyncEventStream(ctx.address, 'not-a-real-token');
      try {
        expect(stream.status).toBe(401);
      } finally {
        stream.close();
      }
    });

    it('rejects the old token with 401 once it is regenerated, and accepts the new one', async () => {
      const note = await user.notes.create({ title: 'Groceries' });
      const old = apiToken;

      const fresh = await regenerateToken(user);

      expect(fresh).not.toBe(old);
      await as(old).get(`/api/notes/${note.id}`).expect(401);
      const stream = await openSyncEventStream(ctx.address, old);
      try {
        expect(stream.status).toBe(401);
      } finally {
        stream.close();
      }
      await as(fresh).get(`/api/notes/${note.id}`).expect(200);
    });
  });
});

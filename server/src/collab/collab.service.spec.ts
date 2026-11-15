/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/require-await, @typescript-eslint/no-base-to-string -- fakes around a real socket */
import { createServer, type Server } from 'http';
import type { AddressInfo } from 'net';
import { readFileSync } from 'fs';
import { join } from 'path';
import Delta from 'quill-delta';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { CollabSocketService } from './collab-socket.service';
import { CollabService } from './collab.service';
import { CollabDocument, parseNoteContent } from './collab-document';

const content = (text: string) =>
  JSON.stringify({ ops: [{ insert: `${text}\n` }] });

type Message = Record<string, any>;

class Peer {
  readonly messages: Message[] = [];
  private waiting: (() => void)[] = [];
  readonly closed: Promise<number>;

  constructor(readonly ws: WebSocket) {
    ws.on('message', (raw) => {
      this.messages.push(JSON.parse(String(raw)) as Message);
      this.waiting.splice(0).forEach((wake) => wake());
    });
    this.closed = new Promise((resolve) => ws.on('close', resolve));
  }

  send(message: object) {
    this.ws.send(JSON.stringify(message));
  }

  async next(t: string): Promise<Message> {
    for (;;) {
      const found = this.messages.find((m) => m.t === t);
      if (found) return found;
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    }
  }
}

describe('CollabDocument', () => {
  it('rebases a change over what arrived since its revision', () => {
    const document = new CollabDocument(parseNoteContent(content('hello')));
    document.applyClient([{ insert: 'A' }], 0, 'one', 1);
    const entry = document.applyClient(
      [{ retain: 5 }, { insert: 'B' }],
      0,
      'two',
      1,
    );
    expect('ops' in entry && entry.ops).toEqual([
      { retain: 6 },
      { insert: 'B' },
    ]);
    expect(document.doc.ops).toEqual([{ insert: 'AhelloB\n' }]);
  });

  it("keeps a line's alignment set while someone types in it", () => {
    const document = new CollabDocument(parseNoteContent(content('hello')));
    document.applyClient([{ retain: 5 }, { insert: '!' }], 0, 'one', 1);
    document.applyClient(
      [{ retain: 5 }, { retain: 1, attributes: { align: 'center' } }],
      0,
      'two',
      1,
    );
    expect(document.doc.ops).toEqual([
      { insert: 'hello!' },
      { insert: '\n', attributes: { align: 'center' } },
    ]);
  });

  it('applies a resent change once', () => {
    const document = new CollabDocument(parseNoteContent(content('x')));
    document.applyClient([{ insert: 'A' }], 0, 'one', 1);
    expect(document.applyClient([{ insert: 'A' }], 0, 'one', 1)).toEqual({
      duplicateOf: 1,
    });
    expect(document.rev).toBe(1);
  });

  it('refuses a change that breaks the text', () => {
    const document = new CollabDocument(parseNoteContent(content('x')));
    expect(() =>
      document.applyClient([{ retain: 99 }, { insert: 'A' }], 0, 'one', 1),
    ).toThrow();
    expect(() =>
      document.applyClient([{ retain: 1 }, { delete: 1 }], 0, 'one', 2),
    ).toThrow();
    expect(document.doc.ops).toEqual([{ insert: 'x\n' }]);
  });

  it('reads plain text and missing content as text', () => {
    expect(parseNoteContent('plain').ops).toEqual([{ insert: 'plain\n' }]);
    expect(parseNoteContent(null).ops).toEqual([{ insert: '\n' }]);
  });

  it('converges whichever order the changes meet', () => {
    const vectors = JSON.parse(
      readFileSync(
        join(__dirname, '../../test/fixtures/collab-ot-vectors.json'),
        'utf8',
      ),
    ) as { aThenB: object[]; bThenA: object[] }[];
    expect(vectors.length).toBeGreaterThan(100);
    for (const vector of vectors) {
      expect(new Delta(vector.aThenB as never)).toEqual(
        new Delta(vector.bThenA as never),
      );
    }
  });
});

describe('CollabService over a socket', () => {
  let server: Server;
  let url: string;
  let sockets: CollabSocketService;
  let note: {
    id: string;
    userId: string;
    title: string;
    content: string | null;
    background: string | null;
    version: number;
    state: string;
    isFrozen: boolean;
  };
  let link: { token: string; permission: string } | null;
  let listeners: Set<() => void>;
  let peers: Peer[];
  let emit: ReturnType<typeof vi.fn>;

  const wait = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  beforeEach(async () => {
    note = {
      id: 'n1',
      userId: 'owner',
      title: 'T',
      content: content('hello'),
      background: null,
      version: 3,
      state: 'active',
      isFrozen: false,
    };
    link = { token: 'tok', permission: 'editor' };
    listeners = new Set();
    peers = [];
    emit = vi.fn(async () => {
      setTimeout(() => listeners.forEach((listener) => listener()));
      return [];
    });
    const db = {
      findUnique: vi.fn(async () => ({
        ...note,
        shareLink: link,
        sharedWith: [],
      })),
      findUniqueOrThrow: vi.fn(async () => note),
      updateMany: vi.fn(
        async ({ where, data }: { where: { version: number }; data: any }) => {
          if (where.version !== note.version) return { count: 0 };
          note = {
            ...note,
            content: data.content,
            title: data.title,
            background: data.background,
            version: note.version + 1,
          };
          return { count: 1 };
        },
      ),
    };
    const prisma = {
      note: db,
      noteShareLink: {
        findUnique: vi.fn(async ({ where }: { where: { token: string } }) =>
          link?.token === where.token
            ? { ...link, noteId: note.id, note }
            : null,
        ),
      },
      $transaction: (run: (tx: unknown) => unknown) => run({ note: db }),
    };
    const service = new CollabService(
      prisma as never,
      {
        resolveUser: async (jwt: string) =>
          jwt === 'owner-jwt'
            ? { id: 'owner', name: 'Alex Owner', status: 'active' }
            : null,
      } as never,
      { noteRecipients: async () => ['owner'], emit } as never,
      { recordEdit: vi.fn() } as never,
      {
        subscribe: (_: string, listener: () => void) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      } as never,
    );
    server = createServer();
    sockets = new CollabSocketService(
      { httpAdapter: { getHttpServer: () => server } } as never,
      service,
    );
    sockets.onApplicationBootstrap();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    url = `ws://127.0.0.1:${(server.address() as AddressInfo).port}/api/collab`;
  });

  afterEach(async () => {
    peers.forEach((peer) => peer.ws.terminate());
    sockets.onApplicationShutdown();
    await new Promise((resolve) => server.close(resolve));
  });

  const connect = async (request: object): Promise<Peer> => {
    const ws = new WebSocket(url);
    const peer = new Peer(ws);
    peers.push(peer);
    await new Promise((resolve) => ws.once('open', resolve));
    peer.send({ t: 'join', sid: `sid-${peers.length}`, ...request });
    return peer;
  };

  const tell = () => listeners.forEach((listener) => listener());

  it('gives a joiner the text and tells others', async () => {
    const owner = await connect({ noteId: 'n1', jwt: 'owner-jwt' });
    const hello = await owner.next('hello');
    expect(hello.doc).toEqual([{ insert: 'hello\n' }]);
    expect(hello.canEdit).toBe(true);

    const guest = await connect({ link: 'tok' });
    const joined = await owner.next('peer');
    expect(joined.name).toBe('Guest');
    // A link's visitors see no names.
    const guestHello = await guest.next('hello');
    expect(guestHello.peers[0].name).toBe('Editor');
  });

  it('refuses a bad token and a bad link', async () => {
    const stranger = await connect({ noteId: 'n1', jwt: 'nope' });
    expect(await stranger.closed).toBe(4401);
    const lost = await connect({ link: 'nope' });
    expect(await lost.closed).toBe(4404);
  });

  it('merges changes made at the same time, and saves them', async () => {
    const owner = await connect({ noteId: 'n1', jwt: 'owner-jwt' });
    await owner.next('hello');
    const guest = await connect({ link: 'tok' });
    await guest.next('hello');

    owner.send({ t: 'op', rev: 0, id: 1, ops: [{ insert: 'A' }] });
    guest.send({
      t: 'op',
      rev: 0,
      id: 1,
      ops: [{ retain: 5 }, { insert: 'B' }],
    });
    const ownerAck = await owner.next('ack');
    const guestAck = await guest.next('ack');
    expect([ownerAck.rev, guestAck.rev].sort()).toEqual([1, 2]);

    await owner.next('saved');
    expect(JSON.parse(note.content!).ops).toEqual([{ insert: 'AhelloB\n' }]);
    expect(note.version).toBe(4);
    expect(emit).toHaveBeenCalled();
  });

  it('keeps a view-only link from changing anything', async () => {
    link = { token: 'tok', permission: 'viewer' };
    const guest = await connect({ link: 'tok' });
    expect((await guest.next('hello')).canEdit).toBe(false);
    guest.send({ t: 'meta', title: 'Hacked' });
    guest.send({ t: 'op', rev: 0, id: 7, ops: [{ insert: 'A' }] });
    expect((await guest.next('nack')).id).toBe(7);
    await wait(1100);
    expect(note.title).toBe('T');
    expect(note.content).toBe(content('hello'));
  });

  it('merges a write from outside with unsaved changes', async () => {
    const owner = await connect({ noteId: 'n1', jwt: 'owner-jwt' });
    await owner.next('hello');
    owner.send({ t: 'op', rev: 0, id: 1, ops: [{ insert: 'A' }] });
    await owner.next('ack');

    note = { ...note, content: content('hello world'), version: 9 };
    tell();
    const change = await owner.next('op');
    expect(change.ops).toEqual([{ retain: 6 }, { insert: ' world' }]);

    await wait(1100);
    expect(JSON.parse(note.content!).ops).toEqual([
      { insert: 'Ahello world\n' },
    ]);
    expect(note.version).toBe(10);
  });

  it('closes link sockets when the link is turned off', async () => {
    const owner = await connect({ noteId: 'n1', jwt: 'owner-jwt' });
    await owner.next('hello');
    const guest = await connect({ link: 'tok' });
    await guest.next('hello');

    link = null;
    tell();
    expect(await guest.closed).toBe(4404);
    expect((await owner.next('peerGone')).id).toBeDefined();
    expect(owner.ws.readyState).toBe(WebSocket.OPEN);
  });

  it('closes everyone when the note is trashed', async () => {
    const owner = await connect({ noteId: 'n1', jwt: 'owner-jwt' });
    await owner.next('hello');
    note = { ...note, state: 'trashed' };
    tell();
    expect(await owner.closed).toBe(4404);
  });

  it('stops editing when the note is frozen', async () => {
    const owner = await connect({ noteId: 'n1', jwt: 'owner-jwt' });
    await owner.next('hello');
    note = { ...note, isFrozen: true };
    tell();
    expect((await owner.next('meta')).canEdit).toBe(false);
  });

  it("moves a caret over others' changes", async () => {
    const owner = await connect({ noteId: 'n1', jwt: 'owner-jwt' });
    await owner.next('hello');
    const guest = await connect({ link: 'tok' });
    await guest.next('hello');
    owner.send({ t: 'op', rev: 0, id: 1, ops: [{ insert: 'AAA' }] });
    await owner.next('ack');
    // Sent before the guest saw the change.
    guest.send({ t: 'cursor', index: 2, length: 1, rev: 0 });
    expect(await owner.next('cursor')).toMatchObject({ index: 5, length: 1 });
  });

  it('acknowledges a change resent after reconnecting', async () => {
    const first = await connect({ noteId: 'n1', jwt: 'owner-jwt', sid: 'me' });
    const hello = await first.next('hello');
    first.send({ t: 'op', rev: 0, id: 1, ops: [{ insert: 'A' }] });
    await first.next('ack');
    first.ws.close();
    await first.closed;
    await wait(20);

    const again = await connect({
      noteId: 'n1',
      jwt: 'owner-jwt',
      sid: 'me',
      epoch: hello.epoch,
      rev: 0,
    });
    const rehello = await again.next('hello');
    expect(rehello.doc).toBeUndefined();
    expect(rehello.catchup).toEqual([
      { rev: 1, ops: [{ insert: 'A' }], sid: 'me', id: 1 },
    ]);
    again.send({ t: 'op', rev: 0, id: 1, ops: [{ insert: 'A' }] });
    expect((await again.next('ack')).rev).toBe(1);
  });
});

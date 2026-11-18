import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Actor, createE2EApp, E2EApp } from '../support';

/**
 * The "Save to Anchor" browser extension
 * (https://github.com/korderos/anchor_webextension) talks to the REST API with
 * the user's API token and nothing else. These are the exact requests it
 * sends and the fields it reads back, so a change that would break it fails
 * here.
 */
describe('browser extension', () => {
  let ctx: E2EApp;
  let user: Actor;
  let token: string;

  const ext = () => ({
    get: (path: string) =>
      request(ctx.http)
        .get(path)
        .set('Accept', 'application/json')
        .set('Authorization', `Bearer ${token}`),
    post: (path: string, body: object) =>
      request(ctx.http)
        .post(path)
        .set('Accept', 'application/json')
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
    const res = await request(ctx.http)
      .post('/api/auth/api-token/regenerate')
      .set(user.auth)
      .expect(200);
    token = (res.body as { apiToken: string }).apiToken;
    expect(token).toBeTruthy();
  });

  it('tests the connection by listing tags', async () => {
    const res = await ext().get('/api/tags').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('says the token was rejected with a 401', async () => {
    token = 'not-a-token';
    await ext().get('/api/tags').expect(401);
  });

  it('creates a tag by name and gets its id back', async () => {
    const res = await ext().post('/api/tags', { name: 'reading' }).expect(201);
    const tag = res.body as { id: string; name: string };
    expect(tag).toMatchObject({ name: 'reading' });
    expect(typeof tag.id).toBe('string');

    const list = await ext().get('/api/tags').expect(200);
    expect(list.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: tag.id })]),
    );
  });

  it('saves a page as a note and finds it again by its URL', async () => {
    const url = 'https://example.com/articles/42?ref=x';
    const tag = (await ext().post('/api/tags', { name: 'web' }).expect(201))
      .body as { id: string };
    const content = JSON.stringify({
      ops: [
        { insert: '🔗 ' },
        { insert: 'example.com/articles/42', attributes: { link: url } },
        { insert: '\nHeading' },
        { insert: '\n', attributes: { header: 2 } },
        { insert: 'item' },
        { insert: '\n', attributes: { list: 'bullet', indent: 1 } },
        { insert: 'quoted' },
        { insert: '\n', attributes: { blockquote: true } },
        { insert: 'const x = 1;' },
        { insert: '\n', attributes: { 'code-block': 'plain' } },
      ],
    });

    const res = await ext()
      .post('/api/notes', {
        title: 'An article',
        content,
        tagIds: [tag.id],
        background: 'color_teal',
        isPinned: true,
      })
      .expect(201);
    const note = res.body as {
      id: string;
      title: string;
      content: string;
      background: string;
      isPinned: boolean;
      tagIds: string[];
    };
    expect(note).toMatchObject({
      title: 'An article',
      content,
      background: 'color_teal',
      isPinned: true,
      tagIds: [tag.id],
    });

    // The "already saved" check: search by URL, then look for it in content.
    const found = await ext()
      .get(`/api/notes?search=${encodeURIComponent(url)}&limit=5`)
      .expect(200);
    const notes = found.body as { id: string; content: string | null }[];
    expect(Array.isArray(notes)).toBe(true);
    const match = notes.find((n) => (n.content ?? '').includes(url));
    expect(match?.id).toBe(note.id);
  });

  it('saves a note with only a title and content', async () => {
    const res = await ext()
      .post('/api/notes', { title: '', content: '{"ops":[{"insert":"x\\n"}]}' })
      .expect(201);
    expect((res.body as { id: string }).id).toBeTruthy();
  });

  it('allows the Authorization header in a CORS preflight', async () => {
    // Without a host permission the extension's requests are cross-origin
    // and preflighted, since they carry a bearer token. (With CORS_ORIGINS
    // set, as here, the user grants the server's origin to the extension.)
    const res = await request(ctx.http)
      .options('/api/notes')
      .set('Origin', 'https://web.e2e.test')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type')
      .expect(204);
    expect(res.headers['access-control-allow-headers']).toMatch(
      /authorization/i,
    );
  });
});

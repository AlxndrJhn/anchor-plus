import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Controller, Get } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type SharePreviewer, resolveWebFile, serveWebApp } from './web-app';

@Controller('api')
class HealthController {
  @Get('health')
  health() {
    return { ok: true };
  }
}

const BUILD: Record<string, string> = {
  'index.html': 'home',
  'notes.html': 'notes list',
  'notes.txt': 'notes list payload',
  'notes/__next._tree.txt': 'notes list tree',
  'notes/new.html': 'note page',
  'notes/new.txt': 'note payload',
  'notes/new/__next._tree.txt': 'note tree',
  's/none.html': 'shared page',
  'missing.html': 'missing page',
  '_next/static/chunks/app.js': 'code',
};

async function appWith(webDir: string | undefined, previewer?: SharePreviewer) {
  const moduleRef = await Test.createTestingModule({
    controllers: [HealthController],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: false,
  });
  serveWebApp(app, webDir, previewer);
  await app.init();
  return app;
}

describe('resolveWebFile', () => {
  const files = new Set(Object.keys(BUILD).map((file) => `/${file}`));

  it.each([
    ['/', '/index.html'],
    ['/notes', '/notes.html'],
    ['/notes/', '/notes.html'],
    ['/notes.txt', '/notes.txt'],
    ['/notes/__next._tree.txt', '/notes/__next._tree.txt'],
    ['/notes/new', '/notes/new.html'],
    ['/notes/abc123', '/notes/new.html'],
    ['/notes/abc123.txt', '/notes/new.txt'],
    ['/notes/abc123/__next._tree.txt', '/notes/new/__next._tree.txt'],
    ['/s/token-1', '/s/none.html'],
    ['/nothing-here', null],
    ['/notes/a/b', null],
    ['/../package.json', null],
  ])('%s → %s', (address, file) => {
    expect(resolveWebFile(files, address)).toBe(file);
  });
});

describe('serveWebApp', () => {
  let root: string;
  let app: NestExpressApplication;

  beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'anchor-web-'));
    for (const [file, body] of Object.entries(BUILD)) {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.writeFileSync(path.join(root, file), body);
    }
    app = await appWith(root);
  });

  afterAll(async () => {
    await app.close();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("serves a note's page for any note", async () => {
    const res = await request(app.getHttpServer())
      .get('/notes/abc123')
      .expect(200);
    expect(res.text).toBe('note page');
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it("keeps a share link's page out of search engines and referrers", async () => {
    const res = await request(app.getHttpServer())
      .get('/s/token-1')
      .expect(200);
    expect(res.text).toBe('shared page');
    expect(res.headers['x-robots-tag']).toBe('noindex, nofollow');
    expect(res.headers['referrer-policy']).toBe('no-referrer');

    const note = await request(app.getHttpServer())
      .get('/notes/abc123')
      .expect(200);
    expect(note.headers).not.toHaveProperty('x-robots-tag');
  });

  it('lets browsers keep the hashed code for good', async () => {
    const res = await request(app.getHttpServer())
      .get('/_next/static/chunks/app.js')
      .expect(200);
    expect(res.headers['cache-control']).toBe(
      'public, max-age=31536000, immutable',
    );
  });

  it('shows the missing page for an unknown page', async () => {
    const res = await request(app.getHttpServer())
      .get('/nothing-here')
      .set('Accept', 'text/html')
      .expect(404);
    expect(res.text).toBe('missing page');
  });

  it('leaves other unknown addresses and the API to the server', async () => {
    await request(app.getHttpServer())
      .get('/nothing-here')
      .set('Accept', 'application/json')
      .expect(404)
      .expect('Content-Type', /json/);
    await request(app.getHttpServer())
      .get('/api/health')
      .set('Accept', 'text/html')
      .expect(200, { ok: true });
  });

  it('answers HEAD and ignores other methods', async () => {
    await request(app.getHttpServer()).head('/notes').expect(200);
    await request(app.getHttpServer()).post('/notes').expect(404);
  });
});

describe('serveWebApp without a build', () => {
  it('serves only the API when WEB_DIR is unset', async () => {
    const app = await appWith(undefined);
    await request(app.getHttpServer())
      .get('/')
      .set('Accept', 'text/html')
      .expect(404);
    await app.close();
  });

  it('refuses a WEB_DIR that is not a build', async () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'anchor-web-'));
    await expect(appWith(empty)).rejects.toThrow(/no index.html/);
    fs.rmSync(empty, { recursive: true, force: true });
  });
});

describe('serveWebApp with share link previews', () => {
  let root: string;
  let app: NestExpressApplication;
  const asked: string[] = [];

  beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'anchor-web-'));
    fs.writeFileSync(path.join(root, 'index.html'), 'home');
    fs.mkdirSync(path.join(root, 's'));
    fs.writeFileSync(
      path.join(root, 's', 'none.html'),
      '<html><head><title>Anchor+</title><meta name="description" content="Your thoughts, secured"/></head><body></body></html>',
    );
    fs.writeFileSync(path.join(root, 's', 'none.txt'), 'payload');
    app = await appWith(root, (token) => {
      asked.push(token);
      if (token === 'broken') {
        return Promise.reject(new Error('database down'));
      }
      return Promise.resolve(
        token === 'good'
          ? { title: 'Anki <3', description: 'Cards & decks' }
          : null,
      );
    });
  });

  afterAll(async () => {
    await app.close();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("writes the note's title and description into its page", async () => {
    const res = await request(app.getHttpServer()).get('/s/good').expect(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['x-robots-tag']).toBe('noindex, nofollow');
    expect(res.text).toContain('<title>Anki &lt;3</title>');
    expect(res.text).toContain(
      '<meta name="description" content="Cards &amp; decks"/>',
    );
    expect(res.text).toContain(
      '<meta property="og:title" content="Anki &lt;3"/>',
    );
    expect(res.text).not.toContain('Your thoughts, secured');
  });

  it("keeps the app's own page for a link with no preview", async () => {
    for (const token of ['gone', 'broken']) {
      const res = await request(app.getHttpServer())
        .get(`/s/${token}`)
        .expect(200);
      expect(res.text).toContain('<title>Anchor+</title>');
      expect(res.text).not.toContain('og:title');
    }
  });

  it("leaves the page's other files alone", async () => {
    asked.length = 0;
    const res = await request(app.getHttpServer())
      .get('/s/good.txt')
      .expect(200);
    expect(res.text).toBe('payload');
    expect(asked).toEqual([]);
  });
});

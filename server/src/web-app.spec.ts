import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Controller, Get } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolveWebFile, serveWebApp } from './web-app';

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

async function appWith(webDir: string | undefined) {
  const moduleRef = await Test.createTestingModule({
    controllers: [HealthController],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: false,
  });
  serveWebApp(app, webDir);
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

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Body, Controller, Post } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupApp } from './app.setup';
import { AppConfig, StorageConfig } from './config/configuration';
import { ATTACHMENT_MAX_FILE_SIZE } from './notes/constants/notes.constants';

/** Echoes how long a JSON body's `data` was, on the MCP route and another. */
@Controller()
class EchoController {
  @Post('api/mcp')
  mcp(@Body() body: { data: string }) {
    return { length: body.data.length };
  }

  @Post('api/other')
  other(@Body() body: { data: string }) {
    return { length: body.data.length };
  }
}

describe('setupApp', () => {
  let app: NestExpressApplication;
  let root: string;

  beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'anchor-setup-'));
    const profilesDir = path.join(root, 'profiles');
    fs.mkdirSync(profilesDir);
    fs.writeFileSync(path.join(profilesDir, 'u1-1700000000000.png'), 'png');

    const moduleRef = await Test.createTestingModule({
      controllers: [EchoController],
      providers: [
        { provide: AppConfig.KEY, useValue: { corsOrigins: [] } },
        {
          provide: StorageConfig.KEY,
          useValue: {
            profilesDir,
            attachmentsDir: path.join(root, 'attachments'),
          },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({
      logger: false,
    });
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('lets browsers keep profile images but not shared caches', async () => {
    const res = await request(app.getHttpServer())
      .get('/uploads/profiles/u1-1700000000000.png')
      .expect(200);

    expect(res.headers['cache-control']).toBe(
      'private, max-age=31536000, immutable',
    );
  });

  it('lets an MCP call carry an attachment as big as one can be', async () => {
    const data = Buffer.alloc(ATTACHMENT_MAX_FILE_SIZE).toString('base64');
    const res = await request(app.getHttpServer())
      .post('/api/mcp')
      .send({ data })
      .expect(201);

    expect(res.body).toEqual({ length: data.length });
  });

  it('keeps other JSON bodies to 30 MB', async () => {
    await request(app.getHttpServer())
      .post('/api/other')
      .send({ data: 'x'.repeat(31 * 1024 * 1024) })
      .expect(413);
  });
});

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { BadRequestException } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { setupApp } from '../../app.setup';
import { AppConfig, StorageConfig } from '../../config/configuration';
import { OidcController } from './oidc.controller';
import { OidcService } from './oidc.service';
import { OidcConfigService } from './oidc-config.service';
import { OidcLogoutService } from './oidc-logout.service';

describe('OidcController back-channel logout', () => {
  let app: NestExpressApplication;
  let root: string;
  const oidcLogoutService = { backchannelLogout: vi.fn() };

  beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'anchor-oidc-'));
    const moduleRef = await Test.createTestingModule({
      controllers: [OidcController],
      providers: [
        { provide: OidcService, useValue: {} },
        { provide: OidcConfigService, useValue: {} },
        { provide: OidcLogoutService, useValue: oidcLogoutService },
        { provide: AppConfig.KEY, useValue: { corsOrigins: [] } },
        {
          provide: StorageConfig.KEY,
          useValue: {
            profilesDir: path.join(root, 'profiles'),
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

  beforeEach(() => vi.clearAllMocks());

  it('takes the form-encoded logout token and answers 200', async () => {
    oidcLogoutService.backchannelLogout.mockResolvedValue(2);
    const res = await request(app.getHttpServer())
      .post('/api/auth/oidc/backchannel-logout')
      .type('form')
      .send({ logout_token: 'a.b.c' })
      .expect(200);
    expect(oidcLogoutService.backchannelLogout).toHaveBeenCalledWith('a.b.c');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('answers a bad token with the spec’s 400 error', async () => {
    oidcLogoutService.backchannelLogout.mockRejectedValue(
      new BadRequestException('Invalid logout token: already used'),
    );
    const res = await request(app.getHttpServer())
      .post('/api/auth/oidc/backchannel-logout')
      .type('form')
      .send({ logout_token: 'a.b.c' })
      .expect(400);
    expect(res.body).toEqual({
      error: 'invalid_request',
      error_description: 'Invalid logout token: already used',
    });
    expect(res.headers['cache-control']).toBe('no-store');
  });
});

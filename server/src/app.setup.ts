import type { ConfigType } from '@nestjs/config';
import { json, type Response } from 'express';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';
import { AppConfig, StorageConfig } from './config/configuration';
import {
  PROFILE_IMAGE_CACHE_CONTROL,
  PUBLIC_PROFILES_PREFIX,
} from './config/storage.constants';
import { AppValidationPipe } from './common/pipes/app-validation.pipe';
import { requestContextMiddleware } from './common/utils/request-context';
import { PROFILE_IMAGE_EXTENSIONS } from './auth/utils/profile-image.util';
import { serveWebApp } from './web-app';
import { NoteShareLinksService } from './notes/services/note-share-links.service';
import { MCP_REQUEST_MAX_BYTES } from './mcp/attachment-input.util';

export function setupApp(app: NestExpressApplication): void {
  const appConfig = app.get<ConfigType<typeof AppConfig>>(AppConfig.KEY);
  const storageConfig = app.get<ConfigType<typeof StorageConfig>>(
    StorageConfig.KEY,
  );

  // MCP clients send attachments as base64 inside the JSON, so that route
  // takes more; its parser runs first and the one after leaves the body be.
  app.use('/api/mcp', json({ limit: MCP_REQUEST_MAX_BYTES }));
  app.useBodyParser('json', { limit: '30mb' });

  serveWebApp(app, appConfig.webDir, (token) =>
    app.get(NoteShareLinksService, { strict: false }).previewLink(token),
  );

  app.use(helmet());
  app.use(requestContextMiddleware);

  if (appConfig.corsOrigins.length > 0) {
    app.enableCors({ origin: appConfig.corsOrigins });
  } else {
    app.enableCors();
  }

  for (const dir of [storageConfig.profilesDir, storageConfig.attachmentsDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Serve profile images only. Anything else in the folder (say, a file an
  // older version saved under the uploaded name's extension) is handed out as
  // a download, never rendered on our origin.
  const imageExtensions = new Set(Object.values(PROFILE_IMAGE_EXTENSIONS));
  app.useStaticAssets(storageConfig.profilesDir, {
    prefix: PUBLIC_PROFILES_PREFIX,
    setHeaders: (res: Response, filePath: string) => {
      res.setHeader('Cache-Control', PROFILE_IMAGE_CACHE_CONTROL);
      if (!imageExtensions.has(path.extname(filePath).toLowerCase())) {
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', 'attachment');
      }
    },
  });

  app.useGlobalPipes(new AppValidationPipe());
}

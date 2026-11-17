import { NestFactory } from '@nestjs/core';
import type { ConfigType } from '@nestjs/config';
import * as http from 'http';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppConfig } from './config/configuration';
import { setupApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  setupApp(app);

  const appConfig = app.get<ConfigType<typeof AppConfig>>(AppConfig.KEY);
  await app.listen(appConfig.port);
  if (appConfig.alsoPort && appConfig.alsoPort !== appConfig.port) {
    listenAlsoOn(app, appConfig.alsoPort);
  }
}

/** Answers on a second port exactly as on the first, live editing included. */
function listenAlsoOn(app: NestExpressApplication, port: number) {
  const main: http.Server = app.getHttpServer();
  const also = http.createServer(app.getHttpAdapter().getInstance());
  also.on('upgrade', (req, socket, head) =>
    main.emit('upgrade', req, socket, head),
  );
  also.listen(port);
  main.on('close', () => also.close());
}
void bootstrap();

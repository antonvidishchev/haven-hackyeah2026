import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { APP_CONFIG, loadConfig, type AppConfig } from './config/env.js';

export async function createApp() {
  const trustProxy = loadConfig()
    .TRUST_PROXY.split(',')
    .map((entry) => entry.trim());
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy }),
    { bufferLogs: true },
  );
  const config = app.get<AppConfig>(APP_CONFIG);

  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api/v1');
  await app.register(helmet);
  await app.register(cors, { origin: [config.WEB_ORIGIN], credentials: true });
  // Evidence uploads: one file per request, streamed; the size limit truncates and errors.
  await app.register(multipart, { limits: { fileSize: config.EVIDENCE_MAX_BYTES, files: 1 } });
  app.enableShutdownHooks();
  return app;
}

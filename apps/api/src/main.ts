import 'reflect-metadata';
import { createApp } from './app.factory.js';
import { APP_CONFIG, type AppConfig } from './config/env.js';

const app = await createApp();
const config = app.get<AppConfig>(APP_CONFIG);
await app.listen({ port: config.PORT, host: config.HOST });

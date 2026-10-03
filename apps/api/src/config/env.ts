import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),
  SURREAL_URL: z.string().url().default('ws://127.0.0.1:8000/rpc'),
  SURREAL_NS: z.string().regex(/^\w+$/).default('haven'),
  SURREAL_DB: z.string().regex(/^\w+$/).default('haven'),
  SURREAL_USER: z.string().min(1).default('root'),
  SURREAL_PASS: z.string().min(1).default('root'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  EVIDENCE_DIR: z.string().min(1).default('./.data/evidence'),
  EVIDENCE_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(100 * 1024 * 1024),
  AI_RECOMMENDATION_MODE: z.enum(['local', 'disabled']).default('local'),
  WEB_ORIGIN: z.string().url().default('http://127.0.0.1:3000'),
  /**
   * Which peers may set `X-Forwarded-For` (proxy-addr syntax: `loopback`, `uniquelocal`, CIDRs).
   * Login rate limits key on the client IP, so only trusted proxies may name it.
   */
  TRUST_PROXY: z.string().min(1).default('loopback'),
});

export type AppConfig = z.infer<typeof envSchema>;

export const APP_CONFIG = Symbol('APP_CONFIG');

/** Loads `.env` from the repo root (local dev); containers pass real env vars instead. */
function loadDotEnv() {
  for (const candidate of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')]) {
    if (existsSync(candidate)) {
      process.loadEnvFile(candidate);
      return;
    }
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (env === process.env) loadDotEnv();
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid configuration:\n${issues}`);
  }
  return parsed.data;
}

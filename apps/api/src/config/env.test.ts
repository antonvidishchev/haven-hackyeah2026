import { describe, expect, it } from 'vitest';
import { loadConfig } from './env.js';

const base = { JWT_SECRET: 'x'.repeat(32) };

describe('loadConfig', () => {
  it('applies defaults', () => {
    const config = loadConfig({ ...base });
    expect(config.PORT).toBe(3001);
    expect(config.EVIDENCE_MAX_BYTES).toBe(100 * 1024 * 1024);
    expect(config.AI_RECOMMENDATION_MODE).toBe('local');
    // Only a local proxy (the web app) may name the client IP the login limit keys on.
    expect(config.TRUST_PROXY).toBe('loopback');
  });

  it('rejects a short JWT secret and unsafe database names', () => {
    expect(() => loadConfig({ JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
    expect(() => loadConfig({ ...base, SURREAL_DB: 'haven; REMOVE NS x' })).toThrow(/SURREAL_DB/);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { isApiHealthy } from './api';

afterEach(() => vi.unstubAllGlobals());

describe('isApiHealthy', () => {
  it('is true when /health/ready answers 200', async () => {
    vi.stubGlobal('fetch', async () => new Response('{"status":"ok"}', { status: 200 }));
    await expect(isApiHealthy()).resolves.toBe(true);
  });

  it('is false when the API is down or not ready', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 503 }));
    await expect(isApiHealthy()).resolves.toBe(false);
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('fetch failed');
    });
    await expect(isApiHealthy()).resolves.toBe(false);
  });
});

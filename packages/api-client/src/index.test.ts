import { describe, expect, it } from 'vitest';
import { ApiError, createHavenClient } from './index.js';

function fakeFetch(status: number, body: unknown, seen: Request[] = []): typeof fetch {
  return async (input, init) => {
    seen.push(new Request(input as string, init));
    return new Response(JSON.stringify(body), { status });
  };
}

describe('createHavenClient', () => {
  it('sends the bearer token and parses JSON', async () => {
    const seen: Request[] = [];
    const client = createHavenClient({
      baseUrl: 'http://api.test/api/v1/',
      getToken: () => 'tok',
      fetch: fakeFetch(200, { ok: true }, seen),
    });
    await expect(client.get('/health/live')).resolves.toEqual({ ok: true });
    expect(seen[0]?.url).toBe('http://api.test/api/v1/health/live');
    expect(seen[0]?.headers.get('authorization')).toBe('Bearer tok');
  });

  it('maps error bodies to ApiError', async () => {
    const client = createHavenClient({
      baseUrl: 'http://api.test',
      fetch: fakeFetch(401, { error: { code: 'invalid_credentials', message: 'Nope' } }),
    });
    const error = await client.post('/auth/login', { body: {} }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 401, code: 'invalid_credentials', message: 'Nope' });
  });
});

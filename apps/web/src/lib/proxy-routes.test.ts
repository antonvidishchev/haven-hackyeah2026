import { describe, expect, it } from 'vitest';

import { isProxyAllowed, isSameOrigin } from './proxy-routes';

describe('isProxyAllowed', () => {
  it.each([
    ['PUT', ['reports', 'abc123']],
    ['POST', ['reports', 'abc123', 'evidence']],
    ['DELETE', ['evidence', 'e1']],
  ])('allows %s %j', (method, segments) => {
    expect(isProxyAllowed(method, segments)).toBe(true);
  });

  it.each([
    ['GET', ['reports', 'abc123']],
    ['POST', ['auth', 'login']],
    ['PUT', ['reports', '..', 'auth']],
    ['PUT', ['reports', 'ABC']],
    ['DELETE', ['reports', 'abc123']],
    ['POST', ['reports', 'abc', 'evidence', 'x']],
  ])('refuses %s %j', (method, segments) => {
    expect(isProxyAllowed(method, segments)).toBe(false);
  });
});

describe('isSameOrigin', () => {
  const url = 'http://127.0.0.1:3000/api/proxy/reports/a';
  it('trusts Sec-Fetch-Site', () => {
    expect(isSameOrigin(new Headers({ 'sec-fetch-site': 'same-origin' }), url)).toBe(true);
    expect(isSameOrigin(new Headers({ 'sec-fetch-site': 'cross-site' }), url)).toBe(false);
  });

  it('falls back to Origin and refuses requests with neither', () => {
    expect(isSameOrigin(new Headers({ origin: 'http://127.0.0.1:3000' }), url)).toBe(true);
    expect(isSameOrigin(new Headers({ origin: 'https://evil.example' }), url)).toBe(false);
    expect(isSameOrigin(new Headers(), url)).toBe(false);
  });
});

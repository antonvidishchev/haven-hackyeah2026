/**
 * The API calls the browser may make through `/api/proxy`, which attaches the cookie token.
 * Everything else goes through server components or server actions.
 */
const allowed: { method: string; pattern: RegExp }[] = [
  { method: 'PUT', pattern: /^reports\/[a-z0-9]{1,40}$/ },
  { method: 'POST', pattern: /^reports\/[a-z0-9]{1,40}\/evidence$/ },
  { method: 'DELETE', pattern: /^evidence\/[a-z0-9]{1,40}$/ },
];

export function isProxyAllowed(method: string, segments: readonly string[]): boolean {
  const path = segments.join('/');
  return allowed.some((rule) => rule.method === method && rule.pattern.test(path));
}

/**
 * Cookies are SameSite=Lax already; this also refuses cross-site requests that carry them.
 * Browsers send `Sec-Fetch-Site` on every fetch; fall back to comparing `Origin`.
 */
export function isSameOrigin(headers: Headers, requestUrl: string): boolean {
  const site = headers.get('sec-fetch-site');
  if (site) return site === 'same-origin';
  const origin = headers.get('origin');
  return origin !== null && origin === new URL(requestUrl).origin;
}

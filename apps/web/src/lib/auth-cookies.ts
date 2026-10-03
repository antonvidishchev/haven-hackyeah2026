/** Cookie names shared by the proxy (which can't import server-only modules) and the server. */
export const SESSION_COOKIE = 'haven-session';
export const GUEST_COOKIE = 'haven-guest';
/** Set by the proxy so server layouts know which path they render. */
export const PATH_HEADER = 'x-haven-path';

export function authCookieOptions(expiresAt: string) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    // The demo runs on plain http://127.0.0.1; set HAVEN_SECURE_COOKIES=true behind HTTPS.
    secure: process.env.HAVEN_SECURE_COOKIES === 'true',
    expires: new Date(expiresAt),
  };
}

import { NextResponse, type NextRequest } from 'next/server';
import { createHavenClient } from '@haven/api-client';
import { pathAccess } from '@haven/shared';

import { authCookieOptions, GUEST_COOKIE, PATH_HEADER, SESSION_COOKIE } from '@/lib/auth-cookies';

const api = createHavenClient({
  baseUrl: process.env.HAVEN_API_URL ?? 'http://127.0.0.1:3001/api/v1',
});

/**
 * Routing only — the API stays the authority on every request.
 * - Staff areas without a session go to sign-in.
 * - The first visit to a resident area creates a guest, so nobody needs an account to report.
 * - Layouts learn the path through a request header to pick the access page.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const path = `${pathname}${search}`;
  const access = pathAccess(pathname);
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (access.kind === 'staff' && !hasSession) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', path);
    return NextResponse.redirect(login);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATH_HEADER, path);

  let guest: { token: string; expiresAt: string } | null = null;
  if (access.kind === 'resident' && !hasSession && !request.cookies.has(GUEST_COOKIE)) {
    try {
      guest = await api.auth.guest();
      // Let this very request render as the new guest.
      const cookie = requestHeaders.get('cookie');
      const guestCookie = `${GUEST_COOKIE}=${guest.token}`;
      requestHeaders.set('cookie', cookie ? `${cookie}; ${guestCookie}` : guestCookie);
    } catch {
      // API unavailable: render anonymously; the page shows its own error state.
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (guest) response.cookies.set(GUEST_COOKIE, guest.token, authCookieOptions(guest.expiresAt));
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|brand|icon.svg|favicon.ico).*)'],
};

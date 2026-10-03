import 'server-only';

import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { ApiError } from '@haven/api-client';
import type { SessionPrincipal } from '@haven/shared';

import { publicApi } from './api';
import { GUEST_COOKIE, PATH_HEADER, SESSION_COOKIE } from './auth-cookies';

export type { SessionPrincipal };

/** The token to call the API with: the signed-in session, else the guest token. */
export async function getToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? jar.get(GUEST_COOKIE)?.value ?? null;
}

async function principalFor(token: string | undefined): Promise<SessionPrincipal | null> {
  if (!token) return null;
  try {
    return (await publicApi.auth.session({ token })).principal;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

/**
 * The signed-in principal (or the guest), checked with the API once per request.
 * Null for an anonymous visitor or an expired session.
 */
export const getPrincipal = cache(async (): Promise<SessionPrincipal | null> => {
  const jar = await cookies();
  return (
    (await principalFor(jar.get(SESSION_COOKIE)?.value)) ??
    (await principalFor(jar.get(GUEST_COOKIE)?.value))
  );
});

/** The path being rendered, as forwarded by the proxy. */
export async function getRequestPath(): Promise<string> {
  return (await headers()).get(PATH_HEADER) ?? '/';
}

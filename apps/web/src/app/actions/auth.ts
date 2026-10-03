'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ApiError } from '@haven/api-client';
import {
  canAccessPath,
  defaultLandingPath,
  demoAccounts,
  isSafeReturnPath,
  loginRequestSchema,
} from '@haven/shared';

import { publicApi } from '@/lib/api';
import { authCookieOptions, SESSION_COOKIE } from '@/lib/auth-cookies';

export type SignInState = { error?: 'invalid' | 'tooMany' | 'unavailable'; username?: string };

export async function signIn(_previous: SignInState, formData: FormData): Promise<SignInState> {
  // Demo cards send only the username; their published password is looked up here.
  const demo = demoAccounts.find((account) => account.username === formData.get('demo'));
  const parsed = loginRequestSchema.safeParse(
    demo
      ? { username: demo.username, password: demo.password }
      : { username: formData.get('username'), password: formData.get('password') },
  );
  const username =
    typeof formData.get('username') === 'string' ? String(formData.get('username')) : '';
  if (!parsed.success) return { error: 'invalid', username };

  // Next keeps a client-supplied X-Forwarded-For, so it is only trusted behind a proxy that sets it.
  const forwardedFor =
    process.env.HAVEN_TRUST_FORWARDED_FOR === 'true'
      ? (await headers()).get('x-forwarded-for')
      : null;
  let session;
  try {
    session = await publicApi.auth.login(parsed.data, {
      headers: forwardedFor ? { 'x-forwarded-for': forwardedFor } : undefined,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return { error: 'invalid', username };
    if (error instanceof ApiError && error.status === 429) return { error: 'tooMany', username };
    return { error: 'unavailable', username };
  }

  (await cookies()).set(SESSION_COOKIE, session.token, authCookieOptions(session.expiresAt));

  const next = formData.get('next');
  const role = session.principal.role;
  redirect(isSafeReturnPath(next) && canAccessPath(role, next) ? next : defaultLandingPath(role));
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await publicApi.auth.logout({ token }).catch(() => undefined);
  jar.delete(SESSION_COOKIE);
  redirect(defaultLandingPath(null));
}

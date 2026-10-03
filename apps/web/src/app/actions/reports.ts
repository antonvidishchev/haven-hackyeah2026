'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ApiError } from '@haven/api-client';

import { publicApi } from '@/lib/api';
import { authCookieOptions, GUEST_COOKIE, SESSION_COOKIE } from '@/lib/auth-cookies';
import { getToken } from '@/lib/session';

export type StartReportState = { error?: 'unavailable' | 'notAllowed' };

async function newGuestToken(): Promise<string> {
  const guest = await publicApi.auth.guest();
  (await cookies()).set(GUEST_COOKIE, guest.token, authCookieOptions(guest.expiresAt));
  return guest.token;
}

/** Creates a private draft (as a new guest if needed) and opens it in the editor. */
export async function startReport(): Promise<StartReportState> {
  const token = await getToken();
  let id: string;
  try {
    try {
      id = (await publicApi.reports.create({ token: token ?? (await newGuestToken()) })).id;
    } catch (error) {
      // An expired or revoked token: carry on as a fresh guest.
      if (!(token && error instanceof ApiError && error.status === 401)) throw error;
      (await cookies()).delete(SESSION_COOKIE);
      id = (await publicApi.reports.create({ token: await newGuestToken() })).id;
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) return { error: 'notAllowed' };
    return { error: 'unavailable' };
  }
  redirect(`/report/${id}`);
}

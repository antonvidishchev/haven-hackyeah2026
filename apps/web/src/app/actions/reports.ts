'use server';

import { cookies } from 'next/headers';
import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { ApiError } from '@haven/api-client';
import { reportIdSchema } from '@haven/shared';

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

export type FileReportResult =
  { ok: true; revision: number } | { ok: false; error: 'conflict' | 'incomplete' | 'unavailable' };

/** Files a draft. The client flushes its autosave first and passes the revision it saw. */
export async function fileReport(id: string, expectedRevision: number): Promise<FileReportResult> {
  const token = await getToken();
  if (!token || !reportIdSchema.safeParse(id).success) return { ok: false, error: 'unavailable' };
  try {
    const report = await publicApi.reports.submit(id, { expectedRevision }, { token });
    refresh();
    return { ok: true, revision: report.revision };
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) return { ok: false, error: 'conflict' };
    if (error instanceof ApiError && error.status === 422)
      return { ok: false, error: 'incomplete' };
    return { ok: false, error: 'unavailable' };
  }
}

export type EscalateState = { error?: 'unconfirmed' | 'unavailable'; done?: boolean };

export async function escalateReport(
  id: string,
  _previous: EscalateState,
  form: FormData,
): Promise<EscalateState> {
  if (form.get('verification') !== 'on') return { error: 'unconfirmed' };
  const token = await getToken();
  if (!token || !reportIdSchema.safeParse(id).success) return { error: 'unavailable' };
  try {
    await publicApi.reports.escalate(id, { verificationConfirmed: true }, { token });
  } catch {
    return { error: 'unavailable' };
  }
  refresh();
  return { done: true };
}

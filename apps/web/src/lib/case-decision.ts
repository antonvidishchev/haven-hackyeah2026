import 'server-only';

import { refresh } from 'next/cache';
import { ApiError } from '@haven/api-client';
import { caseIdSchema } from '@haven/shared';

import { getToken } from './session';

export type DecisionError = 'stale' | 'closed' | 'invalid' | 'unavailable';
export type DecisionResult = { ok: true } | { ok: false; error: DecisionError };

/** Runs one staff decision on a case and maps the API's refusals to what the panel shows. */
export async function runCaseDecision(
  id: string,
  call: (token: string) => Promise<unknown>,
): Promise<DecisionResult> {
  const token = await getToken();
  if (!token || !caseIdSchema.safeParse(id).success) return { ok: false, error: 'unavailable' };
  try {
    await call(token);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 409) {
        return { ok: false, error: error.code === 'case_closed' ? 'closed' : 'stale' };
      }
      if (error.status === 400) return { ok: false, error: 'invalid' };
    }
    return { ok: false, error: 'unavailable' };
  }
  refresh();
  return { ok: true };
}

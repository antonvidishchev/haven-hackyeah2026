'use server';

import { refresh } from 'next/cache';
import { ApiError } from '@haven/api-client';
import {
  caseIdSchema,
  type CancelCaseRequest,
  type PromoteCaseRequest,
  type ReplyCaseRequest,
} from '@haven/shared';

import { publicApi } from '@/lib/api';
import { getToken } from '@/lib/session';

export type DecisionError = 'stale' | 'closed' | 'invalid' | 'unavailable';
export type DecisionResult = { ok: true } | { ok: false; error: DecisionError };

async function decide(
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

export async function promoteCase(id: string, body: PromoteCaseRequest) {
  return decide(id, (token) => publicApi.operator.promote(id, body, { token }));
}

export async function cancelCase(id: string, body: CancelCaseRequest) {
  return decide(id, (token) => publicApi.operator.cancel(id, body, { token }));
}

export async function replyToResident(id: string, body: ReplyCaseRequest) {
  return decide(id, (token) => publicApi.operator.reply(id, body, { token }));
}

'use server';

import type { CancelCaseRequest, PromoteCaseRequest, ReplyCaseRequest } from '@haven/shared';

import { publicApi } from '@/lib/api';
import { runCaseDecision } from '@/lib/case-decision';

export async function promoteCase(id: string, body: PromoteCaseRequest) {
  return runCaseDecision(id, (token) => publicApi.operator.promote(id, body, { token }));
}

export async function cancelCase(id: string, body: CancelCaseRequest) {
  return runCaseDecision(id, (token) => publicApi.operator.cancel(id, body, { token }));
}

export async function replyToResident(id: string, body: ReplyCaseRequest) {
  return runCaseDecision(id, (token) => publicApi.operator.reply(id, body, { token }));
}

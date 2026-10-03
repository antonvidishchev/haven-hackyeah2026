'use server';

import type { ClaimCaseRequest, CloseCaseRequest, RecordActionRequest } from '@haven/shared';

import { publicApi } from '@/lib/api';
import { runCaseDecision } from '@/lib/case-decision';

export async function claimCase(id: string, body: ClaimCaseRequest) {
  return runCaseDecision(id, (token) => publicApi.official.claim(id, body, { token }));
}

export async function recordExternalAction(id: string, body: RecordActionRequest) {
  return runCaseDecision(id, (token) => publicApi.official.recordAction(id, body, { token }));
}

export async function closeCase(id: string, body: CloseCaseRequest) {
  return runCaseDecision(id, (token) => publicApi.official.close(id, body, { token }));
}

import 'server-only';

import { ApiError } from '@haven/api-client';
import type {
  OperatorCaseDetail,
  OperatorCaseListResponse,
  TriageStatus,
  VaultListResponse,
} from '@haven/shared';

import { publicApi } from './api';
import { getToken } from './session';

/** The operator queue for one triage view. The staff layout has already checked the role. */
export async function getQueue(view: TriageStatus): Promise<OperatorCaseListResponse> {
  return publicApi.operator.cases(view, { token: await getToken() });
}

/** One case for the operator, or null when it doesn't exist. */
export async function getOperatorCase(id: string): Promise<OperatorCaseDetail | null> {
  try {
    return await publicApi.operator.case(id, { token: await getToken() });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getVault(): Promise<VaultListResponse> {
  return publicApi.operator.vault({ token: await getToken() });
}

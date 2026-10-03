import 'server-only';

import { ApiError } from '@haven/api-client';
import type { OfficialCaseDetail, OfficialCaseListResponse } from '@haven/shared';

import { publicApi } from './api';
import { getToken } from './session';

/** The official's organisation's cases. The staff layout has already checked the role. */
export async function getOfficialCases(): Promise<OfficialCaseListResponse> {
  return publicApi.official.cases({ token: await getToken() });
}

/** One case for the official, or null when it doesn't exist or belongs to someone else. */
export async function getOfficialCase(id: string): Promise<OfficialCaseDetail | null> {
  try {
    return await publicApi.official.case(id, { token: await getToken() });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

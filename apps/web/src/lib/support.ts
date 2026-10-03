import 'server-only';

import { ApiError } from '@haven/api-client';
import type { SupportMatchesResponse } from '@haven/shared';

import { publicApi } from './api';
import { getToken } from './session';

/** Help that fits the visitor's filed report, or null when there is none to show. */
export async function getReportSupportMatches(id: string): Promise<SupportMatchesResponse | null> {
  const token = await getToken();
  if (!token) return null;
  try {
    return await publicApi.reports.supportMatches(id, { token });
  } catch (error) {
    if (error instanceof ApiError && [401, 404, 409].includes(error.status)) return null;
    throw error;
  }
}

/** The same matches for the operator's case view. The staff layout has already checked the role. */
export async function getCaseSupportMatches(id: string): Promise<SupportMatchesResponse | null> {
  try {
    return await publicApi.operator.supportMatches(id, { token: await getToken() });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

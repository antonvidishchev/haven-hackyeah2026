import 'server-only';

import { ApiError } from '@haven/api-client';
import type { ReportDetail, ReportListResponse } from '@haven/shared';

import { publicApi } from './api';
import { getToken } from './session';

/** The visitor's own report, or null when it doesn't exist or isn't theirs (the API says 404). */
export async function getOwnReport(id: string): Promise<ReportDetail | null> {
  const token = await getToken();
  if (!token) return null;
  try {
    return await publicApi.reports.get(id, { token });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 401)) return null;
    throw error;
  }
}

/** The visitor's reports, newest first. Empty for anonymous visitors and staff. */
export async function listOwnReports(cursor?: string): Promise<ReportListResponse> {
  const empty: ReportListResponse = { items: [], nextCursor: null };
  const token = await getToken();
  if (!token) return empty;
  try {
    return await publicApi.reports.list({ cursor }, { token });
  } catch (error) {
    if (error instanceof ApiError && [400, 401, 403].includes(error.status)) return empty;
    throw error;
  }
}

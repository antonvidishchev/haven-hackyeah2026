import 'server-only';

import type { AuditAction, AuditListResponse } from '@haven/shared';

import { publicApi } from './api';
import { getToken } from './session';

/** One page of the audit log. The staff layout has already checked the admin role. */
export async function getAuditLog(query: {
  action?: AuditAction;
  actor?: string;
  cursor?: string;
}): Promise<AuditListResponse> {
  return publicApi.admin.audit(query, { token: await getToken() });
}

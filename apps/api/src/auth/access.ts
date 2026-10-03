import type { OrganizationId, Role, SessionPrincipal } from '@haven/shared';
import { apiError } from '../common/http-exception.filter.js';

/** The message shown when a role is not allowed, named after who *is* allowed. */
export function accessRequiredMessage(roles: readonly Role[]): string {
  const has = (role: Role) => roles.includes(role);
  if (has('operator') && has('official')) return 'Backoffice access required';
  if (has('operator')) return 'Operator access required';
  if (has('official')) return 'Official access required';
  if (has('admin')) return 'Admin access required';
  return 'Access required';
}

/** Officials only see their own organisation's cases. Other roles are not scoped. */
export function assertOrganizationScope(
  principal: SessionPrincipal,
  organizationId: OrganizationId,
): void {
  if (principal.role === 'official' && principal.organizationId !== organizationId) {
    throw apiError(403, 'organization_scope', 'This case belongs to another organisation');
  }
}

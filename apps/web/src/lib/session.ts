import 'server-only';

import type { OrganizationId, Role } from '@haven/shared';

export type SessionPrincipal = {
  id: string;
  role: Role;
  name: string;
  organizationId?: OrganizationId;
};

/** The signed-in principal, or null for an anonymous visitor. Sign-in arrives in Phase 2. */
export async function getPrincipal(): Promise<SessionPrincipal | null> {
  return null;
}

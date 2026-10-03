import { isStaffRole } from '@haven/shared';

import type { SessionPrincipal } from '@haven/shared';

import { ResidentShell } from './resident-shell';
import { StaffShell } from './staff-shell';

/**
 * Picks the shell by role: staff get the workspace sidebar everywhere; residents and guests get
 * the resident header and tab bar. Staff-only routes always use the staff shell.
 */
export function AppShell({
  principal,
  area,
  children,
}: {
  principal: SessionPrincipal | null;
  area: 'resident' | 'staff';
  children: React.ReactNode;
}) {
  const Shell = area === 'staff' || isStaffRole(principal?.role) ? StaffShell : ResidentShell;
  return <Shell principal={principal}>{children}</Shell>;
}

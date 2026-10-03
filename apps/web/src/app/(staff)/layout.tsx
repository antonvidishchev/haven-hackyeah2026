import { redirect } from 'next/navigation';
import { canAccessPath, pathAccess } from '@haven/shared';

import { AccessRequired } from '@/components/auth/access-required';
import { AppShell } from '@/components/navigation/app-shell';
import { getPrincipal, getRequestPath } from '@/lib/session';

export default async function StaffLayout({ children }: LayoutProps<'/'>) {
  const [principal, path] = await Promise.all([getPrincipal(), getRequestPath()]);
  // The proxy redirects visitors without a session cookie; this also catches expired sessions.
  if (!principal || principal.role === 'guest') {
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }
  const access = pathAccess(path);
  const denied = access.kind === 'staff' && !canAccessPath(principal.role, path);

  return (
    // A denied resident stays in the resident shell rather than an empty staff sidebar.
    <AppShell area={denied ? 'resident' : 'staff'} principal={principal}>
      {denied ? (
        <AccessRequired principal={principal} requirement={access.requirement} path={path} />
      ) : (
        children
      )}
    </AppShell>
  );
}

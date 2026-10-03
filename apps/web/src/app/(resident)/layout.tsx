import { canAccessPath, pathAccess } from '@haven/shared';

import { AccessRequired } from '@/components/auth/access-required';
import { AppShell } from '@/components/navigation/app-shell';
import { getPrincipal, getRequestPath } from '@/lib/session';

export default async function ResidentLayout({ children }: LayoutProps<'/'>) {
  const [principal, path] = await Promise.all([getPrincipal(), getRequestPath()]);
  // Staff accounts don't file resident reports; explain rather than show a resident form.
  const denied =
    principal !== null &&
    pathAccess(path).kind === 'resident' &&
    !canAccessPath(principal.role, path);

  return (
    <AppShell area="resident" principal={principal}>
      {denied ? (
        <AccessRequired principal={principal} requirement="resident" path={path} />
      ) : (
        children
      )}
    </AppShell>
  );
}

import { AppShell } from '@/components/navigation/app-shell';
import { getPrincipal } from '@/lib/session';

export default async function StaffLayout({ children }: LayoutProps<'/'>) {
  return (
    <AppShell area="staff" principal={await getPrincipal()}>
      {children}
    </AppShell>
  );
}

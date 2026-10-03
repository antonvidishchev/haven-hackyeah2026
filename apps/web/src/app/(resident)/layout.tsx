import { AppShell } from '@/components/navigation/app-shell';
import { getPrincipal } from '@/lib/session';

export default async function ResidentLayout({ children }: LayoutProps<'/'>) {
  return (
    <AppShell area="resident" principal={await getPrincipal()}>
      {children}
    </AppShell>
  );
}

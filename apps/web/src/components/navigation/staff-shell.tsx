import { Archive, Briefcase, ListTodo, Map, Menu, ScrollText, UserRound } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { canAccessPath, type Role } from '@haven/shared';

import { SignOutButton } from '@/components/auth/sign-out-button';
import { HavenLogo } from '@/components/brand/haven-mark';
import type { SessionPrincipal } from '@haven/shared';

import { LanguageSwitch } from './language-switch';
import { NavLink } from './nav-link';

function descriptorKey(role: Role | undefined) {
  switch (role) {
    case 'official':
      return 'caseWorkspace';
    case 'admin':
      return 'adminWorkspace';
    default:
      return 'operatorWorkspace';
  }
}

const signOutClass =
  'min-h-10 rounded-md px-1 text-sm font-medium text-sidebar-foreground/80 hover:text-sidebar-foreground';

export async function StaffShell({
  principal,
  children,
}: {
  principal: SessionPrincipal | null;
  children: React.ReactNode;
}) {
  const t = await getTranslations('nav');
  const role = principal?.role;
  const items = [
    { href: '/queue', label: t('queue'), icon: ListTodo },
    { href: '/vault', label: t('vault'), icon: Archive },
    { href: '/cases', label: t('cases'), icon: Briefcase },
    { href: '/admin/audit', label: t('audit'), icon: ScrollText },
    { href: '/area-reports', label: t('areaReports'), icon: Map },
    { href: '/settings', label: t('account'), icon: UserRound },
  ].filter((item) => !role || canAccessPath(role, item.href));
  const descriptor = t(descriptorKey(role));

  const list = (
    <ul className="flex flex-col gap-0.5">
      {items.map(({ href, label, icon: Icon }) => (
        <li key={href}>
          <NavLink
            href={href}
            className="flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
          >
            <Icon aria-hidden className="size-4" />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-card px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t('skip')}
      </a>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r bg-sidebar p-4 lg:flex">
        <Link href="/" className="flex flex-col gap-1 rounded-md px-2" aria-label={t('homeLabel')}>
          <HavenLogo />
          <span className="text-xs font-medium text-muted-foreground">{descriptor}</span>
        </Link>
        <nav aria-label={t('workspace')}>{list}</nav>
        <div className="mt-auto flex flex-col gap-3 px-2">
          {principal ? <p className="text-sm font-medium">{principal.name}</p> : null}
          <LanguageSwitch />
          {principal ? <SignOutButton className={signOutClass} /> : null}
        </div>
      </aside>

      <header className="border-b bg-sidebar lg:hidden">
        <details className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 [&::-webkit-details-marker]:hidden">
            <HavenLogo />
            <span className="text-xs font-medium text-muted-foreground">{descriptor}</span>
            <span className="ml-auto inline-flex size-11 items-center justify-center rounded-md border bg-card">
              <Menu aria-hidden className="size-5" />
              <span className="sr-only">{t('menu')}</span>
            </span>
          </summary>
          <div className="flex flex-col gap-4 border-t px-4 py-3">
            <nav aria-label={t('workspace')}>{list}</nav>
            <LanguageSwitch />
            {principal ? <SignOutButton className={signOutClass} /> : null}
          </div>
        </details>
      </header>

      <main id="main" className="flex min-w-0 flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}

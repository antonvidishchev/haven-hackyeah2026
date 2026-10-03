import { FileText, House, Map, Plus, UserRound } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { HavenLogo } from '@/components/brand/haven-mark';
import { buttonVariants } from '@/components/ui/button';
import type { SessionPrincipal } from '@haven/shared';
import { cn } from '@/lib/utils';

import { LanguageSwitch } from './language-switch';
import { NavLink } from './nav-link';

export async function ResidentShell({
  principal,
  children,
}: {
  principal: SessionPrincipal | null;
  children: React.ReactNode;
}) {
  const t = await getTranslations('nav');
  const items = [
    { href: '/area-reports', label: t('areaReports'), icon: Map },
    { href: '/start', label: t('home'), icon: House },
    { href: '/my-reports', label: t('myReports'), icon: FileText },
    { href: '/settings', label: t('account'), icon: UserRound },
  ];
  const signedIn = principal && principal.role !== 'guest';

  return (
    <div className="flex flex-1 flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-card px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t('skip')}
      </a>
      <header className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-5 py-3">
          <Link href="/area-reports" className="rounded-md" aria-label={t('homeLabel')}>
            <HavenLogo />
          </Link>
          <nav aria-label={t('main')} className="hidden md:block">
            <ul className="flex items-center gap-1">
              {items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    href={item.href}
                    className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    activeClassName="bg-secondary text-secondary-foreground"
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/report/new"
              className={cn(buttonVariants(), 'hidden rounded-xl sm:inline-flex')}
            >
              <Plus aria-hidden />
              {t('report')}
            </Link>
            <Link
              href="/report/new"
              aria-label={t('report')}
              className={cn(buttonVariants({ size: 'icon' }), 'size-11 rounded-xl sm:hidden')}
            >
              <Plus aria-hidden />
            </Link>
            <LanguageSwitch />
            {signedIn ? (
              <Link
                href="/settings"
                className="hidden min-h-11 items-center rounded-lg px-2 text-sm font-medium md:inline-flex"
              >
                {principal.name}
              </Link>
            ) : (
              <Link
                href="/login"
                className="hidden min-h-11 items-center rounded-lg px-2 text-sm font-medium text-primary underline-offset-4 hover:underline md:inline-flex"
              >
                {t('signIn')}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main
        id="main"
        className="flex flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0"
      >
        {children}
      </main>

      <nav
        aria-label={t('main')}
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-4">
          {items.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <NavLink
                href={href}
                className="flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium text-muted-foreground"
                activeClassName="text-primary"
              >
                <Icon aria-hidden className="size-5" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

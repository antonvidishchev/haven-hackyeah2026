import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { defaultLandingPath, type AccessRequirement } from '@haven/shared';

import type { SessionPrincipal } from '@haven/shared';

/**
 * Shown in place of a page the signed-in principal can't open. The API enforces the same rule;
 * this only explains it kindly and offers a way on.
 */
export async function AccessRequired({
  principal,
  requirement,
  path,
  className = 'staff-page',
}: {
  principal: SessionPrincipal;
  requirement: AccessRequirement | 'resident';
  path: string;
  className?: string;
}) {
  const t = await getTranslations('access');
  return (
    <div className={className}>
      <section className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-2xl border bg-card p-6">
        <ShieldAlert aria-hidden className="size-8 text-warning" />
        <h1 className="text-2xl font-semibold tracking-tight">{t(requirement)}</h1>
        <p className="text-muted-foreground">{t('lead', { name: principal.name })}</p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/login?next=${encodeURIComponent(path)}`} className="resident-button">
            {t('switchAccount')}
          </Link>
          <Link href={defaultLandingPath(principal.role)} className="resident-button secondary">
            {t('goToMyArea')}
          </Link>
        </div>
      </section>
    </div>
  );
}

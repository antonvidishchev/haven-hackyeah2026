import { ArrowRight, Plus, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { DisclaimerCard } from '@/components/haven/disclaimer-card';
import { SimulationNote } from '@/components/haven/simulation-note';
import { listOwnReports } from '@/lib/reports';
import { getPrincipal } from '@/lib/session';

/** The newest private draft, for the "Continue your draft" card. */
async function latestDraft() {
  const principal = await getPrincipal();
  if (principal?.role !== 'guest' && principal?.role !== 'resident') return null;
  const { items } = await listOwnReports();
  return items.find((report) => report.state === 'draft') ?? null;
}

export default async function HomePage() {
  const [t, draft] = await Promise.all([getTranslations('home'), latestDraft()]);
  return (
    <div className="resident-page">
      {draft ? (
        <section className="resident-card" aria-labelledby="continue-draft">
          <h2 id="continue-draft">{t('continueTitle')}</h2>
          <p>{draft.descriptionExcerpt || t('continueEmpty')}</p>
          <Link href={`/report/${draft.id}`} className="resident-button self-start">
            {t('continue')}
            <ArrowRight aria-hidden className="size-5" />
          </Link>
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <h1>{t('title')}</h1>
        <p className="text-lg leading-relaxed text-muted-foreground">{t('lead')}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/report/new" className="resident-button">
            <Plus aria-hidden className="size-5" />
            {t('primary')}
          </Link>
          <Link href="/area-reports" className="resident-button secondary">
            {t('secondary')}
            <ArrowRight aria-hidden className="size-5" />
          </Link>
        </div>
      </section>

      <section className="resident-card" aria-labelledby="no-account">
        <h2 id="no-account" className="flex items-center gap-2">
          <ShieldCheck aria-hidden className="size-5 text-primary" />
          {t('noAccountTitle')}
        </h2>
        <p>{t('noAccountBody')}</p>
      </section>

      <section className="resident-card" aria-labelledby="next">
        <h2 id="next">{t('nextTitle')}</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-foreground">
          <li>{t('next1')}</li>
          <li>{t('next2')}</li>
          <li>{t('next3')}</li>
        </ol>
      </section>

      <DisclaimerCard />
      <SimulationNote />
    </div>
  );
}

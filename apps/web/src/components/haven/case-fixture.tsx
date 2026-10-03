import { getTranslations } from 'next-intl/server';

import { SimulationNote } from '@/components/haven/simulation-note';
import { StatusBadge } from '@/components/haven/status-badge';
import { getEnumLabels } from '@/i18n/labels';

/** Phase 1 sample of a case detail layout, shared by the operator and official views. */
export async function CaseFixture({ actions }: { actions: React.ReactNode }) {
  const [t, ts, tc, tr, labels] = await Promise.all([
    getTranslations('queue'),
    getTranslations('staff'),
    getTranslations('common'),
    getTranslations('report'),
    getEnumLabels(),
  ]);
  return (
    <>
      <SimulationNote>{tc('example')}</SimulationNote>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <section className="staff-panel flex flex-col gap-3" aria-labelledby="case-report">
            <h2 id="case-report" className="font-semibold">
              {t('report')}
            </h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <dt className="text-muted-foreground">{ts('reference')}</dt>
              <dd className="resident-reference">HVN-2026-000123</dd>
              <dt className="text-muted-foreground">{ts('category')}</dt>
              <dd>{labels.category.verbal_harassment}</dd>
              <dt className="text-muted-foreground">{ts('district')}</dt>
              <dd>{labels.district.XIII}</dd>
              <dt className="text-muted-foreground">{ts('priority')}</dt>
              <dd>
                <StatusBadge tone="attention">{labels.queuePriority.expedited}</StatusBadge>
              </dd>
            </dl>
            <p className="text-sm">{tr('sampleWhat')}</p>
          </section>
          <section className="staff-panel flex flex-col gap-2" aria-labelledby="case-routing">
            <h2 id="case-routing" className="font-semibold">
              {t('routing')}
            </h2>
            <p className="text-sm text-muted-foreground">{t('routingBody')}</p>
          </section>
        </div>
        <div className="flex flex-col gap-4">
          <section className="staff-panel flex flex-col gap-2" aria-labelledby="case-advisory">
            <h2 id="case-advisory" className="font-semibold">
              {t('advisory')}
            </h2>
            <p className="text-sm text-muted-foreground">{t('advisoryBody')}</p>
          </section>
          <section className="staff-panel flex flex-col gap-3" aria-labelledby="case-actions">
            <h2 id="case-actions" className="font-semibold">
              {t('actions')}
            </h2>
            <div className="flex flex-wrap gap-2">{actions}</div>
            <p className="text-xs text-muted-foreground">{tc('comingSoon')}</p>
          </section>
        </div>
      </div>
    </>
  );
}

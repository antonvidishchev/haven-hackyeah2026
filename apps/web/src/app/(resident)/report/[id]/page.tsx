import type { Metadata } from 'next';
import { getFormatter, getTranslations } from 'next-intl/server';

import { ReportStages } from '@/components/haven/report-stages';
import { SimulationNote } from '@/components/haven/simulation-note';
import { StatusBadge } from '@/components/haven/status-badge';
import { getEnumLabels } from '@/i18n/labels';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('report'))('title') };
}

// Phase 1: a fixture layout. Real reports load from the API in Phase 3.
const sample = {
  reference: 'HVN-2026-000123',
  filedAt: new Date('2026-09-28T18:40:00Z'),
  routedAt: new Date('2026-09-28T18:41:00Z'),
  messageAt: new Date('2026-09-29T09:15:00Z'),
};

export default async function ReportPage() {
  const [t, ts, tc, labels, format] = await Promise.all([
    getTranslations('report'),
    getTranslations('stages'),
    getTranslations('common'),
    getEnumLabels(),
    getFormatter(),
  ]);
  const when = (date: Date) => format.dateTime(date, { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <div className="resident-page">
      <SimulationNote>{tc('example')}</SimulationNote>
      <div className="flex flex-col gap-3">
        <h1>{labels.category.verbal_harassment}</h1>
        <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="text-muted-foreground">{t('reference')}</dt>
            <dd className="resident-reference font-medium">{sample.reference}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="text-muted-foreground">{t('status')}</dt>
            <dd>
              <StatusBadge tone="info">{labels.reportState.submitted}</StatusBadge>
            </dd>
          </div>
        </dl>
      </div>
      <ReportStages
        label={ts('label')}
        steps={[ts('draft'), ts('filed'), ts('routed')]}
        current={2}
      />
      <section className="resident-card">
        <p className="text-base text-foreground">{t('sampleWhat')}</p>
      </section>
      <section className="flex flex-col gap-4" aria-labelledby="timeline">
        <h2 id="timeline">{t('timeline')}</h2>
        <ol className="resident-timeline">
          <li>
            <p className="font-medium">{t('eventMessage')}</p>
            <p className="text-sm text-muted-foreground">{when(sample.messageAt)}</p>
          </li>
          <li>
            <p className="font-medium">{t('eventRouted')}</p>
            <p className="text-sm text-muted-foreground">{when(sample.routedAt)}</p>
          </li>
          <li>
            <p className="font-medium">{t('eventFiled')}</p>
            <p className="text-sm text-muted-foreground">{when(sample.filedAt)}</p>
          </li>
        </ol>
      </section>
    </div>
  );
}

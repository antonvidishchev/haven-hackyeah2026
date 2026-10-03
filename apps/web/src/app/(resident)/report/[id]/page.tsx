import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { reportIdSchema, reportTimeline } from '@haven/shared';

import { DisclaimerCard } from '@/components/haven/disclaimer-card';
import { StatusBadge } from '@/components/haven/status-badge';
import { ReportEditor } from '@/components/report/report-editor';
import { getEnumLabels } from '@/i18n/labels';
import { evidenceMaxBytes } from '@/lib/env';
import { getOwnReport } from '@/lib/reports';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('report'))('title') };
}

export default async function ReportPage({ params }: PageProps<'/report/[id]'>) {
  const { id } = await params;
  if (!reportIdSchema.safeParse(id).success) notFound();
  const [report, t, labels, format] = await Promise.all([
    getOwnReport(id),
    getTranslations('report'),
    getEnumLabels(),
    getFormatter(),
  ]);
  if (!report) notFound();

  const when = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: 'medium', timeStyle: 'short' });
  const draft = report.state === 'draft';
  return (
    <div className="resident-page">
      <div className="flex flex-col gap-3">
        <h1>{draft ? t('draftTitle') : labels.category[report.fields.category]}</h1>
        <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="text-muted-foreground">{t('reference')}</dt>
            <dd className={report.reference ? 'resident-reference font-medium' : 'font-medium'}>
              {report.reference ?? t('referencePending')}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="text-muted-foreground">{t('status')}</dt>
            <dd>
              <StatusBadge tone={draft ? 'neutral' : 'info'}>
                {labels.reportState[report.state]}
              </StatusBadge>
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">{t('version')}</dt>
            <dd className="tabular-nums">{report.revision}</dd>
          </div>
        </dl>
        {draft ? <p className="text-muted-foreground">{t('draftLead')}</p> : null}
      </div>

      <ReportEditor
        report={report}
        evidenceMaxBytes={evidenceMaxBytes}
        disclaimer={<DisclaimerCard />}
      />

      <section className="flex flex-col gap-4" aria-labelledby="history">
        <h2 id="history">{t('history')}</h2>
        <ol className="resident-timeline">
          {reportTimeline(report.revisions).map((event) => (
            <li key={event.revision}>
              <p className="font-medium">{t(`event.${event.kind}`)}</p>
              <p className="text-sm text-muted-foreground">
                <time dateTime={event.at}>{when(event.at)}</time>
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

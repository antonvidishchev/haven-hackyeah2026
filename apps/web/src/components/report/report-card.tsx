import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import type { ReportSummary } from '@haven/shared';

import { StatusBadge } from '@/components/haven/status-badge';
import { getEnumLabels } from '@/i18n/labels';

/** One report in My reports: what, its state, its reference and when it last changed. */
export async function ReportCard({ report }: { report: ReportSummary }) {
  const [t, labels, format] = await Promise.all([
    getTranslations('myReports'),
    getEnumLabels(),
    getFormatter(),
  ]);
  const draft = report.state === 'draft';
  return (
    <article className="resident-card relative flex flex-col gap-2 hover:border-primary/50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">
          <Link href={`/report/${report.id}`} className="after:absolute after:inset-0">
            {labels.category[report.category]}
          </Link>
        </h2>
        <StatusBadge tone={draft ? 'neutral' : 'info'}>
          {labels.reportState[report.state]}
        </StatusBadge>
      </div>
      {report.descriptionExcerpt ? (
        <p className="line-clamp-2">{report.descriptionExcerpt}</p>
      ) : null}
      <p className="flex flex-wrap gap-x-4 text-sm">
        {report.reference ? (
          <span className="resident-reference text-foreground">{report.reference}</span>
        ) : null}
        <span>
          {t(draft ? 'updated' : 'filedOn', {
            date: format.dateTime(new Date(report.submittedAt ?? report.updatedAt), {
              dateStyle: 'medium',
            }),
          })}
        </span>
        {report.evidenceCount > 0 ? (
          <span>{t('evidenceCount', { count: report.evidenceCount })}</span>
        ) : null}
      </p>
    </article>
  );
}

import { FileText, Info } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { EmptyState } from '@/components/haven/empty-state';
import { ReportCard } from '@/components/report/report-card';
import { listOwnReports } from '@/lib/reports';
import { getPrincipal } from '@/lib/session';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('myReports'))('title') };
}

export default async function MyReportsPage({ searchParams }: PageProps<'/my-reports'>) {
  const { cursor } = await searchParams;
  const [t, principal, reports] = await Promise.all([
    getTranslations('myReports'),
    getPrincipal(),
    listOwnReports(typeof cursor === 'string' ? cursor : undefined),
  ]);
  return (
    <div className="resident-page">
      <div className="flex flex-col gap-2">
        <h1>{t('title')}</h1>
        <p className="text-muted-foreground">{t('lead')}</p>
      </div>

      {principal?.role !== 'resident' ? (
        <p className="flex gap-3 rounded-2xl border bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{t('guestNotice')}</span>
        </p>
      ) : null}

      {reports.items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t('emptyTitle')}
          action={
            <Link href="/report/new" className="resident-button">
              {t('start')}
            </Link>
          }
        >
          {t('emptyBody')}
        </EmptyState>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {reports.items.map((report) => (
              <li key={report.id}>
                <ReportCard report={report} />
              </li>
            ))}
          </ul>
          {reports.nextCursor ? (
            <Link
              href={`/my-reports?cursor=${encodeURIComponent(reports.nextCursor)}`}
              className="resident-button secondary self-start"
            >
              {t('older')}
            </Link>
          ) : null}
        </>
      )}
    </div>
  );
}

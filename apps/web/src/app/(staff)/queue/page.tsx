import { Inbox } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { caseViewSchema, triageStatuses } from '@haven/shared';

import { EmptyTable } from '@/components/haven/empty-table';
import { StaffHeader } from '@/components/haven/staff-header';
import { CaseBadges } from '@/components/operator/case-badges';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getEnumLabels } from '@/i18n/labels';
import { getQueue } from '@/lib/operator';
import { cn } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('queue'))('title') };
}

export default async function QueuePage({ searchParams }: PageProps<'/queue'>) {
  const parsed = caseViewSchema.safeParse((await searchParams).view);
  const view = parsed.success ? parsed.data : 'needs_review';
  const [queue, t, ts, labels, format] = await Promise.all([
    getQueue(view),
    getTranslations('queue'),
    getTranslations('staff'),
    getEnumLabels(),
    getFormatter(),
  ]);
  const columns = [
    ts('reference'),
    ts('category'),
    ts('severity'),
    ts('district'),
    ts('organisation'),
    ts('status'),
    ts('filed'),
  ];

  return (
    <div className="staff-page">
      <StaffHeader title={t('title')} lead={t('lead')} />
      <nav aria-label={t('viewsLabel')}>
        <ul className="inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          {triageStatuses.map((status) => (
            <li key={status}>
              <Link
                href={status === 'needs_review' ? '/queue' : `/queue?view=${status}`}
                aria-current={status === view ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-foreground/70 hover:text-foreground',
                  status === view && 'bg-background text-foreground shadow-sm',
                )}
              >
                {labels.triageStatus[status]}
                <span className="rounded-full bg-secondary px-2 text-xs tabular-nums">
                  {queue.counts[status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {queue.items.length === 0 ? (
        <EmptyTable
          icon={Inbox}
          title={t(`empty.${view}.title`)}
          body={t(`empty.${view}.body`)}
          columns={columns}
        />
      ) : (
        <div className="staff-panel p-0">
          <Table>
            <caption className="sr-only">{labels.triageStatus[view]}</caption>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column} scope="col" className="px-4">
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="px-4">
                    <Link
                      href={`/queue/${item.id}`}
                      className="resident-reference font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {item.reference}
                    </Link>
                  </TableCell>
                  <TableCell>{labels.category[item.category]}</TableCell>
                  <TableCell>{item.severity ? labels.severity[item.severity] : '—'}</TableCell>
                  <TableCell>{item.zoneId ? labels.district[item.zoneId] : '—'}</TableCell>
                  <TableCell className="whitespace-normal">
                    {labels.organization[item.organizationId]}
                  </TableCell>
                  <TableCell>
                    <CaseBadges summary={item} />
                  </TableCell>
                  <TableCell>
                    <time dateTime={item.submittedAt}>
                      {format.relativeTime(new Date(item.submittedAt))}
                    </time>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

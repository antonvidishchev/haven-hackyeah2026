import { ScrollText } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import {
  auditActions,
  auditQuerySchema,
  demoAccounts,
  type AuditEntry,
  type AuditMeta,
} from '@haven/shared';

import { EmptyTable } from '@/components/haven/empty-table';
import { StaffHeader } from '@/components/haven/staff-header';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getEnumLabels } from '@/i18n/labels';
import { getAuditLog } from '@/lib/audit';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('audit'))('title') };
}

const filterSchema = auditQuerySchema.pick({ action: true, actor: true, cursor: true });

const metaText = (meta: AuditMeta) =>
  Object.entries(meta)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(' · ');

function Subject({ subject }: { subject: AuditEntry['subject'] }) {
  if (!subject) return <span className="text-muted-foreground">—</span>;
  const label = `${subject.type}:${subject.id}`;
  return subject.type === 'haven_case' ? (
    <Link
      href={`/queue/${subject.id}`}
      className="font-mono text-xs text-primary underline-offset-4 hover:underline"
    >
      {label}
    </Link>
  ) : (
    <span className="font-mono text-xs">{label}</span>
  );
}

export default async function AuditPage({ searchParams }: PageProps<'/admin/audit'>) {
  const params = await searchParams;
  const parsed = filterSchema.safeParse({
    action: params.action || undefined,
    actor: params.actor || undefined,
    cursor: params.cursor || undefined,
  });
  const filter = parsed.success ? parsed.data : {};
  const [log, t, labels, format] = await Promise.all([
    getAuditLog(filter),
    getTranslations('audit'),
    getEnumLabels(),
    getFormatter(),
  ]);
  const columns = [t('when'), t('actor'), t('role'), t('action'), t('subject'), t('details')];
  const pageHref = (cursor?: string) => {
    const query = new URLSearchParams();
    if (filter.action) query.set('action', filter.action);
    if (filter.actor) query.set('actor', filter.actor);
    if (cursor) query.set('cursor', cursor);
    const text = query.toString();
    return text ? `/admin/audit?${text}` : '/admin/audit';
  };

  return (
    <div className="staff-page">
      <StaffHeader title={t('title')} lead={t('lead')} />

      <form
        method="get"
        action="/admin/audit"
        aria-label={t('filters')}
        className="staff-panel staff-form flex flex-wrap items-end gap-3"
      >
        <div className="flex min-w-48 flex-col gap-1.5">
          <label htmlFor="audit-action" className="text-sm font-medium">
            {t('action')}
          </label>
          <select id="audit-action" name="action" defaultValue={filter.action ?? ''}>
            <option value="">{t('anyAction')}</option>
            {auditActions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-48 flex-col gap-1.5">
          <label htmlFor="audit-actor" className="text-sm font-medium">
            {t('actor')}
          </label>
          <select id="audit-actor" name="actor" defaultValue={filter.actor ?? ''}>
            <option value="">{t('anyActor')}</option>
            {demoAccounts.map((account) => (
              <option key={account.username} value={account.username}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="lg">
          {t('apply')}
        </Button>
        {filter.action || filter.actor ? (
          <Link href="/admin/audit" className={buttonVariants({ variant: 'ghost', size: 'lg' })}>
            {t('clear')}
          </Link>
        ) : null}
      </form>

      {log.items.length === 0 ? (
        <EmptyTable
          icon={ScrollText}
          title={t('emptyTitle')}
          body={filter.action || filter.actor ? t('emptyFiltered') : t('emptyBody')}
          columns={columns}
        />
      ) : (
        <div className="staff-panel p-0">
          <Table className="text-sm">
            <caption className="sr-only">{t('title')}</caption>
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
              {log.items.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="px-4 whitespace-nowrap">
                    <time dateTime={entry.occurredAt}>
                      {format.dateTime(new Date(entry.occurredAt), {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </time>
                  </TableCell>
                  <TableCell>
                    {entry.actorName ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {entry.actorRole === 'anonymous'
                      ? t('anonymous')
                      : labels.role[entry.actorRole]}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{entry.action}</TableCell>
                  <TableCell>
                    <Subject subject={entry.subject} />
                  </TableCell>
                  <TableCell className="max-w-md text-xs whitespace-normal text-muted-foreground">
                    {metaText(entry.meta) || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <nav aria-label={t('pagination')} className="flex gap-2">
        {filter.cursor ? (
          <Link href={pageHref()} className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            {t('newest')}
          </Link>
        ) : null}
        {log.nextCursor ? (
          <Link
            href={pageHref(log.nextCursor)}
            className={buttonVariants({ variant: 'outline', size: 'lg' })}
          >
            {t('older')}
          </Link>
        ) : null}
      </nav>
    </div>
  );
}

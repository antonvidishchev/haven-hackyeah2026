import { Archive, LockKeyhole } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';

import { EmptyTable } from '@/components/haven/empty-table';
import { SimulationNote } from '@/components/haven/simulation-note';
import { StaffHeader } from '@/components/haven/staff-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatBytes } from '@/lib/datetime';
import { getVault } from '@/lib/operator';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('vault'))('title') };
}

export default async function VaultPage() {
  const [vault, t, ts, format, locale] = await Promise.all([
    getVault(),
    getTranslations('vault'),
    getTranslations('staff'),
    getFormatter(),
    getLocale(),
  ]);
  const columns = [ts('reference'), t('file'), t('type'), t('size'), t('sha256'), t('added'), ''];

  return (
    <div className="staff-page">
      <StaffHeader title={t('title')} lead={t('lead')} />
      <aside aria-labelledby="custody-title" className="staff-panel flex flex-col gap-2">
        <h2 id="custody-title" className="flex items-center gap-2 font-semibold">
          <LockKeyhole aria-hidden className="size-4 text-primary" />
          {t('custodyTitle')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('custodyBody')}</p>
        <SimulationNote />
      </aside>

      {vault.items.length === 0 ? (
        <EmptyTable
          icon={Archive}
          title={t('emptyTitle')}
          body={t('emptyBody')}
          columns={columns.filter(Boolean)}
        />
      ) : (
        <div className="staff-panel p-0">
          <Table>
            <caption className="sr-only">{t('title')}</caption>
            <TableHeader>
              <TableRow>
                {columns.map((column, index) => (
                  <TableHead key={index} scope="col" className="px-4">
                    {column || <span className="sr-only">{t('view')}</span>}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {vault.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="px-4">
                    {item.caseId ? (
                      <Link
                        href={`/queue/${item.caseId}`}
                        className="resident-reference text-primary hover:underline"
                      >
                        {item.reference}
                      </Link>
                    ) : (
                      <span className="resident-reference">{item.reference ?? '—'}</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-56 truncate">{item.fileName}</TableCell>
                  <TableCell>{item.mediaType}</TableCell>
                  <TableCell>{formatBytes(item.byteSize, locale)}</TableCell>
                  <TableCell>
                    <code title={item.sha256}>{item.sha256.slice(0, 12)}…</code>
                  </TableCell>
                  <TableCell>
                    <time dateTime={item.createdAt}>
                      {format.dateTime(new Date(item.createdAt), {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </time>
                  </TableCell>
                  <TableCell>
                    <a
                      href={`/media/${encodeURIComponent(item.id)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {t('view')}
                      <span className="sr-only"> {item.fileName}</span>
                    </a>
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

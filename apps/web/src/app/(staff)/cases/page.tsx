import { Briefcase } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';

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
import { getOfficialCases } from '@/lib/official';
import { getPrincipal } from '@/lib/session';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('cases'))('title') };
}

export default async function CasesPage() {
  const [cases, principal, t, ts, labels, format] = await Promise.all([
    getOfficialCases(),
    getPrincipal(),
    getTranslations('cases'),
    getTranslations('staff'),
    getEnumLabels(),
    getFormatter(),
  ]);
  const organization = principal?.organizationId;
  const columns = [
    ts('reference'),
    ts('category'),
    ts('severity'),
    ts('district'),
    ts('status'),
    t('assignedTo'),
    ts('filed'),
  ];

  return (
    <div className="staff-page">
      <StaffHeader title={t('title')} lead={t('lead')} />
      {organization ? (
        <p className="text-sm">
          {t('organization', { name: labels.organization[organization] })}
        </p>
      ) : null}

      {cases.items.length === 0 ? (
        <EmptyTable
          icon={Briefcase}
          title={t('emptyTitle')}
          body={t('emptyBody')}
          columns={columns}
        />
      ) : (
        <div className="staff-panel p-0">
          <Table>
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
              {cases.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="px-4">
                    <Link
                      href={`/cases/${item.id}`}
                      className="resident-reference font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {item.reference}
                    </Link>
                  </TableCell>
                  <TableCell>{labels.category[item.category]}</TableCell>
                  <TableCell>{item.severity ? labels.severity[item.severity] : '—'}</TableCell>
                  <TableCell>{item.zoneId ? labels.district[item.zoneId] : '—'}</TableCell>
                  <TableCell>
                    <CaseBadges summary={item} />
                  </TableCell>
                  <TableCell>
                    {item.assignedOfficial?.name ?? (
                      <span className="text-muted-foreground">{t('unassigned')}</span>
                    )}
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

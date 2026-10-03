import { ScrollText } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { EmptyTable } from '@/components/haven/empty-table';
import { StaffHeader } from '@/components/haven/staff-header';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('audit'))('title') };
}

export default async function AuditPage() {
  const t = await getTranslations('audit');
  return (
    <div className="staff-page">
      <StaffHeader title={t('title')} lead={t('lead')} />
      <EmptyTable
        icon={ScrollText}
        title={t('emptyTitle')}
        body={t('emptyBody')}
        columns={[t('when'), t('actor'), t('action'), t('subject')]}
      />
    </div>
  );
}

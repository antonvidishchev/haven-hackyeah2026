import { Inbox } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { EmptyTable } from '@/components/haven/empty-table';
import { StaffHeader } from '@/components/haven/staff-header';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('queue'))('title') };
}

export default async function QueuePage() {
  const [t, ts] = await Promise.all([getTranslations('queue'), getTranslations('staff')]);
  return (
    <div className="staff-page">
      <StaffHeader title={t('title')} lead={t('lead')} />
      <EmptyTable
        icon={Inbox}
        title={t('emptyTitle')}
        body={t('emptyBody')}
        columns={[ts('priority'), ts('reference'), ts('category'), ts('district'), ts('filed')]}
      />
    </div>
  );
}

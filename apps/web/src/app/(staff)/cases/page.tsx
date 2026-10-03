import { Briefcase } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { EmptyTable } from '@/components/haven/empty-table';
import { StaffHeader } from '@/components/haven/staff-header';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('cases'))('title') };
}

export default async function CasesPage() {
  const [t, ts] = await Promise.all([getTranslations('cases'), getTranslations('staff')]);
  return (
    <div className="staff-page">
      <StaffHeader title={t('title')} lead={t('lead')} />
      <EmptyTable
        icon={Briefcase}
        title={t('emptyTitle')}
        body={t('emptyBody')}
        columns={[ts('reference'), ts('category'), ts('district'), ts('state'), ts('triage')]}
      />
    </div>
  );
}

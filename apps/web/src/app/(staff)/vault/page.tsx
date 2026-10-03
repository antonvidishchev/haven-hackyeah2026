import { Archive } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { EmptyState } from '@/components/haven/empty-state';
import { StaffHeader } from '@/components/haven/staff-header';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('vault'))('title') };
}

export default async function VaultPage() {
  const t = await getTranslations('vault');
  return (
    <div className="staff-page">
      <StaffHeader title={t('title')} lead={t('lead')} />
      <EmptyState icon={Archive} title={t('emptyTitle')} className="rounded-lg">
        {t('emptyBody')}
      </EmptyState>
    </div>
  );
}

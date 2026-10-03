import { FileText, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { EmptyState } from '@/components/haven/empty-state';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('myReports'))('title') };
}

export default async function MyReportsPage() {
  const t = await getTranslations('myReports');
  return (
    <div className="resident-page">
      <div className="flex flex-col gap-2">
        <h1>{t('title')}</h1>
        <p className="text-muted-foreground">{t('lead')}</p>
      </div>
      <EmptyState
        icon={FileText}
        title={t('emptyTitle')}
        action={
          <Link href="/report/new" className="resident-button">
            <Plus aria-hidden className="size-5" />
            {t('start')}
          </Link>
        }
      >
        {t('emptyBody')}
      </EmptyState>
    </div>
  );
}

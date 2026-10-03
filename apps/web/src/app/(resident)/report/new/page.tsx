import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { DisclaimerCard } from '@/components/haven/disclaimer-card';
import { StartReport } from '@/components/report/start-report';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('reportNew'))('title') };
}

export default async function NewReportPage() {
  const t = await getTranslations('reportNew');
  return (
    <div className="resident-page">
      <div className="flex flex-col gap-2">
        <h1>{t('title')}</h1>
        <p className="text-muted-foreground">{t('lead')}</p>
      </div>
      <StartReport auto />
      <DisclaimerCard />
    </div>
  );
}

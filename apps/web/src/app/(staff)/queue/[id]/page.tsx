import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { CaseFixture } from '@/components/haven/case-fixture';
import { StaffHeader } from '@/components/haven/staff-header';
import { Button } from '@/components/ui/button';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('queue'))('caseTitle') };
}

export default async function QueueCasePage() {
  const t = await getTranslations('queue');
  return (
    <div className="staff-page">
      <StaffHeader title={t('caseTitle')} />
      <CaseFixture
        actions={
          <>
            <Button disabled>{t('promote')}</Button>
            <Button variant="outline" disabled>
              {t('cancelCase')}
            </Button>
          </>
        }
      />
    </div>
  );
}

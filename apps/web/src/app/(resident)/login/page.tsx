import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SimulationNote } from '@/components/haven/simulation-note';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('login'))('title') };
}

export default async function LoginPage() {
  const t = await getTranslations('login');
  return (
    <div className="resident-page">
      <h1>{t('title')}</h1>
      <p className="text-muted-foreground">{t('lead')}</p>
      <section className="resident-card">
        <p>{t('placeholder')}</p>
        <p>{t('guest')}</p>
      </section>
      <SimulationNote />
    </div>
  );
}

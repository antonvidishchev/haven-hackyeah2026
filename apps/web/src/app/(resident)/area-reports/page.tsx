import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { districtIds } from '@haven/shared';

import { SimulationNote } from '@/components/haven/simulation-note';
import { getEnumLabels } from '@/i18n/labels';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('area'))('title') };
}

export default async function AreaReportsPage() {
  const [t, labels] = await Promise.all([getTranslations('area'), getEnumLabels()]);
  return (
    <div className="resident-page">
      <div className="flex flex-col gap-2">
        <h1>{t('title')}</h1>
        <p className="text-muted-foreground">{t('lead')}</p>
      </div>
      <p className="resident-card font-medium">{t('notScore')}</p>
      <SimulationNote>{t('mapSoon')}</SimulationNote>
      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                {t('district')}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {t('count')}
              </th>
            </tr>
          </thead>
          <tbody>
            {districtIds.map((id) => (
              <tr key={id} className="border-t">
                <th scope="row" className="px-4 py-3 font-medium">
                  {labels.district[id]}
                </th>
                <td className="px-4 py-3 text-muted-foreground">{t('belowThreshold')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

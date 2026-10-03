import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { DistrictId, HotspotsResponse } from '@haven/shared';

import { AreaMap } from '@/components/area/area-map';
import { getEnumLabels } from '@/i18n/labels';
import { publicApi } from '@/lib/api';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('area'))('title') };
}

async function loadHotspots(): Promise<HotspotsResponse | null> {
  try {
    return await publicApi.hotspots.list();
  } catch {
    return null;
  }
}

export default async function AreaReportsPage() {
  const [t, labels, hotspots] = await Promise.all([
    getTranslations('area'),
    getEnumLabels(),
    loadHotspots(),
  ]);

  const describe = (count: number | null) =>
    count === null ? t('belowThreshold') : t('reports', { count });
  const tooltips = Object.fromEntries(
    (hotspots?.zones ?? []).map(({ zoneId, count }) => [
      zoneId,
      `${labels.district[zoneId]} — ${describe(count)}`,
    ]),
  ) as Record<DistrictId, string>;

  return (
    <div className="resident-page">
      <div className="flex flex-col gap-2">
        <h1>{t('title')}</h1>
        <p className="text-muted-foreground">{t('lead')}</p>
        <p className="text-muted-foreground">
          {t('privacy', { threshold: hotspots?.threshold ?? 3 })}
        </p>
      </div>
      <p className="resident-card font-medium">{t('notScore')}</p>

      {hotspots ? (
        <>
          <AreaMap zones={hotspots.zones} tooltips={tooltips} label={t('mapLabel')} />
          <section aria-labelledby="area-list" className="flex flex-col gap-3">
            <h2 id="area-list">{t('listTitle')}</h2>
            <ul className="overflow-hidden rounded-2xl border bg-card">
              {hotspots.zones.map(({ zoneId, count }) => (
                <li
                  key={zoneId}
                  className="flex justify-between gap-4 border-t px-4 py-3 text-sm first:border-t-0"
                >
                  <span className="font-medium">
                    {labels.district[zoneId]} — {describe(count)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <p role="alert" className="resident-card">
          {t('unavailable')}
        </p>
      )}
    </div>
  );
}

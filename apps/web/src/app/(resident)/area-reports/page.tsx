import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  reportCategories,
  reportCategorySchema,
  type DistrictId,
  type HotspotsResponse,
  type ReportCategory,
} from '@haven/shared';

import { AreaMap } from '@/components/area/area-map';
import { getEnumLabels } from '@/i18n/labels';
import { publicApi } from '@/lib/api';
import { cn } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('area'))('title') };
}

async function loadHotspots(category?: ReportCategory): Promise<HotspotsResponse | null> {
  try {
    return await publicApi.hotspots.list({ category });
  } catch {
    return null;
  }
}

export default async function AreaReportsPage({ searchParams }: PageProps<'/area-reports'>) {
  const parsed = reportCategorySchema.safeParse((await searchParams).category);
  const category = parsed.success ? parsed.data : undefined;
  const [t, labels, hotspots] = await Promise.all([
    getTranslations('area'),
    getEnumLabels(),
    loadHotspots(category),
  ]);
  const filters: { href: string; label: string; active: boolean }[] = [
    { href: '/area-reports', label: t('allTypes'), active: !category },
    ...reportCategories.map((value) => ({
      href: `/area-reports?category=${value}`,
      label: labels.category[value],
      active: value === category,
    })),
  ];

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

      <nav aria-label={t('filterLabel')}>
        <ul className="flex flex-wrap gap-2">
          {filters.map(({ href, label, active }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center rounded-full border bg-card px-4 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground',
                  active && 'border-transparent bg-secondary text-secondary-foreground',
                )}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {hotspots ? (
        <>
          <AreaMap zones={hotspots.zones} tooltips={tooltips} label={t('mapLabel')} />
          <section aria-labelledby="area-list" className="flex flex-col gap-3">
            <h2 id="area-list">
              {category
                ? t('listTitleFiltered', { category: labels.category[category] })
                : t('listTitle')}
            </h2>
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

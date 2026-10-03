'use client';

import dynamic from 'next/dynamic';
import type { DistrictId, ZoneCount } from '@haven/shared';

const DistrictMap = dynamic(() => import('./district-map'), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-muted" />,
});

export function AreaMap(props: {
  zones: ZoneCount[];
  tooltips: Record<DistrictId, string>;
  label: string;
}) {
  return (
    <div className="isolate h-[480px] overflow-hidden rounded-2xl border bg-card">
      <DistrictMap {...props} />
    </div>
  );
}

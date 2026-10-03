'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { enumLabels, findDistrict, KRAKOW_CENTER, type LatLng } from '@haven/shared';

const LocationMap = dynamic(() => import('./location-map'), { ssr: false });

const round = (value: number) => Math.round(value * 1e5) / 1e5;

/**
 * Full-screen map picker, mounted while open. Escape or Cancel closes it without changes;
 * the parent returns focus to the button that opened it.
 */
export function MapDialog({
  initial,
  onPick,
  onClose,
}: {
  initial: LatLng | null;
  onPick: (point: LatLng) => void;
  onClose: () => void;
}) {
  const t = useTranslations('editor');
  const labels = enumLabels[useLocale() as keyof typeof enumLabels];
  const ref = useRef<HTMLDialogElement>(null);
  const [center, setCenter] = useState<LatLng>(initial ?? KRAKOW_CENTER);
  const district = findDistrict(center);

  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="map-dialog-title"
      aria-describedby="map-dialog-hint"
      onClose={onClose}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-background p-0 text-foreground backdrop:bg-black/50"
    >
      <div className="flex h-full flex-col">
        <header className="flex flex-col gap-1 border-b bg-card px-5 py-3">
          <h2 id="map-dialog-title" className="text-lg font-semibold">
            {t('mapTitle')}
          </h2>
          <p id="map-dialog-hint" className="text-sm text-muted-foreground">
            {t('mapHint')}
          </p>
        </header>
        <div className="min-h-0 flex-1">
          <LocationMap
            initial={initial ?? KRAKOW_CENTER}
            zoom={initial ? 16 : 12}
            label={t('mapLabel')}
            onMove={setCenter}
          />
        </div>
        <footer className="flex flex-col gap-3 border-t bg-card px-5 py-3 sm:flex-row sm:items-center">
          <p aria-live="polite" className="font-medium sm:flex-1">
            {district ? t('pinIn', { district: labels.district[district] }) : t('pinOutside')}
          </p>
          <div className="flex gap-3">
            <button type="button" className="resident-button secondary" onClick={onClose}>
              {t('cancel')}
            </button>
            <button
              type="button"
              className="resident-button"
              disabled={!district}
              onClick={() => onPick({ lat: round(center.lat), lng: round(center.lng) })}
            >
              {t('useSpot')}
            </button>
          </div>
        </footer>
      </div>
    </dialog>
  );
}

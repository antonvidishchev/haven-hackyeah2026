'use client';

import 'leaflet/dist/leaflet.css';

import { GeoJSON, MapContainer, TileLayer } from 'react-leaflet';
import { KRAKOW_CENTER, krakowDistricts, type DistrictId, type ZoneCount } from '@haven/shared';

type GeoJsonData = React.ComponentProps<typeof GeoJSON>['data'];

/** 1–5 for the chart tokens, scaled by count / max; 0 when suppressed. */
export function shadeLevel(count: number | null, max: number): number {
  if (count === null || max <= 0) return 0;
  return Math.max(1, Math.ceil((count / max) * 5));
}

/**
 * The Area reports choropleth. Leaflet needs `window`, so this module is only ever loaded on the
 * client. Colour is never the only carrier: the page lists the same numbers below the map.
 */
export default function DistrictMap({
  zones,
  tooltips,
  label,
}: {
  zones: ZoneCount[];
  /** Tooltip text per district, already localised. */
  tooltips: Record<DistrictId, string>;
  label: string;
}) {
  const counts = new Map(zones.map((zone) => [zone.zoneId, zone.count]));
  const max = Math.max(0, ...zones.map((zone) => zone.count ?? 0));
  return (
    <MapContainer
      center={[KRAKOW_CENTER.lat, KRAKOW_CENTER.lng]}
      zoom={11}
      minZoom={10}
      scrollWheelZoom={false}
      className="size-full"
      ref={(map) => map?.getContainer().setAttribute('aria-label', label)}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <GeoJSON
        data={krakowDistricts as unknown as GeoJsonData}
        style={(feature) => {
          const id = feature?.properties?.id as DistrictId;
          const level = shadeLevel(counts.get(id) ?? null, max);
          return {
            className: level ? `district-shade district-level-${level}` : 'district-suppressed',
            weight: 1.5,
          };
        }}
        onEachFeature={(feature, layer) => {
          const id = feature.properties?.id as DistrictId;
          layer.bindTooltip(tooltips[id], { sticky: true });
        }}
      />
    </MapContainer>
  );
}

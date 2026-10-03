'use client';

import 'leaflet/dist/leaflet.css';

import { MapPin } from 'lucide-react';
import { GeoJSON, MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { krakowDistricts, type LatLng } from '@haven/shared';

type GeoJsonData = React.ComponentProps<typeof GeoJSON>['data'];

function CenterTracker({ onMove }: { onMove: (center: LatLng) => void }) {
  const map = useMapEvents({
    move() {
      const { lat, lng } = map.getCenter();
      onMove({ lat, lng });
    },
  });
  return null;
}

/**
 * Kraków with its district outlines and a pin fixed at the centre: people move the map, not the
 * pin, which works the same with touch, mouse and arrow keys. Leaflet needs `window`, so this
 * module is only ever loaded on the client.
 */
export default function LocationMap({
  initial,
  zoom,
  label,
  onMove,
}: {
  initial: LatLng;
  zoom: number;
  label: string;
  onMove: (center: LatLng) => void;
}) {
  return (
    <div className="relative size-full">
      <MapContainer
        center={[initial.lat, initial.lng]}
        zoom={zoom}
        minZoom={10}
        className="size-full"
        // Leaflet makes the map container focusable; give it a name for screen readers.
        ref={(map) => map?.getContainer().setAttribute('aria-label', label)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJSON
          data={krakowDistricts as unknown as GeoJsonData}
          style={{ className: 'district-outline', weight: 1.5 }}
          interactive={false}
        />
        <CenterTracker onMove={onMove} />
      </MapContainer>
      <MapPin
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 z-[500] size-10 -translate-x-1/2 -translate-y-full fill-primary text-primary-foreground drop-shadow"
      />
    </div>
  );
}

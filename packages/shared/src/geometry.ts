import { krakowDistricts } from './data/krakow-districts.js';
import type { DistrictId } from './enums.js';

/** A GeoJSON position: [longitude, latitude]. */
export type Position = [number, number];
export type DistrictFeature = {
  type: 'Feature';
  properties: { id: DistrictId };
  geometry: { type: 'MultiPolygon'; coordinates: Position[][][] };
};
export type DistrictCollection = { type: 'FeatureCollection'; features: DistrictFeature[] };

export type LatLng = { lat: number; lng: number };

export { krakowDistricts };

/** Map centre: the Main Market Square. */
export const KRAKOW_CENTER: LatLng = { lat: 50.0617, lng: 19.9373 };

/** Ray casting: is the point inside this ring? Edges count as outside; that's fine at 1 m. */
function inRing({ lat, lng }: LatLng, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Inside the outer ring and outside every hole. */
export function inPolygon(point: LatLng, polygon: Position[][]): boolean {
  const [outer, ...holes] = polygon;
  return !!outer && inRing(point, outer) && !holes.some((hole) => inRing(point, hole));
}

/** The district containing the point, or null outside Kraków. */
export function findDistrict(
  point: LatLng,
  collection: DistrictCollection = krakowDistricts,
): DistrictId | null {
  const feature = collection.features.find((f) =>
    f.geometry.coordinates.some((polygon) => inPolygon(point, polygon)),
  );
  return feature?.properties.id ?? null;
}

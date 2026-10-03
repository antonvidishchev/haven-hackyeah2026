import { districtIds, type DistrictId } from './enums.js';

/** Districts with fewer filed reports than this show no number (k-anonymity style). */
export const HOTSPOT_PRIVACY_THRESHOLD = 3;

export type ZoneCount = {
  zoneId: DistrictId;
  /** Null when below the privacy threshold (including zero). */
  count: number | null;
};

export type HotspotsResponse = {
  threshold: number;
  zones: ZoneCount[];
};

/**
 * Public Area reports counts: every district, always in order, with counts below the threshold
 * suppressed. Callers pass only filed, non-cancelled reports' zones.
 */
export function aggregateReportsByZone(
  zones: Iterable<DistrictId | null | undefined>,
  threshold = HOTSPOT_PRIVACY_THRESHOLD,
): ZoneCount[] {
  const counts = new Map<DistrictId, number>();
  for (const zone of zones) {
    if (zone && (districtIds as readonly string[]).includes(zone)) {
      counts.set(zone, (counts.get(zone) ?? 0) + 1);
    }
  }
  return districtIds.map((zoneId) => {
    const count = counts.get(zoneId) ?? 0;
    return { zoneId, count: count >= threshold ? count : null };
  });
}

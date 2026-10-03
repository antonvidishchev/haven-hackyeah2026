import { describe, expect, it } from 'vitest';

import { districtIds } from './enums.js';
import { aggregateReportsByZone } from './hotspots.js';

describe('aggregateReportsByZone', () => {
  it('always returns all 18 districts in order', () => {
    const zones = aggregateReportsByZone([]);
    expect(zones.map((zone) => zone.zoneId)).toEqual([...districtIds]);
    expect(zones.every((zone) => zone.count === null)).toBe(true);
  });

  it('suppresses counts below the threshold', () => {
    const zones = aggregateReportsByZone(['III', 'III', 'III', 'I', 'I', 'XVIII']);
    const byZone = Object.fromEntries(zones.map((zone) => [zone.zoneId, zone.count]));
    expect(byZone.III).toBe(3);
    expect(byZone.I).toBeNull();
    expect(byZone.XVIII).toBeNull();
  });

  it('ignores reports without a zone', () => {
    const zones = aggregateReportsByZone(['IV', null, undefined, 'IV', 'IV', 'IV']);
    expect(zones.find((zone) => zone.zoneId === 'IV')?.count).toBe(4);
  });

  it('honours a custom threshold', () => {
    expect(aggregateReportsByZone(['II'], 1)[1]).toEqual({ zoneId: 'II', count: 1 });
  });
});

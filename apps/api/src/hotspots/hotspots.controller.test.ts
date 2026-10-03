import { describe, expect, it, vi } from 'vitest';
import { HotspotsController } from './hotspots.controller.js';
import type { HotspotsRepository } from './hotspots.repository.js';

describe('HotspotsController', () => {
  it('returns every district with suppression applied', async () => {
    const repository = {
      countedZones: vi.fn().mockResolvedValue(['III', 'III', 'III', 'I']),
    } as unknown as HotspotsRepository;
    const response = await new HotspotsController(repository).list();
    expect(response.threshold).toBe(3);
    expect(response.zones).toHaveLength(18);
    expect(response.zones.find((zone) => zone.zoneId === 'III')?.count).toBe(3);
    expect(response.zones.find((zone) => zone.zoneId === 'I')?.count).toBeNull();
  });
});

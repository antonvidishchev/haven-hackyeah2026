import { hotspotsQuerySchema } from '@haven/shared';
import { describe, expect, it, vi } from 'vitest';
import { ZodPipe } from '../common/zod.pipe.js';
import { HotspotsController } from './hotspots.controller.js';
import type { HotspotsRepository } from './hotspots.repository.js';

function controllerWith(zones: string[]) {
  const countedZones = vi.fn().mockResolvedValue(zones);
  const repository = { countedZones } as unknown as HotspotsRepository;
  return { controller: new HotspotsController(repository), countedZones };
}

describe('HotspotsController', () => {
  it('returns every district with suppression applied', async () => {
    const { controller, countedZones } = controllerWith(['III', 'III', 'III', 'I']);
    const response = await controller.list({});
    expect(countedZones).toHaveBeenCalledWith(undefined);
    expect(response.threshold).toBe(3);
    expect(response.category).toBeNull();
    expect(response.zones).toHaveLength(18);
    expect(response.zones.find((zone) => zone.zoneId === 'III')?.count).toBe(3);
    expect(response.zones.find((zone) => zone.zoneId === 'I')?.count).toBeNull();
  });

  it('counts one incident type and still suppresses below the threshold', async () => {
    const { controller, countedZones } = controllerWith(['III']);
    const response = await controller.list({ category: 'threat' });
    expect(countedZones).toHaveBeenCalledWith('threat');
    expect(response.category).toBe('threat');
    expect(response.zones.find((zone) => zone.zoneId === 'III')?.count).toBeNull();
  });

  it('rejects an unknown incident type', () => {
    const pipe = new ZodPipe(hotspotsQuerySchema);
    expect(pipe.transform({ category: 'threat' })).toEqual({ category: 'threat' });
    expect(() => pipe.transform({ category: 'bogus' })).toThrow();
  });
});

import { describe, expect, it } from 'vitest';
import type { SurrealService } from '../db/surreal.service.js';
import { HealthController } from './health.controller.js';

const controller = (healthy: boolean) =>
  new HealthController({ isHealthy: async () => healthy } as SurrealService);

describe('HealthController', () => {
  it('is live without the database', () => {
    expect(controller(false).live()).toEqual({ status: 'ok' });
  });

  it('reports ready only when SurrealDB answers', async () => {
    await expect(controller(true).ready()).resolves.toEqual({ status: 'ok', database: 'ok' });
    await expect(controller(false).ready()).rejects.toMatchObject({ status: 503 });
  });
});

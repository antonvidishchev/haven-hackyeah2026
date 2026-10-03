import { Controller, Get, Query } from '@nestjs/common';
import {
  aggregateReportsByZone,
  HOTSPOT_PRIVACY_THRESHOLD,
  hotspotsQuerySchema,
  type HotspotsQuery,
  type HotspotsResponse,
} from '@haven/shared';
import { Public } from '../auth/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { HotspotsRepository } from './hotspots.repository.js';

/**
 * Public Area reports: counts per district, optionally for one incident type, suppressed below
 * the privacy threshold. Suppression applies after filtering, so a narrow filter reveals nothing.
 */
@Public()
@Controller('hotspots')
export class HotspotsController {
  constructor(private readonly hotspots: HotspotsRepository) {}

  @Get()
  async list(
    @Query(new ZodPipe(hotspotsQuerySchema)) query: HotspotsQuery = {},
  ): Promise<HotspotsResponse> {
    return {
      threshold: HOTSPOT_PRIVACY_THRESHOLD,
      category: query.category ?? null,
      zones: aggregateReportsByZone(await this.hotspots.countedZones(query.category)),
    };
  }
}

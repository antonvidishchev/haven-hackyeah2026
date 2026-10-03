import { Controller, Get } from '@nestjs/common';
import {
  aggregateReportsByZone,
  HOTSPOT_PRIVACY_THRESHOLD,
  type HotspotsResponse,
} from '@haven/shared';
import { Public } from '../auth/decorators.js';
import { HotspotsRepository } from './hotspots.repository.js';

/** Public Area reports: counts per district, suppressed below the privacy threshold. */
@Public()
@Controller('hotspots')
export class HotspotsController {
  constructor(private readonly hotspots: HotspotsRepository) {}

  @Get()
  async list(): Promise<HotspotsResponse> {
    return {
      threshold: HOTSPOT_PRIVACY_THRESHOLD,
      zones: aggregateReportsByZone(await this.hotspots.countedZones()),
    };
  }
}

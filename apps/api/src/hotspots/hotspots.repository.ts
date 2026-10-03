import { Injectable } from '@nestjs/common';
import type { DistrictId } from '@haven/shared';
import { SurrealService } from '../db/surreal.service.js';

@Injectable()
export class HotspotsRepository {
  constructor(private readonly surreal: SurrealService) {}

  /** One zone per filed, non-cancelled report that has one. Drafts and coordinates never leave. */
  async countedZones(): Promise<DistrictId[]> {
    const [zones] = await this.surreal.query<[DistrictId[]]>(
      `SELECT VALUE zone_id FROM report
       WHERE state = 'submitted' AND zone_id IS NOT NONE
         AND count((SELECT VALUE id FROM haven_case
                    WHERE report = $parent.id AND state = 'cancelled')) = 0`,
    );
    return zones;
  }
}

import { Injectable } from '@nestjs/common';
import type { DistrictId, ReportCategory } from '@haven/shared';
import { SurrealService } from '../db/surreal.service.js';

@Injectable()
export class HotspotsRepository {
  constructor(private readonly surreal: SurrealService) {}

  /**
   * One zone per filed, non-cancelled report that has one, optionally of a single category.
   * Drafts and coordinates never leave.
   */
  async countedZones(category?: ReportCategory): Promise<DistrictId[]> {
    const [zones] = await this.surreal.query<[DistrictId[]]>(
      `SELECT VALUE zone_id FROM report
       WHERE state = 'submitted' AND zone_id IS NOT NONE
         ${category ? 'AND fields.category = $category' : ''}
         AND count((SELECT VALUE id FROM haven_case
                    WHERE report = $parent.id AND state = 'cancelled')) = 0`,
      category ? { category } : undefined,
    );
    return zones;
  }
}

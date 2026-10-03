import { Injectable } from '@nestjs/common';
import type { OrganizationId } from '@haven/shared';
import { SurrealService } from '../db/surreal.service.js';
import { CASE_FIELDS, type CaseRow } from '../operator/operator.repository.js';

@Injectable()
export class OfficialRepository {
  constructor(private readonly surreal: SurrealService) {}

  /** Every case currently routed to the organisation (unsorted; the service orders it). */
  async listForOrganization(organizationId: OrganizationId): Promise<CaseRow[]> {
    const [rows] = await this.surreal.query<[CaseRow[]]>(
      `SELECT ${CASE_FIELDS} FROM haven_case WHERE organization_id = $org`,
      { org: organizationId },
    );
    return rows;
  }
}

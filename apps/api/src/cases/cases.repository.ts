import { Injectable } from '@nestjs/common';
import type { OrganizationId, RoutingResult } from '@haven/shared';
import { RecordId } from 'surrealdb';
import { SurrealService } from '../db/surreal.service.js';

const reportRecord = (id: string) => new RecordId('report', id);

/** Reads the routing decision and case created at filing. */
@Injectable()
export class CasesRepository {
  constructor(private readonly surreal: SurrealService) {}

  /** The router's stored result for a filed report; null for drafts. */
  async routingFor(reportId: string): Promise<RoutingResult | null> {
    const [rows] = await this.surreal.query<[RoutingResult[]]>(
      'SELECT VALUE result FROM routing_decision WHERE report = $report LIMIT 1',
      { report: reportRecord(reportId) },
    );
    const result = rows[0];
    if (!result) return null;
    // Stored objects come back with sorted keys; answer in the shared shape's order.
    return {
      ruleId: result.ruleId,
      rulesetVersion: result.rulesetVersion,
      responder: result.responder,
      confirmationRequired: result.confirmationRequired,
      autoDispatch: result.autoDispatch,
      queue: result.queue,
      emergency: result.emergency,
    };
  }

  /** Whether the report has a case routed to the organisation. */
  async organizationHasReport(reportId: string, organizationId: OrganizationId): Promise<boolean> {
    const [rows] = await this.surreal.query<[RecordId[]]>(
      'SELECT VALUE id FROM haven_case WHERE report = $report AND organization_id = $org LIMIT 1',
      { report: reportRecord(reportId), org: organizationId },
    );
    return rows.length > 0;
  }
}

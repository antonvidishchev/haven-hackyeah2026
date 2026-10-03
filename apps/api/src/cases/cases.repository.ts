import { Injectable } from '@nestjs/common';
import type { OrganizationId, ResidentMessage, RoutingResult } from '@haven/shared';
import { type DateTime, RecordId } from 'surrealdb';
import { SurrealService } from '../db/surreal.service.js';
import { toIso } from '../db/values.js';

export type CaseMessageRow = {
  id: RecordId<'case_message'>;
  kind: ResidentMessage['kind'];
  body: string;
  created_at: DateTime;
};

/** A case message as residents see it: never the author. */
export const toResidentMessage = (row: CaseMessageRow): ResidentMessage => ({
  id: String(row.id.id),
  kind: row.kind,
  body: row.body,
  createdAt: toIso(row.created_at),
});

const reportRecord = (id: string) => new RecordId('report', id);

/** Reads the routing decision, case and case messages created for a filed report. */
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

  /** The messages on the report's case, oldest first; none for drafts. */
  async messagesForReport(reportId: string): Promise<ResidentMessage[]> {
    const [rows] = await this.surreal.query<[CaseMessageRow[]]>(
      `SELECT id, kind, body, created_at FROM case_message
       WHERE case IN (SELECT VALUE id FROM haven_case WHERE report = $report)
       ORDER BY created_at ASC, id ASC`,
      { report: reportRecord(reportId) },
    );
    return rows.map(toResidentMessage);
  }
}

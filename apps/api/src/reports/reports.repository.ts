import { Injectable } from '@nestjs/common';
import type { ReportFields, ReportRevision, ReportState, RevisionNote } from '@haven/shared';
import { DateTime, RecordId } from 'surrealdb';
import { principalRecord } from '../auth/principal.repository.js';
import { SurrealService } from '../db/surreal.service.js';
import { toIso } from '../db/values.js';
import type { FilingPlan } from '../cases/routing.js';
import { residentUpdateSurql } from '../cases/triage.js';
import type { ReportCursor } from './cursor.js';

export type ReportRow = {
  id: RecordId<'report'>;
  owner: RecordId<'principal'>;
  reference?: string;
  state: ReportState;
  current_revision: number;
  fields: ReportFields;
  zone_id?: string;
  escalated: boolean;
  escalated_at?: DateTime;
  submitted_at?: DateTime;
  created_at: DateTime;
  updated_at: DateTime;
};

export type ReportListRow = ReportRow & { evidence_count: number };

type RevisionRow = { revision: number; note: RevisionNote; created_at: DateTime };

export const reportRecord = (id: string) => new RecordId('report', id);

/** `zone_id` mirrors `fields.zoneId`; NONE rather than NULL so the field stays optional. */
const zoneIdOf = (fields: ReportFields) => fields.zoneId ?? undefined;

@Injectable()
export class ReportsRepository {
  constructor(private readonly surreal: SurrealService) {}

  /** A new draft with its first revision, `created`. */
  async createDraft(ownerId: string, fields: ReportFields): Promise<ReportRow> {
    const results = await this.surreal.query<unknown[]>(
      `BEGIN TRANSACTION;
       LET $created = CREATE report CONTENT {
         owner: $owner, state: 'draft', current_revision: 1, fields: $fields, zone_id: $zone_id
       };
       CREATE report_revision CONTENT {
         report: $created[0].id, revision: 1, fields: $fields, note: 'created', author: $owner
       };
       RETURN $created[0];
       COMMIT TRANSACTION;`,
      { owner: principalRecord(ownerId), fields, zone_id: zoneIdOf(fields) },
    );
    const row = results.at(-2) as ReportRow | undefined;
    if (!row) throw new Error('Report was not created');
    return row;
  }

  /** The report when `ownerId` owns it; null when it doesn't exist or belongs to someone else. */
  async findOwned(id: string, ownerId: string): Promise<ReportRow | null> {
    const [rows] = await this.surreal.query<[ReportRow[]]>(
      'SELECT * FROM $id WHERE owner = $owner',
      { id: reportRecord(id), owner: principalRecord(ownerId) },
    );
    return rows[0] ?? null;
  }

  /** The owner's reports, newest first, starting after `cursor`. */
  async listOwned(
    ownerId: string,
    cursor: ReportCursor | null,
    limit: number,
  ): Promise<ReportListRow[]> {
    const after = cursor ? 'AND (created_at < $at OR (created_at = $at AND id < $after))' : '';
    const [rows] = await this.surreal.query<[ReportListRow[]]>(
      `SELECT *, count((SELECT VALUE id FROM evidence WHERE report = $parent.id)) AS evidence_count
       FROM report WHERE owner = $owner ${after}
       ORDER BY created_at DESC, id DESC LIMIT $limit`,
      {
        owner: principalRecord(ownerId),
        limit,
        ...(cursor ? { at: new DateTime(cursor.createdAt), after: reportRecord(cursor.id) } : {}),
      },
    );
    return rows;
  }

  async revisions(reportId: string): Promise<ReportRevision[]> {
    const [rows] = await this.surreal.query<[RevisionRow[]]>(
      `SELECT revision, note, created_at FROM report_revision
       WHERE report = $report ORDER BY revision ASC`,
      { report: reportRecord(reportId) },
    );
    return rows.map((r) => ({
      revision: r.revision,
      note: r.note,
      createdAt: toIso(r.created_at),
    }));
  }

  /**
   * Saves new fields as revision `expectedRevision + 1`, only if the report is still at
   * `expectedRevision`. Returns false when someone else saved first. A case awaiting the
   * resident goes back to review in the same transaction.
   */
  async updateFields(
    id: string,
    expectedRevision: number,
    fields: ReportFields,
    authorId: string,
  ): Promise<boolean> {
    const results = await this.surreal.query<unknown[]>(
      `BEGIN TRANSACTION;
       LET $updated = UPDATE $id SET
         fields = $fields, zone_id = $zone_id, current_revision = $expected + 1,
         updated_at = time::now()
       WHERE current_revision = $expected RETURN AFTER;
       IF array::len($updated) > 0 {
         CREATE report_revision CONTENT {
           report: $id, revision: $expected + 1, fields: $fields, note: 'edited', author: $author
         };
         ${residentUpdateSurql('id')}
       };
       RETURN array::len($updated);
       COMMIT TRANSACTION;`,
      {
        id: reportRecord(id),
        expected: expectedRevision,
        fields,
        zone_id: zoneIdOf(fields),
        author: principalRecord(authorId),
      },
    );
    return results.at(-2) === 1;
  }

  /**
   * Files a draft in one transaction: allocates the reference, records the routing decision,
   * opens the case (and stores the recommendation, when planned), and writes the `filed`
   * revision. Only applies while the report is still a draft at `expectedRevision` and its
   * evidence still matches the plan; returns false otherwise.
   */
  async file(
    id: string,
    expectedRevision: number,
    plan: FilingPlan,
    authorId: string,
  ): Promise<boolean> {
    const recommendation = plan.recommendation
      ? `CREATE recommendation CONTENT {
           report: $id, action: $rec.action, status: $rec.status,
           confidence: <float>$rec.confidence, rationale: $rec.rationale, source: $rec.source,
           input_hash: $rec.inputHash, output_hash: $rec.outputHash
         };`
      : '';
    const results = await this.surreal.query<unknown[]>(
      `BEGIN TRANSACTION;
       LET $has_evidence = count((SELECT VALUE id FROM evidence WHERE report = $id)) > 0;
       LET $updated = UPDATE $id SET
         state = 'submitted', current_revision = $expected + 1,
         submitted_at = time::now(), updated_at = time::now()
       WHERE current_revision = $expected AND state = 'draft'
         AND $has_evidence = $input.hasEvidence
       RETURN AFTER;
       IF array::len($updated) > 0 {
         LET $reference = fn::next_report_reference(time::year(time::now()));
         UPDATE $id SET reference = $reference;
         CREATE report_revision CONTENT {
           report: $id, revision: $expected + 1, fields: $updated[0].fields, note: 'filed',
           author: $author
         };
         LET $decision = CREATE routing_decision CONTENT {
           report: $id, rule_id: $result.ruleId, ruleset_version: $result.rulesetVersion,
           ruleset_digest: $digest, input_snapshot: $input, result: $result
         };
         CREATE haven_case CONTENT {
           report: $id, routing_decision: $decision[0].id, organization_id: $result.responder,
           state: 'open', triage_status: 'needs_review', queue_priority: $result.queue,
           version: 1
         };
         ${recommendation}
       };
       RETURN array::len($updated);
       COMMIT TRANSACTION;`,
      {
        id: reportRecord(id),
        expected: expectedRevision,
        input: plan.input,
        result: plan.result,
        digest: plan.rulesetDigest,
        author: principalRecord(authorId),
        ...(plan.recommendation ? { rec: plan.recommendation } : {}),
      },
    );
    return results.at(-2) === 1;
  }

  /**
   * Marks a filed report escalated with an `escalated` revision (fields unchanged). Returns
   * false when the report is not filed or was already escalated.
   */
  async escalate(id: string, authorId: string): Promise<boolean> {
    const results = await this.surreal.query<unknown[]>(
      `BEGIN TRANSACTION;
       LET $before = UPDATE $id SET
         escalated = true, escalated_at = time::now(), current_revision += 1,
         updated_at = time::now()
       WHERE state = 'submitted' AND escalated = false RETURN BEFORE;
       IF array::len($before) > 0 {
         CREATE report_revision CONTENT {
           report: $id, revision: $before[0].current_revision + 1, fields: $before[0].fields,
           note: 'escalated', author: $author
         };
       };
       RETURN array::len($before);
       COMMIT TRANSACTION;`,
      { id: reportRecord(id), author: principalRecord(authorId) },
    );
    return results.at(-2) === 1;
  }
}

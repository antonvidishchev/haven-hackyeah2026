import { Injectable } from '@nestjs/common';
import type {
  CancelReason,
  CaseActionType,
  CaseState,
  CaseStatus,
  Disposition,
  OrganizationId,
  QueuePriority,
  RecommendationAction,
  ReplyKind,
  ReportFields,
  TriageStatus,
} from '@haven/shared';
import { triageStatuses } from '@haven/shared';
import { type DateTime, RecordId } from 'surrealdb';
import { principalRecord } from '../auth/principal.repository.js';
import type { CaseMessageRow } from '../cases/cases.repository.js';
import { TERMINAL_CASE_STATES } from '../cases/triage.js';
import { SurrealService } from '../db/surreal.service.js';

export type CaseRow = {
  id: RecordId<'haven_case'>;
  report_id: RecordId<'report'>;
  reference: string;
  fields: ReportFields;
  escalated: boolean;
  submitted_at: DateTime;
  revision: number;
  organization_id: OrganizationId;
  state: CaseState;
  triage_status: TriageStatus;
  queue_priority: QueuePriority;
  version: number;
  updated_at: DateTime;
  has_suggestion: boolean;
  cancel_reason_category?: CancelReason;
  cancel_comment?: string;
};

export type RecommendationRow = {
  id: RecordId<'recommendation'>;
  action: RecommendationAction;
  status: 'suggested' | 'abstained';
  confidence: number;
  rationale: string;
  source: string;
  created_at: DateTime;
};

export type CaseActionRow = {
  id: RecordId<'case_action'>;
  type: CaseActionType;
  actor_name?: string;
  payload: Record<string, unknown>;
  disposition?: Disposition;
  prior_version: number;
  resulting_version: number;
  created_at: DateTime;
};

export type VaultRow = {
  id: RecordId<'evidence'>;
  report: RecordId<'report'>;
  reference?: string;
  case_id?: RecordId<'haven_case'>;
  file_name: string;
  media_type: string;
  byte_size: number;
  sha256: string;
  created_at: DateTime;
};

/** One operator decision, applied atomically only while the case is still at `expectedVersion`. */
export type CaseDecisionWrite = {
  caseId: string;
  expectedVersion: number;
  next: CaseStatus;
  actorId: string;
  type: Extract<CaseActionType, `operator.${string}`>;
  payload: Record<string, unknown>;
  recommendationId: string | null;
  disposition: Disposition | null;
  /** promote: the new organisation (the assignment resets). */
  organizationId?: OrganizationId;
  /** cancel: why. */
  cancel?: { reasonCategory: CancelReason; comment: string };
  /** A message for the resident, written with the decision. */
  message?: { kind: ReplyKind | 'cancellation_notice'; body: string };
};

export const caseRecord = (id: string) => new RecordId('haven_case', id);

const CASE_FIELDS = `id, report AS report_id, report.reference AS reference,
  report.fields AS fields, report.escalated AS escalated, report.submitted_at AS submitted_at,
  report.current_revision AS revision, organization_id, state, triage_status, queue_priority,
  version, updated_at, cancel_reason_category, cancel_comment,
  count((SELECT VALUE id FROM recommendation
         WHERE report = $parent.report AND status = 'suggested')) > 0 AS has_suggestion`;

const NOT_TERMINAL = `state NOT IN [${TERMINAL_CASE_STATES.map((s) => `'${s}'`).join(', ')}]`;

@Injectable()
export class OperatorRepository {
  constructor(private readonly surreal: SurrealService) {}

  /** Every case in one triage view (unsorted; the service orders the queue). */
  async listByTriage(view: TriageStatus): Promise<CaseRow[]> {
    const [rows] = await this.surreal.query<[CaseRow[]]>(
      `SELECT ${CASE_FIELDS} FROM haven_case WHERE triage_status = $view`,
      { view },
    );
    return rows;
  }

  async triageCounts(): Promise<Record<TriageStatus, number>> {
    const [rows] = await this.surreal.query<[{ triage_status: TriageStatus; total: number }[]]>(
      'SELECT triage_status, count() AS total FROM haven_case GROUP BY triage_status',
    );
    const counts = Object.fromEntries(triageStatuses.map((s) => [s, 0])) as Record<
      TriageStatus,
      number
    >;
    for (const row of rows) counts[row.triage_status] = row.total;
    return counts;
  }

  async findCase(id: string): Promise<CaseRow | null> {
    const [rows] = await this.surreal.query<[CaseRow[]]>(`SELECT ${CASE_FIELDS} FROM $id`, {
      id: caseRecord(id),
    });
    return rows[0] ?? null;
  }

  async recommendationFor(reportId: string): Promise<RecommendationRow | null> {
    const [rows] = await this.surreal.query<[RecommendationRow[]]>(
      `SELECT id, action, status, confidence, rationale, source, created_at FROM recommendation
       WHERE report = $report LIMIT 1`,
      { report: new RecordId('report', reportId) },
    );
    return rows[0] ?? null;
  }

  async messages(caseId: string): Promise<CaseMessageRow[]> {
    const [rows] = await this.surreal.query<[CaseMessageRow[]]>(
      `SELECT id, kind, body, created_at FROM case_message
       WHERE case = $case ORDER BY created_at ASC, id ASC`,
      { case: caseRecord(caseId) },
    );
    return rows;
  }

  async actions(caseId: string): Promise<CaseActionRow[]> {
    const [rows] = await this.surreal.query<[CaseActionRow[]]>(
      `SELECT id, type, actor.display_name AS actor_name, payload, disposition, prior_version,
         resulting_version, created_at
       FROM case_action WHERE case = $case ORDER BY created_at ASC, id ASC`,
      { case: caseRecord(caseId) },
    );
    return rows;
  }

  /**
   * Applies a decision in one transaction: moves the case (version + 1) only while it is still
   * at `expectedVersion` and not closed or cancelled, then writes the message (if any) and the
   * audit action. Returns false when the case changed first.
   */
  async decide(write: CaseDecisionWrite): Promise<boolean> {
    const sets = [
      'state = $state',
      'triage_status = $triage',
      'version = $expected + 1',
      'updated_at = time::now()',
      ...(write.organizationId
        ? ['organization_id = $organization', 'assigned_official = NONE']
        : []),
      ...(write.cancel
        ? ['cancel_reason_category = $reason_category', 'cancel_comment = $cancel_comment']
        : []),
    ];
    const message = write.message
      ? `CREATE case_message CONTENT {
           case: $case, kind: $message_kind, body: $message_body, author: $actor
         };`
      : '';
    const results = await this.surreal.query<unknown[]>(
      `BEGIN TRANSACTION;
       LET $updated = UPDATE $case SET ${sets.join(', ')}
       WHERE version = $expected AND ${NOT_TERMINAL} RETURN AFTER;
       IF array::len($updated) > 0 {
         ${message}
         CREATE case_action CONTENT {
           case: $case, actor: $actor, type: $type, payload: $payload,
           recommendation: $recommendation, disposition: $disposition,
           prior_version: $expected, resulting_version: $expected + 1
         };
       };
       RETURN array::len($updated);
       COMMIT TRANSACTION;`,
      {
        case: caseRecord(write.caseId),
        expected: write.expectedVersion,
        state: write.next.state,
        triage: write.next.triageStatus,
        actor: principalRecord(write.actorId),
        type: write.type,
        payload: write.payload,
        recommendation: write.recommendationId
          ? new RecordId('recommendation', write.recommendationId)
          : undefined,
        disposition: write.disposition ?? undefined,
        ...(write.organizationId ? { organization: write.organizationId } : {}),
        ...(write.cancel
          ? { reason_category: write.cancel.reasonCategory, cancel_comment: write.cancel.comment }
          : {}),
        ...(write.message
          ? { message_kind: write.message.kind, message_body: write.message.body }
          : {}),
      },
    );
    return results.at(-2) === 1;
  }

  /** Evidence on filed reports, newest first. Draft evidence stays private to the resident. */
  async vault(limit: number): Promise<VaultRow[]> {
    const [rows] = await this.surreal.query<[VaultRow[]]>(
      `SELECT id, report, report.reference AS reference,
         (SELECT VALUE id FROM haven_case WHERE report = $parent.report LIMIT 1)[0] AS case_id,
         file_name, media_type, byte_size, sha256, created_at
       FROM evidence WHERE report.state = 'submitted'
       ORDER BY created_at DESC, id DESC LIMIT $limit`,
      { limit },
    );
    return rows;
  }
}

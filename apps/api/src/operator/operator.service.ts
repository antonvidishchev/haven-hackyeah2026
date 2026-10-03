import { Injectable } from '@nestjs/common';
import {
  CANCELLATION_NOTICE,
  CaseClosedError,
  decisionDisposition,
  isTerminal,
  nextCaseStatus,
  queuePriorityRank,
  reportFieldsSchema,
  type cancelCaseRequestSchema,
  type CaseActionItem,
  type CaseStatus,
  type OperatorCaseDetail,
  type OperatorCaseListResponse,
  type OperatorCaseSummary,
  type OperatorDecision,
  type promoteCaseRequestSchema,
  type replyCaseRequestSchema,
  type SessionPrincipal,
  type TriageStatus,
  type VaultListResponse,
} from '@haven/shared';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import { caseAuditEntry } from '../audit/case-audit.js';
import { CasesRepository, toResidentMessage } from '../cases/cases.repository.js';
import { apiError } from '../common/http-exception.filter.js';
import { toIso } from '../db/values.js';
import { EvidenceRepository } from '../evidence/evidence.repository.js';
import { ReportsRepository } from '../reports/reports.repository.js';
import {
  type CaseActionRow,
  type CaseDecisionWrite,
  type CaseRow,
  OperatorRepository,
} from './operator.repository.js';

export const VAULT_LIMIT = 200;

export const caseNotFound = () => apiError(404, 'case_not_found', 'We could not find that case');

export const caseClosed = () =>
  apiError(409, 'case_closed', 'This case is closed and can no longer change');

export const staleVersion = () =>
  apiError(409, 'stale_version', 'This case changed somewhere else. Reload to see the latest.');

/** Parsed request bodies (defaults applied). */
export type Promote = z.output<typeof promoteCaseRequestSchema>;
export type Cancel = z.output<typeof cancelCaseRequestSchema>;
export type Reply = z.output<typeof replyCaseRequestSchema>;

export function toCaseSummary(row: CaseRow): OperatorCaseSummary {
  return {
    id: String(row.id.id),
    reportId: String(row.report_id.id),
    reference: row.reference,
    category: row.fields.category,
    severity: row.fields.severity,
    zoneId: row.fields.zoneId,
    organizationId: row.organization_id,
    state: row.state,
    triageStatus: row.triage_status,
    queue: row.queue_priority,
    hasSuggestion: row.has_suggestion,
    escalated: row.escalated,
    version: row.version,
    submittedAt: toIso(row.submitted_at),
    updatedAt: toIso(row.updated_at),
  };
}

export const toCaseAction = (a: CaseActionRow): CaseActionItem => ({
  id: String(a.id.id),
  type: a.type,
  actorName: a.actor_name ?? 'Unknown',
  payload: a.payload,
  disposition: a.disposition ?? null,
  priorVersion: a.prior_version,
  resultingVersion: a.resulting_version,
  createdAt: toIso(a.created_at),
});

/** Highest queue priority first, then the longest-waiting report. */
export function compareQueue(a: OperatorCaseSummary, b: OperatorCaseSummary): number {
  return (
    queuePriorityRank(a.queue) - queuePriorityRank(b.queue) ||
    a.submittedAt.localeCompare(b.submittedAt) ||
    a.id.localeCompare(b.id)
  );
}

/** The operator workspace: triage queue, case detail, decisions and the evidence vault. */
@Injectable()
export class OperatorService {
  constructor(
    private readonly operator: OperatorRepository,
    private readonly cases: CasesRepository,
    private readonly reports: ReportsRepository,
    private readonly evidence: EvidenceRepository,
    private readonly audit: AuditService,
  ) {}

  async list(view: TriageStatus): Promise<OperatorCaseListResponse> {
    const [rows, counts] = await Promise.all([
      this.operator.listByTriage(view),
      this.operator.triageCounts(),
    ]);
    return { items: rows.map(toCaseSummary).sort(compareQueue), counts };
  }

  async detail(caseId: string): Promise<OperatorCaseDetail> {
    const row = await this.operator.findCase(caseId);
    if (!row) throw caseNotFound();
    const reportId = String(row.report_id.id);
    const [revisions, evidence, routing, recommendation, messages, actions] = await Promise.all([
      this.reports.revisions(reportId),
      this.evidence.listForReport(reportId),
      this.cases.routingFor(reportId),
      this.operator.recommendationFor(reportId),
      this.operator.messages(caseId),
      this.operator.actions(caseId),
    ]);
    if (!routing) throw new Error(`Case ${caseId} has no routing decision`);
    return {
      ...toCaseSummary(row),
      fields: reportFieldsSchema.parse(row.fields),
      revision: row.revision,
      revisions,
      evidence,
      routing,
      recommendation: recommendation
        ? {
            id: String(recommendation.id.id),
            action: recommendation.action,
            status: recommendation.status,
            confidence: recommendation.confidence,
            rationale: recommendation.rationale,
            source: recommendation.source,
            createdAt: toIso(recommendation.created_at),
          }
        : null,
      messages: messages.map(toResidentMessage),
      actions: actions.map(toCaseAction),
      cancelReasonCategory: row.cancel_reason_category ?? null,
      cancelComment: row.cancel_comment ?? null,
    };
  }

  /** Hands the case to another organisation; its assignment resets. */
  promote(principal: SessionPrincipal, caseId: string, body: Promote) {
    return this.decide(
      principal,
      caseId,
      body,
      { type: 'promote', targetOrganization: body.targetOrganization },
      (row) => ({
        type: 'operator.promote',
        organizationId: body.targetOrganization,
        payload: {
          targetOrganization: body.targetOrganization,
          fromOrganization: row.organization_id,
          reason: body.reason,
        },
      }),
    );
  }

  /** Closes the case for good; the resident gets the fixed, neutral notice. */
  cancel(principal: SessionPrincipal, caseId: string, body: Cancel) {
    return this.decide(principal, caseId, body, { type: 'cancel' }, () => ({
      type: 'operator.cancel',
      payload: { reasonCategory: body.reasonCategory, comment: body.comment },
      cancel: { reasonCategory: body.reasonCategory, comment: body.comment },
      message: { kind: 'cancellation_notice', body: CANCELLATION_NOTICE },
    }));
  }

  /** Writes to the resident; a request for information waits for their answer. */
  reply(principal: SessionPrincipal, caseId: string, body: Reply) {
    return this.decide(principal, caseId, body, { type: 'reply', kind: body.kind }, () => ({
      type: 'operator.reply',
      payload: { kind: body.kind, body: body.body },
      message: { kind: body.kind, body: body.body },
    }));
  }

  async vault(): Promise<VaultListResponse> {
    const rows = await this.operator.vault(VAULT_LIMIT);
    return {
      items: rows.map((row) => ({
        id: String(row.id.id),
        reportId: String(row.report.id),
        reference: row.reference ?? null,
        caseId: row.case_id ? String(row.case_id.id) : null,
        fileName: row.file_name,
        mediaType: row.media_type,
        byteSize: row.byte_size,
        sha256: row.sha256,
        createdAt: toIso(row.created_at),
      })),
    };
  }

  private async decide(
    principal: SessionPrincipal,
    caseId: string,
    body: { expectedVersion: number; followedRecommendation: boolean },
    decision: OperatorDecision,
    plan: (row: CaseRow) => Pick<
      CaseDecisionWrite,
      'payload' | 'organizationId' | 'cancel' | 'message'
    > & {
      type: Extract<CaseDecisionWrite['type'], `operator.${string}`>;
    },
  ): Promise<OperatorCaseDetail> {
    const row = await this.operator.findCase(caseId);
    if (!row) throw caseNotFound();

    let next: CaseStatus;
    try {
      next = nextCaseStatus({ state: row.state, triageStatus: row.triage_status }, decision);
    } catch (error) {
      if (error instanceof CaseClosedError) throw caseClosed();
      throw error;
    }
    if (body.expectedVersion !== row.version) throw staleVersion();

    const recommendation = await this.operator.recommendationFor(String(row.report_id.id));
    const write: CaseDecisionWrite = {
      caseId,
      expectedVersion: body.expectedVersion,
      next,
      actorId: principal.id,
      recommendationId: recommendation ? String(recommendation.id.id) : null,
      disposition: decisionDisposition(
        recommendation?.action ?? null,
        decision,
        body.followedRecommendation,
      ),
      ...plan(row),
    };
    if (!(await this.operator.decide(write))) {
      const latest = await this.operator.findCase(caseId);
      throw latest && isTerminal(latest.state) ? caseClosed() : staleVersion();
    }
    const { action, meta } = caseAuditEntry(write);
    await this.audit.record(principal, action, { type: 'haven_case', id: caseId }, meta);
    return this.detail(caseId);
  }
}

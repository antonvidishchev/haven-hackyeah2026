import { Injectable } from '@nestjs/common';
import {
  CaseClosedError,
  isTerminal,
  nextCaseStatus,
  reportFieldsSchema,
  type CaseStatus,
  type closeCaseRequestSchema,
  type OfficialCaseDetail,
  type OfficialCaseListResponse,
  type OfficialCaseSummary,
  type OfficialEvent,
  type OrganizationId,
  type recordActionRequestSchema,
  type SessionPrincipal,
} from '@haven/shared';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import { caseAuditEntry } from '../audit/case-audit.js';
import { CasesRepository } from '../cases/cases.repository.js';
import { apiError } from '../common/http-exception.filter.js';
import { EvidenceRepository } from '../evidence/evidence.repository.js';
import {
  type CaseDecisionWrite,
  type CaseRow,
  OperatorRepository,
} from '../operator/operator.repository.js';
import { OfficialRepository } from './official.repository.js';
import {
  caseClosed,
  caseNotFound,
  compareQueue,
  staleVersion,
  toCaseAction,
  toCaseSummary,
} from '../operator/operator.service.js';

export type RecordAction = z.output<typeof recordActionRequestSchema>;
export type Close = z.output<typeof closeCaseRequestSchema>;

export function toOfficialSummary(row: CaseRow): OfficialCaseSummary {
  const { hasSuggestion: _hasSuggestion, ...summary } = toCaseSummary(row);
  return {
    ...summary,
    assignedOfficial: row.assigned_official
      ? { id: String(row.assigned_official.id), name: row.assigned_official_name ?? 'Unknown' }
      : null,
  };
}

/** Cases still to work come first, by queue priority and age; finished ones after, newest first. */
export function compareOfficialCases(a: OfficialCaseSummary, b: OfficialCaseSummary): number {
  const finished = Number(isTerminal(a.state)) - Number(isTerminal(b.state));
  if (finished !== 0) return finished;
  if (isTerminal(a.state))
    return b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id);
  return compareQueue({ ...a, hasSuggestion: false }, { ...b, hasSuggestion: false });
}

/**
 * The official workspace: the cases routed to the official's own organisation. A case routed
 * anywhere else is "not found", so officials can't learn that it exists.
 */
@Injectable()
export class OfficialService {
  constructor(
    private readonly operator: OperatorRepository,
    private readonly official: OfficialRepository,
    private readonly cases: CasesRepository,
    private readonly evidence: EvidenceRepository,
    private readonly audit: AuditService,
  ) {}

  async list(principal: SessionPrincipal): Promise<OfficialCaseListResponse> {
    const rows = await this.official.listForOrganization(organizationOf(principal));
    return { items: rows.map(toOfficialSummary).sort(compareOfficialCases) };
  }

  async detail(principal: SessionPrincipal, caseId: string): Promise<OfficialCaseDetail> {
    const row = await this.findScoped(principal, caseId);
    const reportId = String(row.report_id.id);
    const [evidence, routing, actions] = await Promise.all([
      this.evidence.listForReport(reportId),
      this.cases.routingFor(reportId),
      this.operator.actions(caseId),
    ]);
    if (!routing) throw new Error(`Case ${caseId} has no routing decision`);
    return {
      ...toOfficialSummary(row),
      fields: reportFieldsSchema.parse(row.fields),
      evidence,
      routing,
      actions: actions.map(toCaseAction),
      closureComment: row.closure_comment ?? null,
    };
  }

  /** Takes the case: it is assigned to this official and moves into review. */
  claim(principal: SessionPrincipal, caseId: string, body: { expectedVersion: number }) {
    return this.decide(
      principal,
      caseId,
      body.expectedVersion,
      { type: 'claim' },
      {
        type: 'official.claim',
        payload: {},
        assignOfficialId: principal.id,
      },
    );
  }

  /** Notes something the official did outside Haven (a call, a visit, a referral…). */
  recordAction(principal: SessionPrincipal, caseId: string, body: RecordAction) {
    return this.decide(
      principal,
      caseId,
      body.expectedVersion,
      { type: 'external_action' },
      {
        type: 'official.external_action',
        payload: { type: body.type, note: body.note },
      },
    );
  }

  /** Closes the case for good, with the official's comment. */
  close(principal: SessionPrincipal, caseId: string, body: Close) {
    return this.decide(
      principal,
      caseId,
      body.expectedVersion,
      { type: 'close' },
      {
        type: 'official.close',
        payload: { comment: body.comment },
        closureComment: body.comment,
      },
    );
  }

  private async findScoped(principal: SessionPrincipal, caseId: string): Promise<CaseRow> {
    const row = await this.operator.findCase(caseId);
    if (!row || row.organization_id !== organizationOf(principal)) throw caseNotFound();
    return row;
  }

  private async decide(
    principal: SessionPrincipal,
    caseId: string,
    expectedVersion: number,
    event: OfficialEvent,
    write: Pick<CaseDecisionWrite, 'payload' | 'assignOfficialId' | 'closureComment'> & {
      type: Extract<CaseDecisionWrite['type'], `official.${string}`>;
    },
  ): Promise<OfficialCaseDetail> {
    const row = await this.findScoped(principal, caseId);

    let next: CaseStatus;
    try {
      next = nextCaseStatus({ state: row.state, triageStatus: row.triage_status }, event);
    } catch (error) {
      if (error instanceof CaseClosedError) throw caseClosed();
      throw error;
    }
    if (expectedVersion !== row.version) throw staleVersion();

    const decision: CaseDecisionWrite = {
      caseId,
      expectedVersion,
      next,
      actorId: principal.id,
      recommendationId: null,
      disposition: null,
      ...write,
    };
    if (!(await this.operator.decide(decision))) {
      const latest = await this.operator.findCase(caseId);
      throw latest && isTerminal(latest.state) ? caseClosed() : staleVersion();
    }
    const { action, meta } = caseAuditEntry(decision);
    await this.audit.record(principal, action, { type: 'haven_case', id: caseId }, meta);
    return this.detail(principal, caseId);
  }
}

/** The guard admits only officials; every official belongs to one organisation. */
function organizationOf(principal: SessionPrincipal): OrganizationId {
  if (!principal.organizationId) {
    throw apiError(403, 'access_required', 'Official access required');
  }
  return principal.organizationId;
}

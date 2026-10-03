import { isDeepStrictEqual } from 'node:util';
import { Inject, Injectable } from '@nestjs/common';
import {
  assertEditableChange,
  emptyReportFields,
  filingGaps,
  LockedFieldError,
  reportFieldsSchema,
  type ReportDetail,
  type ReportListResponse,
  type ReportSummary,
  type SessionPrincipal,
  type SubmitReportRequest,
  type UpdateReportRequest,
} from '@haven/shared';
import { CasesRepository } from '../cases/cases.repository.js';
import { planFiling } from '../cases/routing.js';
import { apiError } from '../common/http-exception.filter.js';
import { APP_CONFIG, type AppConfig } from '../config/env.js';
import { toIso, toIsoOrNull } from '../db/values.js';
import { EvidenceRepository } from '../evidence/evidence.repository.js';
import { decodeCursor, encodeCursor } from './cursor.js';
import { type ReportListRow, type ReportRow, ReportsRepository } from './reports.repository.js';

export const EXCERPT_MAX = 160;

export function descriptionExcerpt(description: string): string {
  const flat = description.replace(/\s+/g, ' ').trim();
  return flat.length <= EXCERPT_MAX ? flat : `${flat.slice(0, EXCERPT_MAX - 1).trimEnd()}…`;
}

export const reportNotFound = () =>
  apiError(404, 'report_not_found', 'We could not find that report');

const revisionConflict = () =>
  apiError(
    409,
    'revision_conflict',
    'This report changed somewhere else. Reload to see the latest version.',
  );

const alreadyFiled = () => apiError(409, 'already_filed', 'This report has already been filed');

const notFiled = () => apiError(409, 'not_filed', 'File this report before escalating it');

/** Stored fields in the shared shape (and key order). */
const fieldsOf = (row: ReportRow) => reportFieldsSchema.parse(row.fields);

function toSummary(row: ReportListRow): ReportSummary {
  return {
    id: String(row.id.id),
    reference: row.reference ?? null,
    state: row.state,
    category: row.fields.category,
    descriptionExcerpt: descriptionExcerpt(row.fields.description),
    evidenceCount: row.evidence_count,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    submittedAt: toIsoOrNull(row.submitted_at),
  };
}

/** A resident's own reports. Someone else's report is "not found", never "forbidden". */
@Injectable()
export class ReportsService {
  constructor(
    private readonly reports: ReportsRepository,
    private readonly evidence: EvidenceRepository,
    private readonly cases: CasesRepository,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async create(principal: SessionPrincipal): Promise<ReportDetail> {
    const row = await this.reports.createDraft(principal.id, emptyReportFields());
    return this.detail(row);
  }

  async list(
    principal: SessionPrincipal,
    query: { cursor?: string; limit: number },
  ): Promise<ReportListResponse> {
    const cursor = query.cursor === undefined ? null : decodeCursor(query.cursor);
    if (query.cursor !== undefined && !cursor) {
      throw apiError(400, 'validation_failed', 'The request is not valid', [
        { path: ['cursor'], message: 'Invalid cursor' },
      ]);
    }
    // One extra row tells us whether there is a next page.
    const rows = await this.reports.listOwned(principal.id, cursor, query.limit + 1);
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return {
      items: page.map(toSummary),
      nextCursor:
        rows.length > query.limit && last
          ? encodeCursor({ createdAt: last.created_at.toISOString(), id: String(last.id.id) })
          : null,
    };
  }

  async get(principal: SessionPrincipal, id: string): Promise<ReportDetail> {
    return this.detail(await this.findOwned(principal, id));
  }

  async update(
    principal: SessionPrincipal,
    id: string,
    body: UpdateReportRequest,
  ): Promise<ReportDetail> {
    const row = await this.findOwned(principal, id);
    if (body.expectedRevision !== row.current_revision) throw revisionConflict();

    const previous = fieldsOf(row);
    try {
      assertEditableChange(row.state, previous, body.fields);
    } catch (error) {
      if (error instanceof LockedFieldError) {
        throw apiError(409, 'field_locked', error.message, { fields: error.fields });
      }
      throw error;
    }

    if (isDeepStrictEqual(previous, body.fields)) return this.detail(row);

    const saved = await this.reports.updateFields(
      id,
      body.expectedRevision,
      body.fields,
      principal.id,
    );
    if (!saved) throw revisionConflict();
    return this.get(principal, id);
  }

  /**
   * Files a draft: freezes the router inputs, routes it, and opens its case, all in one
   * transaction that only applies while the draft is still at `expectedRevision`.
   */
  async submit(
    principal: SessionPrincipal,
    id: string,
    body: SubmitReportRequest,
  ): Promise<ReportDetail> {
    const row = await this.findOwned(principal, id);
    if (row.state !== 'draft') throw alreadyFiled();
    if (body.expectedRevision !== row.current_revision) throw revisionConflict();

    const fields = fieldsOf(row);
    const evidenceCount = (await this.evidence.listForReport(id)).length;
    const gaps = filingGaps(fields, evidenceCount);
    if (gaps.length > 0) {
      throw apiError(422, 'filing_incomplete', 'This report is missing details', { gaps });
    }

    const plan = planFiling(fields, evidenceCount, this.config.AI_RECOMMENDATION_MODE);
    if (!(await this.reports.file(id, body.expectedRevision, plan, principal.id))) {
      const latest = await this.reports.findOwned(id, principal.id);
      throw latest?.state === 'submitted' ? alreadyFiled() : revisionConflict();
    }
    return this.get(principal, id);
  }

  /** Escalates a filed report. Escalating twice changes nothing. */
  async escalate(principal: SessionPrincipal, id: string): Promise<ReportDetail> {
    const row = await this.findOwned(principal, id);
    if (row.state !== 'submitted') throw notFiled();
    if (row.escalated) return this.detail(row);
    await this.reports.escalate(id, principal.id);
    return this.get(principal, id);
  }

  /** The report when the principal owns it, else 404. */
  async findOwned(principal: SessionPrincipal, id: string): Promise<ReportRow> {
    const row = await this.reports.findOwned(id, principal.id);
    if (!row) throw reportNotFound();
    return row;
  }

  private async detail(row: ReportRow): Promise<ReportDetail> {
    const id = String(row.id.id);
    const filed = row.state === 'submitted';
    const [revisions, evidence, routing, messages] = await Promise.all([
      this.reports.revisions(id),
      this.evidence.listForReport(id),
      filed ? this.cases.routingFor(id) : null,
      filed ? this.cases.messagesForReport(id) : [],
    ]);
    return {
      id,
      reference: row.reference ?? null,
      state: row.state,
      revision: row.current_revision,
      fields: fieldsOf(row),
      evidence,
      revisions,
      messages,
      routing,
      escalated: row.escalated,
      escalatedAt: toIsoOrNull(row.escalated_at),
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
      submittedAt: toIsoOrNull(row.submitted_at),
    };
  }
}

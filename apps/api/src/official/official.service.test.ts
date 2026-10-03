import type { HttpException } from '@nestjs/common';
import {
  emptyReportFields,
  type CaseState,
  type OrganizationId,
  type QueuePriority,
  type SessionPrincipal,
} from '@haven/shared';
import { DateTime, RecordId } from 'surrealdb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CasesRepository } from '../cases/cases.repository.js';
import type { EvidenceRepository } from '../evidence/evidence.repository.js';
import type {
  CaseDecisionWrite,
  CaseRow,
  OperatorRepository,
} from '../operator/operator.repository.js';
import type { AuditService } from '../audit/audit.service.js';
import type { OfficialRepository } from './official.repository.js';
import { OfficialService } from './official.service.js';

const support: SessionPrincipal = {
  id: 'off-support',
  role: 'official',
  name: 'Support Services Official',
  organizationId: 'professional_paid',
};

function caseRow(
  id: string,
  overrides: Partial<{
    state: CaseState;
    organization: OrganizationId;
    queue: QueuePriority;
    submittedAt: string;
    updatedAt: string;
    version: number;
  }> = {},
): CaseRow {
  return {
    id: new RecordId('haven_case', id),
    report_id: new RecordId('report', `r-${id}`),
    reference: `HV-2026-${id}`,
    fields: { ...emptyReportFields(), category: 'threat', severity: 'medium', zoneId: 'I' },
    escalated: false,
    submitted_at: new DateTime(overrides.submittedAt ?? '2026-10-01T10:00:00Z'),
    revision: 1,
    organization_id: overrides.organization ?? 'professional_paid',
    state: overrides.state ?? 'open',
    triage_status: 'handled',
    queue_priority: overrides.queue ?? 'normal',
    version: overrides.version ?? 1,
    updated_at: new DateTime(overrides.updatedAt ?? '2026-10-01T10:00:00Z'),
    has_suggestion: true,
  };
}

async function rejection(promise: Promise<unknown>) {
  const error = (await promise.catch((e: unknown) => e)) as HttpException;
  return { status: error.getStatus(), body: error.getResponse() };
}

function setup() {
  const operator = {
    findCase: vi.fn(async (): Promise<CaseRow | null> => null),
    actions: vi.fn(async () => []),
    decide: vi.fn(async (_write: CaseDecisionWrite) => true),
  };
  const official = { listForOrganization: vi.fn(async (): Promise<CaseRow[]> => []) };
  const cases = { routingFor: vi.fn(async () => ({ responder: 'professional_paid' })) };
  const evidence = { listForReport: vi.fn(async () => []) };
  const audit = { record: vi.fn(async () => {}) };
  const service = new OfficialService(
    operator as unknown as OperatorRepository,
    official as unknown as OfficialRepository,
    cases as unknown as CasesRepository,
    evidence as unknown as EvidenceRepository,
    audit as unknown as AuditService,
  );
  const written = () => operator.decide.mock.calls[0]?.[0] as CaseDecisionWrite;
  return { operator, official, service, written, audit };
}

describe('OfficialService.list', () => {
  it('lists the own organisation, open work first, without advisory hints', async () => {
    const t = setup();
    t.official.listForOrganization.mockResolvedValue([
      caseRow('closed-old', { state: 'closed', updatedAt: '2026-10-01T11:00:00Z' }),
      caseRow('open-normal', { submittedAt: '2026-09-30T10:00:00Z' }),
      caseRow('closed-new', { state: 'cancelled', updatedAt: '2026-10-02T11:00:00Z' }),
      caseRow('review-fast', { state: 'in_review', queue: 'fast_laned' }),
    ]);
    const response = await t.service.list(support);
    expect(t.official.listForOrganization).toHaveBeenCalledWith('professional_paid');
    expect(response.items.map((item) => item.id)).toEqual([
      'review-fast',
      'open-normal',
      'closed-new',
      'closed-old',
    ]);
    expect(response.items[0]).not.toHaveProperty('hasSuggestion');
  });
});

describe('OfficialService decisions', () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  it('claims the case for the official', async () => {
    t.operator.findCase.mockResolvedValue(caseRow('c1', { version: 2 }));
    await t.service.claim(support, 'c1', { expectedVersion: 2 });
    expect(t.written()).toMatchObject({
      caseId: 'c1',
      expectedVersion: 2,
      next: { state: 'in_review', triageStatus: 'handled' },
      actorId: 'off-support',
      type: 'official.claim',
      assignOfficialId: 'off-support',
      recommendationId: null,
      disposition: null,
    });
  });

  it('records an external action without changing the state', async () => {
    t.operator.findCase.mockResolvedValue(caseRow('c1', { state: 'in_review' }));
    await t.service.recordAction(support, 'c1', {
      expectedVersion: 1,
      type: 'phone_call',
      note: 'Called the resident',
    });
    expect(t.written()).toMatchObject({
      next: { state: 'in_review', triageStatus: 'handled' },
      type: 'official.external_action',
      payload: { type: 'phone_call', note: 'Called the resident' },
    });
    expect(t.audit.record).toHaveBeenCalledWith(
      support,
      'case.action_recorded',
      { type: 'haven_case', id: 'c1' },
      expect.objectContaining({ actionType: 'phone_call', noteLength: 19 }),
    );
    expect(JSON.stringify(t.audit.record.mock.calls)).not.toContain('Called the resident');
  });

  it('closes with the comment', async () => {
    t.operator.findCase.mockResolvedValue(caseRow('c1', { state: 'in_review' }));
    await t.service.close(support, 'c1', { expectedVersion: 1, comment: 'Resolved' });
    expect(t.written()).toMatchObject({
      next: { state: 'closed', triageStatus: 'handled' },
      type: 'official.close',
      closureComment: 'Resolved',
      payload: { comment: 'Resolved' },
    });
  });

  it("answers 404 for another organisation's case", async () => {
    t.operator.findCase.mockResolvedValue(caseRow('c1', { organization: 'police_municipal' }));
    expect(await rejection(t.service.detail(support, 'c1'))).toMatchObject({
      status: 404,
      body: { error: { code: 'case_not_found' } },
    });
    expect(await rejection(t.service.claim(support, 'c1', { expectedVersion: 1 }))).toMatchObject({
      status: 404,
    });
    expect(t.operator.decide).not.toHaveBeenCalled();
  });

  it('answers 409 case_closed on a cancelled case', async () => {
    t.operator.findCase.mockResolvedValue(caseRow('c1', { state: 'cancelled' }));
    const result = await rejection(
      t.service.close(support, 'c1', { expectedVersion: 1, comment: 'x' }),
    );
    expect(result).toMatchObject({ status: 409, body: { error: { code: 'case_closed' } } });
    expect(t.operator.decide).not.toHaveBeenCalled();
  });

  it('answers 409 stale_version for an old version', async () => {
    t.operator.findCase.mockResolvedValue(caseRow('c1', { version: 3 }));
    const result = await rejection(t.service.claim(support, 'c1', { expectedVersion: 2 }));
    expect(result.body).toMatchObject({ error: { code: 'stale_version' } });
  });
});

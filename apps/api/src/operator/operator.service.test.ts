import type { HttpException } from '@nestjs/common';
import {
  CANCELLATION_NOTICE,
  emptyReportFields,
  type CaseState,
  type QueuePriority,
  type SessionPrincipal,
  type TriageStatus,
} from '@haven/shared';
import { DateTime, RecordId } from 'surrealdb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CasesRepository } from '../cases/cases.repository.js';
import type { EvidenceRepository } from '../evidence/evidence.repository.js';
import type { ReportsRepository } from '../reports/reports.repository.js';
import type { AuditService } from '../audit/audit.service.js';
import type {
  CaseDecisionWrite,
  CaseRow,
  OperatorRepository,
  RecommendationRow,
} from './operator.repository.js';
import { OperatorService } from './operator.service.js';

const operator: SessionPrincipal = { id: 'op', role: 'operator', name: 'Operator' };

function caseRow(
  id: string,
  overrides: Partial<{
    state: CaseState;
    triage: TriageStatus;
    queue: QueuePriority;
    submittedAt: string;
    version: number;
  }> = {},
): CaseRow {
  return {
    id: new RecordId('haven_case', id),
    report_id: new RecordId('report', `r-${id}`),
    reference: `HVN-2026-${id}`,
    fields: { ...emptyReportFields(), category: 'verbal_harassment', severity: 'low', zoneId: 'I' },
    escalated: false,
    submitted_at: new DateTime(overrides.submittedAt ?? '2026-10-01T10:00:00Z'),
    revision: 1,
    organization_id: 'community_volunteer',
    state: overrides.state ?? 'open',
    triage_status: overrides.triage ?? 'needs_review',
    queue_priority: overrides.queue ?? 'normal',
    version: overrides.version ?? 1,
    updated_at: new DateTime('2026-10-01T10:00:00Z'),
    has_suggestion: false,
  };
}

const suggestion = (action: RecommendationRow['action']): RecommendationRow => ({
  id: new RecordId('recommendation', 'rec1'),
  action,
  status: action === 'none' ? 'abstained' : 'suggested',
  confidence: 0.7,
  rationale: 'why',
  source: 'simulated-local-v1',
  created_at: new DateTime('2026-10-01T10:00:00Z'),
});

async function rejection(promise: Promise<unknown>) {
  const error = (await promise.catch((e: unknown) => e)) as HttpException;
  return { status: error.getStatus(), body: error.getResponse() };
}

function setup() {
  const repo = {
    listByTriage: vi.fn(async (): Promise<CaseRow[]> => []),
    triageCounts: vi.fn(async () => ({ needs_review: 0, awaiting_resident: 0, handled: 0 })),
    findCase: vi.fn(async (): Promise<CaseRow | null> => null),
    recommendationFor: vi.fn(async (): Promise<RecommendationRow | null> => null),
    messages: vi.fn(async () => []),
    actions: vi.fn(async () => []),
    decide: vi.fn(async (_write: CaseDecisionWrite) => true),
    vault: vi.fn(async () => []),
  };
  const cases = { routingFor: vi.fn(async () => ({ responder: 'community_volunteer' })) };
  const reports = { revisions: vi.fn(async () => []) };
  const evidence = { listForReport: vi.fn(async () => []) };
  const audit = { record: vi.fn(async () => {}) };
  const service = new OperatorService(
    repo as unknown as OperatorRepository,
    cases as unknown as CasesRepository,
    reports as unknown as ReportsRepository,
    evidence as unknown as EvidenceRepository,
    audit as unknown as AuditService,
  );
  const written = () => repo.decide.mock.calls[0]?.[0] as CaseDecisionWrite;
  return { repo, service, written, audit };
}

describe('OperatorService.list', () => {
  it('orders by queue priority, then oldest first, and passes the counts through', async () => {
    const t = setup();
    t.repo.listByTriage.mockResolvedValue([
      caseRow('a', { submittedAt: '2026-10-01T09:00:00Z' }),
      caseRow('b', { queue: 'jumps_queue', submittedAt: '2026-10-02T09:00:00Z' }),
      caseRow('c', { queue: 'expedited', submittedAt: '2026-10-01T12:00:00Z' }),
      caseRow('d', { queue: 'expedited', submittedAt: '2026-10-01T08:00:00Z' }),
      caseRow('e', { submittedAt: '2026-09-30T09:00:00Z' }),
    ]);
    t.repo.triageCounts.mockResolvedValue({ needs_review: 5, awaiting_resident: 2, handled: 7 });
    const response = await t.service.list('needs_review');
    expect(t.repo.listByTriage).toHaveBeenCalledWith('needs_review');
    expect(response.items.map((item) => item.id)).toEqual(['b', 'd', 'c', 'e', 'a']);
    expect(response.counts).toEqual({ needs_review: 5, awaiting_resident: 2, handled: 7 });
    expect(response.items[0]).toMatchObject({
      reportId: 'r-b',
      reference: 'HVN-2026-b',
      category: 'verbal_harassment',
      severity: 'low',
      zoneId: 'I',
      queue: 'jumps_queue',
      submittedAt: '2026-10-02T09:00:00.000Z',
    });
  });
});

describe('OperatorService decisions', () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  it('promotes to another organisation, following the recommendation', async () => {
    t.repo.findCase.mockResolvedValue(caseRow('c1', { version: 3 }));
    t.repo.recommendationFor.mockResolvedValue(suggestion('transfer_to_ngo'));
    await t.service.promote(operator, 'c1', {
      expectedVersion: 3,
      followedRecommendation: true,
      targetOrganization: 'professional_paid',
      reason: 'Needs a paid service',
    });
    expect(t.written()).toMatchObject({
      caseId: 'c1',
      expectedVersion: 3,
      next: { state: 'open', triageStatus: 'handled' },
      actorId: 'op',
      type: 'operator.promote',
      organizationId: 'professional_paid',
      recommendationId: 'rec1',
      disposition: 'followed',
      payload: {
        targetOrganization: 'professional_paid',
        fromOrganization: 'community_volunteer',
        reason: 'Needs a paid service',
      },
    });
    expect(t.written().message).toBeUndefined();
    expect(t.audit.record).toHaveBeenCalledWith(
      operator,
      'case.promoted',
      { type: 'haven_case', id: 'c1' },
      expect.objectContaining({
        fromOrganization: 'community_volunteer',
        targetOrganization: 'professional_paid',
        reasonLength: 'Needs a paid service'.length,
        disposition: 'followed',
        resultingVersion: 4,
      }),
    );
    expect(JSON.stringify(t.audit.record.mock.calls)).not.toContain('Needs a paid service');
  });

  it('cancels with the fixed notice, rejecting the recommendation', async () => {
    t.repo.findCase.mockResolvedValue(caseRow('c1'));
    t.repo.recommendationFor.mockResolvedValue(suggestion('request_more_evidence'));
    await t.service.cancel(operator, 'c1', {
      expectedVersion: 1,
      followedRecommendation: false,
      reasonCategory: 'spam',
      comment: 'Advert',
    });
    expect(t.written()).toMatchObject({
      next: { state: 'cancelled', triageStatus: 'handled' },
      type: 'operator.cancel',
      cancel: { reasonCategory: 'spam', comment: 'Advert' },
      message: { kind: 'cancellation_notice', body: CANCELLATION_NOTICE },
      payload: { reasonCategory: 'spam', comment: 'Advert' },
      disposition: 'rejected',
    });
  });

  it('requests information, which waits for the resident', async () => {
    t.repo.findCase.mockResolvedValue(caseRow('c1'));
    await t.service.reply(operator, 'c1', {
      expectedVersion: 1,
      followedRecommendation: false,
      kind: 'request_information',
      body: 'Which tram line?',
    });
    expect(t.written()).toMatchObject({
      next: { state: 'open', triageStatus: 'awaiting_resident' },
      type: 'operator.reply',
      message: { kind: 'request_information', body: 'Which tram line?' },
      payload: { kind: 'request_information', body: 'Which tram line?' },
      recommendationId: null,
      disposition: null,
    });
  });

  it('keeps the triage status for a comment and marks it different from the advice', async () => {
    t.repo.findCase.mockResolvedValue(caseRow('c1'));
    t.repo.recommendationFor.mockResolvedValue(suggestion('request_more_evidence'));
    await t.service.reply(operator, 'c1', {
      expectedVersion: 1,
      followedRecommendation: false,
      kind: 'comment',
      body: 'Noted',
    });
    expect(t.written()).toMatchObject({
      next: { state: 'open', triageStatus: 'needs_review' },
      disposition: 'different',
    });
  });

  it('returns the updated detail', async () => {
    t.repo.findCase
      .mockResolvedValueOnce(caseRow('c1'))
      .mockResolvedValueOnce(caseRow('c1', { triage: 'awaiting_resident', version: 2 }));
    const detail = await t.service.reply(operator, 'c1', {
      expectedVersion: 1,
      followedRecommendation: false,
      kind: 'request_information',
      body: 'More?',
    });
    expect(detail).toMatchObject({ id: 'c1', triageStatus: 'awaiting_resident', version: 2 });
  });

  it('answers 409 stale_version for an old version without writing', async () => {
    t.repo.findCase.mockResolvedValue(caseRow('c1', { version: 2 }));
    const result = await rejection(
      t.service.reply(operator, 'c1', {
        expectedVersion: 1,
        followedRecommendation: false,
        kind: 'comment',
        body: 'x',
      }),
    );
    expect(result.status).toBe(409);
    expect(result.body).toMatchObject({ error: { code: 'stale_version' } });
    expect(t.repo.decide).not.toHaveBeenCalled();
    expect(t.audit.record).not.toHaveBeenCalled();
  });

  it('answers 409 stale_version when another decision wins the race', async () => {
    t.repo.findCase
      .mockResolvedValueOnce(caseRow('c1'))
      .mockResolvedValueOnce(caseRow('c1', { version: 2 }));
    t.repo.decide.mockResolvedValue(false);
    const result = await rejection(
      t.service.promote(operator, 'c1', {
        expectedVersion: 1,
        followedRecommendation: false,
        targetOrganization: 'police_municipal',
        reason: 'r',
      }),
    );
    expect(result.body).toMatchObject({ error: { code: 'stale_version' } });
  });

  it('answers 409 case_closed when a cancellation wins the race', async () => {
    t.repo.findCase
      .mockResolvedValueOnce(caseRow('c1'))
      .mockResolvedValueOnce(caseRow('c1', { state: 'cancelled', version: 2 }));
    t.repo.decide.mockResolvedValue(false);
    const result = await rejection(
      t.service.reply(operator, 'c1', {
        expectedVersion: 1,
        followedRecommendation: false,
        kind: 'comment',
        body: 'x',
      }),
    );
    expect(result.body).toMatchObject({ error: { code: 'case_closed' } });
  });

  it('answers 409 case_closed on a cancelled case', async () => {
    t.repo.findCase.mockResolvedValue(caseRow('c1', { state: 'cancelled', triage: 'handled' }));
    const result = await rejection(
      t.service.cancel(operator, 'c1', {
        expectedVersion: 1,
        followedRecommendation: false,
        reasonCategory: 'duplicate',
        comment: 'again',
      }),
    );
    expect(result.status).toBe(409);
    expect(result.body).toMatchObject({ error: { code: 'case_closed' } });
    expect(t.repo.decide).not.toHaveBeenCalled();
  });

  it('answers 404 case_not_found for an unknown case', async () => {
    const result = await rejection(t.service.detail('nope'));
    expect(result).toMatchObject({ status: 404, body: { error: { code: 'case_not_found' } } });
  });
});

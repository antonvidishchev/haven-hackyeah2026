import type { HttpException } from '@nestjs/common';
import {
  emptyReportFields,
  type ReportFields,
  type ReportState,
  type SessionPrincipal,
} from '@haven/shared';
import { DateTime, RecordId } from 'surrealdb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CasesRepository } from '../cases/cases.repository.js';
import type { FilingPlan } from '../cases/routing.js';
import type { AppConfig } from '../config/env.js';
import type { EvidenceRepository } from '../evidence/evidence.repository.js';
import type { ReportRow, ReportsRepository } from './reports.repository.js';
import { ReportsService } from './reports.service.js';

const owner: SessionPrincipal = { id: 'owner', role: 'guest', name: 'Guest' };

const fileable: ReportFields = {
  ...emptyReportFields(),
  category: 'verbal_harassment',
  severity: 'low',
  description: 'test',
  locationLabel: 'Tram 4',
  zoneId: 'I',
};

function row(state: ReportState, fields: ReportFields, revision = 1, escalated = false): ReportRow {
  const at = new DateTime('2026-10-03T12:00:00Z');
  return {
    id: new RecordId('report', 'r1'),
    owner: new RecordId('principal', owner.id),
    state,
    current_revision: revision,
    fields,
    escalated,
    ...(escalated ? { escalated_at: at } : {}),
    created_at: at,
    updated_at: at,
  };
}

async function rejection(promise: Promise<unknown>) {
  const error = (await promise.catch((e: unknown) => e)) as HttpException;
  return { status: error.getStatus(), body: error.getResponse() };
}

function setup(mode: AppConfig['AI_RECOMMENDATION_MODE'] = 'local') {
  const reports = {
    findOwned: vi.fn(),
    file: vi.fn(async (..._args: unknown[]) => true),
    escalate: vi.fn(async () => true),
    revisions: vi.fn(async () => []),
  };
  const evidence = { listForReport: vi.fn(async () => [] as unknown[]) };
  const cases = {
    routingFor: vi.fn(async () => null),
    messagesForReport: vi.fn(async () => [] as unknown[]),
  };
  const service = new ReportsService(
    reports as unknown as ReportsRepository,
    evidence as unknown as EvidenceRepository,
    cases as unknown as CasesRepository,
    { AI_RECOMMENDATION_MODE: mode } as AppConfig,
  );
  const plan = () => reports.file.mock.calls[0]?.[2] as unknown as FilingPlan;
  return { reports, evidence, cases, service, plan };
}

describe('ReportsService.submit', () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  it('files a low-severity report to the community volunteers', async () => {
    t.reports.findOwned
      .mockResolvedValueOnce(row('draft', fileable))
      .mockResolvedValueOnce(row('submitted', fileable, 2));
    const detail = await t.service.submit(owner, 'r1', { expectedRevision: 1 });

    expect(t.reports.file).toHaveBeenCalledWith('r1', 1, expect.any(Object), owner.id);
    expect(t.plan().input).toEqual({
      severity: 'low',
      weaponOrImmediateThreat: false,
      isRepeatIncident: false,
      hasEvidence: false,
    });
    expect(t.plan().result).toMatchObject({
      ruleId: 'router-rule-1',
      responder: 'community_volunteer',
      queue: 'normal',
      emergency: false,
    });
    expect(t.plan().rulesetDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(detail).toMatchObject({ state: 'submitted', revision: 2 });
  });

  it('routes a weapon to the municipal police, jumping the queue', async () => {
    const emergency = {
      ...fileable,
      severity: 'emergency',
      weaponOrImmediateThreat: true,
    } as const;
    t.reports.findOwned
      .mockResolvedValueOnce(row('draft', emergency))
      .mockResolvedValueOnce(row('submitted', emergency, 2));
    await t.service.submit(owner, 'r1', { expectedRevision: 1 });
    expect(t.plan().result).toMatchObject({
      responder: 'police_municipal',
      queue: 'jumps_queue',
      autoDispatch: true,
      emergency: true,
    });
  });

  it('answers 422 filing_incomplete with the gaps', async () => {
    t.reports.findOwned.mockResolvedValue(row('draft', emptyReportFields()));
    const result = await rejection(t.service.submit(owner, 'r1', { expectedRevision: 1 }));
    expect(result).toEqual({
      status: 422,
      body: {
        error: {
          code: 'filing_incomplete',
          message: expect.any(String),
          details: { gaps: ['district', 'place', 'details'] },
        },
      },
    });
    expect(t.reports.file).not.toHaveBeenCalled();
  });

  it('counts attached evidence as details', async () => {
    t.reports.findOwned.mockResolvedValue(row('draft', { ...fileable, description: '' }));
    t.evidence.listForReport.mockResolvedValue([{}]);
    await t.service.submit(owner, 'r1', { expectedRevision: 1 });
    expect(t.plan().input.hasEvidence).toBe(true);
  });

  it('answers 409 revision_conflict for a stale revision', async () => {
    t.reports.findOwned.mockResolvedValue(row('draft', fileable, 2));
    const result = await rejection(t.service.submit(owner, 'r1', { expectedRevision: 1 }));
    expect(result.status).toBe(409);
    expect(result.body).toMatchObject({ error: { code: 'revision_conflict' } });
    expect(t.reports.file).not.toHaveBeenCalled();
  });

  it('answers 409 revision_conflict when an edit wins the race', async () => {
    t.reports.findOwned.mockResolvedValue(row('draft', fileable));
    t.reports.file.mockResolvedValue(false);
    const result = await rejection(t.service.submit(owner, 'r1', { expectedRevision: 1 }));
    expect(result.body).toMatchObject({ error: { code: 'revision_conflict' } });
  });

  it('answers 409 already_filed for a filed report', async () => {
    t.reports.findOwned.mockResolvedValue(row('submitted', fileable, 2));
    const result = await rejection(t.service.submit(owner, 'r1', { expectedRevision: 2 }));
    expect(result.status).toBe(409);
    expect(result.body).toMatchObject({ error: { code: 'already_filed' } });
    expect(t.reports.file).not.toHaveBeenCalled();
  });

  it('answers 409 already_filed when a concurrent submit filed it first', async () => {
    t.reports.findOwned
      .mockResolvedValueOnce(row('draft', fileable))
      .mockResolvedValueOnce(row('submitted', fileable, 2));
    t.reports.file.mockResolvedValue(false);
    const result = await rejection(t.service.submit(owner, 'r1', { expectedRevision: 1 }));
    expect(result.body).toMatchObject({ error: { code: 'already_filed' } });
  });

  it('answers 404 for a report the principal does not own', async () => {
    t.reports.findOwned.mockResolvedValue(null);
    const result = await rejection(t.service.submit(owner, 'r1', { expectedRevision: 1 }));
    expect(result.body).toMatchObject({ error: { code: 'report_not_found' } });
  });

  it('plans a hashed recommendation in local mode', async () => {
    t.reports.findOwned.mockResolvedValue(row('draft', fileable));
    await t.service.submit(owner, 'r1', { expectedRevision: 1 });
    expect(t.plan().recommendation).toMatchObject({
      action: 'transfer_to_ngo',
      status: 'suggested',
      source: 'simulated-local-v1',
      inputHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      outputHash: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it('plans no recommendation when recommendations are disabled', async () => {
    const disabled = setup('disabled');
    disabled.reports.findOwned.mockResolvedValue(row('draft', fileable));
    await disabled.service.submit(owner, 'r1', { expectedRevision: 1 });
    expect(disabled.plan().recommendation).toBeNull();
  });
});

describe('ReportsService.escalate', () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  it('answers 409 not_filed for a draft', async () => {
    t.reports.findOwned.mockResolvedValue(row('draft', fileable));
    const result = await rejection(t.service.escalate(owner, 'r1'));
    expect(result.status).toBe(409);
    expect(result.body).toMatchObject({ error: { code: 'not_filed' } });
    expect(t.reports.escalate).not.toHaveBeenCalled();
  });

  it('escalates a filed report', async () => {
    t.reports.findOwned
      .mockResolvedValueOnce(row('submitted', fileable, 2))
      .mockResolvedValueOnce(row('submitted', fileable, 3, true));
    const detail = await t.service.escalate(owner, 'r1');
    expect(t.reports.escalate).toHaveBeenCalledWith('r1', owner.id);
    expect(detail).toMatchObject({
      escalated: true,
      escalatedAt: '2026-10-03T12:00:00.000Z',
      revision: 3,
    });
  });

  it('is idempotent', async () => {
    t.reports.findOwned.mockResolvedValue(row('submitted', fileable, 3, true));
    const detail = await t.service.escalate(owner, 'r1');
    expect(t.reports.escalate).not.toHaveBeenCalled();
    expect(detail).toMatchObject({ escalated: true, revision: 3 });
  });
});

describe('ReportsService resident messages', () => {
  it("returns the case's messages without their author, oldest first", async () => {
    const t = setup();
    const messages = [
      { id: 'm1', kind: 'request_information', body: 'Which tram?', createdAt: 'a' },
      { id: 'm2', kind: 'cancellation_notice', body: 'Closed', createdAt: 'b' },
    ];
    t.cases.messagesForReport.mockResolvedValue(messages);
    t.reports.findOwned.mockResolvedValue(row('submitted', fileable, 2));
    const detail = await t.service.get(owner, 'r1');
    expect(t.cases.messagesForReport).toHaveBeenCalledWith('r1');
    expect(detail.messages).toEqual(messages);
  });

  it('has none for a draft', async () => {
    const t = setup();
    t.reports.findOwned.mockResolvedValue(row('draft', fileable));
    const detail = await t.service.get(owner, 'r1');
    expect(detail.messages).toEqual([]);
    expect(t.cases.messagesForReport).not.toHaveBeenCalled();
  });
});

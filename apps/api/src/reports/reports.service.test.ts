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
import type { AppConfig } from '../config/env.js';
import type { EvidenceRepository } from '../evidence/evidence.repository.js';
import type { ReportRow, ReportsRepository } from './reports.repository.js';
import { descriptionExcerpt, ReportsService } from './reports.service.js';

const owner: SessionPrincipal = { id: 'owner', role: 'guest', name: 'Guest' };

function row(state: ReportState, fields: ReportFields, revision = 3): ReportRow {
  const at = new DateTime('2026-10-03T12:00:00Z');
  return {
    id: new RecordId('report', 'r1'),
    owner: new RecordId('principal', owner.id),
    state,
    current_revision: revision,
    fields,
    escalated: false,
    created_at: at,
    updated_at: at,
  };
}

const filedFields: ReportFields = {
  ...emptyReportFields(),
  severity: 'high',
  description: 'Shouting at the tram stop',
  zoneId: 'I',
};

async function rejection(promise: Promise<unknown>) {
  const error = (await promise.catch((e: unknown) => e)) as HttpException;
  return { status: error.getStatus(), body: error.getResponse() };
}

describe('ReportsService.update', () => {
  const reports = {
    findOwned: vi.fn(),
    updateFields: vi.fn(),
    revisions: vi.fn(async () => []),
  };
  const evidence = { listForReport: vi.fn(async () => []) };
  const service = new ReportsService(
    reports as unknown as ReportsRepository,
    evidence as unknown as EvidenceRepository,
    {
      routingFor: vi.fn(async () => null),
      messagesForReport: vi.fn(async () => []),
    } as unknown as CasesRepository,
    { AI_RECOMMENDATION_MODE: 'local' } as AppConfig,
  );

  beforeEach(() => vi.clearAllMocks());

  it('answers 404 for a report the principal does not own', async () => {
    reports.findOwned.mockResolvedValue(null);
    const result = await rejection(
      service.update(owner, 'r1', { expectedRevision: 1, fields: emptyReportFields() }),
    );
    expect(result.status).toBe(404);
    expect(result.body).toMatchObject({ error: { code: 'report_not_found' } });
  });

  it('answers 409 revision_conflict for a stale revision', async () => {
    reports.findOwned.mockResolvedValue(row('draft', emptyReportFields()));
    const result = await rejection(
      service.update(owner, 'r1', { expectedRevision: 2, fields: filedFields }),
    );
    expect(result.status).toBe(409);
    expect(result.body).toMatchObject({ error: { code: 'revision_conflict' } });
    expect(reports.updateFields).not.toHaveBeenCalled();
  });

  it('answers 409 revision_conflict when another save wins the race', async () => {
    reports.findOwned.mockResolvedValue(row('draft', emptyReportFields()));
    reports.updateFields.mockResolvedValue(false);
    const result = await rejection(
      service.update(owner, 'r1', { expectedRevision: 3, fields: filedFields }),
    );
    expect(result.body).toMatchObject({ error: { code: 'revision_conflict' } });
  });

  it('answers 409 field_locked when a filed report changes a locked field', async () => {
    reports.findOwned.mockResolvedValue(row('submitted', filedFields));
    const result = await rejection(
      service.update(owner, 'r1', {
        expectedRevision: 3,
        fields: { ...filedFields, severity: 'low', isRepeatIncident: true },
      }),
    );
    expect(result).toEqual({
      status: 409,
      body: {
        error: {
          code: 'field_locked',
          message: expect.any(String),
          details: { fields: ['severity', 'isRepeatIncident'] },
        },
      },
    });
  });

  it('lets a filed report change unlocked fields', async () => {
    const next = { ...filedFields, description: 'More detail' };
    reports.findOwned
      .mockResolvedValueOnce(row('submitted', filedFields))
      .mockResolvedValueOnce(row('submitted', next, 4));
    reports.updateFields.mockResolvedValue(true);
    const detail = await service.update(owner, 'r1', { expectedRevision: 3, fields: next });
    expect(reports.updateFields).toHaveBeenCalledWith('r1', 3, next, owner.id);
    expect(detail).toMatchObject({
      revision: 4,
      fields: next,
      messages: [],
      routing: null,
      escalated: false,
      escalatedAt: null,
    });
  });

  it('does not add a revision when nothing changed', async () => {
    reports.findOwned.mockResolvedValue(row('draft', filedFields));
    const detail = await service.update(owner, 'r1', {
      expectedRevision: 3,
      fields: { ...filedFields },
    });
    expect(reports.updateFields).not.toHaveBeenCalled();
    expect(detail.revision).toBe(3);
  });
});

describe('descriptionExcerpt', () => {
  it('flattens whitespace and caps at 160 characters', () => {
    expect(descriptionExcerpt('  two\n\nlines ')).toBe('two lines');
    const excerpt = descriptionExcerpt('word '.repeat(100));
    expect(excerpt.length).toBeLessThanOrEqual(160);
    expect(excerpt.endsWith('…')).toBe(true);
  });
});

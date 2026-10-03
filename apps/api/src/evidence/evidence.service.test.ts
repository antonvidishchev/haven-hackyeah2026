import { type HttpException, Logger } from '@nestjs/common';
import type { SessionPrincipal } from '@haven/shared';
import { Readable } from 'node:stream';
import { RecordId } from 'surrealdb';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CasesRepository } from '../cases/cases.repository.js';
import type { AppConfig } from '../config/env.js';
import type { ReportsService } from '../reports/reports.service.js';
import type { EvidenceRepository, EvidenceWithReport } from './evidence.repository.js';
import { EvidenceService } from './evidence.service.js';
import type { EvidenceStorage } from './evidence.storage.js';

const evidenceRow = {
  id: new RecordId('evidence', 'e1'),
  report: new RecordId('report', 'r1'),
  owner: new RecordId('principal', 'owner'),
  storage_path: 'e1',
  report_state: 'submitted',
} as unknown as EvidenceWithReport;

const official = (organizationId: SessionPrincipal['organizationId']): SessionPrincipal => ({
  id: 'official',
  role: 'official',
  name: 'Official',
  organizationId,
});

describe('EvidenceService.media access', () => {
  const evidence = { findWithReport: vi.fn(async () => evidenceRow) };
  const storage = { size: vi.fn(async () => 3), read: vi.fn(() => Readable.from(['abc'])) };
  const cases = { organizationHasReport: vi.fn() };
  const service = new EvidenceService(
    evidence as unknown as EvidenceRepository,
    storage as unknown as EvidenceStorage,
    {} as ReportsService,
    cases as unknown as CasesRepository,
    { EVIDENCE_MAX_BYTES: 10 } as AppConfig,
  );

  beforeAll(() => Logger.overrideLogger(false));
  beforeEach(() => vi.clearAllMocks());

  it('lets an official view evidence on a case routed to their organisation', async () => {
    cases.organizationHasReport.mockResolvedValue(true);
    const media = await service.media(official('community_volunteer'), 'e1', undefined);
    expect(media.status).toBe(200);
    expect(cases.organizationHasReport).toHaveBeenCalledWith('r1', 'community_volunteer');
  });

  it('answers 404 to an official of another organisation', async () => {
    cases.organizationHasReport.mockResolvedValue(false);
    const error = (await service
      .media(official('police_municipal'), 'e1', undefined)
      .catch((e: unknown) => e)) as HttpException;
    expect(error.getStatus()).toBe(404);
    expect(storage.size).not.toHaveBeenCalled();
  });

  it('answers 404 to another resident without looking up cases', async () => {
    const error = (await service
      .media({ id: 'someone', role: 'resident', name: 'R' }, 'e1', undefined)
      .catch((e: unknown) => e)) as HttpException;
    expect(error.getStatus()).toBe(404);
    expect(cases.organizationHasReport).not.toHaveBeenCalled();
  });

  it('answers 404 to an operator for draft evidence', async () => {
    evidence.findWithReport.mockResolvedValueOnce({ ...evidenceRow, report_state: 'draft' });
    const error = (await service
      .media({ id: 'op', role: 'operator', name: 'Op' }, 'e1', undefined)
      .catch((e: unknown) => e)) as HttpException;
    expect(error.getStatus()).toBe(404);
    expect(storage.size).not.toHaveBeenCalled();
  });

  it('lets operators view filed evidence without a case lookup', async () => {
    const media = await service.media({ id: 'op', role: 'operator', name: 'Op' }, 'e1', undefined);
    expect(media.status).toBe(200);
    expect(cases.organizationHasReport).not.toHaveBeenCalled();
  });
});

import { caseStates, nextCaseStatus, triageStatuses } from '@haven/shared';
import { DateTime, RecordId } from 'surrealdb';
import { describe, expect, it, vi } from 'vitest';
import type { SurrealService } from '../db/surreal.service.js';
import { EvidenceRepository } from '../evidence/evidence.repository.js';
import { ReportsRepository } from '../reports/reports.repository.js';
import { type CaseMessageRow, toResidentMessage } from './cases.repository.js';
import {
  RESIDENT_UPDATE_FROM,
  RESIDENT_UPDATE_TO,
  residentUpdateSurql,
  TERMINAL_CASE_STATES,
} from './triage.js';

describe('resident trigger', () => {
  it('matches nextCaseStatus for a resident update in every state', () => {
    for (const state of caseStates) {
      for (const triageStatus of triageStatuses) {
        const next = nextCaseStatus({ state, triageStatus }, { type: 'resident_update' });
        const sqlApplies =
          triageStatus === RESIDENT_UPDATE_FROM && !TERMINAL_CASE_STATES.includes(state);
        expect(next).toEqual(
          sqlApplies ? { state, triageStatus: RESIDENT_UPDATE_TO } : { state, triageStatus },
        );
      }
    }
  });

  function fakeSurreal(result: unknown[]) {
    const query = vi.fn(async (..._args: unknown[]) => result);
    return { query, surreal: { query } as unknown as SurrealService };
  }

  it('moves the case back to review in the same transaction as a new revision', async () => {
    const { query, surreal } = fakeSurreal([null, null, 1, null]);
    await new ReportsRepository(surreal).updateFields('r1', 2, {} as never, 'owner');
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain(residentUpdateSurql('id'));
    expect(sql.indexOf(residentUpdateSurql('id'))).toBeLessThan(sql.indexOf('COMMIT'));
    expect(sql).toContain("SET\n     triage_status = 'needs_review', version += 1");
  });

  it('moves the case back to review when evidence is added to a filed report', async () => {
    const created = {
      id: new RecordId('evidence', 'e1'),
      created_at: new DateTime('2026-10-03T12:00:00Z'),
    };
    const { query, surreal } = fakeSurreal([null, null, null, created, null]);
    await new EvidenceRepository(surreal).create({
      id: 'e1',
      reportId: 'r1',
      ownerId: 'owner',
      fileName: 'a.jpg',
      mediaType: 'image/jpeg',
      byteSize: 1,
      sha256: 'x',
      storagePath: 'e1',
    });
    const sql = String(query.mock.calls[0]?.[0]);
    const submittedBranch = sql.slice(
      sql.indexOf("IF $current.state = 'submitted'"),
      sql.indexOf('ELSE'),
    );
    expect(submittedBranch).toContain(residentUpdateSurql('report'));
  });
});

describe('toResidentMessage', () => {
  it('never exposes the author', () => {
    const row = {
      id: new RecordId('case_message', 'm1'),
      kind: 'comment',
      body: 'Thanks',
      author: new RecordId('principal', 'op'),
      created_at: new DateTime('2026-10-03T12:00:00Z'),
    } as CaseMessageRow;
    expect(toResidentMessage(row)).toEqual({
      id: 'm1',
      kind: 'comment',
      body: 'Thanks',
      createdAt: '2026-10-03T12:00:00.000Z',
    });
  });
});

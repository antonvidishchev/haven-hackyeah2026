import { Logger } from '@nestjs/common';
import type { SessionPrincipal } from '@haven/shared';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { AuditRepository, AuditWrite } from './audit.repository.js';
import { AuditService } from './audit.service.js';

const operator: SessionPrincipal = { id: 'operator', role: 'operator', name: 'Operator' };

function setup() {
  const repo = { append: vi.fn(async (_write: AuditWrite) => {}), list: vi.fn() };
  const service = new AuditService(repo as unknown as AuditRepository);
  const written = () => repo.append.mock.calls[0]?.[0] as AuditWrite;
  return { repo, service, written };
}

describe('AuditService.record', () => {
  beforeAll(() => Logger.overrideLogger(false));

  it('writes the actor, role, subject and clean meta', async () => {
    const t = setup();
    await t.service.record(operator, 'case.replied', { type: 'haven_case', id: 'c1' }, {
      kind: 'comment',
      bodyLength: 12,
    });
    expect(t.written()).toEqual({
      actorId: 'operator',
      actorRole: 'operator',
      action: 'case.replied',
      subject: { type: 'haven_case', id: 'c1' },
      meta: { kind: 'comment', bodyLength: 12 },
    });
  });

  it('records nobody as anonymous', async () => {
    const t = setup();
    await t.service.record(null, 'auth.login_failed', null, { usernameDigest: 'ab12' });
    expect(t.written()).toMatchObject({ actorId: null, actorRole: 'anonymous', subject: null });
  });

  it('drops free text and flags it, instead of failing a committed change', async () => {
    const t = setup();
    await t.service.record(operator, 'case.replied', null, { body: 'Which tram line?' });
    expect(t.written().meta).toEqual({ metaRejected: true });
  });

  it('does not throw when the write fails', async () => {
    const t = setup();
    t.repo.append.mockRejectedValue(new Error('db down'));
    await expect(t.service.record(operator, 'auth.login', null)).resolves.toBeUndefined();
  });
});

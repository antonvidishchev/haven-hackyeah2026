import { QueryError } from 'surrealdb';
import { describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../config/env.js';
import { SurrealService } from './surreal.service.js';

const notExecuted = new QueryError({
  kind: 'Query',
  message: 'The query was not executed due to a failed transaction',
  details: { kind: 'NotExecuted' },
});
const conflict = new QueryError({
  kind: 'Query',
  message: 'Cannot COMMIT: Transaction conflict: Resource busy. This transaction can be retried',
  details: { kind: 'TransactionConflict' },
});
const invalid = new QueryError({ kind: 'Query', message: 'Found NONE for field `kind`' });

const ok = (result: unknown) => ({ success: true, result });
const failed = (error: unknown) => ({ success: false, error });

/** A service whose queries answer with the given `.responses()` batches, one per attempt. */
function serviceAnswering(...batches: unknown[][]) {
  const service = new SurrealService({} as AppConfig);
  const responses = vi.fn();
  for (const batch of batches) responses.mockResolvedValueOnce(batch);
  vi.spyOn(service.db, 'query').mockReturnValue({ responses } as never);
  return { service, responses };
}

describe('SurrealService.transaction', () => {
  it('returns one result per statement', async () => {
    const { service } = serviceAnswering([ok(null), ok([{ id: 1 }]), ok(1), ok(null)]);
    expect(await service.transaction('BEGIN; …; COMMIT;')).toEqual([null, [{ id: 1 }], 1, null]);
  });

  it('re-runs the script after a transaction conflict on COMMIT', async () => {
    const { service, responses } = serviceAnswering(
      [failed(notExecuted), failed(notExecuted), failed(conflict)],
      [ok(null), ok(1), ok(null)],
    );
    expect(await service.transaction('BEGIN; …; COMMIT;')).toEqual([null, 1, null]);
    expect(responses).toHaveBeenCalledTimes(2);
  });

  it('throws other failures straight away', async () => {
    const { service, responses } = serviceAnswering([failed(invalid), failed(notExecuted)]);
    await expect(service.transaction('BEGIN; …; COMMIT;')).rejects.toBe(invalid);
    expect(responses).toHaveBeenCalledTimes(1);
  });

  it('gives up after four conflicting attempts', async () => {
    const conflicted = [failed(notExecuted), failed(conflict)];
    const { service, responses } = serviceAnswering(conflicted, conflicted, conflicted, conflicted);
    await expect(service.transaction('BEGIN; …; COMMIT;')).rejects.toBe(notExecuted);
    expect(responses).toHaveBeenCalledTimes(4);
  });
});

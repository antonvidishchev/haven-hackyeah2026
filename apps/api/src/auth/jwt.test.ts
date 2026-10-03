import { describe, expect, it } from 'vitest';
import { signSessionToken, verifySessionToken } from './jwt.js';

const secret = 'test-secret-that-is-at-least-32-characters';
const official = {
  id: 'official-police',
  role: 'official' as const,
  name: 'Police Liaison Official',
  organizationId: 'police_municipal' as const,
};

describe('session tokens', () => {
  it('round-trips the principal', async () => {
    const { token, expiresAt } = await signSessionToken(official, secret, 3600);
    expect(await verifySessionToken(token, secret)).toEqual(official);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('omits the organisation for principals without one', async () => {
    const resident = { id: 'resident', role: 'resident' as const, name: 'Local Resident' };
    const { token } = await signSessionToken(resident, secret, 3600);
    expect(await verifySessionToken(token, secret)).toEqual(resident);
  });

  it('rejects a token signed with another secret', async () => {
    const { token } = await signSessionToken(official, secret, 3600);
    expect(await verifySessionToken(token, `${secret}-other`)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const issued = new Date('2026-01-01T00:00:00Z');
    const { token } = await signSessionToken(official, secret, 60, issued);
    expect(await verifySessionToken(token, secret, new Date('2026-01-01T00:02:00Z'))).toBeNull();
  });

  it('rejects garbage', async () => {
    expect(await verifySessionToken('not-a-jwt', secret)).toBeNull();
  });
});

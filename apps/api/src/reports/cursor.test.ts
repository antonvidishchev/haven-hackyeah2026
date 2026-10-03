import { describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor } from './cursor.js';

describe('report cursor', () => {
  it('round-trips, keeping nanosecond timestamps', () => {
    const cursor = { createdAt: '2026-10-03T12:00:00.123456789Z', id: 'abc123' };
    const encoded = encodeCursor(cursor);
    expect(encoded).toMatch(/^[\w-]+$/);
    expect(decodeCursor(encoded)).toEqual(cursor);
  });

  it('rejects anything it did not issue', () => {
    expect(decodeCursor('garbage')).toBeNull();
    expect(decodeCursor(Buffer.from('not-a-date|abc').toString('base64url'))).toBeNull();
    expect(
      decodeCursor(Buffer.from('2026-10-03T12:00:00Z|Bad Id').toString('base64url')),
    ).toBeNull();
  });
});

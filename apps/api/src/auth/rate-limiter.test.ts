import { describe, expect, it } from 'vitest';
import { RateLimiter } from './rate-limiter.js';

describe('RateLimiter', () => {
  it('allows the limit per window, per key, then resets', () => {
    let now = 0;
    const limiter = new RateLimiter(2, 1000, () => now);
    expect([limiter.hit('a'), limiter.hit('a'), limiter.hit('a')]).toEqual([true, true, false]);
    expect(limiter.hit('b')).toBe(true);
    now = 1000;
    expect(limiter.hit('a')).toBe(true);
  });

  it('reports a used-up key as blocked without counting the check', () => {
    let now = 0;
    const limiter = new RateLimiter(2, 1000, () => now);
    expect(limiter.blocked('a')).toBe(false);
    limiter.hit('a');
    expect(limiter.blocked('a')).toBe(false);
    limiter.hit('a');
    expect([limiter.blocked('a'), limiter.blocked('a'), limiter.blocked('b')]).toEqual([
      true,
      true,
      false,
    ]);
    now = 1000;
    expect(limiter.blocked('a')).toBe(false);
  });
});

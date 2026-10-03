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
});

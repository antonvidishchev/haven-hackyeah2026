import { describe, expect, it } from 'vitest';
import { version } from './index.js';

describe('@haven/shared', () => {
  it('exposes a semver version', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

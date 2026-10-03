import { describe, expect, it } from 'vitest';

import { formatBytes, fromLocalInput, toLocalInput } from './datetime';

describe('datetime-local conversion', () => {
  it('round-trips through local time', () => {
    const iso = fromLocalInput('2026-10-02T18:45');
    expect(iso).not.toBeNull();
    expect(toLocalInput(iso)).toBe('2026-10-02T18:45');
  });

  it('treats empty and invalid values as unset', () => {
    expect(fromLocalInput('')).toBeNull();
    expect(fromLocalInput('not a date')).toBeNull();
    expect(toLocalInput(null)).toBe('');
    expect(toLocalInput('nonsense')).toBe('');
  });
});

describe('formatBytes', () => {
  it('picks a readable unit', () => {
    expect(formatBytes(512, 'en')).toBe('512 byte');
    expect(formatBytes(819_200, 'en')).toBe('800 kB');
    expect(formatBytes(104_857_600, 'en')).toBe('100 MB');
  });
});

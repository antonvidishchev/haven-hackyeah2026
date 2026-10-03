import { describe, expect, it } from 'vitest';
import { inlineDisposition, parseRange } from './range.js';

describe('parseRange', () => {
  it('serves the whole file without a usable header', () => {
    expect(parseRange(undefined, 100)).toBeNull();
    expect(parseRange('items=0-1', 100)).toBeNull();
    expect(parseRange('bytes=-', 100)).toBeNull();
    expect(parseRange('bytes=5-2', 100)).toBeNull();
    expect(parseRange('bytes=0-1,4-5', 100)).toBeNull();
  });

  it('reads closed, open-ended and suffix ranges', () => {
    expect(parseRange('bytes=0-9', 100)).toEqual({ start: 0, end: 9 });
    expect(parseRange('bytes=90-', 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange('bytes=-10', 100)).toEqual({ start: 90, end: 99 });
  });

  it('clamps to the end of the file', () => {
    expect(parseRange('bytes=50-500', 100)).toEqual({ start: 50, end: 99 });
    expect(parseRange('bytes=-500', 100)).toEqual({ start: 0, end: 99 });
  });

  it('flags ranges that start past the end', () => {
    expect(parseRange('bytes=100-', 100)).toBe('unsatisfiable');
    expect(parseRange('bytes=100-200', 100)).toBe('unsatisfiable');
    expect(parseRange('bytes=-0', 100)).toBe('unsatisfiable');
  });
});

describe('inlineDisposition', () => {
  it('percent-encodes the name, including RFC 5987 reserved characters', () => {
    expect(inlineDisposition("zdjęcie (1)'s.png")).toBe(
      "inline; filename*=UTF-8''zdj%C4%99cie%20%281%29%27s.png",
    );
  });
});

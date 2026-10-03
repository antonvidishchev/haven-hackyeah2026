import { describe, expect, it, vi } from 'vitest';

vi.mock('react-leaflet', () => ({}));
vi.mock('leaflet/dist/leaflet.css', () => ({}));

const { shadeLevel } = await import('./district-map');

describe('shadeLevel', () => {
  it('is 0 for suppressed districts', () => {
    expect(shadeLevel(null, 10)).toBe(0);
  });

  it('scales by count / max into 1–5', () => {
    expect(shadeLevel(10, 10)).toBe(5);
    expect(shadeLevel(3, 10)).toBe(2);
    expect(shadeLevel(1, 100)).toBe(1);
  });
});

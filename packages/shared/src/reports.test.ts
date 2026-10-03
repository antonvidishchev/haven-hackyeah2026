import { describe, expect, it } from 'vitest';

import { findDistrict, inPolygon, KRAKOW_CENTER, type Position } from './geometry.js';
import {
  assertEditableChange,
  canSubmitReport,
  emptyReportFields,
  filingGaps,
  formatReportReference,
  linkEmergency,
  LockedFieldError,
  reportFieldsSchema,
  reportTimeline,
} from './reports.js';
import { evidenceKind, safeFileName, validateEvidence } from './evidence.js';

describe('findDistrict', () => {
  it('places the Main Market Square in I Stare Miasto', () => {
    expect(findDistrict(KRAKOW_CENTER)).toBe('I');
  });

  it('places Plac Centralny in XVIII Nowa Huta', () => {
    expect(findDistrict({ lat: 50.0716, lng: 20.0376 })).toBe('XVIII');
  });

  it('returns null outside Kraków', () => {
    expect(findDistrict({ lat: 52.2297, lng: 21.0122 })).toBeNull(); // Warsaw
  });

  it('respects holes', () => {
    const square = (min: number, max: number): Position[] => [
      [min, min],
      [max, min],
      [max, max],
      [min, max],
      [min, min],
    ];
    const donut = [square(0, 10), square(4, 6)];
    expect(inPolygon({ lat: 2, lng: 2 }, donut)).toBe(true);
    expect(inPolygon({ lat: 5, lng: 5 }, donut)).toBe(false);
  });
});

describe('report fields', () => {
  it('lets a draft be empty', () => {
    expect(emptyReportFields()).toMatchObject({ category: 'unclassified', severity: null });
  });

  it('enforces the emergency and weapon invariant', () => {
    const base = emptyReportFields();
    expect(reportFieldsSchema.safeParse({ ...base, severity: 'emergency' }).success).toBe(false);
    expect(reportFieldsSchema.safeParse({ ...base, weaponOrImmediateThreat: true }).success).toBe(
      false,
    );
    expect(
      reportFieldsSchema.safeParse({
        ...base,
        severity: 'emergency',
        weaponOrImmediateThreat: true,
      }).success,
    ).toBe(true);
  });

  it('links emergency and weapon both ways', () => {
    const base = emptyReportFields();
    expect(linkEmergency(base, { severity: 'emergency' }).weaponOrImmediateThreat).toBe(true);
    const ticked = linkEmergency(base, { weaponOrImmediateThreat: true });
    expect(ticked.severity).toBe('emergency');
    expect(linkEmergency(ticked, { weaponOrImmediateThreat: false }).severity).toBe('high');
    expect(linkEmergency(ticked, { severity: 'low' }).weaponOrImmediateThreat).toBe(false);
  });
});

describe('filing gaps', () => {
  const base = emptyReportFields();

  it('lists everything an empty draft lacks', () => {
    expect(filingGaps(base, 0)).toEqual(['district', 'place', 'details']);
  });

  it('accepts a place description instead of a pin, and evidence instead of a description', () => {
    const fields = { ...base, zoneId: 'I' as const, locationLabel: 'between Długa and Basztowa' };
    expect(filingGaps(fields, 0)).toEqual(['details']);
    expect(canSubmitReport(fields, 1)).toBe(true);
  });

  it('accepts a pin and a description', () => {
    const fields = {
      ...base,
      zoneId: 'I' as const,
      location: KRAKOW_CENTER,
      description: 'Shouting at the tram stop',
    };
    expect(canSubmitReport(fields, 0)).toBe(true);
  });

  it('ignores whitespace-only text', () => {
    expect(filingGaps({ ...base, zoneId: 'I', locationLabel: '  ', description: ' ' }, 0)).toEqual([
      'place',
      'details',
    ]);
  });
});

describe('assertEditableChange', () => {
  const before = emptyReportFields();

  it('allows any change to a draft', () => {
    expect(() =>
      assertEditableChange('draft', before, { ...before, isRepeatIncident: true }),
    ).not.toThrow();
  });

  it('locks severity, weapon and repeat after filing', () => {
    const after = { ...before, severity: 'high' as const, isRepeatIncident: true };
    expect(() => assertEditableChange('submitted', before, after)).toThrow(LockedFieldError);
    try {
      assertEditableChange('submitted', before, after);
    } catch (error) {
      expect((error as LockedFieldError).fields).toEqual(['severity', 'isRepeatIncident']);
    }
  });

  it('still allows the description to change after filing', () => {
    expect(() =>
      assertEditableChange('submitted', before, { ...before, description: 'More detail' }),
    ).not.toThrow();
  });
});

describe('reportTimeline', () => {
  it('collapses consecutive edits and lists newest first', () => {
    const events = reportTimeline([
      { revision: 1, note: 'created', createdAt: 't1' },
      { revision: 2, note: 'edited', createdAt: 't2' },
      { revision: 3, note: 'edited', createdAt: 't3' },
      { revision: 4, note: 'evidence_added', createdAt: 't4' },
    ]);
    expect(events).toEqual([
      { kind: 'evidence_added', revision: 4, at: 't4' },
      { kind: 'edited', revision: 3, at: 't3' },
      { kind: 'created', revision: 1, at: 't1' },
    ]);
  });
});

describe('evidence rules', () => {
  it('accepts images, audio and video only', () => {
    expect(evidenceKind('image/jpeg')).toBe('image');
    expect(evidenceKind('audio/mp4')).toBe('audio');
    expect(evidenceKind('video/quicktime')).toBe('video');
    expect(evidenceKind('application/pdf')).toBeNull();
    expect(evidenceKind('image/svg+xml')).toBeNull();
    expect(evidenceKind('image/svg+xml; charset=utf-8')).toBeNull();
  });

  it('checks size limits', () => {
    expect(validateEvidence({ mediaType: 'image/png', byteSize: 10 }, 100)).toBeNull();
    expect(validateEvidence({ mediaType: 'image/png', byteSize: 0 }, 100)).toBe('empty');
    expect(validateEvidence({ mediaType: 'image/png', byteSize: 101 }, 100)).toBe('too_large');
    expect(validateEvidence({ mediaType: 'text/html', byteSize: 10 }, 100)).toBe('type');
  });

  it('strips paths and control characters from file names', () => {
    expect(safeFileName('C:\\Users\\me\\photo.jpg')).toBe('photo.jpg');
    expect(safeFileName('../../etc/passwd')).toBe('passwd');
    expect(safeFileName('a\u0000b.png')).toBe('ab.png');
    expect(safeFileName('')).toBe('evidence');
  });
});

it('formats references', () => {
  expect(formatReportReference(2026, 42)).toBe('HV-2026-000042');
});

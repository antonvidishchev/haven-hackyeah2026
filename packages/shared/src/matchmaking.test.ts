import { describe, expect, it } from 'vitest';

import {
  foldText,
  matchSupportResources,
  scoreResource,
  type SupportResource,
} from './matchmaking.js';

/** Mirrors the `haven_text` analyzer: folded words, edge n-grams of 3 to 12 characters. */
const terms = (text: string) =>
  new Set(
    foldText(text)
      .split(/[^a-z0-9]+/)
      .flatMap((word) =>
        Array.from({ length: Math.min(word.length, 12) - 2 }, (_, i) => word.slice(0, i + 3)),
      ),
  );

const resource = (slug: string, overrides: Partial<SupportResource> = {}): SupportResource => ({
  slug,
  kind: 'victim_support',
  name: { en: `${slug} (fictional)`, pl: `${slug} (fikcyjne)` },
  description: { en: 'Help', pl: 'Pomoc' },
  categories: [],
  districts: ['XVIII'],
  languages: ['pl'],
  severities: [],
  keywords: { en: [], pl: [] },
  contact: 'help@example.org',
  availableHours: { en: 'Mon–Fri', pl: 'pn.–pt.' },
  ...overrides,
});

const report = {
  category: 'verbal_harassment',
  zoneId: 'I',
  severity: 'low',
  weaponOrImmediateThreat: false,
} as const;

describe('scoreResource', () => {
  it('adds category, district, keywords and severity, with a reason for each', () => {
    const tram = resource('tram-desk', {
      categories: ['verbal_harassment'],
      districts: ['I'],
      severities: ['low', 'medium'],
      keywords: { en: ['tram', 'bus'], pl: ['tramwaj', 'przystanek'] },
    });
    expect(scoreResource(report, terms('Shouted at in the tramwaju near the stop'), tram)).toEqual({
      score: 3 + 2 + 2 + 1,
      reasons: [
        { type: 'category', value: 'verbal_harassment' },
        { type: 'district', value: 'I' },
        { type: 'keyword', value: 'tram' },
        { type: 'keyword', value: 'tramwaj' },
        { type: 'severity', value: 'low' },
      ],
    });
  });

  it('gives a citywide resource one point for place', () => {
    expect(scoreResource(report, terms(''), resource('city', { districts: [] }))).toEqual({
      score: 1,
      reasons: [{ type: 'citywide' }],
    });
  });

  it('caps keywords at three and counts a keyword once across languages', () => {
    const many = resource('many', {
      keywords: { en: ['tram', 'bus', 'night', 'stop'], pl: ['tram'] },
    });
    const { score, reasons } = scoreResource(report, terms('tram bus night stop'), many);
    expect(score).toBe(3);
    expect(reasons.map((r) => (r.type === 'keyword' ? r.value : r.type))).toEqual([
      'tram',
      'bus',
      'night',
    ]);
  });

  it('matches keywords without diacritics', () => {
    const pl = resource('pl', { keywords: { en: [], pl: ['groźby', 'łódź'] } });
    expect(scoreResource(report, terms('Dostaję GROZBY, mieszkam w Lodzi'), pl).score).toBe(2);
  });
});

describe('matchSupportResources', () => {
  const resources = [
    resource('b-category', { categories: ['verbal_harassment'] }),
    resource('a-category', { categories: ['verbal_harassment'] }),
    resource('city-only', { districts: [] }),
    resource('best', { categories: ['verbal_harassment'], districts: ['I'] }),
    ...['c', 'd', 'e', 'f'].map((s) => resource(s, { categories: ['verbal_harassment'] })),
  ];

  it('ranks by score then slug, drops weak matches and keeps five', () => {
    const result = matchSupportResources(report, terms('tram'), resources);
    expect(result.emergency).toBe(false);
    expect(result.items.map((m) => m.resource.slug)).toEqual([
      'best',
      'a-category',
      'b-category',
      'c',
      'd',
    ]);
    expect(result.items[0]?.score).toBe(5);
    expect(result.items[0]?.resource).not.toHaveProperty('keywords');
  });

  it('flags emergencies for the 112 notice', () => {
    expect(matchSupportResources({ ...report, severity: 'emergency' }, [], []).emergency).toBe(
      true,
    );
    expect(
      matchSupportResources({ ...report, weaponOrImmediateThreat: true }, [], []).emergency,
    ).toBe(true);
  });
});

import type { DistrictId, ReportCategory, Severity, SupportResourceKind } from './enums.js';
import type { Locale } from './i18n/index.js';
import type { ReportFields } from './reports.js';

type Localized = Record<Locale, string>;

/** A fictional city resource a resident can be pointed to. */
export type SupportResource = {
  slug: string;
  kind: SupportResourceKind;
  name: Localized;
  description: Localized;
  categories: ReportCategory[];
  /** Empty means citywide. */
  districts: DistrictId[];
  languages: string[];
  severities: Severity[];
  keywords: Record<Locale, string[]>;
  contact: string;
  availableHours: Localized;
};

export type MatchReason =
  | { type: 'category'; value: ReportCategory }
  | { type: 'district'; value: DistrictId }
  | { type: 'citywide' }
  | { type: 'keyword'; value: string }
  | { type: 'severity'; value: Severity };

export type SupportMatch = {
  resource: Omit<SupportResource, 'keywords' | 'categories' | 'districts' | 'severities'>;
  score: number;
  reasons: MatchReason[];
};

export type SupportMatchesResponse = {
  /** Show the 112 notice above the matches. */
  emergency: boolean;
  items: SupportMatch[];
};

export const MATCH_LIMIT = 5;
/** Below this a resource is too loosely related to suggest (a citywide line alone scores 1). */
export const MIN_MATCH_SCORE = 3;
const KEYWORD_CAP = 3;

/** Lowercase without diacritics, the same folding as the `haven_text` analyzer. */
export const foldText = (text: string) =>
  text.toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/\p{M}/gu, '');

/**
 * Scores one resource for a report. `terms` are the description's analysed terms (folded
 * edge n-grams from the `haven_text` analyzer), so the keyword "tram" matches "tramwaju".
 */
export function scoreResource(
  fields: Pick<ReportFields, 'category' | 'zoneId' | 'severity'>,
  terms: ReadonlySet<string>,
  resource: SupportResource,
): { score: number; reasons: MatchReason[] } {
  const reasons: MatchReason[] = [];
  let score = 0;
  if (resource.categories.includes(fields.category)) {
    score += 3;
    reasons.push({ type: 'category', value: fields.category });
  }
  if (resource.districts.length === 0) {
    score += 1;
    reasons.push({ type: 'citywide' });
  } else if (fields.zoneId && resource.districts.includes(fields.zoneId)) {
    score += 2;
    reasons.push({ type: 'district', value: fields.zoneId });
  }
  const seen = new Set<string>();
  let keywordPoints = 0;
  for (const keyword of [...resource.keywords.en, ...resource.keywords.pl]) {
    const folded = foldText(keyword);
    if (keywordPoints === KEYWORD_CAP || seen.has(folded) || !terms.has(folded)) continue;
    seen.add(folded);
    keywordPoints += 1;
    reasons.push({ type: 'keyword', value: keyword });
  }
  score += keywordPoints;
  if (fields.severity && resource.severities.includes(fields.severity)) {
    score += 1;
    reasons.push({ type: 'severity', value: fields.severity });
  }
  return { score, reasons };
}

/** The best few resources for a report, highest score first, ties by slug. */
export function matchSupportResources(
  fields: Pick<ReportFields, 'category' | 'zoneId' | 'severity' | 'weaponOrImmediateThreat'>,
  terms: Iterable<string>,
  resources: readonly SupportResource[],
): SupportMatchesResponse {
  const termSet = new Set(terms);
  const items = resources
    .map((resource) => ({ resource, ...scoreResource(fields, termSet, resource) }))
    .filter((match) => match.score >= MIN_MATCH_SCORE)
    .sort((a, b) => b.score - a.score || a.resource.slug.localeCompare(b.resource.slug))
    .slice(0, MATCH_LIMIT)
    .map(({ resource, score, reasons }) => {
      const {
        keywords: _keywords,
        categories: _categories,
        districts: _districts,
        severities: _severities,
        ...view
      } = resource;
      return { resource: view, score, reasons };
    });
  return {
    emergency: fields.severity === 'emergency' || fields.weaponOrImmediateThreat,
    items,
  };
}

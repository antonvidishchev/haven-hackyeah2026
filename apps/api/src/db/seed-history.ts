import { RecordId } from 'surrealdb';
import {
  findDistrict,
  krakowDistricts,
  reportFieldsSchema,
  type DistrictId,
  type ExternalActionType,
  type ReportCategory,
  type ReportFields,
  type Severity,
} from '@haven/shared';
import { principalRecord } from '../auth/principal.repository.js';
import { planFiling } from '../cases/routing.js';
import type { QueryFn } from './migrations.js';
import { SEED_OWNER } from './seed-reports.js';
import { replaySteps, type ShowcaseStep } from './seed-showcase.js';

type HistoryCategory = Exclude<ReportCategory, 'unclassified'>;

/**
 * Reports per district and incident type, so each filter on Area reports shows its own picture:
 * verbal harassment along the central tram lines, discrimination where students rent, hate
 * symbols and intimidation on the eastern estates. All fictional.
 *
 * III Prądnik Czerwony gets no verbal harassment, so with its seed reports it stays at 15 with
 * that filter below the privacy threshold; XVII stays below it overall. The e2e suite checks both.
 */
const profile: Record<DistrictId, Partial<Record<HistoryCategory, number>>> = {
  I: {
    verbal_harassment: 24,
    physical_intimidation: 6,
    threat: 4,
    discrimination: 6,
    vandalism_hate_symbols: 4,
    other: 3,
  },
  II: {
    verbal_harassment: 12,
    physical_intimidation: 3,
    threat: 2,
    discrimination: 12,
    vandalism_hate_symbols: 2,
    other: 1,
  },
  III: {
    physical_intimidation: 2,
    threat: 2,
    discrimination: 3,
    vandalism_hate_symbols: 4,
    other: 1,
  },
  IV: {
    verbal_harassment: 6,
    physical_intimidation: 3,
    threat: 6,
    discrimination: 3,
    vandalism_hate_symbols: 2,
    other: 1,
  },
  V: {
    verbal_harassment: 7,
    physical_intimidation: 2,
    threat: 1,
    discrimination: 10,
    vandalism_hate_symbols: 1,
    other: 2,
  },
  VI: {
    verbal_harassment: 3,
    physical_intimidation: 1,
    threat: 1,
    discrimination: 4,
    vandalism_hate_symbols: 2,
  },
  VII: { verbal_harassment: 2, discrimination: 1, vandalism_hate_symbols: 2, other: 1 },
  VIII: {
    verbal_harassment: 4,
    physical_intimidation: 2,
    threat: 1,
    discrimination: 6,
    vandalism_hate_symbols: 5,
    other: 1,
  },
  IX: {
    verbal_harassment: 1,
    physical_intimidation: 1,
    discrimination: 1,
    vandalism_hate_symbols: 2,
  },
  X: { verbal_harassment: 1, threat: 1, vandalism_hate_symbols: 2 },
  XI: {
    verbal_harassment: 3,
    physical_intimidation: 3,
    threat: 4,
    discrimination: 2,
    vandalism_hate_symbols: 6,
    other: 1,
  },
  XII: {
    verbal_harassment: 2,
    physical_intimidation: 4,
    threat: 2,
    discrimination: 1,
    vandalism_hate_symbols: 6,
    other: 1,
  },
  XIII: {
    verbal_harassment: 10,
    physical_intimidation: 3,
    threat: 2,
    discrimination: 6,
    vandalism_hate_symbols: 6,
    other: 2,
  },
  XIV: {
    verbal_harassment: 3,
    physical_intimidation: 2,
    threat: 1,
    discrimination: 2,
    vandalism_hate_symbols: 3,
  },
  XV: {
    verbal_harassment: 2,
    physical_intimidation: 5,
    threat: 3,
    discrimination: 1,
    vandalism_hate_symbols: 9,
    other: 1,
  },
  XVI: {
    verbal_harassment: 2,
    physical_intimidation: 4,
    threat: 2,
    discrimination: 1,
    vandalism_hate_symbols: 8,
  },
  XVII: { verbal_harassment: 1, vandalism_hate_symbols: 1 },
  XVIII: {
    verbal_harassment: 3,
    physical_intimidation: 5,
    threat: 4,
    discrimination: 2,
    vandalism_hate_symbols: 10,
    other: 1,
  },
};

/** What happened, where, and how a partner organisation followed it up. */
const stories: Record<
  HistoryCategory,
  {
    severities: Severity[];
    incidents: [description: string, place: string][];
    action: ExternalActionType;
    note: string;
    outcome: string;
  }
> = {
  verbal_harassment: {
    severities: ['low', 'low', 'low', 'medium'],
    incidents: [
      ['a passenger shouted insults about my accent on the tram', 'Tram stop'],
      ['a man mocked my language while I was paying in a shop', 'Corner shop'],
      ['teenagers shouted slurs at my children in the park', 'Neighbourhood park'],
      ['a driver yelled abuse at me on the bus because I spoke Ukrainian', 'Bus line'],
      ['someone kept insulting me while I waited at the stop', 'Bus stop'],
    ],
    action: 'phone_call',
    note: 'Called the resident, listened and explained the support available.',
    outcome: 'Resident supported and given contacts for next time.',
  },
  physical_intimidation: {
    severities: ['medium', 'medium', 'high'],
    incidents: [
      ['a group blocked my way and followed me to my building', 'Estate walkway'],
      ['a man stood over me and pushed my shopping trolley away', 'Supermarket car park'],
      ['two men followed me from the stop and filmed me', 'Path from the tram stop'],
    ],
    action: 'meeting',
    note: 'Met the resident and agreed a safety plan for the route home.',
    outcome: 'Safety plan in place; resident referred to local support.',
  },
  threat: {
    severities: ['medium', 'high'],
    incidents: [
      ['a neighbour said he would hurt my family if we stayed', 'Block entrance'],
      ['a note threatening us was left on our door', 'Apartment building'],
    ],
    action: 'referral',
    note: 'Referred the resident to legal aid and explained how to report to the police.',
    outcome: 'Resident referred to legal aid and supported through reporting.',
  },
  discrimination: {
    severities: ['low', 'medium', 'medium'],
    incidents: [
      ['a landlord refused to rent to me after hearing my name', 'Rental viewing'],
      ['I was refused service in a café because of where I am from', 'Café'],
      ['a clinic receptionist would not register me because of my accent', 'Clinic reception'],
    ],
    action: 'referral',
    note: 'Referred the resident to the equal treatment advice service.',
    outcome: 'Resident advised on their rights and how to complain.',
  },
  vandalism_hate_symbols: {
    severities: ['low', 'medium', 'medium'],
    incidents: [
      ['hate symbols were sprayed on a wall by the playground', 'Playground wall'],
      ['an anti-immigrant slogan was painted on a bus shelter', 'Bus shelter'],
      ['stickers with hate symbols were put up around the stairwell', 'Stairwell'],
    ],
    action: 'site_visit',
    note: 'Visited the spot with the district council and arranged removal.',
    outcome: 'Symbols removed by the district.',
  },
  other: {
    severities: ['low'],
    incidents: [
      ['people kept making comments about my headscarf outside the school', 'School gate'],
      ['someone photographed me and my friends and laughed at us', 'Shopping street'],
    ],
    action: 'phone_call',
    note: 'Called the resident and talked through what happened.',
    outcome: 'Resident supported; no further action wanted.',
  },
};

/** mulberry32: a tiny seeded generator, so every run seeds the same history. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(next: () => number, items: T[]) => items[Math.floor(next() * items.length)]!;

/** A point inside the district, by rejection sampling its bounding box. */
function pointIn(zoneId: DistrictId, next: () => number) {
  const feature = krakowDistricts.features.find((f) => f.properties.id === zoneId)!;
  const positions = feature.geometry.coordinates.flat(2);
  const lngs = positions.map(([lng]) => lng);
  const lats = positions.map(([, lat]) => lat);
  const [minLng, maxLng, minLat, maxLat] = [
    Math.min(...lngs),
    Math.max(...lngs),
    Math.min(...lats),
    Math.max(...lats),
  ];
  for (;;) {
    const point = {
      lat: Number((minLat + next() * (maxLat - minLat)).toFixed(4)),
      lng: Number((minLng + next() * (maxLng - minLng)).toFixed(4)),
    };
    if (findDistrict(point) === zoneId) return point;
  }
}

const HOUR = 3_600_000;
// January to mid-September 2026, before the showcase reports.
const FROM = Date.parse('2026-01-05T00:00:00Z');
const TO = Date.parse('2026-09-15T00:00:00Z');

export type HistoryReport = {
  id: string;
  filedAt: string;
  fields: Partial<ReportFields>;
  steps: ShowcaseStep[];
};

/** The history, oldest first, each case taken by its organisation and closed. */
export function historyReports(): HistoryReport[] {
  const next = random(2026);
  const reports: Omit<HistoryReport, 'id'>[] = [];
  for (const [zoneId, counts] of Object.entries(profile) as [DistrictId, typeof profile.I][]) {
    for (const [category, count] of Object.entries(counts) as [HistoryCategory, number][]) {
      const story = stories[category];
      for (let i = 0; i < count; i += 1) {
        const filed = FROM + Math.floor(next() * (TO - FROM));
        const [description, place] = pick(next, story.incidents);
        const fields = {
          category,
          severity: pick(next, story.severities),
          description: `Fictional history: ${description}.`,
          location: pointIn(zoneId, next),
          locationLabel: `${place} (fictional)`,
          zoneId,
        } satisfies Partial<ReportFields>;
        const to = planFiling(reportFieldsSchema.parse(fields), 0, 'local').result.responder;
        const at = (hours: number) => new Date(filed + hours * HOUR).toISOString();
        reports.push({
          filedAt: at(0),
          fields,
          steps: [
            {
              at: at(3 + next() * 20),
              type: 'promote',
              to,
              followed: to === 'community_volunteer',
              reason: 'Confirmed the routing after reading the report.',
            },
            { at: at(30), type: 'claim' },
            { at: at(50), type: 'external_action', action: story.action, note: story.note },
            { at: at(120 + next() * 200), type: 'close', comment: story.outcome },
          ],
        });
      }
    }
  }
  return reports
    .sort((a, b) => a.filedAt.localeCompare(b.filedAt))
    .map((report, index) => ({ id: `hist${String(index + 1).padStart(3, '0')}`, ...report }));
}

/**
 * Files the history once per report, with references in filing order, and replays each case to
 * its close, so Area reports looks like a city after nine months of use.
 */
export async function seedHistoryReports(query: QueryFn): Promise<number> {
  let created = 0;
  for (const report of historyReports()) {
    const fields = reportFieldsSchema.parse(report.fields);
    const plan = planFiling(fields, 0, 'local');
    const id = new RecordId('report', report.id);
    const caseId = new RecordId('haven_case', report.id);
    const recommendationId = new RecordId('recommendation', report.id);
    const filedAt = new Date(report.filedAt);
    const replay = replaySteps(
      caseId,
      plan.result.responder,
      { id: recommendationId, action: plan.recommendation!.action },
      report.steps,
    );
    const results = await query(
      `BEGIN TRANSACTION;
       LET $exists = record::exists($id);
       IF !$exists {
         CREATE $id CONTENT {
           owner: $owner, state: 'submitted', current_revision: 1, fields: $fields,
           zone_id: $fields.zoneId, submitted_at: $filed_at, created_at: $filed_at,
           updated_at: $filed_at, reference: fn::next_report_reference(time::year($filed_at))
         };
         CREATE report_revision CONTENT {
           report: $id, revision: 1, fields: $fields, note: 'filed', author: $owner,
           created_at: $filed_at
         };
         CREATE $decision CONTENT {
           report: $id, rule_id: $result.ruleId, ruleset_version: $result.rulesetVersion,
           ruleset_digest: $digest, input_snapshot: $input, result: $result, created_at: $filed_at
         };
         CREATE $recommendation CONTENT {
           report: $id, action: $rec.action, status: $rec.status,
           confidence: <float>$rec.confidence, rationale: $rec.rationale, source: $rec.source,
           input_hash: $rec.inputHash, output_hash: $rec.outputHash, created_at: $filed_at
         };
         CREATE $case CONTENT $case_row;
         FOR $action IN $actions { CREATE case_action CONTENT $action; };
       };
       RETURN !$exists;
       COMMIT TRANSACTION;`,
      {
        id,
        owner: principalRecord(SEED_OWNER),
        fields,
        filed_at: filedAt,
        decision: new RecordId('routing_decision', report.id),
        case: caseId,
        recommendation: recommendationId,
        rec: plan.recommendation,
        input: plan.input,
        result: plan.result,
        digest: plan.rulesetDigest,
        case_row: {
          report: id,
          routing_decision: new RecordId('routing_decision', report.id),
          queue_priority: plan.result.queue,
          ...replay.row,
          created_at: filedAt,
          updated_at: new Date(report.steps.at(-1)!.at),
        },
        actions: replay.actions,
      },
    );
    if ((results as unknown[]).at(-2) === true) created++;
  }
  return created;
}

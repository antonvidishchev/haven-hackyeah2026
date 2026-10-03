import { RecordId } from 'surrealdb';
import { reportFieldsSchema, type ReportFields } from '@haven/shared';
import { principalRecord } from '../auth/principal.repository.js';
import { planFiling } from '../cases/routing.js';
import type { QueryFn } from './migrations.js';

/** Owner of the fictional seed reports. It has no username, so nobody can sign in as it. */
export const SEED_OWNER = 'seedresident';

type SeedReport = { id: string; reference: string; filedAt: string; fields: Partial<ReportFields> };

/** Filed, fictional reports so Area reports has a district above the privacy threshold. */
export const seedReports: SeedReport[] = [
  {
    id: 'seedprc1',
    reference: 'HV-2025-000001',
    filedAt: '2025-11-04T17:20:00Z',
    fields: {
      category: 'verbal_harassment',
      severity: 'low',
      description: 'Fictional seed report: insults shouted at a bus stop.',
      locationLabel: 'Bus stop near Dobrego Pasterza (fictional)',
    },
  },
  {
    id: 'seedprc2',
    reference: 'HV-2025-000002',
    filedAt: '2025-11-19T08:05:00Z',
    fields: {
      category: 'vandalism_hate_symbols',
      severity: 'medium',
      description: 'Fictional seed report: hate graffiti on a playground wall.',
      locationLabel: 'Playground on Majora (fictional)',
    },
  },
  {
    id: 'seedprc3',
    reference: 'HV-2025-000003',
    filedAt: '2025-12-02T21:40:00Z',
    fields: {
      category: 'discrimination',
      severity: 'low',
      description: 'Fictional seed report: refused entry to a shop because of an accent.',
      locationLabel: 'Shop on Dukatów (fictional)',
    },
  },
];

/**
 * Creates the seed reports with their revision, routing decision and case, once each. Existing
 * ones are left as they are: routing decisions are immutable, and demos may have moved the case.
 */
export async function seedReportsFixtures(query: QueryFn): Promise<number> {
  await query('UPSERT $id MERGE $data', {
    id: principalRecord(SEED_OWNER),
    data: { kind: 'resident', display_name: 'Fictional seed resident' },
  });
  let created = 0;
  for (const report of seedReports) {
    const fields = reportFieldsSchema.parse({ zoneId: 'III', ...report.fields });
    const plan = planFiling(fields, 0, 'disabled');
    const results = await query(
      `BEGIN TRANSACTION;
       LET $exists = record::exists($id);
       IF !$exists {
         CREATE $id CONTENT {
           owner: $owner, reference: $reference, state: 'submitted', current_revision: 1,
           fields: $fields, zone_id: $fields.zoneId, submitted_at: $at, created_at: $at,
           updated_at: $at
         };
         CREATE report_revision CONTENT {
           report: $id, revision: 1, fields: $fields, note: 'filed', author: $owner
         };
         CREATE $decision CONTENT {
           report: $id, rule_id: $result.ruleId, ruleset_version: $result.rulesetVersion,
           ruleset_digest: $digest, input_snapshot: $input, result: $result
         };
         CREATE $case CONTENT {
           report: $id, routing_decision: $decision, organization_id: $result.responder,
           state: 'open', triage_status: 'needs_review', queue_priority: $result.queue,
           version: 1, created_at: $at, updated_at: $at
         };
       };
       RETURN !$exists;
       COMMIT TRANSACTION;`,
      {
        id: new RecordId('report', report.id),
        decision: new RecordId('routing_decision', report.id),
        case: new RecordId('haven_case', report.id),
        owner: principalRecord(SEED_OWNER),
        reference: report.reference,
        at: new Date(report.filedAt),
        fields,
        input: plan.input,
        result: plan.result,
        digest: plan.rulesetDigest,
      },
    );
    if ((results as unknown[]).at(-2) === true) created++;
  }
  return created;
}

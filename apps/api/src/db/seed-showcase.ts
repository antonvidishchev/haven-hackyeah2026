import { RecordId } from 'surrealdb';
import {
  CANCELLATION_NOTICE,
  decisionDisposition,
  demoAccounts,
  nextCaseStatus,
  reportFieldsSchema,
  type CancelReason,
  type CaseEvent,
  type CaseStatus,
  type ExternalActionType,
  type OperatorDecision,
  type OrganizationId,
  type ReplyKind,
  type ReportFields,
} from '@haven/shared';
import { principalRecord } from '../auth/principal.repository.js';
import { planFiling } from '../cases/routing.js';
import type { QueryFn } from './migrations.js';
import { SEED_OWNER } from './seed-reports.js';

/** A staff action on a showcase case, replayed through the real case rules. */
export type ShowcaseStep = { at: string } & (
  | { type: 'reply'; kind: ReplyKind; body: string; followed?: boolean }
  | { type: 'promote'; to: OrganizationId; reason: string; followed?: boolean }
  | { type: 'cancel'; reason: CancelReason; comment: string }
  | { type: 'claim' }
  | { type: 'external_action'; action: ExternalActionType; note: string }
  | { type: 'close'; comment: string }
);

export type ShowcaseReport = {
  id: string;
  /** A demo username, or the fictional seed resident nobody can sign in as. */
  owner: string;
  createdAt: string;
  /** Unset for a draft. */
  filedAt?: string;
  fields: Partial<ReportFields>;
  steps?: ShowcaseStep[];
};

/**
 * Fictional reports in every state the demo walks through. They avoid III Prądnik Czerwony,
 * XIII Podgórze and XVII Wzgórza Krzesławickie, whose public counts the e2e suite checks.
 */
export const showcaseReports: ShowcaseReport[] = [
  {
    id: 'showdraft',
    owner: 'resident',
    createdAt: '2026-10-02T18:10:00Z',
    fields: {
      category: 'verbal_harassment',
      description: 'Fictional showcase: a man kept shouting at a family on the tram.',
      location: { lat: 50.0617, lng: 19.9373 },
      zoneId: 'I',
    },
  },
  {
    id: 'showreview',
    owner: SEED_OWNER,
    createdAt: '2026-10-01T16:40:00Z',
    filedAt: '2026-10-01T16:52:00Z',
    fields: {
      category: 'verbal_harassment',
      severity: 'low',
      eventTime: '2026-10-01T16:30:00.000Z',
      description:
        'Fictional showcase: insults about my accent on tram 8 between Teatr Bagatela and Plac Wszystkich Świętych.',
      location: { lat: 50.0637, lng: 19.9325 },
      locationLabel: 'Tram 8, Teatr Bagatela stop (fictional)',
      zoneId: 'I',
    },
  },
  {
    id: 'showawait',
    owner: 'resident',
    createdAt: '2026-09-29T07:55:00Z',
    filedAt: '2026-09-29T08:05:00Z',
    fields: {
      category: 'discrimination',
      severity: 'medium',
      eventTime: '2026-09-28T19:00:00.000Z',
      description:
        'Fictional showcase: a landlord refused to show me a flat after hearing my name. I have a recording of the call.',
      locationLabel: 'Rental viewing near Rondo Grzegórzeckie (fictional)',
      location: { lat: 50.056, lng: 19.96 },
      zoneId: 'II',
    },
    steps: [
      {
        at: '2026-09-29T09:30:00Z',
        type: 'reply',
        kind: 'request_information',
        followed: true,
        body: 'Thank you for telling us. You mention a recording of the call: if you feel able to, please add it to the report. Only Haven staff can open it.',
      },
    ],
  },
  {
    id: 'showemerg',
    owner: SEED_OWNER,
    createdAt: '2026-10-03T06:12:00Z',
    filedAt: '2026-10-03T06:14:00Z',
    fields: {
      category: 'threat',
      severity: 'emergency',
      weaponOrImmediateThreat: true,
      eventTime: '2026-10-03T06:00:00.000Z',
      description:
        'Fictional showcase: a man with a knife threatened people waiting at a bus stop.',
      location: { lat: 50.089, lng: 19.918 },
      locationLabel: 'Bus stop on Opolska (fictional)',
      zoneId: 'IV',
    },
  },
  {
    id: 'showinreview',
    owner: SEED_OWNER,
    createdAt: '2026-09-26T12:00:00Z',
    filedAt: '2026-09-26T12:20:00Z',
    fields: {
      category: 'physical_intimidation',
      severity: 'medium',
      isRepeatIncident: true,
      eventTime: '2026-09-26T11:00:00.000Z',
      description:
        'Fictional showcase: the same group blocks my way and follows me home from the market every week.',
      location: { lat: 50.072, lng: 19.915 },
      locationLabel: 'Market hall on Krowoderska (fictional)',
      zoneId: 'V',
    },
    steps: [
      {
        at: '2026-09-26T14:00:00Z',
        type: 'promote',
        to: 'community_volunteer',
        followed: true,
        reason: 'Repeat intimidation near home; a local volunteer can accompany and support.',
      },
      { at: '2026-09-27T08:30:00Z', type: 'claim' },
      {
        at: '2026-09-27T10:00:00Z',
        type: 'external_action',
        action: 'phone_call',
        note: 'Called the resident and agreed a walk-along on market day.',
      },
    ],
  },
  {
    id: 'showclosed',
    owner: SEED_OWNER,
    createdAt: '2026-09-18T20:00:00Z',
    filedAt: '2026-09-18T20:05:00Z',
    fields: {
      category: 'vandalism_hate_symbols',
      severity: 'medium',
      eventTime: '2026-09-18T18:00:00.000Z',
      description: 'Fictional showcase: hate symbols sprayed on a bench by the river.',
      location: { lat: 50.048, lng: 19.918 },
      locationLabel: 'Riverside bench, Dębniki (fictional)',
      zoneId: 'VIII',
    },
    steps: [
      {
        at: '2026-09-19T09:00:00Z',
        type: 'promote',
        to: 'community_volunteer',
        reason: 'Hate graffiti; the volunteer network arranges clean-ups with the district.',
      },
      { at: '2026-09-19T11:00:00Z', type: 'claim' },
      {
        at: '2026-09-21T15:00:00Z',
        type: 'external_action',
        action: 'site_visit',
        note: 'Volunteers painted over the symbols with the district council.',
      },
      {
        at: '2026-09-21T16:00:00Z',
        type: 'close',
        comment: 'Symbols removed; the district will check the spot monthly.',
      },
    ],
  },
  {
    id: 'showdupe',
    owner: SEED_OWNER,
    createdAt: '2026-10-01T17:05:00Z',
    filedAt: '2026-10-01T17:08:00Z',
    fields: {
      category: 'verbal_harassment',
      severity: 'low',
      eventTime: '2026-10-01T16:30:00.000Z',
      description: 'Fictional showcase: shouting on tram 8 near Teatr Bagatela, same as earlier.',
      location: { lat: 50.0637, lng: 19.9325 },
      zoneId: 'I',
    },
    steps: [
      {
        at: '2026-10-01T18:00:00Z',
        type: 'cancel',
        reason: 'duplicate',
        comment: 'Same incident as the earlier tram 8 report from this afternoon.',
      },
    ],
  },
  {
    id: 'showother',
    owner: 'resident2',
    createdAt: '2026-09-30T21:00:00Z',
    filedAt: '2026-09-30T21:15:00Z',
    fields: {
      category: 'verbal_harassment',
      severity: 'medium',
      isRepeatIncident: true,
      description:
        'Fictional showcase: a neighbour shouts abuse about my nationality whenever we meet in the courtyard.',
      location: { lat: 50.0825, lng: 19.8915 },
      locationLabel: 'Courtyard of a block in Bronowice Małe (fictional)',
      zoneId: 'VI',
    },
  },
];

const officialOf = (organization: OrganizationId) =>
  demoAccounts.find((account) => account.organizationId === organization)!.username;

const operatorDecision = (step: ShowcaseStep): OperatorDecision | null => {
  if (step.type === 'reply') return { type: 'reply', kind: step.kind };
  if (step.type === 'promote') return { type: 'promote', targetOrganization: step.to };
  if (step.type === 'cancel') return { type: 'cancel' };
  return null;
};

/**
 * Replays the steps with the same rules the API applies, returning the case's final row and
 * the messages and audit actions the real endpoints would have written.
 */
export function replaySteps(
  caseId: RecordId,
  organization: OrganizationId,
  recommendation: { id: RecordId; action: Parameters<typeof decisionDisposition>[0] },
  steps: ShowcaseStep[],
) {
  let status: CaseStatus = { state: 'open', triageStatus: 'needs_review' };
  let current = organization;
  let assigned: string | null = null;
  const extra: Record<string, unknown> = {};
  const messages: Record<string, unknown>[] = [];
  const actions: Record<string, unknown>[] = [];

  steps.forEach((step, index) => {
    const decision = operatorDecision(step);
    const actor = decision ? 'operator' : officialOf(current);
    status = nextCaseStatus(status, (decision ?? { type: step.type }) as CaseEvent);
    const at = new Date(step.at);
    let payload: Record<string, unknown> = {};
    if (step.type === 'reply') {
      payload = { kind: step.kind, body: step.body };
      messages.push({
        case: caseId,
        kind: step.kind,
        body: step.body,
        author: principalRecord(actor),
        created_at: at,
      });
    } else if (step.type === 'promote') {
      payload = { targetOrganization: step.to, fromOrganization: current, reason: step.reason };
      current = step.to;
      assigned = null;
    } else if (step.type === 'cancel') {
      payload = { reasonCategory: step.reason, comment: step.comment };
      extra.cancel_reason_category = step.reason;
      extra.cancel_comment = step.comment;
      messages.push({
        case: caseId,
        kind: 'cancellation_notice',
        body: CANCELLATION_NOTICE,
        author: principalRecord(actor),
        created_at: at,
      });
    } else if (step.type === 'claim') {
      assigned = actor;
    } else if (step.type === 'external_action') {
      payload = { type: step.action, note: step.note };
    } else {
      payload = { comment: step.comment };
      extra.closure_comment = step.comment;
    }
    actions.push({
      case: caseId,
      actor: principalRecord(actor),
      type: `${decision ? 'operator' : 'official'}.${step.type}`,
      payload,
      ...(decision
        ? {
            recommendation: recommendation.id,
            disposition:
              decisionDisposition(
                recommendation.action,
                decision,
                'followed' in step && !!step.followed,
              ) ?? undefined,
          }
        : {}),
      prior_version: index + 1,
      resulting_version: index + 2,
      created_at: at,
    });
  });

  return {
    row: {
      organization_id: current,
      state: status.state,
      triage_status: status.triageStatus,
      version: steps.length + 1,
      ...(assigned ? { assigned_official: principalRecord(assigned) } : {}),
      ...extra,
    },
    messages,
    actions,
  };
}

/**
 * Creates each showcase report once, with its revisions, routing decision, recommendation, case,
 * messages and case history. Existing ones are left alone, so demos can move them on.
 */
export async function seedShowcaseReports(query: QueryFn): Promise<number> {
  let created = 0;
  for (const report of showcaseReports) {
    const fields = reportFieldsSchema.parse(report.fields);
    const id = new RecordId('report', report.id);
    const owner = principalRecord(report.owner);
    const createdAt = new Date(report.createdAt);
    const vars: Record<string, unknown> = { id, owner, fields, created_at: createdAt };
    let filing = '';

    if (report.filedAt) {
      const plan = planFiling(fields, 0, 'local');
      const caseId = new RecordId('haven_case', report.id);
      const recommendationId = new RecordId('recommendation', report.id);
      const filedAt = new Date(report.filedAt);
      const steps = report.steps ?? [];
      const replay = replaySteps(
        caseId,
        plan.result.responder,
        { id: recommendationId, action: plan.recommendation!.action },
        steps,
      );
      const updatedAt = steps.length ? new Date(steps.at(-1)!.at) : filedAt;
      Object.assign(vars, {
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
          updated_at: updatedAt,
        },
        messages: replay.messages,
        actions: replay.actions,
      });
      filing = `
        UPDATE $id SET state = 'submitted', current_revision = 2, submitted_at = $filed_at,
          updated_at = $filed_at, reference = fn::next_report_reference(time::year($filed_at));
        CREATE report_revision CONTENT {
          report: $id, revision: 2, fields: $fields, note: 'filed', author: $owner,
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
        FOR $message IN $messages { CREATE case_message CONTENT $message; };
        FOR $action IN $actions { CREATE case_action CONTENT $action; };`;
    }

    const results = await query(
      `BEGIN TRANSACTION;
       LET $exists = record::exists($id);
       IF !$exists {
         CREATE $id CONTENT {
           owner: $owner, state: 'draft', current_revision: 1, fields: $fields,
           zone_id: $fields.zoneId ?? NONE, created_at: $created_at, updated_at: $created_at
         };
         CREATE report_revision CONTENT {
           report: $id, revision: 1, fields: $fields, note: 'created', author: $owner,
           created_at: $created_at
         };
         ${filing}
       };
       RETURN !$exists;
       COMMIT TRANSACTION;`,
      vars,
    );
    if ((results as unknown[]).at(-2) === true) created++;
  }
  return created;
}

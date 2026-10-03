import { RecordId } from 'surrealdb';
import { findDistrict, reportFieldsSchema } from '@haven/shared';
import { describe, expect, it } from 'vitest';
import { planFiling } from '../cases/routing.js';
import { replaySteps, showcaseReports } from './seed-showcase.js';

const replay = (id: string) => {
  const report = showcaseReports.find((r) => r.id === id)!;
  const plan = planFiling(reportFieldsSchema.parse(report.fields), 0, 'local');
  return {
    plan,
    ...replaySteps(
      new RecordId('haven_case', id),
      plan.result.responder,
      { id: new RecordId('recommendation', id), action: plan.recommendation!.action },
      report.steps ?? [],
    ),
  };
};

describe('showcase seed', () => {
  it('pins every report inside the district it names', () => {
    for (const report of showcaseReports) {
      reportFieldsSchema.parse(report.fields);
      if (report.fields.location) {
        expect(findDistrict(report.fields.location), report.id).toBe(report.fields.zoneId);
      }
    }
  });

  it('stays out of the districts whose counts the e2e suite checks', () => {
    for (const report of showcaseReports) {
      expect(['III', 'XIII', 'XVIII']).not.toContain(report.fields.zoneId);
    }
  });

  it('covers each state the demo walks through', () => {
    expect(replay('showreview').row).toMatchObject({
      state: 'open',
      triage_status: 'needs_review',
    });
    expect(replay('showreview').plan.recommendation?.action).toBe('transfer_to_ngo');
    expect(replay('showawait').row).toMatchObject({ triage_status: 'awaiting_resident' });
    expect(replay('showemerg').plan.result.queue).toBe('jumps_queue');
    expect(replay('showinreview').row).toMatchObject({
      state: 'in_review',
      organization_id: 'community_volunteer',
    });
    expect(replay('showclosed').row).toMatchObject({ state: 'closed', triage_status: 'handled' });
    expect(replay('showdupe').row).toMatchObject({
      state: 'cancelled',
      cancel_reason_category: 'duplicate',
    });
  });

  it('records the messages and versioned actions the real endpoints would write', () => {
    const awaiting = replay('showawait');
    expect(awaiting.messages).toHaveLength(1);
    expect(awaiting.actions[0]).toMatchObject({
      type: 'operator.reply',
      disposition: 'followed',
      prior_version: 1,
      resulting_version: 2,
    });
    const closed = replay('showclosed');
    expect(closed.actions.map((a) => a.type)).toEqual([
      'operator.promote',
      'official.claim',
      'official.external_action',
      'official.close',
    ]);
    expect(closed.row.version).toBe(5);
    expect(replay('showdupe').messages[0]).toMatchObject({ kind: 'cancellation_notice' });
  });
});

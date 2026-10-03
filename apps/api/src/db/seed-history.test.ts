import { RecordId } from 'surrealdb';
import { aggregateReportsByZone, findDistrict, reportFieldsSchema } from '@haven/shared';
import { describe, expect, it } from 'vitest';
import { planFiling } from '../cases/routing.js';
import { historyReports } from './seed-history.js';
import { replaySteps } from './seed-showcase.js';

const reports = historyReports();
const counts = (category?: string) =>
  new Map(
    aggregateReportsByZone(
      reports
        .filter((r) => !category || r.fields.category === category)
        .map((r) => r.fields.zoneId!),
    ).map((zone) => [zone.zoneId, zone.count]),
  );

describe('history seed', () => {
  it('is the same on every run', () => {
    expect(historyReports()).toEqual(reports);
  });

  it('pins every report inside the district it names, oldest first', () => {
    for (const report of reports) {
      expect(findDistrict(report.fields.location!), report.id).toBe(report.fields.zoneId);
    }
    const filed = reports.map((r) => r.filedAt);
    expect(filed).toEqual([...filed].sort());
  });

  it('closes every case through the real case rules', () => {
    for (const report of reports) {
      const plan = planFiling(reportFieldsSchema.parse(report.fields), 0, 'local');
      const { row } = replaySteps(
        new RecordId('haven_case', report.id),
        plan.result.responder,
        { id: new RecordId('recommendation', report.id), action: plan.recommendation!.action },
        report.steps,
      );
      expect(row, report.id).toMatchObject({ state: 'closed', triage_status: 'handled' });
    }
  });

  it('keeps the counts the e2e suite checks', () => {
    // Plus three seed reports in III, one of them verbal harassment.
    expect(counts().get('III')).toBe(12);
    expect(counts('verbal_harassment').get('III')).toBeNull();
    expect(counts().get('XVII')).toBeNull();
  });

  it('gives each incident type a different busiest district', () => {
    const busiest = (category: string) =>
      [...counts(category)].sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))[0]![0];
    expect(busiest('verbal_harassment')).toBe('I');
    expect(busiest('discrimination')).toBe('II');
    expect(busiest('vandalism_hate_symbols')).toBe('XVIII');
  });
});

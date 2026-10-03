import type { HttpException } from '@nestjs/common';
import { emptyReportFields, type SessionPrincipal, type SupportResource } from '@haven/shared';
import { describe, expect, it, vi } from 'vitest';
import type { OperatorRepository } from '../operator/operator.repository.js';
import type { ReportsService } from '../reports/reports.service.js';
import type { SupportRepository } from './support.repository.js';
import { SupportService } from './support.service.js';

const resident: SessionPrincipal = { id: 'res', role: 'resident', name: 'Resident' };

const tramDesk: SupportResource = {
  slug: 'tram-desk',
  kind: 'victim_support',
  name: { en: 'Tram Desk (fictional)', pl: 'Punkt Tramwajowy (fikcyjne)' },
  description: { en: 'Help on trams', pl: 'Pomoc w tramwajach' },
  categories: ['verbal_harassment'],
  districts: ['I'],
  languages: ['pl', 'en'],
  severities: ['low'],
  keywords: { en: ['tram'], pl: ['tramwaj'] },
  contact: '+48 12 000 00 00',
  availableHours: { en: 'Always', pl: 'Zawsze' },
};

const fields = {
  ...emptyReportFields(),
  category: 'verbal_harassment' as const,
  zoneId: 'I' as const,
  severity: 'low' as const,
  description: 'Krzyczał w tramwaju',
};

function setup(state: 'draft' | 'submitted' = 'submitted') {
  const support = {
    analyze: vi.fn(async () => ['krz', 'krzyczal', 'tra', 'tram', 'tramwaj', 'tramwaju']),
    listResources: vi.fn(async () => [tramDesk]),
  };
  const reports = { findOwned: vi.fn(async () => ({ state, fields })) };
  const operator = { findCase: vi.fn(async (): Promise<unknown> => ({ fields })) };
  const service = new SupportService(
    support as unknown as SupportRepository,
    reports as unknown as ReportsService,
    operator as unknown as OperatorRepository,
  );
  return { service, support, reports, operator };
}

async function rejection(promise: Promise<unknown>) {
  const error = (await promise.catch((e: unknown) => e)) as HttpException;
  return { status: error.getStatus(), body: error.getResponse() };
}

describe('SupportService', () => {
  it('matches a filed report against the analysed description', async () => {
    const t = setup();
    const response = await t.service.forReport(resident, 'r1');
    expect(t.reports.findOwned).toHaveBeenCalledWith(resident, 'r1');
    expect(t.support.analyze).toHaveBeenCalledWith('Krzyczał w tramwaju');
    expect(response.emergency).toBe(false);
    expect(response.items).toHaveLength(1);
    expect(response.items[0]?.reasons).toEqual([
      { type: 'category', value: 'verbal_harassment' },
      { type: 'district', value: 'I' },
      { type: 'keyword', value: 'tram' },
      { type: 'keyword', value: 'tramwaj' },
      { type: 'severity', value: 'low' },
    ]);
    expect(response.items[0]?.resource).not.toHaveProperty('keywords');
  });

  it('answers 409 not_filed for a draft', async () => {
    const t = setup('draft');
    const result = await rejection(t.service.forReport(resident, 'r1'));
    expect(result).toMatchObject({ status: 409, body: { error: { code: 'not_filed' } } });
    expect(t.support.listResources).not.toHaveBeenCalled();
  });

  it('matches a case for the operator, and 404s an unknown one', async () => {
    const t = setup();
    expect((await t.service.forCase('c1')).items).toHaveLength(1);
    t.operator.findCase.mockResolvedValue(null);
    const result = await rejection(t.service.forCase('nope'));
    expect(result).toMatchObject({ status: 404, body: { error: { code: 'case_not_found' } } });
  });
});

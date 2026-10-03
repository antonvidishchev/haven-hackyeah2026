import { describe, expect, it } from 'vitest';

import { evaluateRouting, queuePriorityRank, recommend, type RoutingInput } from './router.js';

const input = (overrides: Partial<RoutingInput>): RoutingInput => ({
  severity: 'low',
  weaponOrImmediateThreat: false,
  isRepeatIncident: false,
  hasEvidence: false,
  ...overrides,
});

describe('evaluateRouting', () => {
  it('rule 1: low goes to the community volunteers, normal queue', () => {
    expect(evaluateRouting(input({ severity: 'low' }))).toMatchObject({
      ruleId: 'router-rule-1',
      responder: 'community_volunteer',
      confirmationRequired: false,
      autoDispatch: false,
      queue: 'normal',
      emergency: false,
    });
  });

  it('rule 2: medium with evidence goes to professional support', () => {
    expect(evaluateRouting(input({ severity: 'medium', hasEvidence: true }))).toMatchObject({
      ruleId: 'router-rule-2',
      responder: 'professional_paid',
      confirmationRequired: false,
      queue: 'normal',
    });
  });

  it('rule 3: medium without evidence needs confirmation', () => {
    expect(evaluateRouting(input({ severity: 'medium' }))).toMatchObject({
      ruleId: 'router-rule-3',
      responder: 'professional_paid',
      confirmationRequired: true,
      queue: 'normal',
    });
  });

  it('rule 4: high is fast-laned', () => {
    expect(evaluateRouting(input({ severity: 'high' }))).toMatchObject({
      ruleId: 'router-rule-4',
      responder: 'professional_paid',
      queue: 'fast_laned',
    });
  });

  it('rule 5: emergency goes to the police, jumps the queue, auto-dispatches', () => {
    expect(
      evaluateRouting(input({ severity: 'emergency', weaponOrImmediateThreat: true })),
    ).toMatchObject({
      ruleId: 'router-rule-5',
      responder: 'police_municipal',
      autoDispatch: true,
      queue: 'jumps_queue',
      emergency: true,
    });
  });

  it('treats a weapon as an emergency', () => {
    expect(evaluateRouting(input({ severity: 'high', weaponOrImmediateThreat: true })).ruleId).toBe(
      'router-rule-5',
    );
  });

  it('routes an unrated report like a low one', () => {
    expect(evaluateRouting(input({ severity: null })).ruleId).toBe('router-rule-1');
  });

  it('expedites a medium repeat incident', () => {
    expect(evaluateRouting(input({ severity: 'medium', isRepeatIncident: true })).queue).toBe(
      'expedited',
    );
    expect(
      evaluateRouting(input({ severity: 'medium', hasEvidence: true, isRepeatIncident: true }))
        .queue,
    ).toBe('expedited');
  });

  it('leaves other repeat incidents alone', () => {
    expect(evaluateRouting(input({ severity: 'low', isRepeatIncident: true })).queue).toBe(
      'normal',
    );
    expect(evaluateRouting(input({ severity: 'high', isRepeatIncident: true })).queue).toBe(
      'fast_laned',
    );
  });

  it('carries the ruleset version', () => {
    expect(evaluateRouting(input({})).rulesetVersion).toBe('router-rules-v1');
  });
});

describe('queuePriorityRank', () => {
  it('orders jumps_queue > fast_laned > expedited > normal', () => {
    const sorted = (['normal', 'jumps_queue', 'expedited', 'fast_laned'] as const)
      .slice()
      .sort((a, b) => queuePriorityRank(a) - queuePriorityRank(b));
    expect(sorted).toEqual(['jumps_queue', 'fast_laned', 'expedited', 'normal']);
  });
});

describe('recommend', () => {
  it('asks for evidence when the description mentions it (EN)', () => {
    const result = recommend({
      category: 'threat',
      severity: 'high',
      description: 'I have a Video of it',
    });
    expect(result).toMatchObject({
      action: 'request_more_evidence',
      status: 'suggested',
      confidence: 0.5,
      source: 'simulated-local-v1',
    });
  });

  it('asks for evidence when the description mentions it (PL)', () => {
    expect(
      recommend({ category: 'other', severity: null, description: 'Mam NAGRANIE z tramwaju' })
        .action,
    ).toBe('request_more_evidence');
  });

  it('suggests an NGO for lower-severity harassment', () => {
    expect(
      recommend({ category: 'verbal_harassment', severity: 'medium', description: 'Shouting' }),
    ).toMatchObject({ action: 'transfer_to_ngo', status: 'suggested' });
  });

  it('abstains otherwise', () => {
    expect(
      recommend({ category: 'verbal_harassment', severity: 'high', description: 'Shouting' }),
    ).toMatchObject({ action: 'none', status: 'abstained' });
    expect(
      recommend({ category: 'vandalism_hate_symbols', severity: 'low', description: '' }),
    ).toMatchObject({ action: 'none' });
  });
});

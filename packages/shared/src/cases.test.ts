import { describe, expect, it } from 'vitest';

import { CaseClosedError, decisionDisposition, nextCaseStatus, type CaseStatus } from './cases.js';

const open: CaseStatus = { state: 'open', triageStatus: 'needs_review' };

describe('nextCaseStatus', () => {
  it('a request for information waits for the resident', () => {
    expect(nextCaseStatus(open, { type: 'reply', kind: 'request_information' })).toEqual({
      state: 'open',
      triageStatus: 'awaiting_resident',
    });
  });

  it('a comment changes nothing', () => {
    const waiting: CaseStatus = { state: 'open', triageStatus: 'awaiting_resident' };
    expect(nextCaseStatus(waiting, { type: 'reply', kind: 'comment' })).toEqual(waiting);
  });

  it('a resident update brings an awaiting case back to review', () => {
    expect(
      nextCaseStatus(
        { state: 'open', triageStatus: 'awaiting_resident' },
        { type: 'resident_update' },
      ),
    ).toEqual(open);
    expect(nextCaseStatus(open, { type: 'resident_update' })).toEqual(open);
  });

  it('promotion hands the case over and reopens it', () => {
    expect(
      nextCaseStatus(
        { state: 'in_review', triageStatus: 'needs_review' },
        { type: 'promote', targetOrganization: 'professional_paid' },
      ),
    ).toEqual({ state: 'open', triageStatus: 'handled' });
  });

  it('cancellation is terminal', () => {
    const cancelled = nextCaseStatus(open, { type: 'cancel' });
    expect(cancelled).toEqual({ state: 'cancelled', triageStatus: 'handled' });
    expect(() => nextCaseStatus(cancelled, { type: 'reply', kind: 'comment' })).toThrow(
      CaseClosedError,
    );
    expect(() =>
      nextCaseStatus(cancelled, { type: 'promote', targetOrganization: 'police_municipal' }),
    ).toThrow(CaseClosedError);
    expect(nextCaseStatus(cancelled, { type: 'resident_update' })).toEqual(cancelled);
  });

  it('closed cases refuse decisions', () => {
    expect(() =>
      nextCaseStatus({ state: 'closed', triageStatus: 'handled' }, { type: 'cancel' }),
    ).toThrow(CaseClosedError);
  });

  it('an official claims, records actions, then closes for good', () => {
    const handled: CaseStatus = { state: 'open', triageStatus: 'handled' };
    const claimed = nextCaseStatus(handled, { type: 'claim' });
    expect(claimed).toEqual({ state: 'in_review', triageStatus: 'handled' });
    expect(nextCaseStatus(claimed, { type: 'external_action' })).toEqual(claimed);
    const closed = nextCaseStatus(claimed, { type: 'close' });
    expect(closed).toEqual({ state: 'closed', triageStatus: 'handled' });
    for (const type of ['claim', 'external_action', 'close'] as const) {
      expect(() => nextCaseStatus(closed, { type })).toThrow(CaseClosedError);
    }
    expect(nextCaseStatus(closed, { type: 'resident_update' })).toEqual(closed);
  });

  it('closing takes a case out of review', () => {
    expect(nextCaseStatus(open, { type: 'close' })).toEqual({
      state: 'closed',
      triageStatus: 'handled',
    });
  });

  it('officials cannot act on cancelled cases', () => {
    const cancelled: CaseStatus = { state: 'cancelled', triageStatus: 'handled' };
    expect(() => nextCaseStatus(cancelled, { type: 'claim' })).toThrow(CaseClosedError);
  });
});

describe('decisionDisposition', () => {
  const promote = { type: 'promote', targetOrganization: 'community_volunteer' } as const;
  const ask = { type: 'reply', kind: 'request_information' } as const;

  it('is null without a suggestion', () => {
    expect(decisionDisposition(null, promote, false)).toBeNull();
    expect(decisionDisposition('none', promote, true)).toBeNull();
  });

  it('followed when the operator follows and takes the suggested decision', () => {
    expect(decisionDisposition('transfer_to_ngo', promote, true)).toBe('followed');
    expect(decisionDisposition('request_more_evidence', ask, true)).toBe('followed');
  });

  it('different for manual decisions, even matching ones', () => {
    expect(decisionDisposition('transfer_to_ngo', promote, false)).toBe('different');
    expect(decisionDisposition('transfer_to_ngo', ask, false)).toBe('different');
    expect(
      decisionDisposition('request_more_evidence', { type: 'reply', kind: 'comment' }, true),
    ).toBe('different');
  });

  it('rejected for a cancellation', () => {
    expect(decisionDisposition('transfer_to_ngo', { type: 'cancel' }, false)).toBe('rejected');
  });
});

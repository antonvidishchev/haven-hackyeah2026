import type { AuditAction } from '@haven/shared';
import type { CaseDecisionWrite } from '../operator/operator.repository.js';

const lengthOf = (value: unknown) => (typeof value === 'string' ? value.length : undefined);
const tokenOf = (value: unknown) => (typeof value === 'string' ? value : undefined);

/** The audit entry for a staff decision on a case: enums and lengths, never the text. */
export function caseAuditEntry(write: CaseDecisionWrite): {
  action: AuditAction;
  meta: Record<string, unknown>;
} {
  const { payload } = write;
  const common = {
    resultingVersion: write.expectedVersion + 1,
    state: write.next.state,
    triageStatus: write.next.triageStatus,
  };
  switch (write.type) {
    case 'operator.promote':
      return {
        action: 'case.promoted',
        meta: {
          ...common,
          fromOrganization: tokenOf(payload.fromOrganization),
          targetOrganization: tokenOf(payload.targetOrganization),
          reasonLength: lengthOf(payload.reason),
          disposition: write.disposition,
        },
      };
    case 'operator.cancel':
      return {
        action: 'case.cancelled',
        meta: {
          ...common,
          reasonCategory: tokenOf(payload.reasonCategory),
          commentLength: lengthOf(payload.comment),
          disposition: write.disposition,
        },
      };
    case 'operator.reply':
      return {
        action: 'case.replied',
        meta: {
          ...common,
          kind: tokenOf(payload.kind),
          bodyLength: lengthOf(payload.body),
          disposition: write.disposition,
        },
      };
    case 'official.claim':
      return { action: 'case.claimed', meta: common };
    case 'official.external_action':
      return {
        action: 'case.action_recorded',
        meta: { ...common, actionType: tokenOf(payload.type), noteLength: lengthOf(payload.note) },
      };
    case 'official.close':
      return {
        action: 'case.closed',
        meta: { ...common, commentLength: lengthOf(payload.comment) },
      };
  }
}

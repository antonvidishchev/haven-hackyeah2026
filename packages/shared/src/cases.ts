import { z } from 'zod';

import {
  organizationIdSchema,
  triageStatuses,
  type CaseState,
  type DistrictId,
  type OrganizationId,
  type QueuePriority,
  type ReportCategory,
  type Severity,
  type TriageStatus,
} from './enums.js';
import type { EvidenceItem, ReportFields, ReportRevision, ResidentMessage } from './reports.js';
import type { RecommendationAction, RoutingResult } from './router.js';

export const caseViewSchema = z.enum(triageStatuses);

export const cancelReasons = ['spam', 'duplicate', 'not_actionable', 'other'] as const;
export type CancelReason = (typeof cancelReasons)[number];

export const replyKinds = ['request_information', 'comment'] as const;
export type ReplyKind = (typeof replyKinds)[number];

export const MESSAGE_BODY_MAX = 1000;

/** The fixed, neutral text residents get when a case is cancelled (localised by clients). */
export const CANCELLATION_NOTICE =
  'Thank you for your report. Haven’s team has reviewed it and closed it. No further action is planned.';

export const caseIdSchema = z.string().regex(/^[a-z0-9]{1,40}$/);

const decisionBase = {
  expectedVersion: z.number().int().min(1),
  /** True when the operator used "Follow AI recommendation". */
  followedRecommendation: z.boolean().default(false),
};

export const promoteCaseRequestSchema = z.object({
  ...decisionBase,
  targetOrganization: organizationIdSchema,
  reason: z.string().trim().min(1).max(500),
});
export type PromoteCaseRequest = z.input<typeof promoteCaseRequestSchema>;

export const cancelCaseRequestSchema = z.object({
  ...decisionBase,
  reasonCategory: z.enum(cancelReasons),
  comment: z.string().trim().min(1).max(MESSAGE_BODY_MAX),
});
export type CancelCaseRequest = z.input<typeof cancelCaseRequestSchema>;

export const replyCaseRequestSchema = z.object({
  ...decisionBase,
  kind: z.enum(replyKinds),
  body: z.string().trim().min(1).max(MESSAGE_BODY_MAX),
});
export type ReplyCaseRequest = z.input<typeof replyCaseRequestSchema>;

/** What an official did outside Haven. */
export const externalActionTypes = [
  'phone_call',
  'site_visit',
  'referral',
  'meeting',
  'other',
] as const;
export type ExternalActionType = (typeof externalActionTypes)[number];

const versioned = { expectedVersion: z.number().int().min(1) };

export const claimCaseRequestSchema = z.object(versioned);
export type ClaimCaseRequest = z.input<typeof claimCaseRequestSchema>;

export const recordActionRequestSchema = z.object({
  ...versioned,
  type: z.enum(externalActionTypes),
  note: z.string().trim().min(1).max(MESSAGE_BODY_MAX),
});
export type RecordActionRequest = z.input<typeof recordActionRequestSchema>;

export const closeCaseRequestSchema = z.object({
  ...versioned,
  comment: z.string().trim().min(1).max(MESSAGE_BODY_MAX),
});
export type CloseCaseRequest = z.input<typeof closeCaseRequestSchema>;

// --- Triage rules ---

export type OperatorDecision =
  | { type: 'promote'; targetOrganization: OrganizationId }
  | { type: 'cancel' }
  | { type: 'reply'; kind: ReplyKind };

/** What an official does with a case routed to their organisation. */
export type OfficialEvent = { type: 'claim' } | { type: 'external_action' } | { type: 'close' };

export type CaseEvent = OperatorDecision | OfficialEvent | { type: 'resident_update' };

export type CaseStatus = { state: CaseState; triageStatus: TriageStatus };

export class CaseClosedError extends Error {
  constructor() {
    super('This case is closed and can no longer change');
    this.name = 'CaseClosedError';
  }
}

export const isTerminal = (state: CaseState) => state === 'closed' || state === 'cancelled';

/**
 * The triage state machine. Operator decisions on a closed or cancelled case throw
 * `CaseClosedError`; a resident update there changes nothing.
 */
export function nextCaseStatus(current: CaseStatus, event: CaseEvent): CaseStatus {
  if (isTerminal(current.state)) {
    if (event.type === 'resident_update') return current;
    throw new CaseClosedError();
  }
  switch (event.type) {
    case 'resident_update':
      return current.triageStatus === 'awaiting_resident'
        ? { ...current, triageStatus: 'needs_review' }
        : current;
    case 'reply':
      return event.kind === 'request_information'
        ? { ...current, triageStatus: 'awaiting_resident' }
        : current;
    case 'promote':
      // A new organisation starts afresh: the assignment resets, so the case is open again.
      return { state: 'open', triageStatus: 'handled' };
    case 'cancel':
      return { state: 'cancelled', triageStatus: 'handled' };
    case 'claim':
      return { ...current, state: 'in_review' };
    case 'external_action':
      return current;
    case 'close':
      return { state: 'closed', triageStatus: 'handled' };
  }
}

export type Disposition = 'followed' | 'rejected' | 'different';

/** The decision the advisory recommendation suggests, if any. */
export function suggestedDecision(action: RecommendationAction): OperatorDecision['type'] | null {
  if (action === 'request_more_evidence') return 'reply';
  if (action === 'transfer_to_ngo') return 'promote';
  return null;
}

/**
 * How a decision relates to the advisory recommendation. Null without a suggestion. "Followed"
 * needs the operator to have used "Follow AI recommendation" and to have taken the suggested
 * kind of decision; a cancellation goes against the advice (it never suggests one), so it is
 * "rejected"; any other manual decision is "different".
 */
export function decisionDisposition(
  recommendation: RecommendationAction | null,
  decision: OperatorDecision,
  followedRecommendation: boolean,
): Disposition | null {
  const suggested = recommendation ? suggestedDecision(recommendation) : null;
  if (!suggested) return null;
  const matches =
    decision.type === suggested &&
    (decision.type !== 'reply' || decision.kind === 'request_information');
  if (followedRecommendation && matches) return 'followed';
  if (decision.type === 'cancel') return 'rejected';
  return 'different';
}

// --- API contract ---

export type OperatorCaseSummary = {
  id: string;
  reportId: string;
  reference: string;
  category: ReportCategory;
  severity: Severity | null;
  zoneId: DistrictId | null;
  organizationId: OrganizationId;
  state: CaseState;
  triageStatus: TriageStatus;
  queue: QueuePriority;
  /** The advisory recommendation suggests an action (not abstained). */
  hasSuggestion: boolean;
  escalated: boolean;
  version: number;
  submittedAt: string;
  updatedAt: string;
};

export type OperatorCaseListResponse = {
  items: OperatorCaseSummary[];
  counts: Record<TriageStatus, number>;
};

export type CaseRecommendation = {
  id: string;
  action: RecommendationAction;
  status: 'suggested' | 'abstained';
  confidence: number;
  rationale: string;
  source: string;
  createdAt: string;
};

export type CaseActionType =
  | 'operator.promote'
  | 'operator.cancel'
  | 'operator.reply'
  | 'official.claim'
  | 'official.external_action'
  | 'official.close';

export type CaseActionItem = {
  id: string;
  type: CaseActionType;
  actorName: string;
  payload: Record<string, unknown>;
  disposition: Disposition | null;
  priorVersion: number;
  resultingVersion: number;
  createdAt: string;
};

export type OperatorCaseDetail = OperatorCaseSummary & {
  fields: ReportFields;
  revision: number;
  revisions: ReportRevision[];
  evidence: EvidenceItem[];
  routing: RoutingResult;
  recommendation: CaseRecommendation | null;
  messages: ResidentMessage[];
  actions: CaseActionItem[];
  cancelReasonCategory: CancelReason | null;
  cancelComment: string | null;
};

export type AssignedOfficial = { id: string; name: string };

/** A case as an official sees it in their organisation's list. */
export type OfficialCaseSummary = Omit<OperatorCaseSummary, 'hasSuggestion'> & {
  assignedOfficial: AssignedOfficial | null;
};

export type OfficialCaseListResponse = { items: OfficialCaseSummary[] };

/**
 * One case for an official: the report, its evidence and routing, and what happened to the
 * case. Never the advisory recommendation or the messages to the resident.
 */
export type OfficialCaseDetail = OfficialCaseSummary & {
  fields: ReportFields;
  evidence: EvidenceItem[];
  routing: RoutingResult;
  actions: CaseActionItem[];
  closureComment: string | null;
};

export type VaultItem = {
  id: string;
  reportId: string;
  reference: string | null;
  caseId: string | null;
  fileName: string;
  mediaType: string;
  byteSize: number;
  sha256: string;
  createdAt: string;
};

export type VaultListResponse = { items: VaultItem[] };

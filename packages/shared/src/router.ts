import type { OrganizationId, QueuePriority, ReportCategory, Severity } from './enums.js';
import type { ReportFields } from './reports.js';

export const ROUTER_RULESET_VERSION = 'router-rules-v1';

export type RouterRule = {
  id: string;
  severity: Severity;
  /** `true` or `false` limits the rule to reports with or without evidence. */
  hasEvidence?: boolean;
  responder: OrganizationId;
  confirmationRequired: boolean;
  autoDispatch: boolean;
  queue: QueuePriority;
};

/**
 * The Smart Router's rules, evaluated in order; the first match wins. Deterministic and
 * explainable — not AI. The API stores `sha256(JSON.stringify(routerRules))` as the digest.
 */
export const routerRules: readonly RouterRule[] = [
  {
    id: 'router-rule-1',
    severity: 'low',
    responder: 'community_volunteer',
    confirmationRequired: false,
    autoDispatch: false,
    queue: 'normal',
  },
  {
    id: 'router-rule-2',
    severity: 'medium',
    hasEvidence: true,
    responder: 'professional_paid',
    confirmationRequired: false,
    autoDispatch: false,
    queue: 'normal',
  },
  {
    id: 'router-rule-3',
    severity: 'medium',
    hasEvidence: false,
    responder: 'professional_paid',
    confirmationRequired: true,
    autoDispatch: false,
    queue: 'normal',
  },
  {
    id: 'router-rule-4',
    severity: 'high',
    responder: 'professional_paid',
    confirmationRequired: false,
    autoDispatch: false,
    queue: 'fast_laned',
  },
  {
    id: 'router-rule-5',
    severity: 'emergency',
    responder: 'police_municipal',
    confirmationRequired: false,
    autoDispatch: true,
    queue: 'jumps_queue',
  },
];

/** The frozen inputs the router sees at filing. */
export type RoutingInput = {
  severity: Severity | null;
  weaponOrImmediateThreat: boolean;
  isRepeatIncident: boolean;
  hasEvidence: boolean;
};

export type RoutingResult = {
  ruleId: string;
  rulesetVersion: string;
  responder: OrganizationId;
  confirmationRequired: boolean;
  autoDispatch: boolean;
  queue: QueuePriority;
  /** Emergency results carry the "call 112" copy. */
  emergency: boolean;
};

export const routingInput = (fields: ReportFields, evidenceCount: number): RoutingInput => ({
  severity: fields.severity,
  weaponOrImmediateThreat: fields.weaponOrImmediateThreat,
  isRepeatIncident: fields.isRepeatIncident,
  hasEvidence: evidenceCount > 0,
});

export function evaluateRouting(input: RoutingInput): RoutingResult {
  // A weapon always means emergency; an unrated report takes the gentlest path, and an
  // operator reviews every filed report anyway.
  const severity: Severity = input.weaponOrImmediateThreat
    ? 'emergency'
    : (input.severity ?? 'low');
  const rule = routerRules.find(
    (candidate) =>
      candidate.severity === severity &&
      (candidate.hasEvidence === undefined || candidate.hasEvidence === input.hasEvidence),
  );
  if (!rule) throw new Error(`No router rule matches severity ${severity}`);

  const expedited = severity === 'medium' && input.isRepeatIncident;
  return {
    ruleId: rule.id,
    rulesetVersion: ROUTER_RULESET_VERSION,
    responder: rule.responder,
    confirmationRequired: rule.confirmationRequired,
    autoDispatch: rule.autoDispatch,
    queue: expedited ? 'expedited' : rule.queue,
    emergency: severity === 'emergency',
  };
}

const QUEUE_RANK: Record<QueuePriority, number> = {
  jumps_queue: 0,
  fast_laned: 1,
  expedited: 2,
  normal: 3,
};

/** Sort key: lower comes first in the operator queue. */
export const queuePriorityRank = (queue: QueuePriority) => QUEUE_RANK[queue];

// --- Advisory recommendation fixture ---

export const RECOMMENDATION_SOURCE = 'simulated-local-v1';

export const recommendationActions = ['request_more_evidence', 'transfer_to_ngo', 'none'] as const;
export type RecommendationAction = (typeof recommendationActions)[number];

export type RecommendationInput = {
  category: ReportCategory;
  severity: Severity | null;
  description: string;
};

export type RecommendationResult = {
  action: RecommendationAction;
  status: 'suggested' | 'abstained';
  confidence: number;
  rationale: string;
  source: string;
};

const EVIDENCE_WORDS = [
  'evidence',
  'video',
  'photo',
  'recording',
  'dowód',
  'nagranie',
  'zdjęcie',
  'film',
];
const NGO_CATEGORIES: readonly ReportCategory[] = [
  'verbal_harassment',
  'physical_intimidation',
  'discrimination',
  'online_harassment',
];

const mentionsEvidence = (description: string) => {
  const text = description.toLocaleLowerCase('pl');
  return EVIDENCE_WORDS.some((word) => text.includes(word));
};

/**
 * A simulated, rule-based "AI" suggestion computed once at filing from metadata only (never
 * media). It never suggests cancellation or police, and residents never see it.
 */
export function recommend(input: RecommendationInput): RecommendationResult {
  const base = { confidence: 0.5, source: RECOMMENDATION_SOURCE };
  if (mentionsEvidence(input.description)) {
    return {
      ...base,
      action: 'request_more_evidence',
      status: 'suggested',
      rationale: 'The description mentions evidence that has not been attached yet.',
    };
  }
  if (
    NGO_CATEGORIES.includes(input.category) &&
    (input.severity === 'low' || input.severity === 'medium')
  ) {
    return {
      ...base,
      action: 'transfer_to_ngo',
      status: 'suggested',
      rationale: 'Lower-severity harassment is usually best supported by a community organisation.',
    };
  }
  return {
    ...base,
    action: 'none',
    status: 'abstained',
    rationale: 'No rule applies to this report.',
  };
}

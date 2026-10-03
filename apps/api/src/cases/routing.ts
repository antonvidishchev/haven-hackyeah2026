import { createHash } from 'node:crypto';
import {
  evaluateRouting,
  recommend,
  routerRules,
  routingInput,
  type RecommendationInput,
  type RecommendationResult,
  type ReportFields,
  type RoutingInput,
  type RoutingResult,
} from '@haven/shared';
import type { AppConfig } from '../config/env.js';

/** sha256 hex of a value's JSON. */
export const sha256Json = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Identifies the exact rules a decision was made with. */
export const ROUTER_RULESET_DIGEST = sha256Json(routerRules);

export type PlannedRecommendation = RecommendationResult & {
  inputHash: string;
  outputHash: string;
};

/** Everything filing writes besides the report itself, computed from the frozen inputs. */
export type FilingPlan = {
  input: RoutingInput;
  result: RoutingResult;
  rulesetDigest: string;
  recommendation: PlannedRecommendation | null;
};

export function planFiling(
  fields: ReportFields,
  evidenceCount: number,
  mode: AppConfig['AI_RECOMMENDATION_MODE'],
): FilingPlan {
  const input = routingInput(fields, evidenceCount);
  let recommendation: PlannedRecommendation | null = null;
  if (mode === 'local') {
    const recommendationInput: RecommendationInput = {
      category: fields.category,
      severity: fields.severity,
      description: fields.description,
    };
    const output = recommend(recommendationInput);
    recommendation = {
      ...output,
      inputHash: sha256Json(recommendationInput),
      outputHash: sha256Json(output),
    };
  }
  return {
    input,
    result: evaluateRouting(input),
    rulesetDigest: ROUTER_RULESET_DIGEST,
    recommendation,
  };
}

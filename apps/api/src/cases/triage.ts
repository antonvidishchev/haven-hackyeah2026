import type { CaseState, TriageStatus } from '@haven/shared';

/**
 * The SurrealQL form of `nextCaseStatus(case, { type: 'resident_update' })`: a resident's new
 * revision or evidence moves an `awaiting_resident` case back to `needs_review` (bumping its
 * version) unless the case is closed or cancelled. Spliced into the transactions that write the
 * revision, with `$param` naming the report record.
 */
export const RESIDENT_UPDATE_FROM: TriageStatus = 'awaiting_resident';
export const RESIDENT_UPDATE_TO: TriageStatus = 'needs_review';
export const TERMINAL_CASE_STATES: readonly CaseState[] = ['closed', 'cancelled'];

export const residentUpdateSurql = (param: string) =>
  `UPDATE haven_case SET
     triage_status = '${RESIDENT_UPDATE_TO}', version += 1, updated_at = time::now()
   WHERE report = $${param} AND triage_status = '${RESIDENT_UPDATE_FROM}'
     AND state NOT IN [${TERMINAL_CASE_STATES.map((s) => `'${s}'`).join(', ')}];`;

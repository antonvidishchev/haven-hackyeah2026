import { z } from 'zod';

import type { RoutingResult } from './router.js';
import {
  districtIdSchema,
  reportCategorySchema,
  severitySchema,
  type ReportState,
} from './enums.js';

export const DESCRIPTION_MAX = 10_000;
export const LOCATION_LABEL_MAX = 200;

/** The wizard's three stages, in order. */
export const REPORT_STAGES = ['what', 'where', 'evidence'] as const;
export type ReportStage = (typeof REPORT_STAGES)[number];

export const latLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const reportFieldsShape = z.object({
  category: reportCategorySchema.default('unclassified'),
  severity: severitySchema.nullable().default(null),
  weaponOrImmediateThreat: z.boolean().default(false),
  isRepeatIncident: z.boolean().default(false),
  eventTime: z.iso.datetime({ offset: true }).nullable().default(null),
  description: z.string().max(DESCRIPTION_MAX).default(''),
  location: latLngSchema.nullable().default(null),
  locationLabel: z.string().trim().max(LOCATION_LABEL_MAX).default(''),
  zoneId: districtIdSchema.nullable().default(null),
});

/**
 * Everything a resident can say about an incident. Drafts may leave all of it empty.
 * Invariant: emergency severity and "weapon or immediate threat" always go together.
 */
export const reportFieldsSchema = reportFieldsShape.superRefine((fields, ctx) => {
  if ((fields.severity === 'emergency') !== fields.weaponOrImmediateThreat) {
    ctx.addIssue({
      code: 'custom',
      path: ['weaponOrImmediateThreat'],
      message: 'Emergency severity and "weapon or immediate threat" must be set together',
    });
  }
});
export type ReportFields = z.infer<typeof reportFieldsSchema>;

export const emptyReportFields = (): ReportFields => reportFieldsSchema.parse({});

/**
 * Keeps the invariant when one side changes, as the editor does: choosing emergency ticks the
 * weapon box; ticking it sets emergency; unticking it steps emergency down to high.
 */
export function linkEmergency(
  fields: ReportFields,
  change: Partial<Pick<ReportFields, 'severity' | 'weaponOrImmediateThreat'>>,
): ReportFields {
  if (change.severity !== undefined) {
    return {
      ...fields,
      severity: change.severity,
      weaponOrImmediateThreat: change.severity === 'emergency',
    };
  }
  if (change.weaponOrImmediateThreat !== undefined) {
    const weapon = change.weaponOrImmediateThreat;
    const severity = weapon
      ? 'emergency'
      : fields.severity === 'emergency'
        ? 'high'
        : fields.severity;
    return { ...fields, weaponOrImmediateThreat: weapon, severity };
  }
  return fields;
}

export type FilingGap = 'district' | 'place' | 'details';

/** What the location still needs before filing: a district, and a pin or a place description. */
export function locationFilingGaps(fields: ReportFields): FilingGap[] {
  const gaps: FilingGap[] = [];
  if (!fields.zoneId) gaps.push('district');
  if (!fields.location && !fields.locationLabel.trim()) gaps.push('place');
  return gaps;
}

/** Everything still missing before filing. The server is the authority; the UI shows it live. */
export function filingGaps(fields: ReportFields, evidenceCount: number): FilingGap[] {
  const gaps = locationFilingGaps(fields);
  if (!fields.description.trim() && evidenceCount === 0) gaps.push('details');
  return gaps;
}

export const canSubmitReport = (fields: ReportFields, evidenceCount: number) =>
  filingGaps(fields, evidenceCount).length === 0;

/** Fields a resident can't change once the report is filed. */
export const LOCKED_AFTER_FILING = [
  'severity',
  'weaponOrImmediateThreat',
  'isRepeatIncident',
] as const;
export type LockedField = (typeof LOCKED_AFTER_FILING)[number];

export class LockedFieldError extends Error {
  constructor(readonly fields: LockedField[]) {
    super(`These fields can't change after filing: ${fields.join(', ')}`);
    this.name = 'LockedFieldError';
  }
}

/** Throws `LockedFieldError` when a filed report's locked fields would change. */
export function assertEditableChange(
  state: ReportState,
  previous: ReportFields,
  next: ReportFields,
): void {
  if (state !== 'submitted') return;
  const changed = LOCKED_AFTER_FILING.filter((field) => previous[field] !== next[field]);
  if (changed.length > 0) throw new LockedFieldError(changed);
}

/** `HV-YYYY-NNNNNN`, allocated when a report is filed. */
export const REPORT_REFERENCE_PATTERN = /^HV-\d{4}-\d{6}$/;
export const formatReportReference = (year: number, sequence: number) =>
  `HV-${year}-${String(sequence).padStart(6, '0')}`;

// --- API contract ---

export const reportIdSchema = z.string().regex(/^[a-z0-9]{1,40}$/);

export const updateReportRequestSchema = z.object({
  expectedRevision: z.number().int().min(1),
  fields: reportFieldsSchema,
});
export type UpdateReportRequest = z.infer<typeof updateReportRequestSchema>;

export const submitReportRequestSchema = z.object({
  expectedRevision: z.number().int().min(1),
});
export type SubmitReportRequest = z.infer<typeof submitReportRequestSchema>;

/** The verification is a simulated stand-in; the resident must tick it. */
export const escalateReportRequestSchema = z.object({
  verificationConfirmed: z.literal(true),
});
export type EscalateReportRequest = z.infer<typeof escalateReportRequestSchema>;

export type RevisionNote = 'created' | 'edited' | 'evidence_added' | 'filed' | 'escalated';

export type ReportRevision = {
  revision: number;
  note: RevisionNote;
  createdAt: string;
};

export type EvidenceItem = {
  id: string;
  fileName: string;
  mediaType: string;
  byteSize: number;
  sha256: string;
  createdAt: string;
};

/** Residents see a message's kind, body and time only (from Phase 7). */
export type ResidentMessage = {
  id: string;
  kind: 'request_information' | 'comment' | 'cancellation_notice';
  body: string;
  createdAt: string;
};

export type ReportSummary = {
  id: string;
  reference: string | null;
  state: ReportState;
  category: ReportFields['category'];
  descriptionExcerpt: string;
  evidenceCount: number;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
};

export type ReportDetail = {
  id: string;
  reference: string | null;
  state: ReportState;
  revision: number;
  fields: ReportFields;
  evidence: EvidenceItem[];
  revisions: ReportRevision[];
  messages: ResidentMessage[];
  /** The Smart Router's result, frozen at filing; null for drafts. */
  routing: RoutingResult | null;
  escalated: boolean;
  escalatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
};

export type ReportListResponse = { items: ReportSummary[]; nextCursor: string | null };

export const reportListQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type TimelineEvent = { kind: RevisionNote; revision: number; at: string };

/** The History timeline, newest first. Consecutive autosaves collapse into one "edited" entry. */
export function reportTimeline(revisions: readonly ReportRevision[]): TimelineEvent[] {
  const ordered = [...revisions].sort((a, b) => a.revision - b.revision);
  const events: TimelineEvent[] = [];
  for (const { revision, note, createdAt } of ordered) {
    const last = events.at(-1);
    if (note === 'edited' && last?.kind === 'edited') {
      events[events.length - 1] = { kind: 'edited', revision, at: createdAt };
    } else {
      events.push({ kind: note, revision, at: createdAt });
    }
  }
  return events.reverse();
}

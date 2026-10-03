import { z } from 'zod';

import type { Role } from './enums.js';

/** Every state change Haven records in the append-only audit trail. */
export const auditActions = [
  'auth.login',
  'auth.login_failed',
  'report.created',
  'report.revised',
  'report.submitted',
  'report.escalated',
  'evidence.uploaded',
  'evidence.viewed',
  'case.promoted',
  'case.cancelled',
  'case.replied',
  'case.claimed',
  'case.action_recorded',
  'case.closed',
] as const;
export const auditActionSchema = z.enum(auditActions);
export type AuditAction = z.infer<typeof auditActionSchema>;

export const auditSubjectTypes = ['principal', 'report', 'evidence', 'haven_case'] as const;
export type AuditSubjectType = (typeof auditSubjectTypes)[number];
export type AuditSubject = { type: AuditSubjectType; id: string };

/** Ids, enums, counts and lengths only: never free text, message bodies or usernames. */
export type AuditMetaValue = string | number | boolean | null;
export type AuditMeta = Record<string, AuditMetaValue>;

/** `anonymous` means nobody was signed in, e.g. a failed sign-in. */
export type AuditActorRole = Role | 'anonymous';

export type AuditEntry = {
  id: string;
  occurredAt: string;
  actorId: string | null;
  actorName: string | null;
  actorRole: AuditActorRole;
  action: AuditAction;
  subject: AuditSubject | null;
  meta: AuditMeta;
};

export type AuditListResponse = { items: AuditEntry[]; nextCursor: string | null };

export const AUDIT_PAGE_SIZE = 50;

export const auditQuerySchema = z.object({
  action: auditActionSchema.optional(),
  actor: z
    .string()
    .regex(/^[a-z0-9_-]{1,64}$/)
    .optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(AUDIT_PAGE_SIZE),
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;

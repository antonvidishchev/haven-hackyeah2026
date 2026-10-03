import { z } from 'zod';

export const roles = ['guest', 'resident', 'operator', 'official', 'admin'] as const;
export const roleSchema = z.enum(roles);
export type Role = z.infer<typeof roleSchema>;

export const staffRoles = ['operator', 'official', 'admin'] as const satisfies readonly Role[];
export const isStaffRole = (role: Role | null | undefined): boolean =>
  role != null && (staffRoles as readonly Role[]).includes(role);

export const organizationIds = [
  'police_municipal',
  'professional_paid',
  'community_volunteer',
] as const;
export const organizationIdSchema = z.enum(organizationIds);
export type OrganizationId = z.infer<typeof organizationIdSchema>;

export const reportCategories = [
  'unclassified',
  'verbal_harassment',
  'physical_intimidation',
  'threat',
  'discrimination',
  'online_harassment',
  'vandalism_hate_symbols',
  'other',
] as const;
export const reportCategorySchema = z.enum(reportCategories);
export type ReportCategory = z.infer<typeof reportCategorySchema>;

export const severities = ['low', 'medium', 'high', 'emergency'] as const;
export const severitySchema = z.enum(severities);
export type Severity = z.infer<typeof severitySchema>;

export const reportStates = ['draft', 'submitted'] as const;
export type ReportState = (typeof reportStates)[number];

export const caseStates = ['open', 'in_review', 'closed', 'cancelled'] as const;
export type CaseState = (typeof caseStates)[number];

export const triageStatuses = ['needs_review', 'awaiting_resident', 'handled'] as const;
export type TriageStatus = (typeof triageStatuses)[number];

export const queuePriorities = ['normal', 'expedited', 'fast_laned', 'jumps_queue'] as const;
export type QueuePriority = (typeof queuePriorities)[number];

/** Kraków's 18 districts, by Roman numeral. */
export const districtIds = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
  'XIII',
  'XIV',
  'XV',
  'XVI',
  'XVII',
  'XVIII',
] as const;
export const districtIdSchema = z.enum(districtIds);
export type DistrictId = z.infer<typeof districtIdSchema>;

export const supportResourceKinds = [
  'legal_aid',
  'translation',
  'psychological_support',
  'victim_support',
  'ngo',
  'helpline',
  'community_mediation',
  'digital_safety',
] as const;
export const supportResourceKindSchema = z.enum(supportResourceKinds);
export type SupportResourceKind = z.infer<typeof supportResourceKindSchema>;

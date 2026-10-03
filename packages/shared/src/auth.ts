import { z } from 'zod';

import { organizationIdSchema, roleSchema, type OrganizationId, type Role } from './enums.js';

export const loginRequestSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(256),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const sessionPrincipalSchema = z.object({
  id: z.string(),
  role: roleSchema,
  name: z.string(),
  organizationId: organizationIdSchema.optional(),
});
export type SessionPrincipal = z.infer<typeof sessionPrincipalSchema>;

export const authResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
  principal: sessionPrincipalSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const sessionResponseSchema = z.object({ principal: sessionPrincipalSchema });
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

export type DemoAccount = {
  username: string;
  /** Demo fixture only — these accounts are documented in the README. */
  password: string;
  role: Exclude<Role, 'guest'>;
  name: string;
  organizationId?: OrganizationId;
};

/** The seeded demo accounts. Passwords are published on purpose. */
export const demoAccounts: readonly DemoAccount[] = [
  { username: 'resident', password: 'HavenResident1!', role: 'resident', name: 'Local Resident' },
  { username: 'resident2', password: 'HavenResident2!', role: 'resident', name: 'Second Resident' },
  { username: 'operator', password: 'HavenOperator1!', role: 'operator', name: 'Local Operator' },
  { username: 'admin', password: 'HavenAdmin1!', role: 'admin', name: 'Local Administrator' },
  {
    username: 'official-police',
    password: 'HavenOfficial1!',
    role: 'official',
    name: 'Police Liaison Official',
    organizationId: 'police_municipal',
  },
  {
    username: 'official-support',
    password: 'HavenOfficial1!',
    role: 'official',
    name: 'Support Services Official',
    organizationId: 'professional_paid',
  },
  {
    username: 'official-volunteer',
    password: 'HavenOfficial1!',
    role: 'official',
    name: 'Volunteer Network Official',
    organizationId: 'community_volunteer',
  },
];

export const SESSION_TTL_SECONDS = 8 * 60 * 60;
export const GUEST_TTL_SECONDS = 30 * 24 * 60 * 60;

import { jwtVerify, SignJWT } from 'jose';
import { organizationIdSchema, roleSchema, type SessionPrincipal } from '@haven/shared';
import { z } from 'zod';

const claimsSchema = z.object({
  sub: z.string().min(1),
  role: roleSchema,
  name: z.string(),
  org: organizationIdSchema.optional(),
});

const ISSUER = 'haven-api';
const encoder = new TextEncoder();

export async function signSessionToken(
  principal: SessionPrincipal,
  secret: string,
  ttlSeconds: number,
  now = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const expiresAt = new Date((issuedAt + ttlSeconds) * 1000);
  const token = await new SignJWT({
    role: principal.role,
    name: principal.name,
    ...(principal.organizationId ? { org: principal.organizationId } : {}),
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(principal.id)
    .setIssuer(ISSUER)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + ttlSeconds)
    .sign(encoder.encode(secret));
  return { token, expiresAt };
}

/** Returns the principal for a valid token, or null for anything else. */
export async function verifySessionToken(
  token: string,
  secret: string,
  now = new Date(),
): Promise<SessionPrincipal | null> {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(secret), {
      algorithms: ['HS256'],
      issuer: ISSUER,
      currentDate: now,
    });
    const claims = claimsSchema.parse(payload);
    return {
      id: claims.sub,
      role: claims.role,
      name: claims.name,
      ...(claims.org ? { organizationId: claims.org } : {}),
    };
  } catch {
    return null;
  }
}

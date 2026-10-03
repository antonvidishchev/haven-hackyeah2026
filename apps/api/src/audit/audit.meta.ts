import { createHmac } from 'node:crypto';
import type { AuditMeta, AuditMetaValue } from '@haven/shared';

/** Ids, enum values, media types and hashes: no spaces, so no sentences. */
const TOKEN = /^[A-Za-z0-9_.:/+-]{1,64}$/;
const KEY = /^[a-z][A-Za-z0-9]{0,39}$/;
const MAX_KEYS = 16;

export class AuditMetaError extends Error {}

/**
 * Checks that audit meta carries no free text, message bodies or personal data: only
 * numbers, booleans, null and single tokens. Undefined entries are dropped. Throws on
 * anything else, because that is a programming error, not a user error.
 */
export function sanitizeAuditMeta(meta: Record<string, unknown>): AuditMeta {
  const entries = Object.entries(meta).filter(([, value]) => value !== undefined);
  if (entries.length > MAX_KEYS) throw new AuditMetaError(`Audit meta has over ${MAX_KEYS} keys`);
  const clean: Record<string, AuditMetaValue> = {};
  for (const [key, value] of entries) {
    if (!KEY.test(key)) throw new AuditMetaError(`Audit meta key "${key}" is not allowed`);
    if (
      value === null ||
      typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value)) ||
      (typeof value === 'string' && TOKEN.test(value))
    ) {
      clean[key] = value;
    } else {
      throw new AuditMetaError(`Audit meta "${key}" must be an id, enum, number or boolean`);
    }
  }
  return clean;
}

/**
 * A keyed digest of a username for failed sign-ins: repeated attempts on one account are
 * visible, but the log never holds the name, and a dictionary can't reverse it.
 */
export function usernameDigest(username: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(username.trim().toLowerCase())
    .digest('hex')
    .slice(0, 32);
}

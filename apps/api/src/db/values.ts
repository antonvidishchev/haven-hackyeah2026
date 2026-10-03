import { randomInt } from 'node:crypto';
import type { DateTime } from 'surrealdb';

/** Millisecond ISO string for API responses. */
export const toIso = (value: DateTime): string => value.toDate().toISOString();

export const toIsoOrNull = (value: DateTime | undefined | null): string | null =>
  value ? toIso(value) : null;

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** A record id in SurrealDB's own style: 20 characters of [a-z0-9]. */
export function randomRecordId(length = 20): string {
  let id = '';
  for (let i = 0; i < length; i++) id += ID_ALPHABET[randomInt(ID_ALPHABET.length)];
  return id;
}

import type { QueryFn } from './migrations.js';

/** Idempotent demo fixtures. Later phases add users, organisations and resources here. */
export async function seed(_query: QueryFn, log: (message: string) => void = () => {}) {
  log('nothing to seed yet');
}

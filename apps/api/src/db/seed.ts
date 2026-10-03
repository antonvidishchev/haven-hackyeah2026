import { demoAccounts } from '@haven/shared';
import { principalRecord } from '../auth/principal.repository.js';
import { hashPassword } from '../auth/password.js';
import type { QueryFn } from './migrations.js';
import { seedReportsFixtures } from './seed-reports.js';

/** Idempotent demo fixtures. Re-running refreshes them to their documented values. */
export async function seed(query: QueryFn, log: (message: string) => void = () => {}) {
  for (const account of demoAccounts) {
    await query('UPSERT $id MERGE $data', {
      id: principalRecord(account.username),
      data: {
        kind: account.role,
        username: account.username,
        password_hash: await hashPassword(account.password),
        display_name: account.name,
        organization_id: account.organizationId,
      },
    });
  }
  log(`seeded ${demoAccounts.length} demo accounts`);

  const reports = await seedReportsFixtures(query);
  log(`created ${reports} seed report(s)`);
}

import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export type QueryFn = <R extends unknown[] = unknown[]>(
  sql: string,
  vars?: Record<string, unknown>,
) => Promise<R>;

export interface Migration {
  name: string;
  sql: string;
  checksum: string;
}

const MIGRATION_FILE = /^\d{4}_[a-z0-9_]+\.surql$/;

export const MIGRATIONS_DIR = resolve(import.meta.dirname, '../../migrations');

export async function loadMigrations(dir = MIGRATIONS_DIR): Promise<Migration[]> {
  const files = (await readdir(dir)).filter((f) => MIGRATION_FILE.test(f)).sort();
  return Promise.all(
    files.map(async (file) => {
      const sql = await readFile(join(dir, file), 'utf8');
      return {
        name: file.replace(/\.surql$/, ''),
        sql,
        checksum: createHash('sha256').update(sql).digest('hex'),
      };
    }),
  );
}

async function appliedMigrations(query: QueryFn): Promise<Map<string, string>> {
  const [info] = await query<[{ tables: Record<string, unknown> }]>('INFO FOR DB');
  if (!info?.tables || !('schema_migration' in info.tables)) return new Map();
  const [rows] = await query<[{ name: string; checksum: string }[]]>(
    'SELECT name, checksum FROM schema_migration ORDER BY name',
  );
  return new Map(rows.map((r) => [r.name, r.checksum]));
}

/**
 * Applies pending migrations in order, each in its own transaction together with its
 * `schema_migration` record. Refuses to run if an applied migration was edited.
 */
export async function migrate(
  query: QueryFn,
  migrations: Migration[],
  log: (message: string) => void = () => {},
): Promise<string[]> {
  const applied = await appliedMigrations(query);

  for (const m of migrations) {
    const checksum = applied.get(m.name);
    if (checksum !== undefined && checksum !== m.checksum) {
      throw new Error(`Migration ${m.name} was modified after it was applied (checksum mismatch)`);
    }
  }

  const pending = migrations.filter((m) => !applied.has(m.name));
  for (const m of pending) {
    log(`applying ${m.name}`);
    await query(
      `BEGIN TRANSACTION;
${m.sql}
CREATE schema_migration CONTENT { name: $name, checksum: $checksum };
COMMIT TRANSACTION;`,
      { name: m.name, checksum: m.checksum },
    );
  }
  return pending.map((m) => m.name);
}

import { Surreal } from 'surrealdb';
import { loadConfig } from '../config/env.js';
import { connectSurreal, ensureDatabase } from './connect.js';
import { loadMigrations, migrate, type QueryFn } from './migrations.js';
import { seed } from './seed.js';

const command = process.argv[2];
const log = (message: string) => console.log(`[db] ${message}`);

async function main() {
  if (!command || !['migrate', 'seed', 'setup', 'reset'].includes(command)) {
    console.error('Usage: cli.ts <migrate|seed|setup|reset>');
    process.exit(2);
  }

  const config = loadConfig();
  const db = new Surreal();
  await connectSurreal(db, config, false);
  const query: QueryFn = (sql, vars) => db.query(sql, vars).collect() as never;

  try {
    if (command === 'reset') {
      if (process.env.HAVEN_CONFIRM_RESET !== 'yes') {
        throw new Error('Refusing to reset: set HAVEN_CONFIRM_RESET=yes to wipe the database');
      }
      log(`removing database ${config.SURREAL_NS}/${config.SURREAL_DB}`);
      await query(`REMOVE DATABASE IF EXISTS ${config.SURREAL_DB}`);
      await ensureDatabase(db, config);
    }
    if (command === 'migrate' || command === 'setup' || command === 'reset') {
      const applied = await migrate(query, await loadMigrations(), log);
      log(applied.length ? `applied ${applied.length} migration(s)` : 'schema is up to date');
    }
    if (command !== 'migrate') {
      await seed(query, log);
    }
  } finally {
    await db.close();
  }
}

main().catch((error: unknown) => {
  console.error(`[db] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

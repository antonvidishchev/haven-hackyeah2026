import type { Surreal } from 'surrealdb';
import type { AppConfig } from '../config/env.js';

type SurrealConfig = Pick<
  AppConfig,
  'SURREAL_URL' | 'SURREAL_NS' | 'SURREAL_DB' | 'SURREAL_USER' | 'SURREAL_PASS'
>;

/**
 * Connects as the root user, makes sure the namespace and database exist (SurrealDB 3
 * refuses to `USE` undefined ones), then selects them.
 */
export async function connectSurreal(db: Surreal, config: SurrealConfig, reconnect = true) {
  await db.connect(config.SURREAL_URL, {
    authentication: { username: config.SURREAL_USER, password: config.SURREAL_PASS },
    reconnect,
  });
  await ensureDatabase(db, config);
}

export async function ensureDatabase(db: Surreal, config: SurrealConfig) {
  // NS/DB names are validated as \w+ by the config schema, so interpolation is safe.
  await db
    .query(
      `DEFINE NAMESPACE IF NOT EXISTS ${config.SURREAL_NS};
       USE NS ${config.SURREAL_NS};
       DEFINE DATABASE IF NOT EXISTS ${config.SURREAL_DB};`,
    )
    .collect();
  await db.use({ namespace: config.SURREAL_NS, database: config.SURREAL_DB });
}

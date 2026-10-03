import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { isRetryableConflict, Surreal } from 'surrealdb';
import { APP_CONFIG, type AppConfig } from '../config/env.js';
import { connectSurreal } from './connect.js';

const TRANSACTION_ATTEMPTS = 4;

type Response = { success: true; result: unknown } | { success: false; error: unknown };

@Injectable()
export class SurrealService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SurrealService.name);
  readonly db = new Surreal();

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.db.close();
  }

  async connect() {
    try {
      await connectSurreal(this.db, this.config);
    } catch (error) {
      // Keep the API up so /health/ready can report the outage; the SDK reconnects.
      this.logger.error(
        `Could not connect to SurrealDB at ${this.config.SURREAL_URL}: ${String(error)}`,
      );
    }
  }

  /** Runs SurrealQL and returns one result per statement. */
  query<R extends unknown[] = unknown[]>(sql: string, vars?: Record<string, unknown>) {
    return this.db.query<R>(sql, vars).collect();
  }

  /**
   * Runs a `BEGIN … COMMIT` script, re-running it when a concurrent transaction conflicts with
   * it (for example two filings bumping the same reference counter). A conflict aborts the
   * whole script, so it is safe to repeat. The SDK's own retry misses this case: a failed
   * transaction reports "not executed" for its first statement and the conflict only on COMMIT.
   */
  async transaction<R extends unknown[] = unknown[]>(
    sql: string,
    vars?: Record<string, unknown>,
  ): Promise<R> {
    for (let attempt = 1; ; attempt++) {
      const responses = (await this.db.query(sql, vars).responses()) as Response[];
      const errors = responses.flatMap((response) => (response.success ? [] : [response.error]));
      if (errors.length === 0) {
        return responses.map((response) => (response.success ? response.result : null)) as R;
      }
      if (attempt === TRANSACTION_ATTEMPTS || !errors.some(isRetryableConflict)) throw errors[0];
      await new Promise((resolve) => setTimeout(resolve, 10 * attempt + Math.random() * 20));
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!this.db.isConnected) return false;
    try {
      await this.db.query('RETURN true').collect();
      return true;
    } catch {
      return false;
    }
  }
}

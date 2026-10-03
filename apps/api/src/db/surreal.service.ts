import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { Surreal } from 'surrealdb';
import { APP_CONFIG, type AppConfig } from '../config/env.js';
import { connectSurreal } from './connect.js';

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

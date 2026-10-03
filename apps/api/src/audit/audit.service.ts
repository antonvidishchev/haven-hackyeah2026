import { Injectable, Logger } from '@nestjs/common';
import type {
  AuditAction,
  AuditEntry,
  AuditListResponse,
  AuditMeta,
  AuditQuery,
  AuditSubject,
  SessionPrincipal,
} from '@haven/shared';
import { apiError } from '../common/http-exception.filter.js';
import { toIso } from '../db/values.js';
import { decodeCursor, encodeCursor } from '../reports/cursor.js';
import { AuditMetaError, sanitizeAuditMeta } from './audit.meta.js';
import { type AuditRow, AuditRepository } from './audit.repository.js';

function toEntry(row: AuditRow): AuditEntry {
  return {
    id: String(row.id.id),
    occurredAt: toIso(row.occurred_at),
    actorId: row.actor ? String(row.actor.id) : null,
    actorName: row.actor_name ?? null,
    actorRole: row.actor_role,
    action: row.action,
    subject:
      row.subject_type && row.subject_id ? { type: row.subject_type, id: row.subject_id } : null,
    meta: row.meta,
  };
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly audit: AuditRepository) {}

  /**
   * Records a state change that has already happened, so it never throws: the change is
   * committed either way. Meta that fails the free-text check is dropped and flagged, and a
   * failed write is logged.
   */
  async record(
    actor: SessionPrincipal | null,
    action: AuditAction,
    subject: AuditSubject | null,
    meta: Record<string, unknown> = {},
  ): Promise<void> {
    let clean: AuditMeta;
    try {
      clean = sanitizeAuditMeta(meta);
    } catch (error) {
      if (!(error instanceof AuditMetaError)) throw error;
      this.logger.error({ event: 'audit.meta_rejected', action, reason: error.message });
      clean = { metaRejected: true };
    }
    try {
      await this.audit.append({
        actorId: actor?.id ?? null,
        actorRole: actor?.role ?? 'anonymous',
        action,
        subject,
        meta: clean,
      });
    } catch (error) {
      this.logger.error({ event: 'audit.write_failed', action, subject, error: String(error) });
    }
  }

  async list(query: AuditQuery): Promise<AuditListResponse> {
    const cursor = query.cursor === undefined ? null : decodeCursor(query.cursor);
    if (query.cursor !== undefined && !cursor) {
      throw apiError(400, 'validation_failed', 'The request is not valid', [
        { path: ['cursor'], message: 'Invalid cursor' },
      ]);
    }
    const rows = await this.audit.list(
      { action: query.action, actorId: query.actor },
      cursor,
      query.limit + 1,
    );
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return {
      items: page.map(toEntry),
      nextCursor:
        rows.length > query.limit && last
          ? encodeCursor({ createdAt: last.occurred_at.toISOString(), id: String(last.id.id) })
          : null,
    };
  }
}

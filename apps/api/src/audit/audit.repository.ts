import { Injectable } from '@nestjs/common';
import type { AuditAction, AuditActorRole, AuditMeta, AuditSubjectType } from '@haven/shared';
import { DateTime, RecordId } from 'surrealdb';
import { principalRecord } from '../auth/principal.repository.js';
import { SurrealService } from '../db/surreal.service.js';
import type { ReportCursor } from '../reports/cursor.js';

export type AuditRow = {
  id: RecordId<'audit_event'>;
  actor?: RecordId<'principal'>;
  actor_name?: string;
  actor_role: AuditActorRole;
  action: AuditAction;
  subject_type?: AuditSubjectType;
  subject_id?: string;
  meta: AuditMeta;
  occurred_at: DateTime;
};

export type AuditWrite = {
  actorId: string | null;
  actorRole: AuditActorRole;
  action: AuditAction;
  subject: { type: AuditSubjectType; id: string } | null;
  meta: AuditMeta;
};

const auditRecord = (id: string) => new RecordId('audit_event', id);

/** Append-only: there is deliberately no update or delete here (the table refuses both). */
@Injectable()
export class AuditRepository {
  constructor(private readonly surreal: SurrealService) {}

  async append(write: AuditWrite): Promise<void> {
    await this.surreal.query(
      `CREATE audit_event CONTENT {
         actor: $actor, actor_role: $role, action: $action,
         subject_type: $subject_type, subject_id: $subject_id, meta: $meta
       }`,
      {
        actor: write.actorId ? principalRecord(write.actorId) : undefined,
        role: write.actorRole,
        action: write.action,
        subject_type: write.subject?.type,
        subject_id: write.subject?.id,
        meta: write.meta,
      },
    );
  }

  /** Newest first, by time then id. */
  async list(
    filter: { action?: AuditAction; actorId?: string },
    cursor: ReportCursor | null,
    limit: number,
  ): Promise<AuditRow[]> {
    const where = [
      filter.action ? 'action = $action' : null,
      filter.actorId ? 'actor = $actor' : null,
      cursor ? '(occurred_at < $at OR (occurred_at = $at AND id < $after))' : null,
    ].filter(Boolean);
    const [rows] = await this.surreal.query<[AuditRow[]]>(
      `SELECT *, actor.display_name AS actor_name FROM audit_event
       ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY occurred_at DESC, id DESC LIMIT $limit`,
      {
        limit,
        ...(filter.action ? { action: filter.action } : {}),
        ...(filter.actorId ? { actor: principalRecord(filter.actorId) } : {}),
        ...(cursor ? { at: new DateTime(cursor.createdAt), after: auditRecord(cursor.id) } : {}),
      },
    );
    return rows;
  }
}

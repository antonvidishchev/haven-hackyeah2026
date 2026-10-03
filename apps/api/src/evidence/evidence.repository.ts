import { Injectable } from '@nestjs/common';
import type { EvidenceItem, ReportState } from '@haven/shared';
import { type DateTime, RecordId } from 'surrealdb';
import { principalRecord } from '../auth/principal.repository.js';
import { residentUpdateSurql } from '../cases/triage.js';
import { SurrealService } from '../db/surreal.service.js';
import { toIso } from '../db/values.js';

export type EvidenceRow = {
  id: RecordId<'evidence'>;
  report: RecordId<'report'>;
  owner: RecordId<'principal'>;
  file_name: string;
  media_type: string;
  byte_size: number;
  sha256: string;
  storage_path: string;
  created_at: DateTime;
};

/** An evidence row with its report's state, for access and lock checks. */
export type EvidenceWithReport = EvidenceRow & { report_state: ReportState };

export type NewEvidence = {
  id: string;
  reportId: string;
  ownerId: string;
  fileName: string;
  mediaType: string;
  byteSize: number;
  sha256: string;
  storagePath: string;
};

export const evidenceRecord = (id: string) => new RecordId('evidence', id);
const reportRecord = (id: string) => new RecordId('report', id);

export function toEvidenceItem(row: EvidenceRow): EvidenceItem {
  return {
    id: String(row.id.id),
    fileName: row.file_name,
    mediaType: row.media_type,
    byteSize: row.byte_size,
    sha256: row.sha256,
    createdAt: toIso(row.created_at),
  };
}

@Injectable()
export class EvidenceRepository {
  constructor(private readonly surreal: SurrealService) {}

  async listForReport(reportId: string): Promise<EvidenceItem[]> {
    const [rows] = await this.surreal.query<[EvidenceRow[]]>(
      'SELECT * FROM evidence WHERE report = $report ORDER BY created_at ASC, id ASC',
      { report: reportRecord(reportId) },
    );
    return rows.map(toEvidenceItem);
  }

  async findWithReport(id: string): Promise<EvidenceWithReport | null> {
    const [rows] = await this.surreal.query<[EvidenceWithReport[]]>(
      'SELECT *, report.state AS report_state FROM $id',
      { id: evidenceRecord(id) },
    );
    return rows[0] ?? null;
  }

  /**
   * Stores the row and touches the report. A filed report also gets an `evidence_added`
   * revision (and a case awaiting the resident goes back to review); drafts keep their
   * revision so the editor's next autosave doesn't conflict.
   */
  async create(evidence: NewEvidence): Promise<EvidenceItem> {
    const results = await this.surreal.query<unknown[]>(
      `BEGIN TRANSACTION;
       LET $created = CREATE $id CONTENT {
         report: $report, owner: $owner, file_name: $file_name, media_type: $media_type,
         byte_size: $byte_size, sha256: $sha256, storage_path: $storage_path
       };
       LET $current = SELECT state, current_revision, fields FROM ONLY $report;
       IF $current.state = 'submitted' {
         UPDATE $report SET current_revision += 1, updated_at = time::now();
         CREATE report_revision CONTENT {
           report: $report, revision: $current.current_revision + 1, fields: $current.fields,
           note: 'evidence_added', author: $owner
         };
         ${residentUpdateSurql('report')}
       } ELSE {
         UPDATE $report SET updated_at = time::now();
       };
       RETURN $created[0];
       COMMIT TRANSACTION;`,
      {
        id: evidenceRecord(evidence.id),
        report: reportRecord(evidence.reportId),
        owner: principalRecord(evidence.ownerId),
        file_name: evidence.fileName,
        media_type: evidence.mediaType,
        byte_size: evidence.byteSize,
        sha256: evidence.sha256,
        storage_path: evidence.storagePath,
      },
    );
    const row = results.at(-2) as EvidenceRow | undefined;
    if (!row) throw new Error('Evidence was not created');
    return toEvidenceItem(row);
  }

  /** Deletes the row only while its report is still a draft. Returns whether it was deleted. */
  async deleteFromDraft(id: string): Promise<boolean> {
    const [rows] = await this.surreal.query<[EvidenceRow[]]>(
      "DELETE $id WHERE report.state = 'draft' RETURN BEFORE",
      { id: evidenceRecord(id) },
    );
    return rows.length > 0;
  }
}

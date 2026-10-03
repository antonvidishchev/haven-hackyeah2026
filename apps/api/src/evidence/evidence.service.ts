import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  safeFileName,
  validateEvidence,
  type EvidenceItem,
  type EvidenceRejection,
  type SessionPrincipal,
} from '@haven/shared';
import type { MultipartFile } from '@fastify/multipart';
import type { Readable } from 'node:stream';
import { CasesRepository } from '../cases/cases.repository.js';
import { apiError } from '../common/http-exception.filter.js';
import { APP_CONFIG, type AppConfig } from '../config/env.js';
import { randomRecordId } from '../db/values.js';
import { ReportsService } from '../reports/reports.service.js';
import { type EvidenceWithReport, EvidenceRepository } from './evidence.repository.js';
import { EvidenceStorage } from './evidence.storage.js';
import { type ByteRange, parseRange } from './range.js';

const evidenceNotFound = () => apiError(404, 'evidence_not_found', 'We could not find that file');

export function rejectionError(rejection: EvidenceRejection, maxBytes: number) {
  switch (rejection) {
    case 'type':
      return apiError(
        415,
        'unsupported_media_type',
        'Only photos, audio and video can be attached',
      );
    case 'empty':
      return apiError(400, 'empty_file', 'This file is empty');
    case 'too_large':
      return apiError(413, 'file_too_large', 'This file is too large', { maxBytes });
  }
}

/** What the media route needs to answer: the file, its range, and the headers to send. */
export type MediaResponse =
  | {
      status: 200 | 206;
      stream: Readable;
      size: number;
      range: ByteRange | null;
      evidence: EvidenceWithReport;
    }
  | { status: 416; size: number };

@Injectable()
export class EvidenceService {
  private readonly logger = new Logger(EvidenceService.name);

  constructor(
    private readonly evidence: EvidenceRepository,
    private readonly storage: EvidenceStorage,
    private readonly reports: ReportsService,
    private readonly cases: CasesRepository,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Streams one uploaded file to disk, hashing it on the way, then records it. */
  async upload(
    principal: SessionPrincipal,
    reportId: string,
    file: MultipartFile,
  ): Promise<EvidenceItem> {
    await this.reports.findOwned(principal, reportId);
    const maxBytes = this.config.EVIDENCE_MAX_BYTES;
    const mediaType = file.mimetype;

    // Refuse the type before writing anything; drain the part so the request completes.
    if (validateEvidence({ mediaType, byteSize: 1 }, maxBytes) === 'type') {
      file.file.resume();
      throw rejectionError('type', maxBytes);
    }

    const id = randomRecordId();
    const storagePath = id;
    let written: { byteSize: number; sha256: string };
    try {
      written = await this.storage.write(storagePath, file.file);
    } catch (error) {
      await this.storage.remove(storagePath);
      if ((error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') {
        throw rejectionError('too_large', maxBytes);
      }
      throw error;
    }
    if (file.file.truncated) {
      await this.storage.remove(storagePath);
      throw rejectionError('too_large', maxBytes);
    }
    const rejection = validateEvidence({ mediaType, byteSize: written.byteSize }, maxBytes);
    if (rejection) {
      await this.storage.remove(storagePath);
      throw rejectionError(rejection, maxBytes);
    }

    try {
      return await this.evidence.create({
        id,
        reportId,
        ownerId: principal.id,
        fileName: safeFileName(file.filename),
        mediaType,
        byteSize: written.byteSize,
        sha256: written.sha256,
        storagePath,
      });
    } catch (error) {
      await this.storage.remove(storagePath);
      throw error;
    }
  }

  /** Owners may remove evidence while the report is a draft; filed evidence stays. */
  async remove(principal: SessionPrincipal, id: string): Promise<void> {
    const row = await this.evidence.findWithReport(id);
    if (!row || String(row.owner.id) !== principal.id) throw evidenceNotFound();
    if (row.report_state !== 'draft' || !(await this.evidence.deleteFromDraft(id))) {
      throw apiError(
        409,
        'evidence_locked',
        'This file is part of a filed report and can no longer be removed',
      );
    }
    await this.storage.remove(row.storage_path);
  }

  /** Opens the file (or the requested byte range) for someone allowed to see it. */
  async media(
    principal: SessionPrincipal,
    id: string,
    rangeHeader: string | undefined,
  ): Promise<MediaResponse> {
    const row = await this.evidence.findWithReport(id);
    if (!row || !(await this.canView(principal, row))) throw evidenceNotFound();

    const size = await this.storage.size(row.storage_path);
    if (size === null) {
      this.logger.error(`Evidence ${id} has a record but no file`);
      throw evidenceNotFound();
    }

    const range = parseRange(rangeHeader, size);
    // The controller answers 416 with `Content-Range: bytes */size`.
    if (range === 'unsatisfiable') return { status: 416, size };

    this.logger.log({
      event: 'evidence.view',
      actorId: principal.id,
      role: principal.role,
      evidenceId: id,
      range: range ? `${range.start}-${range.end}` : null,
    });

    return {
      status: range ? 206 : 200,
      stream: this.storage.read(row.storage_path, range ?? undefined),
      size,
      range,
      evidence: row,
    };
  }

  /**
   * The owner may view evidence. Operators and admins see it once the report is filed (drafts
   * stay private to the resident); officials only when the report's case is routed to their own
   * organisation. Everyone else is answered "not found".
   */
  private async canView(principal: SessionPrincipal, row: EvidenceWithReport): Promise<boolean> {
    if (String(row.owner.id) === principal.id) return true;
    if (principal.role === 'operator' || principal.role === 'admin') {
      return row.report_state === 'submitted';
    }
    if (principal.role === 'official' && principal.organizationId) {
      return this.cases.organizationHasReport(String(row.report.id), principal.organizationId);
    }
    return false;
  }
}

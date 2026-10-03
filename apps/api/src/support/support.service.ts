import { Injectable } from '@nestjs/common';
import {
  matchSupportResources,
  type ReportFields,
  type SessionPrincipal,
  type SupportMatchesResponse,
} from '@haven/shared';
import { apiError } from '../common/http-exception.filter.js';
import { OperatorRepository } from '../operator/operator.repository.js';
import { ReportsService } from '../reports/reports.service.js';
import { SupportRepository } from './support.repository.js';

@Injectable()
export class SupportService {
  constructor(
    private readonly support: SupportRepository,
    private readonly reports: ReportsService,
    private readonly operator: OperatorRepository,
  ) {}

  /** Matches for the resident's own filed report. */
  async forReport(principal: SessionPrincipal, id: string): Promise<SupportMatchesResponse> {
    const row = await this.reports.findOwned(principal, id);
    if (row.state !== 'submitted') {
      throw apiError(409, 'not_filed', 'File this report to see help that fits it');
    }
    return this.matchesFor(row.fields);
  }

  /** Matches for a case, so the operator sees what the resident sees. */
  async forCase(id: string): Promise<SupportMatchesResponse> {
    const row = await this.operator.findCase(id);
    if (!row) throw apiError(404, 'case_not_found', 'We could not find that case');
    return this.matchesFor(row.fields);
  }

  async matchesFor(fields: ReportFields): Promise<SupportMatchesResponse> {
    const [terms, resources] = await Promise.all([
      this.support.analyze(fields.description),
      this.support.listResources(),
    ]);
    return matchSupportResources(fields, terms, resources);
  }
}

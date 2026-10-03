import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import {
  escalateReportRequestSchema,
  reportListQuerySchema,
  submitReportRequestSchema,
  updateReportRequestSchema,
  type EscalateReportRequest,
  type SessionPrincipal,
  type SubmitReportRequest,
  type UpdateReportRequest,
} from '@haven/shared';
import type { z } from 'zod';
import { CurrentPrincipal, Roles } from '../auth/decorators.js';
import { RecordIdPipe } from '../common/id.pipe.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { ReportsService } from './reports.service.js';

export const reportIdPipe = () =>
  new RecordIdPipe('report_not_found', 'We could not find that report');

/** Residents and guests manage their own reports; staff work through cases instead. */
@Roles('guest', 'resident')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  @HttpCode(201)
  create(@CurrentPrincipal() principal: SessionPrincipal) {
    return this.reports.create(principal);
  }

  @Get()
  list(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Query(new ZodPipe(reportListQuerySchema)) query: z.infer<typeof reportListQuerySchema>,
  ) {
    return this.reports.list(principal, query);
  }

  @Get(':id')
  get(@CurrentPrincipal() principal: SessionPrincipal, @Param('id', reportIdPipe()) id: string) {
    return this.reports.get(principal, id);
  }

  @Put(':id')
  update(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', reportIdPipe()) id: string,
    @Body(new ZodPipe(updateReportRequestSchema)) body: UpdateReportRequest,
  ) {
    return this.reports.update(principal, id, body);
  }

  @Post(':id/submit')
  @HttpCode(200)
  submit(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', reportIdPipe()) id: string,
    @Body(new ZodPipe(submitReportRequestSchema)) body: SubmitReportRequest,
  ) {
    return this.reports.submit(principal, id, body);
  }

  /** The verification is simulated; the body only confirms the resident ticked it. */
  @Post(':id/escalation')
  @HttpCode(200)
  escalate(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', reportIdPipe()) id: string,
    @Body(new ZodPipe(escalateReportRequestSchema)) _body: EscalateReportRequest,
  ) {
    return this.reports.escalate(principal, id);
  }
}

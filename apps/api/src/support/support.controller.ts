import { Controller, Get, Param } from '@nestjs/common';
import type { SessionPrincipal } from '@haven/shared';
import { CurrentPrincipal, Roles } from '../auth/decorators.js';
import { caseIdPipe } from '../operator/operator.controller.js';
import { reportIdPipe } from '../reports/reports.controller.js';
import { SupportService } from './support.service.js';

/** Fictional city resources matched to a filed report. */
@Controller()
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Roles('guest', 'resident')
  @Get('reports/:id/support-matches')
  forReport(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', reportIdPipe()) id: string,
  ) {
    return this.support.forReport(principal, id);
  }

  @Roles('operator', 'admin')
  @Get('operator/cases/:id/support-matches')
  forCase(@Param('id', caseIdPipe()) id: string) {
    return this.support.forCase(id);
  }
}

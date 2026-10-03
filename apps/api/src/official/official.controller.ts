import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  claimCaseRequestSchema,
  closeCaseRequestSchema,
  recordActionRequestSchema,
  type ClaimCaseRequest,
  type SessionPrincipal,
} from '@haven/shared';
import { CurrentPrincipal, Roles } from '../auth/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { caseIdPipe } from '../operator/operator.controller.js';
import { type Close, OfficialService, type RecordAction } from './official.service.js';

/** Officials work the cases routed to their own organisation. */
@Roles('official')
@Controller('official')
export class OfficialController {
  constructor(private readonly official: OfficialService) {}

  @Get('cases')
  list(@CurrentPrincipal() principal: SessionPrincipal) {
    return this.official.list(principal);
  }

  @Get('cases/:id')
  get(@CurrentPrincipal() principal: SessionPrincipal, @Param('id', caseIdPipe()) id: string) {
    return this.official.detail(principal, id);
  }

  @Post('cases/:id/claim')
  @HttpCode(200)
  claim(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', caseIdPipe()) id: string,
    @Body(new ZodPipe(claimCaseRequestSchema)) body: ClaimCaseRequest,
  ) {
    return this.official.claim(principal, id, body);
  }

  @Post('cases/:id/actions')
  @HttpCode(200)
  recordAction(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', caseIdPipe()) id: string,
    @Body(new ZodPipe(recordActionRequestSchema)) body: RecordAction,
  ) {
    return this.official.recordAction(principal, id, body);
  }

  @Post('cases/:id/close')
  @HttpCode(200)
  close(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', caseIdPipe()) id: string,
    @Body(new ZodPipe(closeCaseRequestSchema)) body: Close,
  ) {
    return this.official.close(principal, id, body);
  }
}

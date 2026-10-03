import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import {
  cancelCaseRequestSchema,
  caseViewSchema,
  promoteCaseRequestSchema,
  replyCaseRequestSchema,
  type SessionPrincipal,
} from '@haven/shared';
import { z } from 'zod';
import { CurrentPrincipal, Roles } from '../auth/decorators.js';
import { RecordIdPipe } from '../common/id.pipe.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { type Cancel, OperatorService, type Promote, type Reply } from './operator.service.js';

export const caseIdPipe = () => new RecordIdPipe('case_not_found', 'We could not find that case');

const caseListQuerySchema = z.object({ view: caseViewSchema.default('needs_review') });

/** The operator workspace. Officials work their organisation's cases elsewhere. */
@Roles('operator', 'admin')
@Controller('operator')
export class OperatorController {
  constructor(private readonly operator: OperatorService) {}

  @Get('cases')
  list(@Query(new ZodPipe(caseListQuerySchema)) query: z.infer<typeof caseListQuerySchema>) {
    return this.operator.list(query.view);
  }

  @Get('cases/:id')
  get(@Param('id', caseIdPipe()) id: string) {
    return this.operator.detail(id);
  }

  @Post('cases/:id/promote')
  @HttpCode(200)
  promote(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', caseIdPipe()) id: string,
    @Body(new ZodPipe(promoteCaseRequestSchema)) body: Promote,
  ) {
    return this.operator.promote(principal, id, body);
  }

  @Post('cases/:id/cancel')
  @HttpCode(200)
  cancel(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', caseIdPipe()) id: string,
    @Body(new ZodPipe(cancelCaseRequestSchema)) body: Cancel,
  ) {
    return this.operator.cancel(principal, id, body);
  }

  @Post('cases/:id/reply')
  @HttpCode(200)
  reply(
    @CurrentPrincipal() principal: SessionPrincipal,
    @Param('id', caseIdPipe()) id: string,
    @Body(new ZodPipe(replyCaseRequestSchema)) body: Reply,
  ) {
    return this.operator.reply(principal, id, body);
  }

  @Get('evidence')
  vault() {
    return this.operator.vault();
  }
}

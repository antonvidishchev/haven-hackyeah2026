import { Controller, Get, Query } from '@nestjs/common';
import { auditQuerySchema, type AuditQuery } from '@haven/shared';
import { Roles } from '../auth/decorators.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { AuditService } from './audit.service.js';

@Roles('admin')
@Controller('admin/audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query(new ZodPipe(auditQuerySchema)) query: AuditQuery) {
    return this.audit.list(query);
  }
}

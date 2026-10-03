import { Global, Module } from '@nestjs/common';
import { AuditController } from './audit.controller.js';
import { AuditRepository } from './audit.repository.js';
import { AuditService } from './audit.service.js';

/** Global so every module can record state changes without importing it. */
@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditRepository, AuditService],
  exports: [AuditService],
})
export class AuditModule {}

import { Module } from '@nestjs/common';
import { CasesModule } from '../cases/cases.module.js';
import { ReportsModule } from '../reports/reports.module.js';
import { EvidenceController } from './evidence.controller.js';
import { EvidenceService } from './evidence.service.js';
import { EvidenceStorage } from './evidence.storage.js';

@Module({
  imports: [ReportsModule, CasesModule],
  controllers: [EvidenceController],
  providers: [EvidenceService, EvidenceStorage],
})
export class EvidenceModule {}

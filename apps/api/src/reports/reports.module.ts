import { Module } from '@nestjs/common';
import { CasesModule } from '../cases/cases.module.js';
import { EvidenceRepository } from '../evidence/evidence.repository.js';
import { ReportsController } from './reports.controller.js';
import { ReportsRepository } from './reports.repository.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [CasesModule],
  controllers: [ReportsController],
  providers: [ReportsRepository, ReportsService, EvidenceRepository],
  exports: [ReportsService, ReportsRepository, EvidenceRepository],
})
export class ReportsModule {}

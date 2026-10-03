import { Module } from '@nestjs/common';
import { EvidenceRepository } from '../evidence/evidence.repository.js';
import { ReportsController } from './reports.controller.js';
import { ReportsRepository } from './reports.repository.js';
import { ReportsService } from './reports.service.js';

@Module({
  controllers: [ReportsController],
  providers: [ReportsRepository, ReportsService, EvidenceRepository],
  exports: [ReportsService, EvidenceRepository],
})
export class ReportsModule {}

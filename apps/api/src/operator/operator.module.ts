import { Module } from '@nestjs/common';
import { CasesModule } from '../cases/cases.module.js';
import { ReportsModule } from '../reports/reports.module.js';
import { OperatorController } from './operator.controller.js';
import { OperatorRepository } from './operator.repository.js';
import { OperatorService } from './operator.service.js';

@Module({
  imports: [CasesModule, ReportsModule],
  controllers: [OperatorController],
  providers: [OperatorRepository, OperatorService],
  exports: [OperatorRepository],
})
export class OperatorModule {}

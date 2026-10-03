import { Module } from '@nestjs/common';
import { CasesModule } from '../cases/cases.module.js';
import { OperatorModule } from '../operator/operator.module.js';
import { ReportsModule } from '../reports/reports.module.js';
import { OfficialController } from './official.controller.js';
import { OfficialRepository } from './official.repository.js';
import { OfficialService } from './official.service.js';

@Module({
  imports: [CasesModule, ReportsModule, OperatorModule],
  controllers: [OfficialController],
  providers: [OfficialRepository, OfficialService],
})
export class OfficialModule {}

import { Module } from '@nestjs/common';
import { OperatorModule } from '../operator/operator.module.js';
import { ReportsModule } from '../reports/reports.module.js';
import { SupportController } from './support.controller.js';
import { SupportRepository } from './support.repository.js';
import { SupportService } from './support.service.js';

@Module({
  imports: [ReportsModule, OperatorModule],
  controllers: [SupportController],
  providers: [SupportRepository, SupportService],
})
export class SupportModule {}

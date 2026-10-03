import { Module } from '@nestjs/common';
import { CasesRepository } from './cases.repository.js';

@Module({
  providers: [CasesRepository],
  exports: [CasesRepository],
})
export class CasesModule {}

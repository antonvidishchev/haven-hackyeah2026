import { Module } from '@nestjs/common';
import { HotspotsController } from './hotspots.controller.js';
import { HotspotsRepository } from './hotspots.repository.js';

@Module({
  controllers: [HotspotsController],
  providers: [HotspotsRepository],
})
export class HotspotsModule {}

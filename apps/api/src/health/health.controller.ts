import { Controller, Get, HttpCode } from '@nestjs/common';
import { Public } from '../auth/decorators.js';
import { apiError } from '../common/http-exception.filter.js';
import { SurrealService } from '../db/surreal.service.js';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly surreal: SurrealService) {}

  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @HttpCode(200)
  async ready() {
    if (!(await this.surreal.isHealthy())) {
      throw apiError(503, 'database_unavailable', 'SurrealDB is not reachable');
    }
    return { status: 'ok', database: 'ok' };
  }
}

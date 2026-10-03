import { type PipeTransform } from '@nestjs/common';
import { reportIdSchema } from '@haven/shared';
import { apiError } from './http-exception.filter.js';

/**
 * `@Param('id', new RecordIdPipe('report_not_found', ...))` — a malformed id answers the same
 * 404 as a missing record, so ids can't be probed.
 */
export class RecordIdPipe implements PipeTransform<unknown, string> {
  constructor(
    private readonly code: string,
    private readonly message: string,
  ) {}

  transform(value: unknown): string {
    const result = reportIdSchema.safeParse(value);
    if (!result.success) throw apiError(404, this.code, this.message);
    return result.data;
  }
}

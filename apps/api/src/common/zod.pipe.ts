import { type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';
import { apiError } from './http-exception.filter.js';

/** `@Body(new ZodPipe(schema))` — parses and narrows the input or answers 400. */
export class ZodPipe<T extends z.ZodType> implements PipeTransform<unknown, z.infer<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw apiError(400, 'validation_failed', 'The request is not valid', result.error.issues);
    }
    return result.data;
  }
}

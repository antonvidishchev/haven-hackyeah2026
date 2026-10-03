import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiErrorBody } from '@haven/shared';
import type { FastifyReply } from 'fastify';

const DEFAULT_CODES: Record<number, string> = {
  400: 'bad_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  413: 'payload_too_large',
  429: 'too_many_requests',
  503: 'service_unavailable',
};

/** Shapes every error as `{ error: { code, message, details? } }`. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: ApiErrorBody = { error: { code: 'internal_error', message: 'Something went wrong' } };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      const fallbackCode = DEFAULT_CODES[status] ?? 'http_error';
      if (typeof response === 'object' && response !== null && 'error' in response) {
        const error = (response as { error: unknown }).error;
        if (typeof error === 'object' && error !== null && 'code' in error) {
          body = response as ApiErrorBody;
        } else {
          body = { error: { code: fallbackCode, message: exception.message } };
        }
      } else {
        body = { error: { code: fallbackCode, message: exception.message } };
      }
    } else {
      this.logger.error(exception);
    }

    void reply.status(status).send(body);
  }
}

/** Throws an HttpException with a stable machine-readable code. */
export function apiError(status: number, code: string, message: string, details?: unknown) {
  return new HttpException({ error: { code, message, details } }, status);
}

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';

/**
 * LESSON: Exception filters
 * Filters are the LAST line: they turn any thrown error into the HTTP response.
 * `@Catch()` with no args catches EVERYTHING, which lets us guarantee one consistent error
 * shape and make sure unexpected errors never leak stack traces to clients.
 *
 * Registered globally through `APP_FILTER` in AppModule so it can use dependency injection.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') throw exception;

    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<{ url: string; id?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let code: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else {
        const obj = body as { message?: string | string[]; code?: string };
        message = obj.message ?? exception.message;
        code = obj.code;
      }
    } else if (exception instanceof QueryFailedError && /UNIQUE/i.test(exception.message)) {
      status = HttpStatus.CONFLICT;
      message = 'A record with these unique values already exists';
      code = 'UNIQUE_VIOLATION';
    } else {
      // Unknown error: log everything, tell the client nothing.
      this.logger.error(
        `Unhandled: ${exception instanceof Error ? exception.message : String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    httpAdapter.reply(
      ctx.getResponse(),
      {
        success: false,
        statusCode: status,
        error: HttpStatus[status] ?? 'Error',
        code,
        message,
        path: request.url,
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
      status,
    );
  }
}

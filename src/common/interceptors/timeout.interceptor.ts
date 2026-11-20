import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, TimeoutError, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { RAW_RESPONSE_KEY } from '../decorators/raw-response.decorator';
import { TIMEOUT_KEY } from '../decorators/timeout.decorator';

export const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * LESSON: Timeouts with RxJS
 * Races the handler against a timer. NOTE: this stops waiting and answers 408; it cannot cancel
 * work already in flight (a DB query keeps running). Override per route with `@Timeout(ms)`.
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, targets)) return next.handle();

    const ms = this.reflector.getAllAndOverride<number>(TIMEOUT_KEY, targets) ?? DEFAULT_TIMEOUT_MS;

    return next.handle().pipe(
      timeout(ms),
      catchError((err: unknown) =>
        err instanceof TimeoutError
          ? throwError(() => new RequestTimeoutException(`Request exceeded ${ms}ms`))
          : throwError(() => err),
      ),
    );
  }
}

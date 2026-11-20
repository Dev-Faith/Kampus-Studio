import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * LESSON: Interceptors
 * Interceptors wrap the handler like an onion: code BEFORE `next.handle()` runs on the way in,
 * the RxJS operators you pipe onto the returned Observable run on the way out.
 * Great for logging, timing, caching, response mapping, retries and timeouts.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<{ method: string; originalUrl: string; id?: string }>();
    const res = http.getResponse<{ statusCode: number }>();
    const started = Date.now();
    const label = `${req.method} ${req.originalUrl} [${req.id ?? '-'}]`;

    return next.handle().pipe(
      tap({
        next: () => this.logger.log(`${label} ${res.statusCode} +${Date.now() - started}ms`),
        // The status code isn't final on errors (the exception filter sets it later).
        error: (err: { status?: number }) =>
          this.logger.warn(`${label} ${err?.status ?? 500} +${Date.now() - started}ms`),
      }),
    );
  }
}

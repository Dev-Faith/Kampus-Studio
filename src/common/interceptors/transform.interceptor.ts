import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RAW_RESPONSE_KEY } from '../decorators/raw-response.decorator';

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: unknown;
  timestamp: string;
}

/**
 * LESSON: Response mapping
 * Wraps every successful response in `{ success, data, meta?, timestamp }`.
 * A handler returning `{ items, meta }` (see `paginate()`) gets unpacked into `data` + `meta`.
 * `@RawResponse()` opts a route out.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T> | T> {
    const raw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (raw || context.getType() !== 'http') return next.handle();

    return next.handle().pipe(
      map((result) => {
        if (result instanceof StreamableFile) return result;
        const timestamp = new Date().toISOString();
        if (isPage(result)) {
          return { success: true as const, data: result.items as T, meta: result.meta, timestamp };
        }
        return { success: true as const, data: result, timestamp };
      }),
    );
  }
}

function isPage(value: unknown): value is { items: unknown; meta: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'items' in value &&
    'meta' in value &&
    Object.keys(value).length === 2
  );
}

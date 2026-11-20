import { SetMetadata } from '@nestjs/common';

export const TIMEOUT_KEY = 'timeoutMs';

/** Override the default request timeout (ms) for one route. Read by TimeoutInterceptor. */
export const Timeout = (ms: number) => SetMetadata(TIMEOUT_KEY, ms);

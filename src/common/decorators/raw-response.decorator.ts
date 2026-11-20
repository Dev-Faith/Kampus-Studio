import { SetMetadata } from '@nestjs/common';

export const RAW_RESPONSE_KEY = 'rawResponse';

/**
 * Opt a handler out of the global response envelope + timeout interceptors.
 * Needed for streams (SSE, file downloads) and machine-readable endpoints (health checks).
 */
export const RawResponse = () => SetMetadata(RAW_RESPONSE_KEY, true);

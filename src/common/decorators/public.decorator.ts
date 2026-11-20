import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * LESSON: Custom metadata decorators
 * `SetMetadata` attaches data to a route handler/class. Guards read it back with `Reflector`.
 * Here, the global JwtAuthGuard protects EVERYTHING by default (secure-by-default) and
 * `@Public()` is the explicit opt-out.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

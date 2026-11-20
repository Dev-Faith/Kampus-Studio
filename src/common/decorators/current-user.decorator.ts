import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../interfaces/auth-user.interface';

/**
 * LESSON: Custom PARAM decorators
 * `createParamDecorator` extracts something from the request so handlers stay free of
 * `@Req()` boilerplate.
 *
 *   whoAmI(@CurrentUser() user: AuthUser)
 *   myId(@CurrentUser('id') id: string)
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    return field ? user?.[field] : user;
  },
);

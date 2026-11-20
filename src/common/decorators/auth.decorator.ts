import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Role } from '../enums/role.enum';
import { Roles } from './roles.decorator';

/**
 * LESSON: Decorator composition with `applyDecorators`
 * Bundle several decorators into one. `@Auth(Role.Admin)` = role restriction + Swagger docs.
 * Authentication itself is already enforced globally, so this only adds the authorization bits.
 */
export const Auth = (...roles: Role[]) =>
  applyDecorators(
    ...(roles.length ? [Roles(...roles), ApiForbiddenResponse({ description: 'Forbidden' })] : []),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
  );

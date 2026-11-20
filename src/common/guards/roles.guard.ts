import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';
import { AuthUser } from '../interfaces/auth-user.interface';

/**
 * LESSON: Guards (authorization)
 * A guard answers ONE question: "may this request proceed?" (true/false or throw).
 * Guards run AFTER middleware and BEFORE interceptors/pipes/handler.
 *
 * `getAllAndOverride` looks at the handler first, then the class, so a method-level
 * `@Roles()` beats a controller-level one.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (user && required.includes(user.role)) return true;

    throw new ForbiddenException(`Requires one of the roles: ${required.join(', ')}`);
  }
}

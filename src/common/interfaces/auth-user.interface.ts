import { Role } from '../enums/role.enum';

/** The shape attached to `request.user` after a successful JWT validation. */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

/** The claims stored inside a signed JWT. */
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  jti?: string;
}

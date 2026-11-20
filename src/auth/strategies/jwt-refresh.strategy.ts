import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../common/interfaces/auth-user.interface';

export interface RefreshUser {
  id: string;
  refreshToken: string;
}

/** Same library, different secret + token location: the refresh token comes from the body. */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  validate(req: { body: { refreshToken: string } }, payload: JwtPayload): RefreshUser {
    return { id: payload.sub, refreshToken: req.body.refreshToken };
  }
}

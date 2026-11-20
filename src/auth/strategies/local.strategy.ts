import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { User } from '../../users/user.entity';
import { AuthService } from '../auth.service';

/**
 * LESSON: Passport strategies
 * A strategy extracts credentials from the request and `validate()` decides who they belong to.
 * Whatever `validate()` returns is attached as `request.user`.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly auth: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<User> {
    const user = await this.auth.validateCredentials(email, password);
    if (!user) throw new UnauthorizedException('Invalid email or password');
    return user;
  }
}

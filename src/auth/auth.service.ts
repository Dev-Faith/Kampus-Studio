import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { AuthUser, JwtPayload } from '../common/interfaces/auth-user.interface';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { UserRegisteredEvent } from './events/user-registered.event';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}

const BCRYPT_ROUNDS = 10;

/**
 * LESSON: Authentication flow
 *  1. register/login -> verify password (bcrypt) -> issue ACCESS (short) + REFRESH (long) tokens
 *  2. access token travels in `Authorization: Bearer ...` and is verified statelessly
 *  3. refresh rotates BOTH tokens; the server stores a hash of the latest refresh token so old
 *     (stolen/replayed) ones are rejected, and logout can revoke it.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: User } & TokenPair> {
    if (await this.users.findByEmail(dto.email)) {
      throw new ConflictException('Email already registered');
    }
    const user = await this.users.create({
      email: dto.email,
      name: dto.name,
      passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
    });
    this.events.emit(UserRegisteredEvent.eventName, new UserRegisteredEvent(user.id, user.email));
    return { user, ...(await this.issueTokens(user)) };
  }

  /** Used by the passport-local strategy. Returns null on failure (never reveal which part was wrong). */
  async validateCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.users.findByEmail(email);
    // Compare against a dummy hash when the user doesn't exist to keep timing similar.
    const hash = user?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi';
    const ok = await bcrypt.compare(password, hash);
    return user && ok ? user : null;
  }

  async login(user: User): Promise<{ user: User } & TokenPair> {
    return { user, ...(await this.issueTokens(user)) };
  }

  async refresh(userId: string, presentedToken: string): Promise<TokenPair> {
    const user = await this.users.findOne(userId).catch(() => null);
    if (!user?.refreshTokenHash || user.refreshTokenHash !== this.hashToken(presentedToken)) {
      throw new UnauthorizedException('Refresh token is no longer valid');
    }
    return this.issueTokens(user);
  }

  logout(userId: string): Promise<void> {
    return this.users.setRefreshTokenHash(userId, null);
  }

  async me(actor: AuthUser): Promise<User> {
    return this.users.findOne(actor.id);
  }

  private async issueTokens(user: User): Promise<TokenPair> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessTtl = this.config.getOrThrow<string>('jwt.accessTtl');
    const refreshTtl = this.config.getOrThrow<string>('jwt.refreshTtl');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('jwt.accessSecret'),
        expiresIn: accessTtl as JwtSignOptions['expiresIn'],
      }),
      this.jwt.signAsync(
        { ...payload, jti: randomUUID() }, // jti makes every refresh token unique
        {
          secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
          expiresIn: refreshTtl as JwtSignOptions['expiresIn'],
        },
      ),
    ]);

    await this.users.setRefreshTokenHash(user.id, this.hashToken(refreshToken));
    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: accessTtl };
  }

  /**
   * SHA-256 rather than bcrypt: bcrypt only looks at the first 72 bytes, and a JWT's first 72
   * bytes are nearly identical for every token of the same user.
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

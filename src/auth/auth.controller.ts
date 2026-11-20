import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { User } from '../users/user.entity';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtRefreshGuard, LocalAuthGuard } from './guards/strategy-guards';
import { RefreshUser } from './strategies/jwt-refresh.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  /**
   * LESSON: Per-route rate limit. Credential endpoints get a MUCH stricter budget than the global
   * default to slow down brute-force attacks.
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  @ApiBody({ type: LoginDto })
  login(@CurrentUser() user: User) {
    // LocalAuthGuard already validated the credentials and attached the User.
    return this.auth.login(user);
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(200)
  @Post('refresh')
  @ApiBody({ type: RefreshDto })
  refresh(@CurrentUser() user: RefreshUser) {
    return this.auth.refresh(user.id, user.refreshToken);
  }

  @Auth()
  @HttpCode(204)
  @Post('logout')
  async logout(@CurrentUser('id') userId: string) {
    await this.auth.logout(userId);
  }

  @Auth()
  @Get('me')
  me(@CurrentUser() actor: AuthUser) {
    return this.auth.me(actor);
  }
}

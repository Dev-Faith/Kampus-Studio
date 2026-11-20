import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';

/**
 * LESSON: Machine-to-machine auth with an API key.
 * Apply per-route with `@UseGuards(ApiKeyGuard)`. Note `timingSafeEqual`: comparing secrets
 * with `===` leaks information through response timing.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const provided = req.headers['x-api-key'];
    const expected = this.config.getOrThrow<string>('apiKey');

    if (provided && this.safeEqual(provided, expected)) return true;
    throw new UnauthorizedException('Invalid or missing x-api-key header');
  }

  private safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
  }
}

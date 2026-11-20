/**
 * Kampus PropTech — NestJS Interactive Trainer Curriculum (Part 2: Modules 6 – 11 + Sandbox Templates)
 * ====================================================================================================
 * Continuous Project Theme:
 *   🏠 KAMPUS — The Student Housing, Hostel Verification & Rent Escrow Platform.
 *
 * Personas across the entire project:
 *   - 🎓 Adaobi Okafor (`ada@kampus.edu`, role: 'student', tier: 'basic', id: 'u-student-3')
 *   - 🔑 Chidi Nwosu (`chidi@kampus.edu`, role: 'landlord', tier: 'verified', id: 'u-landlord-2')
 *   - 🛡️ Grace Bello (`admin@kampus.edu`, role: 'admin', tier: 'campus-admin', id: 'u-admin-1')
 */
(function (global) {
  'use strict';

  const SHARED_DATABASE_SERVICE_FILE = {
    name: 'database.service.ts',
    code: `import { Injectable } from '@nestjs/common';
import {
  DatabaseService as SandboxDatabaseService,
  QueryFailedError,
} from '@playground/sandbox';

export interface KampusUser {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'landlord' | 'admin';
  tier: 'basic' | 'verified' | 'campus-admin';
  passwordHash: string;
  refreshTokenHash: string | null;
}

export interface KampusListing {
  id: number;
  title: string;
  campusZone: string;
  rentPerYear: number;
  roomsAvailable: number;
  verified: boolean;
  published: boolean;
  landlordId: string;
  amenities: string[];
}

/**
 * Kampus In-Memory DatabaseService
 * Pre-seeded with:
 * - Users: Grace (u-admin-1), Landlord Chidi (u-landlord-2), Student Adaobi (u-student-3)
 * - Hostels: #1 Cedar Court ($180), #2 Emerald Studio ($250), #3 Palm Grove ($120)
 * - Escrow Wallets: { 'u-student-3': 400, 'u-landlord-2': 1200, 'u-admin-1': 5000 }
 */
@Injectable()
export class DatabaseService extends SandboxDatabaseService {}

export { QueryFailedError };
`,
  };

  const SHARED_PRISMA_SERVICE_FILE = {
    name: 'prisma.service.ts',
    code: `import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  PrismaService as SandboxPrismaService,
  PrismaClientKnownRequestError,
} from '@prisma/client';

/**
 * Kampus PrismaService — Wraps PrismaClient for NestJS Dependency Injection.
 * Exposes typed model delegates:
 * - this.prisma.user (findMany, findUnique, create, update, upsert)
 * - this.prisma.listing (findMany, findUnique, create, update, aggregate)
 * - this.prisma.booking (findMany, create)
 * - this.prisma.$transaction(async (tx) => { ... })
 */
@Injectable()
export class PrismaService
  extends SandboxPrismaService
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

export { PrismaClientKnownRequestError };
`,
  };

  const SHARED_PRISMA_SCHEMA_FILE = {
    name: 'schema.prisma',
    code: `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id               String    @id @default(uuid())
  email            String    @unique
  name             String
  role             String    @default("student") // 'student' | 'landlord' | 'admin'
  tier             String    @default("basic")   // 'basic' | 'verified' | 'campus-admin'
  passwordHash     String
  refreshTokenHash String?
  listings         Listing[] @relation("LandlordListings")
  bookings         Booking[]
  createdAt        DateTime  @default(now())
}

model Listing {
  id             Int       @id @default(autoincrement())
  title          String
  campusZone     String
  rentPerYear    Int
  roomsAvailable Int       @default(1)
  verified       Boolean   @default(false)
  published      Boolean   @default(true)
  amenities      String[]
  landlordId     String
  landlord       User      @relation("LandlordListings", fields: [landlordId], references: [id])
  bookings       Booking[]

  @@index([campusZone, rentPerYear])
}

model Booking {
  id             String   @id @default(uuid())
  studentId      String
  student        User     @relation(fields: [studentId], references: [id])
  listingId      Int
  listing        Listing  @relation(fields: [listingId], references: [id])
  amount         Int
  status         String   @default("confirmed")
  idempotencyKey String?  @unique
  createdAt      DateTime @default(now())
}
`,
  };

  const SHARED_MONGOOSE_LISTING_SCHEMA_FILE = {
    name: 'listing.schema.ts',
    code: `import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true, collection: 'kampus_listings' })
export class Listing {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, index: true })
  campusZone: string;

  @Prop({ required: true, min: 50 })
  rentPerYear: number;

  @Prop({ required: true, min: 0, default: 1 })
  roomsAvailable: number;

  @Prop({ type: [String], default: [] })
  amenities: string[];

  @Prop({ default: false, index: true })
  verified: boolean;

  @Prop({ default: true })
  published: boolean;

  @Prop({ type: String, ref: 'User', required: true })
  landlord: string;
}

export const ListingSchema = SchemaFactory.createForClass(Listing);
`,
  };

  const SHARED_MONGOOSE_LANDLORD_SCHEMA_FILE = {
    name: 'landlord.schema.ts',
    code: `import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true, collection: 'kampus_users' })
export class LandlordUser {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: 'landlord' })
  role: string;

  @Prop({ default: 'verified' })
  tier: string;

  @Prop({ select: false })
  passwordHash: string;
}

export const LandlordUserSchema = SchemaFactory.createForClass(LandlordUser);
`,
  };

  const PART_2_MODULES = [
    // =========================================================================
    // MODULE 6: KAMPUS ANTI-SPAM — RATE LIMITING & THROTTLING
    // =========================================================================
    {
      id: 'mod-throttling',
      number: '06',
      title: 'Kampus Anti-Spam: Rate Limiting',
      icon: 'zap',
      description: 'Protect SMS inspection code endpoints and roommate AI matching with ThrottlerGuard, @Throttle(), @SkipThrottle(), and tier quotas.',
      subconcepts: [
        {
          id: 'throttling-decorators',
          code: '6.1',
          title: 'Route Throttling: Protecting SMS Inspection Codes (@Throttle & @SkipThrottle)',
          difficulty: 'Intermediate',
          summary: 'Use ThrottlerGuard, @Throttle(), and @SkipThrottle() to block SMS verification bots while keeping status probes unrestricted.',
          theory: `
            <h4>🏠 Story Context: Stopping SMS Bots During Semester Resumption</h4>
            <p>Whenever a new semester starts, scammers and automated bots try to spam Kampus's <strong>SMS hostel inspection code</strong> endpoint (<code>POST /inspections/send-code</code>). Since every SMS costs Kampus money, rate limiting is essential.</p>
            <h4>Key Decorators in <code>@nestjs/throttler</code></h4>
            <ul>
              <li><code>@UseGuards(ThrottlerGuard)</code> — Activates rate-limit tracking on a controller or globally via <code>APP_GUARD</code>.</li>
              <li><code>@Throttle({ default: { limit: 3, ttl: 60000 } })</code> — Caps a sensitive route at 3 requests per 60,000 ms (60 seconds).</li>
              <li><code>@SkipThrottle()</code> — Exempts lightweight status or health routes from rate-limit counting.</li>
              <li><strong>Standard Headers:</strong> NestJS sets <code>x-ratelimit-limit</code>, <code>x-ratelimit-remaining</code>, and <code>retry-after</code> when rejecting with <code>429 Too Many Requests</code>.</li>
            </ul>
            <p>💡 <strong>Try it right now:</strong> Click the <strong>⚡ Burst 5x</strong> button on <code>POST /inspections/send-code</code> to watch the first 3 SMS codes succeed and the 4th &amp; 5th requests fail with <code>429 Too Many Requests</code>!</p>
          `,
          exampleFiles: [
            {
              name: 'inspections.controller.ts',
              code: `import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ThrottlerGuard, Throttle, SkipThrottle } from '@nestjs/throttler';
import { SendInspectionSmsDto } from './send-inspection-sms.dto';

@Controller('inspections')
@UseGuards(ThrottlerGuard)
export class InspectionsController {
  @Post('send-code')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  sendInspectionSms(@Body() body: SendInspectionSmsDto) {
    return {
      sent: true,
      phone: body.phone,
      listingId: body.listingId,
      message: 'Kampus 6-digit physical inspection code sent via SMS',
    };
  }

  @Get('status')
  @SkipThrottle()
  getSmsGatewayStatus() {
    return { smsGateway: 'online', throttled: false };
  }
}
`,
            },
            {
              name: 'send-inspection-sms.dto.ts',
              code: `export class SendInspectionSmsDto {
  phone: string;
  listingId: number;
}
`,
            },
            {
              name: 'throttler.config.ts',
              code: `export const KAMPUS_THROTTLER_CONFIG = {
  defaultTtlMs: 60000,
  smsCodeLimitPerMinute: 3,
  phoneRevealLimitPerMinute: 2,
};
`,
            },
            {
              name: 'inspections.module.ts',
              code: `import { Module } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { InspectionsController } from './inspections.controller';

@Module({
  controllers: [InspectionsController],
  providers: [ThrottlerGuard],
})
export class InspectionsModule {}
`,
            },
          ],
          presets: [
            {
              label: 'POST /inspections/send-code (Click ⚡ Burst 5x!)',
              method: 'POST',
              url: '/inspections/send-code',
              headers: {},
              body: JSON.stringify({ phone: '+234800KAMPUS', listingId: 1 }, null, 2),
            },
            {
              label: 'GET /inspections/status (@SkipThrottle)',
              method: 'GET',
              url: '/inspections/status',
              headers: {},
              body: '',
            },
          ],
          exercise: {
            title: 'Protect Landlord Phone Reveal with @Throttle & Exempt Public Ping',
            prompt: `In <code>landlord-contact.controller.ts</code> (wired in <code>landlord-contact.module.ts</code> with <code>reveal-phone.dto.ts</code> and <code>throttler.config.ts</code>):
              <ol>
                <li>Decorate <code>POST /contacts/reveal-phone</code> with <code>@Throttle({ default: { limit: 2, ttl: 60000 } })</code> so scrapers can only reveal 2 landlord phone numbers per minute.</li>
                <li>Decorate <code>GET /contacts/ping</code> with <code>@SkipThrottle()</code> so uptime monitors are never blocked with 429.</li>
              </ol>`,
            hints: [
              'Add `@Throttle({ default: { limit: 2, ttl: 60000 } })` above `revealPhone()`.',
              'Add `@SkipThrottle()` above `ping()`.',
            ],
            starterFiles: [
              {
                name: 'landlord-contact.controller.ts',
                code: `import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ThrottlerGuard, Throttle, SkipThrottle } from '@nestjs/throttler';
import { RevealPhoneDto } from './reveal-phone.dto';

@Controller('contacts')
@UseGuards(ThrottlerGuard)
export class LandlordContactController {
  // TODO 1: Limit POST /contacts/reveal-phone to 2 requests per 60000ms using @Throttle
  @Post('reveal-phone')
  revealPhone(@Body() body: RevealPhoneDto) {
    return { listingId: body.listingId, landlordPhone: '+234-809-CHIDI-HOSTEL' };
  }

  // TODO 2: Exempt GET /contacts/ping from rate limiting using @SkipThrottle()
  @Get('ping')
  ping() {
    return { ok: true };
  }
}
`,
              },
              {
                name: 'reveal-phone.dto.ts',
                code: `export class RevealPhoneDto {
  listingId: number;
}
`,
              },
              {
                name: 'throttler.config.ts',
                code: `export const CONTACT_THROTTLER_CONFIG = {
  ttl: 60000,
  revealPhoneLimit: 2,
};
`,
              },
              {
                name: 'landlord-contact.module.ts',
                code: `import { Module } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { LandlordContactController } from './landlord-contact.controller';

@Module({
  controllers: [LandlordContactController],
  providers: [ThrottlerGuard],
})
export class LandlordContactModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'landlord-contact.controller.ts',
                code: `import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ThrottlerGuard, Throttle, SkipThrottle } from '@nestjs/throttler';
import { RevealPhoneDto } from './reveal-phone.dto';

@Controller('contacts')
@UseGuards(ThrottlerGuard)
export class LandlordContactController {
  @Post('reveal-phone')
  @Throttle({ default: { limit: 2, ttl: 60000 } })
  revealPhone(@Body() body: RevealPhoneDto) {
    return { listingId: body.listingId, landlordPhone: '+234-809-CHIDI-HOSTEL' };
  }

  @Get('ping')
  @SkipThrottle()
  ping() {
    return { ok: true };
  }
}
`,
              },
              {
                name: 'reveal-phone.dto.ts',
                code: `export class RevealPhoneDto {
  listingId: number;
}
`,
              },
              {
                name: 'throttler.config.ts',
                code: `export const CONTACT_THROTTLER_CONFIG = {
  ttl: 60000,
  revealPhoneLimit: 2,
};
`,
              },
              {
                name: 'landlord-contact.module.ts',
                code: `import { Module } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { LandlordContactController } from './landlord-contact.controller';

@Module({
  controllers: [LandlordContactController],
  providers: [ThrottlerGuard],
})
export class LandlordContactModule {}
`,
              },
            ],
            tests: [
              {
                name: 'Allows 2 phone reveals then blocks the 3rd with 429 Too Many Requests',
                steps: [
                  { method: 'POST', url: '/contacts/reveal-phone', headers: {}, body: { listingId: 1 } },
                  { method: 'POST', url: '/contacts/reveal-phone', headers: {}, body: { listingId: 2 } },
                  { method: 'POST', url: '/contacts/reveal-phone', headers: {}, body: { listingId: 3 } },
                ],
                check: (lastRes, _state, all) =>
                  all[0]?.status === 201 && all[1]?.status === 201 && lastRes.status === 429
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected [201, 201, 429], got [${all.map((r) => r.status).join(', ')}]`,
                      },
              },
              {
                name: 'GET /contacts/ping bypasses rate limiting (@SkipThrottle) even after 6 rapid calls',
                steps: [
                  { method: 'GET', url: '/contacts/ping', headers: {} },
                  { method: 'GET', url: '/contacts/ping', headers: {} },
                  { method: 'GET', url: '/contacts/ping', headers: {} },
                  { method: 'GET', url: '/contacts/ping', headers: {} },
                  { method: 'GET', url: '/contacts/ping', headers: {} },
                  { method: 'GET', url: '/contacts/ping', headers: {} },
                ],
                check: (lastRes) =>
                  lastRes.status === 200 && lastRes.body?.ok === true
                    ? { pass: true }
                    : { pass: false, reason: `Expected 200 OK on 6th ping, got ${lastRes.status}` },
              },
            ],
          },
        },

        {
          id: 'throttling-guards',
          code: '6.2',
          title: 'Tier-Aware Rate Quotas: Basic Students vs. Verified Landlords',
          difficulty: 'Intermediate',
          summary: 'Build a custom Guard using ThrottlerStorageService that grants higher API quotas to verified Kampus tiers.',
          theory: `
            <h4>🏠 Story Context: Dynamic Quotas by Kampus Account Tier</h4>
            <p>Static rate limits treat every caller the same. On Kampus, <strong>Basic Students</strong> get 2 AI roommate-matching calls per minute, while <strong>Verified Landlords</strong> (<code>tier: 'verified'</code>) and <strong>Campus Admins</strong> (<code>tier: 'campus-admin'</code>) get 5 calls per minute.</p>
            <p>By injecting <code>ThrottlerStorageService</code> into a custom Guard, you can compute the rate-limit key and quota dynamically from <code>req.user.tier</code>!</p>
          `,
          exampleFiles: [
            {
              name: 'kampus-tier-quota.guard.ts',
              code: `import { Injectable } from '@nestjs/common';
import { ThrottlerStorageService, ThrottlerException } from '@nestjs/throttler';
import { TIER_QUOTA_CONFIG } from './tier-quota.config';

@Injectable()
export class KampusTierQuotaGuard {
  constructor(private readonly storage: ThrottlerStorageService) {}

  canActivate(context: any): boolean {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const tier = req.user?.tier || 'basic';
    const limit =
      tier === 'verified' || tier === 'campus-admin'
        ? TIER_QUOTA_CONFIG.verifiedLimit
        : TIER_QUOTA_CONFIG.basicLimit;
    const stats = this.storage.increment(\`quota:\${req.user?.id || req.ip}\`, TIER_QUOTA_CONFIG.ttlMs, limit);

    res.setHeader('x-kampus-tier', tier);
    res.setHeader('x-ratelimit-limit', String(limit));
    res.setHeader('x-ratelimit-remaining', String(Math.max(0, limit - stats.totalHits)));

    if (stats.isBlocked) {
      throw new ThrottlerException(\`Quota of \${limit}/min exceeded for \${tier} tier\`);
    }
    return true;
  }
}
`,
            },
            {
              name: 'analytics-export.controller.ts',
              code: `import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { KampusTierQuotaGuard } from './kampus-tier-quota.guard';

@Controller('analytics-export')
@UseGuards(KampusTierQuotaGuard)
export class AnalyticsExportController {
  @Get()
  exportZoneDemand(@Req() req: any) {
    return {
      caller: req.user?.email || 'guest',
      tier: req.user?.tier || 'basic',
      hottestZone: 'North Gate (94% occupancy)',
    };
  }
}
`,
            },
            {
              name: 'tier-quota.config.ts',
              code: `export const TIER_QUOTA_CONFIG = {
  ttlMs: 60000,
  basicLimit: 2,
  verifiedLimit: 5,
};
`,
            },
            {
              name: 'analytics-export.module.ts',
              code: `import { Module } from '@nestjs/common';
import { ThrottlerStorageService } from '@nestjs/throttler';
import { AnalyticsExportController } from './analytics-export.controller';
import { KampusTierQuotaGuard } from './kampus-tier-quota.guard';

@Module({
  controllers: [AnalyticsExportController],
  providers: [KampusTierQuotaGuard, ThrottlerStorageService],
})
export class AnalyticsExportModule {}
`,
            },
          ],
          presets: [
            {
              label: 'GET /analytics-export as Adaobi (basic tier -> limit 2, try Burst 5x!)',
              method: 'GET',
              url: '/analytics-export',
              headers: { Authorization: 'Bearer demo-student-jwt' },
              body: '',
            },
            {
              label: 'GET /analytics-export as Landlord Chidi (verified tier -> limit 5)',
              method: 'GET',
              url: '/analytics-export',
              headers: { Authorization: 'Bearer demo-landlord-jwt' },
              body: '',
            },
          ],
          exercise: {
            title: 'Build a Kampus Tier-Aware Roommate AI Rate Limit Guard',
            prompt: `Kampus offers an AI Roommate Compatibility Matcher at <code>GET /roommate-ai/match</code> (in <code>roommate-ai.controller.ts</code>). Enforce tier-based quotas in <code>tier-throttler.guard.ts</code>:
              <ol>
                <li>Read the user's tier from <code>req.user?.tier || 'basic'</code>.</li>
                <li>Set <code>const limit = (tier === 'verified' || tier === 'campus-admin') ? 5 : 2</code>.</li>
                <li>Call <code>const stats = this.storage.increment(\`ai:\${req.user?.id || req.ip}\`, 60000, limit)</code>.</li>
                <li>Set response headers <code>res.setHeader('x-ratelimit-limit', String(limit))</code> and <code>res.setHeader('x-ratelimit-remaining', String(Math.max(0, limit - stats.totalHits)))</code>.</li>
                <li>If <code>stats.isBlocked</code> is true, throw <code>new ThrottlerException('Kampus AI quota exceeded for your tier')</code>; otherwise return <code>true</code>.</li>
              </ol>`,
            hints: [
              'Use `const tier = req.user?.tier || "basic"; const limit = (tier === "verified" || tier === "campus-admin") ? 5 : 2;`',
              'If `stats.isBlocked` is true, throw `new ThrottlerException("Kampus AI quota exceeded for your tier")`.',
            ],
            starterFiles: [
              {
                name: 'tier-throttler.guard.ts',
                code: `import { Injectable } from '@nestjs/common';
import { ThrottlerStorageService, ThrottlerException } from '@nestjs/throttler';
import { TIER_QUOTA_CONFIG } from './tier-quota.config';

@Injectable()
export class KampusTierThrottlerGuard {
  constructor(private readonly storage: ThrottlerStorageService) {}

  canActivate(context: any): boolean {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    // TODO:
    // 1. Determine tier = req.user?.tier || 'basic'
    // 2. limit = (tier === 'verified' || tier === 'campus-admin') ? 5 : 2
    // 3. const stats = this.storage.increment(\`ai:\${req.user?.id || req.ip}\`, 60000, limit)
    // 4. Set 'x-ratelimit-limit' and 'x-ratelimit-remaining' headers on res
    // 5. Throw ThrottlerException if stats.isBlocked is true
    return true;
  }
}
`,
              },
              {
                name: 'roommate-ai.controller.ts',
                code: `import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { KampusTierThrottlerGuard } from './tier-throttler.guard';

@Controller('roommate-ai')
@UseGuards(KampusTierThrottlerGuard)
export class RoommateAiController {
  @Get('match')
  matchRoommates(@Req() req: any) {
    return {
      user: req.user?.email || 'guest',
      tier: req.user?.tier || 'basic',
      matches: ['Kemi (96% study habit match)', 'Tunde (91% sleep schedule match)'],
    };
  }
}
`,
              },
              {
                name: 'tier-quota.config.ts',
                code: `export const TIER_QUOTA_CONFIG = {
  ttlMs: 60000,
  basicLimit: 2,
  verifiedLimit: 5,
};
`,
              },
              {
                name: 'roommate-ai.module.ts',
                code: `import { Module } from '@nestjs/common';
import { ThrottlerStorageService } from '@nestjs/throttler';
import { RoommateAiController } from './roommate-ai.controller';
import { KampusTierThrottlerGuard } from './tier-throttler.guard';

@Module({
  controllers: [RoommateAiController],
  providers: [KampusTierThrottlerGuard, ThrottlerStorageService],
})
export class RoommateAiModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'tier-throttler.guard.ts',
                code: `import { Injectable } from '@nestjs/common';
import { ThrottlerStorageService, ThrottlerException } from '@nestjs/throttler';
import { TIER_QUOTA_CONFIG } from './tier-quota.config';

@Injectable()
export class KampusTierThrottlerGuard {
  constructor(private readonly storage: ThrottlerStorageService) {}

  canActivate(context: any): boolean {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const tier = req.user?.tier || 'basic';
    const limit =
      tier === 'verified' || tier === 'campus-admin'
        ? TIER_QUOTA_CONFIG.verifiedLimit
        : TIER_QUOTA_CONFIG.basicLimit;
    const key = \`ai:\${req.user?.id || req.ip}\`;
    const stats = this.storage.increment(key, TIER_QUOTA_CONFIG.ttlMs, limit);

    res.setHeader('x-ratelimit-limit', String(limit));
    res.setHeader('x-ratelimit-remaining', String(Math.max(0, limit - stats.totalHits)));

    if (stats.isBlocked) {
      throw new ThrottlerException('Kampus AI quota exceeded for your tier');
    }
    return true;
  }
}
`,
              },
              {
                name: 'roommate-ai.controller.ts',
                code: `import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { KampusTierThrottlerGuard } from './tier-throttler.guard';

@Controller('roommate-ai')
@UseGuards(KampusTierThrottlerGuard)
export class RoommateAiController {
  @Get('match')
  matchRoommates(@Req() req: any) {
    return {
      user: req.user?.email || 'guest',
      tier: req.user?.tier || 'basic',
      matches: ['Kemi (96% study habit match)', 'Tunde (91% sleep schedule match)'],
    };
  }
}
`,
              },
              {
                name: 'tier-quota.config.ts',
                code: `export const TIER_QUOTA_CONFIG = {
  ttlMs: 60000,
  basicLimit: 2,
  verifiedLimit: 5,
};
`,
              },
              {
                name: 'roommate-ai.module.ts',
                code: `import { Module } from '@nestjs/common';
import { ThrottlerStorageService } from '@nestjs/throttler';
import { RoommateAiController } from './roommate-ai.controller';
import { KampusTierThrottlerGuard } from './tier-throttler.guard';

@Module({
  controllers: [RoommateAiController],
  providers: [KampusTierThrottlerGuard, ThrottlerStorageService],
})
export class RoommateAiModule {}
`,
              },
            ],
            tests: [
              {
                name: 'Basic student Adaobi gets limit=2 and her 3rd request in a burst is blocked with 429',
                steps: [
                  { method: 'GET', url: '/roommate-ai/match', headers: { Authorization: 'Bearer demo-student-jwt' } },
                  { method: 'GET', url: '/roommate-ai/match', headers: { Authorization: 'Bearer demo-student-jwt' } },
                  { method: 'GET', url: '/roommate-ai/match', headers: { Authorization: 'Bearer demo-student-jwt' } },
                ],
                check: (lastRes, _state, all) =>
                  all[0]?.status === 200 &&
                  all[1]?.status === 200 &&
                  lastRes.status === 429 &&
                  lastRes.headers['x-ratelimit-limit'] === '2'
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected [200, 200, 429] with limit=2, got [${all.map((r) => r.status).join(', ')}]`,
                      },
              },
              {
                name: 'Verified landlord Chidi gets a higher quota (x-ratelimit-limit: 5)',
                request: {
                  method: 'GET',
                  url: '/roommate-ai/match',
                  headers: { Authorization: 'Bearer demo-landlord-jwt' },
                },
                check: (res) =>
                  res.status === 200 && res.headers['x-ratelimit-limit'] === '5'
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected 200 with x-ratelimit-limit="5", got ${res.status} (${res.headers['x-ratelimit-limit']})`,
                      },
              },
            ],
          },
        },
      ],
    },

    // =========================================================================
    // MODULE 7: KAMPUS RESUMPTION RUSH — CACHING & CACHE EVICTION
    // =========================================================================
    {
      id: 'mod-caching',
      number: '07',
      title: 'Kampus Resumption Rush: Caching & Eviction',
      icon: 'cpu',
      description: 'Serve 50,000 students browsing hostels during resumption week using CacheInterceptor, CACHE_MANAGER, and write-through eviction.',
      subconcepts: [
        {
          id: 'cache-interceptor-declarative',
          code: '7.1',
          title: 'Declarative GET Caching (@UseInterceptors(CacheInterceptor), @CacheKey, @CacheTTL)',
          difficulty: 'Intermediate',
          summary: 'Automatically cache read-heavy GET endpoints like Campus Zones and Shuttle Routes without writing manual cache code.',
          theory: `
            <h4>🏠 Story Context: Caching the Campus Gate &amp; Shuttle Directory</h4>
            <p>Every time a student opens the Kampus mobile app, it fetches <code>GET /campus-zones</code> (North Gate, South Gate, Tech Valley). That list rarely changes, so hitting PostgreSQL 50,000 times an hour is wasteful.</p>
            <h4>Declarative Caching with <code>CacheInterceptor</code></h4>
            <ul>
              <li><code>@UseInterceptors(CacheInterceptor)</code> — Automatically caches <code>GET</code> responses in <code>CACHE_MANAGER</code>.</li>
              <li><code>@CacheKey('kampus:zones')</code> — Customizes the storage key (defaults to <code>http:GET:/url</code>).</li>
              <li><code>@CacheTTL(45000)</code> — Sets time-to-live in milliseconds.</li>
              <li>On a cache hit, <code>CacheInterceptor</code> short-circuits the controller handler using RxJS <code>of(cached)</code> and sets header <code>x-cache: HIT</code>!</li>
            </ul>
          `,
          exampleFiles: [
            {
              name: 'campus-zones.controller.ts',
              code: `import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { KAMPUS_CACHE_KEYS } from './cache.config';

@Controller('campus-zones')
@UseInterceptors(CacheInterceptor)
export class CampusZonesController {
  @Get()
  @CacheKey(KAMPUS_CACHE_KEYS.zonesDirectory)
  @CacheTTL(45000)
  getZones() {
    return {
      generatedAt: new Date().toISOString(),
      zones: [
        { name: 'North Gate', avgRent: 180, walkToCampusMins: 5 },
        { name: 'South Gate', avgRent: 250, walkToCampusMins: 8 },
        { name: 'Tech Valley', avgRent: 120, walkToCampusMins: 15 },
      ],
    };
  }
}
`,
            },
            {
              name: 'cache.config.ts',
              code: `export const KAMPUS_CACHE_KEYS = {
  zonesDirectory: 'kampus:zones:directory',
  platformStats: 'kampus:platform-stats',
};
`,
            },
            {
              name: 'campus-zones.module.ts',
              code: `import { Module } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { CampusZonesController } from './campus-zones.controller';

@Module({
  controllers: [CampusZonesController],
  providers: [CacheInterceptor],
})
export class CampusZonesModule {}
`,
            },
          ],
          presets: [
            {
              label: 'GET /campus-zones (Send twice: 1st = x-cache: MISS, 2nd = x-cache: HIT)',
              method: 'GET',
              url: '/campus-zones',
              headers: {},
              body: '',
            },
          ],
          exercise: {
            title: 'Add Declarative CacheInterceptor & Custom Key to Kampus Stats',
            prompt: `In <code>platform-stats.controller.ts</code>, decorate <code>KampusStatsController.getPlatformStats()</code> (<code>GET /platform-stats</code>) with:
              <ol>
                <li><code>@UseInterceptors(CacheInterceptor)</code></li>
                <li><code>@CacheKey('kampus:platform-stats')</code></li>
                <li><code>@CacheTTL(60000)</code></li>
              </ol>`,
            hints: [
              'Import `CacheInterceptor, CacheKey, CacheTTL` from `@nestjs/cache-manager`.',
              'Place `@UseInterceptors(CacheInterceptor)`, `@CacheKey("kampus:platform-stats")`, and `@CacheTTL(60000)` on `getPlatformStats()`.',
            ],
            starterFiles: [
              {
                name: 'platform-stats.controller.ts',
                code: `import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { DatabaseService } from './database.service';

@Controller('platform-stats')
export class KampusStatsController {
  constructor(private readonly db: DatabaseService) {}

  // TODO: Decorate with @UseInterceptors(CacheInterceptor), @CacheKey('kampus:platform-stats'), and @CacheTTL(60000)
  @Get()
  getPlatformStats() {
    return {
      totalHostels: this.db.listings.length,
      totalStudents: this.db.users.length,
    };
  }
}
`,
              },
              {
                name: 'cache.config.ts',
                code: `export const STATS_CACHE_CONFIG = {
  key: 'kampus:platform-stats',
  ttlMs: 60000,
};
`,
              },
              SHARED_DATABASE_SERVICE_FILE,
              {
                name: 'platform-stats.module.ts',
                code: `import { Module } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { KampusStatsController } from './platform-stats.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [KampusStatsController],
  providers: [DatabaseService, CacheInterceptor],
})
export class PlatformStatsModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'platform-stats.controller.ts',
                code: `import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { DatabaseService } from './database.service';

@Controller('platform-stats')
export class KampusStatsController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheKey('kampus:platform-stats')
  @CacheTTL(60000)
  getPlatformStats() {
    return {
      totalHostels: this.db.listings.length,
      totalStudents: this.db.users.length,
    };
  }
}
`,
              },
              {
                name: 'cache.config.ts',
                code: `export const STATS_CACHE_CONFIG = {
  key: 'kampus:platform-stats',
  ttlMs: 60000,
};
`,
              },
              SHARED_DATABASE_SERVICE_FILE,
              {
                name: 'platform-stats.module.ts',
                code: `import { Module } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { KampusStatsController } from './platform-stats.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [KampusStatsController],
  providers: [DatabaseService, CacheInterceptor],
})
export class PlatformStatsModule {}
`,
              },
            ],
            tests: [
              {
                name: '1st GET /platform-stats returns x-cache: MISS and 2nd GET returns x-cache: HIT under key kampus:platform-stats',
                steps: [
                  { method: 'GET', url: '/platform-stats', headers: {} },
                  { method: 'GET', url: '/platform-stats', headers: {} },
                ],
                check: (lastRes, _state, all) =>
                  all[0]?.headers['x-cache'] === 'MISS' &&
                  lastRes.headers['x-cache'] === 'HIT' &&
                  lastRes.headers['x-cache-key'] === 'kampus:platform-stats'
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected MISS then HIT with key="kampus:platform-stats", got ${all[0]?.headers['x-cache']} -> ${lastRes.headers['x-cache']} (${lastRes.headers['x-cache-key']})`,
                      },
              },
            ],
          },
        },

        {
          id: 'cache-aside-eviction',
          code: '7.2',
          title: 'Programmatic Cache-Aside & Eviction on Landlord Rent Update',
          difficulty: 'Intermediate',
          summary: 'Implement the Cache-Aside pattern with CACHE_MANAGER and evict stale hostel keys whenever a landlord updates rent.',
          theory: `
            <h4>🏠 Story Context: Preventing Stale Rent Prices After a Landlord Edit</h4>
            <p>Declarative caching is great for static feeds, but what happens when Landlord Chidi updates the annual rent on Cedar Court Studio from <code>$180</code> to <code>$195</code>? If we don't evict the cache key immediately, students will still see <code>$180</code> until the TTL expires!</p>
            <h4>The Cache-Aside Pattern with <code>CACHE_MANAGER</code></h4>
            <ol>
              <li><strong>Read Path:</strong> Check <code>await this.cache.get(key)</code> first. On a hit, return immediately (<code>source: 'cache'</code>).</li>
              <li><strong>Miss Path:</strong> Query <code>this.db.findListingById(id)</code>, store in cache via <code>await this.cache.set(key, listing, 30000)</code>, and return <code>source: 'database'</code>.</li>
              <li><strong>Eviction Path:</strong> On <code>PATCH /cached-listings/:id</code>, call <code>await this.cache.del(key)</code> so the next student read fetches fresh data!</li>
            </ol>
          `,
          exampleFiles: [
            {
              name: 'cached-listings.controller.ts',
              code: `import { Controller, Get, Patch, Param, Body, Inject, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER, CacheManager } from '@nestjs/cache-manager';
import { DatabaseService } from './database.service';
import { UpdateRentDto } from './update-rent.dto';

@Controller('cached-listings')
export class CachedListingsController {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: CacheManager,
    private readonly db: DatabaseService,
  ) {}

  @Get(':id')
  async getHostel(@Param('id', ParseIntPipe) id: number) {
    const key = \`kampus:listing:\${id}\`;
    const cached = await this.cache.get(key);
    if (cached) {
      return { source: 'cache', listing: cached };
    }

    const listing = this.db.findListingById(id);
    if (!listing) throw new NotFoundException(\`Hostel #\${id} not found\`);

    await this.cache.set(key, listing, 30000);
    return { source: 'database', listing };
  }

  @Patch(':id')
  async updateHostelRent(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRentDto,
  ) {
    const updated = this.db.updateListing(id, body);
    const key = \`kampus:listing:\${id}\`;
    await this.cache.del(key);
    return { evictedKey: key, listing: updated };
  }
}
`,
            },
            {
              name: 'update-rent.dto.ts',
              code: `export class UpdateRentDto {
  title?: string;
  rentPerYear?: number;
}
`,
            },
            SHARED_DATABASE_SERVICE_FILE,
            {
              name: 'cached-listings.module.ts',
              code: `import { Module } from '@nestjs/common';
import { CachedListingsController } from './cached-listings.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [CachedListingsController],
  providers: [DatabaseService],
})
export class CachedListingsModule {}
`,
            },
          ],
          presets: [
            {
              label: '1. GET /cached-listings/1 (1st call = DB Miss, 2nd = Cache Hit)',
              method: 'GET',
              url: '/cached-listings/1',
              headers: {},
              body: '',
            },
            {
              label: '2. PATCH /cached-listings/1 (Update Rent to $195 & Evict Cache)',
              method: 'PATCH',
              url: '/cached-listings/1',
              headers: {},
              body: JSON.stringify({ rentPerYear: 195 }, null, 2),
            },
          ],
          exercise: {
            title: 'Implement Cache-Aside & Eviction for Kampus Featured Hostels',
            prompt: `Complete <code>FeaturedHostelsController</code> in <code>featured-hostels.controller.ts</code>:
              <ol>
                <li>In <code>GET /featured-hostels</code>, check <code>await this.cache.get('kampus:featured')</code>. If present, return <code>{ cached: true, items: cached }</code>.</li>
                <li>On a cache miss, fetch <code>const items = this.db.findListings({ verified: true })</code>, save them under <code>'kampus:featured'</code> with TTL <code>60000</code>, and return <code>{ cached: false, items }</code>.</li>
                <li>In <code>POST /featured-hostels/invalidate</code>, call <code>await this.cache.del('kampus:featured')</code> and return <code>{ invalidated: true }</code>.</li>
              </ol>`,
            hints: [
              'Call `const cached = await this.cache.get("kampus:featured"); if (cached) return { cached: true, items: cached };`',
              'On miss, call `const items = this.db.findListings({ verified: true }); await this.cache.set("kampus:featured", items, 60000); return { cached: false, items };`',
            ],
            starterFiles: [
              {
                name: 'featured-hostels.controller.ts',
                code: `import { Controller, Get, Post, Inject } from '@nestjs/common';
import { CACHE_MANAGER, CacheManager } from '@nestjs/cache-manager';
import { DatabaseService } from './database.service';

@Controller('featured-hostels')
export class FeaturedHostelsController {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: CacheManager,
    private readonly db: DatabaseService,
  ) {}

  @Get()
  async getFeatured() {
    // TODO: Check 'kampus:featured' in cache; on miss query this.db.findListings({ verified: true }) and set cache
    return { cached: false, items: [] };
  }

  @Post('invalidate')
  async invalidate() {
    // TODO: Delete 'kampus:featured' from cache and return { invalidated: true }
    return { invalidated: false };
  }
}
`,
              },
              SHARED_DATABASE_SERVICE_FILE,
              {
                name: 'featured-hostels.module.ts',
                code: `import { Module } from '@nestjs/common';
import { FeaturedHostelsController } from './featured-hostels.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [FeaturedHostelsController],
  providers: [DatabaseService],
})
export class FeaturedHostelsModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'featured-hostels.controller.ts',
                code: `import { Controller, Get, Post, Inject } from '@nestjs/common';
import { CACHE_MANAGER, CacheManager } from '@nestjs/cache-manager';
import { DatabaseService } from './database.service';

@Controller('featured-hostels')
export class FeaturedHostelsController {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: CacheManager,
    private readonly db: DatabaseService,
  ) {}

  @Get()
  async getFeatured() {
    const key = 'kampus:featured';
    const cached = await this.cache.get(key);
    if (cached) {
      return { cached: true, items: cached };
    }
    const items = this.db.findListings({ verified: true });
    await this.cache.set(key, items, 60000);
    return { cached: false, items };
  }

  @Post('invalidate')
  async invalidate() {
    await this.cache.del('kampus:featured');
    return { invalidated: true };
  }
}
`,
              },
              SHARED_DATABASE_SERVICE_FILE,
              {
                name: 'featured-hostels.module.ts',
                code: `import { Module } from '@nestjs/common';
import { FeaturedHostelsController } from './featured-hostels.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [FeaturedHostelsController],
  providers: [DatabaseService],
})
export class FeaturedHostelsModule {}
`,
              },
            ],
            tests: [
              {
                name: '1st GET /featured-hostels misses cache (cached: false) and 2nd GET hits cache (cached: true)',
                steps: [
                  { method: 'GET', url: '/featured-hostels', headers: {} },
                  { method: 'GET', url: '/featured-hostels', headers: {} },
                ],
                check: (_lastRes, _state, all) =>
                  all[0]?.body?.cached === false &&
                  all[0]?.body?.items?.length === 2 &&
                  all[1]?.body?.cached === true
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected 1st cached=false and 2nd cached=true, got ${JSON.stringify(all.map((r) => r.body))}`,
                      },
              },
              {
                name: 'POST /featured-hostels/invalidate evicts kampus:featured so next GET fetches fresh DB data',
                steps: [
                  { method: 'GET', url: '/featured-hostels', headers: {} },
                  { method: 'POST', url: '/featured-hostels/invalidate', headers: {} },
                  { method: 'GET', url: '/featured-hostels', headers: {} },
                ],
                check: (lastRes, _state, all) =>
                  all[1]?.body?.invalidated === true && lastRes.body?.cached === false
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected invalidated=true followed by cached=false, got ${JSON.stringify(lastRes.body)}`,
                      },
              },
            ],
          },
        },
      ],
    },

    // =========================================================================
    // MODULE 8: KAMPUS ERROR CONTRACTS — EXCEPTION FILTERS & DOMAIN ERRORS
    // =========================================================================
    {
      id: 'mod-exceptions',
      number: '08',
      title: 'Kampus Error Contracts: Exception Filters',
      icon: 'alert-triangle',
      description: 'Throw expressive domain exceptions (422 Insufficient Escrow Funds) and map database constraint errors in @Catch() filters.',
      subconcepts: [
        {
          id: 'domain-http-exceptions',
          code: '8.1',
          title: 'Custom Domain Exceptions: InsufficientEscrowFundsException (HTTP 422)',
          difficulty: 'Intermediate',
          summary: 'Subclass HttpException to express Kampus business rule violations with structured machine-readable error codes.',
          theory: `
            <h4>🏠 Story Context: 400 Bad Request vs. 422 Unprocessable Entity</h4>
            <p>When Adaobi sends <code>{ "listingId": 2, "amount": 650 }</code> to lock rent in escrow, her JSON syntax and types are 100% valid (so <code>400 Bad Request</code> is the wrong status code). However, her Kampus Escrow Wallet only has <code>$400</code>! That violates a <strong>domain business rule</strong>, which HTTP represents with <code>422 Unprocessable Entity</code>.</p>
            <p>Creating a custom class extending <code>HttpException</code> keeps your controllers readable and gives mobile clients a reliable <code>code: 'INSUFFICIENT_ESCROW_FUNDS'</code> field to trigger the "Top Up Wallet" modal.</p>
          `,
          exampleFiles: [
            {
              name: 'hostel-fully-booked.exception.ts',
              code: `import { HttpException, HttpStatus } from '@nestjs/common';

export class HostelFullyBookedException extends HttpException {
  constructor(listingId: number, title: string) {
    super(
      {
        code: 'HOSTEL_FULLY_BOOKED',
        message: \`No rooms left at \${title} (#\${listingId})\`,
        listingId,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
`,
            },
            {
              name: 'hostel-capacity.controller.ts',
              code: `import { Controller, Post, Param, ParseIntPipe } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { HostelFullyBookedException } from './hostel-fully-booked.exception';

@Controller('room-reservations')
export class RoomReservationsController {
  constructor(private readonly db: DatabaseService) {}

  @Post(':id')
  reserve(@Param('id', ParseIntPipe) id: number) {
    const listing = this.db.findListingById(id);
    if (id === 3) {
      throw new HostelFullyBookedException(id, listing?.title || 'Hostel');
    }
    return { reserved: true, listingId: id };
  }
}
`,
            },
            SHARED_DATABASE_SERVICE_FILE,
            {
              name: 'hostel-capacity.module.ts',
              code: `import { Module } from '@nestjs/common';
import { RoomReservationsController } from './hostel-capacity.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [RoomReservationsController],
  providers: [DatabaseService],
})
export class HostelCapacityModule {}
`,
            },
          ],
          presets: [
            {
              label: 'POST /room-reservations/3 (Throws 422 HOSTEL_FULLY_BOOKED)',
              method: 'POST',
              url: '/room-reservations/3',
              headers: {},
              body: '',
            },
            {
              label: 'POST /room-reservations/1 (Available -> 201 Created)',
              method: 'POST',
              url: '/room-reservations/1',
              headers: {},
              body: '',
            },
          ],
          exercise: {
            title: 'Build an InsufficientEscrowFundsException (HTTP 422)',
            prompt: `Before Student Adaobi can lock a hostel room on Kampus, her Kampus Escrow Wallet (<code>$400</code>) must cover the rent deposit:
              <ol>
                <li>In <code>escrow-lock.controller.ts</code> (which imports <code>InsufficientEscrowFundsException</code> from <code>insufficient-escrow-funds.exception.ts</code>), read Adaobi's wallet balance (<code>const available = this.db.escrowWallets['u-student-3']</code>).</li>
                <li>If <code>body.amount &gt; available</code>, throw <code>new InsufficientEscrowFundsException(body.amount, available)</code> (HTTP 422 with <code>code: 'INSUFFICIENT_ESCROW_FUNDS'</code>).</li>
                <li>Otherwise return <code>{ status: 'locked_in_escrow', remainingBalance: available - body.amount }</code>.</li>
              </ol>`,
            hints: [
              'In `escrow-lock.controller.ts` (`lockRent`), check `if (body.amount > available) throw new InsufficientEscrowFundsException(body.amount, available);`.',
              'Inspect `insufficient-escrow-funds.exception.ts` to see how `HttpException` is constructed with `HttpStatus.UNPROCESSABLE_ENTITY` (422).',
            ],
            starterFiles: [
              {
                name: 'escrow-lock.controller.ts',
                code: `import { Controller, Post, Body } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { InsufficientEscrowFundsException } from './insufficient-escrow-funds.exception';
import { LockRentDto } from './lock-rent.dto';

@Controller('escrow')
export class EscrowLockController {
  constructor(private readonly db: DatabaseService) {}

  @Post('lock-rent')
  lockRent(@Body() body: LockRentDto) {
    const available = this.db.escrowWallets['u-student-3']; // $400
    // TODO: If body.amount > available, throw new InsufficientEscrowFundsException(body.amount, available)
    return {
      status: 'locked_in_escrow',
      remainingBalance: available - body.amount,
    };
  }
}
`,
              },
              {
                name: 'insufficient-escrow-funds.exception.ts',
                code: `import { HttpException, HttpStatus } from '@nestjs/common';

export class InsufficientEscrowFundsException extends HttpException {
  constructor(required: number, available: number) {
    super(
      {
        code: 'INSUFFICIENT_ESCROW_FUNDS',
        message: 'Insufficient Kampus escrow balance',
        required,
        available,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
`,
              },
              {
                name: 'lock-rent.dto.ts',
                code: `export class LockRentDto {
  listingId: number;
  amount: number;
}
`,
              },
              SHARED_DATABASE_SERVICE_FILE,
              {
                name: 'escrow-lock.module.ts',
                code: `import { Module } from '@nestjs/common';
import { EscrowLockController } from './escrow-lock.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [EscrowLockController],
  providers: [DatabaseService],
})
export class EscrowLockModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'escrow-lock.controller.ts',
                code: `import { Controller, Post, Body } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { InsufficientEscrowFundsException } from './insufficient-escrow-funds.exception';
import { LockRentDto } from './lock-rent.dto';

@Controller('escrow')
export class EscrowLockController {
  constructor(private readonly db: DatabaseService) {}

  @Post('lock-rent')
  lockRent(@Body() body: LockRentDto) {
    const available = this.db.escrowWallets['u-student-3'];
    if (body.amount > available) {
      throw new InsufficientEscrowFundsException(body.amount, available);
    }
    return {
      status: 'locked_in_escrow',
      remainingBalance: available - body.amount,
    };
  }
}
`,
              },
              {
                name: 'insufficient-escrow-funds.exception.ts',
                code: `import { HttpException, HttpStatus } from '@nestjs/common';

export class InsufficientEscrowFundsException extends HttpException {
  constructor(required: number, available: number) {
    super(
      {
        code: 'INSUFFICIENT_ESCROW_FUNDS',
        message: 'Insufficient Kampus escrow balance',
        required,
        available,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
`,
              },
              {
                name: 'lock-rent.dto.ts',
                code: `export class LockRentDto {
  listingId: number;
  amount: number;
}
`,
              },
              SHARED_DATABASE_SERVICE_FILE,
              {
                name: 'escrow-lock.module.ts',
                code: `import { Module } from '@nestjs/common';
import { EscrowLockController } from './escrow-lock.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [EscrowLockController],
  providers: [DatabaseService],
})
export class EscrowLockModule {}
`,
              },
            ],
            tests: [
              {
                name: 'Returns 422 Unprocessable Entity with code INSUFFICIENT_ESCROW_FUNDS when rent ($650) > balance ($400)',
                request: {
                  method: 'POST',
                  url: '/escrow/lock-rent',
                  headers: {},
                  body: { listingId: 2, amount: 650 },
                },
                check: (res) =>
                  res.status === 422 && res.body?.code === 'INSUFFICIENT_ESCROW_FUNDS'
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected 422 with code="INSUFFICIENT_ESCROW_FUNDS", got ${res.status}: ${JSON.stringify(res.body)}`,
                      },
              },
              {
                name: 'Locks rent in escrow and returns remainingBalance: 220 when amount ($180) <= $400',
                request: {
                  method: 'POST',
                  url: '/escrow/lock-rent',
                  headers: {},
                  body: { listingId: 1, amount: 180 },
                },
                check: (res) =>
                  res.status === 201 &&
                  res.body?.status === 'locked_in_escrow' &&
                  res.body?.remainingBalance === 220
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected remainingBalance=220, got ${JSON.stringify(res.body)}`,
                      },
              },
            ],
          },
        },

        {
          id: 'custom-exception-filters',
          code: '8.2',
          title: 'Exception Filters (@Catch): Translating Duplicate Student Email DB Errors',
          difficulty: 'Intermediate',
          summary: 'Catch low-level QueryFailedError database exceptions in an ExceptionFilter and map them to 409 Conflict.',
          theory: `
            <h4>🏠 Story Context: Catching Database Constraint Errors Cleanly</h4>
            <p>When Adaobi accidentally submits the student registration form twice with <code>ada@kampus.edu</code>, the database driver throws a low-level <code>QueryFailedError: UNIQUE constraint failed</code>. If left unhandled, NestJS returns a generic <code>500 Internal Server Error</code>.</p>
            <h4>How <code>@Catch()</code> Exception Filters Work</h4>
            <ul>
              <li><code>@Catch(QueryFailedError)</code> catches only database driver errors; <code>@Catch()</code> catches everything.</li>
              <li>Translate unique constraint violations into <code>409 Conflict</code> with a friendly message and <code>errorCode: 'STUDENT_EMAIL_EXISTS'</code>.</li>
            </ul>
          `,
          exampleFiles: [
            {
              name: 'kampus-exception.filter.ts',
              code: `import { Catch, HttpException, HttpStatus } from '@nestjs/common';
import { QueryFailedError } from './database.service';

@Catch()
export class KampusExceptionFilter {
  catch(exception: any, host: any) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    if (exception instanceof QueryFailedError || String(exception?.message).includes('UNIQUE')) {
      return res.status(HttpStatus.CONFLICT).json({
        statusCode: 409,
        errorCode: 'STUDENT_EMAIL_EXISTS',
        message: 'A Kampus student account with this university email already exists',
        path: req.url,
      });
    }

    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const raw = exception instanceof HttpException ? exception.getResponse() : { message: exception?.message };

    return res.status(status).json({
      statusCode: status,
      errorCode: (raw as any)?.code || 'KAMPUS_HTTP_ERROR',
      message: (raw as any)?.message || exception?.message,
      path: req.url,
    });
  }
}
`,
            },
            {
              name: 'students.controller.ts',
              code: `import { Controller, Post, Body, UseFilters } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { KampusExceptionFilter } from './kampus-exception.filter';
import { RegisterStudentDto } from './register-student.dto';

@Controller('students')
@UseFilters(KampusExceptionFilter)
export class StudentsController {
  constructor(private readonly db: DatabaseService) {}

  @Post('register')
  register(@Body() body: RegisterStudentDto) {
    return this.db.createUser(body);
  }
}
`,
            },
            {
              name: 'register-student.dto.ts',
              code: `export class RegisterStudentDto {
  email: string;
  name: string;
}
`,
            },
            SHARED_DATABASE_SERVICE_FILE,
            {
              name: 'students.module.ts',
              code: `import { Module } from '@nestjs/common';
import { StudentsController } from './students.controller';
import { KampusExceptionFilter } from './kampus-exception.filter';
import { DatabaseService } from './database.service';

@Module({
  controllers: [StudentsController],
  providers: [DatabaseService, KampusExceptionFilter],
})
export class StudentsModule {}
`,
            },
          ],
          presets: [
            {
              label: 'Duplicate Email: POST /students/register (ada@kampus.edu -> 409 Conflict)',
              method: 'POST',
              url: '/students/register',
              headers: {},
              body: JSON.stringify({ email: 'ada@kampus.edu', name: 'Adaobi Duplicate' }, null, 2),
            },
            {
              label: 'New Student: POST /students/register (seyi@kampus.edu -> 201 Created)',
              method: 'POST',
              url: '/students/register',
              headers: {},
              body: JSON.stringify({ email: 'seyi@kampus.edu', name: 'Seyi Makinde (200L MechEng)' }, null, 2),
            },
          ],
          exercise: {
            title: 'Write a QueryFailedError Filter for Duplicate Student Signup',
            prompt: `In <code>unique-email.filter.ts</code> (applied to <code>SignupController</code> in <code>signup.controller.ts</code>), implement <code>UniqueStudentEmailFilter</code> (decorated with <code>@Catch(QueryFailedError)</code>):
              <ol>
                <li>Use <code>host.switchToHttp()</code> to get <code>req</code> and <code>res</code>.</li>
                <li>Return <code>res.status(409).json({ statusCode: 409, errorCode: 'DUPLICATE_KAMPUS_EMAIL', path: req.url })</code>.</li>
              </ol>`,
            hints: [
              'Call `const ctx = host.switchToHttp(); const req = ctx.getRequest(); const res = ctx.getResponse();`',
              'Call `res.status(409).json({ statusCode: 409, errorCode: "DUPLICATE_KAMPUS_EMAIL", path: req.url });`',
            ],
            starterFiles: [
              {
                name: 'unique-email.filter.ts',
                code: `import { Catch } from '@nestjs/common';
import { QueryFailedError } from './database.service';

@Catch(QueryFailedError)
export class UniqueStudentEmailFilter {
  catch(exception: QueryFailedError, host: any) {
    // TODO: Extract req and res from host.switchToHttp() and send HTTP 409 with
    // { statusCode: 409, errorCode: 'DUPLICATE_KAMPUS_EMAIL', path: req.url }
  }
}
`,
              },
              {
                name: 'signup.controller.ts',
                code: `import { Controller, Post, Body, UseFilters } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { UniqueStudentEmailFilter } from './unique-email.filter';
import { SignupDto } from './signup.dto';

@Controller('signup')
@UseFilters(UniqueStudentEmailFilter)
export class SignupController {
  constructor(private readonly db: DatabaseService) {}

  @Post()
  signup(@Body() body: SignupDto) {
    return this.db.createUser(body);
  }
}
`,
              },
              {
                name: 'signup.dto.ts',
                code: `export class SignupDto {
  email: string;
  name: string;
}
`,
              },
              SHARED_DATABASE_SERVICE_FILE,
              {
                name: 'signup.module.ts',
                code: `import { Module } from '@nestjs/common';
import { SignupController } from './signup.controller';
import { UniqueStudentEmailFilter } from './unique-email.filter';
import { DatabaseService } from './database.service';

@Module({
  controllers: [SignupController],
  providers: [DatabaseService, UniqueStudentEmailFilter],
})
export class SignupModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'unique-email.filter.ts',
                code: `import { Catch } from '@nestjs/common';
import { QueryFailedError } from './database.service';

@Catch(QueryFailedError)
export class UniqueStudentEmailFilter {
  catch(exception: QueryFailedError, host: any) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    res.status(409).json({
      statusCode: 409,
      errorCode: 'DUPLICATE_KAMPUS_EMAIL',
      path: req.url,
    });
  }
}
`,
              },
              {
                name: 'signup.controller.ts',
                code: `import { Controller, Post, Body, UseFilters } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { UniqueStudentEmailFilter } from './unique-email.filter';
import { SignupDto } from './signup.dto';

@Controller('signup')
@UseFilters(UniqueStudentEmailFilter)
export class SignupController {
  constructor(private readonly db: DatabaseService) {}

  @Post()
  signup(@Body() body: SignupDto) {
    return this.db.createUser(body);
  }
}
`,
              },
              {
                name: 'signup.dto.ts',
                code: `export class SignupDto {
  email: string;
  name: string;
}
`,
              },
              SHARED_DATABASE_SERVICE_FILE,
              {
                name: 'signup.module.ts',
                code: `import { Module } from '@nestjs/common';
import { SignupController } from './signup.controller';
import { UniqueStudentEmailFilter } from './unique-email.filter';
import { DatabaseService } from './database.service';

@Module({
  controllers: [SignupController],
  providers: [DatabaseService, UniqueStudentEmailFilter],
})
export class SignupModule {}
`,
              },
            ],
            tests: [
              {
                name: 'Maps duplicate ada@kampus.edu QueryFailedError to 409 Conflict with errorCode: DUPLICATE_KAMPUS_EMAIL',
                request: {
                  method: 'POST',
                  url: '/signup',
                  headers: {},
                  body: { email: 'ada@kampus.edu', name: 'Adaobi Okafor' },
                },
                check: (res) =>
                  res.status === 409 && res.body?.errorCode === 'DUPLICATE_KAMPUS_EMAIL'
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected 409 with errorCode="DUPLICATE_KAMPUS_EMAIL", got ${res.status}: ${JSON.stringify(res.body)}`,
                      },
              },
              {
                name: 'Allows registering a brand-new student email (201 Created)',
                request: {
                  method: 'POST',
                  url: '/signup',
                  headers: {},
                  body: { email: 'femi@kampus.edu', name: 'Femi Otedola' },
                },
                check: (res) =>
                  res.status === 201 && res.body?.email === 'femi@kampus.edu'
                    ? { pass: true }
                    : { pass: false, reason: `Expected 201 for new email, got ${res.status}` },
              },
            ],
          },
        },
      ],
    },

    // =========================================================================
    // MODULE 9: KAMPUS SEARCH & RENT ESCROW — PAGINATION & ATOMIC TRANSACTIONS
    // =========================================================================
    {
      id: 'mod-database',
      number: '09',
      title: 'Kampus Search & Escrow: Pagination & Transactions',
      icon: 'database',
      description: 'Paginate campus hostel feeds with metadata and execute atomic student-to-landlord escrow rent releases with rollback protection.',
      subconcepts: [
        {
          id: 'pagination-filtering',
          code: '9.1',
          title: 'Paginated Hostel Feeds & Search Metadata',
          difficulty: 'Intermediate',
          summary: 'Slice hostel query results by page and limit and return standardized pagination metadata (total, totalPages).',
          theory: `
            <h4>🏠 Story Context: Paginating 1,000+ Off-Campus Hostels</h4>
            <p>Returning every hostel in a single array slows down mobile data connections on campus. Production NestJS endpoints accept <code>page</code> and <code>limit</code> query parameters and return both <code>items</code> and a <code>meta</code> object:</p>
            <pre><code>{
  "items": [...],
  "meta": { "page": 1, "limit": 2, "total": 3, "totalPages": 2 }
}</code></pre>
          `,
          exampleFiles: [
            {
              name: 'hostel-feed.controller.ts',
              code: `import { Controller, Get, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { PaginatedFeedResponse } from './pagination-query.dto';

@Controller('hostel-feed')
export class HostelFeedController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  searchHostels(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(2), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ): PaginatedFeedResponse {
    const all = this.db.findListings({ search });
    const total = all.length;
    const start = (page - 1) * limit;
    const items = all.slice(start, start + limit);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
`,
            },
            {
              name: 'pagination-query.dto.ts',
              code: `export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedFeedResponse<T = any> {
  items: T[];
  meta: PaginationMeta;
}
`,
            },
            SHARED_DATABASE_SERVICE_FILE,
            {
              name: 'hostel-feed.module.ts',
              code: `import { Module } from '@nestjs/common';
import { HostelFeedController } from './hostel-feed.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [HostelFeedController],
  providers: [DatabaseService],
})
export class HostelFeedModule {}
`,
            },
          ],
          presets: [
            {
              label: 'GET /hostel-feed?page=1&limit=2 (Page 1 of Hostels)',
              method: 'GET',
              url: '/hostel-feed?page=1&limit=2',
              headers: {},
              body: '',
            },
            {
              label: 'GET /hostel-feed?page=2&limit=2 (Page 2 of Hostels)',
              method: 'GET',
              url: '/hostel-feed?page=2&limit=2',
              headers: {},
              body: '',
            },
          ],
          exercise: {
            title: 'Paginate the Kampus Hostel Feed with Max-Rent Filtering',
            prompt: `Implement <code>GET /budget-hostels</code> in <code>budget-hostels.controller.ts</code>:
              <ol>
                <li>Filter listings via <code>const all = this.db.findListings({ maxRent })</code>.</li>
                <li>Slice <code>const items = all.slice((page - 1) * limit, (page - 1) * limit + limit)</code>.</li>
                <li>Return <code>{ items, meta: { page, limit, total: all.length, totalPages: Math.ceil(all.length / limit) } }</code>.</li>
              </ol>`,
            hints: [
              'Compute `const start = (page - 1) * limit; const items = all.slice(start, start + limit);`.',
              'Return `{ items, meta: { page, limit, total: all.length, totalPages: Math.ceil(all.length / limit) } }`.',
            ],
            starterFiles: [
              {
                name: 'budget-hostels.controller.ts',
                code: `import { Controller, Get, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { BudgetQueryResultDto } from './budget-query.dto';

@Controller('budget-hostels')
export class BudgetHostelsController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  findBudget(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(2), ParseIntPipe) limit: number,
    @Query('maxRent') maxRent?: string,
  ): BudgetQueryResultDto {
    const all = this.db.findListings({ maxRent });
    // TODO: Slice 'all' using page & limit and return { items, meta: { page, limit, total, totalPages } }
    return { items: [], meta: {} };
  }
}
`,
              },
              {
                name: 'budget-query.dto.ts',
                code: `export interface BudgetQueryResultDto {
  items: any[];
  meta: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}
`,
              },
              SHARED_DATABASE_SERVICE_FILE,
              {
                name: 'budget-hostels.module.ts',
                code: `import { Module } from '@nestjs/common';
import { BudgetHostelsController } from './budget-hostels.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [BudgetHostelsController],
  providers: [DatabaseService],
})
export class BudgetHostelsModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'budget-hostels.controller.ts',
                code: `import { Controller, Get, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { BudgetQueryResultDto } from './budget-query.dto';

@Controller('budget-hostels')
export class BudgetHostelsController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  findBudget(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(2), ParseIntPipe) limit: number,
    @Query('maxRent') maxRent?: string,
  ): BudgetQueryResultDto {
    const all = this.db.findListings({ maxRent });
    const total = all.length;
    const start = (page - 1) * limit;
    const items = all.slice(start, start + limit);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
`,
              },
              {
                name: 'budget-query.dto.ts',
                code: `export interface BudgetQueryResultDto {
  items: any[];
  meta: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}
`,
              },
              SHARED_DATABASE_SERVICE_FILE,
              {
                name: 'budget-hostels.module.ts',
                code: `import { Module } from '@nestjs/common';
import { BudgetHostelsController } from './budget-hostels.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [BudgetHostelsController],
  providers: [DatabaseService],
})
export class BudgetHostelsModule {}
`,
              },
            ],
            tests: [
              {
                name: 'GET /budget-hostels?page=1&limit=2 returns 2 items and meta { page: 1, limit: 2, total: 3, totalPages: 2 }',
                request: { method: 'GET', url: '/budget-hostels?page=1&limit=2', headers: {} },
                check: (res) =>
                  res.status === 200 &&
                  res.body?.items?.length === 2 &&
                  res.body?.meta?.total === 3 &&
                  res.body?.meta?.totalPages === 2
                    ? { pass: true }
                    : { pass: false, reason: `Unexpected pagination response: ${JSON.stringify(res.body)}` },
              },
              {
                name: 'GET /budget-hostels?maxRent=190 filters to hostels <= $190/yr (total: 2)',
                request: { method: 'GET', url: '/budget-hostels?maxRent=190', headers: {} },
                check: (res) =>
                  res.status === 200 && res.body?.meta?.total === 2
                    ? { pass: true }
                    : { pass: false, reason: `Expected total=2 for maxRent=190, got ${JSON.stringify(res.body?.meta)}` },
              },
            ],
          },
        },

        {
          id: 'pagination-transactions',
          code: '9.2',
          title: 'Atomic Rent Escrow Release & Rollback Safety (db.transaction)',
          difficulty: 'Advanced',
          summary: 'Wrap student-to-landlord escrow wallet transfers in an atomic transaction that rolls back if any step fails.',
          theory: `
            <h4>🏠 Story Context: Releasing Student Rent from Escrow to the Landlord</h4>
            <p>When Adaobi inspects Cedar Court Studio and clicks <em>"Approve &amp; Release $180 Rent to Landlord Chidi"</em>, Kampus performs two database writes:</p>
            <ol>
              <li>Deduct <code>$180</code> from Adaobi's escrow wallet (<code>u-student-3</code>).</li>
              <li>Credit <code>$180</code> to Landlord Chidi's wallet (<code>u-landlord-2</code>).</li>
            </ol>
            <p>If an error occurs after deducting from Adaobi (e.g. invalid landlord ID), wrapping the logic in <code>await this.db.transaction(async (tx) =&gt; { ... })</code> guarantees the <strong>entire transaction rolls back</strong> so student rent money never vanishes!</p>
          `,
          exampleFiles: [
            {
              name: 'escrow-transfer-demo.controller.ts',
              code: `import { Controller, Post, Body, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { EscrowTransferDto } from './escrow-transfer.dto';

@Controller('escrow-demo')
export class EscrowTransferDemoController {
  constructor(private readonly db: DatabaseService) {}

  @Post('transfer')
  async transfer(@Body() dto: EscrowTransferDto) {
    return await this.db.transaction(async (tx) => {
      if ((tx.escrowWallets[dto.fromUserId] ?? 0) < dto.amount) {
        throw new BadRequestException('Insufficient escrow balance');
      }
      // Step 1: Deduct from sender
      tx.escrowWallets[dto.fromUserId] -= dto.amount;

      // Step 2: Verify recipient exists (throws & rolls back Step 1 if missing!)
      if (!tx.findUserById(dto.toUserId)) {
        throw new NotFoundException('Recipient account not found — rolled back!');
      }

      // Step 3: Credit recipient
      tx.escrowWallets[dto.toUserId] += dto.amount;
      return { ok: true, wallets: tx.escrowWallets };
    });
  }
}
`,
            },
            {
              name: 'escrow-transfer.dto.ts',
              code: `export class EscrowTransferDto {
  fromUserId: string;
  toUserId: string;
  amount: number;
}
`,
            },
            SHARED_DATABASE_SERVICE_FILE,
            {
              name: 'escrow-transfer.module.ts',
              code: `import { Module } from '@nestjs/common';
import { EscrowTransferDemoController } from './escrow-transfer-demo.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [EscrowTransferDemoController],
  providers: [DatabaseService],
})
export class EscrowTransferModule {}
`,
            },
          ],
          presets: [
            {
              label: 'Valid Transfer: Adaobi -> Landlord Chidi ($180)',
              method: 'POST',
              url: '/escrow-demo/transfer',
              headers: {},
              body: JSON.stringify(
                { fromUserId: 'u-student-3', toUserId: 'u-landlord-2', amount: 180 },
                null,
                2,
              ),
            },
            {
              label: 'Simulated Failure: Invalid Landlord (Rolls Back Adaobi Deduction!)',
              method: 'POST',
              url: '/escrow-demo/transfer',
              headers: {},
              body: JSON.stringify(
                { fromUserId: 'u-student-3', toUserId: 'u-nonexistent-99', amount: 180 },
                null,
                2,
              ),
            },
          ],
          exercise: {
            title: 'Implement Atomic Student-to-Landlord Rent Escrow Release',
            prompt: `In <code>escrow-release.controller.ts</code>, implement <code>POST /escrow/release-rent</code> inside <code>await this.db.transaction(async (tx) =&gt; { ... })</code>:
              <ol>
                <li>Check if <code>(tx.escrowWallets[dto.studentId] ?? 0) &lt; dto.amount</code>; if so, throw <code>new BadRequestException('Insufficient student escrow balance')</code>.</li>
                <li>Deduct <code>dto.amount</code> from the student FIRST: <code>tx.escrowWallets[dto.studentId] -= dto.amount</code>.</li>
                <li>Verify the landlord exists via <code>const landlord = tx.findUserById(dto.landlordId)</code>. If <code>!landlord</code>, throw <code>new NotFoundException('Landlord not found — rolling back escrow release')</code>.</li>
                <li>Credit the landlord: <code>tx.escrowWallets[dto.landlordId] = (tx.escrowWallets[dto.landlordId] || 0) + dto.amount</code>.</li>
                <li>Return <code>{ released: true, studentBalance: tx.escrowWallets[dto.studentId], landlordBalance: tx.escrowWallets[dto.landlordId] }</code>.</li>
              </ol>`,
            hints: [
              'Deduct from `tx.escrowWallets[dto.studentId]` BEFORE checking `tx.findUserById(dto.landlordId)`—when `NotFoundException` is thrown, `this.db.transaction` automatically rolls back the student deduction!',
            ],
            starterFiles: [
              {
                name: 'escrow-release.controller.ts',
                code: `import { Controller, Post, Body, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { ReleaseRentDto } from './release-rent.dto';

@Controller('escrow')
export class EscrowReleaseController {
  constructor(private readonly db: DatabaseService) {}

  @Post('release-rent')
  async releaseRent(@Body() dto: ReleaseRentDto) {
    return await this.db.transaction(async (tx) => {
      // TODO:
      // 1. Check (tx.escrowWallets[dto.studentId] ?? 0) < dto.amount -> throw BadRequestException
      // 2. Deduct dto.amount from tx.escrowWallets[dto.studentId]
      // 3. Check tx.findUserById(dto.landlordId) -> if missing, throw NotFoundException
      // 4. Credit dto.amount to tx.escrowWallets[dto.landlordId]
      // 5. Return { released: true, studentBalance, landlordBalance }
      return {};
    });
  }
}
`,
              },
              {
                name: 'release-rent.dto.ts',
                code: `export class ReleaseRentDto {
  studentId: string;
  landlordId: string;
  amount: number;
}
`,
              },
              SHARED_DATABASE_SERVICE_FILE,
              {
                name: 'escrow-release.module.ts',
                code: `import { Module } from '@nestjs/common';
import { EscrowReleaseController } from './escrow-release.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [EscrowReleaseController],
  providers: [DatabaseService],
})
export class EscrowReleaseModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'escrow-release.controller.ts',
                code: `import { Controller, Post, Body, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { ReleaseRentDto } from './release-rent.dto';

@Controller('escrow')
export class EscrowReleaseController {
  constructor(private readonly db: DatabaseService) {}

  @Post('release-rent')
  async releaseRent(@Body() dto: ReleaseRentDto) {
    return await this.db.transaction(async (tx) => {
      const studentBal = tx.escrowWallets[dto.studentId] ?? 0;
      if (studentBal < dto.amount) {
        throw new BadRequestException('Insufficient student escrow balance');
      }

      tx.escrowWallets[dto.studentId] -= dto.amount;

      const landlord = tx.findUserById(dto.landlordId);
      if (!landlord) {
        throw new NotFoundException('Landlord not found — rolling back escrow release');
      }

      tx.escrowWallets[dto.landlordId] = (tx.escrowWallets[dto.landlordId] || 0) + dto.amount;

      return {
        released: true,
        studentBalance: tx.escrowWallets[dto.studentId],
        landlordBalance: tx.escrowWallets[dto.landlordId],
      };
    });
  }
}
`,
              },
              {
                name: 'release-rent.dto.ts',
                code: `export class ReleaseRentDto {
  studentId: string;
  landlordId: string;
  amount: number;
}
`,
              },
              SHARED_DATABASE_SERVICE_FILE,
              {
                name: 'escrow-release.module.ts',
                code: `import { Module } from '@nestjs/common';
import { EscrowReleaseController } from './escrow-release.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [EscrowReleaseController],
  providers: [DatabaseService],
})
export class EscrowReleaseModule {}
`,
              },
            ],
            tests: [
              {
                name: 'Rolls back student Adaobi deduction ($400 stays $400) when landlordId does not exist (404)',
                request: {
                  method: 'POST',
                  url: '/escrow/release-rent',
                  headers: {},
                  body: { studentId: 'u-student-3', landlordId: 'u-fake-scammer-99', amount: 180 },
                },
                check: (res, state) =>
                  res.status === 404 && state.escrowWallets['u-student-3'] === 400
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected 404 and Adaobi balance rolled back to 400, got status=${res.status}, balance=${state.escrowWallets['u-student-3']}`,
                      },
              },
              {
                name: 'Atomically transfers $180 rent from Adaobi ($400 -> $220) to Landlord Chidi ($1200 -> $1380)',
                request: {
                  method: 'POST',
                  url: '/escrow/release-rent',
                  headers: {},
                  body: { studentId: 'u-student-3', landlordId: 'u-landlord-2', amount: 180 },
                },
                check: (res) =>
                  res.status === 201 &&
                  res.body?.released === true &&
                  res.body?.studentBalance === 220 &&
                  res.body?.landlordBalance === 1380
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected studentBalance=220 & landlordBalance=1380, got ${JSON.stringify(res.body)}`,
                      },
              },
            ],
          },
        },
      ],
    },

    // =========================================================================
    // MODULE 10: KAMPUS TRUST & PAYMENTS — DOMAIN EVENTS & IDEMPOTENT CHECKOUT
    // =========================================================================
    {
      id: 'mod-events-idempotency',
      number: '10',
      title: 'Kampus Trust & Payments: Events & Idempotency',
      icon: 'repeat',
      description: 'Decouple hostel safety verification audits with @OnEvent() and prevent double rent charges on unstable campus Wi-Fi.',
      subconcepts: [
        {
          id: 'domain-events-listeners',
          code: '10.1',
          title: 'Domain Events: Decoupling Hostel Safety Audits (EventEmitter2 & @OnEvent)',
          difficulty: 'Advanced',
          summary: 'Emit domain events when landlords publish hostels so audit and notification listeners run without coupling the controller.',
          theory: `
            <h4>🏠 Story Context: Decoupling Side Effects When a Hostel Is Listed</h4>
            <p>When Landlord Chidi publishes a new hostel, Kampus needs to queue a physical safety inspection for Housing Officer Grace and record an audit log. Instead of hardcoding audit logic inside <code>PublishHostelController</code>, we emit <code>'listing.published'</code> via <code>EventEmitter2</code> and handle it in a dedicated <code>@OnEvent('listing.published')</code> listener.</p>
          `,
          exampleFiles: [
            {
              name: 'safety-audit.listener.ts',
              code: `import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DatabaseService } from './database.service';
import { LISTING_PUBLISHED_EVENT, ListingPublishedEvent } from './listing-published.event';

@Injectable()
export class KampusSafetyAuditListener {
  constructor(private readonly db: DatabaseService) {}

  @OnEvent(LISTING_PUBLISHED_EVENT)
  handleListingPublished(payload: ListingPublishedEvent) {
    this.db.auditLogs.push({
      action: 'HOSTEL_QUEUED_FOR_PHYSICAL_VERIFICATION',
      listingId: payload.listingId,
      title: payload.title,
      campusZone: payload.campusZone,
    });
  }
}
`,
            },
            {
              name: 'publish-hostel.controller.ts',
              code: `import { Controller, Post, Body } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseService } from './database.service';
import { LISTING_PUBLISHED_EVENT } from './listing-published.event';

@Controller('landlord-listings')
export class PublishHostelController {
  constructor(
    private readonly db: DatabaseService,
    private readonly events: EventEmitter2,
  ) {}

  @Post()
  publishHostel(@Body() body: { title: string; campusZone: string; rentPerYear: number }) {
    const listing = this.db.createListing({
      ...body,
      landlordId: 'u-landlord-2',
      verified: false,
      published: true,
    });

    this.events.emit(LISTING_PUBLISHED_EVENT, {
      listingId: listing.id,
      title: listing.title,
      campusZone: listing.campusZone,
    });

    return { listing, auditLogCount: this.db.auditLogs.length };
  }
}
`,
            },
            {
              name: 'listing-published.event.ts',
              code: `export const LISTING_PUBLISHED_EVENT = 'listing.published';

export interface ListingPublishedEvent {
  listingId: number;
  title: string;
  campusZone: string;
}
`,
            },
            SHARED_DATABASE_SERVICE_FILE,
            {
              name: 'publish-hostel.module.ts',
              code: `import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PublishHostelController } from './publish-hostel.controller';
import { KampusSafetyAuditListener } from './safety-audit.listener';
import { DatabaseService } from './database.service';

@Module({
  controllers: [PublishHostelController],
  providers: [KampusSafetyAuditListener, DatabaseService, EventEmitter2],
})
export class PublishHostelModule {}
`,
            },
          ],
          presets: [
            {
              label: 'POST /landlord-listings (Emits listing.published -> Safety Audit Listener)',
              method: 'POST',
              url: '/landlord-listings',
              headers: {},
              body: JSON.stringify(
                { title: 'Scholar Haven En-Suite', campusZone: 'North Gate', rentPerYear: 210 },
                null,
                2,
              ),
            },
          ],
          exercise: {
            title: 'Emit & Handle the hostel.verified Domain Event',
            prompt: `When Housing Officer Grace verifies a hostel on <code>POST /verifications/:id</code>:
              <ol>
                <li>In <code>verification.controller.ts</code> (<code>verifyHostel()</code>), emit <code>this.events.emit('hostel.verified', { listingId: id, officer: 'Grace Bello' })</code>.</li>
                <li>Notice how <code>VerificationAuditListener</code> in <code>verification-audit.listener.ts</code> listens via <code>@OnEvent('hostel.verified')</code> and appends <code>{ event: 'HOSTEL_VERIFIED', listingId: payload.listingId, officer: payload.officer }</code> into <code>this.db.auditLogs</code>!</li>
              </ol>`,
            hints: [
              'Call `this.events.emit("hostel.verified", { listingId: id, officer: "Grace Bello" })` inside `verifyHostel()` in `verification.controller.ts`.',
              'Check `verification-audit.listener.ts` to see the `@OnEvent("hostel.verified")` listener handler.',
            ],
            starterFiles: [
              {
                name: 'verification.controller.ts',
                code: `import { Controller, Post, Param, ParseIntPipe } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseService } from './database.service';
import { HOSTEL_VERIFIED_EVENT } from './hostel-verified.event';

@Controller('verifications')
export class VerificationController {
  constructor(
    private readonly db: DatabaseService,
    private readonly events: EventEmitter2,
  ) {}

  @Post(':id')
  verifyHostel(@Param('id', ParseIntPipe) id: number) {
    const updated = this.db.updateListing(id, { verified: true, published: true });
    // TODO: Emit 'hostel.verified' (HOSTEL_VERIFIED_EVENT) with { listingId: id, officer: 'Grace Bello' }
    return { verified: true, listing: updated, auditLogs: this.db.auditLogs };
  }
}
`,
              },
              {
                name: 'verification-audit.listener.ts',
                code: `import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DatabaseService } from './database.service';
import { HOSTEL_VERIFIED_EVENT, HostelVerifiedEvent } from './hostel-verified.event';

@Injectable()
export class VerificationAuditListener {
  constructor(private readonly db: DatabaseService) {}

  @OnEvent(HOSTEL_VERIFIED_EVENT)
  onHostelVerified(payload: HostelVerifiedEvent) {
    this.db.auditLogs.push({
      event: 'HOSTEL_VERIFIED',
      listingId: payload.listingId,
      officer: payload.officer,
    });
  }
}
`,
              },
              {
                name: 'hostel-verified.event.ts',
                code: `export const HOSTEL_VERIFIED_EVENT = 'hostel.verified';

export interface HostelVerifiedEvent {
  listingId: number;
  officer: string;
}
`,
              },
              SHARED_DATABASE_SERVICE_FILE,
              {
                name: 'verification.module.ts',
                code: `import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VerificationController } from './verification.controller';
import { VerificationAuditListener } from './verification-audit.listener';
import { DatabaseService } from './database.service';

@Module({
  controllers: [VerificationController],
  providers: [VerificationAuditListener, DatabaseService, EventEmitter2],
})
export class VerificationModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'verification.controller.ts',
                code: `import { Controller, Post, Param, ParseIntPipe } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseService } from './database.service';
import { HOSTEL_VERIFIED_EVENT } from './hostel-verified.event';

@Controller('verifications')
export class VerificationController {
  constructor(
    private readonly db: DatabaseService,
    private readonly events: EventEmitter2,
  ) {}

  @Post(':id')
  verifyHostel(@Param('id', ParseIntPipe) id: number) {
    const updated = this.db.updateListing(id, { verified: true, published: true });
    this.events.emit(HOSTEL_VERIFIED_EVENT, { listingId: id, officer: 'Grace Bello' });
    return { verified: true, listing: updated, auditLogs: this.db.auditLogs };
  }
}
`,
              },
              {
                name: 'verification-audit.listener.ts',
                code: `import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DatabaseService } from './database.service';
import { HOSTEL_VERIFIED_EVENT, HostelVerifiedEvent } from './hostel-verified.event';

@Injectable()
export class VerificationAuditListener {
  constructor(private readonly db: DatabaseService) {}

  @OnEvent(HOSTEL_VERIFIED_EVENT)
  onHostelVerified(payload: HostelVerifiedEvent) {
    this.db.auditLogs.push({
      event: 'HOSTEL_VERIFIED',
      listingId: payload.listingId,
      officer: payload.officer,
    });
  }
}
`,
              },
              {
                name: 'hostel-verified.event.ts',
                code: `export const HOSTEL_VERIFIED_EVENT = 'hostel.verified';

export interface HostelVerifiedEvent {
  listingId: number;
  officer: string;
}
`,
              },
              SHARED_DATABASE_SERVICE_FILE,
              {
                name: 'verification.module.ts',
                code: `import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VerificationController } from './verification.controller';
import { VerificationAuditListener } from './verification-audit.listener';
import { DatabaseService } from './database.service';

@Module({
  controllers: [VerificationController],
  providers: [VerificationAuditListener, DatabaseService, EventEmitter2],
})
export class VerificationModule {}
`,
              },
            ],
            tests: [
              {
                name: 'POST /verifications/3 marks hostel #3 verified and appends HOSTEL_VERIFIED to auditLogs via @OnEvent',
                request: { method: 'POST', url: '/verifications/3', headers: {} },
                check: (res, state) =>
                  res.status === 201 &&
                  state.auditLogs.length === 1 &&
                  state.auditLogs[0]?.event === 'HOSTEL_VERIFIED' &&
                  state.auditLogs[0]?.listingId === 3
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected auditLogs to contain HOSTEL_VERIFIED for listingId=3, got ${JSON.stringify(state.auditLogs)}`,
                      },
              },
            ],
          },
        },

        {
          id: 'events-and-idempotency',
          code: '10.2',
          title: 'Idempotent Rent Checkout on Shaky Hostel Wi-Fi (Idempotency-Key)',
          difficulty: 'Advanced',
          summary: 'Enforce Idempotency-Key headers on rent payments so mobile network retries never charge a student twice.',
          theory: `
            <h4>🏠 Story Context: Preventing Double Rent Charges on Campus Wi-Fi</h4>
            <p>Students often pay rent over congested hostel Wi-Fi. If Adaobi taps <em>"Pay $180 Rent"</em>, the connection drops after the server processes the payment, and her phone automatically retries the exact same POST with <code>Idempotency-Key: idem-ada-cedar-2026</code>, Kampus must return the existing booking (<code>replayed: true</code>) instead of charging her twice!</p>
          `,
          exampleFiles: [
            {
              name: 'idempotent-deposit.controller.ts',
              code: `import { Controller, Post, Body, Headers, BadRequestException } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { CautionDepositDto } from './caution-deposit.dto';

@Controller('caution-deposits')
export class CautionDepositController {
  constructor(private readonly db: DatabaseService) {}

  @Post()
  payDeposit(
    @Headers('idempotency-key') key: string,
    @Body() body: CautionDepositDto,
  ) {
    if (!key) {
      throw new BadRequestException('Missing Idempotency-Key header');
    }
    const existing = this.db.bookings.find((b: any) => b.idempotencyKey === key);
    if (existing) {
      return { replayed: true, booking: existing };
    }
    const booking = {
      id: 'bk-' + (this.db.bookings.length + 101),
      studentId: 'u-student-3',
      listingId: body.listingId,
      amount: body.amount,
      status: 'deposit-paid',
      idempotencyKey: key,
    };
    this.db.bookings.push(booking);
    return { replayed: false, booking };
  }
}
`,
            },
            {
              name: 'caution-deposit.dto.ts',
              code: `export class CautionDepositDto {
  listingId: number;
  amount: number;
}
`,
            },
            SHARED_DATABASE_SERVICE_FILE,
            {
              name: 'caution-deposit.module.ts',
              code: `import { Module } from '@nestjs/common';
import { CautionDepositController } from './idempotent-deposit.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [CautionDepositController],
  providers: [DatabaseService],
})
export class CautionDepositModule {}
`,
            },
          ],
          presets: [
            {
              label: 'POST /caution-deposits (Send twice with same Idempotency-Key!)',
              method: 'POST',
              url: '/caution-deposits',
              headers: { 'idempotency-key': 'idem-caution-101' },
              body: JSON.stringify({ listingId: 1, amount: 50 }, null, 2),
            },
          ],
          exercise: {
            title: 'Implement Idempotent Student Rent Checkout',
            prompt: `Implement <code>POST /escrow/checkout</code> in <code>escrow-checkout.controller.ts</code>:
              <ol>
                <li>Require <code>@Headers('idempotency-key') idempotencyKey: string</code>. If missing, throw <code>new BadRequestException('Idempotency-Key header is required')</code>.</li>
                <li>Check <code>this.db.bookings</code> for an existing booking with <code>b.idempotencyKey === idempotencyKey</code>. If found, return <code>{ replayed: true, booking: existing }</code>.</li>
                <li>Otherwise create <code>const booking = { id: 'bk-' + (this.db.bookings.length + 101), studentId: 'u-student-3', listingId: body.listingId, amount: body.amount, status: 'held-in-escrow', idempotencyKey }</code>, push it to <code>this.db.bookings</code>, and return <code>{ replayed: false, booking }</code>.</li>
              </ol>`,
            hints: [
              'Use `const existing = this.db.bookings.find((b: any) => b.idempotencyKey === idempotencyKey);`',
              'If `existing` is truthy, return `{ replayed: true, booking: existing }` immediately.',
            ],
            starterFiles: [
              {
                name: 'escrow-checkout.controller.ts',
                code: `import { Controller, Post, Body, Headers, BadRequestException } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { CheckoutRentDto } from './checkout-rent.dto';

@Controller('escrow')
export class EscrowCheckoutController {
  constructor(private readonly db: DatabaseService) {}

  @Post('checkout')
  checkoutRent(
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() body: CheckoutRentDto,
  ) {
    // TODO:
    // 1. Throw BadRequestException if !idempotencyKey
    // 2. If booking with idempotencyKey already exists in this.db.bookings, return { replayed: true, booking }
    // 3. Otherwise push new booking to this.db.bookings and return { replayed: false, booking }
    return { replayed: false };
  }
}
`,
              },
              {
                name: 'checkout-rent.dto.ts',
                code: `export class CheckoutRentDto {
  listingId: number;
  amount: number;
}
`,
              },
              SHARED_DATABASE_SERVICE_FILE,
              {
                name: 'escrow-checkout.module.ts',
                code: `import { Module } from '@nestjs/common';
import { EscrowCheckoutController } from './escrow-checkout.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [EscrowCheckoutController],
  providers: [DatabaseService],
})
export class EscrowCheckoutModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'escrow-checkout.controller.ts',
                code: `import { Controller, Post, Body, Headers, BadRequestException } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { CheckoutRentDto } from './checkout-rent.dto';

@Controller('escrow')
export class EscrowCheckoutController {
  constructor(private readonly db: DatabaseService) {}

  @Post('checkout')
  checkoutRent(
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() body: CheckoutRentDto,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const existing = this.db.bookings.find((b: any) => b.idempotencyKey === idempotencyKey);
    if (existing) {
      return { replayed: true, booking: existing };
    }

    const booking = {
      id: 'bk-' + (this.db.bookings.length + 101),
      studentId: 'u-student-3',
      listingId: body.listingId,
      amount: body.amount,
      status: 'held-in-escrow',
      idempotencyKey,
    };
    this.db.bookings.push(booking);

    return { replayed: false, booking };
  }
}
`,
              },
              {
                name: 'checkout-rent.dto.ts',
                code: `export class CheckoutRentDto {
  listingId: number;
  amount: number;
}
`,
              },
              SHARED_DATABASE_SERVICE_FILE,
              {
                name: 'escrow-checkout.module.ts',
                code: `import { Module } from '@nestjs/common';
import { EscrowCheckoutController } from './escrow-checkout.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [EscrowCheckoutController],
  providers: [DatabaseService],
})
export class EscrowCheckoutModule {}
`,
              },
            ],
            tests: [
              {
                name: 'Rejects rent checkout when Idempotency-Key header is missing (400)',
                request: {
                  method: 'POST',
                  url: '/escrow/checkout',
                  headers: {},
                  body: { listingId: 1, amount: 180 },
                },
                check: (res) =>
                  res.status === 400
                    ? { pass: true }
                    : { pass: false, reason: `Expected 400 Bad Request, got ${res.status}` },
              },
              {
                name: 'First request creates booking (replayed: false) and retry with same key replays without duplicate (replayed: true)',
                steps: [
                  {
                    method: 'POST',
                    url: '/escrow/checkout',
                    headers: { 'idempotency-key': 'idem-ada-cedar-2026' },
                    body: { listingId: 1, amount: 180 },
                  },
                  {
                    method: 'POST',
                    url: '/escrow/checkout',
                    headers: { 'idempotency-key': 'idem-ada-cedar-2026' },
                    body: { listingId: 1, amount: 180 },
                  },
                ],
                check: (lastRes, state, all) =>
                  all[0]?.body?.replayed === false &&
                  lastRes.body?.replayed === true &&
                  all[0]?.body?.booking?.id === lastRes.body?.booking?.id &&
                  state.bookings.filter((b) => b.idempotencyKey === 'idem-ada-cedar-2026').length === 1
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected replayed=false then true with 1 booking, got ${JSON.stringify(all.map((r) => r.body))}`,
                      },
              },
            ],
          },
        },
      ],
    },

    // =========================================================================
    // MODULE 11: KAMPUS MOBILE API — VERSIONING, CORRELATION IDS & HEALTH PROBES
    // =========================================================================
    {
      id: 'mod-versioning-observability',
      number: '11',
      title: 'Kampus Mobile API: Versioning & Health Probes',
      icon: 'activity',
      description: 'Serve /v1 and /v2 mobile hostel payloads side-by-side with @Version(), propagate x-request-id, and expose readiness health checks.',
      subconcepts: [
        {
          id: 'uri-api-versioning',
          code: '11.1',
          title: 'URI API Versioning (/v1 vs /v2) & Correlation ID Middleware',
          difficulty: 'Advanced',
          summary: 'Serve legacy v1 and new v2 mobile hostel schemas side-by-side using @Version() and trace requests with x-request-id.',
          theory: `
            <h4>🏠 Story Context: Supporting Legacy Android &amp; New iOS Student Apps</h4>
            <p>Thousands of students still use last semester's Kampus v1 Android app, which expects a flat <code>rentPerYear: 180</code> field. The new v2 iOS app expects a nested <code>pricing</code> object with currency and 5% escrow fee breakdown.</p>
            <ul>
              <li><code>@Version('1')</code> and <code>@Version('2')</code> let a single controller serve <code>/v1/listings/:id</code> and <code>/v2/listings/:id</code> simultaneously without breaking older mobile clients.</li>
              <li><strong>Correlation ID Middleware:</strong> Reads or generates <code>x-request-id</code> and sets it on the response header so every microservice log can be correlated.</li>
            </ul>
          `,
          exampleFiles: [
            {
              name: 'versioned-listings.controller.ts',
              code: `import { Controller, Get, Param, Version, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Controller('listings')
export class VersionedListingsController {
  constructor(private readonly db: DatabaseService) {}

  @Get(':id')
  @Version('1')
  getListingV1(@Param('id', ParseIntPipe) id: number) {
    const listing = this.db.findListingById(id);
    if (!listing) throw new NotFoundException();
    return {
      apiVersion: 'v1',
      id: listing.id,
      title: listing.title,
      rentPerYear: listing.rentPerYear,
    };
  }

  @Get(':id')
  @Version('2')
  getListingV2(@Param('id', ParseIntPipe) id: number) {
    const listing = this.db.findListingById(id);
    if (!listing) throw new NotFoundException();
    return {
      apiVersion: 'v2',
      id: listing.id,
      title: listing.title,
      campusZone: listing.campusZone,
      pricing: {
        rentPerYear: listing.rentPerYear,
        escrowProtectionFee: Math.round(listing.rentPerYear * 0.05),
        currency: 'USD',
      },
    };
  }
}
`,
            },
            {
              name: 'correlation-id.middleware.ts',
              code: `import { Injectable } from '@nestjs/common';

@Injectable()
export class CorrelationIdMiddleware {
  use(req: any, res: any, next: () => void) {
    const requestId = req.headers['x-request-id'] || 'kampus-trace-9001';
    req.id = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
`,
            },
            SHARED_DATABASE_SERVICE_FILE,
            {
              name: 'versioned-listings.module.ts',
              code: `import { Module } from '@nestjs/common';
import { VersionedListingsController } from './versioned-listings.controller';
import { CorrelationIdMiddleware } from './correlation-id.middleware';
import { DatabaseService } from './database.service';

@Module({
  controllers: [VersionedListingsController],
  providers: [CorrelationIdMiddleware, DatabaseService],
})
export class VersionedListingsModule {}
`,
            },
          ],
          presets: [
            {
              label: 'GET /v1/listings/1 (Legacy Student App v1 flat price)',
              method: 'GET',
              url: '/v1/listings/1',
              headers: { 'x-request-id': 'kampus-android-req-41' },
              body: '',
            },
            {
              label: 'GET /v2/listings/1 (New Student App v2 nested pricing + escrow fee)',
              method: 'GET',
              url: '/v2/listings/1',
              headers: { 'x-request-id': 'kampus-ios-req-42' },
              body: '',
            },
          ],
          exercise: {
            title: 'Version the Kampus Booking Receipt Endpoint (/v1 vs /v2)',
            prompt: `In <code>booking-receipts.controller.ts</code> (<code>@Controller('receipts')</code>):
              <ol>
                <li>Add <code>@Version('1')</code> to <code>getReceiptV1()</code> so <code>GET /v1/receipts</code> returns <code>{ version: 'v1', amount: 180 }</code>.</li>
                <li>Add <code>@Version('2')</code> to <code>getReceiptV2()</code> so <code>GET /v2/receipts</code> returns <code>{ version: 'v2', breakdown: { rent: 180, escrowFee: 9, total: 189 } }</code>.</li>
              </ol>`,
            hints: [
              'Decorate `getReceiptV1()` with `@Get()` and `@Version("1")`.',
              'Decorate `getReceiptV2()` with `@Get()` and `@Version("2")`.',
            ],
            starterFiles: [
              {
                name: 'booking-receipts.controller.ts',
                code: `import { Controller, Get, Version } from '@nestjs/common';

@Controller('receipts')
export class BookingReceiptsController {
  // TODO 1: Expose on GET /v1/receipts using @Version('1')
  @Get()
  getReceiptV1() {
    return { version: 'v1', amount: 180 };
  }

  // TODO 2: Expose on GET /v2/receipts using @Version('2')
  @Get()
  getReceiptV2() {
    return {
      version: 'v2',
      breakdown: { rent: 180, escrowFee: 9, total: 189 },
    };
  }
}
`,
              },
              {
                name: 'correlation-id.middleware.ts',
                code: `import { Injectable } from '@nestjs/common';

@Injectable()
export class CorrelationIdMiddleware {
  use(req: any, res: any, next: () => void) {
    const requestId = req.headers['x-request-id'] || 'kampus-receipt-trace-1';
    req.id = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
`,
              },
              {
                name: 'booking-receipts.module.ts',
                code: `import { Module } from '@nestjs/common';
import { BookingReceiptsController } from './booking-receipts.controller';
import { CorrelationIdMiddleware } from './correlation-id.middleware';

@Module({
  controllers: [BookingReceiptsController],
  providers: [CorrelationIdMiddleware],
})
export class BookingReceiptsModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'booking-receipts.controller.ts',
                code: `import { Controller, Get, Version } from '@nestjs/common';

@Controller('receipts')
export class BookingReceiptsController {
  @Get()
  @Version('1')
  getReceiptV1() {
    return { version: 'v1', amount: 180 };
  }

  @Get()
  @Version('2')
  getReceiptV2() {
    return {
      version: 'v2',
      breakdown: { rent: 180, escrowFee: 9, total: 189 },
    };
  }
}
`,
              },
              {
                name: 'correlation-id.middleware.ts',
                code: `import { Injectable } from '@nestjs/common';

@Injectable()
export class CorrelationIdMiddleware {
  use(req: any, res: any, next: () => void) {
    const requestId = req.headers['x-request-id'] || 'kampus-receipt-trace-1';
    req.id = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
`,
              },
              {
                name: 'booking-receipts.module.ts',
                code: `import { Module } from '@nestjs/common';
import { BookingReceiptsController } from './booking-receipts.controller';
import { CorrelationIdMiddleware } from './correlation-id.middleware';

@Module({
  controllers: [BookingReceiptsController],
  providers: [CorrelationIdMiddleware],
})
export class BookingReceiptsModule {}
`,
              },
            ],
            tests: [
              {
                name: 'GET /v1/receipts returns legacy v1 flat receipt { version: "v1", amount: 180 }',
                request: { method: 'GET', url: '/v1/receipts', headers: {} },
                check: (res) =>
                  res.status === 200 && res.body?.version === 'v1' && res.body?.amount === 180
                    ? { pass: true }
                    : { pass: false, reason: `Expected v1 payload, got ${JSON.stringify(res.body)}` },
              },
              {
                name: 'GET /v2/receipts returns v2 breakdown { version: "v2", breakdown: { total: 189 } }',
                request: { method: 'GET', url: '/v2/receipts', headers: {} },
                check: (res) =>
                  res.status === 200 && res.body?.version === 'v2' && res.body?.breakdown?.total === 189
                    ? { pass: true }
                    : { pass: false, reason: `Expected v2 payload, got ${JSON.stringify(res.body)}` },
              },
            ],
          },
        },

        {
          id: 'versioning-and-health',
          code: '11.2',
          title: 'Kubernetes Readiness & Liveness Health Probes (GET /health)',
          difficulty: 'Advanced',
          summary: 'Expose health check endpoints that return 200 OK when dependencies are healthy or 503 Service Unavailable when degraded.',
          theory: `
            <h4>🏠 Story Context: Zero-Downtime Deployments on Kampus</h4>
            <p>Cloud load balancers (Kubernetes, Cloud Run, AWS ECS) ping <code>GET /health</code> every few seconds to decide whether a Kampus container should receive student traffic:</p>
            <ul>
              <li>If PostgreSQL and the Escrow Ledger are reachable, return <code>200 OK</code>.</li>
              <li>If a critical dependency is down, throw <code>new ServiceUnavailableException(...)</code> (HTTP <code>503</code>) so the load balancer stops routing traffic to that instance until it recovers.</li>
            </ul>
          `,
          exampleFiles: [
            {
              name: 'readiness-demo.controller.ts',
              code: `import { Controller, Get, Query, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { HEALTH_PROBE_CONFIG } from './health.config';

@Controller('readiness')
export class ReadinessDemoController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  probe(@Query('redisDown') redisDown?: string) {
    if (redisDown === 'true') {
      throw new ServiceUnavailableException({
        status: 'error',
        service: HEALTH_PROBE_CONFIG.serviceName,
        redis: 'down',
      });
    }
    return {
      status: 'ok',
      service: HEALTH_PROBE_CONFIG.serviceName,
      redis: 'up',
      usersCount: this.db.users.length,
    };
  }
}
`,
            },
            {
              name: 'health.config.ts',
              code: `export const HEALTH_PROBE_CONFIG = {
  serviceName: 'kampus-api',
  probeIntervalSeconds: 10,
};
`,
            },
            SHARED_DATABASE_SERVICE_FILE,
            {
              name: 'readiness-demo.module.ts',
              code: `import { Module } from '@nestjs/common';
import { ReadinessDemoController } from './readiness-demo.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [ReadinessDemoController],
  providers: [DatabaseService],
})
export class ReadinessDemoModule {}
`,
            },
          ],
          presets: [
            {
              label: 'GET /readiness (All Systems Healthy -> 200 OK)',
              method: 'GET',
              url: '/readiness',
              headers: {},
              body: '',
            },
            {
              label: 'GET /readiness?redisDown=true (Degraded -> 503 Service Unavailable)',
              method: 'GET',
              url: '/readiness?redisDown=true',
              headers: {},
              body: '',
            },
          ],
          exercise: {
            title: 'Implement the Kampus Kubernetes Readiness Health Probe',
            prompt: `Implement <code>GET /health</code> in <code>health.controller.ts</code>:
              <ol>
                <li>Check <code>@Query('dbDown') dbDown?: string</code>.</li>
                <li>If <code>dbDown === 'true'</code>, throw <code>new ServiceUnavailableException({ status: 'error', service: 'kampus-api', database: 'down' })</code> (HTTP 503).</li>
                <li>Otherwise return <code>{ status: 'ok', service: 'kampus-api', database: 'up', activeListings: this.db.listings.length }</code> (HTTP 200).</li>
              </ol>`,
            hints: [
              'If `dbDown === "true"`, throw `new ServiceUnavailableException({ status: "error", service: "kampus-api", database: "down" })`.',
              'Otherwise return `{ status: "ok", service: "kampus-api", database: "up", activeListings: this.db.listings.length }`.',
            ],
            starterFiles: [
              {
                name: 'health.controller.ts',
                code: `import { Controller, Get, Query, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { HEALTH_PROBE_CONFIG } from './health.config';

@Controller('health')
export class KampusHealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  checkHealth(@Query('dbDown') dbDown?: string) {
    // TODO: Throw ServiceUnavailableException if dbDown === 'true', else return healthy status with activeListings count
    return { status: 'ok', service: HEALTH_PROBE_CONFIG.serviceName };
  }
}
`,
              },
              {
                name: 'health.config.ts',
                code: `export const HEALTH_PROBE_CONFIG = {
  serviceName: 'kampus-api',
  probeIntervalSeconds: 10,
};
`,
              },
              SHARED_DATABASE_SERVICE_FILE,
              {
                name: 'health.module.ts',
                code: `import { Module } from '@nestjs/common';
import { KampusHealthController } from './health.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [KampusHealthController],
  providers: [DatabaseService],
})
export class HealthModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'health.controller.ts',
                code: `import { Controller, Get, Query, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { HEALTH_PROBE_CONFIG } from './health.config';

@Controller('health')
export class KampusHealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  checkHealth(@Query('dbDown') dbDown?: string) {
    if (dbDown === 'true') {
      throw new ServiceUnavailableException({
        status: 'error',
        service: HEALTH_PROBE_CONFIG.serviceName,
        database: 'down',
      });
    }
    return {
      status: 'ok',
      service: HEALTH_PROBE_CONFIG.serviceName,
      database: 'up',
      activeListings: this.db.listings.length,
    };
  }
}
`,
              },
              {
                name: 'health.config.ts',
                code: `export const HEALTH_PROBE_CONFIG = {
  serviceName: 'kampus-api',
  probeIntervalSeconds: 10,
};
`,
              },
              SHARED_DATABASE_SERVICE_FILE,
              {
                name: 'health.module.ts',
                code: `import { Module } from '@nestjs/common';
import { KampusHealthController } from './health.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [KampusHealthController],
  providers: [DatabaseService],
})
export class HealthModule {}
`,
              },
            ],
            tests: [
              {
                name: 'GET /health returns 200 OK with database: "up" and activeListings: 3',
                request: { method: 'GET', url: '/health', headers: {} },
                check: (res) =>
                  res.status === 200 &&
                  res.body?.status === 'ok' &&
                  res.body?.database === 'up' &&
                  res.body?.activeListings === 3
                    ? { pass: true }
                    : { pass: false, reason: `Expected 200 healthy response, got ${JSON.stringify(res.body)}` },
              },
              {
                name: 'GET /health?dbDown=true returns 503 Service Unavailable with database: "down"',
                request: { method: 'GET', url: '/health?dbDown=true', headers: {} },
                check: (res) =>
                  res.status === 503 && res.body?.database === 'down'
                    ? { pass: true }
                    : { pass: false, reason: `Expected 503 with database="down", got ${res.status}` },
              },
            ],
          },
        },
      ],
    },

    // =========================================================================
    // MODULE 12: KAMPUS DATA LAYER — PRISMA ORM, RELATIONS & ATOMIC QUERIES
    // =========================================================================
    {
      id: 'mod-prisma',
      number: '12',
      title: 'Kampus Data Layer: Prisma ORM & Relational Queries',
      icon: 'database',
      description: 'Master PrismaService in NestJS: where filters, select vs include projections, N+1 prevention, upsert, atomic increments, and interactive $transaction.',
      subconcepts: [
        {
          id: 'prisma-queries-relations',
          code: '12.1',
          title: 'Prisma Precision Queries: where, select vs include, & Solving N+1',
          difficulty: 'Intermediate',
          summary: 'Inject PrismaService to query Kampus hostels with relational filters, surgical field projections (select), and eager relation loading (include).',
          theory: `
            <h4>🏠 Story Context: Querying Kampus Hostels &amp; Verified Landlords Without Leaking Hashes or Triggering N+1</h4>
            <p>In production NestJS apps using PostgreSQL, we wrap <code>PrismaClient</code> inside an <code>@Injectable() PrismaService</code> singleton. Every model in <code>schema.prisma</code> (<code>User</code>, <code>Listing</code>, <code>Booking</code>) becomes a strongly-typed delegate on <code>this.prisma</code>:</p>
            <ul>
              <li><strong><code>where</code> (Filtering &amp; Operators):</strong> Supports exact matches, range operators (<code>{ lte: 200, gte: 100 }</code>), string search (<code>{ contains: 'Gate', mode: 'insensitive' }</code>), and relational filters (<code>listings: { some: { verified: true } }</code>).</li>
              <li><strong><code>select</code> (Surgical Projection):</strong> Fetches <em>only</em> the columns set to <code>true</code>. Crucial on <code>User</code> queries so <code>passwordHash</code> and <code>refreshTokenHash</code> never leave the database!</li>
              <li><strong><code>include</code> (Eager Relation Loading):</strong> Fetches all scalar columns of the parent model <em>plus</em> related records (e.g., <code>include: { landlord: { select: { id: true, name: true, tier: true } } }</code>) in a single batched round-trip instead of N+1 loop queries.</li>
              <li><strong><code>orderBy</code>, <code>take</code>, <code>cursor</code>:</strong> Sort results and paginate efficiently.</li>
            </ul>
          `,
          exampleFiles: [
            {
              name: 'prisma-listings.controller.ts',
              code: `import { Controller, Get, Param, Query, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('prisma-listings')
export class PrismaListingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async searchHostels(
    @Query('campusZone') campusZone?: string,
    @Query('maxRent') maxRent?: string,
  ) {
    return this.prisma.listing.findMany({
      where: {
        published: true,
        ...(campusZone ? { campusZone } : {}),
        ...(maxRent ? { rentPerYear: { lte: Number(maxRent) } } : {}),
      },
      include: {
        landlord: {
          select: { id: true, name: true, tier: true },
        },
      },
      orderBy: { rentPerYear: 'asc' },
    });
  }

  @Get(':id')
  async getHostelDetail(@Param('id', ParseIntPipe) id: number) {
    const hostel = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        landlord: {
          select: { id: true, name: true, email: true, tier: true },
        },
      },
    });
    if (!hostel) {
      throw new NotFoundException(\`Hostel #\${id} not found\`);
    }
    return hostel;
  }
}
`,
            },
            SHARED_PRISMA_SERVICE_FILE,
            SHARED_PRISMA_SCHEMA_FILE,
            {
              name: 'prisma-listings.module.ts',
              code: `import { Module } from '@nestjs/common';
import { PrismaListingsController } from './prisma-listings.controller';
import { PrismaService } from './prisma.service';

@Module({
  controllers: [PrismaListingsController],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaListingsModule {}
`,
            },
          ],
          presets: [
            {
              label: 'GET /prisma-listings?campusZone=North Gate (Prisma findMany + include landlord)',
              method: 'GET',
              url: '/prisma-listings?campusZone=North Gate',
              headers: {},
              body: '',
            },
            {
              label: 'GET /prisma-listings?maxRent=180 (Prisma where rentPerYear: { lte: 180 })',
              method: 'GET',
              url: '/prisma-listings?maxRent=180',
              headers: {},
              body: '',
            },
            {
              label: 'GET /prisma-listings/1 (Prisma findUnique + nested landlord select)',
              method: 'GET',
              url: '/prisma-listings/1',
              headers: {},
              body: '',
            },
          ],
          exercise: {
            title: 'Query Verified Landlords & Safe Profiles Using Prisma select & Relational where',
            prompt: `Implement two endpoints in <code>prisma-landlords.controller.ts</code> (<code>@Controller('prisma-landlords')</code>) using <code>this.prisma</code> (defined in <code>prisma.service.ts</code> and <code>schema.prisma</code>):
              <ol>
                <li><code>GET /prisma-landlords</code>: Call <code>this.prisma.user.findMany(...)</code> to find users where <code>role: 'landlord'</code> and who have at least one verified hostel (<code>listings: { some: { verified: true } }</code>). Use <code>select</code> to return ONLY <code>id: true</code>, <code>name: true</code>, <code>tier: true</code>, and <code>listings: { where: { verified: true }, select: { id: true, title: true, rentPerYear: true } }</code> (so <code>passwordHash</code> is never leaked!).</li>
                <li><code>GET /prisma-landlords/stats</code>: Call <code>this.prisma.listing.aggregate({ where: { verified: true }, _count: true, _avg: { rentPerYear: true }, _min: { rentPerYear: true }, _max: { rentPerYear: true } })</code> and return the aggregation result.</li>
              </ol>`,
            hints: [
              'In `findVerifiedLandlords()`, pass `where: { role: "landlord", listings: { some: { verified: true } } }` to `this.prisma.user.findMany(...)`.',
              'Pass `select: { id: true, name: true, tier: true, listings: { where: { verified: true }, select: { id: true, title: true, rentPerYear: true } } }`.',
              'In `getVerifiedStats()`, return `this.prisma.listing.aggregate({ where: { verified: true }, _count: true, _avg: { rentPerYear: true }, _min: { rentPerYear: true }, _max: { rentPerYear: true } })`.',
            ],
            starterFiles: [
              {
                name: 'prisma-landlords.controller.ts',
                code: `import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('prisma-landlords')
export class PrismaLandlordsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findVerifiedLandlords() {
    // TODO 1: Use this.prisma.user.findMany with:
    // - where: { role: 'landlord', listings: { some: { verified: true } } }
    // - select: { id: true, name: true, tier: true, listings: { where: { verified: true }, select: { id: true, title: true, rentPerYear: true } } }
    return [];
  }

  @Get('stats')
  async getVerifiedStats() {
    // TODO 2: Use this.prisma.listing.aggregate({ where: { verified: true }, _count: true, _avg: { rentPerYear: true }, _min: { rentPerYear: true }, _max: { rentPerYear: true } })
    return {};
  }
}
`,
              },
              SHARED_PRISMA_SERVICE_FILE,
              SHARED_PRISMA_SCHEMA_FILE,
              {
                name: 'prisma-landlords.module.ts',
                code: `import { Module } from '@nestjs/common';
import { PrismaLandlordsController } from './prisma-landlords.controller';
import { PrismaService } from './prisma.service';

@Module({
  controllers: [PrismaLandlordsController],
  providers: [PrismaService],
})
export class PrismaLandlordsModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'prisma-landlords.controller.ts',
                code: `import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('prisma-landlords')
export class PrismaLandlordsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async findVerifiedLandlords() {
    return this.prisma.user.findMany({
      where: {
        role: 'landlord',
        listings: { some: { verified: true } },
      },
      select: {
        id: true,
        name: true,
        tier: true,
        listings: {
          where: { verified: true },
          select: { id: true, title: true, rentPerYear: true },
        },
      },
    });
  }

  @Get('stats')
  async getVerifiedStats() {
    return this.prisma.listing.aggregate({
      where: { verified: true },
      _count: true,
      _avg: { rentPerYear: true },
      _min: { rentPerYear: true },
      _max: { rentPerYear: true },
    });
  }
}
`,
              },
              SHARED_PRISMA_SERVICE_FILE,
              SHARED_PRISMA_SCHEMA_FILE,
              {
                name: 'prisma-landlords.module.ts',
                code: `import { Module } from '@nestjs/common';
import { PrismaLandlordsController } from './prisma-landlords.controller';
import { PrismaService } from './prisma.service';

@Module({
  controllers: [PrismaLandlordsController],
  providers: [PrismaService],
})
export class PrismaLandlordsModule {}
`,
              },
            ],
            tests: [
              {
                name: 'GET /prisma-landlords returns Landlord Chidi with only his verified hostel (#1) and omits passwordHash',
                request: { method: 'GET', url: '/prisma-landlords', headers: {} },
                check: (res) =>
                  res.status === 200 &&
                  Array.isArray(res.body) &&
                  res.body.length === 1 &&
                  res.body[0]?.id === 'u-landlord-2' &&
                  res.body[0]?.passwordHash === undefined &&
                  Array.isArray(res.body[0]?.listings) &&
                  res.body[0].listings.length === 1 &&
                  res.body[0].listings[0]?.id === 1
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected Landlord Chidi with 1 verified listing (#1) and no passwordHash, got ${JSON.stringify(res.body)}`,
                      },
              },
              {
                name: 'GET /prisma-landlords/stats aggregates _count=2, _min=180, _max=250 for verified hostels',
                request: { method: 'GET', url: '/prisma-landlords/stats', headers: {} },
                check: (res) =>
                  res.status === 200 &&
                  (res.body?._count === 2 || res.body?._count?._all === 2) &&
                  res.body?._min?.rentPerYear === 180 &&
                  res.body?._max?.rentPerYear === 250
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected _count=2, _min.rentPerYear=180, _max.rentPerYear=250, got ${JSON.stringify(res.body)}`,
                      },
              },
            ],
          },
        },

        {
          id: 'prisma-transactions-atomic',
          code: '12.2',
          title: 'Prisma Atomic Mutations: upsert, { decrement }, $transaction & P2002 Filter',
          difficulty: 'Advanced',
          summary: 'Eliminate race conditions with atomic { decrement: 1 }, upsert, interactive $transaction(async (tx) => ...), and Prisma P2002 error translation.',
          theory: `
            <h4>🏠 Story Context: Preventing Overbooked Hostel Rooms &amp; Handling Prisma Error Codes</h4>
            <p>When 50 students try to reserve the last room in Cedar Court Studio at the same millisecond, reading <code>roomsAvailable</code> in JavaScript and writing back <code>roomsAvailable - 1</code> creates a classic <strong>Read-Modify-Write race condition</strong>. Prisma provides four essential primitives for rock-solid writes:</p>
            <ul>
              <li><strong>Atomic Number Operations (<code>{ decrement: 1 }</code> / <code>{ increment: 1 }</code>):</strong> Compiles to SQL <code>SET "roomsAvailable" = "roomsAvailable" - 1</code> inside PostgreSQL's row lock.</li>
              <li><strong>Interactive Transactions (<code>this.prisma.$transaction(async (tx) => { ... })</code>):</strong> Runs multiple reads and writes inside a single ACID transaction. If any step throws (e.g., <code>roomsAvailable &lt; 0</code>), PostgreSQL rolls back every change automatically.</li>
              <li><strong><code>upsert({ where, create, update })</code>:</strong> Atomically inserts a record or updates it if the unique key already exists (<code>INSERT ... ON CONFLICT DO UPDATE</code>).</li>
              <li><strong><code>PrismaClientKnownRequestError</code> (<code>P2002</code> / <code>P2025</code>):</strong> Translates raw database constraint violations (<code>P2002</code> unique constraint, <code>P2025</code> record not found) into clean HTTP <code>409 Conflict</code> or <code>404 Not Found</code> responses via a NestJS <code>@Catch(PrismaClientKnownRequestError)</code> Exception Filter.</li>
            </ul>
          `,
          exampleFiles: [
            {
              name: 'prisma-booking.controller.ts',
              code: `import {
  Controller,
  Post,
  Body,
  UseFilters,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaClientExceptionFilter } from './prisma-client-exception.filter';
import { ReserveRoomDto } from './reserve-room.dto';

@Controller('prisma-bookings')
@UseFilters(PrismaClientExceptionFilter)
export class PrismaBookingController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('reserve')
  async reserveRoom(@Body() body: ReserveRoomDto) {
    return this.prisma.$transaction(async (tx) => {
      const updatedListing = await tx.listing.update({
        where: { id: body.listingId },
        data: { roomsAvailable: { decrement: 1 } },
      });

      if (updatedListing.roomsAvailable < 0) {
        throw new ConflictException('No rooms remaining in this hostel — rolling back!');
      }

      const booking = await tx.booking.create({
        data: {
          studentId: body.studentId,
          listingId: body.listingId,
          amount: updatedListing.rentPerYear,
          status: 'reserved-via-prisma-tx',
        },
        include: {
          listing: { select: { id: true, title: true, roomsAvailable: true } },
        },
      });

      return booking;
    });
  }
}
`,
            },
            {
              name: 'prisma-client-exception.filter.ts',
              code: `import { Catch } from '@nestjs/common';
import { PrismaClientKnownRequestError } from './prisma.service';

@Catch(PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter {
  catch(exception: PrismaClientKnownRequestError, host: any) {
    const res = host.switchToHttp().getResponse();
    if (exception.code === 'P2002') {
      return res.status(409).json({
        statusCode: 409,
        errorCode: 'PRISMA_UNIQUE_CONSTRAINT',
        fields: exception.meta?.target,
        message: 'A record with that unique value already exists.',
      });
    }
    return res.status(404).json({
      statusCode: 404,
      errorCode: exception.code,
      message: exception.message,
    });
  }
}
`,
            },
            {
              name: 'reserve-room.dto.ts',
              code: `export class ReserveRoomDto {
  studentId: string;
  listingId: number;
}
`,
            },
            SHARED_PRISMA_SERVICE_FILE,
            SHARED_PRISMA_SCHEMA_FILE,
            {
              name: 'prisma-booking.module.ts',
              code: `import { Module } from '@nestjs/common';
import { PrismaBookingController } from './prisma-booking.controller';
import { PrismaClientExceptionFilter } from './prisma-client-exception.filter';
import { PrismaService } from './prisma.service';

@Module({
  controllers: [PrismaBookingController],
  providers: [PrismaService, PrismaClientExceptionFilter],
})
export class PrismaBookingModule {}
`,
            },
          ],
          presets: [
            {
              label: 'POST /prisma-bookings/reserve (Atomic decrement + booking inside $transaction)',
              method: 'POST',
              url: '/prisma-bookings/reserve',
              headers: {},
              body: JSON.stringify({ studentId: 'u-student-3', listingId: 1 }, null, 2),
            },
          ],
          exercise: {
            title: 'Implement Atomic Student Upsert & Transactional Hostel Room Reservation',
            prompt: `Implement two endpoints in <code>prisma-escrow.controller.ts</code> (<code>@Controller('prisma-escrow')</code>):
              <ol>
                <li><code>POST /prisma-escrow/upsert-student</code>: Call <code>this.prisma.user.upsert({ where: { email: body.email }, update: { name: body.name, tier: 'verified' }, create: { email: body.email, name: body.name, role: 'student', tier: 'basic' }, select: { id: true, email: true, name: true, role: true, tier: true } })</code>.</li>
                <li><code>POST /prisma-escrow/book-room</code>: Run <code>this.prisma.$transaction(async (tx) =&gt; { ... })</code> that:
                  <ul>
                    <li>Atomically decrements <code>roomsAvailable</code> on <code>body.listingId</code> via <code>await tx.listing.update({ where: { id: body.listingId }, data: { roomsAvailable: { decrement: 1 } } })</code>.</li>
                    <li>If <code>listing.roomsAvailable &lt; 0</code>, throws <code>new ConflictException('Hostel is full')</code> (which rolls back the decrement!).</li>
                    <li>Creates and returns <code>await tx.booking.create({ data: { studentId: body.studentId, listingId: body.listingId, amount: listing.rentPerYear, status: 'confirmed' } })</code> paired with <code>remainingRooms: listing.roomsAvailable</code> as <code>{ booking, remainingRooms: listing.roomsAvailable }</code>.</li>
                  </ul>
                </li>
              </ol>`,
            hints: [
              'Use `this.prisma.user.upsert({ where: { email: body.email }, update: { name: body.name, tier: "verified" }, create: { email: body.email, name: body.name, role: "student", tier: "basic" }, select: { id: true, email: true, name: true, role: true, tier: true } })`.',
              'Inside `this.prisma.$transaction(async (tx) => { ... })`, check `if (listing.roomsAvailable < 0) throw new ConflictException("Hostel is full");` after calling `tx.listing.update` with `{ roomsAvailable: { decrement: 1 } }`.',
            ],
            starterFiles: [
              {
                name: 'prisma-escrow.controller.ts',
                code: `import { Controller, Post, Body, ConflictException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UpsertStudentDto, BookRoomDto } from './book-room.dto';

@Controller('prisma-escrow')
export class PrismaEscrowController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('upsert-student')
  async upsertStudent(@Body() body: UpsertStudentDto) {
    // TODO 1: Use this.prisma.user.upsert by email (update name + tier: 'verified', or create student)
    return {};
  }

  @Post('book-room')
  async bookRoom(@Body() body: BookRoomDto) {
    // TODO 2: Wrap in this.prisma.$transaction(async (tx) => { ... })
    // 1. Decrement roomsAvailable on listingId by 1
    // 2. If listing.roomsAvailable < 0, throw new ConflictException('Hostel is full')
    // 3. Create booking via tx.booking.create and return { booking, remainingRooms: listing.roomsAvailable }
    return {};
  }
}
`,
              },
              {
                name: 'book-room.dto.ts',
                code: `export class UpsertStudentDto {
  email: string;
  name: string;
}

export class BookRoomDto {
  studentId: string;
  listingId: number;
}
`,
              },
              SHARED_PRISMA_SERVICE_FILE,
              SHARED_PRISMA_SCHEMA_FILE,
              {
                name: 'prisma-escrow.module.ts',
                code: `import { Module } from '@nestjs/common';
import { PrismaEscrowController } from './prisma-escrow.controller';
import { PrismaService } from './prisma.service';

@Module({
  controllers: [PrismaEscrowController],
  providers: [PrismaService],
})
export class PrismaEscrowModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'prisma-escrow.controller.ts',
                code: `import { Controller, Post, Body, ConflictException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UpsertStudentDto, BookRoomDto } from './book-room.dto';

@Controller('prisma-escrow')
export class PrismaEscrowController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('upsert-student')
  async upsertStudent(@Body() body: UpsertStudentDto) {
    return this.prisma.user.upsert({
      where: { email: body.email },
      update: { name: body.name, tier: 'verified' },
      create: {
        email: body.email,
        name: body.name,
        role: 'student',
        tier: 'basic',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tier: true,
      },
    });
  }

  @Post('book-room')
  async bookRoom(@Body() body: BookRoomDto) {
    return this.prisma.$transaction(async (tx) => {
      const listing = await tx.listing.update({
        where: { id: body.listingId },
        data: { roomsAvailable: { decrement: 1 } },
      });

      if (listing.roomsAvailable < 0) {
        throw new ConflictException('Hostel is full');
      }

      const booking = await tx.booking.create({
        data: {
          studentId: body.studentId,
          listingId: body.listingId,
          amount: listing.rentPerYear,
          status: 'confirmed',
        },
      });

      return { booking, remainingRooms: listing.roomsAvailable };
    });
  }
}
`,
              },
              {
                name: 'book-room.dto.ts',
                code: `export class UpsertStudentDto {
  email: string;
  name: string;
}

export class BookRoomDto {
  studentId: string;
  listingId: number;
}
`,
              },
              SHARED_PRISMA_SERVICE_FILE,
              SHARED_PRISMA_SCHEMA_FILE,
              {
                name: 'prisma-escrow.module.ts',
                code: `import { Module } from '@nestjs/common';
import { PrismaEscrowController } from './prisma-escrow.controller';
import { PrismaService } from './prisma.service';

@Module({
  controllers: [PrismaEscrowController],
  providers: [PrismaService],
})
export class PrismaEscrowModule {}
`,
              },
            ],
            tests: [
              {
                name: 'POST /prisma-escrow/upsert-student updates existing student Adaobi (ada@kampus.edu) to verified tier without duplicating',
                request: {
                  method: 'POST',
                  url: '/prisma-escrow/upsert-student',
                  headers: {},
                  body: { email: 'ada@kampus.edu', name: 'Adaobi Okafor (Verified)' },
                },
                check: (res, state) =>
                  res.status === 201 &&
                  res.body?.id === 'u-student-3' &&
                  res.body?.tier === 'verified' &&
                  res.body?.passwordHash === undefined &&
                  state.users.filter((u) => u.email === 'ada@kampus.edu').length === 1
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected Adaobi upserted with tier='verified' and no passwordHash, got ${JSON.stringify(res.body)}`,
                      },
              },
              {
                name: 'POST /prisma-escrow/book-room atomically decrements Listing #3 roomsAvailable (1 -> 0) and creates booking',
                request: {
                  method: 'POST',
                  url: '/prisma-escrow/book-room',
                  headers: {},
                  body: { studentId: 'u-student-3', listingId: 3 },
                },
                check: (res, state) => {
                  const l3 = state.listings.find((l) => l.id === 3);
                  return res.status === 201 &&
                    res.body?.remainingRooms === 0 &&
                    res.body?.booking?.amount === 120 &&
                    l3?.roomsAvailable === 0
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected remainingRooms=0 and booking amount=120, got ${JSON.stringify(res.body)}`,
                      };
                },
              },
              {
                name: 'Rolls back roomsAvailable to 0 when booking a full hostel (Listing #3 has 0 rooms left -> 409 Conflict)',
                steps: [
                  {
                    method: 'POST',
                    url: '/prisma-escrow/book-room',
                    headers: {},
                    body: { studentId: 'u-student-3', listingId: 3 },
                  },
                  {
                    method: 'POST',
                    url: '/prisma-escrow/book-room',
                    headers: {},
                    body: { studentId: 'u-student-3', listingId: 3 },
                  },
                ],
                check: (lastRes, state) => {
                  const l3 = state.listings.find((l) => l.id === 3);
                  return lastRes.status === 409 && l3?.roomsAvailable === 0
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected second booking on 1-room hostel to fail with 409 and roll back roomsAvailable to 0, got status=${lastRes.status}, roomsAvailable=${l3?.roomsAvailable}`,
                      };
                },
              },
            ],
          },
        },
      ],
    },

    // =========================================================================
    // MODULE 13: KAMPUS DOCUMENT LAYER — MONGOOSE ODM, SCHEMAS & AGGREGATION
    // =========================================================================
    {
      id: 'mod-mongoose',
      number: '13',
      title: 'Kampus Document Layer: Mongoose ODM, Schemas & Aggregation',
      icon: 'layers',
      description: 'Master @nestjs/mongoose: @Schema/@Prop, @InjectModel, .populate(), .lean(), $inc/$addToSet atomic operators, and MongoDB aggregation pipelines.',
      subconcepts: [
        {
          id: 'mongoose-schemas-queries-lean',
          code: '13.1',
          title: 'Mongoose Schemas (@Schema/@Prop), @InjectModel, .populate(), & .lean()',
          difficulty: 'Intermediate',
          summary: 'Define Mongoose schemas with @Schema/@Prop, inject Models via @InjectModel, populate referenced landlords safely, and speed up reads with .lean().',
          theory: `
            <h4>🏠 Story Context: Querying Kampus Hostels in MongoDB with @nestjs/mongoose</h4>
            <p>When Kampus stores hostel listings and flexible amenity arrays in MongoDB using <code>@nestjs/mongoose</code>, four patterns keep our API fast and secure:</p>
            <ul>
              <li><strong><code>@Schema({ timestamps: true })</code> &amp; <code>@Prop()</code>:</strong> Declaratively defines BSON types, defaults, indexes, and <code>select: false</code> rules on TypeScript classes.</li>
              <li><strong><code>@InjectModel(Listing.name)</code>:</strong> Injects the compiled Mongoose <code>Model&lt;Listing&gt;</code> into services/controllers via NestJS DI.</li>
              <li><strong><code>.populate('landlord', 'name tier -passwordHash')</code>:</strong> Resolves referenced <code>ObjectId</code> links while whitelisting only safe landlord fields.</li>
              <li><strong><code>.lean().exec()</code>:</strong> Tells Mongoose to skip instantiating heavy <code>HydratedDocument</code> change-tracking wrappers and return plain JavaScript objects—making read endpoints <strong>3x–5x faster</strong>!</li>
            </ul>
          `,
          exampleFiles: [
            {
              name: 'mongoose-listings.controller.ts',
              code: `import { Controller, Get, Param, Query, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Listing } from './listing.schema';

@Controller('mongo-listings')
export class MongooseListingsController {
  constructor(
    @InjectModel(Listing.name) private readonly listingModel: Model<Listing>,
  ) {}

  @Get()
  async findHostels(
    @Query('campusZone') campusZone?: string,
    @Query('maxRent') maxRent?: string,
    @Query('amenity') amenity?: string,
  ) {
    const filter: Record<string, any> = { published: true };
    if (campusZone) filter.campusZone = campusZone;
    if (maxRent) filter.rentPerYear = { $lte: Number(maxRent) };
    if (amenity) filter.amenities = amenity;

    return this.listingModel
      .find(filter)
      .populate('landlord', 'name tier')
      .sort({ rentPerYear: 1 })
      .lean()
      .exec();
  }

  @Get(':id')
  async findHostelById(@Param('id', ParseIntPipe) id: number) {
    const doc = await this.listingModel
      .findById(id)
      .populate('landlord', 'name email tier')
      .lean()
      .exec();

    if (!doc) {
      throw new NotFoundException(\`Hostel #\${id} not found in MongoDB\`);
    }
    return doc;
  }
}
`,
            },
            SHARED_MONGOOSE_LISTING_SCHEMA_FILE,
            SHARED_MONGOOSE_LANDLORD_SCHEMA_FILE,
            {
              name: 'mongoose-listings.module.ts',
              code: `import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongooseListingsController } from './mongoose-listings.controller';
import { Listing, ListingSchema } from './listing.schema';
import { LandlordUser, LandlordUserSchema } from './landlord.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Listing.name, schema: ListingSchema },
      { name: LandlordUser.name, schema: LandlordUserSchema },
    ]),
  ],
  controllers: [MongooseListingsController],
})
export class MongooseListingsModule {}
`,
            },
          ],
          presets: [
            {
              label: 'GET /mongo-listings?campusZone=North Gate (Mongoose find + populate + lean)',
              method: 'GET',
              url: '/mongo-listings?campusZone=North Gate',
              headers: {},
              body: '',
            },
            {
              label: 'GET /mongo-listings?amenity=fiber-wifi (MongoDB array element match)',
              method: 'GET',
              url: '/mongo-listings?amenity=fiber-wifi',
              headers: {},
              body: '',
            },
            {
              label: 'GET /mongo-listings/1 (Mongoose findById + populate landlord)',
              method: 'GET',
              url: '/mongo-listings/1',
              headers: {},
              body: '',
            },
          ],
          exercise: {
            title: 'Query Verified Hostels & Run a MongoDB Aggregation Pipeline with @InjectModel',
            prompt: `Implement two endpoints in <code>mongoose-analytics.controller.ts</code> (<code>@Controller('mongo-analytics')</code>) using <code>@InjectModel(Listing.name)</code> (defined in <code>listing.schema.ts</code>):
              <ol>
                <li><code>GET /mongo-analytics/verified</code>: Call <code>this.listingModel.find({ verified: true }).populate('landlord', 'name tier').sort({ rentPerYear: 1 }).lean().exec()</code> so verified hostels are returned sorted by rent ascending with populated landlord <code>name</code> and <code>tier</code> (and no <code>passwordHash</code>!).</li>
                <li><code>GET /mongo-analytics/zone-summary</code>: Call <code>this.listingModel.aggregate([{ $match: { verified: true } }, { $group: { _id: '$campusZone', totalHostels: { $sum: 1 }, avgRent: { $avg: '$rentPerYear' } } }, { $sort: { avgRent: 1 } }])</code> and return the aggregation result.</li>
              </ol>`,
            hints: [
              'In `getVerifiedHostels()`, return `this.listingModel.find({ verified: true }).populate("landlord", "name tier").sort({ rentPerYear: 1 }).lean().exec()`.',
              'In `getZoneSummary()`, return `this.listingModel.aggregate([{ $match: { verified: true } }, { $group: { _id: "$campusZone", totalHostels: { $sum: 1 }, avgRent: { $avg: "$rentPerYear" } } }, { $sort: { avgRent: 1 } }])`.',
            ],
            starterFiles: [
              {
                name: 'mongoose-analytics.controller.ts',
                code: `import { Controller, Get } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Listing } from './listing.schema';

@Controller('mongo-analytics')
export class MongooseAnalyticsController {
  constructor(
    @InjectModel(Listing.name) private readonly listingModel: Model<Listing>,
  ) {}

  @Get('verified')
  async getVerifiedHostels() {
    // TODO 1: Query verified: true, populate('landlord', 'name tier'), sort({ rentPerYear: 1 }), .lean().exec()
    return [];
  }

  @Get('zone-summary')
  async getZoneSummary() {
    // TODO 2: Run this.listingModel.aggregate with $match: { verified: true }, $group by '$campusZone' (totalHostels: { $sum: 1 }, avgRent: { $avg: '$rentPerYear' }), and $sort: { avgRent: 1 }
    return [];
  }
}
`,
              },
              SHARED_MONGOOSE_LISTING_SCHEMA_FILE,
              SHARED_MONGOOSE_LANDLORD_SCHEMA_FILE,
              {
                name: 'mongoose-analytics.module.ts',
                code: `import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongooseAnalyticsController } from './mongoose-analytics.controller';
import { Listing, ListingSchema } from './listing.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Listing.name, schema: ListingSchema }]),
  ],
  controllers: [MongooseAnalyticsController],
})
export class MongooseAnalyticsModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'mongoose-analytics.controller.ts',
                code: `import { Controller, Get } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Listing } from './listing.schema';

@Controller('mongo-analytics')
export class MongooseAnalyticsController {
  constructor(
    @InjectModel(Listing.name) private readonly listingModel: Model<Listing>,
  ) {}

  @Get('verified')
  async getVerifiedHostels() {
    return this.listingModel
      .find({ verified: true })
      .populate('landlord', 'name tier')
      .sort({ rentPerYear: 1 })
      .lean()
      .exec();
  }

  @Get('zone-summary')
  async getZoneSummary() {
    return this.listingModel.aggregate([
      { $match: { verified: true } },
      {
        $group: {
          _id: '$campusZone',
          totalHostels: { $sum: 1 },
          avgRent: { $avg: '$rentPerYear' },
        },
      },
      { $sort: { avgRent: 1 } },
    ]);
  }
}
`,
              },
              SHARED_MONGOOSE_LISTING_SCHEMA_FILE,
              SHARED_MONGOOSE_LANDLORD_SCHEMA_FILE,
              {
                name: 'mongoose-analytics.module.ts',
                code: `import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongooseAnalyticsController } from './mongoose-analytics.controller';
import { Listing, ListingSchema } from './listing.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Listing.name, schema: ListingSchema }]),
  ],
  controllers: [MongooseAnalyticsController],
})
export class MongooseAnalyticsModule {}
`,
              },
            ],
            tests: [
              {
                name: 'GET /mongo-analytics/verified returns 2 verified hostels sorted by rentPerYear (180, 250) with populated landlord without passwordHash',
                request: { method: 'GET', url: '/mongo-analytics/verified', headers: {} },
                check: (res) =>
                  res.status === 200 &&
                  Array.isArray(res.body) &&
                  res.body.length === 2 &&
                  res.body[0]?.rentPerYear === 180 &&
                  res.body[0]?.landlord?.name?.includes('Chidi') &&
                  res.body[0]?.landlord?.passwordHash === undefined
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected 2 verified hostels sorted [180, 250] with safe populated landlord, got ${JSON.stringify(res.body)}`,
                      },
              },
              {
                name: 'GET /mongo-analytics/zone-summary aggregates verified hostels by $campusZone (North Gate=180, South Gate=250)',
                request: { method: 'GET', url: '/mongo-analytics/zone-summary', headers: {} },
                check: (res) =>
                  res.status === 200 &&
                  Array.isArray(res.body) &&
                  res.body.length === 2 &&
                  res.body[0]?._id === 'North Gate' &&
                  res.body[0]?.avgRent === 180 &&
                  res.body[1]?._id === 'South Gate' &&
                  res.body[1]?.avgRent === 250
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected 2 grouped campus zones [North Gate (180), South Gate (250)], got ${JSON.stringify(res.body)}`,
                      },
              },
            ],
          },
        },

        {
          id: 'mongoose-atomic-operators-upsert',
          code: '13.2',
          title: 'Mongoose Atomic Updates: $inc, $addToSet, { new: true, upsert: true } & E11000 Filter',
          difficulty: 'Advanced',
          summary: 'Perform single-document atomic room reservations with filter-guarded $inc, deduplicate amenities with $addToSet, and catch E11000 errors.',
          theory: `
            <h4>🏠 Story Context: Filter-Guarded Atomic Room Decrements &amp; Deduplicated Amenities in MongoDB</h4>
            <p>One of MongoDB's greatest strengths is that <strong>single-document updates are always atomic</strong> at the storage-engine level (WiredTiger). You can prevent overbooking without even opening a multi-document transaction by combining a filter predicate with <code>$inc</code> inside <code>findOneAndUpdate</code>:</p>
            <ul>
              <li><strong>Filter-Guarded Atomic Update:</strong> <code>findOneAndUpdate({ _id: listingId, roomsAvailable: { $gt: 0 } }, { $inc: { roomsAvailable: -1 } }, { new: true })</code> atomically checks that a room is available AND decrements it in one indivisible operation! If <code>roomsAvailable</code> is already <code>0</code>, the filter fails to match and returns <code>null</code>.</li>
              <li><strong>Why <code>{ new: true, runValidators: true }</code> Is Mandatory:</strong> By default, Mongoose's <code>findOneAndUpdate</code> returns the <em>old</em> pre-update document AND skips schema validators! Always pass <code>{ new: true, runValidators: true }</code>.</li>
              <li><strong><code>$addToSet</code> vs <code>$push</code>:</strong> <code>{ $addToSet: { amenities: 'solar-inverter' } }</code> appends an amenity to the array <em>only if it is not already present</em>, preventing duplicate tags.</li>
              <li><strong><code>MongoServerError</code> (<code>code === 11000</code>):</strong> Catches unique index violations (like duplicate student emails) in a NestJS Exception Filter and returns <code>409 Conflict</code>.</li>
            </ul>
          `,
          exampleFiles: [
            {
              name: 'mongoose-mutations.controller.ts',
              code: `import {
  Controller,
  Post,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Listing } from './listing.schema';
import { AddAmenityDto } from './add-amenity.dto';

@Controller('mongo-hostels')
export class MongooseMutationsController {
  constructor(
    @InjectModel(Listing.name) private readonly listingModel: Model<Listing>,
  ) {}

  @Post(':id/reserve-atomic')
  async reserveRoomAtomically(@Param('id', ParseIntPipe) id: number) {
    // Filter-guarded atomic update: only decrements if roomsAvailable > 0!
    const updated = await this.listingModel
      .findOneAndUpdate(
        { _id: id, roomsAvailable: { $gt: 0 } },
        { $inc: { roomsAvailable: -1 } },
        { new: true, runValidators: true },
      )
      .lean()
      .exec();

    if (!updated) {
      throw new ConflictException('No rooms left in this hostel (atomic guard rejected)');
    }
    return updated;
  }

  @Patch(':id/amenities')
  async addAmenityUnique(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AddAmenityDto,
  ) {
    const updated = await this.listingModel
      .findByIdAndUpdate(
        id,
        { $addToSet: { amenities: body.amenity } },
        { new: true, runValidators: true },
      )
      .lean()
      .exec();

    if (!updated) throw new NotFoundException('Hostel not found');
    return updated;
  }
}
`,
            },
            SHARED_MONGOOSE_LISTING_SCHEMA_FILE,
            {
              name: 'add-amenity.dto.ts',
              code: `export class AddAmenityDto {
  amenity: string;
}
`,
            },
            {
              name: 'mongoose-mutations.module.ts',
              code: `import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongooseMutationsController } from './mongoose-mutations.controller';
import { Listing, ListingSchema } from './listing.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Listing.name, schema: ListingSchema }]),
  ],
  controllers: [MongooseMutationsController],
})
export class MongooseMutationsModule {}
`,
            },
          ],
          presets: [
            {
              label: 'POST /mongo-hostels/1/reserve-atomic (Filter-guarded $inc: { roomsAvailable: -1 })',
              method: 'POST',
              url: '/mongo-hostels/1/reserve-atomic',
              headers: {},
              body: '',
            },
            {
              label: 'PATCH /mongo-hostels/1/amenities ($addToSet deduplicated amenity)',
              method: 'PATCH',
              url: '/mongo-hostels/1/amenities',
              headers: {},
              body: JSON.stringify({ amenity: 'cctv-security' }, null, 2),
            },
          ],
          exercise: {
            title: 'Implement Filter-Guarded Atomic Room Claim & Deduplicated Amenity Tagging',
            prompt: `Implement two endpoints in <code>mongoose-booking.controller.ts</code> (<code>@Controller('mongo-bookings')</code>):
              <ol>
                <li><code>POST /mongo-bookings/claim-room</code>: Use <code>this.listingModel.findOneAndUpdate({ _id: body.listingId, roomsAvailable: { $gt: 0 } }, { $inc: { roomsAvailable: -1 } }, { new: true, runValidators: true })</code>. If it returns <code>null</code>, throw <code>new ConflictException('Hostel is full')</code>. Otherwise return <code>{ claimed: true, roomsAvailable: updated.roomsAvailable, listing: updated }</code>.</li>
                <li><code>PATCH /mongo-bookings/:id/add-amenity</code>: Use <code>this.listingModel.findByIdAndUpdate(id, { $addToSet: { amenities: body.amenity } }, { new: true, runValidators: true })</code> and return the updated hostel document.</li>
              </ol>`,
            hints: [
              'In `claimRoom()`, call `const updated = await this.listingModel.findOneAndUpdate({ _id: body.listingId, roomsAvailable: { $gt: 0 } }, { $inc: { roomsAvailable: -1 } }, { new: true, runValidators: true });`.',
              'If `!updated`, throw `new ConflictException("Hostel is full")`.',
              'In `addAmenity()`, call `return this.listingModel.findByIdAndUpdate(id, { $addToSet: { amenities: body.amenity } }, { new: true, runValidators: true });`.',
            ],
            starterFiles: [
              {
                name: 'mongoose-booking.controller.ts',
                code: `import { Controller, Post, Patch, Param, Body, ParseIntPipe, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Listing } from './listing.schema';
import { ClaimRoomDto, AddAmenityTagDto } from './claim-room.dto';

@Controller('mongo-bookings')
export class MongooseBookingController {
  constructor(
    @InjectModel(Listing.name) private readonly listingModel: Model<Listing>,
  ) {}

  @Post('claim-room')
  async claimRoom(@Body() body: ClaimRoomDto) {
    // TODO 1: Use findOneAndUpdate with { _id: body.listingId, roomsAvailable: { $gt: 0 } }
    // and { $inc: { roomsAvailable: -1 } } with { new: true, runValidators: true }.
    // If null, throw ConflictException('Hostel is full').
    // Return { claimed: true, roomsAvailable: updated.roomsAvailable, listing: updated }
    return {};
  }

  @Patch(':id/add-amenity')
  async addAmenity(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AddAmenityTagDto,
  ) {
    // TODO 2: Use findByIdAndUpdate with { $addToSet: { amenities: body.amenity } } and { new: true, runValidators: true }
    return {};
  }
}
`,
              },
              SHARED_MONGOOSE_LISTING_SCHEMA_FILE,
              {
                name: 'claim-room.dto.ts',
                code: `export class ClaimRoomDto {
  listingId: number;
}

export class AddAmenityTagDto {
  amenity: string;
}
`,
              },
              {
                name: 'mongoose-booking.module.ts',
                code: `import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongooseBookingController } from './mongoose-booking.controller';
import { Listing, ListingSchema } from './listing.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Listing.name, schema: ListingSchema }]),
  ],
  controllers: [MongooseBookingController],
})
export class MongooseBookingModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'mongoose-booking.controller.ts',
                code: `import { Controller, Post, Patch, Param, Body, ParseIntPipe, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Listing } from './listing.schema';
import { ClaimRoomDto, AddAmenityTagDto } from './claim-room.dto';

@Controller('mongo-bookings')
export class MongooseBookingController {
  constructor(
    @InjectModel(Listing.name) private readonly listingModel: Model<Listing>,
  ) {}

  @Post('claim-room')
  async claimRoom(@Body() body: ClaimRoomDto) {
    const updated = await this.listingModel
      .findOneAndUpdate(
        { _id: body.listingId, roomsAvailable: { $gt: 0 } },
        { $inc: { roomsAvailable: -1 } },
        { new: true, runValidators: true },
      )
      .lean()
      .exec();

    if (!updated) {
      throw new ConflictException('Hostel is full');
    }

    return {
      claimed: true,
      roomsAvailable: updated.roomsAvailable,
      listing: updated,
    };
  }

  @Patch(':id/add-amenity')
  async addAmenity(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AddAmenityTagDto,
  ) {
    return this.listingModel
      .findByIdAndUpdate(
        id,
        { $addToSet: { amenities: body.amenity } },
        { new: true, runValidators: true },
      )
      .lean()
      .exec();
  }
}
`,
              },
              SHARED_MONGOOSE_LISTING_SCHEMA_FILE,
              {
                name: 'claim-room.dto.ts',
                code: `export class ClaimRoomDto {
  listingId: number;
}

export class AddAmenityTagDto {
  amenity: string;
}
`,
              },
              {
                name: 'mongoose-booking.module.ts',
                code: `import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongooseBookingController } from './mongoose-booking.controller';
import { Listing, ListingSchema } from './listing.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Listing.name, schema: ListingSchema }]),
  ],
  controllers: [MongooseBookingController],
})
export class MongooseBookingModule {}
`,
              },
            ],
            tests: [
              {
                name: 'POST /mongo-bookings/claim-room atomically decrements Listing #3 roomsAvailable (1 -> 0) and rejects a 2nd claim with 409 Conflict',
                steps: [
                  {
                    method: 'POST',
                    url: '/mongo-bookings/claim-room',
                    headers: {},
                    body: { listingId: 3 },
                  },
                  {
                    method: 'POST',
                    url: '/mongo-bookings/claim-room',
                    headers: {},
                    body: { listingId: 3 },
                  },
                ],
                check: (lastRes, state, all) => {
                  const l3 = state.listings.find((l) => l.id === 3);
                  return all[0]?.status === 201 &&
                    all[0]?.body?.roomsAvailable === 0 &&
                    lastRes.status === 409 &&
                    l3?.roomsAvailable === 0
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected 1st claim 201 (roomsAvailable=0) and 2nd claim 409 (roomsAvailable stays 0), got ${JSON.stringify(all.map((r) => ({ status: r.status, body: r.body })))}`,
                      };
                },
              },
              {
                name: 'PATCH /mongo-bookings/3/add-amenity uses $addToSet so adding "solar-inverter" twice never creates duplicate array items',
                steps: [
                  {
                    method: 'PATCH',
                    url: '/mongo-bookings/3/add-amenity',
                    headers: {},
                    body: { amenity: 'solar-inverter' },
                  },
                  {
                    method: 'PATCH',
                    url: '/mongo-bookings/3/add-amenity',
                    headers: {},
                    body: { amenity: 'solar-inverter' },
                  },
                ],
                check: (lastRes) =>
                  lastRes.status === 200 &&
                  Array.isArray(lastRes.body?.amenities) &&
                  lastRes.body.amenities.filter((a) => a === 'solar-inverter').length === 1 &&
                  lastRes.body.amenities.length === 2
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected amenities to contain ["borehole-water", "solar-inverter"] without duplicates, got ${JSON.stringify(lastRes.body?.amenities)}`,
                      },
              },
            ],
          },
        },
      ],
    },

    // =========================================================================
    // MODULE 14: KAMPUS QUALITY ASSURANCE — UNIT & INTEGRATION TESTING
    // =========================================================================
    {
      id: 'mod-testing',
      number: '14',
      title: 'Kampus Quality Assurance: Unit & Integration Testing (@nestjs/testing, Jest & Supertest)',
      icon: 'check-circle',
      description: 'Master isolated unit tests with Test.createTestingModule & jest.fn() spies, plus full HTTP pipeline integration tests with createNestApplication(), ValidationPipe, Supertest, and .overrideGuard().',
      subconcepts: [
        {
          id: 'testing-unit-testingmodule-mocks',
          code: '14.1',
          title: 'Unit Testing Services & Controllers in Isolation (Test.createTestingModule & jest.fn())',
          difficulty: 'Intermediate',
          summary: 'Compile isolated NestJS testing containers, swap PrismaService with jest.fn() mocks, and assert calls, return payloads, and .rejects.toThrow() exceptions.',
          theory: `
            <h4>🏠 Story Context: Verifying Kampus Rent Escrow &amp; Booking Logic in Under 5 Milliseconds</h4>
            <p>When Kampus calculates caution-fee discounts or checks whether a hostel has rooms left, we don't want our unit tests to spin up a real PostgreSQL cluster or wait for network I/O. Instead, NestJS provides <code>@nestjs/testing</code> to build a micro Dependency Injection container containing <strong>only the class under test and mocked dependencies</strong>:</p>
            <ul>
              <li><strong><code>Test.createTestingModule({ providers: [...] }).compile()</code>:</strong> Creates an isolated NestJS DI container for your test spec so every test starts with a clean, deterministic state.</li>
              <li><strong>Custom Mock Providers (<code>{ provide: PrismaService, useValue: mockPrisma }</code>):</strong> Replaces the real database client with lightweight <code>jest.fn()</code> spies that return controlled fixtures via <code>.mockResolvedValue(...)</code>.</li>
              <li><strong>Spy Interaction Assertions:</strong> Use <code>expect(mockPrisma.listing.findUnique).toHaveBeenCalledWith({ where: { id: 1 } })</code> and <code>.toHaveBeenCalledTimes(1)</code> to prove your service passed the exact right query filter to the ORM.</li>
              <li><strong>Async Exception Testing:</strong> Use <code>await expect(service.bookHostel('u-student-3', 999)).rejects.toThrow(NotFoundException)</code> to verify error paths cleanly.</li>
            </ul>
          `,
          exampleFiles: [
            {
              name: 'escrow-pricing.spec.ts',
              code: `import {
  Controller,
  Post,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { EscrowPricingService } from './escrow-pricing.service';

@Controller('test-suite')
export class UnitTestRunnerController {
  @Post('run-unit')
  async runUnitSpecs() {
    // 1. Create deterministic jest.fn() mocks for PrismaService
    const mockPrisma = {
      listing: {
        findUnique: jest.fn(),
      },
    };

    // 2. Compile an isolated NestJS TestingModule
    const moduleRef = await Test.createTestingModule({
      providers: [
        EscrowPricingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    const service = moduleRef.get(EscrowPricingService);

    // Spec 1: Verified student gets discounted $5 platform fee
    mockPrisma.listing.findUnique.mockResolvedValue({
      id: 1,
      title: 'Cedar Court Ensuite Studio',
      rentPerYear: 180,
      roomsAvailable: 4,
    });

    const quote = await service.quoteHostelBooking('verified', 1);
    expect(mockPrisma.listing.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(quote.platformFee).toBe(5);
    expect(quote.totalEscrowRequired).toBe(185);

    // Spec 2: Full hostel throws ConflictException
    mockPrisma.listing.findUnique.mockResolvedValue({
      id: 3,
      title: 'Palm Grove Shared Annex',
      rentPerYear: 120,
      roomsAvailable: 0,
    });

    await expect(service.quoteHostelBooking('verified', 3)).rejects.toThrow(
      ConflictException,
    );

    // Spec 3: Missing hostel throws NotFoundException
    mockPrisma.listing.findUnique.mockResolvedValue(null);
    await expect(service.quoteHostelBooking('basic', 999)).rejects.toThrow(
      NotFoundException,
    );

    return {
      suite: 'EscrowPricingService (Isolated Unit Specs)',
      specsPassed: 3,
      totalMockCalls: mockPrisma.listing.findUnique.mock.calls.length,
      sampleQuote: quote,
    };
  }
}
`,
            },
            {
              name: 'escrow-pricing.service.ts',
              code: `import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class EscrowPricingService {
  constructor(private readonly prisma: PrismaService) {}

  async quoteHostelBooking(studentTier: string, listingId: number) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      throw new NotFoundException(\`Hostel #\${listingId} does not exist\`);
    }
    if (listing.roomsAvailable <= 0) {
      throw new ConflictException(\`Hostel #\${listingId} has no vacant rooms\`);
    }

    const platformFee = studentTier === 'verified' ? 5 : 15;
    return {
      listingId: listing.id,
      title: listing.title,
      baseRent: listing.rentPerYear,
      platformFee,
      totalEscrowRequired: listing.rentPerYear + platformFee,
    };
  }
}
`,
            },
            SHARED_PRISMA_SERVICE_FILE,
            {
              name: 'escrow-pricing.module.ts',
              code: `import { Module } from '@nestjs/common';
import { EscrowPricingService } from './escrow-pricing.service';
import { PrismaService } from './prisma.service';

@Module({
  providers: [EscrowPricingService, PrismaService],
  exports: [EscrowPricingService],
})
export class EscrowPricingModule {}
`,
            },
          ],
          presets: [
            {
              label: 'POST /test-suite/run-unit (Execute Isolated Unit Test Suite)',
              method: 'POST',
              url: '/test-suite/run-unit',
              headers: {},
              body: '',
            },
          ],
          exercise: {
            title: 'Write Unit Tests for HostelBookingService with Test.createTestingModule & jest.fn()',
            prompt: `In <code>hostel-booking.spec.ts</code>, complete the unit test suite inside <code>POST /test-suite/run-unit</code> to verify <code>HostelBookingService</code> (defined in <code>hostel-booking.service.ts</code>) in complete isolation from the real database:
              <ol>
                <li>Create <code>mockPrisma</code> with <code>listing: { findUnique: jest.fn() }</code> and <code>booking: { create: jest.fn() }</code>, then compile a <code>TestingModule</code> via <code>Test.createTestingModule({ providers: [HostelBookingService, { provide: PrismaService, useValue: mockPrisma }] }).compile()</code> and retrieve <code>service = moduleRef.get(HostelBookingService)</code>.</li>
                <li><strong>Spec 1 (Happy Path):</strong> Configure <code>mockPrisma.listing.findUnique.mockResolvedValue({ id: 1, title: 'Cedar Court', rentPerYear: 180, roomsAvailable: 3 })</code> and <code>mockPrisma.booking.create.mockResolvedValue({ id: 'bk-501', studentId: 'u-student-3', listingId: 1, amount: 180, status: 'confirmed' })</code>. Call <code>const booking = await service.bookHostel('u-student-3', 1)</code> and assert <code>expect(mockPrisma.listing.findUnique).toHaveBeenCalledWith({ where: { id: 1 } })</code>, <code>expect(mockPrisma.booking.create).toHaveBeenCalledTimes(1)</code>, and <code>expect(booking.status).toBe('confirmed')</code>.</li>
                <li><strong>Spec 2 (Sold-Out Conflict Path):</strong> Configure <code>mockPrisma.listing.findUnique.mockResolvedValue({ id: 3, title: 'Full Hostel', rentPerYear: 120, roomsAvailable: 0 })</code> and assert <code>await expect(service.bookHostel('u-student-3', 3)).rejects.toThrow(ConflictException)</code>.</li>
                <li>Return <code>{ suite: 'HostelBookingService Unit Tests', passedSpecs: 2, bookingCallArgs: mockPrisma.booking.create.mock.calls[0][0], conflictRejected: true }</code>.</li>
              </ol>`,
            hints: [
              'Compile the module with `const moduleRef = await Test.createTestingModule({ providers: [HostelBookingService, { provide: PrismaService, useValue: mockPrisma }] }).compile();` and `const service = moduleRef.get(HostelBookingService);`.',
              'Use `mockPrisma.listing.findUnique.mockResolvedValue(...)` before each call to `service.bookHostel(...)`.',
              'Use `await expect(service.bookHostel("u-student-3", 3)).rejects.toThrow(ConflictException);` to verify the sold-out error path.',
            ],
            starterFiles: [
              {
                name: 'hostel-booking.spec.ts',
                code: `import { Controller, Post, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { HostelBookingService } from './hostel-booking.service';

@Controller('test-suite')
export class HostelBookingSpecController {
  @Post('run-unit')
  async runUnitSuite() {
    const mockPrisma = {
      listing: { findUnique: jest.fn() },
      booking: { create: jest.fn() },
    };

    // TODO 1: Compile Test.createTestingModule with HostelBookingService and { provide: PrismaService, useValue: mockPrisma }
    // TODO 2: Spec 1 — Mock findUnique (roomsAvailable: 3, rentPerYear: 180) & booking.create, call service.bookHostel('u-student-3', 1), and assert calls with expect(...)
    // TODO 3: Spec 2 — Mock findUnique (roomsAvailable: 0) and assert await expect(service.bookHostel('u-student-3', 3)).rejects.toThrow(ConflictException)
    return {};
  }
}
`,
              },
              {
                name: 'hostel-booking.service.ts',
                code: `import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class HostelBookingService {
  constructor(private readonly prisma: PrismaService) {}

  async bookHostel(studentId: string, listingId: number) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Hostel not found');
    if (listing.roomsAvailable <= 0) {
      throw new ConflictException('No rooms available in this hostel');
    }
    return this.prisma.booking.create({
      data: {
        studentId,
        listingId,
        amount: listing.rentPerYear,
        status: 'confirmed',
      },
    });
  }
}
`,
              },
              SHARED_PRISMA_SERVICE_FILE,
              {
                name: 'hostel-booking.module.ts',
                code: `import { Module } from '@nestjs/common';
import { HostelBookingService } from './hostel-booking.service';
import { PrismaService } from './prisma.service';

@Module({
  providers: [HostelBookingService, PrismaService],
  exports: [HostelBookingService],
})
export class HostelBookingModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'hostel-booking.spec.ts',
                code: `import { Controller, Post, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { HostelBookingService } from './hostel-booking.service';

@Controller('test-suite')
export class HostelBookingSpecController {
  @Post('run-unit')
  async runUnitSuite() {
    const mockPrisma = {
      listing: { findUnique: jest.fn() },
      booking: { create: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        HostelBookingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    const service = moduleRef.get(HostelBookingService);

    // Spec 1: Happy path booking when roomsAvailable > 0
    mockPrisma.listing.findUnique.mockResolvedValue({
      id: 1,
      title: 'Cedar Court',
      rentPerYear: 180,
      roomsAvailable: 3,
    });
    mockPrisma.booking.create.mockResolvedValue({
      id: 'bk-501',
      studentId: 'u-student-3',
      listingId: 1,
      amount: 180,
      status: 'confirmed',
    });

    const booking = await service.bookHostel('u-student-3', 1);
    expect(mockPrisma.listing.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockPrisma.booking.create).toHaveBeenCalledTimes(1);
    expect(booking.status).toBe('confirmed');

    // Spec 2: ConflictException when roomsAvailable === 0
    mockPrisma.listing.findUnique.mockResolvedValue({
      id: 3,
      title: 'Full Hostel',
      rentPerYear: 120,
      roomsAvailable: 0,
    });

    await expect(service.bookHostel('u-student-3', 3)).rejects.toThrow(
      ConflictException,
    );
    expect(mockPrisma.booking.create).toHaveBeenCalledTimes(1);

    return {
      suite: 'HostelBookingService Unit Tests',
      passedSpecs: 2,
      bookingCallArgs: mockPrisma.booking.create.mock.calls[0][0],
      conflictRejected: true,
    };
  }
}
`,
              },
              {
                name: 'hostel-booking.service.ts',
                code: `import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class HostelBookingService {
  constructor(private readonly prisma: PrismaService) {}

  async bookHostel(studentId: string, listingId: number) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Hostel not found');
    if (listing.roomsAvailable <= 0) {
      throw new ConflictException('No rooms available in this hostel');
    }
    return this.prisma.booking.create({
      data: {
        studentId,
        listingId,
        amount: listing.rentPerYear,
        status: 'confirmed',
      },
    });
  }
}
`,
              },
              SHARED_PRISMA_SERVICE_FILE,
              {
                name: 'hostel-booking.module.ts',
                code: `import { Module } from '@nestjs/common';
import { HostelBookingService } from './hostel-booking.service';
import { PrismaService } from './prisma.service';

@Module({
  providers: [HostelBookingService, PrismaService],
  exports: [HostelBookingService],
})
export class HostelBookingModule {}
`,
              },
            ],
            tests: [
              {
                name: 'POST /test-suite/run-unit compiles Test.createTestingModule, mocks PrismaService with jest.fn(), and passes both happy-path & ConflictException specs',
                request: { method: 'POST', url: '/test-suite/run-unit', headers: {}, body: {} },
                check: (res) =>
                  res.status === 201 &&
                  res.body?.passedSpecs === 2 &&
                  res.body?.conflictRejected === true &&
                  res.body?.bookingCallArgs?.data?.studentId === 'u-student-3' &&
                  res.body?.bookingCallArgs?.data?.listingId === 1 &&
                  res.body?.bookingCallArgs?.data?.amount === 180
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected passedSpecs=2, conflictRejected=true, and bookingCallArgs.data={ studentId: 'u-student-3', listingId: 1, amount: 180 }, got ${JSON.stringify(res.body)}`,
                      },
              },
            ],
          },
        },

        {
          id: 'testing-integration-supertest-overrides',
          code: '14.2',
          title: 'Integration & E2E HTTP Pipeline Testing (createNestApplication, Supertest & .overrideGuard())',
          difficulty: 'Advanced',
          summary: 'Boot a full in-memory NestJS HTTP pipeline with ValidationPipe, override Guards with .overrideGuard(), and assert status codes and payloads using Supertest.',
          theory: `
            <h4>🏠 Story Context: Testing the Full Kampus Request Pipeline (Guards + ValidationPipe + Controllers)</h4>
            <p>A unit test that calls <code>controller.create(dto)</code> directly as a normal TypeScript function <strong>completely bypasses</strong> NestJS's HTTP pipeline! It will never catch a missing <code>ValidationPipe</code>, a broken <code>ParseIntPipe</code>, or a misconfigured <code>@UseGuards()</code> decorator.</p>
            <p>To test the real HTTP pipeline without external network dependencies, we write <strong>Integration / E2E Tests</strong> using <code>moduleRef.createNestApplication()</code> and <code>supertest</code>:</p>
            <ul>
              <li><strong><code>const app = moduleRef.createNestApplication()</code>:</strong> Boots the full NestJS HTTP router, middleware, guards, interceptors, pipes, and exception filters in memory.</li>
              <li><strong><code>app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))</code>:</strong> Crucial best practice! Because <code>main.ts</code> is not executed by tests, you must attach your global pipes to the test <code>app</code> before calling <code>await app.init()</code>.</li>
              <li><strong><code>.overrideGuard(StudentAuthGuard).useValue(...)</code>:</strong> Swaps out real JWT/OAuth verification with a deterministic test guard that attaches <code>req.user</code>, allowing you to test protected routes and DTO validation cleanly.</li>
              <li><strong><code>request(app.getHttpServer()).post('/path').send(payload).expect(201)</code>:</strong> Sends a synthetic HTTP request through the entire pipeline and asserts the HTTP status code and JSON body.</li>
            </ul>
          `,
          exampleFiles: [
            {
              name: 'listings-e2e.spec.ts',
              code: `import {
  Controller,
  Post,
  ValidationPipe,
  ExecutionContext,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { E2eListingsController } from './e2e-listings.controller';
import { LandlordJwtGuard } from './landlord-jwt.guard';

@Controller('test-suite')
export class E2eTestRunnerController {
  @Post('run-e2e')
  async runIntegrationSuite() {
    // 1. Compile module & override LandlordJwtGuard for deterministic E2E testing
    const moduleRef = await Test.createTestingModule({
      controllers: [E2eListingsController],
    })
      .overrideGuard(LandlordJwtGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest();
          req.user = { id: 'u-landlord-2', role: 'landlord' };
          return true;
        },
      })
      .compile();

    // 2. Boot full NestJS application with global ValidationPipe
    const app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // 3. Test ParseIntPipe transformation on GET /e2e-listings/1 -> 200 OK
    const getRes = await request(app.getHttpServer())
      .get('/e2e-listings/1')
      .expect(200);
    expect(getRes.body.id).toBe(1);

    // 4. Test ParseIntPipe rejection on GET /e2e-listings/not-a-number -> 400 Bad Request
    await request(app.getHttpServer())
      .get('/e2e-listings/not-a-number')
      .expect(400);

    // 5. Test ValidationPipe rejection on invalid POST body -> 400 Bad Request
    const badPostRes = await request(app.getHttpServer())
      .post('/e2e-listings')
      .send({ title: 'No', rentPerYear: 10 })
      .expect(400);

    // 6. Test valid POST body -> 201 Created
    const validPostRes = await request(app.getHttpServer())
      .post('/e2e-listings')
      .send({ title: 'Emerald Executive Hostel', rentPerYear: 240 })
      .expect(201);

    await app.close();

    return {
      suite: 'E2eListingsController (Supertest + ValidationPipe + overrideGuard)',
      specsPassed: 4,
      createdHostel: validPostRes.body,
      validationRejectedStatus: badPostRes.status,
    };
  }
}
`,
            },
            {
              name: 'e2e-listings.controller.ts',
              code: `import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { CreateHostelListingDto } from './create-hostel-listing.dto';
import { LandlordJwtGuard } from './landlord-jwt.guard';

@Controller('e2e-listings')
@UseGuards(LandlordJwtGuard)
export class E2eListingsController {
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return { id, title: 'Cedar Court Ensuite Studio', verified: true };
  }

  @Post()
  create(@Body() dto: CreateHostelListingDto) {
    return { id: 101, ...dto, status: 'published' };
  }
}
`,
            },
            {
              name: 'create-hostel-listing.dto.ts',
              code: `import { IsString, MinLength, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateHostelListingDto {
  @IsString()
  @MinLength(5)
  title: string;

  @Type(() => Number)
  @IsInt()
  @Min(50)
  rentPerYear: number;
}
`,
            },
            {
              name: 'landlord-jwt.guard.ts',
              code: `import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class LandlordJwtGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    // In production this verifies an external RS256 JWT; overridden in E2E tests
    return false;
  }
}
`,
            },
            {
              name: 'e2e-listings.module.ts',
              code: `import { Module } from '@nestjs/common';
import { E2eListingsController } from './e2e-listings.controller';
import { LandlordJwtGuard } from './landlord-jwt.guard';

@Module({
  controllers: [E2eListingsController],
  providers: [LandlordJwtGuard],
})
export class E2eListingsModule {}
`,
            },
          ],
          presets: [
            {
              label: 'POST /test-suite/run-e2e (Run Full Supertest HTTP Integration Suite)',
              method: 'POST',
              url: '/test-suite/run-e2e',
              headers: {},
              body: '',
            },
          ],
          exercise: {
            title: 'Test EscrowCheckoutController End-to-End with Supertest, ValidationPipe & .overrideGuard()',
            prompt: `In <code>escrow-e2e.spec.ts</code>, complete the HTTP integration test suite inside <code>POST /test-suite/run-e2e</code> to test <code>EscrowCheckoutController</code> (defined in <code>escrow-checkout.controller.ts</code> with <code>release-escrow.dto.ts</code> and <code>student-auth.guard.ts</code>) through the real NestJS pipeline:
              <ol>
                <li>Compile <code>Test.createTestingModule({ controllers: [EscrowCheckoutController] })</code> and chain <code>.overrideGuard(StudentAuthGuard).useValue({ canActivate: (ctx) =&gt; { const req = ctx.switchToHttp().getRequest(); req.user = { id: 'u-student-3', email: 'ada@kampus.edu', role: 'student' }; return true; } })</code>.</li>
                <li>Create the NestJS application with <code>const app = moduleRef.createNestApplication()</code>, register <code>app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))</code>, and call <code>await app.init()</code>.</li>
                <li>Use <code>request(app.getHttpServer())</code> to send a valid checkout: <code>const validRes = await request(app.getHttpServer()).post('/e2e-escrow/checkout').send({ listingId: 1, amount: 180 }).expect(201)</code>.</li>
                <li>Use <code>request(app.getHttpServer())</code> to verify that an under-minimum amount (<code>{ listingId: 1, amount: 10 }</code>) is rejected by <code>ValidationPipe</code> with <code>400</code>: <code>const invalidRes = await request(app.getHttpServer()).post('/e2e-escrow/checkout').send({ listingId: 1, amount: 10 }).expect(400)</code>.</li>
                <li>Call <code>await app.close()</code> and return <code>{ validStatus: validRes.status, validBody: validRes.body, invalidStatus: invalidRes.status }</code>.</li>
              </ol>`,
            hints: [
              'Chain `.overrideGuard(StudentAuthGuard).useValue({ canActivate: (ctx) => { const req = ctx.switchToHttp().getRequest(); req.user = { id: "u-student-3", email: "ada@kampus.edu", role: "student" }; return true; } })` before `.compile()`.',
              'Don\'t forget `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))` before `await app.init()`.',
              'Use `await request(app.getHttpServer()).post("/e2e-escrow/checkout").send(...).expect(...)` for both requests.',
            ],
            starterFiles: [
              {
                name: 'escrow-e2e.spec.ts',
                code: `import {
  Controller,
  Post,
  ValidationPipe,
  ExecutionContext,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { EscrowCheckoutController } from './escrow-checkout.controller';
import { StudentAuthGuard } from './student-auth.guard';

@Controller('test-suite')
export class EscrowE2eSpecController {
  @Post('run-e2e')
  async runE2eSuite() {
    // TODO 1: Compile Test.createTestingModule({ controllers: [EscrowCheckoutController] })
    //         and override StudentAuthGuard to attach req.user = { id: 'u-student-3', email: 'ada@kampus.edu', role: 'student' }
    // TODO 2: Create app, attach global ValidationPipe({ whitelist: true, transform: true }), and call await app.init()
    // TODO 3: Run Supertest POST /e2e-escrow/checkout with { listingId: 1, amount: 180 } -> .expect(201)
    // TODO 4: Run Supertest POST /e2e-escrow/checkout with { listingId: 1, amount: 10 } -> .expect(400)
    // TODO 5: Close app and return { validStatus: validRes.status, validBody: validRes.body, invalidStatus: invalidRes.status }
    return {};
  }
}
`,
              },
              {
                name: 'escrow-checkout.controller.ts',
                code: `import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ReleaseEscrowDto } from './release-escrow.dto';
import { StudentAuthGuard } from './student-auth.guard';

@Controller('e2e-escrow')
@UseGuards(StudentAuthGuard)
export class EscrowCheckoutController {
  @Post('checkout')
  checkout(@Body() dto: ReleaseEscrowDto, @Req() req: any) {
    return {
      escrowStatus: 'locked',
      studentId: req.user?.id,
      listingId: dto.listingId,
      amount: dto.amount,
    };
  }
}
`,
              },
              {
                name: 'release-escrow.dto.ts',
                code: `import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ReleaseEscrowDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  listingId: number;

  @Type(() => Number)
  @IsInt()
  @Min(50)
  amount: number;
}
`,
              },
              {
                name: 'student-auth.guard.ts',
                code: `import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class StudentAuthGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return false; // Overridden in E2E test via .overrideGuard(StudentAuthGuard)
  }
}
`,
              },
              {
                name: 'escrow-checkout.module.ts',
                code: `import { Module } from '@nestjs/common';
import { EscrowCheckoutController } from './escrow-checkout.controller';
import { StudentAuthGuard } from './student-auth.guard';

@Module({
  controllers: [EscrowCheckoutController],
  providers: [StudentAuthGuard],
})
export class EscrowCheckoutModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'escrow-e2e.spec.ts',
                code: `import {
  Controller,
  Post,
  ValidationPipe,
  ExecutionContext,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { EscrowCheckoutController } from './escrow-checkout.controller';
import { StudentAuthGuard } from './student-auth.guard';

@Controller('test-suite')
export class EscrowE2eSpecController {
  @Post('run-e2e')
  async runE2eSuite() {
    const moduleRef = await Test.createTestingModule({
      controllers: [EscrowCheckoutController],
    })
      .overrideGuard(StudentAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest();
          req.user = { id: 'u-student-3', email: 'ada@kampus.edu', role: 'student' };
          return true;
        },
      })
      .compile();

    const app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const validRes = await request(app.getHttpServer())
      .post('/e2e-escrow/checkout')
      .send({ listingId: 1, amount: 180 })
      .expect(201);

    const invalidRes = await request(app.getHttpServer())
      .post('/e2e-escrow/checkout')
      .send({ listingId: 1, amount: 10 })
      .expect(400);

    await app.close();

    return {
      validStatus: validRes.status,
      validBody: validRes.body,
      invalidStatus: invalidRes.status,
    };
  }
}
`,
              },
              {
                name: 'escrow-checkout.controller.ts',
                code: `import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ReleaseEscrowDto } from './release-escrow.dto';
import { StudentAuthGuard } from './student-auth.guard';

@Controller('e2e-escrow')
@UseGuards(StudentAuthGuard)
export class EscrowCheckoutController {
  @Post('checkout')
  checkout(@Body() dto: ReleaseEscrowDto, @Req() req: any) {
    return {
      escrowStatus: 'locked',
      studentId: req.user?.id,
      listingId: dto.listingId,
      amount: dto.amount,
    };
  }
}
`,
              },
              {
                name: 'release-escrow.dto.ts',
                code: `import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ReleaseEscrowDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  listingId: number;

  @Type(() => Number)
  @IsInt()
  @Min(50)
  amount: number;
}
`,
              },
              {
                name: 'student-auth.guard.ts',
                code: `import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class StudentAuthGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return false;
  }
}
`,
              },
              {
                name: 'escrow-checkout.module.ts',
                code: `import { Module } from '@nestjs/common';
import { EscrowCheckoutController } from './escrow-checkout.controller';
import { StudentAuthGuard } from './student-auth.guard';

@Module({
  controllers: [EscrowCheckoutController],
  providers: [StudentAuthGuard],
})
export class EscrowCheckoutModule {}
`,
              },
            ],
            tests: [
              {
                name: 'POST /test-suite/run-e2e overrides StudentAuthGuard, boots INestApplication with ValidationPipe, and verifies both 201 Created and 400 Bad Request via Supertest',
                request: { method: 'POST', url: '/test-suite/run-e2e', headers: {}, body: {} },
                check: (res) =>
                  res.status === 201 &&
                  res.body?.validStatus === 201 &&
                  res.body?.validBody?.escrowStatus === 'locked' &&
                  res.body?.validBody?.studentId === 'u-student-3' &&
                  res.body?.validBody?.amount === 180 &&
                  res.body?.invalidStatus === 400
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected validStatus=201 (studentId='u-student-3', amount=180) and invalidStatus=400, got ${JSON.stringify(res.body)}`,
                      },
              },
            ],
          },
        },
      ],
    },
  ];

  // ===========================================================================
  // FREE SANDBOX TEMPLATES — KAMPUS PROPTECH END-TO-END ARCHITECTURES
  // ===========================================================================
  const SANDBOX_TEMPLATES = [
    {
      id: 'kampus-full-blueprint',
      name: '🏠 Kampus PropTech Full Blueprint (Guards + DTOs + Cache + Envelope + Events)',
      description: 'Complete multi-file Kampus Student Housing API combining JWT Guards, DTO Validation, Cache-Aside, Envelope Interceptor, and Audit Events.',
      files: [
        {
          name: 'kampus-envelope.interceptor.ts',
          code: `import { Injectable } from '@nestjs/common';
import { map } from 'rxjs/operators';

@Injectable()
export class KampusEnvelopeInterceptor {
  intercept(context: any, next: any) {
    const req = context.switchToHttp().getRequest();
    return next.handle().pipe(
      map((data) => ({
        platform: 'Kampus PropTech',
        path: req.url,
        data,
      })),
    );
  }
}
`,
        },
        {
          name: 'create-hostel.dto.ts',
          code: `import { IsString, MinLength, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateHostelDto {
  @IsString()
  @MinLength(5)
  title: string;

  @IsString()
  campusZone: string;

  @Type(() => Number)
  @IsInt()
  @Min(50)
  rentPerYear: number;
}
`,
        },
        {
          name: 'kampus-listings.controller.ts',
          code: `import {
  Controller, Get, Post, Body, Param, Query, Inject,
  ParseIntPipe, UseInterceptors, ValidationPipe, UnauthorizedException
} from '@nestjs/common';
import { CACHE_MANAGER, CacheManager } from '@nestjs/cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseService, CurrentUser } from '@playground/sandbox';
import { CreateHostelDto } from './create-hostel.dto';
import { KampusEnvelopeInterceptor } from './kampus-envelope.interceptor';

@Controller('listings')
@UseInterceptors(KampusEnvelopeInterceptor)
export class KampusListingsController {
  constructor(
    private readonly db: DatabaseService,
    @Inject(CACHE_MANAGER) private readonly cache: CacheManager,
    private readonly events: EventEmitter2,
  ) {}

  @Get()
  async listHostels(@Query('search') search?: string) {
    const cacheKey = \`kampus:listings:\${search || 'all'}\`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return { source: 'cache', items: cached };
    }
    const items = this.db.findListings({ search });
    await this.cache.set(cacheKey, items, 30000);
    return { source: 'database', items };
  }

  @Get(':id')
  getHostelById(@Param('id', ParseIntPipe) id: number) {
    return this.db.findListingById(id);
  }

  @Post()
  async createHostel(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: CreateHostelDto,
    @CurrentUser() user: any,
  ) {
    if (!user) throw new UnauthorizedException('Sign in as a Kampus Landlord or Admin');
    const created = this.db.createListing({
      ...dto,
      landlordId: user.id,
      verified: user.role === 'admin',
      published: true,
    });
          await this.cache.del('kampus:listings:all');
          this.events.emit('listing.created', { id: created.id, landlord: user.email });
          return created;
        }
      }
      `,
        },
        SHARED_DATABASE_SERVICE_FILE,
        {
          name: 'kampus-listings.module.ts',
          code: `import { Module } from '@nestjs/common';
import { KampusListingsController } from './kampus-listings.controller';
import { KampusEnvelopeInterceptor } from './kampus-envelope.interceptor';
import { DatabaseService } from './database.service';

@Module({
  controllers: [KampusListingsController],
  providers: [KampusEnvelopeInterceptor, DatabaseService],
})
export class KampusListingsModule {}
`,
        },
      ],
      presets: [
        {
          label: 'GET /listings (Browse Kampus Hostels — Cache-Aside)',
          method: 'GET',
          url: '/listings',
          headers: {},
          body: '',
        },
        {
          label: 'POST /listings (Create Hostel as Landlord Chidi)',
          method: 'POST',
          url: '/listings',
          headers: { Authorization: 'Bearer demo-landlord-jwt' },
          body: JSON.stringify(
            { title: 'Lagoon View Student Suites', campusZone: 'North Gate', rentPerYear: 220 },
            null,
            2,
          ),
        },
        {
          label: 'POST /listings (Invalid DTO -> 400 ValidationPipe)',
          method: 'POST',
          url: '/listings',
          headers: { Authorization: 'Bearer demo-landlord-jwt' },
          body: JSON.stringify({ title: 'Hi', campusZone: 'North Gate', rentPerYear: 10 }, null, 2),
        },
      ],
    },
    {
      id: 'kampus-escrow-sandbox',
      name: '💳 Kampus Rent Escrow & Idempotent Checkout Sandbox',
      description: 'Experiment with Student-to-Landlord atomic wallet transfers, rollback safety, and Idempotency-Key protection.',
      files: [
        {
          name: 'escrow-sandbox.controller.ts',
          code: `import {
  Controller, Get, Post, Body, Headers,
  BadRequestException, NotFoundException, UnauthorizedException
} from '@nestjs/common';
import { DatabaseService, CurrentUser } from '@playground/sandbox';

@Controller('escrow')
export class EscrowSandboxController {
  constructor(private readonly db: DatabaseService) {}

  @Get('my-wallet')
  getMyEscrowWallet(@CurrentUser() user: any) {
    if (!user) throw new UnauthorizedException('Sign in to view your Kampus Escrow Wallet');
    return {
      user: user.email,
      role: user.role,
      escrowBalance: this.db.escrowWallets[user.id] ?? 0,
      bookings: this.db.bookings,
    };
  }

  @Post('release')
  async releaseEscrowToLandlord(
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() body: { landlordId: string; listingId: number; amount: number },
    @CurrentUser() user: any,
  ) {
    if (!user) throw new UnauthorizedException('Sign in as a student to release rent');
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const existing = this.db.bookings.find((b: any) => b.idempotencyKey === idempotencyKey);
    if (existing) {
      return { replayed: true, booking: existing };
    }

    return await this.db.transaction(async (tx) => {
      const studentId = user.id;
      if ((tx.escrowWallets[studentId] ?? 0) < body.amount) {
        throw new BadRequestException('Insufficient Kampus escrow balance');
      }

      tx.escrowWallets[studentId] -= body.amount;

      const landlord = tx.findUserById(body.landlordId);
      if (!landlord) {
        throw new NotFoundException('Landlord not found — escrow deduction rolled back!');
      }

      tx.escrowWallets[body.landlordId] = (tx.escrowWallets[body.landlordId] || 0) + body.amount;

      const booking = {
        id: 'bk-' + (tx.bookings.length + 101),
        studentId,
        listingId: body.listingId,
        amount: body.amount,
        status: 'released-to-landlord',
        idempotencyKey,
      };
      tx.bookings.push(booking);

      return {
        replayed: false,
        booking,
        studentBalance: tx.escrowWallets[studentId],
        landlordBalance: tx.escrowWallets[body.landlordId],
      };
    });
  }
}
`,
        },
        SHARED_DATABASE_SERVICE_FILE,
        {
          name: 'escrow-sandbox.module.ts',
          code: `import { Module } from '@nestjs/common';
import { EscrowSandboxController } from './escrow-sandbox.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [EscrowSandboxController],
  providers: [DatabaseService],
})
export class EscrowSandboxModule {}
`,
        },
      ],
      presets: [
        {
          label: 'GET /escrow/my-wallet (Inspect Adaobi Student Wallet)',
          method: 'GET',
          url: '/escrow/my-wallet',
          headers: { Authorization: 'Bearer demo-student-jwt' },
          body: '',
        },
        {
          label: 'POST /escrow/release (Release $180 Rent to Landlord Chidi)',
          method: 'POST',
          url: '/escrow/release',
          headers: {
            Authorization: 'Bearer demo-student-jwt',
            'idempotency-key': 'idem-sandbox-release-1',
          },
          body: JSON.stringify({ landlordId: 'u-landlord-2', listingId: 1, amount: 180 }, null, 2),
        },
        {
          label: 'POST /escrow/release (Simulate Rollback with Unknown Landlord)',
          method: 'POST',
          url: '/escrow/release',
          headers: {
            Authorization: 'Bearer demo-student-jwt',
            'idempotency-key': 'idem-sandbox-rollback-99',
          },
          body: JSON.stringify({ landlordId: 'u-unknown-999', listingId: 1, amount: 180 }, null, 2),
        },
      ],
    },
  ];

  global.NEST_CURRICULUM = (global.NEST_CURRICULUM_PART1 || []).concat(PART_2_MODULES);
  global.NEST_SANDBOX_TEMPLATES = SANDBOX_TEMPLATES;
})(window);

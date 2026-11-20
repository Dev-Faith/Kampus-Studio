/**
 * Kampus PropTech — NestJS Interactive Trainer Curriculum (Part 1: Modules 1 – 5)
 * ===============================================================================
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

  const SHARED_CURRENT_USER_FILE = {
    name: 'current-user.decorator.ts',
    code: `import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts \`req.user\` populated by Kampus JWT authentication.
 */
export const CurrentUser = createParamDecorator(
  (field: string | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    return field ? user?.[field] : user;
  },
);
`,
  };

  const PART_1_MODULES = [
    // =========================================================================
    // MODULE 1: KAMPUS CORE — ARCHITECTURE, ROUTING & DEPENDENCY INJECTION
    // =========================================================================
    {
      id: 'mod-architecture',
      number: '01',
      title: 'Kampus Core: Routing & DI',
      icon: 'layers',
      description: 'Build the core Kampus Hostel Listings controller, inject escrow fee providers, and trace the NestJS request onion.',
      subconcepts: [
        {
          id: 'arch-controllers',
          code: '1.1',
          title: 'Hostel Listings Controller & Route Parameters',
          difficulty: 'Beginner',
          summary: 'Build the first Kampus endpoint (/listings) so students can search off-campus hostels by zone and landlords can list rooms.',
          theory: `
            <h4>🏠 Welcome to the Kampus PropTech Engineering Team!</h4>
            <p>Throughout this trainer, every single concept you learn builds the backend of <strong>Kampus</strong>—a student housing &amp; rent escrow platform connecting students (like <strong>Adaobi</strong>), verified landlords (like <strong>Chidi</strong>), and campus housing officers (like <strong>Grace</strong>).</p>
            <h4>Step 1: Controllers &amp; Route Decorators</h4>
            <p>A <strong>Controller</strong> is the HTTP entry door to Kampus. Its only job is to unpack the incoming request, call a service/database method, and return the result:</p>
            <ul>
              <li><code>@Controller('listings')</code> mounts all hostel routes under <code>/listings</code>.</li>
              <li><code>@Get()</code>, <code>@Get(':id')</code>, <code>@Post()</code>, and <code>@Delete(':id')</code> map HTTP verbs and URL paths.</li>
              <li><code>@Param('id')</code>, <code>@Query('campusZone')</code>, <code>@Body()</code>, and <code>@Headers('x-campus-app')</code> extract request data cleanly without touching raw Express <code>req</code>/<code>res</code>.</li>
              <li><code>@HttpCode(204)</code> overrides Nest's default status code (200 for GET, 201 for POST).</li>
            </ul>
          `,
          exampleFiles: [
            {
              name: 'listings.controller.ts',
              code: `import {
  Controller, Get, Post, Delete, Param, Query, Body, Headers,
  HttpCode, NotFoundException
} from '@nestjs/common';
import { DatabaseService } from './database.service';
import { CreateListingDto } from './create-listing.dto';

@Controller('listings')
export class ListingsController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  findAll(@Query('campusZone') campusZone?: string, @Query('search') search?: string) {
    return this.db.findListings({ campusZone, search });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Headers('x-campus-client') client = 'kampus-web') {
    const listing = this.db.findListingById(Number(id));
    if (!listing) throw new NotFoundException(\`Kampus listing #\${id} not found\`);
    return { ...listing, viewedVia: client };
  }

  @Post()
  create(@Body() body: CreateListingDto) {
    return this.db.createListing(body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    if (!this.db.deleteListing(Number(id))) {
      throw new NotFoundException(\`Kampus listing #\${id} not found\`);
    }
  }
}
`,
            },
            {
              name: 'create-listing.dto.ts',
              code: `export class CreateListingDto {
  title: string;
  campusZone: string;
  rentPerYear: number;
}
`,
            },
            SHARED_DATABASE_SERVICE_FILE,
            {
              name: 'listings.module.ts',
              code: `import { Module } from '@nestjs/common';
import { ListingsController } from './listings.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [ListingsController],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class ListingsModule {}
`,
            },
          ],
          presets: [
            {
              label: 'GET /listings?campusZone=North Gate',
              method: 'GET',
              url: '/listings?campusZone=North Gate',
              headers: { 'x-campus-client': 'student-web' },
              body: '',
            },
            {
              label: 'GET /listings/1 (Cedar Court Studio)',
              method: 'GET',
              url: '/listings/1',
              headers: { 'x-campus-client': 'kampus-ios' },
              body: '',
            },
            {
              label: 'POST /listings (Landlord Chidi adds Hostel)',
              method: 'POST',
              url: '/listings',
              headers: {},
              body: JSON.stringify(
                { title: 'Palmview Student Suites', campusZone: 'South Gate', rentPerYear: 210 },
                null,
                2,
              ),
            },
          ],
          exercise: {
            title: 'Build the Kampus Student & Landlord Directory Controller',
            prompt: `Kampus needs a <code>UsersController</code> at <code>/users</code> (wired in <code>users.module.ts</code> with <code>create-user.dto.ts</code> and <code>database.service.ts</code>):
              <ol>
                <li><code>GET /users/:id</code> returns the user from <code>this.db.findUserById(id)</code>, or throws <code>NotFoundException</code> if missing.</li>
                <li><code>POST /users</code> (with <code>@HttpCode(201)</code>) creates a student via <code>this.db.createUser(body)</code> and attaches a <code>referralChannel</code> property read from <code>@Headers('x-referral')</code> (defaulting to <code>'campus-ambassador'</code>).</li>
              </ol>`,
            hints: [
              'In `findOne`, call `const user = this.db.findUserById(id); if (!user) throw new NotFoundException("Kampus user not found"); return user;`.',
              'In `create`, call `const created = this.db.createUser(body); return { ...created, referralChannel };`.',
            ],
            starterFiles: [
              {
                name: 'users.controller.ts',
                code: `import { Controller, Get, Post, Param, Body, Headers, HttpCode, NotFoundException } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { CreateUserDto } from './create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly db: DatabaseService) {}

  // TODO 1: Return user from this.db.findUserById(id) or throw NotFoundException
  @Get(':id')
  findOne(@Param('id') id: string) {
    return null;
  }

  // TODO 2: Create user via this.db.createUser(body) and return { ...created, referralChannel }
  @Post()
  @HttpCode(201)
  create(
    @Body() body: CreateUserDto,
    @Headers('x-referral') referralChannel = 'campus-ambassador',
  ) {
    return null;
  }
}
`,
              },
              {
                name: 'create-user.dto.ts',
                code: `export class CreateUserDto {
  email: string;
  name: string;
}
`,
              },
              SHARED_DATABASE_SERVICE_FILE,
              {
                name: 'users.module.ts',
                code: `import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [UsersController],
  providers: [DatabaseService],
})
export class UsersModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'users.controller.ts',
                code: `import { Controller, Get, Post, Param, Body, Headers, HttpCode, NotFoundException } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { CreateUserDto } from './create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly db: DatabaseService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    const user = this.db.findUserById(id);
    if (!user) throw new NotFoundException(\`Kampus user \${id} not found\`);
    return user;
  }

  @Post()
  @HttpCode(201)
  create(
    @Body() body: CreateUserDto,
    @Headers('x-referral') referralChannel = 'campus-ambassador',
  ) {
    const created = this.db.createUser(body);
    return { ...created, referralChannel };
  }
}
`,
              },
              {
                name: 'create-user.dto.ts',
                code: `export class CreateUserDto {
  email: string;
  name: string;
}
`,
              },
              SHARED_DATABASE_SERVICE_FILE,
              {
                name: 'users.module.ts',
                code: `import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [UsersController],
  providers: [DatabaseService],
})
export class UsersModule {}
`,
              },
            ],
            tests: [
              {
                name: 'GET /users/u-student-3 returns student Adaobi Okafor (200)',
                request: { method: 'GET', url: '/users/u-student-3', headers: {} },
                check: (res) =>
                  res.status === 200 && res.body?.email === 'ada@kampus.edu'
                    ? { pass: true }
                    : { pass: false, reason: `Expected 200 with email ada@kampus.edu, got ${res.status}` },
              },
              {
                name: 'GET /users/u-ghost throws 404 NotFoundException',
                request: { method: 'GET', url: '/users/u-ghost', headers: {} },
                check: (res) =>
                  res.status === 404
                    ? { pass: true }
                    : { pass: false, reason: `Expected 404 NotFoundException, got ${res.status}` },
              },
              {
                name: 'POST /users registers student and attaches referralChannel from x-referral header (201)',
                request: {
                  method: 'POST',
                  url: '/users',
                  headers: { 'x-referral': 'sug-orientation' },
                  body: { email: 'tunde@kampus.edu', name: 'Tunde Bakare (100L Law)' },
                },
                check: (res) =>
                  res.status === 201 &&
                  res.body?.email === 'tunde@kampus.edu' &&
                  res.body?.referralChannel === 'sug-orientation'
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected 201 with referralChannel="sug-orientation", got ${JSON.stringify(res.body)}`,
                      },
              },
            ],
          },
        },

        {
          id: 'arch-di-tokens',
          code: '1.2',
          title: 'Dependency Injection & Kampus Escrow Fee Providers',
          difficulty: 'Beginner',
          summary: 'Inject KampusFeeService and custom configuration tokens (@Inject + useValue) to compute student rent and escrow protection fees.',
          theory: `
            <h4>🏠 Story Context: Calculating Kampus Rent &amp; Escrow Fees</h4>
            <p>When Student Adaobi books a room on Kampus, her rent isn't wired straight to an unverified stranger—it goes into <strong>Kampus Rent Escrow</strong> until she moves in and confirms the room matches the photos. To calculate the total move-in cost (rent + escrow service fee + student discounts), we put pricing math in an <code>@Injectable()</code> service and inject a custom configuration token.</p>
            <h4>Custom Providers in <code>@Module()</code></h4>
            <ul>
              <li><strong>Class Provider:</strong> <code>providers: [KampusFeeService]</code></li>
              <li><strong>Value Provider (<code>useValue</code>):</strong> <code>{ provide: 'KAMPUS_FEE_CONFIG', useValue: { escrowRate: 0.05, CautionDeposit: 20 } }</code> — injected via <code>@Inject('KAMPUS_FEE_CONFIG')</code>.</li>
            </ul>
          `,
          exampleFiles: [
            {
              name: 'kampus-fee.service.ts',
              code: `import { Injectable, Inject } from '@nestjs/common';
import { KAMPUS_FEE_CONFIG, KampusFeeConfig } from './kampus-fee.config';

@Injectable()
export class KampusFeeService {
  constructor(@Inject(KAMPUS_FEE_CONFIG) private readonly config: KampusFeeConfig) {}

  calculateMoveInQuote(rentPerYear: number, isFreshman: boolean) {
    const baseRent = isFreshman
      ? rentPerYear * (1 - this.config.freshmanDiscount)
      : rentPerYear;
    const escrowProtectionFee = Number((baseRent * this.config.escrowRate).toFixed(2));
    return {
      currency: this.config.currency,
      rentAfterDiscount: Number(baseRent.toFixed(2)),
      escrowProtectionFee,
      totalPayableToEscrow: Number((baseRent + escrowProtectionFee).toFixed(2)),
    };
  }
}
`,
            },
            {
              name: 'kampus-fee.config.ts',
              code: `export const KAMPUS_FEE_CONFIG = 'KAMPUS_FEE_CONFIG';

export interface KampusFeeConfig {
  currency: string;
  escrowRate: number;
  freshmanDiscount: number;
}

export const DEFAULT_KAMPUS_FEE_CONFIG: KampusFeeConfig = {
  currency: 'USD',
  escrowRate: 0.05,
  freshmanDiscount: 0.1,
};
`,
            },
            {
              name: 'quotes.controller.ts',
              code: `import { Controller, Get, Query } from '@nestjs/common';
import { KampusFeeService } from './kampus-fee.service';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly fees: KampusFeeService) {}

  @Get('move-in')
  getQuote(@Query('rent') rent = '200', @Query('freshman') freshman = 'false') {
    return this.fees.calculateMoveInQuote(Number(rent), freshman === 'true');
  }
}
`,
            },
            {
              name: 'kampus-quote.module.ts',
              code: `import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { KampusFeeService } from './kampus-fee.service';
import { KAMPUS_FEE_CONFIG, DEFAULT_KAMPUS_FEE_CONFIG } from './kampus-fee.config';

@Module({
  controllers: [QuotesController],
  providers: [
    KampusFeeService,
    {
      provide: KAMPUS_FEE_CONFIG,
      useValue: DEFAULT_KAMPUS_FEE_CONFIG,
    },
  ],
  exports: [KampusFeeService],
})
export class KampusQuoteModule {}
`,
            },
          ],
          presets: [
            {
              label: 'Move-In Quote: $200 Rent (Returning Student)',
              method: 'GET',
              url: '/quotes/move-in?rent=200&freshman=false',
              headers: {},
              body: '',
            },
            {
              label: 'Move-In Quote: $200 Rent (100L Freshman — 10% Off)',
              method: 'GET',
              url: '/quotes/move-in?rent=200&freshman=true',
              headers: {},
              body: '',
            },
          ],
          exercise: {
            title: 'Provide & Inject Kampus Campus Policy Configuration',
            prompt: `In <code>policy.controller.ts</code> and <code>kampus.module.ts</code> (using <code>kampus-policy.config.ts</code>), register a custom value provider for token <code>'KAMPUS_POLICY'</code> with <code>{ escrowHoldDays: 7, maxRoommates: 2 }</code>, and inject it into <code>PolicyController</code> so <code>GET /policy</code> returns <code>{ escrowHoldDays: policy.escrowHoldDays, maxRoommates: policy.maxRoommates }</code>.`,
            hints: [
              'In `PolicyController.getPolicy()` (`policy.controller.ts`), return `{ escrowHoldDays: this.policy.escrowHoldDays, maxRoommates: this.policy.maxRoommates }`.',
              'Inspect `kampus.module.ts` and `kampus-policy.config.ts` to see how `KAMPUS_POLICY` is provided via `useValue`.',
            ],
            starterFiles: [
              {
                name: 'policy.controller.ts',
                code: `import { Controller, Get, Inject } from '@nestjs/common';
import { KAMPUS_POLICY, KampusPolicyConfig } from './kampus-policy.config';

@Controller('policy')
export class PolicyController {
  constructor(@Inject(KAMPUS_POLICY) private readonly policy: KampusPolicyConfig) {}

  @Get()
  getPolicy() {
    // TODO 1: Return { escrowHoldDays: this.policy.escrowHoldDays, maxRoommates: this.policy.maxRoommates }
    return {};
  }
}
`,
              },
              {
                name: 'kampus.module.ts',
                code: `import { Module } from '@nestjs/common';
import { PolicyController } from './policy.controller';
import { KAMPUS_POLICY, DEFAULT_KAMPUS_POLICY } from './kampus-policy.config';

@Module({
  controllers: [PolicyController],
  providers: [
    {
      provide: KAMPUS_POLICY,
      useValue: DEFAULT_KAMPUS_POLICY,
    },
  ],
})
export class KampusModule {}
`,
              },
              {
                name: 'kampus-policy.config.ts',
                code: `export const KAMPUS_POLICY = 'KAMPUS_POLICY';

export interface KampusPolicyConfig {
  escrowHoldDays: number;
  maxRoommates: number;
}

export const DEFAULT_KAMPUS_POLICY: KampusPolicyConfig = {
  escrowHoldDays: 7,
  maxRoommates: 2,
};
`,
              },
            ],
            solutionFiles: [
              {
                name: 'policy.controller.ts',
                code: `import { Controller, Get, Inject } from '@nestjs/common';
import { KAMPUS_POLICY, KampusPolicyConfig } from './kampus-policy.config';

@Controller('policy')
export class PolicyController {
  constructor(
    @Inject(KAMPUS_POLICY)
    private readonly policy: KampusPolicyConfig,
  ) {}

  @Get()
  getPolicy() {
    return {
      escrowHoldDays: this.policy.escrowHoldDays,
      maxRoommates: this.policy.maxRoommates,
    };
  }
}
`,
              },
              {
                name: 'kampus.module.ts',
                code: `import { Module } from '@nestjs/common';
import { PolicyController } from './policy.controller';
import { KAMPUS_POLICY, DEFAULT_KAMPUS_POLICY } from './kampus-policy.config';

@Module({
  controllers: [PolicyController],
  providers: [
    {
      provide: KAMPUS_POLICY,
      useValue: DEFAULT_KAMPUS_POLICY,
    },
  ],
})
export class KampusModule {}
`,
              },
              {
                name: 'kampus-policy.config.ts',
                code: `export const KAMPUS_POLICY = 'KAMPUS_POLICY';

export interface KampusPolicyConfig {
  escrowHoldDays: number;
  maxRoommates: number;
}

export const DEFAULT_KAMPUS_POLICY: KampusPolicyConfig = {
  escrowHoldDays: 7,
  maxRoommates: 2,
};
`,
              },
            ],
            tests: [
              {
                name: 'GET /policy returns injected KAMPUS_POLICY settings (escrowHoldDays: 7, maxRoommates: 2)',
                request: { method: 'GET', url: '/policy', headers: {} },
                check: (res) =>
                  res.status === 200 &&
                  res.body?.escrowHoldDays === 7 &&
                  res.body?.maxRoommates === 2
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected { escrowHoldDays: 7, maxRoommates: 2 }, got ${JSON.stringify(res.body)}`,
                      },
              },
            ],
          },
        },

        {
          id: 'arch-lifecycle',
          code: '1.3',
          title: 'The Kampus Request Lifecycle (Onion Execution Order)',
          difficulty: 'Intermediate',
          summary: 'Trace a Kampus hostel booking request through Middleware -> Guard -> Interceptor (Pre) -> Pipe -> Controller -> Interceptor (Post).',
          theory: `
            <h4>🏠 Story Context: How a Kampus Booking Request Travels Through the Server</h4>
            <p>When Student Adaobi requests a room reservation on Kampus, her HTTP request passes through 7 distinct layers in a strict order:</p>
            <ol>
              <li><strong>1. Middleware:</strong> Tags the request with a campus trace array before routing.</li>
              <li><strong>2. Guards:</strong> Checks whether Adaobi is allowed to access the route.</li>
              <li><strong>3. Interceptors (Pre-Controller):</strong> Starts a latency timer or checks cache before the handler.</li>
              <li><strong>4. Pipes:</strong> Parses and validates query/body parameters (e.g. <code>rooms=2</code> &rarr; <code>number</code>).</li>
              <li><strong>5. Controller Route Handler:</strong> Runs the core Kampus booking calculation.</li>
              <li><strong>6. Interceptors (Post-Controller):</strong> RxJS <code>map()</code> wraps the response on the way out.</li>
              <li><strong>7. Exception Filters:</strong> Catches any error thrown at any stage above.</li>
            </ol>
          `,
          exampleFiles: [
            {
              name: 'booking-trace.controller.ts',
              code: `import {
  Controller, Get, Query, Req, UseGuards, UseInterceptors, ParseIntPipe
} from '@nestjs/common';
import { KampusAccessGuard } from './kampus-access.guard';
import { KampusAuditInterceptor } from './kampus-audit.interceptor';

@Controller('booking-trace')
@UseGuards(KampusAccessGuard)
@UseInterceptors(KampusAuditInterceptor)
export class BookingTraceController {
  @Get()
  simulate(@Query('rooms', ParseIntPipe) rooms: number, @Req() req: any) {
    req.trace.push('5.Handler');
    return { roomsRequested: rooms, typeofRooms: typeof rooms };
  }
}
`,
            },
            {
              name: 'kampus-trace.middleware.ts',
              code: `import { Injectable } from '@nestjs/common';

@Injectable()
export class KampusTraceMiddleware {
  use(req: any, _res: any, next: () => void) {
    req.trace = ['1.Middleware'];
    next();
  }
}
`,
            },
            {
              name: 'kampus-access.guard.ts',
              code: `import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class KampusAccessGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    req.trace = [...(req.trace || []), '2.Guard'];
    return true;
  }
}
`,
            },
            {
              name: 'kampus-audit.interceptor.ts',
              code: `import { Injectable, ExecutionContext } from '@nestjs/common';
import { map } from 'rxjs/operators';

@Injectable()
export class KampusAuditInterceptor {
  intercept(ctx: ExecutionContext, next: any) {
    const req = ctx.switchToHttp().getRequest();
    req.trace.push('3.Interceptor(Pre)');
    return next.handle().pipe(
      map((data: any) => ({
        ...data,
        trace: [...req.trace, '6.Interceptor(Post)'],
      })),
    );
  }
}
`,
            },
            {
              name: 'booking-trace.module.ts',
              code: `import { Module } from '@nestjs/common';
import { BookingTraceController } from './booking-trace.controller';
import { KampusTraceMiddleware } from './kampus-trace.middleware';
import { KampusAccessGuard } from './kampus-access.guard';
import { KampusAuditInterceptor } from './kampus-audit.interceptor';

@Module({
  controllers: [BookingTraceController],
  providers: [KampusTraceMiddleware, KampusAccessGuard, KampusAuditInterceptor],
})
export class BookingTraceModule {}
`,
            },
          ],
          presets: [
            {
              label: 'Valid Trace: GET /booking-trace?rooms=2',
              method: 'GET',
              url: '/booking-trace?rooms=2',
              headers: {},
              body: '',
            },
            {
              label: 'Pipe Rejects Early: GET /booking-trace?rooms=two (400)',
              method: 'GET',
              url: '/booking-trace?rooms=two',
              headers: {},
              body: '',
            },
          ],
          exercise: {
            title: 'Complete the Kampus Lifecycle Trace & Total Rent Calculation',
            prompt: `In <code>booking-trace.controller.ts</code> (<code>BookingTraceController.simulate</code>), push <code>'5.Handler'</code> onto <code>req.trace</code> and return <code>{ totalRent: rooms * 180 }</code> (where $180 is the per-room annual rent at Cedar Court). You can inspect the Middleware, Guard, Interceptor, and Module in the adjacent tabs!`,
            hints: [
              'Call `req.trace.push("5.Handler")` inside `simulate`.',
              'Return `{ totalRent: rooms * 180 }` so `KampusAuditInterceptor` appends `"6.Interceptor(Post)"`.',
            ],
            starterFiles: [
              {
                name: 'booking-trace.controller.ts',
                code: `import {
  Controller, Get, Query, Req, UseGuards, UseInterceptors, ParseIntPipe
} from '@nestjs/common';
import { KampusAccessGuard } from './kampus-access.guard';
import { KampusAuditInterceptor } from './kampus-audit.interceptor';

@Controller('booking-trace')
@UseGuards(KampusAccessGuard)
@UseInterceptors(KampusAuditInterceptor)
export class BookingTraceController {
  @Get()
  simulate(@Query('rooms', ParseIntPipe) rooms: number, @Req() req: any) {
    // TODO: Push '5.Handler' to req.trace and return { totalRent: rooms * 180 }
    return {};
  }
}
`,
              },
              {
                name: 'kampus-trace.middleware.ts',
                code: `import { Injectable } from '@nestjs/common';

@Injectable()
export class KampusTraceMiddleware {
  use(req: any, _res: any, next: () => void) {
    req.trace = ['1.Middleware'];
    next();
  }
}
`,
              },
              {
                name: 'kampus-access.guard.ts',
                code: `import { Injectable } from '@nestjs/common';

@Injectable()
export class KampusAccessGuard {
  canActivate(ctx: any) {
    ctx.switchToHttp().getRequest().trace.push('2.Guard');
    return true;
  }
}
`,
              },
              {
                name: 'kampus-audit.interceptor.ts',
                code: `import { Injectable } from '@nestjs/common';
import { map } from 'rxjs/operators';

@Injectable()
export class KampusAuditInterceptor {
  intercept(ctx: any, next: any) {
    const req = ctx.switchToHttp().getRequest();
    req.trace.push('3.Interceptor(Pre)');
    return next.handle().pipe(
      map((data: any) => ({
        ...data,
        trace: [...req.trace, '6.Interceptor(Post)'],
      })),
    );
  }
}
`,
              },
              {
                name: 'booking-trace.module.ts',
                code: `import { Module } from '@nestjs/common';
import { BookingTraceController } from './booking-trace.controller';
import { KampusTraceMiddleware } from './kampus-trace.middleware';
import { KampusAccessGuard } from './kampus-access.guard';
import { KampusAuditInterceptor } from './kampus-audit.interceptor';

@Module({
  controllers: [BookingTraceController],
  providers: [KampusTraceMiddleware, KampusAccessGuard, KampusAuditInterceptor],
})
export class BookingTraceModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'booking-trace.controller.ts',
                code: `import {
  Controller, Get, Query, Req, UseGuards, UseInterceptors, ParseIntPipe
} from '@nestjs/common';
import { KampusAccessGuard } from './kampus-access.guard';
import { KampusAuditInterceptor } from './kampus-audit.interceptor';

@Controller('booking-trace')
@UseGuards(KampusAccessGuard)
@UseInterceptors(KampusAuditInterceptor)
export class BookingTraceController {
  @Get()
  simulate(@Query('rooms', ParseIntPipe) rooms: number, @Req() req: any) {
    req.trace.push('5.Handler');
    return { totalRent: rooms * 180 };
  }
}
`,
              },
              {
                name: 'kampus-trace.middleware.ts',
                code: `import { Injectable } from '@nestjs/common';

@Injectable()
export class KampusTraceMiddleware {
  use(req: any, _res: any, next: () => void) {
    req.trace = ['1.Middleware'];
    next();
  }
}
`,
              },
              {
                name: 'kampus-access.guard.ts',
                code: `import { Injectable } from '@nestjs/common';

@Injectable()
export class KampusAccessGuard {
  canActivate(ctx: any) {
    ctx.switchToHttp().getRequest().trace.push('2.Guard');
    return true;
  }
}
`,
              },
              {
                name: 'kampus-audit.interceptor.ts',
                code: `import { Injectable } from '@nestjs/common';
import { map } from 'rxjs/operators';

@Injectable()
export class KampusAuditInterceptor {
  intercept(ctx: any, next: any) {
    const req = ctx.switchToHttp().getRequest();
    req.trace.push('3.Interceptor(Pre)');
    return next.handle().pipe(
      map((data: any) => ({
        ...data,
        trace: [...req.trace, '6.Interceptor(Post)'],
      })),
    );
  }
}
`,
              },
              {
                name: 'booking-trace.module.ts',
                code: `import { Module } from '@nestjs/common';
import { BookingTraceController } from './booking-trace.controller';
import { KampusTraceMiddleware } from './kampus-trace.middleware';
import { KampusAccessGuard } from './kampus-access.guard';
import { KampusAuditInterceptor } from './kampus-audit.interceptor';

@Module({
  controllers: [BookingTraceController],
  providers: [KampusTraceMiddleware, KampusAccessGuard, KampusAuditInterceptor],
})
export class BookingTraceModule {}
`,
              },
            ],
            tests: [
              {
                name: 'GET /booking-trace?rooms=2 records full Kampus onion trace and returns totalRent=360',
                request: { method: 'GET', url: '/booking-trace?rooms=2', headers: {} },
                check: (res) =>
                  res.status === 200 &&
                  res.body?.totalRent === 360 &&
                  Array.isArray(res.body?.trace) &&
                  res.body.trace.join('->') ===
                    '1.Middleware->2.Guard->3.Interceptor(Pre)->5.Handler->6.Interceptor(Post)'
                    ? { pass: true }
                    : { pass: false, reason: `Unexpected response: ${JSON.stringify(res.body)}` },
              },
            ],
          },
        },
      ],
    },

    // =========================================================================
    // MODULE 2: KAMPUS INPUT HYGIENE — PIPES, TRANSFORMATION & DTO VALIDATION
    // =========================================================================
    {
      id: 'mod-pipes',
      number: '02',
      title: 'Kampus Input Hygiene: Pipes & DTOs',
      icon: 'filter',
      description: 'Parse hostel search filters with built-in pipes, build custom HostelSlug & CSV pipes, and validate landlord listing DTOs.',
      subconcepts: [
        {
          id: 'pipes-builtin',
          code: '2.1',
          title: 'Built-in Pipes for Hostel Search Filters',
          difficulty: 'Beginner',
          summary: 'Use ParseIntPipe, ParseBoolPipe, and DefaultValuePipe so URL strings become typed numbers and booleans.',
          theory: `
            <h4>🏠 Story Context: Filtering Hostels on the Kampus Map</h4>
            <p>When Adaobi filters hostels with <code>GET /hostel-search/1?verifiedOnly=true</code>, both <code>"1"</code> and <code>"true"</code> arrive over HTTP as strings. Built-in pipes coerce and validate them before the controller runs:</p>
            <ul>
              <li><code>ParseIntPipe</code> converts <code>"1"</code> &rarr; <code>1</code> or rejects <code>"abc"</code> with <code>400 Bad Request</code>.</li>
              <li><code>ParseBoolPipe</code> converts <code>"true"</code>/<code>"false"</code> &rarr; boolean.</li>
              <li><code>DefaultValuePipe(defaultVal)</code> supplies a fallback when a query param is omitted.</li>
            </ul>
          `,
          exampleFiles: [
            {
              name: 'hostel-search.controller.ts',
              code: `import {
  Controller, Get, Param, Query,
  ParseIntPipe, ParseBoolPipe, DefaultValuePipe, NotFoundException
} from '@nestjs/common';
import { DatabaseService } from './database.service';

@Controller('hostel-search')
export class HostelSearchController {
  constructor(private readonly db: DatabaseService) {}

  @Get(':id')
  inspectRoom(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeUnverified', new DefaultValuePipe(false), ParseBoolPipe) includeUnverified: boolean,
  ) {
    const listing = this.db.findListingById(id);
    if (!listing || (!includeUnverified && !listing.verified)) {
      throw new NotFoundException(\`Verified hostel #\${id} not found\`);
    }
    return {
      id,
      typeofId: typeof id,
      includeUnverified,
      listing,
    };
  }
}
`,
            },
            SHARED_DATABASE_SERVICE_FILE,
            {
              name: 'hostel-search.module.ts',
              code: `import { Module } from '@nestjs/common';
import { HostelSearchController } from './hostel-search.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [HostelSearchController],
  providers: [DatabaseService],
})
export class HostelSearchModule {}
`,
            },
          ],
          presets: [
            {
              label: 'GET /hostel-search/1 (Verified Hostel #1 -> 200)',
              method: 'GET',
              url: '/hostel-search/1',
              headers: {},
              body: '',
            },
            {
              label: 'GET /hostel-search/3?includeUnverified=true (200)',
              method: 'GET',
              url: '/hostel-search/3?includeUnverified=true',
              headers: {},
              body: '',
            },
            {
              label: 'Invalid ID: GET /hostel-search/room-one (400)',
              method: 'GET',
              url: '/hostel-search/room-one',
              headers: {},
              body: '',
            },
          ],
          exercise: {
            title: 'Chain DefaultValuePipe and ParseIntPipe for Hostel Pagination',
            prompt: `Implement <code>GET /hostel-directory</code> in <code>hostel-directory.controller.ts</code> so that <code>page</code> defaults to <code>1</code> and <code>limit</code> defaults to <code>10</code>, both coerced to integers with <code>ParseIntPipe</code>. Return <code>{ page, limit, offset: (page - 1) * limit }</code>.`,
            hints: [
              'Decorate `page` with `@Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number`.',
              'Decorate `limit` with `@Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number`.',
            ],
            starterFiles: [
              {
                name: 'hostel-directory.controller.ts',
                code: `import { Controller, Get, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { PaginationResultDto } from './pagination-query.dto';

@Controller('hostel-directory')
export class HostelDirectoryController {
  @Get()
  list(
    // TODO: Chain DefaultValuePipe(1) + ParseIntPipe for 'page', and DefaultValuePipe(10) + ParseIntPipe for 'limit'
    @Query('page') page: number,
    @Query('limit') limit: number,
  ): PaginationResultDto {
    return {
      page,
      limit,
      offset: (page - 1) * limit,
    };
  }
}
`,
              },
              {
                name: 'pagination-query.dto.ts',
                code: `export interface PaginationResultDto {
  page: number;
  limit: number;
  offset: number;
}
`,
              },
              {
                name: 'hostel-directory.module.ts',
                code: `import { Module } from '@nestjs/common';
import { HostelDirectoryController } from './hostel-directory.controller';

@Module({
  controllers: [HostelDirectoryController],
})
export class HostelDirectoryModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'hostel-directory.controller.ts',
                code: `import { Controller, Get, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { PaginationResultDto } from './pagination-query.dto';

@Controller('hostel-directory')
export class HostelDirectoryController {
  @Get()
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): PaginationResultDto {
    return {
      page,
      limit,
      offset: (page - 1) * limit,
    };
  }
}
`,
              },
              {
                name: 'pagination-query.dto.ts',
                code: `export interface PaginationResultDto {
  page: number;
  limit: number;
  offset: number;
}
`,
              },
              {
                name: 'hostel-directory.module.ts',
                code: `import { Module } from '@nestjs/common';
import { HostelDirectoryController } from './hostel-directory.controller';

@Module({
  controllers: [HostelDirectoryController],
})
export class HostelDirectoryModule {}
`,
              },
            ],
            tests: [
              {
                name: 'GET /hostel-directory uses defaults page=1, limit=10, offset=0',
                request: { method: 'GET', url: '/hostel-directory', headers: {} },
                check: (res) =>
                  res.status === 200 &&
                  res.body?.page === 1 &&
                  res.body?.limit === 10 &&
                  res.body?.offset === 0
                    ? { pass: true }
                    : { pass: false, reason: `Expected { page: 1, limit: 10, offset: 0 }, got ${JSON.stringify(res.body)}` },
              },
              {
                name: 'GET /hostel-directory?page=3&limit=20 computes offset=40',
                request: { method: 'GET', url: '/hostel-directory?page=3&limit=20', headers: {} },
                check: (res) =>
                  res.status === 200 &&
                  res.body?.page === 3 &&
                  res.body?.limit === 20 &&
                  res.body?.offset === 40
                    ? { pass: true }
                    : { pass: false, reason: `Expected offset=40, got ${JSON.stringify(res.body)}` },
              },
              {
                name: 'GET /hostel-directory?page=abc rejects with 400 Bad Request',
                request: { method: 'GET', url: '/hostel-directory?page=abc', headers: {} },
                check: (res) =>
                  res.status === 400
                    ? { pass: true }
                    : { pass: false, reason: `Expected 400 Bad Request, got ${res.status}` },
              },
            ],
          },
        },

        {
          id: 'pipes-custom',
          code: '2.2',
          title: 'Custom Pipes: Side-by-Side Hostel Comparison & URL Slugs',
          difficulty: 'Intermediate',
          summary: 'Build custom PipeTransform classes to parse comma-separated hostel IDs (?ids=1,2) and generate clean property URL slugs.',
          theory: `
            <h4>🏠 Story Context: Comparing Up to 3 Hostels Side-by-Side</h4>
            <p>Students on Kampus love comparing up to 3 hostels side-by-side via <code>GET /compare-hostels?ids=1,2</code>. NestJS doesn't have a built-in CSV pipe, so we write <code>ParseCsvPipe</code> implementing <code>PipeTransform</code>!</p>
          `,
          exampleFiles: [
            {
              name: 'parse-csv.pipe.ts',
              code: `import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseCsvPipe {
  constructor(private readonly options: { numeric?: boolean; maxItems?: number } = {}) {}

  transform(value: string | undefined, metadata: { data?: string }) {
    if (!value) return [];
    const items = String(value)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (this.options.maxItems && items.length > this.options.maxItems) {
      throw new BadRequestException(
        \`You can compare at most \${this.options.maxItems} Kampus hostels at once\`,
      );
    }

    if (!this.options.numeric) return items;

    return items.map((part) => {
      const num = Number(part);
      if (!Number.isFinite(num)) {
        throw new BadRequestException(\`"\${part}" in "\${metadata.data}" is not a valid hostel ID\`);
      }
      return num;
    });
  }
}
`,
            },
            {
              name: 'compare-hostels.controller.ts',
              code: `import { Controller, Get, Query } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { ParseCsvPipe } from './parse-csv.pipe';

@Controller('compare-hostels')
export class CompareHostelsController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  compare(@Query('ids', new ParseCsvPipe({ numeric: true, maxItems: 3 })) ids: number[]) {
    const listings = ids.map((id) => this.db.findListingById(id)).filter(Boolean);
    return { comparedCount: listings.length, ids, listings };
  }
}
`,
            },
            SHARED_DATABASE_SERVICE_FILE,
            {
              name: 'compare-hostels.module.ts',
              code: `import { Module } from '@nestjs/common';
import { CompareHostelsController } from './compare-hostels.controller';
import { ParseCsvPipe } from './parse-csv.pipe';
import { DatabaseService } from './database.service';

@Module({
  controllers: [CompareHostelsController],
  providers: [ParseCsvPipe, DatabaseService],
})
export class CompareHostelsModule {}
`,
            },
          ],
          presets: [
            {
              label: 'Compare Hostels 1 & 2: GET /compare-hostels?ids=1,2',
              method: 'GET',
              url: '/compare-hostels?ids=1,2',
              headers: {},
              body: '',
            },
            {
              label: 'Exceeds Max 3 Hostels: GET /compare-hostels?ids=1,2,3,4 (400)',
              method: 'GET',
              url: '/compare-hostels?ids=1,2,3,4',
              headers: {},
              body: '',
            },
          ],
          exercise: {
            title: 'Build a HostelSlugPipe for SEO Property URLs',
            prompt: `When Landlord Chidi creates a hostel like <code>"  Cedar Court North Gate  "</code>, Kampus generates a clean URL slug (<code>"cedar-court-north-gate"</code>). In <code>hostel-slug.pipe.ts</code> (used by <code>hostel-slugs.controller.ts</code>), implement <code>HostelSlugPipe</code> so it:
              <ol>
                <li>Trims whitespace, lowercases the string, and replaces spaces (<code>/\\s+/g</code>) with <code>'-'</code>.</li>
                <li>Throws <code>BadRequestException</code> if the resulting slug is shorter than 3 characters.</li>
              </ol>`,
            hints: [
              'Use `const slug = String(value ?? "").trim().toLowerCase().replace(/\\s+/g, "-")`.',
              'If `slug.length < 3`, throw `new BadRequestException("Hostel name too short")`.',
            ],
            starterFiles: [
              {
                name: 'hostel-slug.pipe.ts',
                code: `import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class HostelSlugPipe {
  transform(value: unknown) {
    // TODO: Normalize into trimmed lowercase hyphenated slug, throw BadRequestException if length < 3
    return value;
  }
}
`,
              },
              {
                name: 'hostel-slugs.controller.ts',
                code: `import { Controller, Post, Body } from '@nestjs/common';
import { HostelSlugPipe } from './hostel-slug.pipe';

@Controller('hostel-slugs')
export class HostelSlugsController {
  @Post()
  generate(@Body('title', HostelSlugPipe) slug: string) {
    return { slug, publicUrl: \`https://kampus.edu/hostels/\${slug}\` };
  }
}
`,
              },
              {
                name: 'generate-slug.dto.ts',
                code: `export class GenerateSlugDto {
  title: string;
}
`,
              },
              {
                name: 'hostel-slugs.module.ts',
                code: `import { Module } from '@nestjs/common';
import { HostelSlugsController } from './hostel-slugs.controller';
import { HostelSlugPipe } from './hostel-slug.pipe';

@Module({
  controllers: [HostelSlugsController],
  providers: [HostelSlugPipe],
})
export class HostelSlugsModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'hostel-slug.pipe.ts',
                code: `import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class HostelSlugPipe {
  transform(value: unknown) {
    const slug = String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/\\s+/g, '-');
    if (slug.length < 3) {
      throw new BadRequestException('Hostel slug must be at least 3 characters');
    }
    return slug;
  }
}
`,
              },
              {
                name: 'hostel-slugs.controller.ts',
                code: `import { Controller, Post, Body } from '@nestjs/common';
import { HostelSlugPipe } from './hostel-slug.pipe';

@Controller('hostel-slugs')
export class HostelSlugsController {
  @Post()
  generate(@Body('title', HostelSlugPipe) slug: string) {
    return { slug, publicUrl: \`https://kampus.edu/hostels/\${slug}\` };
  }
}
`,
              },
              {
                name: 'generate-slug.dto.ts',
                code: `export class GenerateSlugDto {
  title: string;
}
`,
              },
              {
                name: 'hostel-slugs.module.ts',
                code: `import { Module } from '@nestjs/common';
import { HostelSlugsController } from './hostel-slugs.controller';
import { HostelSlugPipe } from './hostel-slug.pipe';

@Module({
  controllers: [HostelSlugsController],
  providers: [HostelSlugPipe],
})
export class HostelSlugsModule {}
`,
              },
            ],
            tests: [
              {
                name: 'Normalizes "  Cedar Court North Gate  " into "cedar-court-north-gate"',
                request: {
                  method: 'POST',
                  url: '/hostel-slugs',
                  headers: {},
                  body: { title: '  Cedar Court North Gate  ' },
                },
                check: (res) =>
                  res.status === 201 && res.body?.slug === 'cedar-court-north-gate'
                    ? { pass: true }
                    : { pass: false, reason: `Expected slug "cedar-court-north-gate", got ${JSON.stringify(res.body)}` },
              },
              {
                name: 'Rejects 2-letter hostel title "AB" with 400 BadRequestException',
                request: {
                  method: 'POST',
                  url: '/hostel-slugs',
                  headers: {},
                  body: { title: 'AB' },
                },
                check: (res) =>
                  res.status === 400
                    ? { pass: true }
                    : { pass: false, reason: `Expected 400 Bad Request, got ${res.status}` },
              },
            ],
          },
        },

        {
          id: 'pipes-validation-dto',
          code: '2.3',
          title: 'DTO Validation & Blocking Mass-Assignment on Kampus',
          difficulty: 'Intermediate',
          summary: 'Validate hostel listings and student signups with class-validator and block attackers from injecting { verified: true } or { role: "admin" }.',
          theory: `
            <h4>🏠 Story Context: Stopping Fake "Verified" Hostels</h4>
            <p>Suppose an unverified landlord sends <code>POST /listings</code> with <code>{ "title": "Scam Lodge", "verified": true }</code>, or a student sends <code>{ "role": "admin" }</code> during signup. If you pass raw <code>@Body()</code> straight into the database, that's a <strong>Mass-Assignment Vulnerability</strong>!</p>
            <p>Combining a DTO class with <code>new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })</code> rejects any undeclared property with <code>400 Bad Request</code>.</p>
          `,
          exampleFiles: [
            {
              name: 'student-signup.dto.ts',
              code: `import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsIn } from 'class-validator';

export class StudentSignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsIn(['North Gate', 'South Gate', 'Tech Valley'])
  preferredZone?: string = 'North Gate';
}
`,
            },
            {
              name: 'student-onboarding.controller.ts',
              code: `import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { StudentSignupDto } from './student-signup.dto';

@Controller('onboarding')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class StudentOnboardingController {
  @Post('student')
  register(@Body() dto: StudentSignupDto) {
    return {
      enrolled: true,
      student: dto,
    };
  }
}
`,
            },
            {
              name: 'student-onboarding.module.ts',
              code: `import { Module } from '@nestjs/common';
import { StudentOnboardingController } from './student-onboarding.controller';

@Module({
  controllers: [StudentOnboardingController],
})
export class StudentOnboardingModule {}
`,
            },
          ],
          presets: [
            {
              label: 'Valid Student Onboarding (201)',
              method: 'POST',
              url: '/onboarding/student',
              headers: {},
              body: JSON.stringify(
                { email: 'kemi@kampus.edu', name: 'Kemi Adeyemi', preferredZone: 'South Gate' },
                null,
                2,
              ),
            },
            {
              label: 'Invalid Email & Zone (400)',
              method: 'POST',
              url: '/onboarding/student',
              headers: {},
              body: JSON.stringify(
                { email: 'bad-email', name: 'K', preferredZone: 'Mars' },
                null,
                2,
              ),
            },
            {
              label: 'Mass-Assignment Attack: { role: "admin" } (400)',
              method: 'POST',
              url: '/onboarding/student',
              headers: {},
              body: JSON.stringify(
                { email: 'intruder@kampus.edu', name: 'Intruder', role: 'admin' },
                null,
                2,
              ),
            },
          ],
          exercise: {
            title: 'Validate CreateHostelListingDto for Kampus Landlords',
            prompt: `In <code>create-hostel-listing.dto.ts</code> (imported by <code>hostel-listings.controller.ts</code>), decorate <code>CreateHostelListingDto</code> with <code>class-validator</code> rules so that:
              <ol>
                <li><code>title</code> is a string (<code>@IsString()</code>) with <code>@MinLength(4)</code>.</li>
                <li><code>rentPerYear</code> is a number (<code>@IsNumber()</code>) between <code>@Min(50)</code> and <code>@Max(5000)</code>.</li>
                <li><code>campusZone</code> must be one of <code>['North Gate', 'South Gate', 'Tech Valley']</code> using <code>@IsIn(...)</code>.</li>
              </ol>`,
            hints: [
              'Decorate `title` with `@IsString()` and `@MinLength(4)`.',
              'Decorate `rentPerYear` with `@IsNumber()`, `@Min(50)`, `@Max(5000)`.',
              'Decorate `campusZone` with `@IsIn(["North Gate", "South Gate", "Tech Valley"])`.',
            ],
            starterFiles: [
              {
                name: 'create-hostel-listing.dto.ts',
                code: `import { IsString, MinLength, IsNumber, Min, Max, IsIn } from 'class-validator';

export class CreateHostelListingDto {
  // TODO 1: Validate title (string, min length 4)
  title: string;

  // TODO 2: Validate rentPerYear (number, min 50, max 5000)
  rentPerYear: number;

  // TODO 3: Validate campusZone is in ['North Gate', 'South Gate', 'Tech Valley']
  campusZone: string;
}
`,
              },
              {
                name: 'hostel-listings.controller.ts',
                code: `import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreateHostelListingDto } from './create-hostel-listing.dto';

@Controller('hostel-listings')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class HostelListingsController {
  @Post()
  create(@Body() dto: CreateHostelListingDto) {
    return { published: true, listing: dto };
  }
}
`,
              },
              {
                name: 'hostel-listings.module.ts',
                code: `import { Module } from '@nestjs/common';
import { HostelListingsController } from './hostel-listings.controller';

@Module({
  controllers: [HostelListingsController],
})
export class HostelListingsModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'create-hostel-listing.dto.ts',
                code: `import { IsString, MinLength, IsNumber, Min, Max, IsIn } from 'class-validator';

export class CreateHostelListingDto {
  @IsString()
  @MinLength(4)
  title: string;

  @IsNumber()
  @Min(50)
  @Max(5000)
  rentPerYear: number;

  @IsIn(['North Gate', 'South Gate', 'Tech Valley'])
  campusZone: string;
}
`,
              },
              {
                name: 'hostel-listings.controller.ts',
                code: `import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreateHostelListingDto } from './create-hostel-listing.dto';

@Controller('hostel-listings')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class HostelListingsController {
  @Post()
  create(@Body() dto: CreateHostelListingDto) {
    return { published: true, listing: dto };
  }
}
`,
              },
              {
                name: 'hostel-listings.module.ts',
                code: `import { Module } from '@nestjs/common';
import { HostelListingsController } from './hostel-listings.controller';

@Module({
  controllers: [HostelListingsController],
})
export class HostelListingsModule {}
`,
              },
            ],
            tests: [
              {
                name: 'Accepts valid Kampus hostel listing DTO (201)',
                request: {
                  method: 'POST',
                  url: '/hostel-listings',
                  headers: {},
                  body: { title: 'Oakwood Student Lodge', rentPerYear: 220, campusZone: 'North Gate' },
                },
                check: (res) =>
                  res.status === 201 && res.body?.published === true
                    ? { pass: true }
                    : { pass: false, reason: `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}` },
              },
              {
                name: 'Rejects rent below $50 and invalid campusZone (400)',
                request: {
                  method: 'POST',
                  url: '/hostel-listings',
                  headers: {},
                  body: { title: 'Oakwood Student Lodge', rentPerYear: 10, campusZone: 'Offshore' },
                },
                check: (res) =>
                  res.status === 400 && Array.isArray(res.body?.message) && res.body.message.length >= 2
                    ? { pass: true }
                    : { pass: false, reason: `Expected 400 with validation errors, got ${JSON.stringify(res.body)}` },
              },
            ],
          },
        },
      ],
    },

    // =========================================================================
    // MODULE 3: KAMPUS ACCESS CONTROL — GUARDS, API KEYS, RBAC & OWNERSHIP
    // =========================================================================
    {
      id: 'mod-guards',
      number: '03',
      title: 'Kampus Access Control: Guards & RBAC',
      icon: 'shield',
      description: 'Protect payment partner webhooks, enforce @Public() secure-by-default routes, restrict landlord/admin actions, and verify hostel ownership.',
      subconcepts: [
        {
          id: 'guards-apikey',
          code: '3.1',
          title: 'Payment Partner API Key Guard (timingSafeEqual)',
          difficulty: 'Beginner',
          summary: 'Use CanActivate and timingSafeEqual to authenticate payment gateway escrow webhooks.',
          theory: `
            <h4>🏠 Story Context: Securing Kampus Rent Escrow Webhooks</h4>
            <p>When Adaobi pays her hostel rent via Kampus's payment gateway partner, the gateway calls <code>POST /webhooks/escrow-settled</code> with an <code>x-api-key</code> header. A <strong>Guard</strong> (<code>CanActivate</code>) verifies that secret before the controller releases any hostel room.</p>
            <p>Always compare secrets using <code>timingSafeEqual</code> from <code>crypto</code> so attackers cannot guess the key byte-by-byte using response timing differences.</p>
          `,
          exampleFiles: [
            {
              name: 'partner-key.guard.ts',
              code: `import { Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { PARTNER_WEBHOOK_CONFIG } from './partner-webhook.config';

@Injectable()
export class PartnerKeyGuard {
  private readonly expectedKey = PARTNER_WEBHOOK_CONFIG.expectedApiKey;

  canActivate(context: any): boolean {
    const req = context.switchToHttp().getRequest();
    const provided = req.headers['x-api-key'];

    if (!provided || !timingSafeEqual(provided, this.expectedKey)) {
      throw new UnauthorizedException('Invalid or missing Kampus partner x-api-key');
    }
    return true;
  }
}
`,
            },
            {
              name: 'escrow-webhooks.controller.ts',
              code: `import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { PartnerKeyGuard } from './partner-key.guard';
import { EscrowSettlementDto } from './escrow-settlement.dto';

@Controller('webhooks')
@UseGuards(PartnerKeyGuard)
export class EscrowWebhooksController {
  @Post('escrow-settled')
  handleSettlement(@Body() event: EscrowSettlementDto) {
    return { settled: true, bookingId: event.bookingId, amount: event.amount };
  }
}
`,
            },
            {
              name: 'escrow-settlement.dto.ts',
              code: `export class EscrowSettlementDto {
  bookingId: string;
  amount: number;
}
`,
            },
            {
              name: 'partner-webhook.config.ts',
              code: `export const PARTNER_WEBHOOK_CONFIG = {
  expectedApiKey: 'kampus-partner-key',
  headerName: 'x-api-key',
};
`,
            },
            {
              name: 'escrow-webhooks.module.ts',
              code: `import { Module } from '@nestjs/common';
import { EscrowWebhooksController } from './escrow-webhooks.controller';
import { PartnerKeyGuard } from './partner-key.guard';

@Module({
  controllers: [EscrowWebhooksController],
  providers: [PartnerKeyGuard],
})
export class EscrowWebhooksModule {}
`,
            },
          ],
          presets: [
            {
              label: 'Missing x-api-key Header -> 401',
              method: 'POST',
              url: '/webhooks/escrow-settled',
              headers: {},
              body: JSON.stringify({ bookingId: 'bk-101', amount: 180 }, null, 2),
            },
            {
              label: 'Valid x-api-key (kampus-partner-key) -> 201',
              method: 'POST',
              url: '/webhooks/escrow-settled',
              headers: { 'x-api-key': 'kampus-partner-key' },
              body: JSON.stringify({ bookingId: 'bk-101', amount: 180 }, null, 2),
            },
          ],
          exercise: {
            title: 'Build a University Matric Registry Guard',
            prompt: `Kampus syncs student enrollment records with partner universities via <code>GET /registry/verify-matric</code> (in <code>registry.controller.ts</code>). Implement <code>UniversityRegistryGuard</code> in <code>university-registry.guard.ts</code> so it allows the request ONLY when:
              <ol>
                <li><code>req.headers['x-api-key'] === 'uni-registry-secret'</code> (else throw <code>UnauthorizedException</code>), AND</li>
                <li><code>req.headers['x-university-code']</code> is present (else throw <code>ForbiddenException('Missing x-university-code')</code>).</li>
              </ol>`,
            hints: [
              'If `req.headers["x-api-key"] !== "uni-registry-secret"`, throw `new UnauthorizedException()`.',
              'If `!req.headers["x-university-code"]`, throw `new ForbiddenException("Missing x-university-code")`.',
            ],
            starterFiles: [
              {
                name: 'university-registry.guard.ts',
                code: `import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { REGISTRY_CONFIG } from './registry.config';

@Injectable()
export class UniversityRegistryGuard {
  canActivate(context: any): boolean {
    const req = context.switchToHttp().getRequest();
    // TODO 1: Check req.headers['x-api-key'] === 'uni-registry-secret' (or REGISTRY_CONFIG.expectedApiKey), else throw UnauthorizedException
    // TODO 2: Check req.headers['x-university-code'] is present, else throw ForbiddenException
    return false;
  }
}
`,
              },
              {
                name: 'registry.controller.ts',
                code: `import { Controller, Get, UseGuards } from '@nestjs/common';
import { UniversityRegistryGuard } from './university-registry.guard';

@Controller('registry')
@UseGuards(UniversityRegistryGuard)
export class RegistryController {
  @Get('verify-matric')
  verify() {
    return { enrolled: true, department: 'Computer Science' };
  }
}
`,
              },
              {
                name: 'registry.config.ts',
                code: `export const REGISTRY_CONFIG = {
  expectedApiKey: 'uni-registry-secret',
  requiredHeader: 'x-university-code',
};
`,
              },
              {
                name: 'registry.module.ts',
                code: `import { Module } from '@nestjs/common';
import { RegistryController } from './registry.controller';
import { UniversityRegistryGuard } from './university-registry.guard';

@Module({
  controllers: [RegistryController],
  providers: [UniversityRegistryGuard],
})
export class RegistryModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'university-registry.guard.ts',
                code: `import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { REGISTRY_CONFIG } from './registry.config';

@Injectable()
export class UniversityRegistryGuard {
  canActivate(context: any): boolean {
    const req = context.switchToHttp().getRequest();
    if (req.headers['x-api-key'] !== REGISTRY_CONFIG.expectedApiKey) {
      throw new UnauthorizedException('Invalid registry API key');
    }
    if (!req.headers['x-university-code']) {
      throw new ForbiddenException('Missing x-university-code');
    }
    return true;
  }
}
`,
              },
              {
                name: 'registry.controller.ts',
                code: `import { Controller, Get, UseGuards } from '@nestjs/common';
import { UniversityRegistryGuard } from './university-registry.guard';

@Controller('registry')
@UseGuards(UniversityRegistryGuard)
export class RegistryController {
  @Get('verify-matric')
  verify() {
    return { enrolled: true, department: 'Computer Science' };
  }
}
`,
              },
              {
                name: 'registry.config.ts',
                code: `export const REGISTRY_CONFIG = {
  expectedApiKey: 'uni-registry-secret',
  requiredHeader: 'x-university-code',
};
`,
              },
              {
                name: 'registry.module.ts',
                code: `import { Module } from '@nestjs/common';
import { RegistryController } from './registry.controller';
import { UniversityRegistryGuard } from './university-registry.guard';

@Module({
  controllers: [RegistryController],
  providers: [UniversityRegistryGuard],
})
export class RegistryModule {}
`,
              },
            ],
            tests: [
              {
                name: 'Rejects missing x-api-key with 401 Unauthorized',
                request: { method: 'GET', url: '/registry/verify-matric', headers: {} },
                check: (res) =>
                  res.status === 401
                    ? { pass: true }
                    : { pass: false, reason: `Expected 401, got ${res.status}` },
              },
              {
                name: 'Rejects valid x-api-key without x-university-code with 403 Forbidden',
                request: {
                  method: 'GET',
                  url: '/registry/verify-matric',
                  headers: { 'x-api-key': 'uni-registry-secret' },
                },
                check: (res) =>
                  res.status === 403
                    ? { pass: true }
                    : { pass: false, reason: `Expected 403, got ${res.status}` },
              },
              {
                name: 'Allows request when both x-api-key and x-university-code are provided (200)',
                request: {
                  method: 'GET',
                  url: '/registry/verify-matric',
                  headers: { 'x-api-key': 'uni-registry-secret', 'x-university-code': 'UNILAG' },
                },
                check: (res) =>
                  res.status === 200 && res.body?.enrolled === true
                    ? { pass: true }
                    : { pass: false, reason: `Expected 200, got ${res.status}` },
              },
            ],
          },
        },

        {
          id: 'guards-reflector-public',
          code: '3.2',
          title: 'Secure-by-Default Kampus API (@Public & Reflector)',
          difficulty: 'Intermediate',
          summary: 'Lock down all Kampus endpoints globally with JwtAuthGuard and use @Public() metadata to open the public hostel browse feed.',
          theory: `
            <h4>🏠 Story Context: Public Hostel Browsing vs Private Escrow Routes</h4>
            <p>On Kampus, prospective students should be able to browse <code>GET /kampus/public-hostels</code> without logging in, but every booking, wallet, and landlord route must require a valid JWT. By registering <code>JwtAuthGuard</code> globally via <code>APP_GUARD</code> and reading <code>@Public()</code> metadata with <code>Reflector</code>, a developer who forgets a decorator fails <em>closed</em> (401) instead of leaking private student data.</p>
          `,
          exampleFiles: [
            {
              name: 'jwt-auth.guard.ts',
              code: `import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  canActivate(context: any): boolean {
    const isPublic = this.reflector.getAllAndOverride(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const auth = req.headers['authorization'] || '';
    if (!auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('Kampus login required (Missing Bearer token)');
    }
    req.user = this.jwt.verify(auth.slice(7));
    return true;
  }
}
`,
            },
            {
              name: 'public.decorator.ts',
              code: `import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
`,
            },
            {
              name: 'kampus-browse.controller.ts',
              code: `import { Controller, Get, Req } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { Public } from './public.decorator';

@Controller('kampus')
export class KampusBrowseController {
  constructor(private readonly db: DatabaseService) {}

  @Public()
  @Get('public-hostels')
  publicHostels() {
    return {
      visibility: 'public',
      hostels: this.db.findListings({ verified: true }),
    };
  }

  @Get('my-escrow-bookings')
  myBookings(@Req() req: any) {
    return {
      student: req.user.email,
      bookings: this.db.bookings,
    };
  }
}
`,
            },
            SHARED_DATABASE_SERVICE_FILE,
            {
              name: 'kampus-app.module.ts',
              code: `import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { KampusBrowseController } from './kampus-browse.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { DatabaseService } from './database.service';

@Module({
  controllers: [KampusBrowseController],
  providers: [
    DatabaseService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class KampusAppModule {}
`,
            },
          ],
          presets: [
            {
              label: 'Guest Student: GET /kampus/public-hostels (200)',
              method: 'GET',
              url: '/kampus/public-hostels',
              headers: {},
              body: '',
            },
            {
              label: 'Guest Student: GET /kampus/my-escrow-bookings (401)',
              method: 'GET',
              url: '/kampus/my-escrow-bookings',
              headers: {},
              body: '',
            },
            {
              label: 'Adaobi (Logged-In Student): GET /kampus/my-escrow-bookings (200)',
              method: 'GET',
              url: '/kampus/my-escrow-bookings',
              headers: { Authorization: 'Bearer demo-student-jwt' },
              body: '',
            },
          ],
          exercise: {
            title: 'Build a @CampusFeature() Rollout Guard for 3D Hostel Tours',
            prompt: `Kampus is rolling out <code>'virtual-3d-tour'</code> while keeping <code>'drone-key-delivery'</code> disabled. In <code>campus-feature.guard.ts</code> (used by <code>tours.controller.ts</code> with <code>campus-feature.decorator.ts</code>), implement <code>CampusFeatureGuard</code> using <code>this.reflector.getAllAndOverride(CAMPUS_FEATURE_KEY, ...)</code> so that if a route's feature flag is not in <code>this.enabledFeatures</code> (<code>['virtual-3d-tour']</code>), it throws <code>NotFoundException('Kampus feature not enabled yet')</code>.`,
            hints: [
              'Read `const feature = this.reflector.getAllAndOverride(CAMPUS_FEATURE_KEY, [context.getHandler(), context.getClass()])`.',
              'If `feature && !this.enabledFeatures.includes(feature)` throw `new NotFoundException("Kampus feature not enabled yet")`.',
            ],
            starterFiles: [
              {
                name: 'campus-feature.guard.ts',
                code: `import { Injectable, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CAMPUS_FEATURE_KEY } from './campus-feature.decorator';

@Injectable()
export class CampusFeatureGuard {
  private readonly enabledFeatures = ['virtual-3d-tour'];

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: any): boolean {
    // TODO: Read CAMPUS_FEATURE_KEY via reflector. Throw NotFoundException if not in enabledFeatures
    return true;
  }
}
`,
              },
              {
                name: 'campus-feature.decorator.ts',
                code: `import { SetMetadata } from '@nestjs/common';

export const CAMPUS_FEATURE_KEY = 'campusFeature';
export const CampusFeature = (name: string) => SetMetadata(CAMPUS_FEATURE_KEY, name);
`,
              },
              {
                name: 'tours.controller.ts',
                code: `import { Controller, Get, UseGuards } from '@nestjs/common';
import { CampusFeatureGuard } from './campus-feature.guard';
import { CampusFeature } from './campus-feature.decorator';

@Controller('tours')
@UseGuards(CampusFeatureGuard)
export class ToursController {
  @Get('3d-walkthrough')
  @CampusFeature('virtual-3d-tour')
  walkthrough() {
    return { feature: 'virtual-3d-tour', hostel: 'Cedar Court Studio' };
  }

  @Get('drone-keys')
  @CampusFeature('drone-key-delivery')
  droneKeys() {
    return { feature: 'drone-key-delivery' };
  }
}
`,
              },
              {
                name: 'tours.module.ts',
                code: `import { Module } from '@nestjs/common';
import { ToursController } from './tours.controller';
import { CampusFeatureGuard } from './campus-feature.guard';

@Module({
  controllers: [ToursController],
  providers: [CampusFeatureGuard],
})
export class ToursModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'campus-feature.guard.ts',
                code: `import { Injectable, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CAMPUS_FEATURE_KEY } from './campus-feature.decorator';

@Injectable()
export class CampusFeatureGuard {
  private readonly enabledFeatures = ['virtual-3d-tour'];

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: any): boolean {
    const feature = this.reflector.getAllAndOverride(CAMPUS_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!feature) return true;
    if (!this.enabledFeatures.includes(feature)) {
      throw new NotFoundException(\`Kampus feature "\${feature}" is not enabled yet\`);
    }
    return true;
  }
}
`,
              },
              {
                name: 'campus-feature.decorator.ts',
                code: `import { SetMetadata } from '@nestjs/common';

export const CAMPUS_FEATURE_KEY = 'campusFeature';
export const CampusFeature = (name: string) => SetMetadata(CAMPUS_FEATURE_KEY, name);
`,
              },
              {
                name: 'tours.controller.ts',
                code: `import { Controller, Get, UseGuards } from '@nestjs/common';
import { CampusFeatureGuard } from './campus-feature.guard';
import { CampusFeature } from './campus-feature.decorator';

@Controller('tours')
@UseGuards(CampusFeatureGuard)
export class ToursController {
  @Get('3d-walkthrough')
  @CampusFeature('virtual-3d-tour')
  walkthrough() {
    return { feature: 'virtual-3d-tour', hostel: 'Cedar Court Studio' };
  }

  @Get('drone-keys')
  @CampusFeature('drone-key-delivery')
  droneKeys() {
    return { feature: 'drone-key-delivery' };
  }
}
`,
              },
              {
                name: 'tours.module.ts',
                code: `import { Module } from '@nestjs/common';
import { ToursController } from './tours.controller';
import { CampusFeatureGuard } from './campus-feature.guard';

@Module({
  controllers: [ToursController],
  providers: [CampusFeatureGuard],
})
export class ToursModule {}
`,
              },
            ],
            tests: [
              {
                name: 'GET /tours/3d-walkthrough (enabled feature) returns 200',
                request: { method: 'GET', url: '/tours/3d-walkthrough', headers: {} },
                check: (res) =>
                  res.status === 200 && res.body?.feature === 'virtual-3d-tour'
                    ? { pass: true }
                    : { pass: false, reason: `Expected 200, got ${res.status}` },
              },
              {
                name: 'GET /tours/drone-keys (disabled feature) throws 404 NotFoundException',
                request: { method: 'GET', url: '/tours/drone-keys', headers: {} },
                check: (res) =>
                  res.status === 404
                    ? { pass: true }
                    : { pass: false, reason: `Expected 404 NotFoundException, got ${res.status}` },
              },
            ],
          },
        },

        {
          id: 'guards-rbac',
          code: '3.3',
          title: 'Role-Based Access Control (Student vs Landlord vs Housing Officer)',
          difficulty: 'Intermediate',
          summary: 'Restrict hostel verification and landlord management routes using @Roles() and role hierarchy guards.',
          theory: `
            <h4>🏠 Story Context: Three Roles on Kampus</h4>
            <ul>
              <li><strong><code>student</code> (Adaobi):</strong> Can browse hostels, book inspections, and pay rent into escrow.</li>
              <li><strong><code>landlord</code> (Chidi):</strong> Can create hostel listings and manage room availability.</li>
              <li><strong><code>admin</code> (Grace — Kampus Housing Officer):</strong> Can physically verify hostels, approve landlords, and delist fraudulent properties.</li>
            </ul>
          `,
          exampleFiles: [
            {
              name: 'roles.guard.ts',
              code: `import { Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: any): boolean {
    const requiredRoles = this.reflector.getAllAndOverride(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (user && requiredRoles.includes(user.role)) {
      return true;
    }
    throw new ForbiddenException(
      \`Kampus access denied: requires role [\${requiredRoles.join(', ')}]\`,
    );
  }
}
`,
            },
            {
              name: 'roles.decorator.ts',
              code: `import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
`,
            },
            {
              name: 'verification.controller.ts',
              code: `import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { CurrentUser } from './current-user.decorator';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@Controller('verification')
@UseGuards(RolesGuard)
export class VerificationController {
  constructor(private readonly db: DatabaseService) {}

  @Get('landlord-portal')
  @Roles('landlord', 'admin')
  portal(@CurrentUser() actor: any) {
    return {
      welcome: actor.name,
      role: actor.role,
      myListings: this.db.findListings({ landlordId: actor.id }),
    };
  }

  @Patch('approve-hostel/:id')
  @Roles('admin')
  approveHostel(@Param('id') id: string) {
    return this.db.updateListing(Number(id), { verified: true, published: true });
  }
}
`,
            },
            SHARED_CURRENT_USER_FILE,
            SHARED_DATABASE_SERVICE_FILE,
            {
              name: 'verification.module.ts',
              code: `import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { RolesGuard } from './roles.guard';
import { DatabaseService } from './database.service';

@Module({
  controllers: [VerificationController],
  providers: [RolesGuard, DatabaseService],
})
export class VerificationModule {}
`,
            },
          ],
          presets: [
            {
              label: 'Student Adaobi -> GET /verification/landlord-portal (403)',
              method: 'GET',
              url: '/verification/landlord-portal',
              headers: { Authorization: 'Bearer demo-student-jwt' },
              body: '',
            },
            {
              label: 'Landlord Chidi -> GET /verification/landlord-portal (200)',
              method: 'GET',
              url: '/verification/landlord-portal',
              headers: { Authorization: 'Bearer demo-landlord-jwt' },
              body: '',
            },
            {
              label: 'Landlord Chidi tries PATCH /verification/approve-hostel/3 -> 403',
              method: 'PATCH',
              url: '/verification/approve-hostel/3',
              headers: { Authorization: 'Bearer demo-landlord-jwt' },
              body: '',
            },
            {
              label: 'Housing Officer Grace approves Hostel #3 -> 200',
              method: 'PATCH',
              url: '/verification/approve-hostel/3',
              headers: { Authorization: 'Bearer demo-admin-jwt' },
              body: '',
            },
          ],
          exercise: {
            title: 'Implement Kampus Role Hierarchy Guard (student < landlord < admin)',
            prompt: `On Kampus, roles follow a rank hierarchy: <code>student (1) &lt; landlord (2) &lt; admin (3)</code> (defined in <code>min-role.decorator.ts</code>). Implement <code>KampusMinRoleGuard</code> in <code>kampus-min-role.guard.ts</code> so any user whose role rank is <code>&gt;= RANK[minRole]</code> is allowed, and lower ranks throw <code>ForbiddenException</code>.`,
            hints: [
              'Lookup `const userRank = user ? (RANK[user.role] ?? 0) : 0;`.',
              'If `userRank >= RANK[minRole]` return `true`, otherwise throw `new ForbiddenException()`.',
            ],
            starterFiles: [
              {
                name: 'kampus-min-role.guard.ts',
                code: `import { Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MIN_ROLE_KEY, RANK } from './min-role.decorator';

@Injectable()
export class KampusMinRoleGuard {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: any): boolean {
    const minRole = this.reflector.getAllAndOverride(MIN_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!minRole) return true;

    const { user } = context.switchToHttp().getRequest();
    // TODO: Allow if user exists and RANK[user.role] >= RANK[minRole], else throw ForbiddenException
    return false;
  }
}
`,
              },
              {
                name: 'min-role.decorator.ts',
                code: `import { SetMetadata } from '@nestjs/common';

export const MIN_ROLE_KEY = 'minRole';
export const MinRole = (role: 'student' | 'landlord' | 'admin') => SetMetadata(MIN_ROLE_KEY, role);

export const RANK: Record<string, number> = {
  student: 1,
  user: 1,
  landlord: 2,
  moderator: 2,
  admin: 3,
};
`,
              },
              {
                name: 'inspections.controller.ts',
                code: `import { Controller, Get, UseGuards } from '@nestjs/common';
import { KampusMinRoleGuard } from './kampus-min-role.guard';
import { MinRole } from './min-role.decorator';

@Controller('inspections')
@UseGuards(KampusMinRoleGuard)
export class InspectionsController {
  @Get('schedule')
  @MinRole('landlord')
  schedule() {
    return { upcomingInspections: 4 };
  }
}
`,
              },
              {
                name: 'inspections.module.ts',
                code: `import { Module } from '@nestjs/common';
import { InspectionsController } from './inspections.controller';
import { KampusMinRoleGuard } from './kampus-min-role.guard';

@Module({
  controllers: [InspectionsController],
  providers: [KampusMinRoleGuard],
})
export class InspectionsModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'kampus-min-role.guard.ts',
                code: `import { Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MIN_ROLE_KEY, RANK } from './min-role.decorator';

@Injectable()
export class KampusMinRoleGuard {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: any): boolean {
    const minRole = this.reflector.getAllAndOverride(MIN_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!minRole) return true;

    const { user } = context.switchToHttp().getRequest();
    const userRank = user ? RANK[user.role] ?? 0 : 0;
    if (userRank >= RANK[minRole]) return true;
    throw new ForbiddenException(\`Requires at least Kampus role: \${minRole}\`);
  }
}
`,
              },
              {
                name: 'min-role.decorator.ts',
                code: `import { SetMetadata } from '@nestjs/common';

export const MIN_ROLE_KEY = 'minRole';
export const MinRole = (role: 'student' | 'landlord' | 'admin') => SetMetadata(MIN_ROLE_KEY, role);

export const RANK: Record<string, number> = {
  student: 1,
  user: 1,
  landlord: 2,
  moderator: 2,
  admin: 3,
};
`,
              },
              {
                name: 'inspections.controller.ts',
                code: `import { Controller, Get, UseGuards } from '@nestjs/common';
import { KampusMinRoleGuard } from './kampus-min-role.guard';
import { MinRole } from './min-role.decorator';

@Controller('inspections')
@UseGuards(KampusMinRoleGuard)
export class InspectionsController {
  @Get('schedule')
  @MinRole('landlord')
  schedule() {
    return { upcomingInspections: 4 };
  }
}
`,
              },
              {
                name: 'inspections.module.ts',
                code: `import { Module } from '@nestjs/common';
import { InspectionsController } from './inspections.controller';
import { KampusMinRoleGuard } from './kampus-min-role.guard';

@Module({
  controllers: [InspectionsController],
  providers: [KampusMinRoleGuard],
})
export class InspectionsModule {}
`,
              },
            ],
            tests: [
              {
                name: 'Blocks Student Adaobi (rank 1 < 2) from landlord schedule with 403',
                request: {
                  method: 'GET',
                  url: '/inspections/schedule',
                  headers: { Authorization: 'Bearer demo-student-jwt' },
                },
                check: (res) =>
                  res.status === 403
                    ? { pass: true }
                    : { pass: false, reason: `Expected 403, got ${res.status}` },
              },
              {
                name: 'Allows Landlord Chidi (rank 2 >= 2) with 200',
                request: {
                  method: 'GET',
                  url: '/inspections/schedule',
                  headers: { Authorization: 'Bearer demo-landlord-jwt' },
                },
                check: (res) =>
                  res.status === 200
                    ? { pass: true }
                    : { pass: false, reason: `Expected 200, got ${res.status}` },
              },
              {
                name: 'Allows Housing Officer Grace (rank 3 >= 2) with 200',
                request: {
                  method: 'GET',
                  url: '/inspections/schedule',
                  headers: { Authorization: 'Bearer demo-admin-jwt' },
                },
                check: (res) =>
                  res.status === 200
                    ? { pass: true }
                    : { pass: false, reason: `Expected 200, got ${res.status}` },
              },
            ],
          },
        },

        {
          id: 'guards-ownership',
          code: '3.4',
          title: 'Hostel Ownership Guard (ABAC for Landlords)',
          difficulty: 'Advanced',
          summary: 'Ensure a Landlord can only edit rent or rooms on hostels THEY own, while allowing Kampus Housing Officers to override.',
          theory: `
            <h4>🏠 Story Context: Preventing Landlord Chidi from Editing Another Landlord's Hostel</h4>
            <p>Role-based guards only know that Chidi is a <code>landlord</code>—they don't know <em>which</em> hostel belongs to Chidi! Our <code>ListingOwnerGuard</code> fetches the hostel by <code>req.params.id</code> and checks <code>listing.landlordId === req.user.id || req.user.role === 'admin'</code>.</p>
          `,
          exampleFiles: [
            {
              name: 'listing-owner.guard.ts',
              code: `import { Injectable, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Injectable()
export class ListingOwnerGuard {
  constructor(private readonly db: DatabaseService) {}

  canActivate(context: any): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new UnauthorizedException('Kampus login required');

    const listing = this.db.findListingById(Number(req.params.id));
    if (!listing) throw new NotFoundException(\`Hostel #\${req.params.id} not found\`);

    if (user.role === 'admin' || listing.landlordId === user.id) {
      return true;
    }
    throw new ForbiddenException('You can only modify hostels that you own');
  }
}
`,
            },
            {
              name: 'manage-listings.controller.ts',
              code: `import { Controller, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { ListingOwnerGuard } from './listing-owner.guard';
import { UpdateListingDto } from './update-listing.dto';

@Controller('listings')
export class ManageListingsController {
  constructor(private readonly db: DatabaseService) {}

  @Patch(':id')
  @UseGuards(ListingOwnerGuard)
  update(@Param('id') id: string, @Body() dto: UpdateListingDto) {
    return this.db.updateListing(Number(id), dto);
  }
}
`,
            },
            {
              name: 'update-listing.dto.ts',
              code: `export class UpdateListingDto {
  rentPerYear?: number;
  roomsAvailable?: number;
}
`,
            },
            SHARED_DATABASE_SERVICE_FILE,
            {
              name: 'manage-listings.module.ts',
              code: `import { Module } from '@nestjs/common';
import { ManageListingsController } from './manage-listings.controller';
import { ListingOwnerGuard } from './listing-owner.guard';
import { DatabaseService } from './database.service';

@Module({
  controllers: [ManageListingsController],
  providers: [ListingOwnerGuard, DatabaseService],
})
export class ManageListingsModule {}
`,
            },
          ],
          presets: [
            {
              label: 'Landlord Chidi updates Hostel #1 (Owned by Chidi) -> 200',
              method: 'PATCH',
              url: '/listings/1',
              headers: { Authorization: 'Bearer demo-landlord-jwt' },
              body: JSON.stringify({ roomsAvailable: 3, rentPerYear: 185 }, null, 2),
            },
            {
              label: 'Landlord Chidi tries to edit Hostel #2 (Owned by University) -> 403',
              method: 'PATCH',
              url: '/listings/2',
              headers: { Authorization: 'Bearer demo-landlord-jwt' },
              body: JSON.stringify({ rentPerYear: 999 }, null, 2),
            },
            {
              label: 'Housing Officer Grace overrides Hostel #1 -> 200',
              method: 'PATCH',
              url: '/listings/1',
              headers: { Authorization: 'Bearer demo-admin-jwt' },
              body: JSON.stringify({ roomsAvailable: 5 }, null, 2),
            },
          ],
          exercise: {
            title: 'Protect Student Escrow Wallet Access (Self-or-Housing-Officer Guard)',
            prompt: `In <code>student-wallet.guard.ts</code> (applied to <code>GET /escrow-wallets/:userId</code> in <code>escrow-wallets.controller.ts</code>), implement <code>StudentWalletGuard</code> so that:
              <ol>
                <li>If <code>!req.user</code>, throw <code>UnauthorizedException</code>.</li>
                <li>If <code>req.user.id === req.params.userId</code> OR <code>req.user.role === 'admin'</code>, return <code>true</code>.</li>
                <li>Otherwise throw <code>ForbiddenException('Cannot inspect another student escrow wallet')</code>.</li>
              </ol>`,
            hints: [
              'Check `if (!req.user) throw new UnauthorizedException()`.',
              'Check `if (req.user.role === "admin" || req.user.id === req.params.userId) return true;`.',
            ],
            starterFiles: [
              {
                name: 'student-wallet.guard.ts',
                code: `import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';

@Injectable()
export class StudentWalletGuard {
  canActivate(context: any): boolean {
    const req = context.switchToHttp().getRequest();
    // TODO: Require req.user, allow if admin or req.user.id === req.params.userId, else throw ForbiddenException
    return false;
  }
}
`,
              },
              {
                name: 'escrow-wallets.controller.ts',
                code: `import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { StudentWalletGuard } from './student-wallet.guard';

@Controller('escrow-wallets')
@UseGuards(StudentWalletGuard)
export class EscrowWalletsController {
  constructor(private readonly db: DatabaseService) {}

  @Get(':userId')
  getWallet(@Param('userId') userId: string) {
    return {
      userId,
      escrowBalance: this.db.escrowWallets[userId] ?? 0,
    };
  }
}
`,
              },
              SHARED_DATABASE_SERVICE_FILE,
              {
                name: 'escrow-wallets.module.ts',
                code: `import { Module } from '@nestjs/common';
import { EscrowWalletsController } from './escrow-wallets.controller';
import { StudentWalletGuard } from './student-wallet.guard';
import { DatabaseService } from './database.service';

@Module({
  controllers: [EscrowWalletsController],
  providers: [StudentWalletGuard, DatabaseService],
})
export class EscrowWalletsModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'student-wallet.guard.ts',
                code: `import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';

@Injectable()
export class StudentWalletGuard {
  canActivate(context: any): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user) throw new UnauthorizedException('Login required');
    if (req.user.role === 'admin' || req.user.id === req.params.userId) {
      return true;
    }
    throw new ForbiddenException('Cannot inspect another student escrow wallet');
  }
}
`,
              },
              {
                name: 'escrow-wallets.controller.ts',
                code: `import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { StudentWalletGuard } from './student-wallet.guard';

@Controller('escrow-wallets')
@UseGuards(StudentWalletGuard)
export class EscrowWalletsController {
  constructor(private readonly db: DatabaseService) {}

  @Get(':userId')
  getWallet(@Param('userId') userId: string) {
    return {
      userId,
      escrowBalance: this.db.escrowWallets[userId] ?? 0,
    };
  }
}
`,
              },
              SHARED_DATABASE_SERVICE_FILE,
              {
                name: 'escrow-wallets.module.ts',
                code: `import { Module } from '@nestjs/common';
import { EscrowWalletsController } from './escrow-wallets.controller';
import { StudentWalletGuard } from './student-wallet.guard';
import { DatabaseService } from './database.service';

@Module({
  controllers: [EscrowWalletsController],
  providers: [StudentWalletGuard, DatabaseService],
})
export class EscrowWalletsModule {}
`,
              },
            ],
            tests: [
              {
                name: 'Student Adaobi (u-student-3) can view her own escrow wallet (200)',
                request: {
                  method: 'GET',
                  url: '/escrow-wallets/u-student-3',
                  headers: { Authorization: 'Bearer demo-student-jwt' },
                },
                check: (res) =>
                  res.status === 200 && res.body?.escrowBalance === 400
                    ? { pass: true }
                    : { pass: false, reason: `Expected 200 with escrowBalance 400, got ${JSON.stringify(res.body)}` },
              },
              {
                name: 'Adaobi cannot view Landlord Chidi wallet /escrow-wallets/u-landlord-2 (403)',
                request: {
                  method: 'GET',
                  url: '/escrow-wallets/u-landlord-2',
                  headers: { Authorization: 'Bearer demo-student-jwt' },
                },
                check: (res) =>
                  res.status === 403
                    ? { pass: true }
                    : { pass: false, reason: `Expected 403 Forbidden, got ${res.status}` },
              },
              {
                name: 'Housing Officer Grace (admin) can inspect any escrow wallet (200)',
                request: {
                  method: 'GET',
                  url: '/escrow-wallets/u-landlord-2',
                  headers: { Authorization: 'Bearer demo-admin-jwt' },
                },
                check: (res) =>
                  res.status === 200 && res.body?.escrowBalance === 1200
                    ? { pass: true }
                    : { pass: false, reason: `Expected 200 for Admin override, got ${res.status}` },
              },
            ],
          },
        },
      ],
    },

    // =========================================================================
    // MODULE 4: KAMPUS IDENTITY — AUTHENTICATION, JWT & REFRESH ROTATION
    // =========================================================================
    {
      id: 'mod-auth',
      number: '04',
      title: 'Kampus Identity: Auth & JWT Rotation',
      icon: 'key',
      description: 'Hash student passwords with bcrypt, issue short-lived Kampus JWTs, and rotate SHA-256 refresh tokens on mobile.',
      subconcepts: [
        {
          id: 'auth-login-jwt',
          code: '4.1',
          title: 'Kampus Student Login, Bcrypt & Issuing Signed JWTs',
          difficulty: 'Intermediate',
          summary: 'Authenticate @kampus.edu accounts without user-enumeration leaks and sign stateless Bearer access tokens.',
          theory: `
            <h4>🏠 Story Context: Logging Into the Kampus Student App</h4>
            <p>When Adaobi signs in with <code>ada@kampus.edu</code> and <code>Student123!</code>:</p>
            <ol>
              <li>We look up her account and compare the password against <code>user.passwordHash</code> using <code>bcrypt.compare()</code> (with a dummy hash fallback if the email wasn't found so attackers can't time which student emails exist).</li>
              <li>We sign a short-lived 15-minute JWT containing <code>{ sub: user.id, email: user.email, role: user.role }</code>.</li>
            </ol>
          `,
          exampleFiles: [
            {
              name: 'kampus-auth.controller.ts',
              code: `import { Controller, Post, Body, UnauthorizedException, ConflictException, HttpCode } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from './database.service';
import { RegisterStudentDto, LoginStudentDto } from './auth-credentials.dto';
import { JWT_AUTH_CONFIG } from './jwt.config';

@Controller('auth')
export class KampusAuthController {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterStudentDto) {
    if (this.db.findUserByEmail(dto.email)) {
      throw new ConflictException('That @kampus.edu email is already registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, JWT_AUTH_CONFIG.bcryptRounds);
    const user = this.db.createUser({ email: dto.email, name: dto.name, passwordHash });
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    return { user: { id: user.id, email: user.email, role: user.role }, accessToken };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginStudentDto) {
    const user = this.db.findUserByEmail(dto.email);
    const hash = user?.passwordHash ?? JWT_AUTH_CONFIG.dummyTimingHash;
    const valid = await bcrypt.compare(dto.password, hash);
    if (!user || !valid) {
      throw new UnauthorizedException('Invalid @kampus.edu email or password');
    }
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    return { accessToken, tokenType: 'Bearer', role: user.role };
  }
}
`,
            },
            {
              name: 'auth-credentials.dto.ts',
              code: `export class RegisterStudentDto {
  email: string;
  name: string;
  password: string;
}

export class LoginStudentDto {
  email: string;
  password: string;
}
`,
            },
            {
              name: 'jwt.config.ts',
              code: `export const JWT_AUTH_CONFIG = {
  accessTokenSecret: 'kampus-access-secret',
  accessTokenExpiresIn: '15m',
  bcryptRounds: 10,
  dummyTimingHash: '$2b$10$dummyHashToKeepTimingConstant',
};
`,
            },
            SHARED_DATABASE_SERVICE_FILE,
            {
              name: 'kampus-auth.module.ts',
              code: `import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { KampusAuthController } from './kampus-auth.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [KampusAuthController],
  providers: [DatabaseService, JwtService],
})
export class KampusAuthModule {}
`,
            },
          ],
          presets: [
            {
              label: 'Login as Student Adaobi (Valid Password -> 200)',
              method: 'POST',
              url: '/auth/login',
              headers: {},
              body: JSON.stringify({ email: 'ada@kampus.edu', password: 'Student123!' }, null, 2),
            },
            {
              label: 'Login with Wrong Password -> 401',
              method: 'POST',
              url: '/auth/login',
              headers: {},
              body: JSON.stringify({ email: 'ada@kampus.edu', password: 'WrongPassword' }, null, 2),
            },
            {
              label: 'Register Freshman Account -> 201',
              method: 'POST',
              url: '/auth/register',
              headers: {},
              body: JSON.stringify(
                { email: 'zainab@kampus.edu', name: 'Zainab Musa (100L Arch)', password: 'Hostel2026!' },
                null,
                2,
              ),
            },
          ],
          exercise: {
            title: 'Verify Kampus Bearer Token & Return Student Claims',
            prompt: `In <code>kampus-session.controller.ts</code>, implement <code>GET /auth/session</code> so it extracts the JWT from <code>Authorization: Bearer &lt;token&gt;</code>, verifies it with <code>this.jwt.verify(token)</code>, and returns <code>{ authenticated: true, student: claims }</code>. Throw <code>UnauthorizedException</code> if missing or invalid.`,
            hints: [
              'Read `const auth = req.headers["authorization"] || ""`.',
              'If `!auth.startsWith("Bearer ")` throw `new UnauthorizedException("Missing Bearer token")`.',
              'Call `const claims = this.jwt.verify(auth.slice(7))` and return `{ authenticated: true, student: claims }`.',
            ],
            starterFiles: [
              {
                name: 'kampus-session.controller.ts',
                code: `import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class KampusSessionController {
  constructor(private readonly jwt: JwtService) {}

  @Get('session')
  session(@Req() req: any) {
    // TODO: Extract Bearer token, verify with this.jwt.verify(), and return { authenticated: true, student: claims }
    return null;
  }
}
`,
              },
              {
                name: 'jwt.config.ts',
                code: `export const JWT_SESSION_CONFIG = {
  headerPrefix: 'Bearer ',
  issuer: 'kampus-auth-service',
};
`,
              },
              {
                name: 'kampus-session.module.ts',
                code: `import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { KampusSessionController } from './kampus-session.controller';

@Module({
  controllers: [KampusSessionController],
  providers: [JwtService],
})
export class KampusSessionModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'kampus-session.controller.ts',
                code: `import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class KampusSessionController {
  constructor(private readonly jwt: JwtService) {}

  @Get('session')
  session(@Req() req: any) {
    const auth = req.headers['authorization'] || '';
    if (!auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }
    const claims = this.jwt.verify(auth.slice(7));
    return { authenticated: true, student: claims };
  }
}
`,
              },
              {
                name: 'jwt.config.ts',
                code: `export const JWT_SESSION_CONFIG = {
  headerPrefix: 'Bearer ',
  issuer: 'kampus-auth-service',
};
`,
              },
              {
                name: 'kampus-session.module.ts',
                code: `import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { KampusSessionController } from './kampus-session.controller';

@Module({
  controllers: [KampusSessionController],
  providers: [JwtService],
})
export class KampusSessionModule {}
`,
              },
            ],
            tests: [
              {
                name: 'Rejects missing Authorization header with 401',
                request: { method: 'GET', url: '/auth/session', headers: {} },
                check: (res) =>
                  res.status === 401
                    ? { pass: true }
                    : { pass: false, reason: `Expected 401, got ${res.status}` },
              },
              {
                name: 'Rejects expired student JWT with 401',
                request: {
                  method: 'GET',
                  url: '/auth/session',
                  headers: { Authorization: 'Bearer demo-expired-jwt' },
                },
                check: (res) =>
                  res.status === 401
                    ? { pass: true }
                    : { pass: false, reason: `Expected 401 on expired token, got ${res.status}` },
              },
              {
                name: 'Verifies Adaobi student JWT and returns claims (200)',
                request: {
                  method: 'GET',
                  url: '/auth/session',
                  headers: { Authorization: 'Bearer demo-student-jwt' },
                },
                check: (res) =>
                  res.status === 200 &&
                  res.body?.authenticated === true &&
                  res.body?.student?.email === 'ada@kampus.edu'
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected authenticated claims for ada@kampus.edu, got ${JSON.stringify(res.body)}`,
                      },
              },
            ],
          },
        },

        {
          id: 'auth-refresh-rotation',
          code: '4.2',
          title: 'Kampus Mobile Refresh Token Rotation & Logout Revocation',
          difficulty: 'Advanced',
          summary: 'Store a SHA-256 hash of the student refresh token so replayed tokens are rejected and logout revokes access.',
          theory: `
            <h4>🏠 Story Context: Keeping Students Logged In Across the Semester</h4>
            <p>Students don't want to re-enter their password every 15 minutes during hostel hunting, but a 30-day access token would be dangerous if their phone is stolen. Solution: pair a <strong>15m Access Token</strong> with a <strong>7d Rotating Refresh Token</strong> whose SHA-256 hash is stored in <code>user.refreshTokenHash</code>.</p>
          `,
          exampleFiles: [
            {
              name: 'kampus-refresh.controller.ts',
              code: `import { Controller, Post, Body, HttpCode, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import { DatabaseService } from './database.service';
import { CurrentUser } from './current-user.decorator';
import { RefreshTokenDto } from './refresh-token.dto';

@Controller('tokens')
export class KampusRefreshController {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
  ) {}

  private sha256(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  @Post('issue')
  @HttpCode(200)
  issue(@CurrentUser() user: any) {
    if (!user) throw new UnauthorizedException();
    const refreshToken = this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role, jti: randomUUID() },
      { secret: 'kampus-refresh-secret', expiresIn: '7d' },
    );
    this.db.updateUser(user.id, { refreshTokenHash: this.sha256(refreshToken) });
    return { refreshToken };
  }

  @Post('refresh')
  @HttpCode(200)
  rotate(@Body() dto: RefreshTokenDto) {
    const presentedToken = dto.refreshToken;
    const payload = this.jwt.verify(presentedToken, { secret: 'kampus-refresh-secret' });
    const user = this.db.findUserById(payload.sub);
    if (!user?.refreshTokenHash || user.refreshTokenHash !== this.sha256(presentedToken)) {
      throw new UnauthorizedException('Kampus refresh token revoked or already rotated');
    }
    const nextRefresh = this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role, jti: randomUUID() },
      { secret: 'kampus-refresh-secret', expiresIn: '7d' },
    );
    this.db.updateUser(user.id, { refreshTokenHash: this.sha256(nextRefresh) });
    return {
      accessToken: this.jwt.sign({ sub: user.id, email: user.email, role: user.role }),
      refreshToken: nextRefresh,
    };
  }
}
`,
            },
            {
              name: 'refresh-token.dto.ts',
              code: `export class RefreshTokenDto {
  refreshToken: string;
}
`,
            },
            SHARED_CURRENT_USER_FILE,
            SHARED_DATABASE_SERVICE_FILE,
            {
              name: 'kampus-refresh.module.ts',
              code: `import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { KampusRefreshController } from './kampus-refresh.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [KampusRefreshController],
  providers: [DatabaseService, JwtService],
})
export class KampusRefreshModule {}
`,
            },
          ],
          presets: [
            {
              label: '1. Issue Refresh Token for Student Adaobi (200)',
              method: 'POST',
              url: '/tokens/issue',
              headers: { Authorization: 'Bearer demo-student-jwt' },
              body: '',
            },
            {
              label: '2. Replay Stolen/Invalid Refresh Token -> 401',
              method: 'POST',
              url: '/tokens/refresh',
              headers: {},
              body: JSON.stringify({ refreshToken: 'stolen.token.value' }, null, 2),
            },
          ],
          exercise: {
            title: 'Revoke Student Refresh Token on Kampus Logout',
            prompt: `In <code>kampus-logout.controller.ts</code>, implement <code>POST /session/logout</code> with <code>@HttpCode(204)</code> so that it requires an authenticated user (<code>@CurrentUser() user</code> from <code>current-user.decorator.ts</code>; throw <code>UnauthorizedException</code> if missing) and sets their <code>refreshTokenHash</code> to <code>null</code> via <code>this.db.updateUser(user.id, { refreshTokenHash: null })</code>.`,
            hints: [
              'Check `if (!user) throw new UnauthorizedException()`.',
              'Call `this.db.updateUser(user.id, { refreshTokenHash: null })`.',
            ],
            starterFiles: [
              {
                name: 'kampus-logout.controller.ts',
                code: `import { Controller, Post, HttpCode, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { CurrentUser } from './current-user.decorator';

@Controller('session')
export class KampusLogoutController {
  constructor(private readonly db: DatabaseService) {}

  @Post('logout')
  @HttpCode(204)
  logout(@CurrentUser() user: any) {
    // TODO: Require user (else throw UnauthorizedException) and clear refreshTokenHash to null
  }
}
`,
              },
              SHARED_CURRENT_USER_FILE,
              SHARED_DATABASE_SERVICE_FILE,
              {
                name: 'kampus-logout.module.ts',
                code: `import { Module } from '@nestjs/common';
import { KampusLogoutController } from './kampus-logout.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [KampusLogoutController],
  providers: [DatabaseService],
})
export class KampusLogoutModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'kampus-logout.controller.ts',
                code: `import { Controller, Post, HttpCode, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { CurrentUser } from './current-user.decorator';

@Controller('session')
export class KampusLogoutController {
  constructor(private readonly db: DatabaseService) {}

  @Post('logout')
  @HttpCode(204)
  logout(@CurrentUser() user: any) {
    if (!user) throw new UnauthorizedException('Not logged into Kampus');
    this.db.updateUser(user.id, { refreshTokenHash: null });
  }
}
`,
              },
              SHARED_CURRENT_USER_FILE,
              SHARED_DATABASE_SERVICE_FILE,
              {
                name: 'kampus-logout.module.ts',
                code: `import { Module } from '@nestjs/common';
import { KampusLogoutController } from './kampus-logout.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [KampusLogoutController],
  providers: [DatabaseService],
})
export class KampusLogoutModule {}
`,
              },
            ],
            tests: [
              {
                name: 'POST /session/logout without token returns 401',
                request: { method: 'POST', url: '/session/logout', headers: {} },
                check: (res) =>
                  res.status === 401
                    ? { pass: true }
                    : { pass: false, reason: `Expected 401, got ${res.status}` },
              },
              {
                name: 'POST /session/logout as Adaobi returns 204 and sets refreshTokenHash=null',
                request: {
                  method: 'POST',
                  url: '/session/logout',
                  headers: { Authorization: 'Bearer demo-student-jwt' },
                },
                check: (res, state) => {
                  const u = state.users.find((x) => x.id === 'u-student-3');
                  return res.status === 204 && u?.refreshTokenHash === null
                    ? { pass: true }
                    : { pass: false, reason: `Expected 204 and null refreshTokenHash, got ${res.status}` };
                },
              },
            ],
          },
        },
      ],
    },

    // =========================================================================
    // MODULE 5: KAMPUS OBSERVABILITY & PRIVACY — INTERCEPTORS & RXJS STREAMS
    // =========================================================================
    {
      id: 'mod-interceptors',
      number: '05',
      title: 'Kampus Streams: Interceptors & RxJS',
      icon: 'activity',
      description: 'Standardize Kampus API envelopes, strip Landlord BVN/password hashes, and enforce timeouts on external campus shuttle GPS calls.',
      subconcepts: [
        {
          id: 'interceptors-envelope',
          code: '5.1',
          title: 'Kampus Response Envelope & Sensitive Data Redaction',
          difficulty: 'Beginner',
          summary: 'Use NestInterceptor with RxJS tap() and map() to time requests, wrap responses, and strip passwordHash/bankBvn.',
          theory: `
            <h4>🏠 Story Context: Protecting Landlord Bank BVNs &amp; Standardizing Responses</h4>
            <p>The Kampus mobile team wants every successful API response wrapped in <code>{ success: true, platform: 'Kampus', data, timestamp }</code> along with an <code>x-response-time</code> header. Even more importantly, when returning a Landlord or Student object, we must ensure sensitive fields like <code>passwordHash</code> and <code>bankBvn</code> never leak to clients!</p>
          `,
          exampleFiles: [
            {
              name: 'kampus-envelope.interceptor.ts',
              code: `import { Injectable } from '@nestjs/common';
import { map, tap } from 'rxjs/operators';

@Injectable()
export class KampusEnvelopeInterceptor {
  intercept(context: any, next: any) {
    const started = Date.now();
    const res = context.switchToHttp().getResponse();

    return next.handle().pipe(
      tap(() => {
        res.setHeader('x-response-time', \`\${Date.now() - started}ms\`);
      }),
      map((data) => ({
        success: true,
        platform: 'Kampus PropTech',
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
`,
            },
            {
              name: 'campus-stats.controller.ts',
              code: `import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { KampusEnvelopeInterceptor } from './kampus-envelope.interceptor';

@Controller('campus-stats')
@UseInterceptors(KampusEnvelopeInterceptor)
export class CampusStatsController {
  @Get()
  overview() {
    return { verifiedHostels: 48, activeStudents: 3420, escrowProtectedUsd: 184000 };
  }
}
`,
            },
            {
              name: 'campus-stats.module.ts',
              code: `import { Module } from '@nestjs/common';
import { CampusStatsController } from './campus-stats.controller';
import { KampusEnvelopeInterceptor } from './kampus-envelope.interceptor';

@Module({
  controllers: [CampusStatsController],
  providers: [KampusEnvelopeInterceptor],
})
export class CampusStatsModule {}
`,
            },
          ],
          presets: [
            {
              label: 'GET /campus-stats (Wrapped in Kampus Envelope)',
              method: 'GET',
              url: '/campus-stats',
              headers: {},
              body: '',
            },
          ],
          exercise: {
            title: 'Redact Landlord passwordHash & bankBvn in an Interceptor',
            prompt: `In <code>redact-landlord.interceptor.ts</code> (applied to <code>LandlordKycController</code> in <code>landlord-kyc.controller.ts</code>), implement <code>RedactLandlordSecretsInterceptor</code> using RxJS <code>map()</code> so that if the controller returns an object containing <code>passwordHash</code> or <code>bankBvn</code>, those sensitive keys are stripped before the response leaves the server.`,
            hints: [
              'Inside `map((data: any) => ...)`, destructure `const { passwordHash, bankBvn, ...safe } = data;` and return `safe`.',
            ],
            starterFiles: [
              {
                name: 'redact-landlord.interceptor.ts',
                code: `import { Injectable } from '@nestjs/common';
import { map } from 'rxjs/operators';

@Injectable()
export class RedactLandlordSecretsInterceptor {
  intercept(context: any, next: any) {
    return next.handle().pipe(
      map((data: any) => {
        // TODO: Strip passwordHash and bankBvn from data
        return data;
      }),
    );
  }
}
`,
              },
              {
                name: 'landlord-kyc.controller.ts',
                code: `import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { RedactLandlordSecretsInterceptor } from './redact-landlord.interceptor';

@Controller('landlord-kyc')
@UseInterceptors(RedactLandlordSecretsInterceptor)
export class LandlordKycController {
  @Get()
  profile() {
    return {
      id: 'u-landlord-2',
      name: 'Chidi Nwosu',
      email: 'chidi@kampus.edu',
      passwordHash: '$2b$10$secretHash',
      bankBvn: '22198837461',
    };
  }
}
`,
              },
              {
                name: 'landlord-kyc.module.ts',
                code: `import { Module } from '@nestjs/common';
import { LandlordKycController } from './landlord-kyc.controller';
import { RedactLandlordSecretsInterceptor } from './redact-landlord.interceptor';

@Module({
  controllers: [LandlordKycController],
  providers: [RedactLandlordSecretsInterceptor],
})
export class LandlordKycModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'redact-landlord.interceptor.ts',
                code: `import { Injectable } from '@nestjs/common';
import { map } from 'rxjs/operators';

@Injectable()
export class RedactLandlordSecretsInterceptor {
  intercept(context: any, next: any) {
    return next.handle().pipe(
      map((data: any) => {
        if (data && typeof data === 'object') {
          const { passwordHash, bankBvn, ...safe } = data;
          return safe;
        }
        return data;
      }),
    );
  }
}
`,
              },
              {
                name: 'landlord-kyc.controller.ts',
                code: `import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { RedactLandlordSecretsInterceptor } from './redact-landlord.interceptor';

@Controller('landlord-kyc')
@UseInterceptors(RedactLandlordSecretsInterceptor)
export class LandlordKycController {
  @Get()
  profile() {
    return {
      id: 'u-landlord-2',
      name: 'Chidi Nwosu',
      email: 'chidi@kampus.edu',
      passwordHash: '$2b$10$secretHash',
      bankBvn: '22198837461',
    };
  }
}
`,
              },
              {
                name: 'landlord-kyc.module.ts',
                code: `import { Module } from '@nestjs/common';
import { LandlordKycController } from './landlord-kyc.controller';
import { RedactLandlordSecretsInterceptor } from './redact-landlord.interceptor';

@Module({
  controllers: [LandlordKycController],
  providers: [RedactLandlordSecretsInterceptor],
})
export class LandlordKycModule {}
`,
              },
            ],
            tests: [
              {
                name: 'GET /landlord-kyc strips passwordHash and bankBvn while keeping Chidi profile fields',
                request: { method: 'GET', url: '/landlord-kyc', headers: {} },
                check: (res) =>
                  res.status === 200 &&
                  res.body?.email === 'chidi@kampus.edu' &&
                  !('passwordHash' in res.body) &&
                  !('bankBvn' in res.body)
                    ? { pass: true }
                    : { pass: false, reason: `Leaked sensitive KYC fields: ${JSON.stringify(res.body)}` },
              },
            ],
          },
        },

        {
          id: 'interceptors-timeout',
          code: '5.2',
          title: 'Campus Shuttle GPS Timeout & Graceful Degradation Interceptors',
          difficulty: 'Intermediate',
          summary: 'Use RxJS timeout() to cut off slow external APIs with HTTP 408, or catchError() to return a safe fallback.',
          theory: `
            <h4>🏠 Story Context: External Campus Shuttle Distance API</h4>
            <p>Each Kampus hostel page shows live walking/shuttle time to the main lecture theater by calling an external Campus GPS API. If that GPS service hangs or goes down, we have two RxJS patterns:</p>
            <ul>
              <li><strong>Fail Fast (<code>timeout(150)</code>):</strong> Abort after 150ms and throw <code>408 RequestTimeoutException</code>.</li>
              <li><strong>Graceful Degradation (<code>catchError()</code>):</strong> Catch the failure and return <code>of({ degraded: true, shuttleStops: [] })</code> so the hostel page still loads!</li>
            </ul>
          `,
          exampleFiles: [
            {
              name: 'shuttle-timeout.interceptor.ts',
              code: `import { Injectable, RequestTimeoutException } from '@nestjs/common';
import { throwError, TimeoutError } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { SHUTTLE_SLA_CONFIG } from './shuttle.config';

@Injectable()
export class ShuttleTimeoutInterceptor {
  private readonly maxWaitMs = SHUTTLE_SLA_CONFIG.maxWaitMs;

  intercept(context: any, next: any) {
    return next.handle().pipe(
      timeout(this.maxWaitMs),
      catchError((err) =>
        err instanceof TimeoutError
          ? throwError(() => new RequestTimeoutException(\`Shuttle GPS exceeded \${this.maxWaitMs}ms SLA\`))
          : throwError(() => err),
      ),
    );
  }
}
`,
            },
            {
              name: 'shuttle-eta.controller.ts',
              code: `import {
  Controller, Get, Query, UseInterceptors, ParseIntPipe, DefaultValuePipe
} from '@nestjs/common';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ShuttleTimeoutInterceptor } from './shuttle-timeout.interceptor';

@Controller('shuttle-eta')
@UseInterceptors(ShuttleTimeoutInterceptor)
export class ShuttleEtaController {
  @Get()
  eta(@Query('gpsLatencyMs', new DefaultValuePipe(30), ParseIntPipe) gpsLatencyMs: number) {
    return of({ gate: 'North Gate', walkingMins: 5, gpsLatencyMs }).pipe(delay(gpsLatencyMs));
  }
}
`,
            },
            {
              name: 'shuttle.config.ts',
              code: `export const SHUTTLE_SLA_CONFIG = {
  maxWaitMs: 150,
  defaultGate: 'North Gate',
};
`,
            },
            {
              name: 'shuttle-eta.module.ts',
              code: `import { Module } from '@nestjs/common';
import { ShuttleEtaController } from './shuttle-eta.controller';
import { ShuttleTimeoutInterceptor } from './shuttle-timeout.interceptor';

@Module({
  controllers: [ShuttleEtaController],
  providers: [ShuttleTimeoutInterceptor],
})
export class ShuttleEtaModule {}
`,
            },
          ],
          presets: [
            {
              label: 'Fast GPS Response (30ms <= 150ms) -> 200 OK',
              method: 'GET',
              url: '/shuttle-eta?gpsLatencyMs=30',
              headers: {},
              body: '',
            },
            {
              label: 'Hung GPS Service (300ms > 150ms) -> 408 Timeout',
              method: 'GET',
              url: '/shuttle-eta?gpsLatencyMs=300',
              headers: {},
              body: '',
            },
          ],
          exercise: {
            title: 'Build a Roommate-Match Graceful Fallback Interceptor',
            prompt: `When Kampus's AI Roommate Compatibility engine is offline (<code>GET /roommate-suggestions?offline=true</code>), <code>RoommateController</code> (in <code>roommate.controller.ts</code>) throws <code>ServiceUnavailableException</code>. Implement <code>RoommateFallbackInterceptor</code> in <code>roommate-fallback.interceptor.ts</code> using RxJS <code>catchError</code> so it recovers and returns <code>of({ degraded: true, matches: [], reason: err.message })</code> with HTTP 200.`,
            hints: [
              'Return `next.handle().pipe(catchError((err) => of({ degraded: true, matches: [], reason: err.message })))`.',
            ],
            starterFiles: [
              {
                name: 'roommate-fallback.interceptor.ts',
                code: `import { Injectable } from '@nestjs/common';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class RoommateFallbackInterceptor {
  intercept(context: any, next: any) {
    // TODO: Use catchError to return of({ degraded: true, matches: [], reason: err.message })
    return next.handle();
  }
}
`,
              },
              {
                name: 'roommate.controller.ts',
                code: `import { Controller, Get, Query, UseInterceptors, ServiceUnavailableException } from '@nestjs/common';
import { RoommateFallbackInterceptor } from './roommate-fallback.interceptor';

@Controller('roommate-suggestions')
@UseInterceptors(RoommateFallbackInterceptor)
export class RoommateController {
  @Get()
  suggest(@Query('offline') offline?: string) {
    if (offline === 'true') {
      throw new ServiceUnavailableException('Kampus AI Roommate engine offline');
    }
    return { degraded: false, matches: ['Tunde (300L CS)', 'Kemi (300L SE)'] };
  }
}
`,
              },
              {
                name: 'roommate.module.ts',
                code: `import { Module } from '@nestjs/common';
import { RoommateController } from './roommate.controller';
import { RoommateFallbackInterceptor } from './roommate-fallback.interceptor';

@Module({
  controllers: [RoommateController],
  providers: [RoommateFallbackInterceptor],
})
export class RoommateModule {}
`,
              },
            ],
            solutionFiles: [
              {
                name: 'roommate-fallback.interceptor.ts',
                code: `import { Injectable } from '@nestjs/common';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class RoommateFallbackInterceptor {
  intercept(context: any, next: any) {
    return next.handle().pipe(
      catchError((err) =>
        of({
          degraded: true,
          matches: [],
          reason: err.message,
        }),
      ),
    );
  }
}
`,
              },
              {
                name: 'roommate.controller.ts',
                code: `import { Controller, Get, Query, UseInterceptors, ServiceUnavailableException } from '@nestjs/common';
import { RoommateFallbackInterceptor } from './roommate-fallback.interceptor';

@Controller('roommate-suggestions')
@UseInterceptors(RoommateFallbackInterceptor)
export class RoommateController {
  @Get()
  suggest(@Query('offline') offline?: string) {
    if (offline === 'true') {
      throw new ServiceUnavailableException('Kampus AI Roommate engine offline');
    }
    return { degraded: false, matches: ['Tunde (300L CS)', 'Kemi (300L SE)'] };
  }
}
`,
              },
              {
                name: 'roommate.module.ts',
                code: `import { Module } from '@nestjs/common';
import { RoommateController } from './roommate.controller';
import { RoommateFallbackInterceptor } from './roommate-fallback.interceptor';

@Module({
  controllers: [RoommateController],
  providers: [RoommateFallbackInterceptor],
})
export class RoommateModule {}
`,
              },
            ],
            tests: [
              {
                name: 'Normal request returns live roommate matches (degraded: false)',
                request: { method: 'GET', url: '/roommate-suggestions', headers: {} },
                check: (res) =>
                  res.status === 200 && res.body?.degraded === false
                    ? { pass: true }
                    : { pass: false, reason: `Expected degraded=false, got ${JSON.stringify(res.body)}` },
              },
              {
                name: 'When AI engine throws 503, interceptor recovers with degraded: true and empty matches[] (200)',
                request: { method: 'GET', url: '/roommate-suggestions?offline=true', headers: {} },
                check: (res) =>
                  res.status === 200 &&
                  res.body?.degraded === true &&
                  Array.isArray(res.body?.matches) &&
                  res.body.matches.length === 0
                    ? { pass: true }
                    : {
                        pass: false,
                        reason: `Expected graceful fallback object, got ${res.status}: ${JSON.stringify(res.body)}`,
                      },
              },
            ],
          },
        },
      ],
    },
  ];

  global.NEST_CURRICULUM_PART1 = PART_1_MODULES;
})(window);

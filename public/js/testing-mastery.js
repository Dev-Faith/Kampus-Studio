/**
 * Kampus Studio — Unit & Integration Testing Mastery Reference
 * Covers @nestjs/testing (Test.createTestingModule, overrideGuard, overrideProvider),
 * Jest (jest.fn(), spyOn, mockResolvedValue, rejects.toThrow), and Supertest E2E pipelines.
 */
(function (global) {
  'use strict';

  const NEST_TESTING_FULL_SPEC = `// ============================================================================
// KAMPUS PROPTECH — PRODUCTION UNIT & INTEGRATION TEST SUITE BLUEPRINT
// ============================================================================
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ConflictException, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { HostelBookingService } from './hostel-booking.service';
import { EscrowCheckoutController } from './escrow-checkout.controller';
import { PrismaService } from '../prisma/prisma.service';
import { StudentAuthGuard } from '../auth/student-auth.guard';

// ── PART 1: ISOLATED SERVICE UNIT TEST (Runs in ~3ms, Zero Network/DB I/O) ──
describe('HostelBookingService (Unit)', () => {
  let service: HostelBookingService;
  const mockPrisma = {
    listing: { findUnique: jest.fn() },
    booking: { create: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks(); // Prevent mock call history from leaking across specs!

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        HostelBookingService,
        { provide: PrismaService, useValue: mockPrisma }, // Swap real DB with jest.fn()
      ],
    }).compile();

    service = moduleRef.get<HostelBookingService>(HostelBookingService);
  });

  it('creates a confirmed booking when roomsAvailable > 0', async () => {
    mockPrisma.listing.findUnique.mockResolvedValue({
      id: 1,
      title: 'Cedar Court Ensuite Studio',
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

    const result = await service.bookHostel('u-student-3', 1);

    expect(mockPrisma.listing.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockPrisma.booking.create).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('confirmed');
  });

  it('throws ConflictException (409) when hostel has 0 rooms left', async () => {
    mockPrisma.listing.findUnique.mockResolvedValue({
      id: 3,
      title: 'Palm Grove Annex',
      rentPerYear: 120,
      roomsAvailable: 0,
    });

    await expect(service.bookHostel('u-student-3', 3)).rejects.toThrow(ConflictException);
    expect(mockPrisma.booking.create).not.toHaveBeenCalled();
  });
});

// ── PART 2: FULL HTTP PIPELINE INTEGRATION TEST (Guards + Pipes + Supertest) ──
describe('EscrowCheckoutController (Integration / E2E)', () => {
  let app: INestApplication;

  beforeEach(async () => {
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

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /e2e-escrow/checkout -> 201 Created for valid DTO', async () => {
    const res = await request(app.getHttpServer())
      .post('/e2e-escrow/checkout')
      .send({ listingId: 1, amount: 180 })
      .expect(201);

    expect(res.body).toEqual({
      escrowStatus: 'locked',
      studentId: 'u-student-3',
      listingId: 1,
      amount: 180,
    });
  });

  it('POST /e2e-escrow/checkout -> 400 Bad Request when ValidationPipe rejects amount < 50', async () => {
    await request(app.getHttpServer())
      .post('/e2e-escrow/checkout')
      .send({ listingId: 1, amount: 10 })
      .expect(400);
  });
});`;

  const NEST_TESTING_HARNESS_EXPLORER = [
    {
      id: 'create-testing-module',
      token: 'Test.createTestingModule({ providers, controllers }).compile()',
      category: 'IoC Test Container (@nestjs/testing)',
      meaning:
        'Builds a self-contained NestJS Dependency Injection container exclusively for the current test suite, resolving constructor metadata and custom tokens without starting a TCP server.',
      underTheHood:
        'Reads Reflect.getMetadata("design:paramtypes") and @Inject() decorators on your classes, wires up only the providers declared in the test metadata, runs onModuleInit() hooks, and returns a TestingModule instance.',
      whyBestPractice:
        'Unlike manual `new HostelBookingService(mockPrisma)`, `Test.createTestingModule()` proves that NestJS can actually resolve all constructor dependencies and injection tokens in your class.',
    },
    {
      id: 'custom-mock-provider',
      token: '{ provide: PrismaService, useValue: mockPrisma }',
      category: 'Dependency Substitution & Spies',
      meaning:
        'Instructs the TestingModule IoC container to inject your in-memory `mockPrisma` object whenever any service or controller requests the `PrismaService` token.',
      underTheHood:
        'Overrides the provider binding in the TestingModule map so `moduleRef.get(HostelBookingService)` receives `mockPrisma` in its constructor instead of opening a real PostgreSQL connection pool.',
      whyBestPractice:
        'Eliminates database boot time, network flakiness, and cross-test data pollution, letting 100 unit tests execute in milliseconds while simulating any database response or error.',
    },
    {
      id: 'jest-fn-spy',
      token: 'jest.fn().mockResolvedValue(fixture)',
      category: 'Jest Asynchronous Spy',
      meaning:
        'Creates a programmable spy function that returns `Promise.resolve(fixture)` when awaited and records every call’s arguments in `mock.calls`.',
      underTheHood:
        'Wraps a closure that logs `(..args)` into `fn.mock.calls`, increments invocation counters, and returns a resolved or rejected Promise (`mockRejectedValue`) on demand.',
      whyBestPractice:
        'Lets you verify both state and behavior: not only what your service returned, but also that it queried the exact right record (`expect(spy).toHaveBeenCalledWith({ where: { id: 1 } })`).',
    },
    {
      id: 'rejects-to-throw',
      token: 'await expect(service.bookHostel(...)).rejects.toThrow(ConflictException)',
      category: 'Async Exception Assertion',
      meaning:
        'Awaits a Promise that is expected to fail and asserts that it rejects with a specific NestJS HttpException subclass (such as `ConflictException` or `NotFoundException`).',
      underTheHood:
        'Catches the rejected Promise inside Jest’s assertion matcher, verifies that the promise did NOT resolve (firing an error if it succeeded), and checks `err instanceof ConflictException`.',
      whyBestPractice:
        'Calling synchronous `expect(() => service.bookHostel()).toThrow()` on an `async` method is a notorious bug—it always passes or fails unpredictably because an `async` function returns a pending Promise rather than throwing synchronously!',
    },
    {
      id: 'override-guard',
      token: '.overrideGuard(StudentAuthGuard).useValue({ canActivate: ... })',
      category: 'Pipeline Override Fluent API',
      meaning:
        'Replaces a Guard (or Provider/Interceptor/Pipe) inside the TestingModule before compilation while keeping the `@UseGuards(StudentAuthGuard)` route binding intact.',
      underTheHood:
        'Swaps the instance bound to the `StudentAuthGuard` token inside the NestJS Guard consumer pipeline so incoming Supertest requests execute your deterministic mock `canActivate` function.',
      whyBestPractice:
        'Allows integration tests to inject authenticated `req.user` personas (`student`, `landlord`, `admin`) without needing an external OAuth/JWKS server or RSA keypair.',
    },
    {
      id: 'supertest-pipeline',
      token: 'request(app.getHttpServer()).post(url).send(dto).expect(201)',
      category: 'Supertest HTTP Pipeline Runner',
      meaning:
        'Dispatches a real HTTP request through NestJS Middleware -> Guards -> Interceptors -> ValidationPipe -> Controller -> Exception Filters and asserts the HTTP status code.',
      underTheHood:
        'Binds to the ephemeral HTTP server returned by `app.getHttpServer()`, serializes the JSON payload, sets `Content-Type: application/json`, and parses the HTTP response body and headers.',
      whyBestPractice:
        'This is the ONLY way to automatically test that your `@IsInt()`, `@Min(50)`, `ParseIntPipe`, `@UseGuards()`, and Exception Filters actually work together over HTTP.',
    },
  ];

  const NEST_TESTING_CHAPTERS = [
    {
      id: 'testing-ch1-pyramid',
      number: '01',
      title: 'The NestJS Testing Pyramid: Unit vs. Integration vs. E2E',
      subtitle: 'Understand exactly which bugs Unit Tests catch—and which bugs only HTTP Integration Tests can catch.',
      relatedSubconceptId: 'testing-unit-testingmodule-mocks',
      kampusScenario:
        'Imagine Landlord Chidi adds `@Min(50)` to `CreateHostelDto.rentPerYear`, and you write a controller unit test `await controller.create({ title: "Hi", rentPerYear: -999 })`. Surprisingly, the unit test PASSES! Why? Because calling a controller method directly in TypeScript completely skips NestJS’s `ValidationPipe`, `@UseGuards()`, and `@UseInterceptors()`.',
      syntaxComparison: {
        leftTitle: '🔬 Unit Test (Isolated Service / Controller)',
        leftCode: `// Fast (~2ms): Tests pure business logic & branching rules
const moduleRef = await Test.createTestingModule({
  providers: [
    HostelBookingService,
    { provide: PrismaService, useValue: mockPrisma },
  ],
}).compile();

const service = moduleRef.get(HostelBookingService);

// Calls TypeScript method directly (No HTTP, No Pipes, No Guards)
const res = await service.bookHostel('u-student-3', 1);
expect(res.status).toBe('confirmed');`,
        rightTitle: '🌐 Integration / E2E Test (Full HTTP Pipeline)',
        rightCode: `// Comprehensive (~15ms): Tests Guards + ValidationPipe + Controller + Filters
const app = moduleRef.createNestApplication();
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
await app.init();

// Sends HTTP request through the full NestJS pipeline!
await request(app.getHttpServer())
  .post('/e2e-escrow/checkout')
  .send({ listingId: 1, amount: 10 }) // Violates @Min(50)
  .expect(400); // ValidationPipe catches it!`,
      },
      syntaxMap: [
        {
          syntax: 'Unit Test (`moduleRef.get(Service)`)',
          purpose: 'Tests complex domain math, fee tiers, branching edge cases, and error throwing in < 5ms.',
          pipelineCoverage: 'Service / Controller method body ONLY (Skips Guards, Pipes, Interceptors, Filters).',
        },
        {
          syntax: 'HTTP Integration Test (`createNestApplication()` + `supertest`)',
          purpose: 'Tests route paths, HTTP status codes, DTO `ValidationPipe`, `ParseIntPipe`, Guards, and Interceptors.',
          pipelineCoverage: 'Full NestJS HTTP Request Lifecycle with mocked/in-memory DB or overridden Guards.',
        },
        {
          syntax: 'Full E2E Test (Test Database + Real JWTs)',
          purpose: 'Tests SQL constraints, Prisma `$transaction` rollbacks, and full auth flows before deployment.',
          pipelineCoverage: '100% of application + database engine.',
        },
      ],
      architecturalDecisions: [
        {
          question: 'Why shouldn’t we write 100% E2E tests and skip unit tests, or 100% unit tests and skip E2E tests?',
          antiPattern:
            '100% unit tests leave your HTTP decorators (`@Post`, `@Body`, `ValidationPipe`, `@UseGuards`) completely untested. Conversely, testing every single pricing formula permutation via full E2E HTTP + database tests makes your test suite slow and brittle.',
          technicalReason:
            'Combining ~70% isolated service unit tests (for fast combinatorial business logic) with ~30% Supertest HTTP integration tests (for route wiring, DTO validation, and guard security) gives both millisecond feedback and full pipeline confidence.',
          bestPracticeRule:
            'Test business calculations and branching error paths in Service Unit Tests; test HTTP status codes, DTO validation rules, and Guards in Supertest Integration Tests.',
        },
      ],
    },

    {
      id: 'testing-ch2-testing-module',
      number: '02',
      title: 'Test.createTestingModule & Isolated IoC Containers',
      subtitle: 'Compile a miniature Dependency Injection graph for each test suite and resolve providers safely.',
      relatedSubconceptId: 'testing-unit-testingmodule-mocks',
      kampusScenario:
        'Kampus `EscrowPricingService` depends on `PrismaService` and a custom `@Inject("ESCROW_CONFIG")` token. Using `Test.createTestingModule()`, we wire those exact tokens in an isolated test container and retrieve our service via `moduleRef.get(EscrowPricingService)`.',
      syntaxComparison: {
        leftTitle: '❌ Fragile Manual Instantiation (Bypasses DI)',
        leftCode: `// Breaks whenever constructor order changes or @Inject() tokens are added!
const fakePrisma: any = { listing: { findUnique: jest.fn() } };
const fakeConfig: any = { feePercent: 0.05 };

// Does NOT test whether @Injectable() or @Inject('ESCROW_CONFIG') is valid!
const service = new EscrowPricingService(fakePrisma, fakeConfig);`,
        rightTitle: '✅ NestJS Test.createTestingModule (Validates DI Graph)',
        rightCode: `const moduleRef = await Test.createTestingModule({
  providers: [
    EscrowPricingService,
    { provide: PrismaService, useValue: mockPrisma },
    { provide: 'ESCROW_CONFIG', useValue: { feePercent: 0.05 } },
  ],
}).compile();

const service = moduleRef.get(EscrowPricingService);`,
      },
      syntaxMap: [
        {
          syntax: 'Test.createTestingModule(metadata)',
          purpose: 'Accepts the same `{ imports, controllers, providers }` shape as `@Module()` and returns a `TestingModuleBuilder`.',
          pipelineCoverage: 'Registers providers and controllers into an isolated test container.',
        },
        {
          syntax: 'await builder.compile()',
          purpose: 'Resolves all dependency tokens asynchronously and instantiates singletons.',
          pipelineCoverage: 'Validates that every constructor parameter has a matching provider in the test module.',
        },
        {
          syntax: 'moduleRef.get(Token)',
          purpose: 'Retrieves the compiled controller or service instance from the test container.',
          pipelineCoverage: 'Returns the wired instance with all mocked dependencies injected.',
        },
      ],
      architecturalDecisions: [
        {
          question: 'Why compile a fresh `TestingModule` inside `beforeEach()` instead of once at the top of the file?',
          antiPattern:
            'Sharing a single compiled service instance across 20 tests causes subtle state bugs if the service caches values in memory or if mock functions retain call counts from earlier tests.',
          technicalReason:
            'Compiling inside `beforeEach()` (paired with `jest.clearAllMocks()`) guarantees strict test isolation: test #2 can never fail or pass accidentally because of side effects left behind by test #1.',
          bestPracticeRule:
            'Always reset mocks (`jest.clearAllMocks()`) and compile a clean `TestingModule` before each spec so tests can run in any order.',
        },
      ],
    },

    {
      id: 'testing-ch3-jest-mocks',
      number: '03',
      title: 'Mocking Services, Prisma & Mongoose with jest.fn() & useValue',
      subtitle: 'Program deterministic database responses and assert exact ORM query arguments with Jest spies.',
      relatedSubconceptId: 'testing-unit-testingmodule-mocks',
      kampusScenario:
        'When Student Adaobi books a room at Cedar Court, `HostelBookingService` must query `prisma.listing.findUnique({ where: { id: 1 } })` and then call `prisma.booking.create({ data: ... })`. With `jest.fn()`, we verify both the returned booking and the exact arguments passed to Prisma.',
      syntaxComparison: {
        leftTitle: '🛠️ Programming jest.fn() Return Values',
        leftCode: `const mockPrisma = {
  listing: {
    findUnique: jest.fn(),
  },
  booking: {
    create: jest.fn(),
  },
};

// Program async return values for this specific test:
mockPrisma.listing.findUnique.mockResolvedValue({
  id: 1,
  title: 'Cedar Court',
  rentPerYear: 180,
  roomsAvailable: 3,
});
mockPrisma.booking.create.mockResolvedValue({
  id: 'bk-501',
  status: 'confirmed',
});`,
        rightTitle: '🔍 Asserting Spy Calls & Arguments',
        rightCode: `const booking = await service.bookHostel('u-student-3', 1);

// 1. Assert exact query filter sent to Prisma:
expect(mockPrisma.listing.findUnique).toHaveBeenCalledWith({
  where: { id: 1 },
});

// 2. Assert create was called exactly once with expected payload:
expect(mockPrisma.booking.create).toHaveBeenCalledTimes(1);
expect(mockPrisma.booking.create).toHaveBeenCalledWith({
  data: {
    studentId: 'u-student-3',
    listingId: 1,
    amount: 180,
    status: 'confirmed',
  },
});`,
      },
      syntaxMap: [
        {
          syntax: 'jest.fn().mockResolvedValue(val)',
          purpose: 'Makes the spy return `Promise.resolve(val)` when awaited.',
          pipelineCoverage: 'Ideal for async Prisma (`findUnique`, `create`), Mongoose (`.exec()`), and Redis calls.',
        },
        {
          syntax: 'jest.fn().mockReturnValue(val)',
          purpose: 'Makes the spy return `val` synchronously.',
          pipelineCoverage: 'Ideal for synchronous helpers like `configService.get("JWT_SECRET")`.',
        },
        {
          syntax: 'expect(spy).toHaveBeenCalledWith(expectedArgs)',
          purpose: 'Verifies that your service called the dependency with the exact expected parameters.',
          pipelineCoverage: 'Catches bugs where a service queries the wrong `id` or forgets to set `status: "confirmed"`.',
        },
      ],
      architecturalDecisions: [
        {
          question: 'How do you mock `@InjectModel(Listing.name)` for Mongoose vs `PrismaService` for Prisma?',
          antiPattern:
            'Trying to provide `{ provide: Listing.name, useValue: mockModel }` fails for `@nestjs/mongoose` because `@InjectModel(Listing.name)` actually looks up the token `"ListingModel"` (generated by `getModelToken(Listing.name)`).',
          technicalReason:
            'In Prisma, you inject the `PrismaService` class token directly (`{ provide: PrismaService, useValue: mockPrisma }`). In Mongoose, `@InjectModel(Listing.name)` uses `getModelToken(Listing.name)` under the hood, and chained queries like `.find().populate().lean().exec()` require the mock to return `this` on chainable methods and a Promise on `.exec()`.',
          bestPracticeRule:
            'For Prisma, mock `{ provide: PrismaService, useValue: { listing: { findUnique: jest.fn() } } }`. For Mongoose, provide `getModelToken(Listing.name)` with chainable `.find().lean().exec` spies.',
        },
      ],
    },

    {
      id: 'testing-ch4-async-exceptions',
      number: '04',
      title: 'Testing Async Exceptions & Edge Cases (.rejects.toThrow)',
      subtitle: 'Verify that NotFoundException, ConflictException, and ForbiddenException are thrown and halt downstream writes.',
      relatedSubconceptId: 'testing-unit-testingmodule-mocks',
      kampusScenario:
        'When a Kampus hostel has `roomsAvailable: 0`, `HostelBookingService.bookHostel()` must throw `ConflictException` (HTTP 409) and MUST NOT call `prisma.booking.create()`. Testing this requires awaiting Jest’s `.rejects.toThrow()` matcher.',
      syntaxComparison: {
        leftTitle: '❌ BROKEN: Synchronous .toThrow() on an Async Method',
        leftCode: `// BUG: service.bookHostel() returns a Promise!
// Passing an async arrow function to synchronous .toThrow()
// does NOT await the rejection properly!
expect(() => service.bookHostel('u-student-3', 3)).toThrow(
  ConflictException,
);`,
        rightTitle: '✅ CORRECT: await expect(promise).rejects.toThrow()',
        rightCode: `mockPrisma.listing.findUnique.mockResolvedValue({
  id: 3,
  title: 'Full Hostel',
  rentPerYear: 120,
  roomsAvailable: 0,
});

// 1. Await the rejected Promise assertion:
await expect(
  service.bookHostel('u-student-3', 3),
).rejects.toThrow(ConflictException);

// 2. Prove downstream write was NEVER executed:
expect(mockPrisma.booking.create).toHaveBeenCalledTimes(0);`,
      },
      syntaxMap: [
        {
          syntax: 'await expect(promise).rejects.toThrow(ConflictException)',
          purpose: 'Waits for the async method to reject and verifies the error class or message substring.',
          pipelineCoverage: 'Fails the test immediately if the promise resolves instead of throwing!',
        },
        {
          syntax: 'expect(mockPrisma.booking.create).not.toHaveBeenCalled()',
          purpose: 'Asserts that zero database mutations occurred after the guard clause threw.',
          pipelineCoverage: 'Prevents "throw-after-write" bugs where a service writes data before checking invariants.',
        },
      ],
      architecturalDecisions: [
        {
          question: 'Why should every exception test ALSO assert `expect(writeSpy).not.toHaveBeenCalled()`?',
          antiPattern:
            'Only asserting `.rejects.toThrow(ConflictException)` won’t catch a bug where a developer accidentally placed `await this.prisma.booking.create(...)` *before* the `if (listing.roomsAvailable <= 0) throw new ConflictException()` check!',
          technicalReason:
            'In unit tests with mocked dependencies, no database transaction rollback happens automatically unless you verify that the mutation spy was never invoked.',
          bestPracticeRule:
            'Whenever you test a rejected guard clause (`NotFoundException`, `ConflictException`, `ForbiddenException`), pair `.rejects.toThrow(...)` with `expect(mutationSpy).not.toHaveBeenCalled()`.',
        },
      ],
    },

    {
      id: 'testing-ch5-supertest-e2e',
      number: '05',
      title: 'HTTP Pipeline Integration Testing with createNestApplication() & Supertest',
      subtitle: 'Boot the real NestJS HTTP pipeline in memory to test ValidationPipe, ParseIntPipe, and status codes.',
      relatedSubconceptId: 'testing-integration-supertest-overrides',
      kampusScenario:
        'To be 100% certain that `POST /e2e-escrow/checkout` rejects negative rent amounts with `400 Bad Request` and returns `201 Created` for valid payloads, we boot `const app = moduleRef.createNestApplication()`, attach `ValidationPipe`, and fire requests using `supertest`.',
      syntaxComparison: {
        leftTitle: '🏗️ Booting INestApplication with Global Pipes',
        leftCode: `const moduleRef = await Test.createTestingModule({
  controllers: [EscrowCheckoutController],
}).compile();

const app = moduleRef.createNestApplication();

// CRITICAL: main.ts does not run in tests!
// Attach the same global ValidationPipe used in production:
app.useGlobalPipes(
  new ValidationPipe({ whitelist: true, transform: true }),
);

await app.init();`,
        rightTitle: '🚀 Firing Supertest HTTP Requests',
        rightCode: `// 1. Valid DTO -> 201 Created
const validRes = await request(app.getHttpServer())
  .post('/e2e-escrow/checkout')
  .send({ listingId: 1, amount: 180 })
  .expect(201);

expect(validRes.body.escrowStatus).toBe('locked');

// 2. Invalid DTO (amount < 50) -> 400 Bad Request
await request(app.getHttpServer())
  .post('/e2e-escrow/checkout')
  .send({ listingId: 1, amount: 10 })
  .expect(400);

await app.close();`,
      },
      syntaxMap: [
        {
          syntax: 'moduleRef.createNestApplication()',
          purpose: 'Instantiates the full NestJS HTTP application wrapper around the compiled `TestingModule`.',
          pipelineCoverage: 'Mounts controllers, route paths, HTTP status codes, Guards, Pipes, Interceptors, and Filters.',
        },
        {
          syntax: 'await app.init() / await app.close()',
          purpose: 'Initializes all routes and lifecycle hooks before testing, and cleanly releases resources afterward.',
          pipelineCoverage: 'Prevents Jest "open handle" leaks at the end of the test run.',
        },
        {
          syntax: 'request(app.getHttpServer()).post(url).send(body).expect(status)',
          purpose: 'Executes an in-memory HTTP request and asserts the exact response status code.',
          pipelineCoverage: 'Full end-to-end HTTP serialization, validation, and error formatting.',
        },
      ],
      architecturalDecisions: [
        {
          question: 'Why does `request(app.getHttpServer())` work without calling `await app.listen(3000)`?',
          antiPattern:
            'Hardcoding `await app.listen(3000)` inside tests causes `EADDRINUSE: address already in use :::3000` crashes whenever Jest runs multiple test files in parallel!',
          technicalReason:
            'Calling `await app.init()` mounts all NestJS routes onto the underlying HTTP server object (`app.getHttpServer()`). When `supertest` receives an un-listened server, it binds to an ephemeral OS-assigned port (`0`) for the duration of the request and closes it automatically.',
          bestPracticeRule:
            'Call `await app.init()` (never `app.listen(3000)`) in Supertest integration tests so suites run fast and in parallel without port collisions.',
        },
      ],
    },

    {
      id: 'testing-ch6-override-guards',
      number: '06',
      title: 'Swapping Guards & Providers with .overrideGuard() & .overrideProvider()',
      subtitle: 'Test protected routes and role-based endpoints cleanly without external auth servers.',
      relatedSubconceptId: 'testing-integration-supertest-overrides',
      kampusScenario:
        '`EscrowCheckoutController` is protected by `@UseGuards(StudentAuthGuard)`. In our integration test, we chain `.overrideGuard(StudentAuthGuard).useValue(...)` on `Test.createTestingModule()` to inject Student Adaobi (`req.user = { id: "u-student-3", role: "student" }`) into every test request.',
      syntaxComparison: {
        leftTitle: '🛡️ Overriding a Guard (.overrideGuard)',
        leftCode: `const moduleRef = await Test.createTestingModule({
  controllers: [EscrowCheckoutController],
})
  .overrideGuard(StudentAuthGuard)
  .useValue({
    canActivate: (ctx: ExecutionContext) => {
      const req = ctx.switchToHttp().getRequest();
      req.user = {
        id: 'u-student-3',
        email: 'ada@kampus.edu',
        role: 'student',
      };
      return true;
    },
  })
  .compile();`,
        rightTitle: '🔌 Overriding an Imported Module Provider (.overrideProvider)',
        rightCode: `const moduleRef = await Test.createTestingModule({
  imports: [ListingsModule], // Imports real module!
})
  .overrideProvider(PrismaService)
  .useValue(mockPrisma) // Swaps only PrismaService inside ListingsModule!
  .compile();`,
      },
      syntaxMap: [
        {
          syntax: '.overrideGuard(GuardClass).useValue(mockGuard)',
          purpose: 'Replaces a Guard attached via `@UseGuards(GuardClass)` while keeping the route decorator intact.',
          pipelineCoverage: 'Runs during the NestJS Guard phase before Pipes and Controllers.',
        },
        {
          syntax: '.overrideProvider(Token).useValue(mockValue)',
          purpose: 'Replaces any provider inside an imported `@Module` (e.g., `ListingsModule` or `AppModule`).',
          pipelineCoverage: 'Lets you import your real production `@Module` class and only swap external I/O boundaries.',
        },
        {
          syntax: '.overrideInterceptor(Interceptor).useValue(...)',
          purpose: 'Replaces an `@UseInterceptors(...)` class during integration testing.',
          pipelineCoverage: 'Useful for bypassing external telemetry or slow rate-limiting interceptors in tests.',
        },
      ],
      architecturalDecisions: [
        {
          question: 'When should you use `.overrideProvider(PrismaService)` vs passing `{ provide: PrismaService, useValue }` in `providers: [...]`?',
          antiPattern:
            'Manually re-listing 15 controllers and services inside `Test.createTestingModule({ controllers: [...], providers: [...] })` for an integration test duplicates your `@Module` definition and drifts out of sync.',
          technicalReason:
            'In a **Unit Test**, you pass `providers: [ServiceUnderTest, { provide: Dep, useValue: mock }]` because you only want 1 class. In an **Integration Test**, you pass `imports: [HostelModule]` to test your real module wiring and chain `.overrideProvider(PrismaService).useValue(mockPrisma)` to replace just the database client.',
          bestPracticeRule:
            'Use `{ provide, useValue }` in `providers` for single-class unit tests; use `imports: [FeatureModule]` + `.overrideProvider()` / `.overrideGuard()` for multi-class integration tests.',
        },
      ],
    },

    {
      id: 'testing-ch7-stateful-integration',
      number: '07',
      title: 'Testing Stateful Workflows: Idempotency, Caching & Atomic Rollbacks',
      subtitle: 'Write multi-step integration specs that prove double-clicks and race conditions never corrupt state.',
      relatedSubconceptId: 'testing-integration-supertest-overrides',
      kampusScenario:
        'What happens when Student Adaobi taps "Pay Rent Escrow" twice on a flaky 3G connection, or two students try to book the last room in Listing #3 at the exact same moment? Multi-step Supertest sequences verify that your API handles sequential state transitions and rollbacks accurately.',
      syntaxComparison: {
        leftTitle: '🔁 Multi-Step Supertest Sequence (Overbooking Guard)',
        leftCode: `// Step 1: First student books the last room in Listing #3 -> 201 Created
const firstRes = await request(app.getHttpServer())
  .post('/prisma-escrow/book-room')
  .send({ studentId: 'u-student-3', listingId: 3 })
  .expect(201);

expect(firstRes.body.remainingRooms).toBe(0);

// Step 2: Second booking on the same hostel -> 409 Conflict!
await request(app.getHttpServer())
  .post('/prisma-escrow/book-room')
  .send({ studentId: 'u-student-3', listingId: 3 })
  .expect(409);`,
        rightTitle: '🛡️ Idempotency-Key Replay Assertion',
        rightCode: `const key = 'idem-checkout-2026-001';

// Request 1: Deducts wallet once
const res1 = await request(app.getHttpServer())
  .post('/escrow/release')
  .set('Idempotency-Key', key)
  .send({ landlordId: 'u-landlord-2', listingId: 1, amount: 180 })
  .expect(201);

// Request 2 (Same Idempotency-Key): Replays receipt, zero double charge!
const res2 = await request(app.getHttpServer())
  .post('/escrow/release')
  .set('Idempotency-Key', key)
  .send({ landlordId: 'u-landlord-2', listingId: 1, amount: 180 })
  .expect(201);

expect(res2.body.studentBalance).toBe(res1.body.studentBalance);`,
      },
      syntaxMap: [
        {
          syntax: '.set("Idempotency-Key", key)',
          purpose: 'Attaches custom HTTP request headers (`Authorization`, `Idempotency-Key`, `x-campus-zone`) in Supertest.',
          pipelineCoverage: 'Read by `@Headers()`, Guards, and Middleware.',
        },
        {
          syntax: 'Sequential `await request(app.getHttpServer())` calls',
          purpose: 'Tests state transitions across multiple HTTP requests against the same in-memory application.',
          pipelineCoverage: 'Proves cache invalidation, idempotency replay, and atomic counter exhaustion.',
        },
      ],
      architecturalDecisions: [
        {
          question: 'Why test multi-request workflows (like cache invalidation or idempotency) in integration tests rather than single-request unit tests?',
          antiPattern:
            'Testing `createListing()` and `findListings()` in separate isolated unit tests with mocked caches cannot prove that the cache key deleted by `POST /listings` (`"kampus:listings:all"`) is identical to the cache key read by `GET /listings`!',
          technicalReason:
            'Stateful integration tests run multiple HTTP requests against the same in-memory `CacheManager` / `DatabaseService` instance, immediately catching key-naming mismatches (`"listings:all"` vs `"kampus:listings:all"`) or un-rolled-back mutations.',
          bestPracticeRule:
            'Always write at least one multi-request integration test (`POST` -> `GET` -> `POST` duplicate) for caching, idempotency, and inventory decrement endpoints.',
        },
      ],
    },
  ];

  global.NEST_TESTING_FULL_SPEC = NEST_TESTING_FULL_SPEC;
  global.NEST_TESTING_HARNESS_EXPLORER = NEST_TESTING_HARNESS_EXPLORER;
  global.NEST_TESTING_CHAPTERS = NEST_TESTING_CHAPTERS;
})(typeof window !== 'undefined' ? window : globalThis);

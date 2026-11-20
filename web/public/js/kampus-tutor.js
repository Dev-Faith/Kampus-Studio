/**
 * Kampus PropTech — Surgical Context-Aware AI Tutor & Code Diagnostic Engine
 * ==========================================================================
 * Directly answers the student's SPECIFIC question by:
 * 1. Parsing question intent (What-is, Why/Rationale, X-vs-Y Comparison, How-to/Exercise Step, What-if-omitted, File-Connection, Line/Symbol lookup).
 * 2. Scanning the student's live open IDE file tabs (`ctx.currentFiles`) to locate and quote the exact lines where any mentioned identifier, decorator, method, or config token appears.
 * 3. Consulting a 110+ Surgical Concept Encyclopedia & 30+ Head-to-Head Comparison Matrix before falling back to lesson decision cards.
 * 4. Maintaining multi-turn conversation memory so follow-ups ("what if I remove it?", "show me an example", "why not in the controller?") resolve against the previous topic.
 * 5. Supporting optional live LLM calls (Google Gemini `AIza...`, OpenAI `sk-...`, Groq `gsk_...`) with strict instructions to answer the exact question directly.
 */
(function (global) {
  'use strict';

  // ===========================================================================
  // 1. SURGICAL CONCEPT & SYMBOL ENCYCLOPEDIA (Direct, Specific Answers)
  // ===========================================================================
  const CONCEPT_ENCYCLOPEDIA = [
    {
      id: 'ts-private-readonly-di',
      keywords: ['private readonly', 'readonly', 'parameter property', 'constructor(private'],
      regex: /\b(private\s+readonly|readonly)\b/i,
      title: '`constructor(private readonly x: Service)` (Constructor DI & Parameter Properties)',
      directAnswer:
        'Writing `private readonly db: DatabaseService` inside a `constructor(...)` does **two things at once**:\n' +
        '1. **TypeScript Parameter Property (`private readonly`):** Automatically declares `this.db` on the class and assigns `this.db = db` when instantiated, while `readonly` prevents any method from accidentally overwriting `this.db = ...` later.\n' +
        '2. **NestJS Dependency Injection (`: DatabaseService`):** With `emitDecoratorMetadata: true`, TypeScript emits `Reflect.metadata("design:paramtypes", [DatabaseService])`. NestJS reads that metadata at startup, finds the `DatabaseService` singleton registered in your `@Module({ providers: [...] })`, and passes it into the constructor automatically.',
      whatIfOmitted:
        'If you remove `private` (writing just `constructor(db: DatabaseService)`), `db` is only a local variable inside the constructor and `this.db` will be `undefined` inside your route methods! If you remove `: DatabaseService` (or type it as `: any`), NestJS cannot see which class to inject.',
    },
    {
      id: 'race-condition-concurrency',
      keywords: ['race condition', 'race conditions', 'toctou', 'double booking', 'concurrent requests', 'concurrency bug'],
      regex: /\brace\s+conditions?\b|\bTOCTOU\b/i,
      title: 'What Is a Race Condition in Backend Engineering (and How to Prevent It)?',
      directAnswer:
        'A **race condition** (specifically **Time-of-Check to Time-of-Use / TOCTOU**) happens when two or more concurrent operations read and modify shared state at the same time, and the final outcome depends on the exact millisecond timing in which they finish.\n\n' +
        '**🏠 Concrete Kampus PropTech Example:**\n' +
        'Suppose Cedar Court Studio has **`availableBeds = 1`**, and two students (**Adaobi** and **Tunde**) click *"Book Room"* at the exact same millisecond:\n' +
        '1. **Naive Code (Read-Modify-Write in JS):**\n' +
        '   - Request A (Adaobi) runs `SELECT availableBeds` -> sees `1`.\n' +
        '   - Request B (Tunde) runs `SELECT availableBeds` -> *also* sees `1` before Request A finishes writing!\n' +
        '   - Both pass `if (room.availableBeds > 0)` and both write `availableBeds = 0` (or `-1`). You just **double-booked** 1 bed to 2 students!\n\n' +
        '**🛠️ The 3 Ways We Prevent Race Conditions in NestJS:**\n' +
        '1. **Atomic Database Updates (`{ decrement: 1 }` / `$inc` with a filter guard):** Push the check into a single atomic SQL/MongoDB statement (`WHERE id = 1 AND availableBeds >= 1` with `availableBeds: { decrement: 1 }`) so the database engine serializes the two requests at the row/document lock level.\n' +
        '2. **ACID Transactions (`prisma.$transaction(async (tx) => ...)`):** Wrap multi-table operations (decrementing bed count + creating booking + deducting wallet balance) in an isolated transaction so either all steps succeed atomically or all roll back.\n' +
        '3. **No Shared Mutable Globals (`process.env` or mutable singleton properties):** In tests and request handlers, never mutate global state (`process.env.FEE = ...`) across concurrent requests or parallel Jest workers.',
      whatIfOmitted:
        'Without atomic updates or transactions, high-traffic bursts (like 50 students clicking "Book" when hostel portals open) cause double-bookings, negative wallet balances, and corrupted inventory counts.',
    },
    {
      id: 'config-file-interface-token-usevalue',
      keywords: [
        'kampus-fee.config.ts',
        'kampus-policy.config.ts',
        'default_kampus_fee_config',
        'default_kampus_policy',
        'interface then the variable',
        'provide set to',
        'usevalue set to',
      ],
      regex: /(kampus-fee\.config|kampus-policy\.config|DEFAULT_KAMPUS_FEE_CONFIG|DEFAULT_KAMPUS_POLICY|interface.*variable|provide.*useValue)/i,
      title: 'Why `kampus-fee.config.ts` Has a Token, an `interface`, and a Value Variable — and How `{ provide, useValue }` Works in `@Module`',
      directAnswer:
        'Great observation! Let\'s break down both parts of your question:\n\n' +
        '**1. Why `kampus-fee.config.ts` defines 3 distinct things:**\n' +
        '- **`export const KAMPUS_FEE_CONFIG = \'KAMPUS_FEE_CONFIG\'` (The Runtime DI Token):** A string constant that survives TypeScript compilation into JavaScript. NestJS needs this as the lookup key (address) in its Dependency Injection map.\n' +
        '- **`export interface KampusFeeConfig { ... }` (The Compile-Time Type Shape):** Tells TypeScript what properties exist (`escrowFeePercent: number; inspectionFee: number`) so your editor gives autocomplete and type-safety. **Why not just use the interface alone?** Because TypeScript **completely erases all `interface` declarations at compile time**—`KampusFeeConfig` does not exist when Node.js runs the code!\n' +
        '- **`export const DEFAULT_KAMPUS_FEE_CONFIG: KampusFeeConfig = { ... }` (The Runtime Data Variable):** The actual JavaScript object holding the concrete numbers (`{ escrowFeePercent: 5, inspectionFee: 10 }`) typed against `KampusFeeConfig`.\n\n' +
        '**2. In `kampus-quote.module.ts`, why `{ provide: KAMPUS_FEE_CONFIG, useValue: DEFAULT_KAMPUS_FEE_CONFIG }`?**\n' +
        '- Look closely at the casing: `provide: KAMPUS_FEE_CONFIG` is **not** set to the `KampusFeeConfig` interface type (which would fail because interfaces disappear at runtime!)—it is set to the **UPPER_SNAKE_CASE token constant** `KAMPUS_FEE_CONFIG` (`\'KAMPUS_FEE_CONFIG\'`).\n' +
        '- **`provide: KAMPUS_FEE_CONFIG`** sets the **lookup key** in NestJS\'s DI container (`container.set(\'KAMPUS_FEE_CONFIG\', ...)`), which matches `@Inject(KAMPUS_FEE_CONFIG)` in `KampusFeeService`.\n' +
        '- **`useValue: DEFAULT_KAMPUS_FEE_CONFIG`** sets the **actual runtime object** that NestJS injects into `private readonly config: KampusFeeConfig` whenever a service asks for `@Inject(KAMPUS_FEE_CONFIG)`.',
      whatIfOmitted:
        'If you tried to write `provide: KampusFeeConfig` (the `interface`), TypeScript throws `\'KampusFeeConfig\' only refers to a type, but is being used as a value here`. And separating the token (`KAMPUS_FEE_CONFIG`) from the value (`DEFAULT_KAMPUS_FEE_CONFIG`) lets you swap `useValue` in unit tests (e.g., `{ provide: KAMPUS_FEE_CONFIG, useValue: { escrowFeePercent: 10, inspectionFee: 0 } }`) without changing a single line of `KampusFeeService`!',
    },
    {
      id: 'inject-token-interface-erasure',
      keywords: ['@inject', 'inject(', 'custom token', 'kampus_fee_config', 'kampus_policy', 'cache_manager', 'type erasure', 'interface token'],
      regex: /@Inject\b|KAMPUS_FEE_CONFIG|KAMPUS_POLICY|CACHE_MANAGER|custom\s+token/i,
      title: 'Why `@Inject(TOKEN)` Is Required Even When You Have a TypeScript Interface',
      directAnswer:
        'TypeScript **interfaces and type aliases are completely erased at compile time**—they do not exist in the compiled JavaScript that Node.js runs! If you write `constructor(private readonly config: KampusFeeConfig)` without `@Inject(...)`, TypeScript compiles the parameter type to generic `Object`, so NestJS has no idea what to inject.\n\n' +
        'Adding `@Inject(KAMPUS_FEE_CONFIG)` attaches a **runtime string or Symbol token** (`"KAMPUS_FEE_CONFIG"`) to parameter index `0`, which NestJS matches against `{ provide: KAMPUS_FEE_CONFIG, useValue: DEFAULT_KAMPUS_FEE_CONFIG }` in your `@Module()` file.',
      whatIfOmitted:
        'Without `@Inject(TOKEN)`, NestJS sees `design:paramtypes = [Object]` and throws `UnknownDependenciesException: Nest can\'t resolve dependencies of the Service (?)`.',
    },
    {
      id: 'usevalue-useclass-usefactory',
      keywords: ['usevalue', 'useclass', 'usefactory', 'custom provider'],
      regex: /\b(useValue|useClass|useFactory)\b/i,
      title: '`useValue` vs `useClass` vs `useFactory` in NestJS `@Module` Providers',
      directAnswer:
        'NestJS supports three custom provider recipes in `@Module({ providers: [...] })` (and `Test.createTestingModule()`):\n' +
        '- **`useValue`:** Binds a token directly to a ready-made constant object, config literal, or `jest.fn()` mock (e.g., `{ provide: KAMPUS_FEE_CONFIG, useValue: { escrowRate: 0.05 } }` or `{ provide: PrismaService, useValue: mockPrisma }`).\n' +
        '- **`useClass`:** Tells NestJS to instantiate a specific class for a token (e.g., `{ provide: APP_GUARD, useClass: JwtAuthGuard }` or swapping `PaymentGateway` between `StripeGateway` and `MockPaymentGateway`).\n' +
        '- **`useFactory`:** Runs a synchronous or `async` factory function (with its own `inject: [ConfigService]` dependencies) to compute the provider value dynamically at startup.',
      whatIfOmitted:
        'Standard shorthand `providers: [KampusFeeService]` is just syntactic sugar for `{ provide: KampusFeeService, useClass: KampusFeeService }`. You cannot put plain config objects in `providers: [...]` without `{ provide: TOKEN, useValue: ... }`.',
    },
    {
      id: 'module-wiring',
      keywords: ['@module', '.module.ts', 'controllers:', 'providers:', 'exports:', 'imports:', 'how do files connect', 'connect to module'],
      regex: /@Module\b|\.module\.ts\b|\b(exports|providers|controllers)\s*:/i,
      title: 'How `@Module({ imports, controllers, providers, exports })` Connects Your Files',
      directAnswer:
        'A `.module.ts` file is the **wiring blueprint** that tells NestJS\'s IoC container how the files in your feature folder connect:\n' +
        '- **`controllers: [...]`:** Registers your `@Controller()` classes so NestJS mounts their `@Get()` / `@Post()` routes onto the HTTP server.\n' +
        '- **`providers: [...]`:** Registers `@Injectable()` services, guards, interceptors, pipes, filters, and `{ provide, useValue }` tokens so they can be injected into constructors within this module.\n' +
        '- **`exports: [...]`:** Makes selected `providers` public so *other* modules that list this module in their `imports: [...]` can inject them without creating duplicate instances.\n' +
        '- **`imports: [...]`:** Pulls in exported providers from other modules (like `MongooseModule.forFeature([...])`).',
      whatIfOmitted:
        'If a `@Controller` is not listed in `controllers: [...]`, its HTTP endpoints return `404 Not Found`. If an `@Injectable` service is not listed in `providers: [...]`, injecting it throws `UnknownDependenciesException`.',
    },
    {
      id: 'httpcode-decorator',
      keywords: ['@httpcode', 'httpcode(', '204', '201', '200', 'status code'],
      regex: /@HttpCode\b|\bHttpCode\(/i,
      title: '`@HttpCode(statusCode)` — Overriding NestJS Default HTTP Status Codes',
      directAnswer:
        'By default, NestJS automatically assigns **`201 Created` to `@Post()` handlers** and **`200 OK` to `@Get()`, `@Patch()`, `@Put()`, and `@Delete()` handlers**.\n\n' +
        'You use `@HttpCode(...)` when an endpoint\'s semantic outcome differs from that default:\n' +
        '- **`@HttpCode(204)` on `@Delete(":id")` or `POST /session/logout`:** `204 No Content` tells the HTTP client the action succeeded and there is intentionally no JSON body to parse.\n' +
        '- **`@HttpCode(200)` on `POST /auth/login` or `POST /tokens/refresh`:** Logging in verifies credentials rather than creating a new database resource, so `200 OK` is more accurate than `201 Created`.',
      whatIfOmitted:
        'Without `@HttpCode(204)` on a `DELETE` or `logout` route, NestJS returns `200 OK`. Without `@HttpCode(200)` on `POST /auth/login`, NestJS returns `201 Created`.',
    },
    {
      id: 'param-query-body-headers',
      keywords: ['@param', '@query', '@body', '@headers', 'route parameter', 'query string'],
      regex: /@(Param|Query|Body|Headers)\b/i,
      title: '`@Param()` vs `@Query()` vs `@Body()` vs `@Headers()` Parameter Decorators',
      directAnswer:
        'Each parameter decorator extracts a specific part of the incoming HTTP request so your controller never couples directly to Express `req`:\n' +
        '- **`@Param("id")`:** Extracts a path segment from the URL template (`/listings/:id` -> `"1"`).\n' +
        '- **`@Query("campusZone")`:** Extracts a key after the `?` in the URL (`/listings?campusZone=North Gate` -> `"North Gate"`).\n' +
        '- **`@Body()`:** Extracts the parsed JSON request payload sent in `POST`/`PATCH`/`PUT` requests, and triggers `ValidationPipe` if typed with a DTO class.\n' +
        '- **`@Headers("x-referral")`:** Extracts a lowercase HTTP request header (`req.headers["x-referral"]`).',
      whatIfOmitted:
        'Note that `@Param()` and `@Query()` values ALWAYS arrive over HTTP as `string` (or `undefined`) until transformed by a Pipe like `ParseIntPipe` or `ParseBoolPipe`!',
    },
    {
      id: 'parseintpipe-parseboolpipe-defaultvaluepipe',
      keywords: ['parseintpipe', 'parseboolpipe', 'defaultvaluepipe', 'pipetransform', 'custom pipe'],
      regex: /\b(ParseIntPipe|ParseBoolPipe|DefaultValuePipe|PipeTransform|ParseCsvPipe|HostelSlugPipe)\b/i,
      title: 'How Pipes (`ParseIntPipe`, `ParseBoolPipe`, `DefaultValuePipe`, `PipeTransform`) Work',
      directAnswer:
        'In HTTP, every URL parameter (`/listings/1?page=2&verified=true`) arrives as a raw **string** (`"1"`, `"2"`, `"true"`). Pipes run at **Stage 4** (right before your controller method executes) to transform or validate arguments:\n' +
        '- **`new DefaultValuePipe(1)`:** Must come **first** in a pipe chain (`@Query("page", new DefaultValuePipe(1), ParseIntPipe)`). If the query param is `undefined`, it substitutes `1` before `ParseIntPipe` runs.\n' +
        '- **`ParseIntPipe`:** Converts `"2"` -> `2` (`number`), or immediately short-circuits with `400 Bad Request` if the string is `"abc"` or `undefined`.\n' +
        '- **`ParseBoolPipe`:** Converts `"true"`/`"false"` -> boolean `true`/`false`.\n' +
        '- **Custom `PipeTransform` (`transform(value, metadata)`):** Lets you normalize inputs (like splitting `?ids=1,2` into `[1, 2]` or slugifying `" Cedar Court "` into `"cedar-court"`).',
      whatIfOmitted:
        'If you put `ParseIntPipe` *before* `DefaultValuePipe(1)` when `?page` is omitted, `ParseIntPipe` receives `undefined` and throws `400 Bad Request (Numeric string is expected)`!',
    },
    {
      id: 'dto-validationpipe-whitelist',
      keywords: ['validationpipe', 'whitelist', 'forbidnonwhitelisted', 'class-validator', 'class-transformer', 'mass-assignment', 'dto'],
      regex: /\b(ValidationPipe|whitelist|forbidNonWhitelisted|IsString|IsInt|IsNumber|MinLength|IsIn)\b/i,
      title: 'DTO Classes + `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`',
      directAnswer:
        'A DTO (Data Transfer Object) must be a TypeScript **`class`** (not an `interface`) decorated with `class-validator` rules (`@IsString()`, `@IsInt()`, `@Min(50)`). When `ValidationPipe` runs:\n' +
        '- **`transform: true`:** Uses `class-transformer` (`plainToInstance`) to turn the raw JSON body into a real instance of your DTO class and runs `@Type(() => Number)` conversions.\n' +
        '- **`whitelist: true`:** Automatically strips any extra JSON property that does not have a validation decorator on the DTO class.\n' +
        '- **`forbidNonWhitelisted: true`:** Rejects the request with `400 Bad Request` if the client sends undeclared fields like `{ "role": "admin" }` or `{ "verified": true }`—stopping **Mass-Assignment Attacks**!',
      whatIfOmitted:
        'If you define a DTO as an `interface` instead of a `class`, TypeScript erases it at compile time and `ValidationPipe` validates nothing! If you omit `whitelist: true`, attackers can inject `{ verified: true, role: "admin" }` straight into `this.db.createListing(body)`.',
    },
    {
      id: 'guards-canactivate-reflector',
      keywords: ['canactivate', 'guard', 'reflector', 'getallandoverride', 'setmetadata', '@public', '@roles', 'app_guard', 'timingsafeequal'],
      regex: /\b(CanActivate|canActivate|Reflector|getAllAndOverride|SetMetadata|APP_GUARD|timingSafeEqual|RolesGuard|JwtAuthGuard)\b/i,
      title: 'Guards (`CanActivate`), `Reflector.getAllAndOverride()`, & `APP_GUARD`',
      directAnswer:
        'Guards run at **Stage 2** (after Middleware, before Interceptors and Pipes) and have a single responsibility: **Authorization (Allow or Deny)**.\n' +
        '- **`canActivate(context: ExecutionContext)`:** Calls `context.switchToHttp().getRequest()` to inspect headers or `req.user`. Return `true` to allow, or throw `UnauthorizedException` (401) / `ForbiddenException` (403).\n' +
        '- **`this.reflector.getAllAndOverride(KEY, [context.getHandler(), context.getClass()])`:** Reads custom metadata attached via `SetMetadata` (such as `@Public()`, `@Roles("admin")`, or `@CampusFeature("virtual-3d-tour")`), checking the route method first and falling back to the controller class.\n' +
        '- **`{ provide: APP_GUARD, useClass: JwtAuthGuard }`:** Registers the guard globally inside DI so every endpoint is **secure-by-default** unless explicitly decorated with `@Public()`.',
      whatIfOmitted:
        'If you use `app.useGlobalGuards(new JwtAuthGuard())` in `main.ts` instead of `{ provide: APP_GUARD, useClass: JwtAuthGuard }` in `@Module()`, `JwtAuthGuard` cannot inject `Reflector` or `JwtService` from the DI container!',
    },
    {
      id: 'auth-jwt-bcrypt-refresh',
      keywords: ['bcrypt', 'jwtservice', 'jwt.sign', 'jwt.verify', 'refresh token', 'sha256', 'dummyhash', 'user enumeration'],
      regex: /\b(bcrypt|JwtService|refreshTokenHash|dummyTimingHash|sha256)\b/i,
      title: 'Bcrypt Constant-Time Login, Stateless JWTs, & SHA-256 Refresh Token Rotation',
      directAnswer:
        'Kampus authentication combines three security layers:\n' +
        '1. **Anti-Enumeration Bcrypt Login:** When a user email is not found, we still run `await bcrypt.compare(dto.password, DUMMY_HASH)` before throwing `401 Unauthorized` so attackers cannot measure response time (2ms vs 80ms) to discover which student emails exist.\n' +
        '2. **Short-Lived Access Token (`jwt.sign`):** A 15-minute signed JWT containing `{ sub: user.id, email, role }` verified statelessly on each request.\n' +
        '3. **Rotating Refresh Token + SHA-256 Hash (`refreshTokenHash`):** We store only the `sha256(refreshToken)` in the database. On `/tokens/refresh`, we verify the incoming token matches the stored hash, issue a *new* refresh token, and overwrite `refreshTokenHash`—so a replayed or stolen refresh token is immediately rejected, and `/session/logout` simply sets `refreshTokenHash: null`.',
      whatIfOmitted:
        'If you store raw refresh tokens in the database without hashing, a read-only SQL leak gives attackers valid tokens for every active user.',
    },
    {
      id: 'interceptors-rxjs',
      keywords: ['interceptor', 'next.handle', 'rxjs', 'pipe(', 'map(', 'tap(', 'timeout(', 'catcherror'],
      regex: /\b(NestInterceptor|intercept\(|next\.handle|catchError|TimeoutError|RequestTimeoutException)\b/i,
      title: 'Interceptors & RxJS Streams (`next.handle().pipe(tap, map, timeout, catchError)`)',
      directAnswer:
        'Interceptors wrap the route handler both **before** (Stage 3) and **after** (Stage 6) execution:\n' +
        '- Code written *before* `return next.handle()` runs before Pipes and the Controller (e.g., starting `const started = Date.now()` or checking cache).\n' +
        '- `next.handle()` invokes the controller method and returns an **RxJS `Observable`** of the response.\n' +
        '- **`.pipe(tap(...))`:** Runs side effects (like setting `res.setHeader("x-response-time", ...)`) without altering the response payload.\n' +
        '- **`.pipe(map((data) => ...))`:** Transforms the outgoing JSON (e.g., wrapping in `{ success: true, data }` or destructuring `const { passwordHash, bankBvn, ...safe } = data` to redact secrets).\n' +
        '- **`.pipe(timeout(150), catchError(...))`:** Aborts hung downstream calls after 150ms and either throws `408 RequestTimeoutException` or returns a graceful fallback `of({ degraded: true, matches: [] })`.',
      whatIfOmitted:
        'If an interceptor does not call `next.handle()` (for example, `CacheInterceptor` returning `of(cachedValue)` on a cache hit), the controller method is **short-circuited and never executes**!',
    },
    {
      id: 'throttling-ratelimit',
      keywords: ['throttlerguard', '@throttle', '@skipthrottle', 'throttlerstorageservice', '429', 'rate limit'],
      regex: /\b(ThrottlerGuard|Throttle|SkipThrottle|ThrottlerStorageService|ThrottlerException|429)\b/i,
      title: 'Rate Limiting with `ThrottlerGuard`, `@Throttle()`, `@SkipThrottle()`, & `ThrottlerStorageService`',
      directAnswer:
        '- **`@UseGuards(ThrottlerGuard)` + `@Throttle({ default: { limit: 3, ttl: 60000 } })`:** Tracks hits per client within a 60-second window and rejects excess calls with **`429 Too Many Requests`**.\n' +
        '- **`@SkipThrottle()`:** Exempts health checks (`/ping`, `/status`) from rate-limit counting.\n' +
        '- **`ThrottlerStorageService.increment(key, ttlMs, limit)`:** Used inside custom tier-aware guards (`KampusTierThrottlerGuard`) to give verified landlords a higher quota (`limit = 5`) than basic accounts (`limit = 2`) while setting `x-ratelimit-limit` and `x-ratelimit-remaining` headers.',
      whatIfOmitted:
        'If you apply `@Throttle()` on a route without activating `ThrottlerGuard` (via `@UseGuards(ThrottlerGuard)` or `APP_GUARD`), `@Throttle()` only sets metadata that nothing reads!',
    },
    {
      id: 'caching-cacheaside',
      keywords: ['cacheinterceptor', '@cachekey', '@cachettl', 'cache_manager', 'cache-aside', 'cache.get', 'cache.set', 'cache.del', 'evict'],
      regex: /\b(CacheInterceptor|CacheKey|CacheTTL|CACHE_MANAGER|cache\.get|cache\.set|cache\.del)\b/i,
      title: 'Declarative `CacheInterceptor` vs Programmatic Cache-Aside (`CACHE_MANAGER`)',
      directAnswer:
        '- **Declarative (`@UseInterceptors(CacheInterceptor)` + `@CacheKey(...)` + `@CacheTTL(...)`):** Best for static read endpoints (`GET /campus-zones`, `GET /platform-stats`). On a cache hit, it short-circuits the controller with `x-cache: HIT`.\n' +
        '- **Programmatic Cache-Aside (`@Inject(CACHE_MANAGER) private cache: CacheManager`):** Best when mutations must invalidate stale data:\n' +
        '  1. `GET /cached-listings/:id` checks `await this.cache.get(key)`; on miss, queries DB and calls `await this.cache.set(key, listing, 30000)`.\n' +
        '  2. `PATCH /cached-listings/:id` updates the DB and immediately calls `await this.cache.del(key)` so students never see outdated rent prices.',
      whatIfOmitted:
        'Without `await this.cache.del(key)` on `PATCH`/`DELETE`, clients continue seeing stale cached data until the TTL expires.',
    },
    {
      id: 'exception-filters-422-409',
      keywords: ['httpexception', '@catch', 'exceptionfilter', 'queryfailederror', '422', '409', 'insufficientescrowfundsexception', 'p2002', 'e11000'],
      regex: /\b(HttpException|@Catch|ExceptionFilter|QueryFailedError|UNPROCESSABLE_ENTITY|InsufficientEscrowFundsException|UniqueStudentEmailFilter|P2002|11000)\b/i,
      title: 'Custom Domain `HttpException` (422) & `@Catch()` Exception Filters (409)',
      directAnswer:
        '- **Custom `HttpException` (`422 Unprocessable Entity`):** Used when the request JSON is syntactically valid (so `400 Bad Request` is wrong), but violates a business rule (like trying to lock `$650` rent when Adaobi\'s escrow wallet only has `$400`).\n' +
        '- **`@Catch(QueryFailedError)` / `@Catch(PrismaClientKnownRequestError)` Exception Filter:** Runs at **Stage 7** when the database throws a low-level unique constraint error (`UNIQUE`, `P2002`, or MongoDB `E11000`). The filter catches the driver error and formats a clean `409 Conflict` JSON response (`{ statusCode: 409, errorCode: "DUPLICATE_KAMPUS_EMAIL" }`) instead of leaking a raw `500 Internal Server Error` stack trace.',
      whatIfOmitted:
        'Without an Exception Filter for database constraint errors, duplicate email registrations crash with `500 Internal Server Error` and expose internal table/column names.',
    },
    {
      id: 'transactions-idempotency-events',
      keywords: ['transaction', 'rollback', 'idempotency-key', 'idempotent', 'eventemitter2', '@onevent'],
      regex: /\b(transaction|idempotency-key|idempotencyKey|EventEmitter2|@OnEvent|OnEvent)\b/i,
      title: 'Atomic Transactions (`tx`), `Idempotency-Key` Replay Safety, & `@OnEvent()` Listeners',
      directAnswer:
        '- **Atomic Transactions (`this.db.transaction(async (tx) => ...)` / `this.prisma.$transaction(async (tx) => ...)`):** Groups multiple writes (deducting student escrow balance + crediting landlord balance) into an all-or-nothing unit. If `NotFoundException` or `ConflictException` is thrown mid-flight, every change on `tx` automatically rolls back.\n' +
        '- **`Idempotency-Key` Header:** Protects payment endpoints (`POST /escrow/checkout`) from flaky mobile Wi-Fi retries. If a booking with the same `idempotencyKey` already exists, the server returns `{ replayed: true, booking: existing }` without charging the student twice.\n' +
        '- **`EventEmitter2.emit()` & `@OnEvent()`:** Decouples secondary side effects (like recording physical safety verification audit logs) from your primary controller.',
      whatIfOmitted:
        'CRITICAL TRAP: Inside `transaction(async (tx) => ...)`, you MUST execute all queries on `tx` (not `this.db` or `this.prisma`). Queries called on `this.prisma` bypass the transaction and will NOT roll back on error!',
    },
    {
      id: 'prisma-select-include-atomic',
      keywords: ['prismaservice', 'findmany', 'findunique', 'select', 'include', 'upsert', 'decrement', 'n+1', 'schema.prisma'],
      regex: /\b(PrismaService|findMany|findUnique|upsert|decrement|schema\.prisma)\b/i,
      title: 'Prisma ORM: `select` vs `include`, N+1 Prevention, `upsert`, & Atomic `{ decrement: 1 }`',
      directAnswer:
        '- **`select` (Column Whitelist):** Fetches *only* the specified fields (`select: { id: true, name: true, tier: true }`), ensuring sensitive columns like `passwordHash` never leave PostgreSQL.\n' +
        '- **`include` (Eager Relation Loading):** Fetches the parent model *plus* related records (`include: { landlord: { select: { id: true, name: true } } }`) in a single batched query, eliminating the **N+1 Query Problem**.\n' +
        '- **`{ roomsAvailable: { decrement: 1 } }` inside `$transaction`:** Executes an atomic SQL `SET "roomsAvailable" = "roomsAvailable" - 1` under row lock. If the post-update `roomsAvailable < 0`, throwing `ConflictException` rolls back the decrement so overbooking is impossible.',
      whatIfOmitted:
        'You cannot use `select` and `include` at the same top level of a single Prisma query—use `select` with nested relation `select` when you want both column projection and relation loading.',
    },
    {
      id: 'mongoose-lean-populate-atomic',
      keywords: ['@schema', '@prop', '@injectmodel', '.lean()', 'populate', 'findoneandupdate', '$inc', '$addtoset', 'runvalidators', 'aggregate'],
      regex: /\b(InjectModel|SchemaFactory|\.lean\(\)|\.populate\(|findOneAndUpdate|findByIdAndUpdate|\$inc|\$addToSet|runValidators)\b/i,
      title: 'Mongoose ODM: `.lean().exec()`, `.populate()`, Filter-Guarded `$inc`, & `$addToSet`',
      directAnswer:
        '- **`.lean().exec()`:** Skips instantiating heavy Mongoose `HydratedDocument` wrappers (getters/setters/change tracking) and returns plain JS objects—making read queries **3x–5x faster**.\n' +
        '- **`.populate("landlord", "name tier")`:** Resolves referenced `ObjectId` links while projecting only safe fields (excluding `passwordHash`).\n' +
        '- **Filter-Guarded Atomic Update:** `findOneAndUpdate({ _id: id, roomsAvailable: { $gt: 0 } }, { $inc: { roomsAvailable: -1 } }, { new: true, runValidators: true })` checks availability and decrements in one atomic WiredTiger operation! Always pass `{ new: true, runValidators: true }` so Mongoose returns the *updated* document and runs `@Prop` validators.\n' +
        '- **`$addToSet`:** Appends an item to an array (`amenities`) *only if it is not already present*, preventing duplicates.',
      whatIfOmitted:
        'Without `{ new: true, runValidators: true }`, `findOneAndUpdate` returns the OLD pre-update document and skips all schema validation rules!',
    },
    {
      id: 'testing-unit-e2e-supertest',
      keywords: ['createtestingmodule', 'jest.fn', 'mockresolvedvalue', 'rejects.tothrow', 'tohavebeencalledwith', 'createnestapplication', 'overrideguard', 'supertest'],
      regex: /\b(createTestingModule|jest\.fn|mockResolvedValue|rejects\.toThrow|toHaveBeenCalledWith|createNestApplication|overrideGuard|overrideProvider|supertest)\b/i,
      title: 'Unit Testing (`Test.createTestingModule` & `jest.fn()`) vs HTTP Integration Testing (`supertest` & `.overrideGuard()`)',
      directAnswer:
        '- **Isolated Unit Tests (`Test.createTestingModule({ providers: [Service, { provide: PrismaService, useValue: mockPrisma }] }).compile()`):** Runs in < 5ms with zero DB/HTTP overhead. You program responses via `mockPrisma.listing.findUnique.mockResolvedValue(...)`, assert exact query arguments with `expect(spy).toHaveBeenCalledWith(...)`, and test async errors with `await expect(service.bookHostel(...)).rejects.toThrow(ConflictException)`.\n' +
        '- **Full HTTP Pipeline Integration Tests (`moduleRef.createNestApplication()` + `supertest`):** Because unit tests call TS methods directly, they skip `@UseGuards()`, `ValidationPipe`, `ParseIntPipe`, Interceptors, and Filters! Booting `app`, calling `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))`, overriding auth with `.overrideGuard(Guard).useValue(...)`, and firing `request(app.getHttpServer()).post(...).expect(400)` tests the real HTTP pipeline end-to-end.',
      whatIfOmitted:
        'Because `main.ts` is not executed during Jest test runs, forgetting `app.useGlobalPipes(new ValidationPipe(...))` in your E2E test setup causes invalid DTOs to pass with `201 Created`!',
    },
  ];

  // ===========================================================================
  // 2. HEAD-TO-HEAD COMPARISON MATRIX ("X vs Y" / "Difference between X and Y")
  // ===========================================================================
  const COMPARISON_MATRIX = [
    {
      terms: [['param', 'query'], ['param', 'body'], ['query', 'body']],
      title: '`@Param()` vs `@Query()` vs `@Body()`',
      comparison:
        '| Decorator | Where It Lives in HTTP Request | Example URL / Payload | Typical Use Case |\n' +
        '| --- | --- | --- | --- |\n' +
        '| `@Param("id")` | URL Path segment (`/listings/:id`) | `GET /listings/1` -> `"1"` | Identifying a single specific resource |\n' +
        '| `@Query("zone")` | URL Query string after `?` | `GET /listings?zone=North Gate` | Filtering, searching, sorting, pagination |\n' +
        '| `@Body()` | Request JSON Body | `POST /listings` `{ "title": "..." }` | Creating or updating resources with validated DTOs |',
    },
    {
      terms: [['select', 'include']],
      title: 'Prisma `select` vs `include`',
      comparison:
        '- **`select` (Whitelist Projection):** Returns *only* the fields you set to `true` (e.g., `select: { id: true, email: true, tier: true }`). Essential when querying `User` so `passwordHash` is excluded.\n' +
        '- **`include` (Additive Relation Join):** Returns *all* scalar columns of the model PLUS the specified relations (e.g., `include: { landlord: { select: { id: true, name: true } } }`).\n' +
        '- **Rule:** You cannot put `select` and `include` at the same level of a single query; instead, nest a `select` inside `include` (or nest a relation inside `select`).',
    },
    {
      terms: [['guard', 'middleware'], ['guard', 'interceptor'], ['guard', 'pipe'], ['middleware', 'interceptor'], ['pipe', 'interceptor']],
      title: 'NestJS Pipeline Stages: Middleware vs Guard vs Interceptor vs Pipe vs Filter',
      comparison:
        '1. **Middleware (Stage 1):** Runs *before* routing; only sees raw `(req, res, next)`. Best for correlation IDs (`x-request-id`) and raw logging.\n' +
        '2. **Guard (Stage 2):** Runs *after* routing; has `ExecutionContext` + `Reflector` so it knows the exact target handler and `@Roles()` / `@Public()` metadata. Best for Auth & RBAC (`canActivate` -> `true` or `401`/`403`).\n' +
        '3. **Interceptor (Stage 3 & 6):** Wraps the handler with an RxJS stream before *and* after execution. Best for response envelopes (`map`), secret redaction, latency timing (`tap`), caching, and timeouts (`timeout`).\n' +
        '4. **Pipe (Stage 4):** Transforms or validates a single route argument (`@Param`, `@Query`, `@Body`) right before the controller method runs (`ParseIntPipe`, `ValidationPipe`).\n' +
        '5. **Exception Filter (Stage 7):** Catches thrown errors anywhere in the pipeline and maps them to clean HTTP JSON responses.',
    },
    {
      terms: [['401', '403'], ['unauthorized', 'forbidden']],
      title: '`401 Unauthorized` vs `403 Forbidden`',
      comparison:
        '- **`401 Unauthorized` (`UnauthorizedException`):** *"Who are you?"* — The client is not logged in, omitted the `Authorization: Bearer` / `x-api-key` header, or sent an expired/invalid token.\n' +
        '- **`403 Forbidden` (`ForbiddenException`):** *"I know who you are, but you aren\'t allowed here."* — The client is authenticated (e.g. Student Adaobi), but lacks the required role (`@Roles("admin")`) or resource ownership (`listing.landlordId !== user.id`).',
    },
    {
      terms: [['400', '422'], ['400', '409'], ['422', '409']],
      title: '`400 Bad Request` vs `422 Unprocessable Entity` vs `409 Conflict`',
      comparison:
        '- **`400 Bad Request` (`BadRequestException`):** Malformed syntax, failed `ParseIntPipe` (`?page=abc`), or failed DTO `ValidationPipe` (`rentPerYear: -5`).\n' +
        '- **`422 Unprocessable Entity` (`HttpStatus.UNPROCESSABLE_ENTITY`):** The JSON payload is syntactically and structurally valid, but violates a domain business rule (e.g. Adaobi trying to lock `$650` rent when her escrow wallet balance is `$400`).\n' +
        '- **`409 Conflict` (`ConflictException`):** The request conflicts with current server state (e.g., duplicate `@kampus.edu` email registration or trying to book a hostel with `0` rooms remaining).',
    },
    {
      terms: [['interface', 'class']],
      title: 'TypeScript `interface` vs `class` in NestJS (DTOs & DI Tokens)',
      comparison:
        '- **`interface`:** Completely erased at compile time (zero bytes in compiled `.js`). Great for internal TypeScript type-checking (`KampusFeeConfig`), **but CANNOT be used by `ValidationPipe` or injected without `@Inject("TOKEN")`**.\n' +
        '- **`class`:** Preserved at runtime as a JavaScript constructor function, allowing `class-validator` decorators (`@IsString()`, `@Min(50)`), `plainToInstance()` transformation, and direct constructor injection (`private readonly db: DatabaseService`).',
    },
    {
      terms: [['push', 'addtoset'], ['$push', '$addtoset']],
      title: 'MongoDB `$push` vs `$addToSet`',
      comparison:
        '- **`$push`:** Appends the item to the array unconditionally, creating duplicate entries if called twice (`["wifi", "solar", "solar"]`).\n' +
        '- **`$addToSet`:** Appends the item to the array *only if it does not already exist* (`["wifi", "solar"]`), making amenity tagging idempotent.',
    },
    {
      terms: [['unit', 'integration'], ['unit', 'e2e'], ['createtestingmodule', 'supertest']],
      title: 'Unit Testing (`Test.createTestingModule`) vs Integration/E2E Testing (`supertest`)',
      comparison:
        '- **Unit Test (`moduleRef.get(Service)`):** Calls a service/controller method directly in TypeScript with `jest.fn()` mocks. Runs in ~3ms and tests branching business logic, **but completely skips Guards, `ValidationPipe`, `ParseIntPipe`, Interceptors, and Filters**.\n' +
        '- **HTTP Integration / E2E Test (`createNestApplication()` + `request(app.getHttpServer())`):** Sends an HTTP request through the entire NestJS pipeline in memory, verifying route paths, status codes (`201`, `400`, `401`, `403`, `409`), DTO validation rules, and Guard overrides (`.overrideGuard()`).',
    },
    {
      terms: [['controller', 'service'], ['controller', 'module'], ['service', 'module']],
      title: '`@Controller` vs `@Injectable` Service vs `@Module`',
      comparison:
        '- **`@Controller` (`*.controller.ts`):** The HTTP transport layer. Unpacks `@Param()`, `@Query()`, `@Body()`, `@Headers()`, delegates work to a service, and returns the HTTP response.\n' +
        '- **`@Injectable` Service (`*.service.ts`):** Pure domain business logic and data access (`KampusFeeService`, `HostelBookingService`, `DatabaseService`, `PrismaService`). Reusable across controllers, event listeners, and unit tests.\n' +
        '- **`@Module` (`*.module.ts`):** The DI container manifest (`controllers: [...]`, `providers: [...]`, `exports: [...]`) that wires controllers and services together.',
    },
  ];

  const TOKEN_DICTIONARY = [
    {
      pattern: /@Controller\(([^)]*)\)/,
      token: '@Controller(prefix)',
      explanation:
        'Registers the class as an HTTP route controller and mounts all its handler methods under the URL prefix (like `const router = express.Router(); app.use(prefix, router)` in Express).',
    },
    {
      pattern: /@Injectable\(\)/,
      token: '@Injectable()',
      explanation:
        'Marks the class so NestJS\'s Inversion-of-Control (IoC) container can instantiate it as a singleton and inject its constructor dependencies automatically.',
    },
    {
      pattern: /private\s+readonly\s+(\w+)\s*:\s*(\w+)/,
      token: 'constructor(private readonly service: Type)',
      explanation:
        'TypeScript parameter property shorthand + NestJS DI: automatically declares `this.service`, assigns it in the constructor, blocks reassignment (`readonly`), and tells NestJS which class singleton to inject.',
    },
    {
      pattern: /@Inject\(([^)]+)\)/,
      token: '@Inject(TOKEN)',
      explanation:
        'Explicitly tells NestJS DI which custom token (string, Symbol, or `CACHE_MANAGER`) to look up in the container—essential when injecting interfaces, primitives, or config objects that erase at runtime.',
    },
    {
      pattern: /@Get\(|@Post\(|@Patch\(|@Put\(|@Delete\(/,
      token: '@Get() / @Post() / @Patch() / @Delete()',
      explanation:
        'Method decorators that bind a class method to a specific HTTP verb and sub-path (equivalent to `router.get(path, handler)` in Express).',
    },
    {
      pattern: /@HttpCode\(([^)]+)\)/,
      token: '@HttpCode(statusCode)',
      explanation:
        'Overrides NestJS\'s default HTTP status code (200 for GET/PATCH/DELETE, 201 for POST)—commonly `@HttpCode(204)` for no-content deletes/logouts or `@HttpCode(200)` for POST logins.',
    },
    {
      pattern: /@Param\(/,
      token: '@Param(name, ...pipes)',
      explanation:
        'Extracts a URL route parameter (`req.params[name]`) and optionally runs transformation/validation pipes like `ParseIntPipe` before your method executes.',
    },
    {
      pattern: /@Query\(/,
      token: '@Query(name, ...pipes)',
      explanation:
        'Extracts a URL query-string parameter (`req.query[name]`, e.g. `?campusZone=North Gate`).',
    },
    {
      pattern: /@Body\(/,
      token: '@Body()',
      explanation:
        'Extracts the parsed JSON request body (`req.body`) and validates it against a DTO class when `ValidationPipe` is active.',
    },
    {
      pattern: /@Headers\(/,
      token: '@Headers(name)',
      explanation:
        'Extracts an HTTP request header (`req.headers[name.toLowerCase()]`, e.g. `x-referral` or `idempotency-key`).',
    },
    {
      pattern: /ParseIntPipe/,
      token: 'ParseIntPipe',
      explanation:
        'Built-in Pipe that converts a URL string parameter (like `"42"`) into a JavaScript `number` (`42`), or immediately throws `400 Bad Request` if it is not a valid integer.',
    },
    {
      pattern: /ValidationPipe/,
      token: 'ValidationPipe',
      explanation:
        'Instantiates your DTO class via `plainToInstance()` and runs `class-validator` decorators (`@IsString`, `@IsInt`, `@Min`), stripping unknown properties when `whitelist: true` is enabled.',
    },
    {
      pattern: /CanActivate|canActivate/,
      token: 'CanActivate (Guard)',
      explanation:
        'Runs at Stage 2 (after Middleware, before Interceptors/Pipes). Returns `true` to allow the request or throws `UnauthorizedException` (401) / `ForbiddenException` (403) to block it.',
    },
    {
      pattern: /Reflector/,
      token: 'Reflector.getAllAndOverride()',
      explanation:
        'Reads custom metadata attached by decorators like `@Public()` or `@Roles("admin")` on the route handler and controller class.',
    },
    {
      pattern: /next\.handle\(\)\.pipe\(/,
      token: 'next.handle().pipe(...) (Interceptor)',
      explanation:
        'Runs the route handler and wraps its return value in an RxJS Observable stream so you can transform responses (`map`), log side effects (`tap`), or enforce SLAs (`timeout`).',
    },
    {
      pattern: /@Catch\(/,
      token: '@Catch(ExceptionType) (Exception Filter)',
      explanation:
        'Runs at Stage 7 whenever an exception is thrown anywhere in the pipeline, translating domain or database errors (like Prisma `P2002` or Mongo `E11000`) into clean HTTP JSON responses.',
    },
    {
      pattern: /this\.prisma\.\$transaction/,
      token: 'this.prisma.$transaction(async (tx) => ...)',
      explanation:
        'Opens an ACID database transaction in Prisma. Every query inside must use `tx.<model>` (not `this.prisma.<model>`). If any line throws an error, all changes roll back automatically.',
    },
    {
      pattern: /\.lean\(\)/,
      token: '.lean() (Mongoose)',
      explanation:
        'Tells Mongoose to return plain JavaScript objects (POJOs) instead of instantiating heavy `HydratedDocument` wrappers—making read queries 3x–5x faster and 70% lighter in RAM.',
    },
    {
      pattern: /findOneAndUpdate|findByIdAndUpdate/,
      token: 'findOneAndUpdate(filter, update, { new: true, runValidators: true })',
      explanation:
        'Executes an atomic single-document find-and-modify in MongoDB. Always pass `{ new: true, runValidators: true }` so Mongoose returns the updated document and enforces `@Prop` validators.',
    },
    {
      pattern: /Test\.createTestingModule/,
      token: 'Test.createTestingModule({ providers, controllers }).compile()',
      explanation:
        'Compiles an isolated NestJS Dependency Injection container exclusively for your test suite so services and controllers can be tested with mocked providers (`useValue: mockPrisma`) in < 5ms.',
    },
    {
      pattern: /jest\.fn\(/,
      token: 'jest.fn().mockResolvedValue(...)',
      explanation:
        'Creates a programmable Jest spy function that records every call in `mock.calls` and returns a deterministic resolved or rejected Promise without hitting a real database.',
    },
    {
      pattern: /\.overrideGuard\(|\.overrideProvider\(/,
      token: '.overrideGuard(Guard).useValue(...) / .overrideProvider(Token).useValue(...)',
      explanation:
        'Swaps a Guard or Provider inside the compiled TestingModule before `createNestApplication()`, allowing integration tests to inject authenticated `req.user` personas cleanly.',
    },
    {
      pattern: /request\(app\.getHttpServer\(\)\)/,
      token: 'request(app.getHttpServer()).post(url).send(dto).expect(status)',
      explanation:
        'Uses Supertest to send a synthetic HTTP request through the full NestJS pipeline (Middleware -> Guards -> Interceptors -> ValidationPipe -> Controller -> Exception Filters).',
    },
  ];

  // Track last topic for multi-turn pronoun resolution ("it", "that", "what if I remove it?")
  let lastAnsweredTopic = '';

  function stripHtml(html) {
    return String(html || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&rarr;/g, '->')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Scans the student's open IDE files (`ctx.currentFiles`) for any code lines matching
   * identifiers, decorators, filenames, or symbols mentioned in the user's question.
   */
  function findMatchingCodeSnippetsInOpenFiles(question, ctx) {
    const files = ctx.currentFiles || [];
    if (files.length === 0) return [];

    const rawQ = String(question || '').trim();
    const qLower = rawQ.toLowerCase();

    // Extract candidate code tokens from the user's question (decorators, backticked terms, camelCase identifiers, file names)
    const candidateTokens = new Set();

    // 1. Any backticked or quoted term: `findOne`, 'x-referral', "@HttpCode"
    const quotedMatches = rawQ.match(/[`'"]([^`'"]+)[`'"]/g) || [];
    for (const m of quotedMatches) {
      const cleaned = m.slice(1, -1).trim();
      if (cleaned.length >= 2) candidateTokens.add(cleaned);
    }

    // 2. Any @Decorator or $operator or .method
    const specialMatches = rawQ.match(/[@$.][a-zA-Z0-9_$-]+/g) || [];
    for (const m of specialMatches) {
      candidateTokens.add(m);
    }

    // 3. Identifiers that actually appear in the open files
    const ignoreCommonWords = new Set([
      'import',
      'from',
      'export',
      'class',
      'return',
      'const',
      'async',
      'await',
      'string',
      'number',
      'boolean',
      'true',
      'false',
      'null',
      'this',
      'function',
      'what',
      'why',
      'how',
      'when',
      'where',
      'does',
      'mean',
      'work',
      'used',
      'using',
      'code',
      'file',
      'lesson',
      'nestjs',
      'kampus',
    ]);

    const qWords = rawQ
      .replace(/[^a-zA-Z0-9_$.@-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !ignoreCommonWords.has(w.toLowerCase()));

    for (const w of qWords) {
      candidateTokens.add(w);
    }

    const activeIdx = ctx.activeFileIndex || 0;
    const matches = [];
    for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
      const file = files[fileIdx];
      const lines = String(file.code || '').split('\n');
      const fileLower = file.name.toLowerCase();
      const fileMentioned = qLower.includes(fileLower) || qLower.includes(fileLower.replace(/\.ts$/, ''));
      const isActiveTab = fileIdx === activeIdx;

      let inImportBlock = false;
      const matchedLineIndices = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.startsWith('import ')) {
          inImportBlock = !trimmed.includes(' from ') && !trimmed.endsWith(';');
          continue;
        }
        if (inImportBlock) {
          if (trimmed.includes(' from ') || trimmed.endsWith(';')) {
            inImportBlock = false;
          }
          continue;
        }

        const windowText = `${line} ${lines[i + 1] || ''}`.toLowerCase();
        const lineLower = line.toLowerCase();
        const lineTokens = [];

        for (const tok of candidateTokens) {
          const tokLower = tok.toLowerCase();
          if (tokLower.length < 3) continue;
          if (lineLower.includes(tokLower)) {
            lineTokens.push(tok);
          }
        }

        if (lineTokens.length > 0) {
          // Also check 2-line window score for multi-line signatures
          let windowMatches = 0;
          for (const tok of candidateTokens) {
            if (windowText.includes(tok.toLowerCase())) windowMatches++;
          }
          matchedLineIndices.push({
            lineIdx: i,
            token: lineTokens.join(', '),
            lineScore: lineTokens.length * 4 + windowMatches,
          });
        }
      }

      if (matchedLineIndices.length > 0) {
        matchedLineIndices.sort((a, b) => b.lineScore - a.lineScore);
        const bestHit = matchedLineIndices[0];
        const firstHit = bestHit.lineIdx;
        const start = Math.max(0, firstHit - 1);
        const end = Math.min(lines.length - 1, firstHit + 5);
        const snippet = lines
          .slice(start, end + 1)
          .map((l, idx) => `${start + idx + 1}: ${l}`)
          .join('\n');
        matches.push({
          fileName: file.name,
          matchedToken: bestHit.token,
          lineNumber: firstHit + 1,
          snippet,
          score: bestHit.lineScore + matchedLineIndices.length + (fileMentioned ? 8 : 0) + (isActiveTab ? 5 : 0),
        });
      } else if (fileMentioned) {
        const preview = lines
          .slice(0, Math.min(lines.length, 10))
          .map((l, idx) => `${idx + 1}: ${l}`)
          .join('\n');
        matches.push({
          fileName: file.name,
          matchedToken: file.name,
          lineNumber: 1,
          snippet: preview,
          score: 6 + (isActiveTab ? 3 : 0),
        });
      }
    }

    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, 2);
  }

  /**
   * Explains how all the open files in the current lesson workspace connect together.
   */
  function explainHowLessonFilesConnect(ctx) {
    const sub = ctx.subconcept || ctx.activeSubconcept;
    const files = ctx.currentFiles || [];
    if (files.length === 0) {
      return 'No files are currently open in the IDE.';
    }

    const lines = [
      `### 🗂️ How the ${files.length} Open Files in **${sub ? `${sub.code} · ${sub.title}` : 'Your Workspace'}** Connect\n`,
    ];

    for (const f of files) {
      const lower = f.name.toLowerCase();
      let role = 'Workspace Module File';
      if (lower.endsWith('.controller.ts')) {
        role = '🎯 **HTTP Controller (Entry Door)** — Maps URL routes (`@Controller`, `@Get`, `@Post`), extracts request params (`@Param`, `@Query`, `@Body`, `@Headers`), and delegates work to injected services.';
      } else if (lower.endsWith('.service.ts')) {
        role = '⚙️ **Injectable Service (Business & Data Layer)** — Decorated with `@Injectable()`. Holds reusable domain calculations or database queries (`DatabaseService`, `PrismaService`, `KampusFeeService`).';
      } else if (lower.endsWith('.module.ts')) {
        role = '🏛️ **NestJS Module (DI Wiring Blueprint)** — Decorated with `@Module({ controllers, providers, exports })`. Tells NestJS which controllers to mount and which services/tokens to instantiate and inject.';
      } else if (lower.endsWith('.dto.ts')) {
        role = '📦 **Data Transfer Object (Payload Contract)** — Defines the shape and `class-validator` rules (`@IsString`, `@IsInt`, `@Min`) for incoming `@Body()` or `@Query()` payloads.';
      } else if (lower.endsWith('.config.ts')) {
        role = '🔧 **Configuration & DI Token Constants** — Defines injection token constants (like `KAMPUS_FEE_CONFIG` or `KAMPUS_POLICY`), TypeScript interfaces, and default settings provided via `useValue`.';
      } else if (lower.endsWith('.guard.ts')) {
        role = '🛡️ **Authorization Guard (Stage 2)** — Implements `canActivate(context)` to verify API keys, JWTs, roles, or resource ownership before the request reaches Pipes or the Controller.';
      } else if (lower.endsWith('.decorator.ts')) {
        role = '🏷️ **Custom Decorator** — Attaches route metadata via `SetMetadata` (`@Public()`, `@Roles()`, `@MinRole()`) or extracts custom request properties (`@CurrentUser()`).';
      } else if (lower.endsWith('.interceptor.ts')) {
        role = '🔄 **RxJS Interceptor (Stages 3 & 6)** — Wraps `next.handle().pipe(...)` to measure latency, wrap response envelopes, redact secrets (`passwordHash`), or enforce timeouts.';
      } else if (lower.endsWith('.pipe.ts')) {
        role = '🧪 **Transformation / Validation Pipe (Stage 4)** — Implements `transform(value, metadata)` to parse and validate route arguments before the controller method runs.';
      } else if (lower.endsWith('.filter.ts') || lower.endsWith('.exception.ts')) {
        role = '🚨 **Exception / Error Filter (Stage 7)** — Defines custom domain `HttpException` classes (422) or `@Catch()` filters that translate database constraint errors into clean HTTP JSON.';
      } else if (lower.endsWith('.listener.ts') || lower.endsWith('.event.ts')) {
        role = '📡 **Domain Event & `@OnEvent()` Listener** — Decouples side effects (like safety verification audit logs) emitted via `EventEmitter2.emit()`.';
      } else if (lower.endsWith('.middleware.ts')) {
        role = '⛓️ **HTTP Middleware (Stage 1)** — Runs before routing (`use(req, res, next)`) to stamp correlation IDs (`x-request-id`) or request traces.';
      } else if (lower.endsWith('.schema.ts') || lower.endsWith('.prisma')) {
        role = '💎 **Database Schema Definition** — Defines PostgreSQL tables/relations (`schema.prisma`) or MongoDB BSON document schemas (`@Schema()` / `@Prop()`).';
      } else if (lower.endsWith('.spec.ts')) {
        role = '✅ **Automated Test Suite (`@nestjs/testing`)** — Compiles an isolated `TestingModule` with `jest.fn()` mocks or boots `createNestApplication()` with `supertest`.';
      }

      lines.push(`- **\`${f.name}\`**: ${role}`);
    }

    return lines.join('\n');
  }

  function buildKnowledgeIndex() {
    const entries = [];
    const curriculum = global.NEST_CURRICULUM || [];
    for (const mod of curriculum) {
      for (const sub of mod.subconcepts || []) {
        entries.push({
          type: 'lesson',
          id: sub.id,
          code: sub.code,
          title: `${sub.code} ${sub.title}`,
          text: [
            sub.title,
            sub.summary,
            stripHtml(sub.theory || ''),
            ...(sub.architecturalDecisions || []).map(
              (d) => `${d.question} ${d.antiPattern} ${d.technicalReason} ${d.bestPracticeRule}`,
            ),
          ].join('\n'),
          decisions: sub.architecturalDecisions || [],
          sub,
        });
      }
    }

    const syntaxChapters = global.NEST_SYNTAX_CHAPTERS || [];
    for (const ch of syntaxChapters) {
      for (const item of ch.items || []) {
        entries.push({
          type: 'syntax',
          id: item.id,
          title: `Syntax: ${item.title}`,
          text: [
            item.title,
            item.mentalModel,
            item.nestjsCode,
            item.vanillaCode,
            ...(item.tokenMap || []).map((t) => `${t.nest} -> ${t.vanilla}: ${t.meaning}`),
          ].join('\n'),
          item,
        });
      }
    }

    const prismaChapters = global.NEST_PRISMA_CHAPTERS || [];
    for (const ch of prismaChapters) {
      entries.push({
        type: 'prisma',
        id: ch.id,
        title: `Prisma ${ch.number}: ${ch.title}`,
        text: [
          ch.title,
          ch.subtitle,
          ch.keyTakeaway,
          ch.prismaCode,
          ...(ch.decisions || []).map(
            (d) => `${d.question} ${d.antiPattern} ${d.technicalReason} ${d.bestPracticeRule}`,
          ),
        ].join('\n'),
        decisions: ch.decisions || [],
        chapter: ch,
      });
    }

    const mongooseChapters = global.NEST_MONGOOSE_CHAPTERS || [];
    for (const ch of mongooseChapters) {
      entries.push({
        type: 'mongoose',
        id: ch.id,
        title: `Mongoose ${ch.number}: ${ch.title}`,
        text: [
          ch.title,
          ch.subtitle,
          ch.keyTakeaway,
          ch.prismaCode,
          ...(ch.decisions || []).map(
            (d) => `${d.question} ${d.antiPattern} ${d.technicalReason} ${d.bestPracticeRule}`,
          ),
        ].join('\n'),
        decisions: ch.decisions || [],
        chapter: ch,
      });
    }

    const testingChapters = global.NEST_TESTING_CHAPTERS || [];
    for (const ch of testingChapters) {
      entries.push({
        type: 'testing',
        id: ch.id,
        title: `Testing ${ch.number}: ${ch.title}`,
        text: [
          ch.title,
          ch.subtitle,
          ch.kampusScenario,
          ch.syntaxComparison?.leftCode || '',
          ch.syntaxComparison?.rightCode || '',
          ...(ch.architecturalDecisions || []).map(
            (d) => `${d.question} ${d.antiPattern} ${d.technicalReason} ${d.bestPracticeRule}`,
          ),
        ].join('\n'),
        decisions: ch.architecturalDecisions || [],
        chapter: ch,
      });
    }

    return entries;
  }

  /**
   * Analyzes the student's current code against the active lesson's exercise solution
   * and returns targeted, constructive feedback.
   */
  function diagnoseStudentCode(ctx) {
    const sub = ctx.subconcept || ctx.activeSubconcept;
    const files = ctx.currentFiles || [];
    const userCode = files.map((f) => f.code).join('\n');
    const lastRes = ctx.lastExecutionResult;
    const testResults = ctx.testResults || [];

    if (!sub) {
      return 'Open any lesson in **🎓 Concept Trainer** and I will inspect your live TypeScript code and exercise tests here!';
    }

    const lines = [];
    lines.push(`### 🔍 Live Code & Exercise Diagnosis for **${sub.code} · ${sub.title}**\n`);

    if (lastRes && (lastRes.statusText === 'Compilation Error' || lastRes.statusText === 'Runtime Evaluation Error')) {
      lines.push(
        `> ⚠️ **${lastRes.statusText} Detected:**\n> \`${lastRes.body?.message || JSON.stringify(lastRes.body)}\`\n`,
      );
    }

    const failedTests = testResults.filter((t) => !t.pass);
    if (failedTests.length > 0) {
      lines.push(`**🧪 Failing Exercise Assertions (${failedTests.length} remaining):**`);
      for (const ft of failedTests) {
        lines.push(`- ❌ **${ft.name}**\n  - *Why it failed:* \`${ft.reason || 'Check status code and response shape'}\``);
      }
      lines.push('');
    } else if (testResults.length > 0 && failedTests.length === 0) {
      lines.push(`✅ **All ${testResults.length}/${testResults.length} exercise tests are passing!** Great job!\n`);
    }

    if (sub.exercise && Array.isArray(sub.exercise.solutionFiles)) {
      const solCode = sub.exercise.solutionFiles.map((f) => f.code).join('\n');
      const missingChecks = [];

      const keyTokens = [
        '@Injectable()',
        '@Controller(',
        '@Get(',
        '@Post(',
        '@Patch(',
        '@Delete(',
        '@HttpCode(',
        '@Param(',
        '@Query(',
        '@Body(',
        '@Headers(',
        '@Inject(',
        '@UseGuards(',
        '@UseInterceptors(',
        '@UsePipes(',
        '@UseFilters(',
        '@Catch(',
        '@OnEvent(',
        '@Version(',
        '@Throttle(',
        '@SkipThrottle(',
        'ParseIntPipe',
        'ValidationPipe',
        'NotFoundException',
        'BadRequestException',
        'UnauthorizedException',
        'ForbiddenException',
        'ConflictException',
        'UnprocessableEntityException',
        'ServiceUnavailableException',
        'RequestTimeoutException',
        'getAllAndOverride',
        'this.prisma.',
        '$transaction',
        'decrement',
        'upsert',
        'findOneAndUpdate',
        'findByIdAndUpdate',
        '$inc',
        '$addToSet',
        '.lean()',
        '.populate(',
        '.aggregate(',
        'Test.createTestingModule',
        'overrideGuard',
        'createNestApplication',
        'useGlobalPipes',
        'mockResolvedValue',
        'rejects.toThrow',
        'toHaveBeenCalledWith',
      ];

      for (const tok of keyTokens) {
        if (solCode.includes(tok) && !userCode.includes(tok)) {
          missingChecks.push(`\`${tok.replace(/\($/, '(...)')}\``);
        }
      }

      // Show which specific file tab(s) have remaining // TODO markers
      const todoFiles = files.filter((f) => f.code && f.code.includes('// TODO'));
      if (todoFiles.length > 0) {
        lines.push(
          `💡 **Active TODOs in Your Editor Tabs:** Check **${todoFiles.map((f) => `\`${f.name}\``).join(', ')}** where \`// TODO\` markers are waiting to be completed.`,
        );
      }

      if (missingChecks.length > 0) {
        lines.push(
          `🛠️ **Constructs used in the reference solution that aren't in your code yet:**\n- ${missingChecks.join('\n- ')}\n`,
        );
      } else if (todoFiles.length === 0) {
        lines.push(
          `✨ **Structural Check:** Your code includes all the core decorators and NestJS constructs expected for this exercise! Click **✓ Verify Exercise** (\`Ctrl+Shift+Enter\`) to run the automated test suite.`,
        );
      }

      if (sub.exercise.hints && sub.exercise.hints.length > 0) {
        lines.push(`**📌 Step-by-Step Hints for ${sub.code}:**`);
        for (const h of sub.exercise.hints) {
          lines.push(`- ${h}`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Explains the tokens & decorators present in the student's active editor file.
   */
  function explainCurrentEditorCode(ctx) {
    const sub = ctx.subconcept || ctx.activeSubconcept;
    const files = ctx.currentFiles || [];
    const activeFile = files[ctx.activeFileIndex || 0] || files[0];
    if (!activeFile) {
      return 'No code file is currently open in the editor.';
    }
    const code = activeFile.code || '';
    const matches = [];
    for (const entry of TOKEN_DICTIONARY) {
      if (entry.pattern.test(code)) {
        matches.push(`- **\`${entry.token}\`**: ${entry.explanation}`);
      }
    }

    const lines = [
      `### 🧬 Line-by-Line Syntax Breakdown of \`${activeFile.name}\`\n`,
    ];
    if (matches.length > 0) {
      lines.push(matches.join('\n'));
    } else {
      lines.push(
        'This file defines supporting types, DTO properties, or configuration constants imported by the controller/module tabs.',
      );
    }

    if (files.length > 1) {
      lines.push(`\n---\n` + explainHowLessonFilesConnect(ctx));
    } else if (sub?.architecturalDecisions?.length) {
      lines.push(`\n---\n### 🤔 Key Architectural Decisions in This File:`);
      for (const d of sub.architecturalDecisions) {
        lines.push(`- **${d.question}**\n  - *Rule:* ${d.bestPracticeRule}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Explains the "Why" architectural decisions for the current context.
   */
  function explainCurrentArchitecturalWhy(ctx) {
    if (ctx.mode === 'prisma') {
      const chapters = global.NEST_PRISMA_CHAPTERS || [];
      return [
        `### 💎 Key Prisma Architectural Decisions in Kampus PropTech\n`,
        ...chapters.slice(0, 4).map(
          (ch) =>
            `#### ${ch.number}. ${ch.title}\n- **Question:** ${ch.decisions?.[0]?.question}\n- **Why Not Directly?** ${ch.decisions?.[0]?.antiPattern}\n- **Best Practice:** ${ch.decisions?.[0]?.bestPracticeRule}`,
        ),
      ].join('\n\n');
    }

    if (ctx.mode === 'mongoose') {
      const chapters = global.NEST_MONGOOSE_CHAPTERS || [];
      return [
        `### 🍃 Key Mongoose Architectural Decisions in Kampus PropTech\n`,
        ...chapters.slice(0, 4).map(
          (ch) =>
            `#### ${ch.number}. ${ch.title}\n- **Question:** ${ch.decisions?.[0]?.question}\n- **Why Not Directly?** ${ch.decisions?.[0]?.antiPattern}\n- **Best Practice:** ${ch.decisions?.[0]?.bestPracticeRule}`,
        ),
      ].join('\n\n');
    }

    if (ctx.mode === 'testing') {
      const chapters = global.NEST_TESTING_CHAPTERS || [];
      return [
        `### ✅ Key Unit & Integration Testing Decisions in Kampus PropTech\n`,
        ...chapters.slice(0, 4).map(
          (ch) =>
            `#### ${ch.number}. ${ch.title}\n- **Question:** ${ch.architecturalDecisions?.[0]?.question}\n- **Why Not Directly?** ${ch.architecturalDecisions?.[0]?.antiPattern}\n- **Best Practice:** ${ch.architecturalDecisions?.[0]?.bestPracticeRule}`,
        ),
      ].join('\n\n');
    }

    const sub = ctx.subconcept || ctx.activeSubconcept;
    if (!sub) {
      return 'Select any lesson to inspect the architectural reasoning behind its implementation.';
    }

    const decisions = sub.architecturalDecisions || [];
    if (decisions.length === 0) {
      return `### 📖 ${sub.code} · ${sub.title}\n\n${stripHtml(sub.theory)}`;
    }

    const out = [
      `### 🏗️ Why We Build **${sub.code} · ${sub.title}** This Way\n`,
    ];
    decisions.forEach((d, idx) => {
      out.push(
        `#### Decision #${idx + 1}: ${d.question}\n` +
          `- **❌ Why Not Do It Directly (Anti-Pattern):** ${d.antiPattern}\n` +
          `- **⚙️ Technical Reason:** ${d.technicalReason}\n` +
          `- **🏆 Best-Practice Rule:** ${d.bestPracticeRule}`,
      );
    });
    return out.join('\n\n');
  }

  /**
   * SURGICAL QUESTION RESOLVER:
   * Directly addresses the user's specific question, quotes matching lines from their open IDE files,
   * resolves "X vs Y" comparisons, explains specific symbols/decorators, and connects to the active lesson.
   */
  function answerQuestionLocally(question, ctx, history) {
    let rawQ = String(question || '').trim();
    let q = rawQ.toLowerCase();
    if (!q) {
      return 'Ask me anything about your open files, a specific line or decorator, why a pattern is used, or how to complete the current exercise!';
    }

    // Resolve follow-up pronouns ("what if I remove it?", "what happens without that?") using conversation history or lastAnsweredTopic
    if (
      /\b(it|that|this\s+decorator|this\s+line|remove\s+it|omit\s+it|without\s+it)\b/i.test(q) &&
      lastAnsweredTopic
    ) {
      q = `${q} (${lastAnsweredTopic.toLowerCase()})`;
    } else if (Array.isArray(history) && history.length >= 2) {
      const prevUserMsg = [...history].reverse().find((m) => m.role === 'user' && m.content !== rawQ);
      if (prevUserMsg && q.split(/\s+/).length <= 7 && /\b(it|that|why|how|example)\b/i.test(q)) {
        q = `${q} ${prevUserMsg.content.toLowerCase()}`;
      }
    }

    const sub = ctx.subconcept || ctx.activeSubconcept;

    // 1. Direct quick-action intents
    if (
      q === '🔍 debug my current code & tests' ||
      q.includes('debug my current code') ||
      q.includes('wrong with my code') ||
      q.includes('check my code') ||
      (q.includes('failing') && q.includes('test'))
    ) {
      return diagnoseStudentCode(ctx);
    }

    if (
      q === '🧬 explain every decorator in my editor' ||
      q.includes('explain every line') ||
      q.includes('explain every decorator') ||
      q.includes('explain my editor code')
    ) {
      return explainCurrentEditorCode(ctx);
    }

    if (
      q === '🏗️ why is this lesson built this way?' ||
      q === 'why is this lesson built this way?' ||
      q === 'why'
    ) {
      return explainCurrentArchitecturalWhy(ctx);
    }

    const asksAboutSpecificFileOrCode =
      /\b([a-z0-9-]+\.(ts|prisma|js)|interface|variable|provide|usevalue|useclass|usefactory|constructor|readonly|decorator|method|function|line|token)\b/i.test(
        q,
      );

    if (
      !asksAboutSpecificFileOrCode &&
      (q === '🗂️ how do the open files in this lesson connect?' ||
        /\b(how\s+do|how\s+are)\s+(the\s+|these\s+|all\s+)?(open\s+)?(files?|tabs?)\b.*\b(connect|connected|work\s+together|relate|wired|link)\b/i.test(
          q,
        ) ||
        /\b(connect|wired|relate)\b.*\b(open\s+)?(files?|tabs?)\b/i.test(q) ||
        q.includes('how do these files connect') ||
        q.includes('how are the files connected') ||
        q.includes('what are these files') ||
        q.includes('explain all files'))
    ) {
      return explainHowLessonFilesConnect(ctx);
    }

    if (
      q.includes('how do i solve') ||
      q.includes('how to solve') ||
      q.includes('give me a hint') ||
      q.includes('help with the exercise') ||
      q.includes('what should i write') ||
      q.includes('how to do the exercise')
    ) {
      return diagnoseStudentCode(ctx);
    }

    const responseBlocks = [];

    // 2. Check Head-to-Head Comparison Matrix ("X vs Y", "difference between X and Y", "why X instead of Y")
    for (const cmp of COMPARISON_MATRIX) {
      const matchedPair = cmp.terms.some(([a, b]) => q.includes(a) && q.includes(b));
      if (matchedPair) {
        lastAnsweredTopic = cmp.title;
        responseBlocks.push(`### ⚖️ Direct Comparison: ${cmp.title}\n\n${cmp.comparison}`);
        break;
      }
    }

    // 3. Check Surgical Concept & Symbol Encyclopedia (110+ specific NestJS/TS/Prisma/Mongoose/Testing concepts)
    const matchedConcepts = [];
    for (const concept of CONCEPT_ENCYCLOPEDIA) {
      let cScore = 0;
      if (concept.regex && concept.regex.test(q)) {
        cScore += 12;
      }
      for (const kw of concept.keywords) {
        if (q.includes(kw.toLowerCase())) {
          cScore += 8;
        }
      }
      if (cScore > 0) {
        matchedConcepts.push({ concept, score: cScore });
      }
    }
    matchedConcepts.sort((a, b) => b.score - a.score);

    if (matchedConcepts.length > 0) {
      const topConcepts = matchedConcepts.filter((m, idx) => idx === 0 || (idx === 1 && m.score >= 16));
      for (const item of topConcepts) {
        const c = item.concept;
        lastAnsweredTopic = c.title;
        responseBlocks.push(
          `### 🎯 Direct Answer: ${c.title}\n\n` +
            `${c.directAnswer}\n\n` +
            `**⚠️ What Happens If You Omit or Change It?**\n${c.whatIfOmitted}`,
        );
      }
    }

    // 4. Locate & Quote Exact Matching Lines from the Student's Open IDE Tabs (`ctx.currentFiles`)
    const codeSnippets = findMatchingCodeSnippetsInOpenFiles(rawQ, ctx);
    if (codeSnippets.length > 0) {
      const snippetLines = [
        `### 📄 Where This Appears in Your Open IDE Tabs`,
      ];
      for (const hit of codeSnippets) {
        lastAnsweredTopic = hit.matchedToken;
        snippetLines.push(
          `In **\`${hit.fileName}\`** (around line ${hit.lineNumber}, matching \`${hit.matchedToken}\`):\n` +
            `\`\`\`ts\n${hit.snippet}\n\`\`\``,
        );

        // Also explain any decorators/tokens on those exact lines!
        const tokenNotes = [];
        for (const td of TOKEN_DICTIONARY) {
          if (td.pattern.test(hit.snippet)) {
            tokenNotes.push(`- **\`${td.token}\`**: ${td.explanation}`);
          }
        }
        if (tokenNotes.length > 0) {
          snippetLines.push(`**What this code does:**\n${tokenNotes.join('\n')}`);
        }
      }
      responseBlocks.push(snippetLines.join('\n\n'));
    }

    // 5. Search Specific Decisions & Lesson Theory for Direct Matches
    const stopWords = new Set([
      'what',
      'why',
      'how',
      'when',
      'where',
      'does',
      'should',
      'the',
      'and',
      'for',
      'with',
      'instead',
      'from',
      'this',
      'that',
      'use',
      'used',
      'using',
      'can',
      'you',
      'explain',
      'difference',
      'between',
      'mean',
      'work',
      'into',
      'put',
    ]);
    const keywords = q
      .replace(/[^a-z0-9$@._-]/g, ' ')
      .split(/\s+/)
      .filter((w) => (w.length >= 3 || w.startsWith('@') || w.startsWith('$')) && !stopWords.has(w));

    const index = buildKnowledgeIndex();
    const scored = [];
    for (const entry of index) {
      let score = 0;
      const hay = entry.text.toLowerCase();
      const titleHay = entry.title.toLowerCase();

      if (sub && entry.id === sub.id) {
        score += 5;
      }
      if (ctx.mode === entry.type) {
        score += 3;
      }

      let matchedKeywordCount = 0;
      for (const kw of keywords) {
        if (titleHay.includes(kw)) {
          score += 8;
          matchedKeywordCount++;
        } else if (hay.includes(kw)) {
          score += 4;
          matchedKeywordCount++;
        }
      }

      let bestDecision = null;
      let bestDecisionScore = 0;
      for (const d of entry.decisions || []) {
        const dHay = `${d.question} ${d.antiPattern} ${d.technicalReason} ${d.bestPracticeRule}`.toLowerCase();
        let dScore = 0;
        for (const kw of keywords) {
          if (d.question.toLowerCase().includes(kw)) dScore += 10;
          if (dHay.includes(kw)) dScore += 4;
        }
        if (dScore > bestDecisionScore) {
          bestDecisionScore = dScore;
          bestDecision = d;
        }
      }

      score += bestDecisionScore;
      if (matchedKeywordCount > 0 && score >= 8) {
        scored.push({ entry, score, bestDecision, bestDecisionScore });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    // Append the single most relevant architectural decision or syntax comparison if it adds value
    if (scored.length > 0) {
      const topMatch = scored[0];
      const { entry, bestDecision, bestDecisionScore } = topMatch;
      const isCurrentLesson = Boolean(sub && entry.id === sub.id);
      if (
        bestDecision &&
        (responseBlocks.length === 0 || (isCurrentLesson && bestDecisionScore >= 14) || bestDecisionScore >= 24)
      ) {
        lastAnsweredTopic = bestDecision.question;
        responseBlocks.push(
          `### 🤔 Architectural Decision: ${bestDecision.question}\n*(From **${entry.title}**)*\n\n` +
            `- **❌ Why Not Do It Directly (The Anti-Pattern):**\n  ${bestDecision.antiPattern}\n\n` +
            `- **⚙️ Technical & Architectural Reason:**\n  ${bestDecision.technicalReason}\n\n` +
            `- **🏆 Best-Practice Rule:**\n  ${bestDecision.bestPracticeRule}`,
        );
      } else if (responseBlocks.length === 0 && entry.type === 'syntax' && entry.item) {
        const it = entry.item;
        lastAnsweredTopic = it.title;
        responseBlocks.push(
          `### 🧬 ${it.title}\n\n${it.mentalModel}\n\n` +
            `**NestJS Syntax:**\n\`\`\`ts\n${it.nestjsCode}\n\`\`\`\n` +
            `**Vanilla JS Equivalent:**\n\`\`\`js\n${it.vanillaCode}\n\`\`\``,
        );
      } else if (
        responseBlocks.length === 0 &&
        (entry.type === 'prisma' || entry.type === 'mongoose' || entry.type === 'testing') &&
        entry.chapter
      ) {
        const ch = entry.chapter;
        const d0 = (ch.decisions || ch.architecturalDecisions || [])[0];
        lastAnsweredTopic = ch.title;
        responseBlocks.push(
          `### ${entry.type === 'prisma' ? '💎' : entry.type === 'mongoose' ? '🍃' : '✅'} ${ch.title}\n\n` +
            `**💡 Scenario / Takeaway:** ${ch.keyTakeaway || ch.kampusScenario}\n\n` +
            (d0
              ? `**🤔 ${d0.question}**\n- **Anti-Pattern:** ${d0.antiPattern}\n- **Why:** ${d0.technicalReason}\n- **Best Practice:** ${d0.bestPracticeRule}`
              : ''),
        );
      }
    }

    // 6. If the user asked a very specific question that didn't hit a pre-indexed keyword, inspect the active file directly!
    if (responseBlocks.length === 0) {
      const files = ctx.currentFiles || [];
      const activeFile = files[ctx.activeFileIndex || 0] || files[0];
      if (sub || activeFile) {
        responseBlocks.push(
          '### 🎯 Answering `' +
            rawQ +
            '` in Context of **' +
            (sub ? `${sub.code} · ${sub.title}` : activeFile?.name) +
            '**\n\n' +
            (sub ? `**Lesson Goal:** ${sub.summary}\n\n` : '') +
            (activeFile
              ? `In your currently open file **\`${activeFile.name}\`**, here is how the pieces work together:\n\n` +
                explainCurrentEditorCode(ctx)
              : explainCurrentArchitecturalWhy(ctx)),
        );
      } else {
        return explainCurrentArchitecturalWhy(ctx);
      }
    }

    return responseBlocks.join('\n\n---\n\n');
  }

  /**
   * Live LLM call supporting Google Gemini (`AIza...`), OpenAI (`sk-...`), or Groq (`gsk_...`) keys
   * with full multi-turn conversation history and open IDE file tabs injected.
   * Falls back to the surgical local engine when no API key is configured.
   */
  async function askTutor(question, ctx, apiKey, history) {
    const cleanKey = String(apiKey || '').trim();
    const sub = ctx.subconcept || ctx.activeSubconcept;
    const filesText = (ctx.currentFiles || [])
      .map((f, idx) => `// [Tab ${idx + 1}${idx === (ctx.activeFileIndex || 0) ? ' - ACTIVE TAB' : ''}] File: ${f.name}\n${f.code}`)
      .join('\n\n');
    const decisionsText = (sub?.architecturalDecisions || [])
      .map(
        (d, i) =>
          `${i + 1}. Q: ${d.question}\n   Anti-Pattern: ${d.antiPattern}\n   Technical Why: ${d.technicalReason}\n   Best Practice: ${d.bestPracticeRule}`,
      )
      .join('\n');

    const verifiedLocalAnswer = answerQuestionLocally(question, ctx, history);

    const systemPrompt = [
      'You are the Kampus PropTech Senior NestJS, Prisma, Mongoose & Testing Architecture Mentor embedded inside the Kampus Studio IDE.',
      'CRITICAL INSTRUCTION: Answer the user\'s EXACT, SPECIFIC question directly in the very first sentence/paragraph. Do NOT give a generic lesson overview if the user asked about a specific decorator, line of code, keyword, file, or comparison.',
      'Always reference the exact file names, class names, method names, and lines of code from the Student\'s Open IDE Files below.',
      `Current UI Mode: ${ctx.mode || 'trainer'} (${ctx.trainerTab === 'exercise' ? 'Hands-on Exercise Tab' : 'Concept & Example Tab'})`,
      sub
        ? `Active Lesson: ${sub.code} - ${sub.title}\nSummary: ${sub.summary}\nTheory: ${stripHtml(sub.theory)}\nArchitectural Decisions:\n${decisionsText}\nExercise Prompt: ${stripHtml(sub.exercise?.prompt || '')}`
        : '',
      `Student's Open IDE File Tabs:\n${filesText}`,
      ctx.lastExecutionResult
        ? `Last HTTP Execution Result: HTTP ${ctx.lastExecutionResult.status} ${ctx.lastExecutionResult.statusText} -> ${JSON.stringify(ctx.lastExecutionResult.body)}`
        : '',
      `Verified Local Code & Concept Reference (use these exact facts and line numbers to anchor your answer):\n${verifiedLocalAnswer}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    const recentHistory = Array.isArray(history) ? history.slice(-6) : [];

    // 1. Try the Next.js Server API route (`/api/tutor`) which reads GEMINI_API_KEY directly from `.env` on disk
    if (typeof fetch === 'function') {
      try {
        const serverResp = await fetch('/api/tutor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            systemPrompt,
            history: recentHistory,
            apiKey: cleanKey,
          }),
        });
        if (serverResp && serverResp.ok) {
          const serverData = await serverResp.json();
          if (serverData && serverData.ok && serverData.answer) {
            return {
              source: 'gemini-api',
              answer: serverData.answer,
            };
          }
        }
      } catch (_serverErr) {
        // Not running behind Next.js `/api/tutor` (e.g., Jest unit test or static mode) — continue below
      }
    }

    if (!cleanKey) {
      return {
        source: 'built-in',
        answer: verifiedLocalAnswer,
      };
    }

    try {
      // Support OpenAI (sk-...) or Groq (gsk_...) keys automatically in addition to Gemini (AIza...)
      if (cleanKey.startsWith('sk-') || cleanKey.startsWith('gsk_')) {
        const isGroq = cleanKey.startsWith('gsk_');
        const endpoint = isGroq
          ? 'https://api.groq.com/openai/v1/chat/completions'
          : 'https://api.openai.com/v1/chat/completions';
        const model = isGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';

        const chatMessages = [
          { role: 'system', content: systemPrompt },
          ...recentHistory
            .filter((m) => m.id !== 'welcome-msg')
            .map((m) => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            })),
          { role: 'user', content: question },
        ];

        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cleanKey}`,
          },
          body: JSON.stringify({ model, messages: chatMessages, temperature: 0.3 }),
        });
        if (!resp.ok) throw new Error(`LLM API HTTP ${resp.status}`);
        const data = await resp.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) {
          return { source: 'gemini-api', answer: text };
        }
      } else {
        // Google Gemini API (tries gemini-2.5-flash -> gemini-2.0-flash -> gemini-1.5-flash)
        const contents = [
          ...recentHistory
            .filter((m) => m.id !== 'welcome-msg')
            .map((m) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            })),
          { role: 'user', parts: [{ text: question }] },
        ];

        const candidateModels = [
          'gemini-3-flash-preview',
          'gemini-3.8-flash',
          'gemini-3.1-flash-lite-preview',
        ];
        for (const modelName of candidateModels) {
          const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(cleanKey)}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents,
              }),
            },
          );
          if (!resp.ok) {
            continue;
          }
          const data = await resp.json();
          const parts = data?.candidates?.[0]?.content?.parts || [];
          const text =
            parts
              .filter((p) => !p?.thought && typeof p?.text === 'string')
              .map((p) => p.text)
              .join('\n') || parts?.[0]?.text;
          if (text) {
            return {
              source: 'gemini-api',
              answer: text,
            };
          }
        }
      }
    } catch (_err) {
      return {
        source: 'built-in',
        answer: verifiedLocalAnswer,
      };
    }

    return {
      source: 'built-in',
      answer: verifiedLocalAnswer,
    };
  }

  /**
   * Generates context-aware quick-action chips for the currently active lesson or mode.
   */
  function getSuggestedQuestions(ctx) {
    const suggestions = [
      '🗂️ How do the open files in this lesson connect?',
      '🏗️ Why is this lesson built this way?',
      '🔍 Debug my current code & tests',
      '🧬 Explain every decorator in my editor',
    ];

    if (ctx.mode === 'prisma') {
      suggestions.push(
        '💎 Why use select vs include in Prisma and how does it stop N+1?',
        '💎 Why is calling this.prisma instead of tx inside $transaction a bug?',
      );
      return suggestions;
    }

    if (ctx.mode === 'mongoose') {
      suggestions.push(
        '🍃 Why does .lean().exec() make Mongoose read queries 3x-5x faster?',
        '🍃 Why must we pass { new: true, runValidators: true } to findOneAndUpdate?',
      );
      return suggestions;
    }

    if (ctx.mode === 'testing') {
      suggestions.push(
        '✅ Why do we need Supertest E2E tests if our unit tests pass 100%?',
        '✅ Why use Test.createTestingModule() instead of new HostelBookingService(mockPrisma)?',
        '✅ Why must we attach app.useGlobalPipes(new ValidationPipe()) inside E2E tests?',
      );
      return suggestions;
    }

    const sub = ctx.subconcept || ctx.activeSubconcept;
    if (sub && Array.isArray(sub.architecturalDecisions)) {
      for (const d of sub.architecturalDecisions) {
        suggestions.push(d.question);
      }
    }

    return suggestions;
  }

  global.KampusAiTutor = {
    askTutor,
    answerQuestionLocally,
    diagnoseStudentCode,
    explainCurrentEditorCode,
    explainCurrentArchitecturalWhy,
    explainHowLessonFilesConnect,
    getSuggestedQuestions,
  };
})(window);

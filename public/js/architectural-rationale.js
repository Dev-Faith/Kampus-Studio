/**
 * Kampus PropTech — Detailed Architectural Rationale & Implementation Decisions
 * ==============================================================================
 * Explains the deep "WHY" behind every architectural choice, decorator, token,
 * service boundary, and design pattern across all 26 lessons (Modules 1 – 11).
 */
(function (global) {
  'use strict';

  const RATIONALE_BY_SUBCONCEPT = {
    // =========================================================================
    // MODULE 1: ARCHITECTURE, ROUTING & DEPENDENCY INJECTION
    // =========================================================================
    'arch-controllers': [
      {
        question: 'Why use parameter decorators (@Param, @Query, @Body, @Headers) instead of reading req.params, req.query, and req.body directly like in Express?',
        antiPattern:
          'In Express, handlers take `(req, res)` and manually read `req.params.id` or `req.headers["x-campus-client"]`. That tightly couples your method signature to the underlying HTTP server (Express vs. Fastify) and makes it impossible for pipes or OpenAPI/Swagger generators to inspect what inputs a route expects.',
        technicalReason:
          'Parameter decorators (`@Param("id")`, `@Query("campusZone")`, `@Body()`) attach metadata to each method argument index. This lets NestJS: (1) run targeted Pipes (like `ParseIntPipe` or `ValidationPipe`) on individual arguments before your method even starts, (2) auto-generate Swagger documentation, and (3) let you unit-test `controller.findOne("1", "kampus-ios")` by passing plain values instead of mocking a massive Express `req` object.',
        bestPracticeRule:
          'Never inject `@Req() req` or `@Res() res` unless you need low-level streaming or cookies; always declare explicit `@Param()`, `@Query()`, `@Body()`, and `@Headers()` arguments.',
      },
      {
        question: 'Why does the Controller call `this.db.findListings(...)` instead of storing arrays or SQL queries directly inside the Controller?',
        antiPattern:
          'Putting data storage or query logic inside a Controller makes that data inaccessible to other controllers, background jobs, WebSockets, or event listeners, and forces you to spin up an HTTP layer just to test data queries.',
        technicalReason:
          'A Controller should be a thin "HTTP translation layer" whose only responsibility is unpacking HTTP parameters, delegating to an injected Service, and returning the result (or throwing an HTTP exception). Keeping controllers thin ensures your business/data layer remains 100% transport-agnostic.',
        bestPracticeRule:
          'Keep Controllers under ~15 lines per route handler: extract parameters, call one service method, and return the result.',
      },
      {
        question: 'Why use `@HttpCode(204)` on `@Delete(":id")` instead of returning `{ deleted: true }` with HTTP 200?',
        antiPattern:
          'Returning `200 OK` when a resource no longer exists forces frontend/mobile clients to parse a custom JSON body just to confirm deletion.',
        technicalReason:
          'RFC 9110 (HTTP Semantics) specifies `204 No Content` as the standard response when a DELETE succeeds and no entity body needs to be transmitted—saving bandwidth on mobile networks.',
        bestPracticeRule:
          'Use `@HttpCode(204)` on `DELETE` endpoints that do not return a representation, and `@HttpCode(200)` on `POST` actions that do not create a new database resource (like `/auth/login`).',
      },
    ],

    'arch-di-tokens': [
      {
        question: 'Why should the escrow fee math (`Math.round(rent * (feePct / 100))`) be put in an `@Injectable()` Service (`EscrowPricingService`) instead of calculating it directly inside the Controller?',
        antiPattern:
          'If you write `const fee = Math.round(rent * 0.05)` directly inside `ListingsController`, then tomorrow when `BookingCheckoutController`, `LandlordPayoutCron`, and `InvoicePdfService` also need the escrow fee, you end up copy-pasting the formula in 4 places. When Kampus changes the fee rule (e.g., capping fees at $25 for scholarships), updating 3 places and forgetting the 4th creates a critical financial discrepancy.',
        technicalReason:
          '1. Single Source of Truth (DRY Domain Logic): Centralizing the math in `@Injectable() EscrowPricingService` guarantees every HTTP route, WebSocket gateway, and background worker computes identical numbers.\n2. Pure Unit Testing: A Controller depends on HTTP routing, Guards, and Interceptors. An `@Injectable()` Service is a plain TypeScript class—you can unit-test 50 edge-case rent amounts (`0`, negative, rounding boundaries) in <2ms without HTTP overhead.\n3. Singleton Memory Efficiency: NestJS instantiates `EscrowPricingService` once at application boot and shares that single memory reference across all controllers.',
        bestPracticeRule:
          'Any business calculation, pricing formula, or domain rule belongs in an `@Injectable()` Service—never inline inside a Controller.',
      },
      {
        question: 'Why should we create a custom configuration token (`@Inject("KAMPUS_CONFIG")` with `useValue` / `useFactory`) instead of importing a `config.ts` constant or reading `process.env` directly?',
        antiPattern:
          'If `EscrowPricingService` imports a hardcoded constant or reads `process.env.ESCROW_FEE_PCT` directly inside its methods, you cannot test how the service behaves under different campus policies (e.g., 5% vs. 8% fee, or $450 rent cap vs. $600 cap) without mutating global `process.env` state—which breaks parallel Jest tests with race conditions.',
        technicalReason:
          '1. TypeScript Interface Erasure: In TypeScript, `interface KampusConfig { escrowFeePercent: number }` is completely erased when compiled to JavaScript. NestJS cannot use an interface as a runtime DI key because it does not exist at runtime! A string or Symbol token (`"KAMPUS_CONFIG"`) survives compilation and gives the IoC container an exact runtime lookup key.\n2. Effortless Test Mocking & Environment Swapping: With `@Inject("KAMPUS_CONFIG")`, your production module can wire `useFactory` (reading validated env vars or Vault secrets), while your unit test simply passes `{ provide: "KAMPUS_CONFIG", useValue: { escrowFeePercent: 10 } }`—testing multiple configurations in complete isolation.\n3. Fail-Fast Boot Validation: Wiring config via a provider lets NestJS validate all required settings at startup before a single student request hits the server.',
        bestPracticeRule:
          'Use `@Inject(TOKEN)` custom providers (`useValue` / `useFactory`) for all configuration objects, external SDK clients, and non-class dependencies.',
      },
      {
        question: 'When should I choose `useClass`, `useValue`, or `useFactory` in `@Module({ providers: [...] })`?',
        antiPattern:
          'Trying to use `@Injectable()` on plain JSON objects or manually calling `new StripeClient(process.env.KEY)` inside a service constructor.',
        technicalReason:
          '• `useClass`: When NestJS should instantiate a class and automatically resolve its constructor dependencies.\n• `useValue`: When injecting a pre-built constant, configuration object, or Jest mock object.\n• `useFactory`: When creating the provider requires dynamic logic, reading another injected service, or `async/await` initialization (like connecting to Redis or Vault).',
        bestPracticeRule:
          'Use `useClass` for services, `useValue` for static configs/mocks, and `useFactory` when initialization needs runtime logic or async calls.',
      },
    ],

    'arch-lifecycle': [
      {
        question: 'Why does NestJS enforce a strict 7-stage Request Lifecycle (Middleware → Guards → Interceptors Pre → Pipes → Controller/Service → Interceptors Post → Exception Filters)?',
        antiPattern:
          'In unstructured Express apps, developers randomly mix auth checks, body validation, logging, and response formatting in arbitrary `app.use()` order. A heavy validation or database call often runs BEFORE checking if the user is even authenticated or rate-limited—wasting CPU and opening DoS vectors.',
        technicalReason:
          'Each stage of the NestJS Onion is ordered from cheapest/broadest to most specific:\n1. Middleware runs first to attach cheap request metadata (`x-request-id`).\n2. Guards run BEFORE Pipes and Controllers so unauthenticated (`401`), unauthorized (`403`), or rate-limited (`429`) requests are rejected immediately before spending CPU on DTO validation or DB queries.\n3. Interceptors (Pre) wrap the handler stream so caching can short-circuit execution before Pipes/Controllers run.\n4. Pipes validate and coerce parameters right before the Controller method is invoked so the Controller is guaranteed type-safe arguments.\n5. Interceptors (Post) transform the outgoing response stream in one place.\n6. Exception Filters sit on the outer rim to catch errors thrown from ANY inner layer.',
        bestPracticeRule:
          'Put Auth/Permission checks in Guards, timing/caching/envelopes in Interceptors, input parsing/validation in Pipes, and error formatting in Exception Filters.',
      },
    ],

    // =========================================================================
    // MODULE 2: PIPES & DTO VALIDATION
    // =========================================================================
    'pipes-builtin': [
      {
        question: 'Why use `ParseIntPipe` and `DefaultValuePipe` in `@Query()` / `@Param()` instead of calling `Number(id)` or `parseInt(page || "1")` inside the Controller?',
        antiPattern:
          'In JavaScript, `Number("abc")` silently returns `NaN` instead of throwing an error! Passing `NaN` into a database query (`WHERE id = NaN`) causes cryptic 500 database errors instead of a clean `400 Bad Request`.',
        technicalReason:
          '`ParseIntPipe` intercepts the raw URL string before your Controller runs, verifies it is a valid integer string, converts it to a JavaScript `number`, and automatically throws `400 Bad Request` (`"Validation failed (numeric string is expected)"`) if a client passes `/listings/abc`. Chaining `new DefaultValuePipe(1), ParseIntPipe` guarantees your Controller parameter is ALWAYS a valid `number`.',
        bestPracticeRule:
          'Always place `DefaultValuePipe` BEFORE `ParseIntPipe` / `ParseBoolPipe` on optional `@Query()` parameters so `undefined` is replaced before parsing.',
      },
    ],

    'pipes-custom': [
      {
        question: 'Why implement a custom `PipeTransform` (like `HostelSlugPipe` or `ParseIdListPipe`) instead of writing a helper function called inside the Controller?',
        antiPattern:
          'Calling `const slug = normalizeSlug(body.title)` inside 8 different controller methods means if one developer forgets to call the helper on a new endpoint, un-sanitized strings slip straight into the database.',
        technicalReason:
          'Implementing `PipeTransform` makes input sanitization declarative and reusable at the route boundary (`@Body("title", HostelSlugPipe) slug: string`). It also fails fast at Stage 4 (Pipes) before any Controller or Service code executes, keeping your domain services free of string-parsing boilerplate.',
        bestPracticeRule:
          'Create a custom `PipeTransform` whenever a domain primitive (slugs, comma-separated IDs, currency codes, matric numbers) needs consistent normalization and validation across endpoints.',
      },
    ],

    'pipes-validation-dto': [
      {
        question: 'Why use a TypeScript class (DTO) with `class-validator` decorators instead of a TypeScript `interface` for `@Body()` validation?',
        antiPattern:
          'Writing `@Body() dto: CreateHostelInterface` provides zero runtime protection! Because TypeScript interfaces are erased during compilation, a malicious user can send `{ "rentPerYear": -9999, "verified": true, "role": "admin" }` and Express will pass it straight into your database.',
        technicalReason:
          'TypeScript `class` declarations survive compilation to JavaScript constructors, which allows `class-validator` and `class-transformer` decorators (`@IsString()`, `@IsInt()`, `@Min(50)`) to attach runtime validation metadata to the class prototype. `ValidationPipe` instantiates the DTO class via `plainToInstance()` and validates every property at runtime.',
        bestPracticeRule:
          'Always define request `@Body()` payloads as `class` DTOs decorated with `class-validator`, never as TypeScript `interface`s.',
      },
      {
        question: 'Why enable `whitelist: true` and `forbidNonWhitelisted: true` on `ValidationPipe`?',
        antiPattern:
          'Without `whitelist: true`, if your controller passes `this.db.createListing(dto)` directly to an ORM, an attacker can include extra JSON fields like `{ "verified": true, "landlordId": "u-victim" }` (a Mass-Assignment vulnerability) and overwrite protected database columns.',
        technicalReason:
          '`whitelist: true` automatically strips any JSON property that does not have a validation decorator on the DTO class. Adding `forbidNonWhitelisted: true` goes one step further and rejects the request with `400 Bad Request` so clients immediately know they sent an unpermitted field.',
        bestPracticeRule:
          'Always configure global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` in `main.ts`.',
      },
    ],

    // =========================================================================
    // MODULE 3: GUARDS, RBAC & OWNERSHIP (ABAC)
    // =========================================================================
    'guards-apikey': [
      {
        question: 'Why compare API keys with `timingSafeEqual(Buffer.from(a), Buffer.from(b))` instead of normal JavaScript `a === b`?',
        antiPattern:
          'Standard string equality (`providedKey === expectedKey`) stops comparing at the very first mismatched character and returns `false` in ~5 nanoseconds. If the first 4 characters match, it takes slightly longer (~15ns). By measuring response times over thousands of requests, an attacker can guess a secret API key character-by-character (a Timing Side-Channel Attack).',
        technicalReason:
          '`crypto.timingSafeEqual` performs a bitwise XOR across every single byte of both buffers and takes the exact same CPU time whether mismatch occurs on byte 1 or byte 32—completely eliminating timing leakage. (We check `a.length === b.length` first because `timingSafeEqual` requires equal-length buffers).',
        bestPracticeRule:
          'Always use constant-time comparison (`crypto.timingSafeEqual`) when verifying API keys, webhook signatures, or HMAC digests.',
      },
    ],

    'guards-reflector-public': [
      {
        question: 'Why register `JwtAuthGuard` globally via `APP_GUARD` and opt out with `@Public()`, instead of putting `@UseGuards(JwtAuthGuard)` on every controller?',
        antiPattern:
          'In a 100-endpoint PropTech backend, 92 endpoints require authentication and only 8 are public. If you rely on developers remembering `@UseGuards(JwtAuthGuard)` on every new controller, a single forgotten decorator accidentally exposes private student data or escrow actions to the public internet.',
        technicalReason:
          'Registering `{ provide: APP_GUARD, useClass: JwtAuthGuard }` enforces a **Secure-by-Default (Deny-by-Default)** architecture. Every new endpoint is automatically protected unless a developer explicitly marks it `@Public()` (`SetMetadata("isPublic", true)`), which the Guard checks via `this.reflector.getAllAndOverride("isPublic", [context.getHandler(), context.getClass()])`.',
        bestPracticeRule:
          'Bind your primary authentication guard globally with `APP_GUARD` inside `AppModule` (so it can inject DI services like `Reflector`), and explicitly opt out with `@Public()`.',
      },
    ],

    'guards-rbac': [
      {
        question: 'Why separate Authentication (`JwtAuthGuard` → 401) from Role Authorization (`RolesGuard` → 403) instead of combining them in one guard?',
        antiPattern:
          'Mixing JWT verification and role checks in a single guard violates Single Responsibility and forces you to re-parse JWT tokens in every authorization guard (such as role guards, tier guards, or feature-flag guards).',
        technicalReason:
          '1. Semantic HTTP Contracts: Authentication answers *"Who are you?"* (returns `401 Unauthorized` when credentials are missing/invalid and sets `req.user`). Authorization answers *"Are you allowed to do this?"* (reads `req.user.role` and returns `403 Forbidden`).\n2. Composability: Once `JwtAuthGuard` populates `req.user`, lightweight guards like `RolesGuard` and `OwnershipGuard` can inspect `req.user` in microseconds.',
        bestPracticeRule:
          'Run `JwtAuthGuard` first to authenticate and attach `req.user` (401 on failure), then run `RolesGuard` to verify role metadata via `Reflector` (403 on failure).',
      },
    ],

    'guards-ownership': [
      {
        question: 'Why do we need an Attribute-Based Ownership Guard (`ListingOwnershipGuard`) when we already have `RolesGuard` (`@Roles("landlord")`)?',
        antiPattern:
          'If `DELETE /listings/:id` only checks `@Roles("landlord")`, then Landlord Chidi (`u-landlord-2`) can delete or edit hostels owned by Landlord Musa (`u-landlord-9`) simply by changing `:id` in the URL! This is **Broken Object Level Authorization (BOLA / IDOR)**—the #1 vulnerability on the OWASP API Security Top 10.',
        technicalReason:
          'RBAC (`RolesGuard`) only checks static role labels (`role === "landlord"`). ABAC (`OwnershipGuard`) compares a dynamic attribute of the target resource (`listing.landlordId`) against the authenticated actor (`req.user.id`), while allowing an override for `req.user.role === "admin"`.',
        bestPracticeRule:
          'Any route that mutates or reads a private resource by `:id` (`/listings/:id`, `/wallets/:studentId`) must verify resource ownership (`resource.ownerId === req.user.id || req.user.role === "admin"`).',
      },
    ],

    // =========================================================================
    // MODULE 4: AUTHENTICATION, JWT & REFRESH ROTATION
    // =========================================================================
    'auth-login-jwt': [
      {
        question: 'Why use a custom `@CurrentUser()` parameter decorator (`createParamDecorator`) instead of reading `@Req() req` and `req.user` in every controller?',
        antiPattern:
          'Injecting `@Req() req: Request` into controllers just to read `req.user.id` exposes the entire raw Express request object, breaks type safety (`req.user` is often typed as `any`), and makes controller unit tests tedious because you have to mock `req`.',
        technicalReason:
          '`createParamDecorator((field, ctx) => ...)` extracts `req.user` (or a specific property like `@CurrentUser("id") userId: string`) at the parameter level. Your controller method receives a clean, strongly-typed `KampusUser` argument that is trivial to pass in unit tests.',
        bestPracticeRule:
          'Create a `@CurrentUser()` param decorator so controllers never touch `@Req() req` to read the authenticated user.',
      },
      {
        question: 'Why return the exact same `401 Invalid Kampus email or password` message whether the email was not found OR the password was wrong?',
        antiPattern:
          'Returning `404 Email not registered` vs `401 Wrong password` allows attackers to run automated Account Enumeration scripts to harvest a list of every registered student email on Kampus.',
        technicalReason:
          'Returning a generic `401 Unauthorized` with an identical error message prevents attackers from distinguishing between a non-existent email and an incorrect password.',
        bestPracticeRule:
          'Never reveal whether the email or the password failed on `/auth/login`; always throw a unified `UnauthorizedException("Invalid credentials")`.',
      },
    ],

    'auth-refresh-rotation': [
      {
        question: 'Why issue a short-lived Access Token (15m) + a rotatable Refresh Token (7d) instead of just issuing a single 7-day JWT Access Token?',
        antiPattern:
          'Standard JWT verification is stateless (`jwtService.verify()` checks the cryptographic signature without querying the database). If you issue a 7-day Access Token and a student logs out on a shared campus computer—or their phone is stolen—that 7-day JWT remains 100% valid until next week because there is no server state to revoke it!',
        technicalReason:
          'Dual-token rotation gives you the best of both worlds:\n1. **Speed**: Every normal API request verifies the short-lived (15m) Access Token in memory with zero database queries.\n2. **Revocability & Theft Detection**: The long-lived (7d) Refresh Token has its hash stored in `user.refreshTokenHash`. When `/auth/refresh` is called, Kampus verifies the hash in the DB and issues a brand-new pair (invalidating the old refresh token). On `/auth/logout`, setting `refreshTokenHash = null` immediately revokes future token renewals.',
        bestPracticeRule:
          'Keep JWT Access Tokens short-lived (5–15 minutes) and store a cryptographic hash of the Refresh Token in the database so sessions can be revoked on logout or compromise.',
      },
    ],

    // =========================================================================
    // MODULE 5: INTERCEPTORS & RXJS STREAMS
    // =========================================================================
    'interceptors-envelope': [
      {
        question: 'Why wrap responses in `{ success: true, data, meta }` and strip `passwordHash` inside a NestInterceptor (`next.handle().pipe(map(...))`) instead of inside each Controller?',
        antiPattern:
          'If every controller manually returns `{ success: true, data: user }` and manually deletes `user.passwordHash`, it only takes one new endpoint returning `this.db.users` directly to accidentally leak bcrypt password hashes and landlord bank BVNs to the public.',
        technicalReason:
          'In NestJS, `next.handle()` returns an **RxJS Observable** representing the response stream produced by the Controller. Piping `.pipe(map(data => ...))` inside a global or controller-scoped `NestInterceptor` guarantees that every single outgoing payload is recursively sanitized (`passwordHash`, `refreshTokenHash`, `bankBvn` removed) and wrapped in a uniform mobile envelope—while keeping controllers 100% focused on domain data.',
        bestPracticeRule:
          'Use an outbound `NestInterceptor` with RxJS `map()` for cross-cutting response envelopes and recursive secret/PII redaction.',
      },
    ],

    'interceptors-timeout': [
      {
        question: 'Why enforce downstream SLAs with RxJS `timeout(ms)` and `catchError()` in an Interceptor instead of letting slow HTTP calls hang?',
        antiPattern:
          'If an external dependency (like the Campus Shuttle GPS tracker or Roommate AI service) hangs for 30 seconds during peak student traffic, Node.js sockets and database connection pool slots remain tied up waiting—causing cascading thread/connection exhaustion across the entire Kampus API.',
        technicalReason:
          'RxJS `timeout(ms)` automatically unsubscribes from the hung stream as soon as the deadline expires. Pairing it with `catchError()` lets you either return a fast `408 Request Timeout` (`TimeoutInterceptor`) or return a graceful degraded fallback payload (`degraded: true`) so the student app still loads the hostel page even when a non-critical widget is down.',
        bestPracticeRule:
          'Always wrap external third-party or non-critical microservice calls with a timeout + graceful fallback interceptor to prevent cascading failures.',
      },
    ],

    // =========================================================================
    // MODULE 6: RATE LIMITING & THROTTLING
    // =========================================================================
    'throttling-decorators': [
      {
        question: 'Why apply strict `@Throttle(2, 60)` on `/listings/:id/reveal-phone` while adding `@SkipThrottle()` on `/listings/ping`?',
        antiPattern:
          'Applying a single flat rate limit across all routes either makes `/reveal-phone` too loose (allowing scrapers to harvest every landlord phone number and spam SMS OTPs) or makes `/health` / `/ping` too strict (causing Kubernetes load-balancer health probes to get `429 Too Many Requests` and restart healthy containers!).',
        technicalReason:
          'Different endpoints have vastly different cost and abuse profiles. SMS/OTP and contact-reveal endpoints cost money per call and are prime scraping targets (`@Throttle(2, 60)`), whereas infrastructure liveness probes and static metadata endpoints must never be throttled (`@SkipThrottle()`).',
        bestPracticeRule:
          'Enforce tight `@Throttle()` quotas on login, OTP/SMS, and contact-scraping routes, and always mark health/readiness probes with `@SkipThrottle()`.',
      },
    ],

    'throttling-guards': [
      {
        question: 'Why implement a custom Tier-Aware Rate Limit Guard that keys by `user.id` instead of only rate-limiting by client IP address?',
        antiPattern:
          'On a university campus, 2,000 students in the same hostel or library share a single NAT public IP address! If you only rate-limit by IP address, 5 students using Kampus at the same time will lock out the entire university campus with `429 Too Many Requests`. Conversely, a verified landlord paying for bulk uploads needs a higher quota than a basic guest.',
        technicalReason:
          'Tracking rate-limit buckets by authenticated identity (`throttle:${user.id}`) isolates each student on shared campus Wi-Fi, and reading `user.tier` (`verified` vs `basic`) lets your Guard dynamically assign `limit = 10` vs `limit = 2` and return standard `x-ratelimit-limit`, `x-ratelimit-remaining`, and `retry-after` headers.',
        bestPracticeRule:
          'Rate-limit authenticated endpoints by `user.id` (not just IP) to avoid blocking users behind shared university/corporate NAT IPs, and always include `Retry-After` on HTTP 429.',
      },
    ],

    // =========================================================================
    // MODULE 7: CACHING & CACHE EVICTION
    // =========================================================================
    'cache-interceptor-declarative': [
      {
        question: 'Why does `CacheInterceptor` run as an Interceptor (Stage 3) instead of inside the Service layer for read-heavy GET endpoints?',
        antiPattern:
          'If you only cache inside the database method, NestJS still executes Pipes, Controller logic, and response serialization on every request.',
        technicalReason:
          'Because `CacheInterceptor` sits at Stage 3 (Pre-Controller Interceptor), on a Cache HIT it returns `of(cachedResponse)` immediately—bypassing Pipes, Controller execution, and Database queries entirely (`0ms` DB load during Resumption Week traffic spikes!). Using `@CacheKey()` and `@CacheTTL()` lets you declaratively control key naming and expiration.',
        bestPracticeRule:
          'Use declarative `@UseInterceptors(CacheInterceptor)` with `@CacheTTL()` for public, read-heavy `GET` endpoints whose output depends only on the URL.',
      },
    ],

    'cache-aside-eviction': [
      {
        question: 'Why must `PATCH /listings/:id/rent` explicitly call `await this.cache.del("kampus:listings:all")` instead of just waiting for the cache TTL to expire?',
        antiPattern:
          'If Landlord Chidi lowers Cedar Court rent from `$180` to `$150` and you do not evict the cache key, students browsing Kampus will continue seeing the stale `$180` price until the TTL expires—and if a student starts checkout based on stale cached data, the price mismatches!',
        technicalReason:
          'The **Cache-Aside + Write Invalidation** pattern combines fast reads (`cache.get` → fallback to `db.find` → `cache.set`) with immediate consistency on mutations: whenever a `POST`, `PATCH`, or `DELETE` modifies underlying hostel data, explicitly evicting (`cache.del`) the affected cache keys guarantees the very next `GET` fetches fresh data from the database.',
        bestPracticeRule:
          'Every write endpoint (`POST`/`PATCH`/`DELETE`) that mutates a cached entity must explicitly invalidate (`cache.del`) the corresponding cache keys.',
      },
    ],

    // =========================================================================
    // MODULE 8: CUSTOM EXCEPTIONS & EXCEPTION FILTERS
    // =========================================================================
    'domain-http-exceptions': [
      {
        question: 'Why create a custom `InsufficientEscrowFundsException` (HTTP `422 Unprocessable Entity`) instead of throwing a generic `BadRequestException("Not enough money")` (HTTP `400`)?',
        antiPattern:
          'HTTP `400 Bad Request` means the client sent malformed syntax or failed DTO validation (a bug in the request format). When a student has `$120` in their wallet and tries to book a `$180` hostel, their JSON request is 100% syntactically valid—it just violates a business rule! Returning a generic `400` string forces the mobile app to do fragile regex matching on English error messages to know whether to open the "Top Up Wallet" modal.',
        technicalReason:
          '1. Semantic Status Code: HTTP `422 Unprocessable Entity` tells monitoring tools and API clients that the request payload was valid JSON, but rejected by a domain rule.\n2. Machine-Readable Contract: Encapsulating `{ code: "INSUFFICIENT_ESCROW_FUNDS", required, available, shortfall }` inside a reusable `HttpException` subclass gives mobile apps a deterministic `code` enum to trigger the exact "Top Up $60" UI flow.',
        bestPracticeRule:
          'Use `400 Bad Request` for syntax/DTO validation errors, and custom `422 Unprocessable Entity` domain exceptions with a machine-readable `code` for business rule violations.',
      },
    ],

    'custom-exception-filters': [
      {
        question: 'Why catch database `QueryFailedError` (like `23505` unique email violations) in an `@Catch(QueryFailedError)` Exception Filter instead of wrapping every Controller method in `try / catch`?',
        antiPattern:
          '1. If you forget a `try/catch` in even one controller, an unhandled database error bubbles up as a generic `500 Internal Server Error` (or worse, leaks raw SQL table/constraint names to the client).\n2. Writing repetitive `try { ... } catch (err) { if (err.code === "23505") throw new ConflictException(...) }` across 30 controllers clutters your business logic.',
        technicalReason:
          'An `@Catch(QueryFailedError)` Exception Filter sits at Stage 7 (outermost ring of the NestJS Onion). It intercepts low-level database driver errors thrown from ANY service or repository and translates them in one central place into a clean, user-friendly HTTP `409 Conflict` with `{ statusCode: 409, errorCode: "DUPLICATE_KAMPUS_EMAIL" }`.',
        bestPracticeRule:
          'Never litter controllers with repetitive `try/catch` blocks for database or ORM errors; translate infrastructure exceptions into HTTP responses inside an `@Catch()` Exception Filter.',
      },
    ],

    // =========================================================================
    // MODULE 9: PAGINATION & ATOMIC DATABASE TRANSACTIONS
    // =========================================================================
    'pagination-filtering': [
      {
        question: 'Why return `{ items, meta: { page, limit, total, totalPages } }` instead of returning the full array of all hostels from `GET /listings`?',
        antiPattern:
          'An unpaginated `SELECT * FROM listings` works in development when you have 3 test hostels, but in production with 50,000 hostel listings, serializing a 40MB JSON array on every request spikes Node.js V8 heap memory (causing Out-Of-Memory crashes) and freezes student mobile phones.',
        technicalReason:
          'Bounding every list query with `page` and `limit` (with a maximum cap like `Math.min(limit, 50)`) guarantees predictable `O(limit)` memory and response time regardless of how large the database grows. Returning `meta: { page, limit, total, totalPages }` gives frontend pagination controls everything they need in a single round-trip.',
        bestPracticeRule:
          'Never expose an unbounded list endpoint; always paginate with default `page=1` and `limit` bounds, and return `{ items, meta: { page, limit, total, totalPages } }`.',
      },
    ],

    'pagination-transactions': [
      {
        question: 'Why must deducting student escrow (`tx.escrowWallets[studentId] -= amount`) and crediting the landlord (`tx.escrowWallets[landlordId] += amount`) run inside `this.db.transaction(async (tx) => ...)`?',
        antiPattern:
          'Without a database transaction, each statement commits immediately. If Step 1 deducts `$180` from Student Adaobi, and Step 2 throws an error (e.g., Landlord account not found, database constraint failure, or server crash), Adaobi’s `$180` is permanently gone while the landlord received `$0`—corrupting the financial ledger!',
        technicalReason:
          'Wrapping multi-step writes in `db.transaction()` enforces **ACID Atomicity (All-or-Nothing)**. All mutations inside the callback operate on a transactional snapshot (`tx`). If any line throws an exception, the transaction manager automatically executes `ROLLBACK`, restoring Adaobi’s wallet balance to `$400` as if the request never happened.',
        bestPracticeRule:
          'Whenever an endpoint performs 2 or more database writes that must succeed or fail together (especially wallet transfers, bookings, or inventory updates), always wrap them in an atomic `transaction()`.',
      },
    ],

    // =========================================================================
    // MODULE 10: DOMAIN EVENTS & IDEMPOTENT PAYMENTS
    // =========================================================================
    'domain-events-listeners': [
      {
        question: 'Why emit `this.events.emit("hostel.verified", payload)` and handle it with `@OnEvent("hostel.verified")` instead of calling `auditService.log()`, `emailService.send()`, and `pushService.notify()` directly inside `VerificationController`?',
        antiPattern:
          'Directly calling 4 side-effect services inside `VerificationController` creates tight coupling (Open-Closed Principle violation): every time product adds a new side effect (e.g., awarding a "Verified Badge" or indexing in Elasticsearch), you have to modify and re-test `VerificationController`. Worse, if the email server is slow, the HTTP response to Housing Officer Grace is delayed.',
        technicalReason:
          'Publishing a Domain Event (`"hostel.verified"`) via `EventEmitter2` decouples the **core state change** (marking the hostel verified) from **downstream reactions** (`@OnEvent("hostel.verified")` listeners). You can add, remove, or test audit/notification listeners independently without touching a single line of `VerificationController`.',
        bestPracticeRule:
          'Use `EventEmitter2` and `@OnEvent()` for secondary side effects (audit logs, notifications, analytics, badge awards) so controllers stay decoupled and fast.',
      },
    ],

    'events-and-idempotency': [
      {
        question: 'Why require an `Idempotency-Key` header on `POST /escrow/checkout` instead of just relying on the frontend to disable the "Pay Rent" button after one click?',
        antiPattern:
          'Disabling a button in the UI does not protect against unstable campus Wi-Fi! If Adaobi taps "Pay $180", the Kampus server processes the charge, and her Wi-Fi drops for 1 second before the HTTP 201 response reaches her phone, her mobile HTTP client or user retry will send the POST request a second time—charging her twice for the same hostel room!',
        technicalReason:
          'Unlike `GET`, `PUT`, and `DELETE`, HTTP `POST` is NOT naturally idempotent. Storing the client-generated `Idempotency-Key` UUID alongside the created booking allows the server to detect retries: when the second request arrives with the same `Idempotency-Key`, Kampus skips charging the wallet and immediately replays the original booking (`{ replayed: true, booking }`).',
        bestPracticeRule:
          'Always enforce an `Idempotency-Key` header on financial `POST` endpoints (payments, escrow releases, wallet top-ups, and order checkouts).',
      },
    ],

    // =========================================================================
    // MODULE 11: API VERSIONING, CORRELATION IDS & HEALTH PROBES
    // =========================================================================
    'uri-api-versioning': [
      {
        question: 'Why use `@Version("1")` and `@Version("2")` (`/v1/receipts` vs `/v2/receipts`) instead of changing the existing `/receipts` response JSON directly?',
        antiPattern:
          'Web frontends deploy instantly, but mobile apps (iOS App Store / Google Play) stay installed on students’ phones for months! If you rename or restructure `amount: 180` into `breakdown: { rent: 180, escrowFee: 9, total: 189 }` on the existing route, every student still running v1 of the Kampus Android app will experience an immediate crash (`undefined is not a number`).',
        technicalReason:
          'NestJS `@Version("1")` and `@Version("2")` allow you to evolve your API contract safely side-by-side in the same controller while sharing the underlying `DatabaseService`, giving mobile users months to upgrade before `/v1` is deprecated.',
        bestPracticeRule:
          'Never make breaking response schema changes to an active mobile API route; introduce a new `@Version("2")` handler alongside `@Version("1")`.',
      },
      {
        question: 'Why attach `x-request-id` in a Correlation ID Middleware (Stage 1) instead of generating an ID inside the Controller?',
        antiPattern:
          'If a request fails inside a Guard (401/403/429) or a ValidationPipe (400), the Controller never runs! Generating trace IDs inside the Controller means failed requests have no correlation ID in your logs.',
        technicalReason:
          'Middleware runs at Stage 1 (the very first layer of the request lifecycle). Attaching `req.id` and `res.setHeader("x-request-id", requestId)` in Middleware guarantees that even requests rejected by Guards, Pipes, or Exception Filters carry a traceable correlation ID.',
        bestPracticeRule:
          'Always generate or propagate `x-request-id` in Stage 1 Middleware so every log line and error response across all lifecycle stages shares the same trace ID.',
      },
    ],

    'versioning-and-health': [
      {
        question: 'Why must `GET /health` throw `ServiceUnavailableException` (HTTP `503`) when the database is down instead of returning `200 OK` with `{ status: "error", database: "down" }`?',
        antiPattern:
          'Kubernetes, AWS ALB, Railway, and Cloud Run health checkers do not parse your custom JSON body—they inspect the **HTTP status code**! If your `/health` endpoint returns `HTTP 200 OK` with `{ database: "down" }`, the load balancer thinks the container is healthy and keeps routing live student checkout traffic to a broken instance!',
        technicalReason:
          'Throwing `new ServiceUnavailableException(...)` returns **HTTP `503 Service Unavailable`**, which immediately signals Kubernetes/Cloud Run readiness probes to stop sending traffic to that pod until the database connection recovers and `/health` returns `200 OK` again.',
        bestPracticeRule:
          'Readiness health probes (`/health`) must return HTTP `200 OK` when dependencies are healthy and HTTP `503 Service Unavailable` (`ServiceUnavailableException`) when any critical dependency is unreachable.',
      },
    ],

    'prisma-queries-relations': [
      {
        question: 'Why wrap `PrismaClient` in an `@Injectable() PrismaService` singleton with `OnModuleInit` / `OnModuleDestroy` instead of calling `new PrismaClient()` inside each service or controller?',
        antiPattern:
          'Every `new PrismaClient()` spawns its own underlying Rust Query Engine binary/library instance and opens a dedicated pool of PostgreSQL TCP connections (typically 5–10 connections per instance). Instantiating `new PrismaClient()` in multiple services or per-request quickly exhausts PostgreSQL `max_connections` (`FATAL: sorry, too many clients already`).',
        technicalReason:
          'By registering `PrismaService extends PrismaClient` as a single `@Global()` NestJS provider implementing `OnModuleInit` (`await this.$connect()`) and `OnModuleDestroy` (`await this.$disconnect()`), the entire application shares one connection pool and drains active queries cleanly on SIGTERM.',
        bestPracticeRule:
          'Always inject a singleton `PrismaService` managed by the NestJS DI container—never call `new PrismaClient()` inside controllers or domain services.',
      },
      {
        question: 'Why use `select` vs `include` deliberately, and why does `include: { landlord: { select: { ... } } }` matter so much?',
        antiPattern:
          '1) Calling `include: { landlord: true }` fetches **every** column of the related `User` row—including `passwordHash` and `refreshTokenHash`—and sends it over the wire into Node.js memory.\n2) Worse, fetching listings first and then looping `for (const l of listings) { await prisma.user.findUnique({ where: { id: l.landlordId } }) }` triggers the classic **N+1 Query Problem** (1 query for 50 listings + 50 separate SQL queries for landlords = 51 database round-trips!).',
        technicalReason:
          'Prisma `include: { landlord: { select: { id: true, name: true, tier: true } } }` batches the relation lookup into a single `WHERE "id" IN (...)` query (or SQL `JOIN`) and projects *only* the safe public columns at the database engine level.',
        bestPracticeRule:
          'Use `include` with nested `select` whenever loading relations to eliminate N+1 queries while preventing sensitive columns (`passwordHash`) from ever leaving PostgreSQL.',
      },
    ],

    'prisma-transactions-atomic': [
      {
        question: 'Why use `{ roomsAvailable: { decrement: 1 } }` instead of reading `listing.roomsAvailable` in JavaScript and updating it with `listing.roomsAvailable - 1`?',
        antiPattern:
          'If 2 students concurrently read `listing.roomsAvailable` (which is `1`), both Node.js promises see `1`, both compute `1 - 1 = 0` in JavaScript, and both execute `UPDATE "Listing" SET "roomsAvailable" = 0`. Two students just booked a 1-room hostel (**Lost Update Race Condition**)!',
        technicalReason:
          '`data: { roomsAvailable: { decrement: 1 } }` compiles directly to atomic SQL (`UPDATE "Listing" SET "roomsAvailable" = "roomsAvailable" - 1 WHERE "id" = $1`). PostgreSQL acquires a row-level write lock during the `UPDATE`, serializing concurrent decrements so the second request sees `-1` and rolls back.',
        bestPracticeRule:
          'Never compute counters, room inventory, or wallet balances in JavaScript memory (`x - 1`); always use Prisma atomic number operations (`{ increment, decrement }`) inside a `$transaction`.',
      },
      {
        question: 'Why use `upsert({ where, create, update })` instead of `findUnique` followed by `if (!user) create() else update()`?',
        antiPattern:
          'Checking `const user = await prisma.user.findUnique(...)` and then calling `prisma.user.create(...)` creates a **Time-of-Check to Time-of-Use (TOCTOU)** race window: if two concurrent requests arrive for the same email, both `findUnique` calls return `null`, and the second `create` crashes with an unhandled `P2002` unique constraint error.',
        technicalReason:
          '`prisma.user.upsert(...)` delegates conflict resolution to the database engine (`INSERT ... ON CONFLICT DO UPDATE`), making insert-or-update atomic and immune to race conditions.',
        bestPracticeRule:
          'Use `upsert` for idempotent profile syncs, OAuth logins, and setting updates keyed by a `@unique` column.',
      },
    ],

    'mongoose-schemas-queries-lean': [
      {
        question: 'Why chain `.lean().exec()` on Mongoose read queries instead of simply awaiting `this.listingModel.find(...)`?',
        antiPattern:
          'Without `.lean()`, Mongoose "hydrates" every raw BSON document returned from MongoDB into a heavy `HydratedDocument` class instance—attaching internal change-tracking proxies (`$__`), getters/setters, `.save()` methods, and schema validation state. On a query returning 100 hostels, hydration consumes **3x–5x more CPU time** and **~70% more V8 heap memory**, only for NestJS to immediately serialize the result to JSON and throw the Mongoose Document away!',
        technicalReason:
          '`.lean()` instructs Mongoose to bypass document hydration and return plain JavaScript objects (POJOs) directly from the MongoDB driver cursor. Chaining `.exec()` returns a true Promise with full async stack traces.',
        bestPracticeRule:
          'Always chain `.lean().exec()` on read-only queries (`find`, `findOne`, `findById`); only omit `.lean()` when you explicitly need to call `doc.save()` or trigger Mongoose virtuals/getters.',
      },
      {
        question: 'Why pass a 2nd projection argument to `.populate("landlord", "name tier")` instead of calling `.populate("landlord")`?',
        antiPattern:
          'Calling `.populate("landlord")` executes a second MongoDB query (`db.users.find({ _id: { $in: [...] } })`) that fetches the **entire** `User` document—including `passwordHash` and `refreshTokenHash` unless `select: false` is set on the schema.',
        technicalReason:
          'Passing `"name tier"` as the second argument projects only those fields in MongoDB (`{ name: 1, tier: 1 }`), minimizing network payload size and preventing credential leaks.',
        bestPracticeRule:
          'Always specify an explicit field whitelist as the second argument of `.populate(path, "field1 field2")` AND set `@Prop({ select: false })` on sensitive schema fields like `passwordHash`.',
      },
    ],

    'mongoose-atomic-operators-upsert': [
      {
        question: 'Why combine `{ roomsAvailable: { $gt: 0 } }` in the filter with `{ $inc: { roomsAvailable: -1 } }` in `findOneAndUpdate`, instead of `const doc = await findById(id); doc.roomsAvailable--; await doc.save();`?',
        antiPattern:
          'Fetching a document with `findById()`, decrementing `doc.roomsAvailable--` in Node.js, and calling `await doc.save()` splits the check and the write across two network round-trips. Under concurrency, two students read `roomsAvailable: 1` simultaneously and both save `0`—overbooking the hostel!',
        technicalReason:
          'In MongoDB (WiredTiger), a single `findOneAndUpdate({ _id: id, roomsAvailable: { $gt: 0 } }, { $inc: { roomsAvailable: -1 } }, { new: true })` is **100% atomic at the document level**. MongoDB locks the document, verifies `roomsAvailable > 0`, and decrements it in one indivisible step without needing a multi-document replica-set transaction!',
        bestPracticeRule:
          'Enforce invariants directly in the `findOneAndUpdate` filter (`{ roomsAvailable: { $gt: 0 } }`) paired with atomic update operators (`$inc`, `$addToSet`, `$pull`) and `{ new: true, runValidators: true }`.',
      },
      {
        question: 'Why must you always pass `{ new: true, runValidators: true }` to `findOneAndUpdate` and `findByIdAndUpdate`?',
        antiPattern:
          'By default (for historical MongoDB `findAndModify` compatibility), Mongoose `findOneAndUpdate(filter, update)`:\n1) Returns the **OLD pre-update document** (`new: false`), confusing API clients into thinking their update didn\'t happen!\n2) **Skips all `@Prop` schema validators** (`runValidators: false`), allowing negative numbers or invalid enums to bypass your schema!',
        technicalReason:
          'Setting `{ new: true, runValidators: true }` forces Mongoose to validate the `$set`/`$inc` payload against your `@Schema()` rules before sending the command and tells MongoDB to return the post-update document.',
        bestPracticeRule:
          'Never call `findOneAndUpdate` or `findByIdAndUpdate` without `{ new: true, runValidators: true }` (or `{ returnDocument: "after", runValidators: true }`).',
      },
    ],
    // =========================================================================
    // MODULE 14: KAMPUS QUALITY ASSURANCE — UNIT & INTEGRATION TESTING
    // =========================================================================
    'testing-unit-testingmodule-mocks': [
      {
        question: 'Why use `Test.createTestingModule({ providers: [...] }).compile()` instead of instantiating `new HostelBookingService(mockPrisma)` directly?',
        antiPattern:
          'Calling `new HostelBookingService(mockPrisma as any)` bypasses NestJS Dependency Injection metadata completely. If a teammate adds `@Optional() @Inject(CACHE_MANAGER)` or reorders constructor tokens, manual `new Service(...)` calls silently assign arguments to the wrong parameters or break every test file.',
        technicalReason:
          '`Test.createTestingModule()` uses the exact same IoC container resolution engine as your production NestJS app (`Reflect.getMetadata("design:paramtypes")`, `@Inject()` tokens, `useFactory`, and lifecycle hooks like `onModuleInit`). It validates that your provider graph is wired properly while still running in < 5ms in memory.',
        bestPracticeRule:
          'Always compile unit specs through `Test.createTestingModule({ providers: [ServiceUnderTest, { provide: DepToken, useValue: mockDep }] }).compile()` so your DI tokens and constructor signatures are verified alongside your business logic.',
      },
      {
        question: 'Why mock `PrismaService` / `Model` with `jest.fn()` in unit tests instead of connecting to a real database?',
        antiPattern:
          'Running unit tests against a shared PostgreSQL or MongoDB instance makes tests 100x slower, causes flaky race conditions when CI workers run in parallel, and makes it painful to simulate rare edge cases (like database deadlocks or `roomsAvailable === 0` mid-flight).',
        technicalReason:
          '`jest.fn()` creates a synchronous/asynchronous spy function that records every invocation (`mock.calls`) and lets you program deterministic responses per test (`mockResolvedValueOnce`, `mockRejectedValueOnce`). You can test 50 branching business rules in 20 milliseconds with zero network I/O.',
        bestPracticeRule:
          'Use `jest.fn()` mocks for all I/O boundaries (databases, Redis, payment gateways) in unit tests, and assert both the output and the exact arguments passed to the mock (`expect(mockPrisma.booking.create).toHaveBeenCalledWith(...)`).',
      },
    ],
    'testing-integration-supertest-overrides': [
      {
        question: 'Why do we need `supertest` + `moduleRef.createNestApplication()` if our controller & service unit tests already pass 100%?',
        antiPattern:
          'In a controller unit test (`await controller.create(dto)`), you pass a pre-constructed TypeScript object directly into the method. NestJS **never runs** `@UseGuards()`, `ValidationPipe`, `ParseIntPipe`, `@UseInterceptors()`, or `@UseFilters()`! A broken `@Min(50)` rule or a missing `@Type(() => Number)` decorator will pass 100% of unit tests and fail in production.',
        technicalReason:
          '`moduleRef.createNestApplication()` mounts the full NestJS HTTP adapter, routing table, Guard chain, Pipe transformation/validation pipeline, Interceptor RxJS stream, and Exception Filter layer. Sending requests via `request(app.getHttpServer())` exercises the exact runtime path that real HTTP clients hit.',
        bestPracticeRule:
          'Pair fast isolated service unit tests with `supertest` HTTP integration tests that verify status codes (`200`, `201`, `400`, `401`, `403`, `409`), DTO `ValidationPipe` rejection, and Guard enforcement.',
      },
      {
        question: 'Why must you call `app.useGlobalPipes(new ValidationPipe(...))` inside your E2E test setup when it is already in `main.ts`?',
        antiPattern:
          'Assuming `Test.createTestingModule({ imports: [AppModule] })` automatically loads the `app.useGlobalPipes(...)` calls from `main.ts` leads to a classic NestJS gotcha: your E2E tests accept invalid DTO payloads with `201 Created` because `main.ts` is never executed during `jest` runs!',
        technicalReason:
          '`main.ts` is an imperative bootstrap script, not a declarative `@Module`. Unless you register global pipes via `{ provide: APP_PIPE, useClass: ValidationPipe }` inside a module, `moduleRef.createNestApplication()` starts with zero global pipes.',
        bestPracticeRule:
          'Either register `APP_PIPE` / `APP_GUARD` / `APP_INTERCEPTOR` inside `AppModule` providers, or share a `configureNestApp(app)` helper called by both `main.ts` and your `beforeEach` E2E test harness before `await app.init()`.',
      },
      {
        question: 'Why use `.overrideGuard(JwtAuthGuard).useValue(...)` in integration tests instead of mocking `jwtService.verify()` deep inside the auth module?',
        antiPattern:
          'Trying to sign real RSA JWTs or mock internal Passport strategies in every controller integration test couples unrelated feature tests (like Hostel Listings or Escrow Checkout) to your authentication cryptography.',
        technicalReason:
          '`TestingModuleBuilder.overrideGuard(TargetGuard).useValue({ canActivate: (ctx) => ... })` swaps the guard implementation inside the DI container while preserving the `@UseGuards(TargetGuard)` decorator metadata on your controller. You prove the route is protected by `TargetGuard` and inject a deterministic `req.user` persona in 5 lines of code.',
        bestPracticeRule:
          'Use `.overrideGuard()` to inject test personas (`student`, `landlord`, `admin`) when testing feature controllers, and keep 1 dedicated E2E spec that tests the real `JwtAuthGuard` with valid/expired tokens.',
      },
    ],
  };

  // Expose globally and also attach to each subconcept in window.NEST_CURRICULUM
  global.NEST_ARCHITECTURAL_RATIONALE = RATIONALE_BY_SUBCONCEPT;

  function renderRationaleHtml(decisions) {
    if (!Array.isArray(decisions) || decisions.length === 0) return '';
    return decisions
      .map(
        (d, idx) => `
        <div class="rationale-decision-card">
          <div class="rationale-q">
            <span class="rationale-num">Decision #${idx + 1}</span>
            <h5>🤔 ${d.question}</h5>
          </div>
          <div class="rationale-grid">
            <div class="rationale-box anti-pattern">
              <strong>❌ Why Not Do It Directly? (The Anti-Pattern)</strong>
              <p>${d.antiPattern.replace(/\n/g, '<br/>')}</p>
            </div>
            <div class="rationale-box technical-why">
              <strong>⚙️ Technical &amp; Architectural Reason</strong>
              <p>${d.technicalReason.replace(/\n/g, '<br/>')}</p>
            </div>
          </div>
          <div class="rationale-rule">
            <strong>🏆 Best-Practice Rule:</strong> ${d.bestPracticeRule}
          </div>
        </div>
      `,
      )
      .join('');
  }

  global.renderArchitecturalRationaleHtml = renderRationaleHtml;

  // Enrich window.NEST_CURRICULUM subconcepts if already loaded
  if (Array.isArray(global.NEST_CURRICULUM)) {
    for (const mod of global.NEST_CURRICULUM) {
      for (const sub of mod.subconcepts || []) {
        if (RATIONALE_BY_SUBCONCEPT[sub.id]) {
          sub.architecturalDecisions = RATIONALE_BY_SUBCONCEPT[sub.id];
          sub.deepDiveHtml = renderRationaleHtml(RATIONALE_BY_SUBCONCEPT[sub.id]);
        }
      }
    }
  }
})(window);

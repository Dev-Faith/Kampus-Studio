/**
 * Kampus PropTech — Prisma ORM Mastery & Architectural Decision Guide
 * Interactive schema.prisma Decompiler, Prisma Client vs Raw SQL/JS Rosetta Stone,
 * Token-by-Token Syntax Reference, and "Why We Build It This Way" Decision Cards.
 */
(function (global) {
  'use strict';

  global.NEST_PRISMA_FULL_SCHEMA = `// prisma/schema.prisma — Kampus Student Housing & Rent Escrow Platform
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  student
  landlord
  admin
}

enum VerificationTier {
  basic
  verified
  campus_admin
}

model User {
  id               String           @id @default(cuid())
  email            String           @unique
  name             String
  role             Role             @default(student)
  tier             VerificationTier @default(basic)
  passwordHash     String           @map("password_hash")
  refreshTokenHash String?          @map("refresh_token_hash")
  escrowBalance    Int              @default(0) @map("escrow_balance") // Stored in whole USD / minor units (never Float!)
  listings         Listing[]        @relation("LandlordListings")
  bookings         Booking[]        @relation("StudentBookings")
  createdAt        DateTime         @default(now()) @map("created_at")
  updatedAt        DateTime         @updatedAt @map("updated_at")

  @@index([role, tier])
  @@map("kampus_users")
}

model Listing {
  id             Int       @id @default(autoincrement())
  title          String
  campusZone     String    @map("campus_zone")
  rentPerYear    Int       @map("rent_per_year")
  roomsAvailable Int       @default(1) @map("rooms_available")
  amenities      String[]
  verified       Boolean   @default(false)
  published      Boolean   @default(false)
  landlordId     String    @map("landlord_id")
  landlord       User      @relation("LandlordListings", fields: [landlordId], references: [id], onDelete: Restrict)
  bookings       Booking[]
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  @@index([campusZone, published, rentPerYear])
  @@index([landlordId])
  @@map("kampus_listings")
}

model Booking {
  id             String   @id @default(cuid())
  studentId      String   @map("student_id")
  student        User     @relation("StudentBookings", fields: [studentId], references: [id], onDelete: Restrict)
  listingId      Int      @map("listing_id")
  listing        Listing  @relation(fields: [listingId], references: [id], onDelete: Restrict)
  amount         Int
  status         String   @default("held-in-escrow")
  idempotencyKey String?  @unique @map("idempotency_key")
  createdAt      DateTime @default(now()) @map("created_at")

  @@unique([studentId, listingId])
  @@index([studentId, status])
  @@map("kampus_bookings")
}`;

  global.NEST_PRISMA_SCHEMA_EXPLORER = [
    {
      id: 'schema-id-strategy',
      badge: '@id & @default(cuid() vs autoincrement())',
      title: 'Primary Key Strategy: Why CUIDs for Users/Bookings & Int for Hostels?',
      prismaSnippet: `model User {
  id String @id @default(cuid())
}

model Listing {
  id Int @id @default(autoincrement())
}`,
      sqlEquivalent: `CREATE TABLE "kampus_users" (
  "id" TEXT NOT NULL PRIMARY KEY
  -- Prisma generates collision-resistant CUIDs in the app layer: 'clx9a8f...'
);

CREATE TABLE "kampus_listings" (
  "id" SERIAL PRIMARY KEY
);`,
      whyDecision:
        'Using `autoincrement()` (`1, 2, 3`) on `User` or `Booking` exposes an **Enumeration Vulnerability (IDOR)**: competitors can see how many students signed up today, and attackers can loop `/bookings/101`, `/bookings/102`. For `User` and `Booking`, `@default(cuid())` generates URL-safe, monotonically increasing, collision-resistant string IDs without needing database coordination. For public `Listing` URLs (`/listings/1`), compact integers remain clean and human-friendly.',
      bestPractice:
        'Use `@default(cuid())` (or `uuid()`) for private user/financial records (`User`, `Booking`), and reserve `@default(autoincrement())` for public catalog items or internal join tables.',
    },
    {
      id: 'schema-relations-ondelete',
      badge: '@relation(..., onDelete: Restrict)',
      title: 'Foreign Keys & Referential Actions: Why onDelete: Restrict Instead of Cascade?',
      prismaSnippet: `model Listing {
  landlordId String @map("landlord_id")
  landlord   User   @relation(
    "LandlordListings",
    fields: [landlordId],
    references: [id],
    onDelete: Restrict
  )
}`,
      sqlEquivalent: `ALTER TABLE "kampus_listings"
ADD CONSTRAINT "kampus_listings_landlord_id_fkey"
FOREIGN KEY ("landlord_id") REFERENCES "kampus_users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;`,
      whyDecision:
        'If you set `onDelete: Cascade` on `User -> Listing -> Booking`, accidentally deleting a landlord account would silently wipe out all their hostels AND every student\'s paid escrow booking history! `onDelete: Restrict` instructs PostgreSQL to block the deletion (`P2003 Foreign Key Constraint`) if any dependent hostel or booking exists, forcing you to use soft-deletes (`deletedAt DateTime?`) or archive records safely.',
      bestPractice:
        'Always set `onDelete: Restrict` on financial, booking, and ownership relations; only use `onDelete: Cascade` on disposable child tables like session tokens or temporary OTP codes.',
    },
    {
      id: 'schema-composite-index',
      badge: '@@index([campusZone, published, rentPerYear])',
      title: 'Composite Index Column Order: The Equality → Range Rule (ESR)',
      prismaSnippet: `model Listing {
  campusZone  String
  published   Boolean @default(false)
  rentPerYear Int

  // Equality columns FIRST, Range/Sort column LAST:
  @@index([campusZone, published, rentPerYear])
}`,
      sqlEquivalent: `CREATE INDEX "kampus_listings_campus_zone_published_rent_per_year_idx"
ON "kampus_listings" ("campus_zone", "published", "rent_per_year" ASC);`,
      whyDecision:
        'Students constantly run `where: { campusZone: "North Gate", published: true, rentPerYear: { lte: 200 } }, orderBy: { rentPerYear: "asc" }`. In a B-Tree index, PostgreSQL narrows down exact matches (`campusZone =`, `published =`) first, and then scans the sorted `rentPerYear` slice in `O(log N)` time without an extra in-memory sort! If you put `rentPerYear` first in `@@index([rentPerYear, campusZone])`, the range operator (`<=`) breaks B-Tree prefix ordering for the remaining columns.',
      bestPractice:
        'Design `@@index([...])` following the **ESR Rule**: **E**quality columns first (`campusZone`, `published`), **S**ort / **R**ange columns last (`rentPerYear`, `createdAt`).',
    },
    {
      id: 'schema-money-types',
      badge: 'Int / Decimal vs Float for Money',
      title: 'Financial Precision: Why We Never Use Float for Rent or Escrow Balances',
      prismaSnippet: `model User {
  // ✅ GOOD: Integer minor units (cents/kobo) or whole USD, or Prisma.Decimal
  escrowBalance Int @default(0)
  // ❌ NEVER DO THIS FOR MONEY:
  // escrowBalance Float
}`,
      sqlEquivalent: `ALTER TABLE "kampus_users"
ADD COLUMN "escrow_balance" INTEGER NOT NULL DEFAULT 0;
-- Or for fractional currency: NUMERIC(12, 2) via Decimal @db.Decimal(12, 2)`,
      whyDecision:
        'IEEE 754 binary floating-point (`Float` / `DOUBLE PRECISION`) cannot represent `0.1` or `0.2` exactly (`0.1 + 0.2 === 0.30000000000000004`). Over thousands of escrow fee calculations, rounding drift corrupts ledger balances. Storing money as `Int` (in cents/kobo or whole USD) or `Decimal @db.Decimal(12, 2)` guarantees exact arithmetic.',
      bestPractice:
        'Store all monetary values (`rentPerYear`, `escrowBalance`, `amount`) as `Int` (smallest currency unit like cents/kobo) or `Decimal`—never `Float`.',
    },
    {
      id: 'schema-composite-unique',
      badge: '@@unique([studentId, listingId]) & idempotencyKey @unique',
      title: 'Database-Level Invariants: Stopping Duplicate Bookings & Double Charges',
      prismaSnippet: `model Booking {
  studentId      String
  listingId      Int
  idempotencyKey String? @unique

  @@unique([studentId, listingId])
}`,
      sqlEquivalent: `CREATE UNIQUE INDEX "kampus_bookings_idempotency_key_key"
ON "kampus_bookings"("idempotency_key");

CREATE UNIQUE INDEX "kampus_bookings_student_id_listing_id_key"
ON "kampus_bookings"("student_id", "listing_id");`,
      whyDecision:
        'Application-level `if (await findFirst(...))` checks fail under concurrent requests because two Node.js workers can pass the check at the same millisecond. Declaring `@@unique([studentId, listingId])` and `idempotencyKey @unique` in `schema.prisma` creates a unique B-Tree index in PostgreSQL that physically guarantees two identical rows can never be committed.',
      bestPractice:
        'Enforce business uniqueness rules in `schema.prisma` with `@unique` and `@@unique([...])`, not just in application `if` statements.',
    },
    {
      id: 'schema-map-naming',
      badge: '@map("snake_case") & @@map("table_name")',
      title: 'Dual Naming Conventions: Idiomatic TypeScript camelCase + PostgreSQL snake_case',
      prismaSnippet: `model Listing {
  campusZone  String   @map("campus_zone")
  rentPerYear Int      @map("rent_per_year")
  UpdatedAt   DateTime @updatedAt @map("updated_at")

  @@map("kampus_listings")
}`,
      sqlEquivalent: `-- In PostgreSQL, unquoted identifiers fold to lowercase snake_case:
SELECT campus_zone, rent_per_year, updated_at
FROM kampus_listings;`,
      whyDecision:
        'PostgreSQL convention uses `snake_case` (`kampus_listings.rent_per_year`) so raw SQL queries by data analysts don\'t require awkward double quotes (`SELECT "rentPerYear" FROM "Listing"`). Meanwhile, TypeScript/NestJS convention uses `camelCase` (`listing.rentPerYear`). `@map` and `@@map` bridge both worlds with zero runtime overhead.',
      bestPractice:
        'Use `@map("snake_case")` on multi-word columns and `@@map("plural_snake_case")` on models so both TypeScript engineers and SQL analysts get clean naming.',
    },
  ];

  global.NEST_PRISMA_CHAPTERS = [
    // =========================================================================
    // CHAPTER 1: PRISMASERVICE SINGLETON & LIFECYCLE IN NESTJS
    // =========================================================================
    {
      id: 'prisma-service-lifecycle',
      number: '01',
      category: 'Architecture & DI',
      title: 'PrismaService Singleton, Connection Pooling & Lifecycle Hooks',
      subtitle: 'How PrismaClient integrates with NestJS Dependency Injection, OnModuleInit, and OnModuleDestroy.',
      sandboxConceptId: 'prisma-queries-relations',
      keyTakeaway:
        'Extend PrismaClient inside a single @Global() @Injectable() PrismaService so your entire NestJS application shares one PostgreSQL connection pool.',
      prismaCode: `// prisma.service.ts (NestJS + Prisma Best Practice)
import { Injectable, OnModuleInit, OnModuleDestroy, Global, Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // Open the PostgreSQL connection pool before accepting HTTP traffic
    await this.$connect();
  }

  async onModuleDestroy() {
    // Drain active queries & close pool cleanly on SIGTERM / shutdown
    await this.$disconnect();
  }
}

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}`,
      rawSqlOrJsCode: `// ❌ Anti-Pattern 1: Instantiating PrismaClient inside every service/controller
import { PrismaClient } from '@prisma/client';

export class ListingsService {
  // DANGER: Every new PrismaClient() spawns a separate pool of 5-10 DB connections!
  // 15 services = 150 connections -> crashes Postgres with "too many clients already"
  private prisma = new PrismaClient();
}

// Equivalent Raw Node.js pg.Pool boilerplate that PrismaService replaces:
import { Pool } from 'pg';
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});
process.on('SIGTERM', async () => {
  await pool.end();
});`,
      syntaxMap: [
        {
          prismaToken: 'extends PrismaClient',
          sqlOrJsEquivalent: 'Wraps pg.Pool + Prisma Query Engine',
          purpose: 'Gives `PrismaService` all generated model delegates (`this.user`, `this.listing`, `this.booking`, `this.$transaction`).',
        },
        {
          prismaToken: 'await this.$connect()',
          sqlOrJsEquivalent: 'await pool.connect()',
          purpose: 'Eagerly establishes the PostgreSQL connection pool during `onModuleInit()` so the first student HTTP request does not suffer a cold-start delay.',
        },
        {
          prismaToken: 'await this.$disconnect()',
          sqlOrJsEquivalent: 'await pool.end()',
          purpose: 'Flushes in-flight queries and releases database sockets during `onModuleDestroy()` when Kubernetes scales down or restarts pods.',
        },
        {
          prismaToken: '@Global() @Module({ exports: [PrismaService] })',
          sqlOrJsEquivalent: 'Shared singleton module export',
          purpose: 'Makes the single `PrismaService` instance injectable across `ListingsModule`, `EscrowModule`, and `AuthModule` without re-instantiating it.',
        },
      ],
      decisions: [
        {
          question: 'Why must `PrismaService` be a singleton DI provider instead of calling `new PrismaClient()` in each service?',
          antiPattern:
            'Each `new PrismaClient()` instance manages its own internal connection pool (defaulting to `num_physical_cpus * 2 + 1` connections). Creating multiple `PrismaClient` instances across modules—or worse, inside request handlers—exhausts PostgreSQL `max_connections` (often 100) under moderate traffic.',
          technicalReason:
            'NestJS DI caches `@Injectable() PrismaService` as a singleton within the IoC container. Marking `PrismaModule` with `@Global()` ensures every controller and service injects the exact same `PrismaService` object reference and shares one bounded connection pool.',
          bestPracticeRule:
            'Create exactly one `PrismaService` class in a `@Global() PrismaModule` and always inject it via `constructor(private readonly prisma: PrismaService) {}`.',
        },
        {
          question: 'Why call `await this.$connect()` inside `onModuleInit()` instead of lazily waiting for the first query?',
          antiPattern:
            'Prisma connects lazily on the first query by default. If your `DATABASE_URL` credentials are wrong or the VPC firewall blocks port `5432`, your NestJS container will boot up, report "healthy", and only start failing when the first real student request hits an endpoint!',
          technicalReason:
            'Awaiting `this.$connect()` inside `onModuleInit()` forces NestJS to verify database connectivity *before* `app.listen(3000)` binds the HTTP port. If PostgreSQL is unreachable, the pod fails fast during startup rather than serving broken traffic.',
          bestPracticeRule:
            'Always implement `OnModuleInit` (`await this.$connect()`) and `OnModuleDestroy` (`await this.$disconnect()`) on `PrismaService`.',
        },
      ],
    },

    // =========================================================================
    // CHAPTER 2: PRECISION READS — FINDUNIQUE VS FINDFIRST, WHERE & RELATIONAL FILTERS
    // =========================================================================
    {
      id: 'prisma-find-where-operators',
      number: '02',
      category: 'Querying & Filtering',
      title: 'Precision Reads: findUnique vs findFirst, findMany & Relational where Filters',
      subtitle: 'Master Prisma filter operators (lte, gte, contains, in) and relational quantifiers (some, every, none).',
      sandboxConceptId: 'prisma-queries-relations',
      keyTakeaway:
        'Use findUnique only for @id or @unique columns (guaranteed index lookup), and use relational where filters (some/every/none) to filter in SQL instead of JavaScript memory.',
      prismaCode: `// Querying Kampus Hostels & Landlords with Prisma Client
@Injectable()
export class KampusSearchService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Unique index lookup (@id or @unique ONLY)
  async getHostelById(id: number) {
    return this.prisma.listing.findUniqueOrThrow({
      where: { id }, // TypeScript compiler rejects non-unique fields here!
    });
  }

  // 2. Dynamic filtering with range, array, and case-insensitive search
  async searchHostels(zone?: string, maxRent = 200) {
    return this.prisma.listing.findMany({
      where: {
        published: true,
        verified: true,
        ...(zone ? { campusZone: { contains: zone, mode: 'insensitive' } } : {}),
        rentPerYear: { lte: maxRent, gte: 50 },
        roomsAvailable: { gt: 0 },
      },
      orderBy: [{ rentPerYear: 'asc' }, { id: 'desc' }],
    });
  }

  // 3. Relational existential filter (EXISTS subquery in SQL)
  async findLandlordsWithVerifiedHostels() {
    return this.prisma.user.findMany({
      where: {
        role: 'landlord',
        listings: {
          some: { verified: true, roomsAvailable: { gt: 0 } },
        },
      },
    });
  }
}`,
      rawSqlOrJsCode: `-- 1. SQL generated by findUnique({ where: { id } }):
SELECT * FROM "kampus_listings" WHERE "id" = $1 LIMIT 1;

-- 2. SQL generated by searchHostels():
SELECT * FROM "kampus_listings"
WHERE "published" = true
  AND "verified" = true
  AND "campus_zone" ILIKE '%North Gate%'
  AND "rent_per_year" <= 200 AND "rent_per_year" >= 50
  AND "rooms_available" > 0
ORDER BY "rent_per_year" ASC, "id" DESC;

-- 3. SQL generated by listings: { some: { verified: true } }:
SELECT * FROM "kampus_users" AS u
WHERE u."role" = 'landlord'
  AND EXISTS (
    SELECT 1 FROM "kampus_listings" AS l
    WHERE l."landlord_id" = u."id"
      AND l."verified" = true
      AND l."rooms_available" > 0
  );`,
      syntaxMap: [
        {
          prismaToken: 'findUnique({ where: { id } })',
          sqlOrJsEquivalent: 'WHERE "id" = $1 (Unique B-Tree Index)',
          purpose: 'Accepts ONLY `@id`, `@unique`, or `@@unique` fields in `where`. Guarantees an `O(log N)` unique index lookup and enables Prisma automatic request batching.',
        },
        {
          prismaToken: 'findFirst({ where: { campusZone } })',
          sqlOrJsEquivalent: 'WHERE ... ORDER BY ... LIMIT 1',
          purpose: 'Accepts ANY filterable field (including non-unique columns and relation filters) and returns the first matching record or `null`.',
        },
        {
          prismaToken: 'rentPerYear: { lte: 200, gte: 50 }',
          sqlOrJsEquivalent: 'rent_per_year <= 200 AND rent_per_year >= 50',
          purpose: 'Numeric/Date comparison operators: `lt` (`<`), `lte` (`<=`), `gt` (`>`), `gte` (`>=`), `equals` (`=`), `not` (`!=`), `in` (`IN (...)`).',
        },
        {
          prismaToken: 'listings: { some: { verified: true } }',
          sqlOrJsEquivalent: 'WHERE EXISTS (SELECT 1 FROM listings ...)',
          purpose: 'One-to-many relation quantifiers: `some` (at least 1 matches), `every` (all match), `none` (0 match).',
        },
        {
          prismaToken: '...(zone ? { campusZone: zone } : {})',
          sqlOrJsEquivalent: 'Conditional SQL WHERE clause builder',
          purpose: 'Cleanly omits optional query filters when `zone` is `undefined` without string-concatenating SQL.',
        },
      ],
      decisions: [
        {
          question: 'Why does Prisma split single-row lookups into `findUnique` AND `findFirst` instead of having just `findOne`?',
          antiPattern:
            'In older ORMs (like TypeORM `findOne`), developers accidentally pass non-indexed columns (`findOne({ where: { title: "..." } })`), triggering silent full-table scans in production when tables grow to millions of rows.',
          technicalReason:
            '1) **`findUnique` is a compile-time performance contract**: TypeScript only allows `@id` or `@unique` fields in `findUnique({ where })`, guaranteeing your query hits a unique database index.\n2) **DataLoader Batching**: If 10 concurrent resolvers call `findUnique({ where: { id } })` in the same tick, Prisma\'s engine automatically merges them into a single `WHERE "id" IN ($1, $2, ...)` query!',
          bestPracticeRule:
            'Always reach for `findUnique` (or `findUniqueOrThrow`) first; only use `findFirst` when intentionally querying by non-unique columns.',
        },
        {
          question: 'Why use relational filters (`listings: { some: { verified: true } }`) instead of fetching users with `include: { listings: true }` and filtering in JS?',
          antiPattern:
            'Loading 10,000 landlords and all 40,000 of their hostels into Node.js memory just to run `.filter(u => u.listings.some(l => l.verified))` wastes megabytes of network bandwidth, spikes V8 garbage collection, and breaks pagination counts.',
          technicalReason:
            '`listings: { some: { verified: true } }` compiles to a correlated `WHERE EXISTS (SELECT 1 ...)` semi-join inside PostgreSQL, returning only the matching landlord rows over the socket.',
          bestPracticeRule:
            'Never filter database relations in JavaScript `.filter()`; push the predicate into Prisma `where` using `some`, `every`, or `none`.',
        },
      ],
    },

    // =========================================================================
    // CHAPTER 3: PROJECTIONS & RELATIONS — SELECT VS INCLUDE & SOLVING N+1
    // =========================================================================
    {
      id: 'prisma-select-vs-include-n1',
      number: '03',
      category: 'Relations & Security',
      title: 'Projections & Eager Loading: select vs include, _count, & Solving N+1 Queries',
      subtitle: 'Shape exact TypeScript return types, prevent passwordHash leaks, and eliminate N+1 loop queries.',
      sandboxConceptId: 'prisma-queries-relations',
      keyTakeaway:
        'Use select for surgical column whitelisting (especially on User!) and include with nested select to load relations in 1 batched round-trip instead of N+1 queries.',
      prismaCode: `// Surgical Projections (select) vs Relation Loading (include)
@Injectable()
export class HostelCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. select: Whitelist ONLY specific columns (omits passwordHash & refreshTokenHash!)
  async getPublicLandlordDirectory() {
    return this.prisma.user.findMany({
      where: { role: 'landlord' },
      select: {
        id: true,
        name: true,
        tier: true,
        // Count related hostels in SQL without loading the hostel rows!
        _count: { select: { listings: true } },
      },
    });
  }

  // 2. include + nested select: Load all Listing scalars + safe Landlord fields
  async getPublishedHostelsWithLandlord() {
    return this.prisma.listing.findMany({
      where: { published: true },
      include: {
        landlord: {
          // Nested select inside include prevents leaking landlord.passwordHash!
          select: { id: true, name: true, tier: true },
        },
      },
    });
  }
}`,
      rawSqlOrJsCode: `// ❌ THE N+1 QUERY ANTI-PATTERN (51 Database Round-Trips for 50 Hostels!):
const listings = await prisma.listing.findMany({ where: { published: true } }); // Query #1
for (const listing of listings) {
  // ❌ Runs 50 separate SQL queries inside a loop!
  listing.landlord = await prisma.user.findUnique({
    where: { id: listing.landlordId },
  });
}

// ✅ What Prisma include: { landlord: { select: ... } } executes (Only 2 queries total!):
// Query 1: SELECT * FROM "kampus_listings" WHERE "published" = true;
// Query 2: SELECT "id", "name", "tier" FROM "kampus_users" WHERE "id" IN ('u-landlord-2', ...);`,
      syntaxMap: [
        {
          prismaToken: 'select: { id: true, name: true }',
          sqlOrJsEquivalent: 'SELECT "id", "name" FROM ...',
          purpose: 'Exclusive projection: returns ONLY the keys marked `true`. The inferred TypeScript return type automatically narrows to `{ id: string; name: string }`.',
        },
        {
          prismaToken: 'include: { landlord: true }',
          sqlOrJsEquivalent: 'SELECT listing.*, user.* (Batched JOIN / IN)',
          purpose: 'Additive relation loading: returns all scalar fields of `Listing` PLUS the specified related models.',
        },
        {
          prismaToken: 'include: { landlord: { select: { id: true, name: true } } }',
          sqlOrJsEquivalent: 'JOIN with column whitelist on joined table',
          purpose: 'Best of both worlds: loads all `Listing` fields while restricting the joined `User` object to public columns only.',
        },
        {
          prismaToken: '_count: { select: { listings: true } }',
          sqlOrJsEquivalent: 'SELECT (SELECT COUNT(*) FROM listings WHERE ...) AS _count',
          purpose: 'Computes the relation count in SQL without transferring the child rows over the network.',
        },
      ],
      decisions: [
        {
          question: 'Why does Prisma forbid using `select` and `include` at the same root level of a query?',
          antiPattern:
            'Writing `{ select: { id: true, title: true }, include: { landlord: true } }` at the same level is contradictory: `select` says "exclude every field except `id` and `title`", while `include` says "return all scalar fields plus `landlord`".',
          technicalReason:
            'In Prisma, `select` can already include relations (`select: { id: true, title: true, landlord: { select: { name: true } } }`), and `include` can nest `select` inside relations (`include: { landlord: { select: { name: true } } }`). Separating them at the root level keeps the TypeScript return-type inference unambiguous.',
          bestPracticeRule:
            'Choose `select` at the root when you want a subset of parent columns; choose `include` at the root when you want all parent columns plus relations (and nest `select` inside `include` for sensitive relations like `User`).',
        },
        {
          question: 'Why is `include: { landlord: true }` dangerous when `landlord` points to the `User` model?',
          antiPattern:
            '`include: { landlord: true }` instructs Prisma to `SELECT` every column of the `User` table—including `passwordHash`, `refreshTokenHash`, and `escrowBalance`. If your controller returns that object directly without a serializer DTO, every student browsing hostels receives the landlord\'s bcrypt password hash in the JSON response!',
          technicalReason:
            'Using `include: { landlord: { select: { id: true, name: true, tier: true } } }` strips sensitive columns at the SQL query layer before data even enters Node.js memory.',
          bestPracticeRule:
            'Whenever joining or querying the `User` table in Prisma, always apply an explicit `select` whitelist so `passwordHash` and `refreshTokenHash` are never fetched.',
        },
      ],
    },

    // =========================================================================
    // CHAPTER 4: PAGINATION & AGGREGATIONS — CURSOR VS OFFSET
    // =========================================================================
    {
      id: 'prisma-pagination-cursor-vs-offset',
      number: '04',
      category: 'Performance & Analytics',
      title: 'High-Speed Pagination & Analytics: Cursor vs Offset (skip/take) & aggregate',
      subtitle: 'Keep infinite-scroll hostel feeds O(1) at any depth and run SQL aggregations without loading rows.',
      sandboxConceptId: 'prisma-queries-relations',
      keyTakeaway:
        'Use cursor pagination (cursor: { id: lastId }, skip: 1, take: 20) for infinite feeds so PostgreSQL jumps directly to the B-Tree node instead of scanning and discarding skipped rows.',
      prismaCode: `// Cursor Pagination vs Offset Pagination & SQL Aggregations
@Injectable()
export class KampusAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Cursor Pagination (O(1) keyset seek using primary key index!)
  async getHostelFeedCursor(lastSeenId?: number, pageSize = 20) {
    return this.prisma.listing.findMany({
      where: { published: true },
      take: pageSize,
      ...(lastSeenId
        ? {
            cursor: { id: lastSeenId },
            skip: 1, // Skip the cursor item itself so it isn't repeated!
          }
        : {}),
      orderBy: { id: 'asc' },
    });
  }

  // 2. Database-level Aggregation (1 row returned from Postgres)
  async getCampusRentMetrics(campusZone: string) {
    return this.prisma.listing.aggregate({
      where: { campusZone, verified: true, published: true },
      _count: true,
      _avg: { rentPerYear: true },
      _min: { rentPerYear: true },
      _max: { rentPerYear: true },
      _sum: { roomsAvailable: true },
    });
  }
}`,
      rawSqlOrJsCode: `-- ❌ Why Offset Pagination (skip: 50000, take: 20) is slow on deep pages:
SELECT * FROM "kampus_listings"
WHERE "published" = true
ORDER BY "id" ASC
LIMIT 20 OFFSET 50000;
-- Postgres must fetch, sort, and discard 50,000 rows before returning 20!

-- ✅ What Cursor Pagination (cursor: { id: 50000 }, skip: 1, take: 20) runs:
SELECT * FROM "kampus_listings"
WHERE "published" = true AND "id" > 50000
ORDER BY "id" ASC
LIMIT 20;
-- Instant B-Tree index seek on ("id" > 50000)!

-- ✅ SQL generated by prisma.listing.aggregate():
SELECT COUNT(*), AVG("rent_per_year"), MIN("rent_per_year"),
       MAX("rent_per_year"), SUM("rooms_available")
FROM "kampus_listings"
WHERE "campus_zone" = $1 AND "verified" = true AND "published" = true;`,
      syntaxMap: [
        {
          prismaToken: 'cursor: { id: lastSeenId }, skip: 1',
          sqlOrJsEquivalent: 'WHERE "id" > $1 LIMIT 20',
          purpose: 'Starts the query right after the unique cursor row (`skip: 1` omits the anchor row itself).',
        },
        {
          prismaToken: 'skip: (page - 1) * take, take: 20',
          sqlOrJsEquivalent: 'LIMIT 20 OFFSET $1',
          purpose: 'Offset pagination: good for small admin tables with numbered page buttons (`1, 2, 3`), slow on deep offsets (`> 10,000`).',
        },
        {
          prismaToken: 'aggregate({ _count, _avg, _min, _max, _sum })',
          sqlOrJsEquivalent: 'SELECT COUNT(*), AVG(...), MIN(...), MAX(...), SUM(...)',
          purpose: 'Computes summary statistics inside PostgreSQL C code and returns a single compact summary object.',
        },
      ],
      decisions: [
        {
          question: 'Why must you include `skip: 1` whenever you pass `cursor: { id: lastSeenId }` in Prisma?',
          antiPattern:
            'In Prisma, `cursor: { id: 10 }` sets an **inclusive** anchor (`WHERE "id" >= 10`). If you omit `skip: 1`, item `#10` (the last hostel on Page 1) will appear again as the first hostel on Page 2, causing duplicate React keys on the frontend!',
          technicalReason:
            'Passing `cursor: { id: lastSeenId }, skip: 1, take: 20` tells Prisma to anchor at `id = lastSeenId` in the B-Tree index, step past that single anchor row (`skip: 1`), and take the next `20` rows.',
          bestPracticeRule:
            'On Page 1, omit `cursor` and `skip`; on Page 2+, always pair `cursor: { id: lastCursorId }` with `skip: 1`.',
        },
        {
          question: 'When should we use Cursor pagination vs Offset (`skip`/`take`) pagination in Kampus?',
          antiPattern:
            '1) Using Offset pagination (`skip: 20, take: 20`) on a real-time mobile feed causes **row drift**: if Landlord Chidi posts a new hostel while Adaobi is reading Page 1, item #20 shifts down to position #21 and Adaobi sees it twice on Page 2.\n2) Deep offsets (`OFFSET 50000`) degrade linearly (`O(N)`) with page depth.',
          technicalReason:
            'Cursor pagination anchors to a specific immutable row ID (`cursor: { id }`), so new insertions above the cursor never cause duplicate items and query latency stays flat (`O(1)`) whether the user is on page 1 or page 5,000.',
          bestPracticeRule:
            'Use Cursor pagination for mobile infinite-scroll feeds and high-volume APIs; use Offset (`skip`/`take`) only for bounded back-office admin tables that require "Jump to Page 7" buttons.',
        },
      ],
    },

    // =========================================================================
    // CHAPTER 5: SAFE MUTATIONS — UPSERT, NESTED WRITES & ATOMIC INCREMENT/DECREMENT
    // =========================================================================
    {
      id: 'prisma-writes-nested-upsert-atomic',
      number: '05',
      category: 'Atomic Writes & Concurrency',
      title: 'Safe Mutations: Atomic { decrement / increment }, upsert, & Nested Writes',
      subtitle: 'Eliminate Read-Modify-Write and TOCTOU race conditions on hostel room counts and user profiles.',
      sandboxConceptId: 'prisma-transactions-atomic',
      keyTakeaway:
        'Never compute counters or balances in JavaScript (x - 1) before calling update(); always use Prisma atomic operations ({ decrement: 1 }, { increment: amount }) and upsert().',
      prismaCode: `// Atomic Mutations in Kampus PropTech
@Injectable()
export class KampusMutationService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Atomic Counter Update (Immune to concurrent Lost Update race conditions!)
  async decrementHostelRoom(listingId: number) {
    return this.prisma.listing.update({
      where: { id: listingId },
      data: {
        roomsAvailable: { decrement: 1 },
      },
    });
  }

  // 2. Atomic Upsert (Immune to TOCTOU duplicate email crashes!)
  async syncStudentFromUniversitySso(email: string, name: string) {
    return this.prisma.user.upsert({
      where: { email },
      update: { name, tier: 'verified' },
      create: { email, name, role: 'student', tier: 'verified' },
      select: { id: true, email: true, name: true, tier: true },
    });
  }

  // 3. Nested Transactional Write (Creates Landlord + First Hostel in 1 ACID unit)
  async onboardLandlordWithHostel(email: string, name: string, hostelTitle: string) {
    return this.prisma.user.create({
      data: {
        email,
        name,
        role: 'landlord',
        listings: {
          create: [
            { title: hostelTitle, campusZone: 'North Gate', rentPerYear: 180 },
          ],
        },
      },
      include: { listings: true },
    });
  }
}`,
      rawSqlOrJsCode: `// ❌ Anti-Pattern 1: Read-Modify-Write Race Condition in JavaScript
const listing = await prisma.listing.findUnique({ where: { id: 1 } }); // Both requests read 1
await prisma.listing.update({
  where: { id: 1 },
  data: { roomsAvailable: listing.roomsAvailable - 1 }, // Both write 0! Overbooked!
});

// ✅ SQL generated by data: { roomsAvailable: { decrement: 1 } }:
UPDATE "kampus_listings"
SET "rooms_available" = "rooms_available" - 1, "updated_at" = NOW()
WHERE "id" = $1
RETURNING *;

// ✅ SQL generated by prisma.user.upsert():
INSERT INTO "kampus_users" ("id", "email", "name", "role", "tier")
VALUES ($1, $2, $3, 'student', 'verified')
ON CONFLICT ("email") DO UPDATE
SET "name" = EXCLUDED."name", "tier" = 'verified'
RETURNING "id", "email", "name", "tier";`,
      syntaxMap: [
        {
          prismaToken: 'roomsAvailable: { decrement: 1 }',
          sqlOrJsEquivalent: 'SET "rooms_available" = "rooms_available" - 1',
          purpose: 'Atomic numeric operators (`increment`, `decrement`, `multiply`, `divide`, `set`) evaluated inside PostgreSQL\'s row lock.',
        },
        {
          prismaToken: 'upsert({ where, update, create })',
          sqlOrJsEquivalent: 'INSERT ... ON CONFLICT DO UPDATE',
          purpose: 'Atomically updates the record if `where` (must be `@unique` or `@id`) exists, or inserts `create` if not.',
        },
        {
          prismaToken: 'listings: { create: [{ ... }] }',
          sqlOrJsEquivalent: 'Implicit BEGIN -> INSERT user -> INSERT listing -> COMMIT',
          purpose: 'Nested write: Prisma automatically wraps parent + child creation inside an implicit database transaction.',
        },
        {
          prismaToken: 'landlord: { connect: { id: landlordId } }',
          sqlOrJsEquivalent: 'SET "landlord_id" = $1 (Foreign Key link)',
          purpose: 'Links a record to an existing related record by its `@id` or `@unique` field.',
        },
      ],
      decisions: [
        {
          question: 'Why is `data: { roomsAvailable: { decrement: 1 } }` mandatory for inventory and wallet balances?',
          antiPattern:
            'If you read `const l = await prisma.listing.findUnique(...)` in Node.js and then write `data: { roomsAvailable: l.roomsAvailable - 1 }`, two students clicking "Book" within 5ms of each other will both read `roomsAvailable = 1` and both set it to `0`. You just double-sold a single room!',
          technicalReason:
            'With `{ decrement: 1 }`, PostgreSQL executes `SET "rooms_available" = "rooms_available" - 1`. When two concurrent `UPDATE` statements target the same row, PostgreSQL\'s row-level lock forces the second `UPDATE` to wait until the first commits and then re-evaluates `"rooms_available" - 1` against the newly committed value (`0 -> -1`).',
          bestPracticeRule:
            'Always use `{ increment: n }` and `{ decrement: n }` for room availability, wallet balances, and counters.',
        },
        {
          question: 'Why does Prisma wrap nested writes (`user.create({ data: { listings: { create: ... } } })`) in an automatic transaction?',
          antiPattern:
            'If you call `const user = await prisma.user.create(...)` and then `await prisma.listing.create({ data: { landlordId: user.id } })` as two separate statements without `$transaction`, and the second query fails validation, your database is left with an orphaned landlord account with zero hostels.',
          technicalReason:
            'Every single `prisma.<model>.create/update/upsert` call containing nested relation writes (`create`, `connect`, `connectOrCreate`) is automatically wrapped in a `BEGIN ... COMMIT` transaction by the Prisma Query Engine.',
          bestPracticeRule:
            'Use nested writes (`create` / `connect`) when mutating a parent and its direct children; use interactive `$transaction(async (tx) => ...)` when your workflow requires conditional checks between steps.',
        },
      ],
    },

    // =========================================================================
    // CHAPTER 6: ACID TRANSACTIONS — INTERACTIVE $TRANSACTION(ASYNC (TX) => ...)
    // =========================================================================
    {
      id: 'prisma-interactive-transactions',
      number: '06',
      category: 'ACID Transactions',
      title: 'Interactive Transactions: $transaction(async (tx) => ...) & Isolation Traps',
      subtitle: 'Coordinate multi-table rent escrow transfers and room reservations with guaranteed rollback.',
      sandboxConceptId: 'prisma-transactions-atomic',
      keyTakeaway:
        'Inside this.prisma.$transaction(async (tx) => { ... }), ALWAYS call tx.<model> (never this.prisma.<model>!) and keep external HTTP/email calls outside the transaction block.',
      prismaCode: `// Interactive ACID Transaction in Kampus Escrow
@Injectable()
export class EscrowReservationService {
  constructor(private readonly prisma: PrismaService) {}

  async reserveHostelRoom(studentId: string, listingId: number) {
    return this.prisma.$transaction(async (tx) => {
      // Step 1: Atomically decrement room count using the transaction client (tx)
      const listing = await tx.listing.update({
        where: { id: listingId },
        data: { roomsAvailable: { decrement: 1 } },
      });

      // Step 2: Business invariant check — throwing ANY error rolls back Step 1!
      if (listing.roomsAvailable < 0) {
        throw new ConflictException('No rooms available in this hostel — rolled back!');
      }

      // Step 3: Create the student booking inside the SAME transaction
      const booking = await tx.booking.create({
        data: {
          studentId,
          listingId,
          amount: listing.rentPerYear,
          status: 'reserved-in-escrow',
        },
      });

      return { booking, remainingRooms: listing.roomsAvailable };
    });
  }
}`,
      rawSqlOrJsCode: `-- Equivalent PostgreSQL Transaction executed by $transaction(async (tx) => ...):
BEGIN;

UPDATE "kampus_listings"
SET "rooms_available" = "rooms_available" - 1
WHERE "id" = 1
RETURNING *;

-- Application checks: if rooms_available < 0 -> ROLLBACK;

INSERT INTO "kampus_bookings" ("id", "student_id", "listing_id", "amount", "status")
VALUES ('bk-101', 'u-student-3', 1, 180, 'reserved-in-escrow')
RETURNING *;

COMMIT;`,
      syntaxMap: [
        {
          prismaToken: 'this.prisma.$transaction(async (tx) => { ... })',
          sqlOrJsEquivalent: 'BEGIN; ... COMMIT; (or ROLLBACK on throw)',
          purpose: 'Checks out a single dedicated PostgreSQL connection from the pool and runs all `tx.*` queries inside one ACID transaction.',
        },
        {
          prismaToken: 'tx.listing.update(...) / tx.booking.create(...)',
          sqlOrJsEquivalent: 'client.query(...) on the pinned transaction socket',
          purpose: 'Routes the query through the active transaction connection. If the callback throws, all `tx.*` operations roll back.',
        },
        {
          prismaToken: 'this.prisma.$transaction([op1, op2])',
          sqlOrJsEquivalent: 'Batch transaction (no conditional JS logic between ops)',
          purpose: 'Simpler array form when you just need multiple predetermined Prisma promises to succeed or fail together.',
        },
      ],
      decisions: [
        {
          question: 'Why is calling `this.prisma.booking.create(...)` instead of `tx.booking.create(...)` inside `$transaction(async (tx) => ...)` a catastrophic bug?',
          antiPattern:
            'Inside `this.prisma.$transaction(async (tx) => { ... })`, `this.prisma` is still in scope! If you accidentally write `await this.prisma.booking.create(...)` instead of `await tx.booking.create(...)`: \n1) That query runs on a **different** pooled connection outside the transaction (`AUTOCOMMIT`). If the transaction later throws and rolls back, the booking is NOT rolled back!\n2) Under load, the transaction holds 1 connection while waiting for `this.prisma` to acquire a 2nd connection from the pool, causing **Connection Pool Deadlock**!',
          technicalReason:
            'The `tx` parameter passed to the `$transaction` callback is a proxy bound exclusively to the pinned database connection where `BEGIN` was issued. Only calls made on `tx.*` participate in the transaction.',
          bestPracticeRule:
            'Inside `$transaction(async (tx) => { ... })`, audit every single line to ensure it calls `tx.<model>`, NEVER `this.prisma.<model>`.',
        },
        {
          question: 'Why must you never call slow external APIs (Stripe/Paystack, SendGrid email, PDF generation) inside `this.prisma.$transaction(async (tx) => ...)`?',
          antiPattern:
            'Putting `await axios.post("https://api.paystack.co/...")` inside `$transaction` holds an open PostgreSQL transaction and row-level locks for 1,500ms–3,000ms while waiting for external network I/O. With a 10-connection pool, just 10 concurrent checkouts will freeze the entire database and hit Prisma\'s 5,000ms transaction timeout (`P2028`)!',
          technicalReason:
            'Database transactions should only contain fast database reads/writes (`< 50ms`). Emit a domain event (`this.events.emit("booking.created")`) *after* `await this.prisma.$transaction(...)` resolves to trigger emails or webhooks asynchronously.',
          bestPracticeRule:
            'Keep `$transaction` callbacks pure database operations; perform external HTTP calls and email dispatch before or after the transaction commits.',
        },
      ],
    },

    // =========================================================================
    // CHAPTER 7: PRISMA ERROR CODES & NESTJS EXCEPTION FILTER (P2002, P2025)
    // =========================================================================
    {
      id: 'prisma-error-handling-filter',
      number: '07',
      category: 'Error Handling & Filters',
      title: 'Handling Prisma Errors in NestJS: P2002, P2025 & @Catch(PrismaClientKnownRequestError)',
      subtitle: 'Translate raw database constraint errors into clean HTTP 409 Conflict and 404 Not Found responses globally.',
      sandboxConceptId: 'prisma-transactions-atomic',
      keyTakeaway:
        'Register a single @Catch(PrismaClientKnownRequestError) Exception Filter to map P2002 -> 409 Conflict and P2025 -> 404 Not Found across your entire API.',
      prismaCode: `// prisma-client-exception.filter.ts
import { Catch, ExceptionFilter, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client';

@Catch(PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    switch (exception.code) {
      case 'P2002': {
        // Unique constraint violation (e.g., duplicate email or [studentId, listingId])
        const target = (exception.meta?.target as string[])?.join(', ') || 'field';
        return res.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          errorCode: 'DUPLICATE_RECORD_P2002',
          message: \`A record with this \${target} already exists.\`,
          path: req.url,
        });
      }
      case 'P2025': {
        // Record to update/delete/findUniqueOrThrow was not found
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          errorCode: 'RECORD_NOT_FOUND_P2025',
          message: exception.meta?.cause || 'The requested Kampus record does not exist.',
          path: req.url,
        });
      }
      default:
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: exception.code,
          message: 'Database constraint error.',
        });
    }
  }
}`,
      rawSqlOrJsCode: `// ❌ Anti-Pattern: Wrapping every single service method in repetitive try/catch blocks
async createStudent(dto: CreateStudentDto) {
  try {
    return await this.prisma.user.create({ data: dto });
  } catch (err) {
    // Repetitive boilerplate duplicated across 40 different services!
    if (err.code === 'P2002') {
      throw new ConflictException('Email already exists');
    }
    throw err;
  }
}

// ❌ Or worse: Not catching PrismaClientKnownRequestError at all
// -> NestJS returns generic 500 Internal Server Error on duplicate email!`,
      syntaxMap: [
        {
          prismaToken: 'PrismaClientKnownRequestError',
          sqlOrJsEquivalent: 'PostgreSQL SQLSTATE error wrapper',
          purpose: 'Typed error class thrown whenever the Prisma Query Engine encounters a deterministic schema/constraint violation.',
        },
        {
          prismaToken: "exception.code === 'P2002'",
          sqlOrJsEquivalent: 'SQLSTATE 23505 (unique_violation)',
          purpose: 'Unique constraint failed on `@unique` or `@@unique`. `exception.meta.target` lists the conflicting column names (e.g., `["email"]`).',
        },
        {
          prismaToken: "exception.code === 'P2025'",
          sqlOrJsEquivalent: '0 rows matched UPDATE / DELETE / findUniqueOrThrow',
          purpose: 'Thrown when `update()`, `delete()`, or `findUniqueOrThrow()` cannot find the target record in `where`. Maps cleanly to `404 Not Found`.',
        },
        {
          prismaToken: "exception.code === 'P2003'",
          sqlOrJsEquivalent: 'SQLSTATE 23503 (foreign_key_violation)',
          purpose: 'Thrown when a foreign key (`landlordId`, `listingId`) does not exist or when `onDelete: Restrict` blocks deleting a referenced parent row.',
        },
      ],
      decisions: [
        {
          question: 'Why map `P2025` in an Exception Filter so services can call `prisma.listing.update()` directly without calling `findUnique()` first?',
          antiPattern:
            'Many developers write `const existing = await prisma.listing.findUnique({ where: { id } }); if (!existing) throw new NotFoundException(); return prisma.listing.update({ where: { id }, data });`. That executes **2 database round-trips** (`SELECT` + `UPDATE`) on every single update request!',
          technicalReason:
            'Calling `await this.prisma.listing.update({ where: { id }, data })` directly executes **1 single SQL statement** (`UPDATE ... WHERE id = $1 RETURNING *`). If no row matches `id`, Prisma throws `P2025`, which your `PrismaClientExceptionFilter` automatically turns into a clean `404 Not Found` response—cutting database round-trips in half!',
          bestPracticeRule:
            'Use a global `@Catch(PrismaClientKnownRequestError)` filter so `update()`, `delete()`, and `findUniqueOrThrow()` require only 1 database query instead of a redundant pre-check `SELECT`.',
        },
        {
          question: 'Why is catching `P2002` on `prisma.user.create()` better than checking `if (await prisma.user.findUnique({ where: { email } }))` beforehand?',
          antiPattern:
            'Checking `findUnique` before `create` costs an extra `SELECT` query on every registration AND still fails under concurrency when two requests pass `findUnique` at the same millisecond.',
          technicalReason:
            'Attempting `prisma.user.create()` directly lets PostgreSQL\'s `@unique` index enforce uniqueness atomically in a single round-trip, and `P2002` in your Exception Filter converts any duplicate into a `409 Conflict` with `exception.meta?.target`.',
          bestPracticeRule:
            'Let `@unique` constraints and `P2002` handle duplicate detection atomically rather than relying on pre-insert `findUnique` checks.',
        },
      ],
    },
  ];
})(window);

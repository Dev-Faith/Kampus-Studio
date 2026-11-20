/**
 * Kampus PropTech — Mongoose ODM (@nestjs/mongoose) Mastery & Architectural Decision Guide
 * Interactive @Schema/@Prop Decompiler, Mongoose vs Raw MongoDB/Anti-Pattern Rosetta Stone,
 * Token-by-Token Syntax Reference, and "Why We Build It This Way" Decision Cards.
 */
(function (global) {
  'use strict';

  global.NEST_MONGOOSE_FULL_SCHEMA = `// kampus-mongoose.schemas.ts — Kampus Student Housing & Rent Escrow Platform (@nestjs/mongoose)
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;
export type ListingDocument = HydratedDocument<Listing>;
export type BookingDocument = HydratedDocument<Booking>;

@Schema({ timestamps: true, collection: 'kampus_users' })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, enum: ['student', 'landlord', 'admin'], default: 'student' })
  role: string;

  @Prop({ type: String, enum: ['basic', 'verified', 'campus-admin'], default: 'basic' })
  tier: string;

  // select: false prevents passwordHash from EVER being returned unless .select('+passwordHash') is called!
  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ type: String, default: null, select: false })
  refreshTokenHash: string | null;

  @Prop({ type: Number, default: 0, min: 0 })
  escrowBalance: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ role: 1, tier: 1 });

// Bounded subdocument embedded directly inside Listing (No _id overhead needed)
@Schema({ _id: false })
export class SafetyInspectionBadge {
  @Prop({ required: true })
  inspectedByOfficer: string;

  @Prop({ required: true })
  solarInverterVerified: boolean;

  @Prop({ default: () => new Date() })
  inspectedAt: Date;
}

export const SafetyInspectionBadgeSchema = SchemaFactory.createForClass(SafetyInspectionBadge);

@Schema({ timestamps: true, collection: 'kampus_listings' })
export class Listing {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, index: true })
  campusZone: string;

  @Prop({ required: true, min: 50 })
  rentPerYear: number;

  @Prop({ required: true, default: 1, min: 0 })
  roomsAvailable: number;

  // Bounded 1-to-Few array embedded directly inside the Listing document:
  @Prop({ type: [String], default: [] })
  amenities: string[];

  @Prop({ type: SafetyInspectionBadgeSchema, default: null })
  safetyBadge: SafetyInspectionBadge | null;

  @Prop({ default: false })
  verified: boolean;

  @Prop({ default: false })
  published: boolean;

  // Reference (ObjectId) to User because User has an independent lifecycle & many listings:
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, required: true, index: true })
  landlord: Types.ObjectId;
}

export const ListingSchema = SchemaFactory.createForClass(Listing);
// ESR Rule Compound Index: Equality (campusZone, published) -> Sort/Range (rentPerYear)
ListingSchema.index({ campusZone: 1, published: 1, rentPerYear: 1 });

@Schema({ timestamps: true, collection: 'kampus_bookings' })
export class Booking {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, required: true })
  student: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Listing.name, required: true })
  listing: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  amount: number;

  @Prop({ default: 'held-in-escrow' })
  status: string;

  @Prop({ unique: true, sparse: true })
  idempotencyKey?: string;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
BookingSchema.index({ student: 1, listing: 1 }, { unique: true });`;

  global.NEST_MONGOOSE_SCHEMA_EXPLORER = [
    {
      id: 'mongo-embed-vs-ref',
      badge: 'Embed (@Prop([String])) vs Reference (ref: User.name)',
      title: 'Document Data Modeling: When to Embed Subdocuments vs Reference ObjectIds?',
      prismaSnippet: `@Schema({ collection: 'kampus_listings' })
export class Listing {
  // ✅ EMBEDDED (Bounded 1-to-Few, always read with Listing):
  @Prop({ type: [String], default: [] })
  amenities: string[];

  // ✅ REFERENCED (Independent entity, unbounded growth):
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  landlord: Types.ObjectId;
}`,
      sqlEquivalent: `// Stored BSON Document in MongoDB "kampus_listings":
{
  "_id": ObjectId("67320a1b..."),
  "title": "Cedar Court Ensuite Studio",
  "amenities": ["solar-inverter", "borehole-water", "fiber-wifi"],
  "landlord": ObjectId("6731f990...") // Pointer to kampus_users._id
}`,
      whyDecision:
        'In MongoDB, **data that is accessed together should be stored together**—as long as it is bounded! A hostel\'s `amenities` (`5–15` strings) and `safetyBadge` are always displayed on the hostel card and never grow unboundedly, so embedding them inside `Listing` gives you **zero-join single-document reads**. Conversely, `Booking` history or `User` profiles must be **referenced via `ObjectId` (`ref: User.name`)**: if you embedded every student booking array inside `Listing`, a popular hostel over 5 years would grow unboundedly toward MongoDB\'s hard **16MB BSON document limit** and cause massive document rewrites on every checkout.',
      bestPractice:
        'Embed bounded `1-to-1` and `1-to-Few` data (`amenities`, `address`, `safetyBadge`) directly inside the parent document; use `ObjectId` references (`ref`) for `1-to-Many` / `Many-to-Many` entities that grow unboundedly (`Booking`) or are mutated independently (`User`).',
    },
    {
      id: 'mongo-select-false',
      badge: '@Prop({ select: false }) on passwordHash',
      title: 'Schema-Level Secret Redaction: Why select: false Beats Manual delete user.passwordHash',
      prismaSnippet: `@Schema({ collection: 'kampus_users' })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  // Excluded from ALL queries & .populate() by default!
  @Prop({ required: true, select: false })
  passwordHash: string;
}`,
      sqlEquivalent: `// 1. Default query (findOne, find, populate('landlord')):
db.kampus_users.findOne({ email: "ada@kampus.edu" }, { passwordHash: 0 })
// -> passwordHash is NEVER returned!

// 2. Explicit opt-in ONLY inside AuthService.login():
this.userModel.findOne({ email }).select('+passwordHash').exec()`,
      whyDecision:
        'If `passwordHash` is selected by default, a single forgotten `.select("-passwordHash")` in any controller or `.populate("landlord")` leaks bcrypt hashes to the public internet. Declaring `@Prop({ select: false })` on the schema inverts the default: Mongoose automatically excludes `passwordHash` from every `find()`, `findOne()`, and `.populate()` across the entire codebase unless a service explicitly opts in with `.select("+passwordHash")`.',
      bestPractice:
        'Always mark `passwordHash`, `refreshTokenHash`, and internal secrets with `@Prop({ select: false })` in the schema definition, and use `.select("+passwordHash")` exclusively inside `AuthService.validateUser()`.',
    },
    {
      id: 'mongo-compound-index-esr',
      badge: 'ListingSchema.index({ campusZone: 1, published: 1, rentPerYear: 1 })',
      title: 'Compound Indexes & Why autoIndex Should Be Disabled in Production',
      prismaSnippet: `export const ListingSchema = SchemaFactory.createForClass(Listing);

// ESR Order: Equality (campusZone, published) -> Sort/Range (rentPerYear)
ListingSchema.index({
  campusZone: 1,
  published: 1,
  rentPerYear: 1,
});`,
      sqlEquivalent: `db.kampus_listings.createIndex(
  { campusZone: 1, published: 1, rentPerYear: 1 },
  { background: true }
);
// Query plan changes from COLLSCAN (O(N)) -> IXSCAN (O(log N))!`,
      whyDecision:
        'Without a compound index matching your query filter and sort (`find({ campusZone, published: true, rentPerYear: { $lte: 200 } }).sort({ rentPerYear: 1 })`), MongoDB executes a **COLLSCAN** (scanning every BSON document on disk) and an in-memory sort (which crashes if it exceeds 100MB RAM). Furthermore, in production Kubernetes pods, set `autoIndex: false` in `MongooseModule.forRoot()` so 20 booting containers don\'t simultaneously trigger heavy index builds on live traffic.',
      bestPractice:
        'Define compound indexes on the schema using the **ESR Rule** (Equality → Sort → Range) and verify with `.explain("executionStats")` that `stage === "IXSCAN"`, never `"COLLSCAN"`.',
    },
    {
      id: 'mongo-sparse-partial-unique',
      badge: '@Prop({ unique: true, sparse: true })',
      title: 'Sparse Unique Indexes: Allowing Optional Unique Fields Like idempotencyKey',
      prismaSnippet: `@Schema({ collection: 'kampus_bookings' })
export class Booking {
  // Optional field, but MUST be unique whenever provided:
  @Prop({ unique: true, sparse: true })
  idempotencyKey?: string;
}`,
      sqlEquivalent: `db.kampus_bookings.createIndex(
  { idempotencyKey: 1 },
  { unique: true, sparse: true }
);`,
      whyDecision:
        'In MongoDB (unlike PostgreSQL), a standard `{ unique: true }` index treats `null` / missing fields as a single literal value! That means if you create a second booking without an `idempotencyKey`, MongoDB throws `E11000 duplicate key error: { idempotencyKey: null }`! Adding `sparse: true` (or a `partialFilterExpression`) tells MongoDB to only index documents where `idempotencyKey` actually exists.',
      bestPractice:
        'Whenever an optional/nullable `@Prop()` must be unique in MongoDB, always pair `unique: true` with `sparse: true` so documents missing that field don\'t collide on `null`.',
    },
    {
      id: 'mongo-timestamps-versionkey',
      badge: '@Schema({ timestamps: true }) & __v Optimistic Concurrency',
      title: 'Automatic Timestamps & What the __v Version Key Actually Protects',
      prismaSnippet: `@Schema({
  timestamps: true, // Auto-manages createdAt & updatedAt
  optimisticConcurrency: true, // Uses __v to detect concurrent .save() conflicts
})
export class Listing { ... }`,
      sqlEquivalent: `// When doc.save() runs on a hydrated document:
db.kampus_listings.updateOne(
  { _id: ObjectId("..."), __v: 3 }, // Checks version matches!
  { $set: { ... }, $inc: { __v: 1 } }
);`,
      whyDecision:
        'Developers often wonder why Mongoose adds `"__v": 0` to every document. `__v` is Mongoose\'s **internal document version key** used for **Optimistic Concurrency Control (OCC)** when modifying arrays or when `optimisticConcurrency: true` is enabled: if two requests load version `__v: 3`, modify the document in memory, and call `.save()`, the second `.save()` sees `__v` is now `4` and throws `VersionError` instead of silently overwriting the first request\'s changes!',
      bestPractice:
        'Keep `timestamps: true` enabled on all domain schemas and leave `__v` intact if you ever mutate documents via `findById()` + `doc.save()`.',
    },
    {
      id: 'mongo-schemafactory-hydrated',
      badge: 'SchemaFactory.createForClass(Listing) & HydratedDocument<Listing>',
      title: 'Single Source of Truth: Bridging TypeScript Classes & Mongoose Runtime Schemas',
      prismaSnippet: `import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ListingDocument = HydratedDocument<Listing>;

@Schema()
export class Listing {
  @Prop({ required: true })
  title: string;
}

export const ListingSchema = SchemaFactory.createForClass(Listing);`,
      sqlEquivalent: `// Without @nestjs/mongoose, you had to maintain TWO separate definitions:
// 1. interface IListing { title: string; } (TypeScript compile-time)
// 2. const ListingSchema = new mongoose.Schema({ title: { type: String, required: true } }) (Runtime)`,
      whyDecision:
        'In plain Express + TypeScript, developers had to write a TypeScript `interface` AND a separate `new mongoose.Schema({...})`, which inevitably drifted out of sync. `@nestjs/mongoose` reads TypeScript decorator metadata (`@Schema`, `@Prop`) via `SchemaFactory.createForClass(Listing)` to generate the runtime Mongoose Schema from your TypeScript class—giving you a single source of truth.',
      bestPractice:
        'Define a clean `@Schema()` class for properties and export `type ListingDocument = HydratedDocument<Listing>` (avoid extending `Document` on the class itself, which pollutes DTO/plain object types).',
    },
  ];

  global.NEST_MONGOOSE_CHAPTERS = [
    // =========================================================================
    // CHAPTER 1: MONGOOSEMODULE, FORFEATURE & @INJECTMODEL DI IN NESTJS
    // =========================================================================
    {
      id: 'mongoose-di-injectmodel',
      number: '01',
      category: 'Architecture & NestJS DI',
      title: 'MongooseModule.forRootAsync, forFeature & @InjectModel(Listing.name)',
      subtitle: 'How NestJS manages MongoDB connection pools and injects compiled Mongoose Models via DI tokens.',
      sandboxConceptId: 'mongoose-schemas-queries-lean',
      keyTakeaway:
        'Register schemas per feature module with MongooseModule.forFeature() and inject models via @InjectModel(Listing.name) so unit tests can mock Models cleanly.',
      prismaCode: `// listings.module.ts & listings.service.ts (@nestjs/mongoose Best Practice)
import { Module, Injectable } from '@nestjs/common';
import { MongooseModule, InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Listing, ListingSchema } from './listing.schema';

@Module({
  imports: [
    // Compiles ListingSchema into a Mongoose Model and registers token "ListingModel"
    MongooseModule.forFeature([{ name: Listing.name, schema: ListingSchema }]),
  ],
  providers: [ListingsService],
})
export class ListingsModule {}

@Injectable()
export class ListingsService {
  constructor(
    // @InjectModel(Listing.name) resolves the DI token "ListingModel"
    @InjectModel(Listing.name) private readonly listingModel: Model<Listing>,
  ) {}

  async findAllPublished() {
    return this.listingModel.find({ published: true }).lean().exec();
  }
}`,
      rawSqlOrJsCode: `// ❌ Anti-Pattern: Importing a global mongoose.model() directly inside services
import mongoose from 'mongoose';
import { ListingSchema } from './listing.schema';

// Hardcoded global singleton bound to default mongoose connection:
const ListingModel = mongoose.model('Listing', ListingSchema);

export class ListingsService {
  async findAllPublished() {
    // Impossible to swap or mock via NestJS TestingModule overrideProvider!
    // Also fails if your app uses multiple MongoDB connections or tenant DBs.
    return ListingModel.find({ published: true });
  }
}`,
      syntaxMap: [
        {
          prismaToken: 'MongooseModule.forRootAsync({ useFactory })',
          sqlOrJsEquivalent: 'await mongoose.connect(uri, { maxPoolSize: 20 })',
          purpose: 'Initializes the shared MongoDB connection pool at app startup and cleanly closes sockets on `onApplicationShutdown`.',
        },
        {
          prismaToken: 'MongooseModule.forFeature([{ name: Listing.name, schema }])',
          sqlOrJsEquivalent: 'connection.model("Listing", ListingSchema)',
          purpose: 'Compiles the schema on the active connection and registers `{ provide: getModelToken(Listing.name), useValue: model }` in the module DI scope.',
        },
        {
          prismaToken: '@InjectModel(Listing.name)',
          sqlOrJsEquivalent: '@Inject("ListingModel")',
          purpose: 'Injects the compiled Mongoose `Model<Listing>` into your service constructor.',
        },
      ],
      decisions: [
        {
          question: 'Why pass `Listing.name` to `@InjectModel(Listing.name)` instead of hardcoding magic strings like `@InjectModel("Listing")`?',
          antiPattern:
            'Hardcoding string literals like `@InjectModel("Listing")` in 10 files and `forFeature([{ name: "Listings", ... }])` with a typo causes a boot-time crash: `Nest can\'t resolve dependencies of the ListingsService (?)`.',
          technicalReason:
            'In JavaScript, every class function has a built-in `.name` property (`Listing.name === "Listing"`). Referencing `Listing.name` in both `MongooseModule.forFeature()` and `@InjectModel(Listing.name)` guarantees the token string matches at compile time and survives IDE class renames.',
          bestPracticeRule:
            'Always use `ModelClass.name` in both `MongooseModule.forFeature([{ name: Listing.name, schema: ListingSchema }])` and `@InjectModel(Listing.name)`.',
        },
        {
          question: 'Why inject the Mongoose Model via `@InjectModel()` instead of importing `mongoose.model("Listing")` directly?',
          antiPattern:
            'Importing `mongoose.model(...)` directly couples your service to a global static connection. In unit tests, you cannot use `{ provide: getModelToken(Listing.name), useValue: mockListingModel }` without fragile module-loader hacks (`jest.mock`).',
          technicalReason:
            '`@InjectModel(Listing.name)` binds the model to NestJS\'s IoC container, making it trivial to inject an in-memory mock in `Test.createTestingModule()` and supporting multi-database setups (`@InjectModel(Listing.name, "analyticsConnection")`).',
          bestPracticeRule:
            'Never call `mongoose.model()` directly inside NestJS services; always register via `forFeature()` and inject via `@InjectModel()`.',
        },
      ],
    },

    // =========================================================================
    // CHAPTER 2: THE .LEAN() PERFORMANCE SECRET & .EXEC() STACK TRACES
    // =========================================================================
    {
      id: 'mongoose-lean-vs-hydrated',
      number: '02',
      category: 'Performance & Memory',
      title: 'The .lean() Performance Secret: Plain POJOs vs Hydrated Mongoose Documents',
      subtitle: 'Why adding .lean().exec() makes Mongoose read queries 3x–5x faster and slashes memory usage by 70%.',
      sandboxConceptId: 'mongoose-schemas-queries-lean',
      keyTakeaway:
        'Chain .lean().exec() on every read-only Mongoose query so Node.js skips instantiating heavy HydratedDocument wrappers before JSON serialization.',
      prismaCode: `// High-Performance Read Queries with .lean().exec()
@Injectable()
export class KampusFeedService {
  constructor(
    @InjectModel(Listing.name) private readonly listingModel: Model<Listing>,
  ) {}

  // ✅ FAST (Read-Only API Endpoint): Returns plain JavaScript objects (POJOs)
  async getPublicHostelFeed(campusZone: string) {
    return this.listingModel
      .find({ campusZone, published: true })
      .sort({ rentPerYear: 1 })
      .lean() // Skips HydratedDocument instantiation -> 4x faster, 70% smaller in RAM!
      .exec(); // Returns a real Promise with full async stack trace
  }

  // ✅ HYDRATED (Only when you need Mongoose instance methods or .save() hooks):
  async verifyHostelWithDocumentHooks(id: string) {
    const doc = await this.listingModel.findById(id).exec(); // No .lean() here
    if (!doc) throw new NotFoundException();
    doc.verified = true;
    return doc.save(); // Triggers @Schema pre('save') hooks & __v version check
  }
}`,
      rawSqlOrJsCode: `// What happens WITHOUT .lean() on a 100-document find() query:
// 1. MongoDB wire protocol returns 100 raw BSON buffers -> parsed into 100 plain JS objects
// 2. Mongoose loops all 100 objects and constructs new HydratedDocument(obj):
//    - Wraps every nested field & array in ES6 Proxies / getters & setters
//    - Allocates internal state ($__, $isNew, _doc, schema paths, change tracking)
// 3. NestJS immediately calls JSON.stringify(res) -> calls doc.toJSON() -> unwraps it back to a plain object!
// Result: 80% of CPU time was wasted hydrating and immediately un-hydrating objects!`,
      syntaxMap: [
        {
          prismaToken: '.lean()',
          sqlOrJsEquivalent: 'Raw MongoDB driver cursor output (POJO)',
          purpose: 'Bypasses `HydratedDocument` class instantiation, getters/setters, and change tracking. Returns plain JS objects directly.',
        },
        {
          prismaToken: '.exec()',
          sqlOrJsEquivalent: 'Executes the Mongoose Query Thenable as a real Promise',
          purpose: 'Captures the call-site stack trace so any MongoDB error points to your exact service line instead of internal Mongoose internals.',
        },
        {
          prismaToken: 'HydratedDocument<Listing>',
          sqlOrJsEquivalent: 'Listing & mongoose.Document',
          purpose: 'Full Mongoose document instance returned when `.lean()` is omitted; includes `.save()`, `.populate()`, `.toObject()`, and dirty-tracking.',
        },
      ],
      decisions: [
        {
          question: 'Why does `.lean()` make such a dramatic difference in NestJS API throughput and latency?',
          antiPattern:
            'In a typical REST or GraphQL controller, you query records from MongoDB and immediately return them as an HTTP JSON response. Without `.lean()`, Mongoose instantiates a complex stateful `Document` object for every single row—and every nested subdocument—only for Express/Fastify `res.json()` to immediately serialize it back to a plain string.',
          technicalReason:
            'Benchmarks from the Mongoose core team show that a hydrated `Document` is roughly **3x to 5x heavier in V8 heap memory** and takes **3x to 5x more CPU time** to construct than a `.lean()` POJO. On high-traffic endpoints (like `GET /listings`), `.lean()` cuts p99 latency and prevents V8 garbage collection pauses.',
          bestPracticeRule:
            'Make `.lean()` your default for every `find`, `findOne`, and `findById` query that is returned directly from a controller or cached in Redis.',
        },
        {
          question: 'Why chain `.exec()` at the end of Mongoose queries when `await this.listingModel.find(...)` already works without `.exec()`?',
          antiPattern:
            'A Mongoose `Query` is NOT a native JavaScript `Promise`—it is a custom *Thenable* (an object with a `.then()` method). When you `await model.find(...)` directly without `.exec()` and MongoDB throws an error, V8 loses the calling function\'s stack frame in async stack traces!',
          technicalReason:
            'Calling `.exec()` explicitly creates a genuine `Promise` at the call site and captures the stack trace before dispatching the async cursor operation, giving you accurate file and line numbers in Sentry/DataDog error logs.',
          bestPracticeRule:
            'Always terminate Mongoose query chains with `.exec()` (e.g., `.find(...).lean().exec()`).',
        },
      ],
    },

    // =========================================================================
    // CHAPTER 3: QUERY OPERATORS, PROJECTIONS (.SELECT) & .POPULATE()
    // =========================================================================
    {
      id: 'mongoose-queries-projections-populate',
      number: '03',
      category: 'Queries & Relations',
      title: 'Query Operators ($lte, $in, Array Match), Projections (.select) & .populate()',
      subtitle: 'Filter nested arrays natively, project safe fields, and understand how .populate() actually works.',
      sandboxConceptId: 'mongoose-schemas-queries-lean',
      keyTakeaway:
        'Remember that .populate() is NOT a single SQL JOIN—it fires a second $in query, so always restrict populated fields with a projection string.',
      prismaCode: `// Filtering, Projections & Populate in Kampus PropTech
@Injectable()
export class KampusSearchMongoService {
  constructor(
    @InjectModel(Listing.name) private readonly listingModel: Model<Listing>,
  ) {}

  async searchHostels(zones: string[], maxRent: number, requiredAmenity: string) {
    return this.listingModel
      .find({
        published: true,
        verified: true,
        campusZone: { $in: zones },
        rentPerYear: { $lte: maxRent, $gte: 50 },
        // MongoDB natively matches if the "amenities" array contains requiredAmenity!
        amenities: requiredAmenity,
      })
      .select('title campusZone rentPerYear roomsAvailable amenities landlord')
      .populate({
        path: 'landlord',
        select: 'name tier -_id', // Only fetch name & tier from kampus_users!
      })
      .sort({ rentPerYear: 1 })
      .lean()
      .exec();
  }
}`,
      rawSqlOrJsCode: `// What Mongoose executes under the hood for .find(...).populate('landlord', 'name tier'):

// Query #1 (On kampus_listings collection):
db.kampus_listings.find(
  {
    published: true,
    verified: true,
    campusZone: { $in: ["North Gate", "South Gate"] },
    rentPerYear: { $lte: 200, $gte: 50 },
    amenities: "fiber-wifi"
  },
  { title: 1, campusZone: 1, rentPerYear: 1, roomsAvailable: 1, amenities: 1, landlord: 1 }
).sort({ rentPerYear: 1 });

// Query #2 (Triggered automatically by .populate('landlord', 'name tier -_id')):
db.kampus_users.find(
  { _id: { $in: [ObjectId("u-landlord-2"), ...] } },
  { name: 1, tier: 1, _id: 0 }
);`,
      syntaxMap: [
        {
          prismaToken: 'rentPerYear: { $lte: 200, $gte: 50 }',
          sqlOrJsEquivalent: 'rent_per_year <= 200 AND rent_per_year >= 50',
          purpose: 'MongoDB comparison operators: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`.',
        },
        {
          prismaToken: "amenities: 'fiber-wifi' / { $all: ['wifi', 'solar'] }",
          sqlOrJsEquivalent: 'Multikey Index Array Match',
          purpose: 'Passing a scalar value against an array field matches any document whose array contains that element; `$all` requires all listed elements.',
        },
        {
          prismaToken: ".select('title rentPerYear') or .select('-passwordHash')",
          sqlOrJsEquivalent: 'Projection { title: 1, rentPerYear: 1 }',
          purpose: 'Space-separated field list: prefix with `-` to exclude fields, `+` to force-include a `@Prop({ select: false })` field.',
        },
        {
          prismaToken: ".populate('landlord', 'name tier')",
          sqlOrJsEquivalent: 'Batched second query: db.users.find({ _id: { $in: ids } })',
          purpose: 'Replaces the `landlord` `ObjectId` with the referenced `User` document, projecting only `name` and `tier`.',
        },
      ],
      decisions: [
        {
          question: 'How does `.populate()` actually work under the hood, and why can deep `.populate()` chains hurt performance?',
          antiPattern:
            'Many developers assume `.populate("landlord")` performs a server-side SQL `JOIN` inside MongoDB. It does NOT! Each `.populate()` path executes a **separate network round-trip query** (`db.users.find({ _id: { $in: [...] } })`) and stitches the results together in Node.js memory. Nesting 4 levels of `.populate()` fires 5 sequential database round-trips!',
          technicalReason:
            'Because `.populate()` runs a second `$in` query and transfers the documents over the network, you should:\n1) Always pass a field projection (`populate("landlord", "name tier")`) so MongoDB only sends the needed fields.\n2) Avoid deep nested `.populate()` chains by embedding frequently read display fields (like `landlordSummary: { id, name, tier }`) directly on the `Listing` document when appropriate.',
          bestPracticeRule:
            'Keep `.populate()` shallow (1 level) with an explicit field whitelist; if you need to filter the parent collection by a referenced collection\'s field, use an Aggregation Pipeline `$lookup` or denormalize the filterable field.',
        },
        {
          question: 'Why does MongoDB throw an error if you mix inclusion and exclusion in `.select("name -passwordHash")`?',
          antiPattern:
            'Writing `.select("name email -passwordHash")` throws `MongoServerError: Projection cannot have a mix of inclusion and exclusion`.',
          technicalReason:
            'In MongoDB projections, a projection is either **inclusive** (`{ name: 1, email: 1 }`, which already automatically excludes every other field including `passwordHash`!) or **exclusive** (`{ passwordHash: 0, refreshTokenHash: 0 }`, which includes everything else). The only exception is `-_id`, which can be excluded inside an inclusive projection (`"name email -_id"`).',
          bestPracticeRule:
            'Use either an inclusive whitelist (`.select("name email tier")`) OR an exclusive blacklist (`.select("-passwordHash -refreshTokenHash")`)—never mix both (except `-_id`).',
        },
      ],
    },

    // =========================================================================
    // CHAPTER 4: THE FINDONEANDUPDATE TRAPS ({ NEW: TRUE, RUNVALIDATORS: TRUE })
    // =========================================================================
    {
      id: 'mongoose-findoneandupdate-traps',
      number: '04',
      category: 'Mutations & Pitfalls',
      title: 'The findOneAndUpdate Traps: Why { new: true, runValidators: true } Is Mandatory',
      subtitle: 'Avoid the two most common Mongoose production bugs on update endpoints.',
      sandboxConceptId: 'mongoose-atomic-operators-upsert',
      keyTakeaway:
        'By default, Mongoose findOneAndUpdate / findByIdAndUpdate returns the OLD pre-update document AND skips @Prop schema validation! Always pass { new: true, runValidators: true }.',
      prismaCode: `// Safe Updates & Upserts with findOneAndUpdate / findByIdAndUpdate
@Injectable()
export class KampusHostelUpdateService {
  constructor(
    @InjectModel(Listing.name) private readonly listingModel: Model<Listing>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  // 1. Safe Partial Update (Returns updated doc + enforces @Prop min/enum rules)
  async updateHostelRent(id: string, newRent: number) {
    const updated = await this.listingModel
      .findByIdAndUpdate(
        id,
        { $set: { rentPerYear: newRent } },
        {
          new: true,           // Return the AFTER-update document (not the stale old one!)
          runValidators: true, // Enforce @Prop({ min: 50 }) on newRent!
        },
      )
      .lean()
      .exec();

    if (!updated) throw new NotFoundException('Hostel not found');
    return updated;
  }

  // 2. Atomic Upsert with $setOnInsert (Idempotent Student Profile Sync)
  async upsertStudentProfile(email: string, name: string) {
    return this.userModel
      .findOneAndUpdate(
        { email: email.toLowerCase() },
        {
          $set: { name, tier: 'verified' },
          // $setOnInsert ONLY runs if a brand-new document is inserted!
          $setOnInsert: { role: 'student', escrowBalance: 400 },
        },
        { new: true, upsert: true, runValidators: true },
      )
      .lean()
      .exec();
  }
}`,
      rawSqlOrJsCode: `// ❌ TRAP 1: Calling findByIdAndUpdate WITHOUT { new: true }
const hostel = await this.listingModel.findByIdAndUpdate(id, { rentPerYear: 220 });
// BUG: "hostel.rentPerYear" is STILL 180 (the old value before the update)!
// Your frontend UI updates the price, gets 180 back in the 200 OK response, and thinks the save failed!

// ❌ TRAP 2: Calling findByIdAndUpdate WITHOUT { runValidators: true }
await this.listingModel.findByIdAndUpdate(id, { rentPerYear: -9999 });
// BUG: Even though @Prop({ min: 50 }) is on the schema, Mongoose SKIPS validation on update
// queries by default and writes -9999 straight into MongoDB!`,
      syntaxMap: [
        {
          prismaToken: '{ new: true } (or { returnDocument: "after" })',
          sqlOrJsEquivalent: 'findAndModify(..., { new: true })',
          purpose: 'Instructs MongoDB to return the modified document *after* the update is applied instead of the original document.',
        },
        {
          prismaToken: '{ runValidators: true }',
          sqlOrJsEquivalent: 'Runs @Prop(min, max, enum, match) validators on update',
          purpose: 'Forces Mongoose to validate `$set`, `$inc`, and `$push` values against schema rules before sending the update to MongoDB.',
        },
        {
          prismaToken: '{ upsert: true } + $setOnInsert',
          sqlOrJsEquivalent: 'INSERT ... ON CONFLICT DO UPDATE',
          purpose: 'Atomically updates the matching document or inserts a new one if none matches; `$setOnInsert` fields are only set on creation.',
        },
      ],
      decisions: [
        {
          question: 'Why does `findOneAndUpdate` return the OLD document and skip validators by default in Mongoose?',
          antiPattern:
            'In MongoDB\'s native wire protocol, the underlying `findAndModify` command historically defaulted to `new: false` (returning the pre-image before modification). Furthermore, Mongoose update validators only have access to the update payload (`$set`), not the full document in memory (`this`), so Mongoose left `runValidators: false` by default for backward compatibility.',
          technicalReason:
            'Passing `{ new: true, runValidators: true }` fixes both historical defaults: MongoDB returns the updated post-image in a single atomic round-trip, and Mongoose validates every updated path against `@Prop({ min, max, enum, required })`.',
          bestPracticeRule:
            'Treat `{ new: true, runValidators: true }` as mandatory on every `findOneAndUpdate` and `findByIdAndUpdate` call in your codebase.',
        },
        {
          question: 'Why pair `$set` with `$setOnInsert` when using `{ upsert: true }`?',
          antiPattern:
            'If you put `escrowBalance: 400` inside `$set` on an `upsert`, then every time an existing student updates their profile name, their `escrowBalance` gets overwritten back to `400`!',
          technicalReason:
            'MongoDB evaluates `$set` on both inserts and updates, whereas `$setOnInsert` is evaluated **exclusively when the upsert creates a brand-new document**. That lets you set initial defaults (`role: "student"`, `escrowBalance: 400`) on first creation while only updating mutable fields (`name`) on existing documents.',
          bestPracticeRule:
            'When using `{ upsert: true }`, place mutable fields in `$set` and creation-only defaults in `$setOnInsert`.',
        },
      ],
    },

    // =========================================================================
    // CHAPTER 5: ATOMIC OPERATORS — FILTER-GUARDED $INC, $ADDTOSET & $PULL
    // =========================================================================
    {
      id: 'mongoose-atomic-operators',
      number: '05',
      category: 'Concurrency & Atomic Writes',
      title: 'Filter-Guarded Atomic Operators: $inc, $addToSet vs $push, & $pull',
      subtitle: 'Leverage MongoDB single-document atomicity to prevent race conditions without multi-doc transactions.',
      sandboxConceptId: 'mongoose-atomic-operators-upsert',
      keyTakeaway:
        'Put your business invariant in the findOneAndUpdate filter ({ roomsAvailable: { $gt: 0 } }) and mutate with $inc/$addToSet so check-and-write happens atomically inside WiredTiger.',
      prismaCode: `// Filter-Guarded Atomic Updates in Kampus PropTech
@Injectable()
export class KampusInventoryMongoService {
  constructor(
    @InjectModel(Listing.name) private readonly listingModel: Model<Listing>,
  ) {}

  // 1. Filter-Guarded Atomic Decrement (Zero race conditions!)
  async claimHostelRoom(listingId: number) {
    const updated = await this.listingModel
      .findOneAndUpdate(
        // Filter Guard: Only matches if at least 1 room is currently available!
        { _id: listingId, roomsAvailable: { $gt: 0 } },
        // Atomic Mutation: Decrements inside WiredTiger's document lock
        { $inc: { roomsAvailable: -1 } },
        { new: true, runValidators: true },
      )
      .lean()
      .exec();

    if (!updated) {
      throw new ConflictException('Hostel is full — atomic filter guard rejected claim');
    }
    return updated;
  }

  // 2. Atomic Set Addition ($addToSet prevents duplicate amenities!)
  async addHostelAmenity(listingId: number, amenity: string) {
    return this.listingModel
      .findByIdAndUpdate(
        listingId,
        { $addToSet: { amenities: amenity } },
        { new: true, runValidators: true },
      )
      .lean()
      .exec();
  }
}`,
      rawSqlOrJsCode: `// ❌ Anti-Pattern: The Read-Modify-Save Race Condition in Mongoose
const hostel = await this.listingModel.findById(listingId); // Request A & B both read roomsAvailable = 1
if (hostel.roomsAvailable <= 0) {
  throw new ConflictException('Full');
}
hostel.roomsAvailable -= 1;
await hostel.save(); // Both Request A and Request B write 0! Hostel is overbooked!

// ❌ Anti-Pattern: Using $push instead of $addToSet for unique tags
// Calling $push: { amenities: 'fiber-wifi' } twice results in:
// amenities: ['fiber-wifi', 'fiber-wifi']`,
      syntaxMap: [
        {
          prismaToken: 'filter: { _id, roomsAvailable: { $gt: 0 } } + { $inc: { roomsAvailable: -1 } }',
          sqlOrJsEquivalent: 'UPDATE ... WHERE id = $1 AND rooms_available > 0',
          purpose: 'Evaluates the availability check and the decrement inside a single indivisible WiredTiger document write lock.',
        },
        {
          prismaToken: '{ $addToSet: { amenities: "fiber-wifi" } }',
          sqlOrJsEquivalent: 'Atomic set insertion (no duplicates)',
          purpose: 'Appends `"fiber-wifi"` to the `amenities` array only if it does not already exist in the array.',
        },
        {
          prismaToken: '{ $push: { inspectionLogs: newEntry } }',
          sqlOrJsEquivalent: 'Atomic array append (allows duplicates)',
          purpose: 'Appends an item (or multiple items with `{ $each: [...] }`) to the end of an array without loading the array into Node.js.',
        },
        {
          prismaToken: '{ $pull: { amenities: "generator" } }',
          sqlOrJsEquivalent: 'Atomic array filter/remove',
          purpose: 'Removes all instances of `"generator"` from the `amenities` array atomically.',
        },
      ],
      decisions: [
        {
          question: 'Why is the "Filter-Guarded Atomic Update" (`findOneAndUpdate({ _id, roomsAvailable: { $gt: 0 } }, { $inc: { roomsAvailable: -1 } })`) considered the gold standard in MongoDB?',
          antiPattern:
            'Opening a multi-document replica-set session transaction (`session.withTransaction`) just to check and decrement a single document\'s counter adds distributed coordination overhead and lock contention.',
          technicalReason:
            'MongoDB guarantees **100% ACID atomicity at the single-document level**. When `findOneAndUpdate` runs with `{ _id, roomsAvailable: { $gt: 0 } }`, the WiredTiger storage engine acquires an exclusive write intent on that document before evaluating `{ $gt: 0 }`. If 50 students hit the endpoint for the last room simultaneously, exactly 1 matches `{ $gt: 0 }` and decrements to `0`, while the other 49 see `0`, fail the filter, and receive `null`—all in `< 1ms` without a multi-document transaction!',
          bestPracticeRule:
            'Whenever an invariant involves fields on a single document (room count, wallet balance, status transition), encode the precondition in the `findOneAndUpdate` filter and mutate with `$inc` / `$set`.',
        },
        {
          question: 'When should you use `$addToSet` vs `$push` on MongoDB array fields?',
          antiPattern:
            'Fetching a document into Node.js, checking `if (!doc.amenities.includes(tag)) doc.amenities.push(tag)`, and calling `doc.save()` suffers from race conditions if two requests add the same tag concurrently.',
          technicalReason:
            '`$addToSet` performs the uniqueness check atomically inside the MongoDB server engine, guaranteeing set semantics on arrays (`amenities`, `savedByStudentIds`), whereas `$push` is ideal for chronological event logs where duplicates are valid.',
          bestPracticeRule:
            'Use `$addToSet` for unique tags/IDs (`amenities`, `upvotedBy`) and `$push` for ordered logs/history.',
        },
      ],
    },

    // =========================================================================
    // CHAPTER 6: MONGODB AGGREGATION PIPELINE ($MATCH, $GROUP, $LOOKUP)
    // =========================================================================
    {
      id: 'mongoose-aggregation-pipeline',
      number: '06',
      category: 'Aggregation & Analytics',
      title: 'The MongoDB Aggregation Pipeline: $match, $group, $lookup & Index Pushing',
      subtitle: 'Run multi-stage analytics and server-side joins inside MongoDB C++ engine.',
      sandboxConceptId: 'mongoose-schemas-queries-lean',
      keyTakeaway:
        'Always place $match and $sort as the very first stages of model.aggregate([...]) so MongoDB can use B-Tree indexes before $group or $lookup.',
      prismaCode: `// MongoDB Aggregation Pipeline in Kampus Analytics
@Injectable()
export class KampusMongoMetricsService {
  constructor(
    @InjectModel(Listing.name) private readonly listingModel: Model<Listing>,
  ) {}

  async getVerifiedRentBreakdownByZone() {
    return this.listingModel.aggregate([
      // Stage 1 ($match FIRST!): Uses compound index to filter before grouping
      {
        $match: {
          verified: true,
          published: true,
        },
      },
      // Stage 2 ($group): Aggregates metrics per campusZone inside MongoDB C++ engine
      {
        $group: {
          _id: '$campusZone',
          totalHostels: { $sum: 1 },
          totalRoomsAvailable: { $sum: '$roomsAvailable' },
          avgRentPerYear: { $avg: '$rentPerYear' },
          minRentPerYear: { $min: '$rentPerYear' },
          maxRentPerYear: { $max: '$rentPerYear' },
        },
      },
      // Stage 3 ($sort): Sort the compact summary buckets by average rent
      {
        $sort: { avgRentPerYear: 1 },
      },
    ]);
  }
}`,
      rawSqlOrJsCode: `// ❌ Anti-Pattern: Putting $match AFTER $group or $lookup (Kills Index Usage!)
await this.listingModel.aggregate([
  { $lookup: { from: 'kampus_users', localField: 'landlord', foreignField: '_id', as: 'owner' } },
  // DANGER: Joined ALL 100,000 hostels in the database BEFORE filtering to verified: true!
  { $match: { verified: true } },
]);

// Equivalent SQL for getVerifiedRentBreakdownByZone():
// SELECT campus_zone AS _id, COUNT(*) AS totalHostels,
//        SUM(rooms_available) AS totalRoomsAvailable, AVG(rent_per_year) AS avgRentPerYear
// FROM kampus_listings
// WHERE verified = true AND published = true
// GROUP BY campus_zone ORDER BY avgRentPerYear ASC;`,
      syntaxMap: [
        {
          prismaToken: '{ $match: { verified: true } }',
          sqlOrJsEquivalent: 'WHERE verified = true (Uses Index when placed first)',
          purpose: 'Filters documents passing into the next pipeline stage. Must be stage #1 to utilize collection B-Tree indexes.',
        },
        {
          prismaToken: "{ $group: { _id: '$campusZone', avgRent: { $avg: '$rentPerYear' } } }",
          sqlOrJsEquivalent: 'GROUP BY campus_zone + AVG(rent_per_year)',
          purpose: 'Groups documents by `_id` expression (`$field` or `null` for grand total) and computes `$sum`, `$avg`, `$min`, `$max`, `$push`.',
        },
        {
          prismaToken: "{ $lookup: { from: 'kampus_users', localField, foreignField, as } }",
          sqlOrJsEquivalent: 'LEFT OUTER JOIN kampus_users ON ...',
          purpose: 'Performs a true server-side join inside MongoDB (unlike `.populate()`, allowing you to filter or group by joined fields).',
        },
        {
          prismaToken: '{ $project: { _id: 0, zone: "$_id", avgRent: 1 } }',
          sqlOrJsEquivalent: 'SELECT _id AS zone, avgRent',
          purpose: 'Reshapes, renames, or computes fields in the output documents.',
        },
      ],
      decisions: [
        {
          question: 'Why must `$match` always be placed as the very first stage in `this.listingModel.aggregate([...])`?',
          antiPattern:
            'If you place `$project`, `$unwind`, or `$lookup` before `$match`, MongoDB cannot use your collection\'s B-Tree indexes to filter the initial dataset. It must load and transform every single document in the collection (COLLSCAN) before discarding non-matching rows!',
          technicalReason:
            'When `$match` is the first stage of an aggregation pipeline, the MongoDB query planner pushes the filter down into the WiredTiger index scan (`IXSCAN`), feeding only the matching fraction of documents into `$group` or `$lookup`.',
          bestPracticeRule:
            'Always put `$match` (and index-backed `$sort`) at the very beginning of `aggregate([...])` pipelines to maximize index utilization.',
        },
        {
          question: 'When should you use `.populate()` vs `aggregate([{ $lookup }])` in Mongoose?',
          antiPattern:
            'Trying to filter `Listing` documents by a field on the referenced `User` (e.g., "find all hostels whose landlord has `tier === \'verified\'`") using `.populate({ path: "landlord", match: { tier: "verified" } })` does NOT filter the `Listing` array—it returns all listings with `landlord: null` for non-matching landlords, breaking pagination!',
          technicalReason:
            '`.populate()` runs *after* the parent `Listing` query has already finished. In contrast, `$lookup` followed by `$match: { "landlord.tier": "verified" }` in an aggregation pipeline performs the join inside MongoDB before pagination (or even better, denormalize `verified: true` onto `Listing`).',
          bestPracticeRule:
            'Use `.populate()` when simply hydrating referenced IDs for display; use `$lookup` (or denormalized fields) when you must filter or sort parent documents by a related document\'s property.',
        },
      ],
    },

    // =========================================================================
    // CHAPTER 7: REPLICA-SET TRANSACTIONS & E11000 / CASTERROR EXCEPTION FILTER
    // =========================================================================
    {
      id: 'mongoose-transactions-errors',
      number: '07',
      category: 'Transactions & Error Filters',
      title: 'Multi-Document Transactions (withTransaction) & Handling E11000 / CastError',
      subtitle: 'Coordinate multi-collection escrow writes and translate MongoServerError (11000) & CastError in NestJS.',
      sandboxConceptId: 'mongoose-atomic-operators-upsert',
      keyTakeaway:
        'Pass { session } to every query inside connection.startSession() + session.withTransaction(), and catch MongoServerError (11000 -> 409) & CastError (-> 400) in a global Filter.',
      prismaCode: `// Multi-Document ACID Transaction + Global Mongoose Exception Filter
import { Catch, ExceptionFilter, ArgumentsHost, HttpStatus, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, MongoServerError, CastError } from 'mongoose';

@Catch(MongoServerError, CastError)
export class MongooseExceptionFilter implements ExceptionFilter {
  catch(exception: MongoServerError | CastError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    // 1. E11000 Duplicate Key Error -> HTTP 409 Conflict
    if (exception instanceof MongoServerError && exception.code === 11000) {
      const field = Object.keys(exception.keyPattern || {})[0] || 'field';
      return res.status(HttpStatus.CONFLICT).json({
        statusCode: 409,
        errorCode: 'MONGO_DUPLICATE_KEY_E11000',
        field,
        message: \`A Kampus record with that \${field} already exists.\`,
      });
    }
    // 2. Invalid ObjectId CastError -> HTTP 400 Bad Request
    return res.status(HttpStatus.BAD_REQUEST).json({
      statusCode: 400,
      errorCode: 'MONGO_INVALID_OBJECT_ID',
      message: \`Invalid ID format for parameter "\${(exception as CastError).path}"\`,
    });
  }
}

@Injectable()
export class MongoEscrowTransactionService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel('Listing') private readonly listingModel: Model<any>,
    @InjectModel('Booking') private readonly bookingModel: Model<any>,
  ) {}

  async reserveRoomAcrossCollections(studentId: string, listingId: number) {
    const session = await this.connection.startSession();
    try {
      return await session.withTransaction(async () => {
        const listing = await this.listingModel.findOneAndUpdate(
          { _id: listingId, roomsAvailable: { $gt: 0 } },
          { $inc: { roomsAvailable: -1 } },
          { new: true, session }, // MUST pass { session }!
        );
        if (!listing) throw new ConflictException('No rooms available');

        const [booking] = await this.bookingModel.create(
          [{ studentId, listingId, amount: listing.rentPerYear, status: 'escrow-locked' }],
          { session }, // Note: Model.create() requires an ARRAY as 1st arg when passing { session }!
        );
        return booking;
      });
    } finally {
      await session.endSession();
    }
  }
}`,
      rawSqlOrJsCode: `// ❌ TWO CLASSIC MONGOOSE TRANSACTION BUGS:

// Bug 1: Forgetting to pass { session } in options:
await session.withTransaction(async () => {
  await this.listingModel.findOneAndUpdate({ _id: id }, { $inc: { roomsAvailable: -1 } });
  // ^ Forgot { session }! Runs OUTSIDE the transaction and won't roll back!
});

// Bug 2: Calling Model.create(singleObject, { session }) instead of Model.create([singleObject], { session }):
// In Mongoose, Model.create(doc1, doc2) treats the 2nd argument as a SECOND DOCUMENT
// unless the 1st argument is an ARRAY: Model.create([doc1], { session })!`,
      syntaxMap: [
        {
          prismaToken: 'const session = await this.connection.startSession()',
          sqlOrJsEquivalent: 'Starts a MongoDB Replica-Set ClientSession',
          purpose: 'Allocates a logical session for coordinating multi-collection ACID operations.',
        },
        {
          prismaToken: 'await session.withTransaction(async () => { ... })',
          sqlOrJsEquivalent: 'startTransaction() -> commitTransaction() / abortTransaction()',
          purpose: 'Automatically commits if the callback resolves, aborts if it throws, and retries transient write conflicts (`TransientTransactionError`).',
        },
        {
          prismaToken: 'Model.create([doc], { session })',
          sqlOrJsEquivalent: 'INSERT inside active ClientSession',
          purpose: 'Crucial Mongoose quirk: when passing `{ session }` to `Model.create()`, the first argument MUST be an array `[doc]`.',
        },
        {
          prismaToken: 'exception.code === 11000 (MongoServerError)',
          sqlOrJsEquivalent: 'Unique index violation (like Prisma P2002)',
          purpose: 'Thrown by MongoDB when a `@Prop({ unique: true })` or `schema.index(..., { unique: true })` constraint is violated.',
        },
      ],
      decisions: [
        {
          question: 'Why must you pass `Model.create([doc], { session })` with an array as the first argument inside a Mongoose transaction?',
          antiPattern:
            'In Mongoose, `Model.create()` has an overloaded signature: `Model.create(doc1, doc2, doc3)` OR `Model.create([doc1], options)`. If you write `await this.bookingModel.create({ studentId, listingId }, { session })` (passing an object instead of an array), Mongoose thinks `{ session }` is a **second Booking document** to insert and runs the insert **outside** your transaction!',
          technicalReason:
            'Wrapping the document in an array (`const [booking] = await this.bookingModel.create([doc], { session })`) forces Mongoose to interpret the second argument as `SaveOptions` containing the active `ClientSession`.',
          bestPracticeRule:
            'Inside a Mongoose transaction, always pass `{ session }` to every query and always call `Model.create([doc], { session })` with an array as the first argument.',
        },
        {
          question: 'Why handle both `MongoServerError` (`11000`) and `CastError` in a NestJS Exception Filter?',
          antiPattern:
            'If a client requests `GET /listings/not-a-valid-objectid`, Mongoose throws `CastError: Cast to ObjectId failed for value "not-a-valid-objectid"`. Without an Exception Filter (or `ParseObjectIdPipe`), NestJS treats `CastError` as an unhandled runtime crash and returns `500 Internal Server Error`, triggering false PagerDuty alerts!',
          technicalReason:
            'A global `@Catch(MongoServerError, CastError)` Exception Filter cleanly translates client-caused invalid ObjectIds (`CastError`) to `400 Bad Request` and unique key collisions (`code === 11000`) to `409 Conflict`.',
          bestPracticeRule:
            'Register a global `MongooseExceptionFilter` (and/or a custom `ParseObjectIdPipe`) so malformed ObjectIds return `400 Bad Request` and `E11000` duplicates return `409 Conflict`.',
        },
      ],
    },
  ];
})(window);

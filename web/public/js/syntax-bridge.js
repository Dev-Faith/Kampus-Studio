/**
 * Kampus PropTech — NestJS ↔ Vanilla JavaScript Syntax Rosetta Stone
 * ===================================================================
 * Thoroughly explains every NestJS & TypeScript syntax construct and shows
 * its exact Vanilla JavaScript / Node.js / Express equivalent under the hood.
 */
(function (global) {
  'use strict';

  // ===========================================================================
  // 1. INTERACTIVE DECORATOR DECOMPILER ("WHAT DOES @ ACTUALLY DO IN JS?")
  // ===========================================================================
  const DECORATOR_DECOMPILER_ITEMS = [
    {
      id: 'dec-controller',
      token: "@Controller('listings')",
      kind: 'Class Decorator',
      summary: 'A Class Decorator is just a Vanilla JS function that receives the class constructor and attaches metadata to it.',
      nestjsCode: `@Controller('listings')
export class ListingsController {
  findAll() {
    return ['Cedar Court Studio'];
  }
}`,
      vanillaJsCode: `// 1. Your plain Vanilla JS class:
class ListingsController {
  findAll() {
    return ['Cedar Court Studio'];
  }
}

// 2. What the @Controller('listings') decorator function looks like in plain JS:
function Controller(prefix = '') {
  return function (targetClass) {
    // Attaches route prefix metadata directly onto the class constructor!
    targetClass.__controllerPrefix = prefix;
    return targetClass;
  };
}

// 3. What TypeScript executes when your file loads:
ListingsController = Controller('listings')(ListingsController) || ListingsController;`,
      takeaway:
        'There is zero magic in @Controller("listings"): it simply calls Controller("listings")(ListingsController) when the file is imported and stores { prefix: "listings" } on the class so NestJS knows what URL prefix to mount.',
    },
    {
      id: 'dec-method',
      token: "@Get(':id') / @Post()",
      kind: 'Method Decorator',
      summary: 'A Method Decorator is a plain JS function called with (ClassPrototype, methodName, propertyDescriptor).',
      nestjsCode: `export class ListingsController {
  @Get(':id')
  @HttpCode(200)
  findOne(id) {
    return { id, title: 'Cedar Court' };
  }
}`,
      vanillaJsCode: `class ListingsController {
  findOne(id) {
    return { id, title: 'Cedar Court' };
  }
}

// What @Get(':id') does in plain Vanilla JS:
function Get(path = '') {
  return function (classPrototype, methodName, descriptor) {
    const ctor = classPrototype.constructor;
    ctor.__routes = ctor.__routes || [];
    ctor.__routes.push({
      httpMethod: 'GET',
      path: path,
      handlerName: methodName,
      handlerFn: descriptor.value, // Reference to findOne()
    });
  };
}

// Executed at load time:
Get(':id')(
  ListingsController.prototype,
  'findOne',
  Object.getOwnPropertyDescriptor(ListingsController.prototype, 'findOne')
);`,
      takeaway:
        'Instead of writing router.get("/:id", controller.findOne), @Get(":id") pushes { httpMethod: "GET", path: ":id", handlerFn } into a metadata array on ListingsController.',
    },
    {
      id: 'dec-param',
      token: "@Param('id') / @Body() / @Query()",
      kind: 'Parameter Decorator',
      summary: 'A Parameter Decorator records WHICH argument index (0, 1, 2...) should receive req.params, req.query, or req.body.',
      nestjsCode: `export class ListingsController {
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('zone') zone: string,
  ) {
    return { id, zone };
  }
}`,
      vanillaJsCode: `// What @Param('id') and @Query('zone') do in plain Vanilla JS:
function Param(key) {
  return function (classPrototype, methodName, parameterIndex) {
    const ctor = classPrototype.constructor;
    ctor.__params = ctor.__params || {};
    ctor.__params[methodName] = ctor.__params[methodName] || [];
    ctor.__params[methodName].push({
      index: parameterIndex, // 0 for the first parameter
      source: 'params',      // tells Nest to read req.params[key]
      key: key,
    });
  };
}

// When a request arrives, Nest builds the arguments array in plain JS:
function callHandler(req, res, controllerInstance) {
  const args = [];
  args[0] = req.params['id'];   // parameterIndex 0 (@Param('id'))
  args[1] = req.query['zone'];  // parameterIndex 1 (@Query('zone'))
  return controllerInstance.findOne(...args);
}`,
      takeaway:
        'Parameter decorators tell NestJS how to build the arguments array [...args] from Express req before calling your method: controller.findOne(req.params.id, req.query.zone).',
    },
    {
      id: 'dec-di',
      token: 'constructor(private readonly db: DatabaseService)',
      kind: 'TypeScript Parameter Property + DI',
      summary: 'Combines TypeScript constructor assignment shorthand with automatic class instantiation.',
      nestjsCode: `@Controller('listings')
export class ListingsController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  findAll() {
    return this.db.findListings();
  }
}`,
      vanillaJsCode: `// 1. "private readonly db" in constructor parameters compiles to this exact JS:
class ListingsController {
  constructor(db) {
    this.db = db; // TypeScript writes this line for you automatically!
  }
  findAll() {
    return this.db.findListings();
  }
}

// 2. TypeScript also records the parameter types for Nest's DI container:
ListingsController.__paramTypes = [DatabaseService];

// 3. When NestJS boots, its DI container runs this plain JS factory:
const singletonDb = new DatabaseService();
const controller = new ListingsController(singletonDb);`,
      takeaway:
        'Writing "constructor(private readonly db: DatabaseService) {}" is 100% identical to writing "constructor(db) { this.db = db; }" in Vanilla JS, plus telling NestJS to pass in the shared DatabaseService instance.',
    },
    {
      id: 'dec-metadata',
      token: "@Roles('landlord') & Reflector",
      kind: 'Custom Metadata Decorator',
      summary: 'SetMetadata attaches a custom key-value pair to a method or class; Reflector reads it back inside a Guard.',
      nestjsCode: `// 1. Define the decorator:
export const Roles = (...roles: string[]) =>
  SetMetadata('roles', roles);

// 2. Attach it to a route:
@Post()
@Roles('landlord', 'admin')
createListing() {}

// 3. Read it inside a Guard:
const required = this.reflector.getAllAndOverride('roles', [
  context.getHandler(),
  context.getClass(),
]);`,
      vanillaJsCode: `// 1. SetMetadata in plain Vanilla JS using a WeakMap:
const metadataStore = new WeakMap();

function SetMetadata(metaKey, metaValue) {
  return function (target, methodName, descriptor) {
    const fnOrClass = descriptor ? descriptor.value : target;
    const map = metadataStore.get(fnOrClass) || {};
    map[metaKey] = metaValue;
    metadataStore.set(fnOrClass, map);
  };
}

// 2. Reflector.getAllAndOverride in plain Vanilla JS:
function getAllAndOverride(metaKey, [handlerFn, controllerClass]) {
  const handlerMeta = metadataStore.get(handlerFn)?.[metaKey];
  if (handlerMeta !== undefined) return handlerMeta;
  return metadataStore.get(controllerClass)?.[metaKey];
}`,
      takeaway:
        'SetMetadata and Reflector are just a WeakMap lookup! SetMetadata stores data on the route function, and Reflector reads it back when a Guard runs.',
    },
  ];

  // ===========================================================================
  // 2. DEEP-DIVE CHAPTERS: EVERY NESTJS SYNTAX VS VANILLA JAVASCRIPT
  // ===========================================================================
  const SYNTAX_CHAPTERS = [
    // -------------------------------------------------------------------------
    // CHAPTER 1: TYPESCRIPT & CLASS SYNTAX IN NESTJS
    // -------------------------------------------------------------------------
    {
      id: 'syn-ts-fundamentals',
      number: '01',
      title: 'TypeScript & Class Syntax Used in NestJS',
      subtitle: 'Understanding decorators (@), constructor parameter properties (private readonly), interfaces, and implements',
      items: [
        {
          id: 'syn-private-readonly',
          title: '1.1 Constructor Parameter Properties: private readonly',
          badges: ['constructor(private readonly ...)', 'this.service'],
          mentalModel:
            'In Vanilla JS, when you receive a dependency in a `constructor(db)`, you must manually write `this.db = db;` inside the constructor body. TypeScript lets you put `private readonly` in front of the parameter name, which automatically creates `this.db = db` for you!',
          nestjsCode: `@Injectable()
export class KampusEscrowService {
  // Empty constructor body! TypeScript assigns this.db automatically
  constructor(private readonly db: DatabaseService) {}

  getStudentBalance(studentId: string): number {
    return this.db.escrowWallets[studentId] ?? 0;
  }
}`,
          vanillaCode: `// Exact Vanilla JS output after TypeScript compiles it:
export class KampusEscrowService {
  constructor(db) {
    this.db = db; // <-- Generated automatically by "private readonly"
  }

  getStudentBalance(studentId) {
    return this.db.escrowWallets[studentId] ?? 0;
  }
}`,
          tokenMap: [
            {
              nest: 'private',
              vanilla: ' Compile-time visibility check (or JS #private field)',
              meaning: 'Prevents external classes from calling escrowService.db directly.',
            },
            {
              nest: 'readonly',
              vanilla: 'Cannot be reassigned after constructor()',
              meaning: 'Prevents accidental bugs like this.db = null inside a method.',
            },
            {
              nest: ': DatabaseService',
              vanilla: 'Type annotation + Reflect metadata token',
              meaning: 'Tells both TypeScript and NestJS what class instance to pass into constructor(db).',
            },
          ],
          sandboxConceptId: 'arch-di-tokens',
        },
        {
          id: 'syn-implements-interface',
          title: '1.2 Interfaces & implements (CanActivate, PipeTransform, NestInterceptor)',
          badges: ['implements CanActivate', 'implements PipeTransform', 'interface'],
          mentalModel:
            'In Vanilla JS, duck typing rules: if an object has a `canActivate(ctx)` method, it works as a guard. In NestJS, writing `implements CanActivate` is a compile-time checklist that guarantees you spelled the required method (`canActivate`, `transform`, `intercept`, or `catch`) with the exact right signature.',
          nestjsCode: `import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

export interface HostelQuote {
  rentPerYear: number;
  escrowFee: number;
}

@Injectable()
export class VerifiedLandlordGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    return req.user?.role === 'landlord';
  }
}`,
          vanillaCode: `// In Vanilla JS, "interface" and "implements" disappear completely at runtime!
// They exist purely to catch typos before your code runs.

export class VerifiedLandlordGuard {
  canActivate(context) {
    const req = context.switchToHttp().getRequest();
    return req.user?.role === 'landlord';
  }
}`,
          tokenMap: [
            {
              nest: 'interface HostelQuote { ... }',
              vanilla: 'JSDoc @typedef (erased at runtime)',
              meaning: 'Describes the shape of a plain JS object without creating a class.',
            },
            {
              nest: 'implements CanActivate',
              vanilla: 'Erased at runtime',
              meaning: 'Forces the class to define a canActivate(context) method.',
            },
            {
              nest: 'implements PipeTransform',
              vanilla: 'Erased at runtime',
              meaning: 'Forces the class to define a transform(value, metadata) method.',
            },
            {
              nest: 'implements NestInterceptor',
              vanilla: 'Erased at runtime',
              meaning: 'Forces the class to define an intercept(context, next) method.',
            },
          ],
          sandboxConceptId: 'guards-apikey',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // CHAPTER 2: CONTROLLERS, ROUTING & REQUEST EXTRACTION
    // -------------------------------------------------------------------------
    {
      id: 'syn-controllers-routing',
      number: '02',
      title: 'Controllers, Routing & Parameter Decorators',
      subtitle: 'How @Controller, @Get, @Post, @Param, @Query, @Body, and @Headers map to Vanilla Express (req, res)',
      items: [
        {
          id: 'syn-controller-routes',
          title: '2.1 @Controller(), @Get(), @Post(), @HttpCode(), @Header()',
          badges: ['@Controller()', '@Get()', '@Post()', '@HttpCode(204)'],
          mentalModel:
            'In Vanilla Express, you call `app.get("/listings/:id", async (req, res) => { res.status(200).json(result); })`. In NestJS, a `@Controller("listings")` class groups related routes together, and NestJS automatically calls `res.status(code).json(returnValue)` with whatever your method returns!',
          nestjsCode: `@Controller('listings')
export class ListingsController {
  constructor(private readonly db: DatabaseService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    const listing = this.db.findListingById(Number(id));
    return listing; // Nest automatically serializes return value as JSON!
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    this.db.deleteListing(Number(id));
  }
}`,
          vanillaCode: `// Exact Vanilla Node / Express Equivalent:
import express from 'express';
const router = express.Router();
const db = new DatabaseService();

router.get('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const listing = db.findListingById(Number(id));
    res.status(200).json(listing);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    db.deleteListing(Number(id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

app.use('/listings', router);`,
          tokenMap: [
            {
              nest: "@Controller('listings')",
              vanilla: "const router = express.Router(); app.use('/listings', router);",
              meaning: 'Groups all methods in the class under the /listings URL prefix.',
            },
            {
              nest: "@Get(':id') / @Post()",
              vanilla: "router.get('/:id', handler) / router.post('/', handler)",
              meaning: 'Maps an HTTP verb + sub-path to a class method.',
            },
            {
              nest: 'return listing;',
              vanilla: 'res.status(200).json(listing); (or 201 for POST)',
              meaning: 'Whatever value or Promise your method returns is sent as the JSON response body.',
            },
            {
              nest: '@HttpCode(204)',
              vanilla: 'res.status(204)',
              meaning: 'Overrides the default status code (200 for GET/PATCH/DELETE, 201 for POST).',
            },
          ],
          sandboxConceptId: 'arch-controllers',
        },
        {
          id: 'syn-param-decorators',
          title: '2.2 Request Extraction: @Param, @Query, @Body, @Headers, @Req, createParamDecorator',
          badges: ['@Param()', '@Query()', '@Body()', '@Headers()', 'createParamDecorator'],
          mentalModel:
            'Instead of passing the giant Express `req` object into every function and manually digging out `req.params.id`, `req.query.campusZone`, `req.body`, and `req.headers`, NestJS lets you declare exactly which piece of `req` each function parameter wants.',
          nestjsCode: `// Custom parameter decorator (@CurrentUser)
export const CurrentUser = createParamDecorator(
  (field: string | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return field ? req.user?.[field] : req.user;
  },
);

@Controller('listings')
export class ListingsController {
  @Post(':id/book')
  bookRoom(
    @Param('id') listingId: string,
    @Query('semester') semester: string,
    @Body() body: { moveInDate: string },
    @Headers('x-campus-client') client: string,
    @CurrentUser('email') studentEmail: string,
  ) {
    return { listingId, semester, body, client, studentEmail };
  }
}`,
          vanillaCode: `// Helper function equivalent to @CurrentUser():
function getCurrentUser(req, field) {
  return field ? req.user?.[field] : req.user;
}

// Express Route Handler reading properties from req manually:
router.post('/:id/book', (req, res) => {
  const listingId    = req.params['id'];              // @Param('id')
  const semester     = req.query['semester'];         // @Query('semester')
  const body         = req.body;                      // @Body()
  const client       = req.headers['x-campus-client'];// @Headers('x-campus-client')
  const studentEmail = getCurrentUser(req, 'email');  // @CurrentUser('email')

  res.status(201).json({ listingId, semester, body, client, studentEmail });
});`,
          tokenMap: [
            {
              nest: "@Param() / @Param('id')",
              vanilla: 'req.params / req.params.id',
              meaning: 'Extracts URL route parameters (always strings until piped).',
            },
            {
              nest: "@Query() / @Query('zone')",
              vanilla: 'req.query / req.query.zone',
              meaning: 'Extracts URL query-string parameters after ?.',
            },
            {
              nest: "@Body() / @Body('title')",
              vanilla: 'req.body / req.body?.title',
              meaning: 'Extracts parsed JSON payload from request body.',
            },
            {
              nest: "@Headers('x-api-key')",
              vanilla: "req.headers['x-api-key']",
              meaning: 'Reads a lowercase HTTP request header.',
            },
            {
              nest: 'createParamDecorator(fn)',
              vanilla: 'Custom extractor fn(req)',
              meaning: 'Creates a reusable decorator like @CurrentUser() so controllers never touch raw req.',
            },
          ],
          sandboxConceptId: 'guards-jwt-public',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // CHAPTER 3: MODULES, DI & CUSTOM PROVIDERS
    // -------------------------------------------------------------------------
    {
      id: 'syn-modules-di',
      number: '03',
      title: 'Modules, Dependency Injection & Custom Providers',
      subtitle: 'How @Module, @Injectable, @Inject, useValue, and useFactory compare to Vanilla JS classes & factories',
      items: [
        {
          id: 'syn-module-wiring',
          title: '3.1 @Module({ controllers, providers, imports, exports }) vs Manual Wiring',
          badges: ['@Module()', '@Injectable()', '@Inject()', 'useValue / useFactory'],
          mentalModel:
            'In a Vanilla JS app, you have a `bootstrap.js` file where you manually `new` every service in the right order and pass them into constructors (`new QuotesController(new KampusFeeService(config))`). A NestJS `@Module()` is simply a declarative manifest that tells NestJS how to run those `new` calls for you.',
          nestjsCode: `export const KAMPUS_FEE_CONFIG = 'KAMPUS_FEE_CONFIG';

@Injectable()
export class KampusFeeService {
  constructor(@Inject(KAMPUS_FEE_CONFIG) private readonly cfg: any) {}
}

@Controller('quotes')
export class QuotesController {
  constructor(private readonly fees: KampusFeeService) {}
}

@Module({
  controllers: [QuotesController],
  providers: [
    KampusFeeService,
    {
      provide: KAMPUS_FEE_CONFIG,
      useValue: { currency: 'USD', escrowRate: 0.05 },
    },
  ],
})
export class KampusQuoteModule {}`,
          vanillaCode: `// What NestJS's IoC Container does in plain Vanilla JS when reading @Module():
const container = new Map();

// 1. Register useValue provider:
container.set('KAMPUS_FEE_CONFIG', { currency: 'USD', escrowRate: 0.05 });

// 2. Instantiate @Injectable() KampusFeeService with its @Inject() token:
const feeConfig = container.get('KAMPUS_FEE_CONFIG');
const kampusFeeService = new KampusFeeService(feeConfig);
container.set(KampusFeeService, kampusFeeService);

// 3. Instantiate @Controller() QuotesController with KampusFeeService:
const quotesController = new QuotesController(
  container.get(KampusFeeService)
);`,
          tokenMap: [
            {
              nest: 'providers: [KampusFeeService]',
              vanilla: ' { provide: KampusFeeService, useClass: KampusFeeService }',
              meaning: 'Shorthand instructing Nest to create a singleton instance with new KampusFeeService(...).',
            },
            {
              nest: "{ provide: 'TOKEN', useValue: obj }",
              vanilla: "container.set('TOKEN', obj)",
              meaning: 'Registers a constant config object or mock under a string/Symbol token.',
            },
            {
              nest: "{ provide: 'TOKEN', useFactory: (dep) => ..., inject: [Dep] }",
              vanilla: "container.set('TOKEN', createThing(container.get(Dep)))",
              meaning: 'Runs a plain function (can be async!) to compute the dependency value.',
            },
            {
              nest: "@Inject('TOKEN')",
              vanilla: "container.get('TOKEN')",
              meaning: 'Looks up a non-class token (string or Symbol) from the DI Map.',
            },
          ],
          sandboxConceptId: 'arch-di-tokens',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // CHAPTER 4: PIPES, TRANSFORMATION & DTO VALIDATION
    // -------------------------------------------------------------------------
    {
      id: 'syn-pipes-dtos',
      number: '04',
      title: 'Pipes, Parameter Transformation & DTO Validation',
      subtitle: 'How ParseIntPipe, PipeTransform, and class-validator DTOs replace repetitive if/else validation in Vanilla JS',
      items: [
        {
          id: 'syn-pipes-vs-vanilla',
          title: '4.1 Built-in & Custom Pipes (ParseIntPipe, DefaultValuePipe, PipeTransform)',
          badges: ['ParseIntPipe', 'DefaultValuePipe', 'PipeTransform'],
          mentalModel:
            'In Vanilla Express, every route handler starts with 10 lines of defensive parsing (`const page = parseInt(req.query.page ?? "1", 10); if (isNaN(page)) return res.status(400)...`). A NestJS **Pipe** is just a pure function `transform(value, metadata)` that runs *before* your controller method and either returns the transformed value or throws `BadRequestException`.',
          nestjsCode: `@Injectable()
export class HostelSlugPipe implements PipeTransform {
  transform(value: unknown) {
    const slug = String(value ?? '').trim().toLowerCase().replace(/\\s+/g, '-');
    if (slug.length < 3) {
      throw new BadRequestException('Hostel title slug too short');
    }
    return slug;
  }
}

@Controller('hostels')
export class HostelsController {
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return { id, page }; // Both id and page are guaranteed to be numbers!
  }
}`,
          vanillaCode: `// Reusable pure functions in Vanilla JS:
function parseIntPipe(val, name) {
  const num = Number.parseInt(val, 10);
  if (Number.isNaN(num)) {
    const err = new Error(\`Validation failed (numeric string expected for \${name})\`);
    err.status = 400;
    throw err;
  }
  return num;
}

function defaultValuePipe(val, fallback) {
  return val === undefined || val === null || val === '' ? fallback : val;
}

// Inside Vanilla Express handler:
router.get('/:id', (req, res) => {
  const id = parseIntPipe(req.params.id, 'id');
  const page = parseIntPipe(defaultValuePipe(req.query.page, 1), 'page');
  res.json({ id, page });
});`,
          tokenMap: [
            {
              nest: "@Param('id', ParseIntPipe) id: number",
              vanilla: 'const id = parseIntPipe(req.params.id)',
              meaning: 'Coerces string "42" -> number 42 or throws 400 BadRequestException.',
            },
            {
              nest: 'new DefaultValuePipe(1), ParseIntPipe',
              vanilla: 'parseIntPipe(req.query.page ?? 1)',
              meaning: 'Pipes execute left-to-right just like nested function calls!',
            },
            {
              nest: 'transform(value, metadata)',
              vanilla: 'function pipe(value, { type, metatype, data })',
              meaning: 'The single method every Pipe implements; its return value replaces the argument.',
            },
          ],
          sandboxConceptId: 'pipes-builtin',
        },
        {
          id: 'syn-dto-validation',
          title: '4.2 DTO Classes + class-validator vs Manual if/else Body Checks',
          badges: ['ValidationPipe', '@IsString()', '@IsInt()', '@Min()', 'whitelist: true'],
          mentalModel:
            'In Vanilla JS, if a client sends `{ title: "Hi", rentPerYear: "200", isAdmin: true }`, you have to manually strip unknown fields (`isAdmin`), convert `"200"` to a number, and check string lengths. `ValidationPipe({ whitelist: true, transform: true })` reads the decorators on your DTO class and performs all three steps automatically.',
          nestjsCode: `export class CreateHostelDto {
  @IsString()
  @MinLength(5)
  title: string;

  @Type(() => Number)
  @IsInt()
  @Min(50)
  rentPerYear: number;
}

@Post()
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
create(@Body() dto: CreateHostelDto) {
  return dto;
}`,
          vanillaCode: `// What ValidationPipe({ whitelist: true, transform: true }) runs in Vanilla JS:
function validateCreateHostelDto(rawBody) {
  // 1. whitelist: true -> strip undeclared properties (prevents mass-assignment!)
  const dto = {
    title: rawBody.title,
    rentPerYear: rawBody.rentPerYear,
  };

  // 2. transform: true + @Type(() => Number) -> coerce types
  if (dto.rentPerYear !== undefined) {
    dto.rentPerYear = Number(dto.rentPerYear);
  }

  // 3. Run validation rules (@IsString, @MinLength, @IsInt, @Min)
  const errors = [];
  if (typeof dto.title !== 'string' || dto.title.length < 5) {
    errors.push('title must be longer than or equal to 5 characters');
  }
  if (!Number.isInteger(dto.rentPerYear) || dto.rentPerYear < 50) {
    errors.push('rentPerYear must not be less than 50');
  }
  if (errors.length > 0) {
    throw new BadRequestException({ statusCode: 400, message: errors });
  }
  return Object.assign(new CreateHostelDto(), dto);
}`,
          tokenMap: [
            {
              nest: 'whitelist: true',
              vanilla: 'Pick only allowed keys from req.body',
              meaning: 'Silently deletes hacker-injected fields like { verified: true, role: "admin" }.',
            },
            {
              nest: 'forbidNonWhitelisted: true',
              vanilla: 'if (extraKeys.length) throw 400',
              meaning: 'Rejects the request with 400 if any unknown property is sent.',
            },
            {
              nest: '@Type(() => Number)',
              vanilla: 'dto.rentPerYear = Number(raw.rentPerYear)',
              meaning: 'Coerces string numbers into JS Numbers before @IsInt() checks them.',
            },
          ],
          sandboxConceptId: 'pipes-validation-dto',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // CHAPTER 5: GUARDS, EXECUTION CONTEXT & REFLECTOR
    // -------------------------------------------------------------------------
    {
      id: 'syn-guards-reflector',
      number: '05',
      title: 'Guards, ExecutionContext & Metadata Reflection',
      subtitle: 'How @UseGuards, CanActivate, ExecutionContext, and Reflector upgrade Express auth middleware',
      items: [
        {
          id: 'syn-guards-vs-middleware',
          title: '5.1 Guards (CanActivate + ExecutionContext + Reflector) vs Express Middleware',
          badges: ['@UseGuards()', 'CanActivate', 'ExecutionContext', 'Reflector'],
          mentalModel:
            'In Express, middleware `(req, res, next) => ...` runs *before* routing, so it has no idea *which* controller method will handle the request or what roles that method requires. A NestJS **Guard** runs *after* routing and receives `ExecutionContext`, which points directly to the target class (`context.getClass()`) and method (`context.getHandler()`)!',
          nestjsCode: `export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) return true;

    const req = context.switchToHttp().getRequest();
    if (!requiredRoles.includes(req.user?.role)) {
      throw new ForbiddenException('Requires Kampus role: ' + requiredRoles.join(', '));
    }
    return true;
  }
}`,
          vanillaCode: `// Express higher-order middleware factory equivalent:
function requireRoles(...requiredRoles) {
  return function (req, res, next) {
    if (!requiredRoles.length) return next();

    if (!requiredRoles.includes(req.user?.role)) {
      return res.status(403).json({
        statusCode: 403,
        message: 'Requires Kampus role: ' + requiredRoles.join(', '),
      });
    }
    next();
  };
}

// Usage in Express:
router.post('/listings', requireRoles('landlord', 'admin'), createListingHandler);`,
          tokenMap: [
            {
              nest: 'context.switchToHttp().getRequest()',
              vanilla: 'req (in Express middleware)',
              meaning: 'Unwraps the underlying HTTP request object from the transport-agnostic ExecutionContext.',
            },
            {
              nest: 'context.getHandler() / context.getClass()',
              vanilla: 'Direct reference to the target method & controller class',
              meaning: 'Lets a single global Guard inspect @Public() or @Roles() decorators on the destination route!',
            },
            {
              nest: 'return true / return false',
              vanilla: 'next() / res.status(403).json(...)',
              meaning: 'Returning true continues the pipeline; returning false automatically throws 403 ForbiddenException.',
            },
          ],
          sandboxConceptId: 'guards-rbac-abac',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // CHAPTER 6: INTERCEPTORS & RXJS STREAMS VS PROMISES
    // -------------------------------------------------------------------------
    {
      id: 'syn-interceptors-rxjs',
      number: '06',
      title: 'Interceptors & RxJS Observables vs Async/Await',
      subtitle: 'Demystifying next.handle().pipe(), map(), tap(), catchError(), and timeout() in plain JavaScript terms',
      items: [
        {
          id: 'syn-rxjs-vs-async-await',
          title: '6.1 next.handle().pipe(map, tap, timeout, catchError) vs Async/Await Wrapper',
          badges: ['NestInterceptor', 'next.handle().pipe()', 'map()', 'tap()', 'catchError()'],
          mentalModel:
            'RxJS looks intimidating at first, but in NestJS HTTP Interceptors, `next.handle()` is just a lazy `Promise` representing your controller method! Calling `.pipe(op1, op2)` chains transformations on the response after the controller finishes—just like wrapping `await next()` in a `try / catch` block in Vanilla JS.',
          nestjsCode: `@Injectable()
export class KampusResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const start = Date.now();
    const req = context.switchToHttp().getRequest();

    // Code BEFORE next.handle() runs BEFORE the controller!
    return next.handle().pipe(
      // 1. tap() runs a side-effect (logging) without changing data
      tap(() => console.log(\`\${req.url} took \${Date.now() - start}ms\`)),
      // 2. timeout(150) aborts if the controller takes > 150ms
      timeout(150),
      // 3. map() transforms the response body returned by the controller
      map((data) => ({
        success: true,
        elapsedMs: Date.now() - start,
        data,
      })),
      // 4. catchError() intercepts errors thrown by the controller or timeout
      catchError((err) => of({ success: false, degraded: true, reason: err.message })),
    );
  }
}`,
          vanillaCode: `// Exact Vanilla JS async/await wrapper equivalent:
async function kampusResponseWrapper(req, runControllerHandler) {
  const start = Date.now();

  try {
    // 1. Run controller with a 150ms timeout race (equivalent to timeout(150)):
    const data = await Promise.race([
      runControllerHandler(req),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout has occurred')), 150)
      ),
    ]);

    // 2. Equivalent to tap(): log side-effect without changing data
    console.log(\`\${req.url} took \${Date.now() - start}ms\`);

    // 3. Equivalent to map(): wrap the returned payload in an envelope
    return {
      success: true,
      elapsedMs: Date.now() - start,
      data,
    };
  } catch (err) {
    // 4. Equivalent to catchError((err) => of(...)):
    return { success: false, degraded: true, reason: err.message };
  }
}`,
          tokenMap: [
            {
              nest: 'next.handle()',
              vanilla: 'await runControllerHandler()',
              meaning: 'Triggers the Pipes + Controller route handler and returns an Observable stream of the result.',
            },
            {
              nest: 'map((data) => ({ data }))',
              vanilla: 'const data = await next(); return { data };',
              meaning: 'Transforms the response payload before Nest sends it to the client.',
            },
            {
              nest: 'tap((data) => log(data))',
              vanilla: 'const data = await next(); log(data); return data;',
              meaning: 'Runs a side-effect (logging, caching, metrics) without altering the response.',
            },
            {
              nest: 'of(cachedValue)',
              vanilla: 'Promise.resolve(cachedValue)',
              meaning: 'Creates an immediate Observable value (used in CacheInterceptor to skip calling next.handle()!).',
            },
            {
              nest: 'catchError((err) => ...)',
              vanilla: 'try { ... } catch (err) { ... }',
              meaning: 'Catches any error from the handler stream and either recovers with of(fallback) or rethrows with throwError().',
            },
          ],
          sandboxConceptId: 'int-envelope-logging',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // CHAPTER 7: EXCEPTION FILTERS & STATEFUL BACKEND PATTERNS
    // -------------------------------------------------------------------------
    {
      id: 'syn-exceptions-events',
      number: '07',
      title: 'Exception Filters, Transactions & Domain Events',
      subtitle: 'How @Catch(), HttpException, db.transaction(), and @OnEvent() map to Vanilla JS & Node primitives',
      items: [
        {
          id: 'syn-exception-filter',
          title: '7.1 HttpException & @Catch() ExceptionFilter vs Express Error Middleware',
          badges: ['HttpException', '@Catch()', 'ExceptionFilter', 'ArgumentsHost'],
          mentalModel:
            'In Vanilla Express, if you throw an error or call `next(err)`, it lands in your 4-argument error middleware `(err, req, res, next) => ...`. In NestJS, throwing `new NotFoundException()` or `new HttpException(payload, 422)` unwinds the call stack and lands in either Nest\'s built-in filter or your custom `@Catch()` class.',
          nestjsCode: `@Catch()
export class KampusExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;

    res.status(status).json({
      statusCode: status,
      path: req.url,
      message: (exception as any)?.message || 'Internal error',
    });
  }
}`,
          vanillaCode: `// Custom Error class in Vanilla JS:
class HttpException extends Error {
  constructor(response, status) {
    super(typeof response === 'string' ? response : response.message);
    this.response = response;
    this.status = status;
  }
}

// Express 4-argument Error Middleware equivalent to @Catch():
app.use((exception, req, res, next) => {
  const status = exception instanceof HttpException ? exception.status : 500;
  res.status(status).json({
    statusCode: status,
    path: req.url,
    message: exception?.message || 'Internal error',
  });
});`,
          tokenMap: [
            {
              nest: "throw new NotFoundException('Hostel not found')",
              vanilla: "throw new HttpException({ statusCode: 404, message: 'Hostel not found' }, 404)",
              meaning: 'Immediately aborts execution and sends HTTP 404 JSON.',
            },
            {
              nest: '@Catch(QueryFailedError)',
              vanilla: 'if (err instanceof QueryFailedError) { ... }',
              meaning: 'Filters which error classes this ExceptionFilter handles (empty @Catch() catches all errors).',
            },
          ],
          sandboxConceptId: 'custom-exception-filters',
        },
        {
          id: 'syn-events-transactions',
          title: '7.2 Domain Events (@OnEvent) & Atomic Transactions (db.transaction)',
          badges: ['EventEmitter2', '@OnEvent()', 'db.transaction()'],
          mentalModel:
            '`EventEmitter2` in `@nestjs/event-emitter` is a thin decorator wrapper around Node\'s built-in `events.EventEmitter`. Instead of manually calling `emitter.on("listing.published", fn)` during setup, decorating a method with `@OnEvent("listing.published")` registers the listener automatically!',
          nestjsCode: `@Injectable()
export class KampusSafetyAuditListener {
  @OnEvent('listing.published')
  onPublished(payload: { listingId: number; title: string }) {
    console.log('Queued safety inspection for:', payload.title);
  }
}

// Emitting the event from a Controller or Service:
this.events.emit('listing.published', { listingId: 1, title: 'Cedar Court' });`,
          vanillaCode: `// Node.js built-in EventEmitter equivalent:
import { EventEmitter } from 'events';
const events = new EventEmitter();

// Registering the listener (equivalent to @OnEvent('listing.published')):
events.on('listing.published', (payload) => {
  console.log('Queued safety inspection for:', payload.title);
});

// Emitting the event:
events.emit('listing.published', { listingId: 1, title: 'Cedar Court' });`,
          tokenMap: [
            {
              nest: "@OnEvent('listing.published')",
              vanilla: "events.on('listing.published', listener.onPublished.bind(listener))",
              meaning: 'Subscribes the decorated method to the named event when the module initializes.',
            },
            {
              nest: 'await this.db.transaction(async (tx) => { ... })',
              vanilla: 'BEGIN; try { await work(tx); COMMIT; } catch (e) { ROLLBACK; throw e; }',
              meaning: 'Executes all database queries inside a single atomic transaction; rolls back automatically if an error is thrown.',
            },
          ],
          sandboxConceptId: 'events-and-idempotency',
        },
      ],
    },
  ];

  global.NEST_DECORATOR_DECOMPILER = DECORATOR_DECOMPILER_ITEMS;
  global.NEST_SYNTAX_CHAPTERS = SYNTAX_CHAPTERS;
})(window);

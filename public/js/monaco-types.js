/**
 * Kampus PropTech — Monaco TypeScript Ambient Declarations (.d.ts)
 * Provides real autocomplete, hover documentation, and parameter hints in Monaco Editor
 * for @nestjs/*, @playground/sandbox, rxjs, class-validator, and class-transformer.
 */
(function (global) {
  'use strict';

  global.NEST_MONACO_EXTRA_LIBS = `
declare module '@nestjs/common' {
  export function Controller(prefix?: string): ClassDecorator;
  export function Injectable(): ClassDecorator;
  export function Module(metadata: {
    imports?: any[];
    controllers?: any[];
    providers?: any[];
    exports?: any[];
  }): ClassDecorator;

  export function Get(path?: string): MethodDecorator;
  export function Post(path?: string): MethodDecorator;
  export function Patch(path?: string): MethodDecorator;
  export function Put(path?: string): MethodDecorator;
  export function Delete(path?: string): MethodDecorator;
  export function HttpCode(statusCode: number): MethodDecorator;
  export function Header(name: string, value: string): MethodDecorator;
  export function Version(version: string): MethodDecorator;

  export function SetMetadata<K = string, V = any>(metadataKey: K, metadataValue: V): MethodDecorator & ClassDecorator;
  export function applyDecorators(...decorators: Array<ClassDecorator | MethodDecorator | PropertyDecorator>): MethodDecorator & ClassDecorator;

  export function UseGuards(...guards: any[]): MethodDecorator & ClassDecorator;
  export function UseInterceptors(...interceptors: any[]): MethodDecorator & ClassDecorator;
  export function UsePipes(...pipes: any[]): MethodDecorator & ClassDecorator;
  export function UseFilters(...filters: any[]): MethodDecorator & ClassDecorator;
  export function Catch(...exceptions: any[]): ClassDecorator;
  export function Inject(token?: any): ParameterDecorator & PropertyDecorator;

  export function Param(property?: string | any, ...pipes: any[]): ParameterDecorator;
  export function Query(property?: string | any, ...pipes: any[]): ParameterDecorator;
  export function Body(property?: string | any, ...pipes: any[]): ParameterDecorator;
  export function Headers(property?: string): ParameterDecorator;
  export function Req(): ParameterDecorator;
  export function Request(): ParameterDecorator;
  export function Res(): ParameterDecorator;
  export function Ip(): ParameterDecorator;
  export function createParamDecorator<T = any>(factory: (data: T, ctx: ExecutionContext) => any): (data?: T, ...pipes: any[]) => ParameterDecorator;

  export interface ExecutionContext {
    getClass<T = any>(): T;
    getHandler(): Function;
    switchToHttp(): {
      getRequest<T = any>(): T;
      getResponse<T = any>(): T;
      getNext<T = any>(): T;
    };
  }

  export interface ArgumentsHost {
    switchToHttp(): {
      getRequest<T = any>(): T;
      getResponse<T = any>(): T;
    };
  }

  export interface CanActivate {
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | any;
  }

  export interface ArgumentMetadata {
    type: 'body' | 'query' | 'param' | 'custom';
    metatype?: any;
    data?: string;
  }

  export interface PipeTransform<T = any, R = any> {
    transform(value: T, metadata: ArgumentMetadata): R;
  }

  export interface CallHandler<T = any> {
    handle(): any;
  }

  export interface NestInterceptor<T = any, R = any> {
    intercept(context: ExecutionContext, next: CallHandler<T>): any;
  }

  export interface ExceptionFilter<T = any> {
    catch(exception: T, host: ArgumentsHost): any;
  }

  export class ParseIntPipe implements PipeTransform<string, number> {
    constructor(options?: { optional?: boolean });
    transform(value: string, metadata?: ArgumentMetadata): number;
  }
  export class ParseBoolPipe implements PipeTransform<string | boolean, boolean> {
    constructor(options?: { optional?: boolean });
    transform(value: string | boolean, metadata?: ArgumentMetadata): boolean;
  }
  export class ParseUUIDPipe implements PipeTransform<string, string> {
    transform(value: string, metadata?: ArgumentMetadata): string;
  }
  export class DefaultValuePipe<T = any> implements PipeTransform<T, T> {
    constructor(defaultValue: T);
    transform(value?: T): T;
  }
  export class ParseEnumPipe<T = any> implements PipeTransform<T, T> {
    constructor(enumType: T);
    transform(value: T): T;
  }
  export class ValidationPipe implements PipeTransform {
    constructor(options?: {
      whitelist?: boolean;
      forbidNonWhitelisted?: boolean;
      transform?: boolean;
    });
    transform(value: any, metadata?: ArgumentMetadata): any;
  }
  export class ClassSerializerInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): any;
  }

  export enum HttpStatus {
    OK = 200,
    CREATED = 201,
    NO_CONTENT = 204,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    REQUEST_TIMEOUT = 408,
    CONFLICT = 409,
    PAYLOAD_TOO_LARGE = 413,
    UNPROCESSABLE_ENTITY = 422,
    TOO_MANY_REQUESTS = 429,
    INTERNAL_SERVER_ERROR = 500,
    SERVICE_UNAVAILABLE = 503,
  }

  export class HttpException extends Error {
    constructor(response: string | Record<string, any>, status: number);
    getStatus(): number;
    getResponse(): string | Record<string, any>;
  }
  export class BadRequestException extends HttpException { constructor(objectOrError?: any); }
  export class UnauthorizedException extends HttpException { constructor(objectOrError?: any); }
  export class ForbiddenException extends HttpException { constructor(objectOrError?: any); }
  export class NotFoundException extends HttpException { constructor(objectOrError?: any); }
  export class RequestTimeoutException extends HttpException { constructor(objectOrError?: any); }
  export class ConflictException extends HttpException { constructor(objectOrError?: any); }
  export class PayloadTooLargeException extends HttpException { constructor(objectOrError?: any); }
  export class UnprocessableEntityException extends HttpException { constructor(objectOrError?: any); }
  export class InternalServerErrorException extends HttpException { constructor(objectOrError?: any); }
  export class ServiceUnavailableException extends HttpException { constructor(objectOrError?: any); }
}

declare module '@nestjs/core' {
  export class Reflector {
    get<T = any>(metadataKey: any, target: any): T;
    getAllAndOverride<T = any>(metadataKey: any, targets: any[]): T;
  }
  export const APP_GUARD: string;
  export const APP_INTERCEPTOR: string;
  export const APP_PIPE: string;
  export const APP_FILTER: string;
}

declare module '@nestjs/throttler' {
  export class ThrottlerGuard {}
  export class ThrottlerException { constructor(message?: string); }
  export function Throttle(options: Record<string, { limit: number; ttl: number }>): MethodDecorator & ClassDecorator;
  export function SkipThrottle(skip?: boolean): MethodDecorator & ClassDecorator;
  export class ThrottlerStorageService {
    increment(key: string, ttlMs: number, limit: number): {
      totalHits: number;
      timeToExpireSec: number;
      isBlocked: boolean;
    };
  }
}

declare module '@nestjs/cache-manager' {
  export const CACHE_MANAGER: string;
  export class CacheInterceptor {}
  export function CacheKey(key: string): MethodDecorator;
  export function CacheTTL(ttlMs: number): MethodDecorator;
  export class CacheManager {
    get<T = any>(key: string): Promise<T | undefined>;
    set(key: string, value: any, ttlMs?: number): Promise<void>;
    del(key: string): Promise<void>;
    reset(): Promise<void>;
  }
}

declare module '@nestjs/jwt' {
  export class JwtService {
    sign(payload: Record<string, any>, options?: { secret?: string; expiresIn?: string | number }): string;
    verify<T = any>(token: string, options?: { secret?: string }): T;
  }
}

declare module '@nestjs/event-emitter' {
  export class EventEmitter2 {
    emit(event: string, payload?: any): boolean;
    on(event: string, listener: (payload: any) => void): void;
  }
  export function OnEvent(event: string): MethodDecorator;
}

declare module '@playground/sandbox' {
  export interface KampusUser {
    id: string;
    email: string;
    name: string;
    role: 'student' | 'landlord' | 'admin';
    tier: 'basic' | 'verified' | 'campus-admin';
    passwordHash: string;
    refreshTokenHash: string | null;
    createdAt: string;
  }

  export interface KampusListing {
    id: number;
    title: string;
    campusZone: string;
    rentPerYear: number;
    roomsAvailable: number;
    amenities: string[];
    verified: boolean;
    published: boolean;
    landlordId: string;
    authorId: string;
    content: string;
    createdAt: string;
  }

  export interface KampusBooking {
    id: string;
    studentId: string;
    listingId: number;
    amount: number;
    status: string;
    idempotencyKey?: string;
  }

  export class DatabaseService {
    users: KampusUser[];
    listings: KampusListing[];
    posts: KampusListing[];
    bookings: KampusBooking[];
    orders: KampusBooking[];
    escrowWallets: Record<string, number>;
    walletBalances: Record<string, number>;
    auditLogs: any[];

    findUsers(): KampusUser[];
    findUserById(id: string): KampusUser | null;
    findUserByEmail(email: string): KampusUser | null;
    createUser(data: Partial<KampusUser> & { email: string; name?: string }): KampusUser;
    updateUser(id: string, patch: Partial<KampusUser>): KampusUser | null;

    findListings(filter?: {
      published?: boolean;
      verified?: boolean;
      campusZone?: string;
      landlordId?: string;
      maxRent?: number | string;
      search?: string;
    }): KampusListing[];
    findListingById(id: number): KampusListing | null;
    createListing(data: Partial<KampusListing> & { title: string }): KampusListing;
    updateListing(id: number, patch: Partial<KampusListing>): KampusListing | null;
    deleteListing(id: number): boolean;

    transaction<T>(work: (tx: DatabaseService) => Promise<T> | T): Promise<T>;
  }

  export class QueryFailedError extends Error {}
  export const IS_PUBLIC_KEY: string;
  export function Public(): MethodDecorator & ClassDecorator;
  export const ROLES_KEY: string;
  export function Roles(...roles: string[]): MethodDecorator & ClassDecorator;
  export function CurrentUser(field?: string): ParameterDecorator;

  export {
    PrismaClient,
    PrismaService,
    PrismaClientKnownRequestError,
    Prisma,
  } from '@prisma/client';
}

declare module '@prisma/client' {
  import { KampusUser, KampusListing, KampusBooking } from '@playground/sandbox';

  export class PrismaClientKnownRequestError extends Error {
    code: 'P2002' | 'P2025' | 'P2003' | string;
    meta?: { target?: string[]; cause?: string; [key: string]: any };
    clientVersion: string;
    constructor(message: string, opts: { code: string; meta?: Record<string, any> });
  }

  export namespace Prisma {
    export const PrismaClientKnownRequestError: typeof PrismaClientKnownRequestError;
    export type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$transaction'>;
    export type SortOrder = 'asc' | 'desc';
  }

  export interface PrismaModelDelegate<T> {
    findMany(args?: {
      where?: Record<string, any>;
      select?: Record<string, boolean | Record<string, any>>;
      include?: Record<string, boolean | Record<string, any>>;
      orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
      skip?: number;
      take?: number;
      cursor?: Record<string, any>;
      distinct?: string | string[];
    }): Promise<any[]>;
    findUnique(args: {
      where: Record<string, any>;
      select?: Record<string, boolean | Record<string, any>>;
      include?: Record<string, boolean | Record<string, any>>;
    }): Promise<any | null>;
    findUniqueOrThrow(args: {
      where: Record<string, any>;
      select?: Record<string, boolean | Record<string, any>>;
      include?: Record<string, boolean | Record<string, any>>;
    }): Promise<any>;
    findFirst(args?: {
      where?: Record<string, any>;
      select?: Record<string, boolean | Record<string, any>>;
      include?: Record<string, boolean | Record<string, any>>;
      orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
    }): Promise<any | null>;
    count(args?: { where?: Record<string, any> }): Promise<number>;
    aggregate(args: {
      where?: Record<string, any>;
      _count?: boolean | Record<string, boolean>;
      _avg?: Record<string, boolean>;
      _sum?: Record<string, boolean>;
      _min?: Record<string, boolean>;
      _max?: Record<string, boolean>;
    }): Promise<Record<string, any>>;
    create(args: {
      data: Record<string, any>;
      select?: Record<string, boolean | Record<string, any>>;
      include?: Record<string, boolean | Record<string, any>>;
    }): Promise<any>;
    update(args: {
      where: Record<string, any>;
      data: Record<string, any>;
      select?: Record<string, boolean | Record<string, any>>;
      include?: Record<string, boolean | Record<string, any>>;
    }): Promise<any>;
    upsert(args: {
      where: Record<string, any>;
      create: Record<string, any>;
      update: Record<string, any>;
      select?: Record<string, boolean | Record<string, any>>;
      include?: Record<string, boolean | Record<string, any>>;
    }): Promise<any>;
    delete(args: {
      where: Record<string, any>;
      select?: Record<string, boolean | Record<string, any>>;
    }): Promise<any>;
    deleteMany(args?: { where?: Record<string, any> }): Promise<{ count: number }>;
  }

  export class PrismaClient {
    user: PrismaModelDelegate<KampusUser>;
    listing: PrismaModelDelegate<KampusListing>;
    booking: PrismaModelDelegate<KampusBooking>;
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    $transaction<R>(
      fnOrOps: ((tx: Prisma.TransactionClient) => Promise<R>) | Array<Promise<any>>,
    ): Promise<R>;
  }

  export class PrismaService extends PrismaClient {
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
  }
}

declare module '@nestjs/mongoose' {
  export function Schema(options?: {
    timestamps?: boolean;
    collection?: string;
    versionKey?: string | false;
    autoIndex?: boolean;
  }): ClassDecorator;

  export function Prop(options?: {
    type?: any;
    required?: boolean;
    unique?: boolean;
    index?: boolean;
    default?: any;
    enum?: any[] | Record<string, any>;
    ref?: string;
    select?: boolean;
    min?: number;
    max?: number;
    trim?: boolean;
    lowercase?: boolean;
  }): PropertyDecorator;

  export const SchemaFactory: {
    createForClass<T = any>(target: new (...args: any[]) => T): {
      index(fields: Record<string, 1 | -1 | 'text'>, options?: Record<string, any>): any;
      pre(hook: string, fn: Function): any;
      post(hook: string, fn: Function): any;
      virtual(name: string): { get(fn: Function): any };
    };
  };

  export function InjectModel(modelNameOrClass: string | Function): ParameterDecorator & PropertyDecorator;
  export function InjectConnection(name?: string): ParameterDecorator & PropertyDecorator;
  export function getModelToken(modelName: string): string;

  export class MongooseModule {
    static forRoot(uri: string, options?: Record<string, any>): any;
    static forRootAsync(options: Record<string, any>): any;
    static forFeature(models: Array<{ name: string; schema: any }>): any;
  }
}

declare module 'mongoose' {
  export type HydratedDocument<T> = T & {
    _id: string | number;
    id: string | number;
    save(): Promise<HydratedDocument<T>>;
    toObject(): T;
  };

  export interface MongooseQuery<ResultType> extends Promise<ResultType> {
    select(projection: string | Record<string, 0 | 1 | boolean>): this;
    populate(path: string | { path: string; select?: string }, select?: string): this;
    sort(arg: string | Record<string, 1 | -1 | 'asc' | 'desc'>): this;
    skip(val: number): this;
    limit(val: number): this;
    lean(): this;
    exec(): Promise<ResultType>;
  }

  export class Model<T = any> {
    modelName: string;
    find(filter?: Record<string, any>, projection?: any): MongooseQuery<T[]>;
    findOne(filter?: Record<string, any>, projection?: any): MongooseQuery<T | null>;
    findById(id: string | number, projection?: any): MongooseQuery<T | null>;
    countDocuments(filter?: Record<string, any>): MongooseQuery<number>;
    exists(filter: Record<string, any>): Promise<{ _id: any } | null>;
    create(doc: Partial<T> | Record<string, any>): Promise<T>;
    findOneAndUpdate(
      filter: Record<string, any>,
      update: Record<string, any>,
      options?: { new?: boolean; upsert?: boolean; runValidators?: boolean; returnDocument?: 'before' | 'after' },
    ): MongooseQuery<T | null>;
    findByIdAndUpdate(
      id: string | number,
      update: Record<string, any>,
      options?: { new?: boolean; upsert?: boolean; runValidators?: boolean; returnDocument?: 'before' | 'after' },
    ): MongooseQuery<T | null>;
    findOneAndDelete(filter: Record<string, any>): MongooseQuery<T | null>;
    findByIdAndDelete(id: string | number): MongooseQuery<T | null>;
    deleteMany(filter?: Record<string, any>): Promise<{ acknowledged: boolean; deletedCount: number }>;
    aggregate<R = any>(pipeline: Array<Record<string, any>>): Promise<R[]>;
  }

  export class MongoServerError extends Error {
    code: number;
    keyPattern?: Record<string, number>;
    keyValue?: Record<string, any>;
  }

  export class CastError extends Error {
    kind: string;
    value: any;
    path: string;
  }

  export namespace Types {
    export class ObjectId {
      constructor(id?: string | number);
      static isValid(id: any): boolean;
    }
  }

  export namespace Schema {
    export namespace Types {
      export const ObjectId: any;
      export const Mixed: any;
    }
  }

  export interface ClientSession {
    withTransaction<T = any>(fn: () => Promise<T>): Promise<T>;
    endSession(): Promise<void>;
  }

  export interface Connection {
    startSession(): Promise<ClientSession>;
  }
}

declare module '@nestjs/testing' {
  export interface OverrideBy {
    useValue(value: any): TestingModuleBuilder;
    useClass(metatype: any): TestingModuleBuilder;
    useFactory(options: { factory: (...args: any[]) => any; inject?: any[] } | ((...args: any[]) => any)): TestingModuleBuilder;
  }

  export interface INestApplication {
    useGlobalPipes(...pipes: any[]): this;
    useGlobalGuards(...guards: any[]): this;
    useGlobalInterceptors(...interceptors: any[]): this;
    useGlobalFilters(...filters: any[]): this;
    init(): Promise<this>;
    close(): Promise<void>;
    get<T = any>(typeOrToken: any): T;
    getHttpServer(): any;
  }

  export class TestingModule {
    get<T = any>(typeOrToken: any): T;
    resolve<T = any>(typeOrToken: any): Promise<T>;
    createNestApplication(): INestApplication;
  }

  export interface TestingModuleBuilder {
    overrideProvider(typeOrToken: any): OverrideBy;
    overrideGuard(typeOrToken: any): OverrideBy;
    overrideInterceptor(typeOrToken: any): OverrideBy;
    overridePipe(typeOrToken: any): OverrideBy;
    compile(): Promise<TestingModule>;
  }

  export class Test {
    static createTestingModule(metadata: {
      imports?: any[];
      controllers?: any[];
      providers?: any[];
    }): TestingModuleBuilder;
  }
}

declare module 'supertest' {
  export interface Response {
    status: number;
    statusCode: number;
    body: any;
    headers: Record<string, string>;
    text: string;
  }

  export interface Test extends Promise<Response> {
    set(field: string | Record<string, string>, val?: string): this;
    query(val: Record<string, any>): this;
    send(body?: any): this;
    expect(status: number, body?: any): this;
    expect(checker: (res: Response) => any): this;
  }

  export interface SuperTest {
    get(url: string): Test;
    post(url: string): Test;
    patch(url: string): Test;
    put(url: string): Test;
    delete(url: string): Test;
  }

  function request(app: any): SuperTest;
  export default request;
}

declare interface JestMockFn<T = any, Y extends any[] = any[]> {
  (...args: Y): T;
  mock: { calls: Y[]; results: Array<{ type: string; value: any }> };
  calls: Y[];
  mockImplementation(fn: (...args: Y) => T): this;
  mockImplementationOnce(fn: (...args: Y) => T): this;
  mockReturnValue(val: T): this;
  mockReturnValueOnce(val: T): this;
  mockResolvedValue(val: Awaited<T>): this;
  mockResolvedValueOnce(val: Awaited<T>): this;
  mockRejectedValue(err: any): this;
  mockRejectedValueOnce(err: any): this;
  mockClear(): this;
  mockReset(): this;
}

declare namespace jest {
  function fn<T = any, Y extends any[] = any[]>(implementation?: (...args: Y) => T): JestMockFn<T, Y>;
  function spyOn<T extends object, M extends keyof T>(object: T, method: M): JestMockFn;
  function clearAllMocks(): void;
  function resetAllMocks(): void;
}

declare interface ExpectMatchers<R = any> {
  toBe(expected: any): R;
  toEqual(expected: any): R;
  toStrictEqual(expected: any): R;
  toMatchObject(expected: Record<string, any>): R;
  toBeDefined(): R;
  toBeUndefined(): R;
  toBeNull(): R;
  toBeTruthy(): R;
  toBeFalsy(): R;
  toBeGreaterThan(n: number): R;
  toBeGreaterThanOrEqual(n: number): R;
  toBeLessThan(n: number): R;
  toContain(item: any): R;
  toHaveLength(len: number): R;
  toHaveProperty(keyPath: string, value?: any): R;
  toHaveBeenCalled(): R;
  toHaveBeenCalledTimes(count: number): R;
  toHaveBeenCalledWith(...args: any[]): R;
  toThrow(error?: string | Function | RegExp): R;
  not: ExpectMatchers<R>;
  resolves: ExpectMatchers<Promise<void>>;
  rejects: ExpectMatchers<Promise<void>>;
}

declare function expect<T = any>(actual: T): ExpectMatchers<void>;
declare namespace expect {
  function any(constructor: any): any;
  function objectContaining(sample: Record<string, any>): any;
  function stringContaining(sample: string): any;
}

declare module '@jest/globals' {
  export { jest, expect };
}
`;
})(window);

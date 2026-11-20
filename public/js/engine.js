/**
 * Kampus PropTech — NestJS Interactive Sandbox & Request Lifecycle Engine
 * =======================================================================
 * Compiles real TypeScript files with `experimentalDecorators: true` and executes
 * the authentic NestJS onion pipeline for the Kampus Student Housing Platform:
 *
 *   Incoming HTTP Request
 *     -> 1. Middleware (`use(req, res, next)`)
 *     -> 2. Guards (`canActivate(ExecutionContext)`) [Global -> Controller -> Route]
 *     -> 3. Interceptors Pre-Controller (`intercept(ExecutionContext, CallHandler)`)
 *     -> 4. Pipes (`transform(value, ArgumentMetadata)`) [Global -> Controller -> Route -> Param]
 *     -> 5. Controller Route Handler + Injected Services / Kampus DB / Cache / Events
 *     -> 6. Interceptors Post-Controller (RxJS Observable stream: `map`, `tap`, `timeout`, `catchError`)
 *     -> 7. Exception Filters (`catch(exception, ArgumentsHost)`) [Route -> Controller -> Global]
 *   Outgoing HTTP Response + Step-by-Step Pipeline Trace
 */
(function (global) {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. Metadata Storage (Reflect.defineMetadata / getMetadata polyfill + Reflector)
  // ---------------------------------------------------------------------------
  const metadataStore = new WeakMap();

  function getMetaMap(target, propertyKey) {
    let targetMap = metadataStore.get(target);
    if (!targetMap) {
      targetMap = new Map();
      metadataStore.set(target, targetMap);
    }
    const key = propertyKey === undefined ? '__class__' : String(propertyKey);
    let propMap = targetMap.get(key);
    if (!propMap) {
      propMap = new Map();
      targetMap.set(key, propMap);
    }
    return propMap;
  }

  if (typeof Reflect === 'undefined' || !Reflect.defineMetadata) {
    global.Reflect = global.Reflect || {};
    Reflect.defineMetadata = function (metaKey, metaValue, target, propertyKey) {
      getMetaMap(target, propertyKey).set(metaKey, metaValue);
    };
    Reflect.getMetadata = function (metaKey, target, propertyKey) {
      if (!target) return undefined;
      const map = getMetaMap(target, propertyKey);
      if (map.has(metaKey)) return map.get(metaKey);
      const proto = Object.getPrototypeOf(target);
      if (proto && proto !== Object.prototype && proto !== Function.prototype) {
        return Reflect.getMetadata(metaKey, proto, propertyKey);
      }
      return undefined;
    };
    Reflect.getOwnMetadata = function (metaKey, target, propertyKey) {
      if (!target) return undefined;
      return getMetaMap(target, propertyKey).get(metaKey);
    };
    Reflect.metadata = function (metaKey, metaValue) {
      return function (target, propertyKey) {
        Reflect.defineMetadata(metaKey, metaValue, target, propertyKey);
      };
    };
  }

  class Reflector {
    get(metadataKey, target) {
      return Reflect.getMetadata(metadataKey, target);
    }
    getAllAndOverride(metadataKey, targets) {
      for (const target of targets || []) {
        if (!target) continue;
        const val = Reflect.getMetadata(metadataKey, target);
        if (val !== undefined) return val;
      }
      return undefined;
    }
    getAllAndMerge(metadataKey, targets) {
      const result = [];
      for (const target of targets || []) {
        if (!target) continue;
        const val = Reflect.getMetadata(metadataKey, target);
        if (Array.isArray(val)) result.push(...val);
        else if (val !== undefined) result.push(val);
      }
      return result;
    }
  }

  // ---------------------------------------------------------------------------
  // 2. HttpStatus & HttpException Hierarchy
  // ---------------------------------------------------------------------------
  const HttpStatus = {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    REQUEST_TIMEOUT: 408,
    CONFLICT: 409,
    PAYLOAD_TOO_LARGE: 413,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    200: 'OK',
    201: 'CREATED',
    204: 'NO_CONTENT',
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    408: 'REQUEST_TIMEOUT',
    409: 'CONFLICT',
    413: 'PAYLOAD_TOO_LARGE',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_SERVER_ERROR',
    503: 'SERVICE_UNAVAILABLE',
  };

  class HttpException extends Error {
    constructor(response, status = 500) {
      const msg =
        typeof response === 'string'
          ? response
          : Array.isArray(response?.message)
            ? response.message.join('; ')
            : response?.message || HttpStatus[status] || 'Http Exception';
      super(msg);
      this.name = this.constructor.name;
      this.response = response;
      this.status = status;
    }
    getStatus() {
      return this.status;
    }
    getResponse() {
      if (typeof this.response === 'object' && this.response !== null) {
        return {
          statusCode: this.status,
          error: HttpStatus[this.status] || 'Error',
          ...this.response,
        };
      }
      return {
        statusCode: this.status,
        message: this.response,
        error: HttpStatus[this.status] || 'Error',
      };
    }
  }

  function makeHttpError(defaultStatus, defaultLabel) {
    return class extends HttpException {
      constructor(message = defaultLabel, errorOrCode) {
        if (typeof message === 'object' && message !== null) {
          super(message, defaultStatus);
        } else {
          super(
            {
              statusCode: defaultStatus,
              message,
              error: typeof errorOrCode === 'string' ? errorOrCode : defaultLabel,
            },
            defaultStatus,
          );
        }
      }
    };
  }

  const BadRequestException = makeHttpError(400, 'Bad Request');
  const UnauthorizedException = makeHttpError(401, 'Unauthorized');
  const ForbiddenException = makeHttpError(403, 'Forbidden');
  const NotFoundException = makeHttpError(404, 'Not Found');
  const RequestTimeoutException = makeHttpError(408, 'Request Timeout');
  const ConflictException = makeHttpError(409, 'Conflict');
  const PayloadTooLargeException = makeHttpError(413, 'Payload Too Large');
  const UnprocessableEntityException = makeHttpError(422, 'Unprocessable Entity');
  const ThrottlerException = makeHttpError(429, 'Too Many Requests');
  const InternalServerErrorException = makeHttpError(500, 'Internal Server Error');
  const ServiceUnavailableException = makeHttpError(503, 'Service Unavailable');

  class QueryFailedError extends Error {
    constructor(message, code = 'SQLITE_CONSTRAINT_UNIQUE') {
      super(message);
      this.name = 'QueryFailedError';
      this.code = code;
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Lightweight RxJS Implementation (`Observable`, `of`, `tap`, `map`, `timeout`, `catchError`, `delay`)
  // ---------------------------------------------------------------------------
  class TimeoutError extends Error {
    constructor(message = 'Timeout has occurred') {
      super(message);
      this.name = 'TimeoutError';
    }
  }

  class Observable {
    constructor(subscribeFn) {
      this._subscribe = subscribeFn;
    }
    subscribe(observerOrNext, errorFn, completeFn) {
      const observer =
        typeof observerOrNext === 'function'
          ? { next: observerOrNext, error: errorFn, complete: completeFn }
          : observerOrNext || {};
      return this._subscribe({
        next: (v) => observer.next && observer.next(v),
        error: (e) => observer.error && observer.error(e),
        complete: () => observer.complete && observer.complete(),
      });
    }
    pipe(...operators) {
      return operators.reduce((prev, op) => op(prev), this);
    }
    toPromise() {
      return new Promise((resolve, reject) => {
        let lastVal;
        let hasVal = false;
        this.subscribe({
          next: (v) => {
            lastVal = v;
            hasVal = true;
          },
          error: (err) => reject(err),
          complete: () => resolve(hasVal ? lastVal : undefined),
        });
      });
    }
  }

  function of(...values) {
    return new Observable((observer) => {
      try {
        for (const v of values) observer.next(v);
        observer.complete();
      } catch (e) {
        observer.error(e);
      }
    });
  }

  function from(input) {
    if (input instanceof Observable) return input;
    if (input && typeof input.then === 'function') {
      return new Observable((observer) => {
        input.then(
          (v) => {
            observer.next(v);
            observer.complete();
          },
          (e) => observer.error(e),
        );
      });
    }
    if (Array.isArray(input)) return of(...input);
    return of(input);
  }

  function throwError(errorOrFactory) {
    return new Observable((observer) => {
      const err = typeof errorOrFactory === 'function' ? errorOrFactory() : errorOrFactory;
      observer.error(err);
    });
  }

  function map(project) {
    return (source) =>
      new Observable((observer) =>
        source.subscribe({
          next: (v) => {
            try {
              const mapped = project(v);
              if (mapped && typeof mapped.then === 'function') {
                mapped.then((res) => observer.next(res), (err) => observer.error(err));
              } else {
                observer.next(mapped);
              }
            } catch (e) {
              observer.error(e);
            }
          },
          error: (e) => observer.error(e),
          complete: () => observer.complete(),
        }),
      );
  }

  function tap(observerOrNext, errorFn) {
    const tapObs =
      typeof observerOrNext === 'function'
        ? { next: observerOrNext, error: errorFn }
        : observerOrNext || {};
    return (source) =>
      new Observable((observer) =>
        source.subscribe({
          next: (v) => {
            try {
              if (tapObs.next) tapObs.next(v);
            } catch (e) {
              return observer.error(e);
            }
            observer.next(v);
          },
          error: (e) => {
            try {
              if (tapObs.error) tapObs.error(e);
            } catch (inner) {
              return observer.error(inner);
            }
            observer.error(e);
          },
          complete: () => {
            try {
              if (tapObs.complete) tapObs.complete();
            } catch (e) {
              return observer.error(e);
            }
            observer.complete();
          },
        }),
      );
  }

  function catchError(selector) {
    return (source) =>
      new Observable((observer) =>
        source.subscribe({
          next: (v) => observer.next(v),
          error: (err) => {
            try {
              const recovered = selector(err, source);
              from(recovered).subscribe(observer);
            } catch (innerErr) {
              observer.error(innerErr);
            }
          },
          complete: () => observer.complete(),
        }),
      );
  }

  function delay(ms) {
    return (source) =>
      new Observable((observer) =>
        source.subscribe({
          next: (v) => {
            setTimeout(() => {
              observer.next(v);
              observer.complete();
            }, Math.min(ms, 3000));
          },
          error: (e) => observer.error(e),
          complete: () => {},
        }),
      );
  }

  function timeout(ms) {
    return (source) =>
      new Observable((observer) => {
        let settled = false;
        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            observer.error(new TimeoutError(`Timeout of ${ms}ms exceeded`));
          }
        }, ms);

        source.subscribe({
          next: (v) => {
            if (!settled) {
              clearTimeout(timer);
              observer.next(v);
            }
          },
          error: (e) => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              observer.error(e);
            }
          },
          complete: () => {
            if (!settled) {
              settled = true;
              clearTimeout(timer);
              observer.complete();
            }
          },
        });
      });
  }

  // ---------------------------------------------------------------------------
  // 4. Decorators & Metadata Keys
  // ---------------------------------------------------------------------------
  const META = {
    CONTROLLER: '__controller__',
    INJECTABLE: '__injectable__',
    MODULE: '__module__',
    ROUTES: '__routes__',
    HTTP_CODE: '__httpCode__',
    HEADERS: '__headers__',
    VERSION: '__version__',
    GUARDS: '__guards__',
    INTERCEPTORS: '__interceptors__',
    PIPES: '__pipes__',
    FILTERS: '__filters__',
    CATCH: '__catch__',
    PARAMS: '__params__',
    INJECT_TOKENS: '__injectTokens__',
    ON_EVENT: '__onEvent__',
    VALIDATORS: '__validators__',
    TRANSFORM_TYPE: '__transformType__',
    EXCLUDE_PROPS: '__excludeProps__',
  };

  function SetMetadata(key, value) {
    const decoratorFn = function (target, propertyKey, descriptor) {
      if (descriptor && descriptor.value) {
        Reflect.defineMetadata(key, value, descriptor.value);
      } else {
        Reflect.defineMetadata(key, value, target, propertyKey);
      }
    };
    decoratorFn.KEY = key;
    return decoratorFn;
  }

  function applyDecorators(...decorators) {
    return function (target, propertyKey, descriptor) {
      for (const dec of decorators) {
        if (!dec) continue;
        if (target instanceof Function && !propertyKey) {
          dec(target);
        } else {
          dec(target, propertyKey, descriptor);
        }
      }
    };
  }

  function Controller(prefixOrOptions = '') {
    const prefix =
      typeof prefixOrOptions === 'string'
        ? prefixOrOptions
        : prefixOrOptions?.path || '';
    const version =
      typeof prefixOrOptions === 'object' ? prefixOrOptions?.version : undefined;
    return function (target) {
      Reflect.defineMetadata(META.CONTROLLER, { prefix, version }, target);
    };
  }

  function Injectable(options) {
    return function (target) {
      Reflect.defineMetadata(META.INJECTABLE, options || { scope: 'DEFAULT' }, target);
    };
  }

  function Module(metadata) {
    return function (target) {
      Reflect.defineMetadata(META.MODULE, metadata || {}, target);
    };
  }

  function createMethodDecorator(method) {
    return function (path = '') {
      return function (target, propertyKey, descriptor) {
        const routes = Reflect.getOwnMetadata(META.ROUTES, target.constructor) || [];
        routes.push({
          method,
          path,
          handlerName: propertyKey,
          handler: descriptor.value,
        });
        Reflect.defineMetadata(META.ROUTES, routes, target.constructor);
      };
    };
  }

  const Get = createMethodDecorator('GET');
  const Post = createMethodDecorator('POST');
  const Patch = createMethodDecorator('PATCH');
  const Put = createMethodDecorator('PUT');
  const Delete = createMethodDecorator('DELETE');

  function HttpCode(statusCode) {
    return SetMetadata(META.HTTP_CODE, statusCode);
  }

  function Header(name, value) {
    return function (target, propertyKey, descriptor) {
      const targetFn = descriptor?.value || target;
      const existing = Reflect.getOwnMetadata(META.HEADERS, targetFn) || [];
      existing.push({ name, value });
      Reflect.defineMetadata(META.HEADERS, existing, targetFn);
    };
  }

  function Version(version) {
    return SetMetadata(META.VERSION, version);
  }

  function appendEnhancerMeta(metaKey, items) {
    return function (target, propertyKey, descriptor) {
      const ref = descriptor?.value || target;
      const existing = Reflect.getOwnMetadata(metaKey, ref) || [];
      Reflect.defineMetadata(metaKey, [...existing, ...items], ref);
    };
  }

  function UseGuards(...guards) {
    return appendEnhancerMeta(META.GUARDS, guards);
  }
  function UseInterceptors(...interceptors) {
    return appendEnhancerMeta(META.INTERCEPTORS, interceptors);
  }
  function UsePipes(...pipes) {
    return appendEnhancerMeta(META.PIPES, pipes);
  }
  function UseFilters(...filters) {
    return appendEnhancerMeta(META.FILTERS, filters);
  }
  function Catch(...exceptions) {
    return function (target) {
      Reflect.defineMetadata(META.CATCH, exceptions, target);
    };
  }
  function OnEvent(eventName) {
    return function (target, propertyKey) {
      const list = Reflect.getOwnMetadata(META.ON_EVENT, target.constructor) || [];
      list.push({ eventName, methodName: propertyKey });
      Reflect.defineMetadata(META.ON_EVENT, list, target.constructor);
    };
  }

  function Inject(token) {
    return function (target, propertyKey, parameterIndex) {
      if (typeof parameterIndex === 'number') {
        const tokens = Reflect.getOwnMetadata(META.INJECT_TOKENS, target) || {};
        tokens[parameterIndex] = token;
        Reflect.defineMetadata(META.INJECT_TOKENS, tokens, target);
      }
    };
  }

  function registerParam(type, data, pipes) {
    return function (target, propertyKey, parameterIndex) {
      const params =
        Reflect.getOwnMetadata(META.PARAMS, target.constructor, propertyKey) || [];
      params.push({
        index: parameterIndex,
        type,
        data,
        pipes: pipes || [],
      });
      Reflect.defineMetadata(META.PARAMS, params, target.constructor, propertyKey);
    };
  }

  function extractDataAndPipes(dataOrPipe, restPipes) {
    if (
      dataOrPipe &&
      (typeof dataOrPipe === 'function' || typeof dataOrPipe?.transform === 'function')
    ) {
      return { data: undefined, pipes: [dataOrPipe, ...restPipes] };
    }
    return { data: dataOrPipe, pipes: restPipes };
  }

  function Param(dataOrPipe, ...pipes) {
    const { data, pipes: p } = extractDataAndPipes(dataOrPipe, pipes);
    return registerParam('param', data, p);
  }
  function Query(dataOrPipe, ...pipes) {
    const { data, pipes: p } = extractDataAndPipes(dataOrPipe, pipes);
    return registerParam('query', data, p);
  }
  function Body(dataOrPipe, ...pipes) {
    const { data, pipes: p } = extractDataAndPipes(dataOrPipe, pipes);
    return registerParam('body', data, p);
  }
  function Headers(property) {
    return registerParam('headers', property ? property.toLowerCase() : undefined, []);
  }
  function Req() {
    return registerParam('req', undefined, []);
  }
  function Request() {
    return registerParam('req', undefined, []);
  }
  function Res() {
    return registerParam('res', undefined, []);
  }
  function Ip() {
    return registerParam('ip', undefined, []);
  }

  function createParamDecorator(factory) {
    return function (data, ...pipes) {
      return function (target, propertyKey, parameterIndex) {
        const params =
          Reflect.getOwnMetadata(META.PARAMS, target.constructor, propertyKey) || [];
        params.push({
          index: parameterIndex,
          type: 'custom',
          data,
          factory,
          pipes: pipes || [],
        });
        Reflect.defineMetadata(META.PARAMS, params, target.constructor, propertyKey);
      };
    };
  }

  const IS_PUBLIC_KEY = 'isPublic';
  const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

  const ROLES_KEY = 'roles';
  const Roles = (...roles) => SetMetadata(ROLES_KEY, roles);

  const THROTTLE_KEY = 'throttle';
  const SKIP_THROTTLE_KEY = 'skipThrottle';
  const Throttle = (opts) => SetMetadata(THROTTLE_KEY, opts);
  const SkipThrottle = (skip = true) => SetMetadata(SKIP_THROTTLE_KEY, skip);

  const CACHE_TTL_KEY = 'cache_module:cache_ttl';
  const CACHE_KEY_METADATA = 'cache_module:cache_key';
  const CacheTTL = (ttl) => SetMetadata(CACHE_TTL_KEY, ttl);
  const CacheKey = (key) => SetMetadata(CACHE_KEY_METADATA, key);
  const CACHE_MANAGER = 'CACHE_MANAGER';

  const CurrentUser = createParamDecorator((field, ctx) => {
    const user = ctx.switchToHttp().getRequest().user;
    return field ? user?.[field] : user;
  });

  // ---------------------------------------------------------------------------
  // 5. class-validator & class-transformer Decorators + ValidationPipe
  // ---------------------------------------------------------------------------
  function addValidatorRule(target, propertyKey, rule) {
    const rules = Reflect.getOwnMetadata(META.VALIDATORS, target.constructor) || [];
    rules.push({ propertyKey, ...rule });
    Reflect.defineMetadata(META.VALIDATORS, rules, target.constructor);
  }

  function IsOptional() {
    return (target, key) => addValidatorRule(target, key, { type: 'optional' });
  }
  function IsString(opts) {
    return (target, key) =>
      addValidatorRule(target, key, {
        type: 'check',
        check: (v) => typeof v === 'string',
        message: opts?.message || `${key} must be a string`,
      });
  }
  function IsNotEmpty(opts) {
    return (target, key) =>
      addValidatorRule(target, key, {
        type: 'check',
        check: (v) => v !== undefined && v !== null && String(v).trim().length > 0,
        message: opts?.message || `${key} should not be empty`,
      });
  }
  function IsEmail(opts, msgOpts) {
    return (target, key) =>
      addValidatorRule(target, key, {
        type: 'check',
        check: (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: (msgOpts || opts)?.message || `${key} must be a valid email address`,
      });
  }
  function IsInt(opts) {
    return (target, key) =>
      addValidatorRule(target, key, {
        type: 'check',
        check: (v) => typeof v === 'number' && Number.isInteger(v),
        message: opts?.message || `${key} must be an integer number`,
      });
  }
  function IsNumber(numOpts, msgOpts) {
    return (target, key) =>
      addValidatorRule(target, key, {
        type: 'check',
        check: (v) => typeof v === 'number' && Number.isFinite(v),
        message: (msgOpts || numOpts)?.message || `${key} must be a number`,
      });
  }
  function IsBoolean(opts) {
    return (target, key) =>
      addValidatorRule(target, key, {
        type: 'check',
        check: (v) => typeof v === 'boolean',
        message: opts?.message || `${key} must be a boolean value`,
      });
  }
  function Min(minVal, opts) {
    return (target, key) =>
      addValidatorRule(target, key, {
        type: 'check',
        check: (v) => typeof v === 'number' && v >= minVal,
        message: opts?.message || `${key} must not be less than ${minVal}`,
      });
  }
  function Max(maxVal, opts) {
    return (target, key) =>
      addValidatorRule(target, key, {
        type: 'check',
        check: (v) => typeof v === 'number' && v <= maxVal,
        message: opts?.message || `${key} must not be greater than ${maxVal}`,
      });
  }
  function MinLength(min, opts) {
    return (target, key) =>
      addValidatorRule(target, key, {
        type: 'check',
        check: (v) => typeof v === 'string' && v.length >= min,
        message: opts?.message || `${key} must be longer than or equal to ${min} characters`,
      });
  }
  function MaxLength(max, opts) {
    return (target, key) =>
      addValidatorRule(target, key, {
        type: 'check',
        check: (v) => typeof v === 'string' && v.length <= max,
        message: opts?.message || `${key} must be shorter than or equal to ${max} characters`,
      });
  }
  function IsEnum(enumObj, opts) {
    const allowed = Object.values(enumObj || {});
    return (target, key) =>
      addValidatorRule(target, key, {
        type: 'check',
        check: (v) => allowed.includes(v),
        message:
          opts?.message || `${key} must be one of the following values: ${allowed.join(', ')}`,
      });
  }
  function IsIn(allowed, opts) {
    return (target, key) =>
      addValidatorRule(target, key, {
        type: 'check',
        check: (v) => Array.isArray(allowed) && allowed.includes(v),
        message:
          opts?.message || `${key} must be one of the following values: ${(allowed || []).join(', ')}`,
      });
  }
  function Matches(pattern, opts) {
    return (target, key) =>
      addValidatorRule(target, key, {
        type: 'check',
        check: (v) => typeof v === 'string' && pattern.test(v),
        message: opts?.message || `${key} must match ${pattern} regular expression`,
      });
  }
  function IsArray(opts) {
    return (target, key) =>
      addValidatorRule(target, key, {
        type: 'check',
        check: (v) => Array.isArray(v),
        message: opts?.message || `${key} must be an array`,
      });
  }
  function IsUUID(version, opts) {
    return (target, key) =>
      addValidatorRule(target, key, {
        type: 'check',
        check: (v) =>
          typeof v === 'string' &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
        message: (opts || version)?.message || `${key} must be a UUID`,
      });
  }

  function Type(typeFn) {
    return function (target, key) {
      const map = Reflect.getOwnMetadata(META.TRANSFORM_TYPE, target.constructor) || {};
      map[key] = typeFn;
      Reflect.defineMetadata(META.TRANSFORM_TYPE, map, target.constructor);
    };
  }

  function Exclude() {
    return function (target, key) {
      if (key) {
        const list = Reflect.getOwnMetadata(META.EXCLUDE_PROPS, target.constructor) || [];
        list.push(key);
        Reflect.defineMetadata(META.EXCLUDE_PROPS, list, target.constructor);
      }
    };
  }

  // Built-in Pipes
  class ParseIntPipe {
    constructor(options = {}) {
      this.options = options;
    }
    transform(value, metadata) {
      if (value === undefined && this.options.optional) return undefined;
      const isNumeric =
        ['string', 'number'].includes(typeof value) &&
        !Number.isNaN(Number(value)) &&
        Number.isInteger(Number(value)) &&
        String(value).trim() !== '';
      if (!isNumeric) {
        throw new BadRequestException(
          `Validation failed (numeric string is expected${metadata?.data ? ` for "${metadata.data}"` : ''})`,
        );
      }
      return parseInt(String(value), 10);
    }
  }

  class ParseBoolPipe {
    constructor(options = {}) {
      this.options = options;
    }
    transform(value) {
      if (value === undefined && this.options.optional) return undefined;
      if (value === true || value === 'true' || value === '1') return true;
      if (value === false || value === 'false' || value === '0') return false;
      throw new BadRequestException('Validation failed (boolean string is expected)');
    }
  }

  class ParseUUIDPipe {
    transform(value, metadata) {
      if (
        typeof value !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
      ) {
        throw new BadRequestException(
          `Validation failed (uuid is expected${metadata?.data ? ` for "${metadata.data}"` : ''})`,
        );
      }
      return value;
    }
  }

  class DefaultValuePipe {
    constructor(defaultValue) {
      this.defaultValue = defaultValue;
    }
    transform(value) {
      if (value === undefined || value === null || value === '') {
        return this.defaultValue;
      }
      return value;
    }
  }

  class ParseEnumPipe {
    constructor(enumType) {
      this.enumType = enumType || {};
    }
    transform(value) {
      const allowed = Object.values(this.enumType);
      if (!allowed.includes(value)) {
        throw new BadRequestException(
          `Validation failed (enum value expected: ${allowed.join(', ')})`,
        );
      }
      return value;
    }
  }

  class ValidationPipe {
    constructor(options = {}) {
      this.whitelist = options.whitelist !== false;
      this.forbidNonWhitelisted = Boolean(options.forbidNonWhitelisted);
      this.transformEnabled = options.transform !== false;
    }

    transform(value, metadata) {
      const metatype = metadata?.metatype;
      if (!metatype || [String, Boolean, Number, Array, Object].includes(metatype)) {
        return value;
      }
      const rules = Reflect.getMetadata(META.VALIDATORS, metatype) || [];
      const typeMap = Reflect.getMetadata(META.TRANSFORM_TYPE, metatype) || {};
      if (rules.length === 0 && Object.keys(typeMap).length === 0) {
        return value;
      }

      const input = value && typeof value === 'object' ? { ...value } : {};
      const instance = new metatype();
      const decoratedProps = new Set([
        ...rules.map((r) => r.propertyKey),
        ...Object.keys(typeMap),
        ...Object.keys(instance),
      ]);

      const errors = [];

      if (this.whitelist) {
        for (const key of Object.keys(input)) {
          if (!decoratedProps.has(key)) {
            if (this.forbidNonWhitelisted) {
              errors.push(`property ${key} should not exist`);
            } else {
              delete input[key];
            }
          }
        }
      }

      if (this.transformEnabled) {
        for (const [prop, typeFn] of Object.entries(typeMap)) {
          if (input[prop] !== undefined && input[prop] !== '') {
            const targetType = typeFn();
            if (targetType === Number) input[prop] = Number(input[prop]);
            else if (targetType === Boolean)
              input[prop] = input[prop] === 'true' || input[prop] === true;
            else if (targetType === String) input[prop] = String(input[prop]);
          }
        }
      }

      const merged = Object.assign(instance, input);

      const optionalProps = new Set(
        rules.filter((r) => r.type === 'optional').map((r) => r.propertyKey),
      );
      for (const rule of rules) {
        if (rule.type === 'optional') continue;
        const val = merged[rule.propertyKey];
        if ((val === undefined || val === null) && optionalProps.has(rule.propertyKey)) {
          continue;
        }
        if (!rule.check(val, merged)) {
          errors.push(rule.message);
        }
      }

      if (errors.length > 0) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          message: errors,
        });
      }

      return this.transformEnabled ? merged : input;
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Kampus PropTech Stateful Sandbox Services (Database, Cache, Throttler, JWT, EventEmitter)
  // ---------------------------------------------------------------------------
  function createInitialState() {
    const listings = [
      {
        id: 1,
        title: 'Cedar Court Ensuite Studio',
        campusZone: 'North Gate',
        rentPerYear: 180,
        roomsAvailable: 4,
        amenities: ['solar-inverter', 'borehole-water', 'fiber-wifi'],
        verified: true,
        published: true,
        landlordId: 'u-landlord-2',
        authorId: 'u-landlord-2',
        content: '5 mins walk to Engineering Faculty, 24/7 solar power and fiber internet.',
        createdAt: '2026-11-05T09:00:00.000Z',
      },
      {
        id: 2,
        title: 'Emerald Palms Shared Flat',
        campusZone: 'South Gate',
        rentPerYear: 250,
        roomsAvailable: 2,
        amenities: ['security-post', 'study-lounge', 'water-heater'],
        verified: true,
        published: true,
        landlordId: 'u-admin-1',
        authorId: 'u-admin-1',
        content: 'Quiet university-managed residence with biometric access and study lounge.',
        createdAt: '2026-11-06T14:20:00.000Z',
      },
      {
        id: 3,
        title: 'Unverified Annex Lodge (Pending Inspection)',
        campusZone: 'Tech Valley',
        rentPerYear: 120,
        roomsAvailable: 1,
        amenities: ['borehole-water'],
        verified: false,
        published: false,
        landlordId: 'u-landlord-2',
        authorId: 'u-landlord-2',
        content: 'Awaiting Kampus Housing Officer physical verification.',
        createdAt: '2026-11-07T18:10:00.000Z',
      },
    ];

    const bookings = [
      {
        id: 'bk-101',
        studentId: 'u-student-3',
        userId: 'u-student-3',
        listingId: 1,
        item: 'Cedar Court Ensuite Studio (1 Year Rent Escrow)',
        amount: 180,
        status: 'held-in-escrow',
        idempotencyKey: 'idem-kampus-initial-1',
        createdAt: '2026-11-08T11:00:00.000Z',
      },
    ];

    const escrowWallets = {
      'u-admin-1': 5000,
      'u-landlord-2': 1200,
      'u-student-3': 400,
    };

    return {
      users: [
        {
          id: 'u-admin-1',
          email: 'admin@kampus.edu',
          name: 'Grace Bello (Kampus Housing Officer)',
          role: 'admin',
          tier: 'campus-admin',
          passwordHash: '$2b$10$demoHashForAdmin123!',
          refreshTokenHash: null,
          createdAt: '2026-11-01T10:00:00.000Z',
        },
        {
          id: 'u-landlord-2',
          email: 'chidi@kampus.edu',
          name: 'Chidi Nwosu (Verified Landlord)',
          role: 'landlord',
          tier: 'verified',
          passwordHash: '$2b$10$demoHashForMod123!',
          refreshTokenHash: null,
          createdAt: '2026-11-02T12:00:00.000Z',
        },
        {
          id: 'u-student-3',
          email: 'ada@kampus.edu',
          name: 'Adaobi Okafor (300L CS Student)',
          role: 'student',
          tier: 'basic',
          passwordHash: '$2b$10$demoHashForUser123!',
          refreshTokenHash: null,
          createdAt: '2026-11-03T15:30:00.000Z',
        },
      ],
      listings,
      get posts() {
        return this.listings;
      },
      set posts(val) {
        this.listings = val;
      },
      bookings,
      get orders() {
        return this.bookings;
      },
      set orders(val) {
        this.bookings = val;
      },
      escrowWallets,
      get walletBalances() {
        return this.escrowWallets;
      },
      set walletBalances(val) {
        this.escrowWallets = val;
      },
      auditLogs: [],
      cache: new Map(),
      throttler: new Map(),
      eventsLog: [],
      consoleLogs: [],
    };
  }

  let sandboxState = createInitialState();

  function resetSandboxState() {
    sandboxState = createInitialState();
    return sandboxState;
  }

  function logToConsole(level, context, message) {
    const entry = {
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString().split('T')[1].slice(0, 12),
      level,
      context: context || 'Kampus',
      message: typeof message === 'string' ? message : JSON.stringify(message),
    };
    sandboxState.consoleLogs.push(entry);
    if (sandboxState.consoleLogs.length > 80) sandboxState.consoleLogs.shift();
  }

  class Logger {
    constructor(context = 'Kampus') {
      this.context = context;
    }
    log(msg) {
      logToConsole('LOG', this.context, msg);
    }
    warn(msg) {
      logToConsole('WARN', this.context, msg);
    }
    error(msg) {
      logToConsole('ERROR', this.context, msg);
    }
    debug(msg) {
      logToConsole('DEBUG', this.context, msg);
    }
  }

  class DatabaseService {
    get users() {
      return sandboxState.users;
    }
    get listings() {
      return sandboxState.listings;
    }
    get posts() {
      return sandboxState.listings;
    }
    get bookings() {
      return sandboxState.bookings;
    }
    get orders() {
      return sandboxState.bookings;
    }
    get auditLogs() {
      return sandboxState.auditLogs;
    }
    get escrowWallets() {
      return sandboxState.escrowWallets;
    }
    get walletBalances() {
      return sandboxState.escrowWallets;
    }

    findUsers() {
      return sandboxState.users.map((u) => ({ ...u }));
    }
    findUserById(id) {
      const u = sandboxState.users.find((x) => x.id === id);
      return u ? { ...u } : null;
    }
    findUserByEmail(email) {
      const u = sandboxState.users.find(
        (x) => x.email.toLowerCase() === String(email || '').toLowerCase(),
      );
      return u ? { ...u } : null;
    }
    createUser(data) {
      if (!data || typeof data !== 'object' || !data.email) {
        throw new BadRequestException(
          'Invalid user payload: expected a JSON object with at least an "email" field (check your Request Body JSON syntax).',
        );
      }
      if (this.findUserByEmail(data.email)) {
        throw new QueryFailedError(`UNIQUE constraint failed: users.email (${data.email})`);
      }
      const user = {
        id: data.id || `u-${Date.now().toString(36)}`,
        email: String(data.email).toLowerCase(),
        name: data.name || 'New Kampus Student',
        role: data.role || 'student',
        tier: data.tier || 'basic',
        passwordHash: data.passwordHash || '$2b$10$hashed',
        refreshTokenHash: data.refreshTokenHash || null,
        createdAt: new Date().toISOString(),
      };
      sandboxState.users.push(user);
      sandboxState.escrowWallets[user.id] = 400;
      return { ...user };
    }
    updateUser(id, patch) {
      const idx = sandboxState.users.findIndex((x) => x.id === id);
      if (idx === -1) return null;
      if (
        patch.email &&
        sandboxState.users.some(
          (u, i) => i !== idx && u.email.toLowerCase() === patch.email.toLowerCase(),
        )
      ) {
        throw new QueryFailedError(`UNIQUE constraint failed: users.email (${patch.email})`);
      }
      sandboxState.users[idx] = { ...sandboxState.users[idx], ...patch };
      return { ...sandboxState.users[idx] };
    }

    findListings(filter = {}) {
      let list = sandboxState.listings.map((item) => ({ ...item }));
      if (filter.published !== undefined) {
        list = list.filter((item) => item.published === Boolean(filter.published));
      }
      if (filter.verified !== undefined) {
        list = list.filter((item) => item.verified === Boolean(filter.verified));
      }
      if (filter.campusZone) {
        list = list.filter(
          (item) => item.campusZone.toLowerCase() === String(filter.campusZone).toLowerCase(),
        );
      }
      if (filter.landlordId || filter.authorId) {
        const owner = filter.landlordId || filter.authorId;
        list = list.filter((item) => item.landlordId === owner || item.authorId === owner);
      }
      if (filter.maxRent !== undefined) {
        list = list.filter((item) => item.rentPerYear <= Number(filter.maxRent));
      }
      if (filter.search) {
        const q = String(filter.search).toLowerCase();
        list = list.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            (item.campusZone || '').toLowerCase().includes(q) ||
            (item.content || '').toLowerCase().includes(q),
        );
      }
      return list;
    }
    findListingById(id) {
      const item = sandboxState.listings.find((x) => x.id === Number(id));
      return item ? { ...item } : null;
    }
    createListing(data) {
      const nextId =
        sandboxState.listings.reduce((max, item) => Math.max(max, item.id), 0) + 1;
      const ownerId = data.landlordId || data.authorId || 'u-landlord-2';
      const listing = {
        id: nextId,
        title: data.title,
        campusZone: data.campusZone || 'North Gate',
        rentPerYear: data.rentPerYear !== undefined ? Number(data.rentPerYear) : 200,
        roomsAvailable: data.roomsAvailable !== undefined ? Number(data.roomsAvailable) : 3,
        amenities: data.amenities || ['solar-inverter', 'borehole-water'],
        verified: data.verified !== undefined ? Boolean(data.verified) : true,
        published: data.published !== undefined ? Boolean(data.published) : true,
        landlordId: ownerId,
        authorId: ownerId,
        content: data.content || 'Student hostel listing on Kampus.',
        createdAt: new Date().toISOString(),
      };
      sandboxState.listings.push(listing);
      return { ...listing };
    }
    updateListing(id, patch) {
      const idx = sandboxState.listings.findIndex((x) => x.id === Number(id));
      if (idx === -1) return null;
      sandboxState.listings[idx] = { ...sandboxState.listings[idx], ...patch };
      return { ...sandboxState.listings[idx] };
    }
    deleteListing(id) {
      const idx = sandboxState.listings.findIndex((x) => x.id === Number(id));
      if (idx === -1) return false;
      sandboxState.listings.splice(idx, 1);
      return true;
    }

    // Aliases for post* methods
    findPosts(filter = {}) {
      return this.findListings(filter);
    }
    findPostById(id) {
      return this.findListingById(id);
    }
    createPost(data) {
      return this.createListing(data);
    }
    updatePost(id, patch) {
      return this.updateListing(id, patch);
    }
    deletePost(id) {
      return this.deleteListing(id);
    }

    /**
     * Atomic transaction helper: snapshots Kampus DB state before running `work(this)`.
     * If `work` throws, all mutations to users/listings/bookings/escrowWallets are rolled back!
     */
    async transaction(work) {
      const snapshot = JSON.stringify({
        users: sandboxState.users,
        listings: sandboxState.listings,
        bookings: sandboxState.bookings,
        escrowWallets: sandboxState.escrowWallets,
        auditLogs: sandboxState.auditLogs,
      });
      try {
        return await work(this);
      } catch (err) {
        const restored = JSON.parse(snapshot);
        sandboxState.users = restored.users;
        sandboxState.listings = restored.listings;
        sandboxState.bookings = restored.bookings;
        sandboxState.escrowWallets = restored.escrowWallets;
        sandboxState.auditLogs = restored.auditLogs;
        logToConsole('WARN', 'Transaction', `Rolled back Kampus Escrow DB changes: ${err.message}`);
        throw err;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 6b. In-Memory Prisma ORM Engine (`PrismaClient` / `PrismaService`)
  // ---------------------------------------------------------------------------
  class PrismaClientKnownRequestError extends Error {
    constructor(message, { code, clientVersion = '6.0.0', meta = {} } = {}) {
      super(message);
      this.name = 'PrismaClientKnownRequestError';
      this.code = code || 'P2000';
      this.clientVersion = clientVersion;
      this.meta = meta;
    }
  }

  function matchPrismaWhere(record, where) {
    if (!where || typeof where !== 'object') return true;
    for (const [key, cond] of Object.entries(where)) {
      if (cond === undefined) continue;
      if (key === 'AND') {
        const list = Array.isArray(cond) ? cond : [cond];
        if (!list.every((c) => matchPrismaWhere(record, c))) return false;
        continue;
      }
      if (key === 'OR') {
        const list = Array.isArray(cond) ? cond : [cond];
        if (!list.some((c) => matchPrismaWhere(record, c))) return false;
        continue;
      }
      if (key === 'NOT') {
        const list = Array.isArray(cond) ? cond : [cond];
        if (list.some((c) => matchPrismaWhere(record, c))) return false;
        continue;
      }

      // Relational filter on user.listings or listing.bookings
      if (key === 'listings' && cond && typeof cond === 'object') {
        const userListings = sandboxState.listings.filter((l) => l.landlordId === record.id);
        if (cond.some && !userListings.some((l) => matchPrismaWhere(l, cond.some))) return false;
        if (cond.every && !userListings.every((l) => matchPrismaWhere(l, cond.every))) return false;
        if (cond.none && userListings.some((l) => matchPrismaWhere(l, cond.none))) return false;
        continue;
      }
      if (key === 'bookings' && cond && typeof cond === 'object') {
        const relBookings = sandboxState.bookings.filter(
          (b) => b.listingId === record.id || b.studentId === record.id,
        );
        if (cond.some && !relBookings.some((b) => matchPrismaWhere(b, cond.some))) return false;
        if (cond.every && !relBookings.every((b) => matchPrismaWhere(b, cond.every))) return false;
        if (cond.none && relBookings.some((b) => matchPrismaWhere(b, cond.none))) return false;
        continue;
      }

      const val = record[key];
      if (cond !== null && typeof cond === 'object' && !Array.isArray(cond)) {
        const insensitive = cond.mode === 'insensitive';
        const norm = (v) => (insensitive && typeof v === 'string' ? v.toLowerCase() : v);
        if ('equals' in cond && norm(val) !== norm(cond.equals)) return false;
        if ('not' in cond && norm(val) === norm(cond.not)) return false;
        if ('in' in cond && Array.isArray(cond.in) && !cond.in.map(norm).includes(norm(val)))
          return false;
        if ('notIn' in cond && Array.isArray(cond.notIn) && cond.notIn.map(norm).includes(norm(val)))
          return false;
        if ('lt' in cond && !(Number(val) < Number(cond.lt))) return false;
        if ('lte' in cond && !(Number(val) <= Number(cond.lte))) return false;
        if ('gt' in cond && !(Number(val) > Number(cond.gt))) return false;
        if ('gte' in cond && !(Number(val) >= Number(cond.gte))) return false;
        if ('contains' in cond) {
          const hay = insensitive ? String(val || '').toLowerCase() : String(val || '');
          const needle = insensitive ? String(cond.contains).toLowerCase() : String(cond.contains);
          if (!hay.includes(needle)) return false;
        }
        if ('startsWith' in cond) {
          const hay = insensitive ? String(val || '').toLowerCase() : String(val || '');
          const needle = insensitive
            ? String(cond.startsWith).toLowerCase()
            : String(cond.startsWith);
          if (!hay.startsWith(needle)) return false;
        }
        if ('endsWith' in cond) {
          const hay = insensitive ? String(val || '').toLowerCase() : String(val || '');
          const needle = insensitive ? String(cond.endsWith).toLowerCase() : String(cond.endsWith);
          if (!hay.endsWith(needle)) return false;
        }
      } else {
        if (
          typeof val === 'string' &&
          typeof cond === 'string' &&
          key === 'email'
        ) {
          if (val.toLowerCase() !== cond.toLowerCase()) return false;
        } else if (val !== cond) {
          return false;
        }
      }
    }
    return true;
  }

  function applyPrismaOrderBy(items, orderBy) {
    if (!orderBy) return items;
    const rules = Array.isArray(orderBy) ? orderBy : [orderBy];
    return [...items].sort((a, b) => {
      for (const rule of rules) {
        for (const [field, dir] of Object.entries(rule || {})) {
          const av = a[field];
          const bv = b[field];
          if (av === bv) continue;
          const cmp = av < bv ? -1 : 1;
          return String(dir).toLowerCase() === 'desc' ? -cmp : cmp;
        }
      }
      return 0;
    });
  }

  function shapePrismaRecord(modelName, rawRecord, args = {}) {
    if (!rawRecord) return null;
    const rec = { ...rawRecord };

    // Helper to resolve relations for a record
    const resolveRelation = (relKey, relSpec) => {
      if (!relSpec) return undefined;
      const subArgs = typeof relSpec === 'object' ? relSpec : {};
      if (modelName === 'user') {
        if (relKey === 'listings') {
          let list = sandboxState.listings.filter((l) => l.landlordId === rec.id);
          if (subArgs.where) list = list.filter((l) => matchPrismaWhere(l, subArgs.where));
          return list.map((l) => shapePrismaRecord('listing', l, subArgs));
        }
        if (relKey === 'bookings') {
          let list = sandboxState.bookings.filter((b) => b.studentId === rec.id);
          if (subArgs.where) list = list.filter((b) => matchPrismaWhere(b, subArgs.where));
          return list.map((b) => shapePrismaRecord('booking', b, subArgs));
        }
        if (relKey === '_count') {
          return {
            listings: sandboxState.listings.filter((l) => l.landlordId === rec.id).length,
            bookings: sandboxState.bookings.filter((b) => b.studentId === rec.id).length,
          };
        }
      }
      if (modelName === 'listing') {
        if (relKey === 'landlord') {
          const u = sandboxState.users.find((x) => x.id === rec.landlordId);
          return u ? shapePrismaRecord('user', u, subArgs) : null;
        }
        if (relKey === 'bookings') {
          let list = sandboxState.bookings.filter((b) => b.listingId === rec.id);
          if (subArgs.where) list = list.filter((b) => matchPrismaWhere(b, subArgs.where));
          return list.map((b) => shapePrismaRecord('booking', b, subArgs));
        }
        if (relKey === '_count') {
          return {
            bookings: sandboxState.bookings.filter((b) => b.listingId === rec.id).length,
          };
        }
      }
      if (modelName === 'booking') {
        if (relKey === 'student') {
          const u = sandboxState.users.find((x) => x.id === rec.studentId);
          return u ? shapePrismaRecord('user', u, subArgs) : null;
        }
        if (relKey === 'listing') {
          const l = sandboxState.listings.find((x) => x.id === rec.listingId);
          return l ? shapePrismaRecord('listing', l, subArgs) : null;
        }
      }
      return undefined;
    };

    if (args.select && typeof args.select === 'object') {
      const projected = {};
      for (const [k, v] of Object.entries(args.select)) {
        if (!v) continue;
        const relVal = resolveRelation(k, v);
        if (relVal !== undefined) {
          projected[k] = relVal;
        } else if (k in rec) {
          projected[k] = rec[k];
        }
      }
      return projected;
    }

    if (args.include && typeof args.include === 'object') {
      for (const [k, v] of Object.entries(args.include)) {
        if (!v) continue;
        const relVal = resolveRelation(k, v);
        if (relVal !== undefined) {
          rec[k] = relVal;
        }
      }
    }

    return rec;
  }

  function applyPrismaUpdatePatch(target, data) {
    const updated = { ...target };
    for (const [k, v] of Object.entries(data || {})) {
      if (v === undefined) continue;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        if ('increment' in v) updated[k] = Number(updated[k] || 0) + Number(v.increment);
        else if ('decrement' in v) updated[k] = Number(updated[k] || 0) - Number(v.decrement);
        else if ('multiply' in v) updated[k] = Number(updated[k] || 0) * Number(v.multiply);
        else if ('divide' in v) updated[k] = Number(updated[k] || 0) / Number(v.divide);
        else if ('set' in v) updated[k] = v.set;
        else if ('push' in v && Array.isArray(updated[k])) {
          updated[k] = [...updated[k], ...(Array.isArray(v.push) ? v.push : [v.push])];
        } else {
          updated[k] = v;
        }
      } else {
        updated[k] = v;
      }
    }
    return updated;
  }

  function paginatePrismaList(list, args = {}) {
    let result = [...list];
    if (args.cursor && typeof args.cursor === 'object') {
      const [cursorKey, cursorVal] = Object.entries(args.cursor)[0] || [];
      if (cursorKey !== undefined) {
        const idx = result.findIndex((item) => item[cursorKey] === cursorVal);
        if (idx !== -1) {
          result = result.slice(idx);
        }
      }
    }
    if (typeof args.skip === 'number' && args.skip > 0) {
      result = result.slice(args.skip);
    }
    if (typeof args.take === 'number') {
      result = result.slice(0, Math.max(0, args.take));
    }
    return result;
  }

  class PrismaClient {
    constructor() {
      const self = this;

      this.user = {
        async findMany(args = {}) {
          let list = sandboxState.users.filter((u) => matchPrismaWhere(u, args.where));
          list = applyPrismaOrderBy(list, args.orderBy);
          list = paginatePrismaList(list, args);
          return list.map((u) => shapePrismaRecord('user', u, args));
        },
        async findUnique(args = {}) {
          const found = sandboxState.users.find((u) => matchPrismaWhere(u, args.where));
          return found ? shapePrismaRecord('user', found, args) : null;
        },
        async findUniqueOrThrow(args = {}) {
          const found = await this.findUnique(args);
          if (!found) {
            throw new PrismaClientKnownRequestError('No User found', {
              code: 'P2025',
              meta: { cause: 'Record to query does not exist.' },
            });
          }
          return found;
        },
        async findFirst(args = {}) {
          const list = await this.findMany({ ...args, take: 1 });
          return list[0] || null;
        },
        async count(args = {}) {
          return sandboxState.users.filter((u) => matchPrismaWhere(u, args.where)).length;
        },
        async create(args = {}) {
          const data = args.data || {};
          if (!data.email) {
            throw new BadRequestException('Prisma user.create requires data.email');
          }
          const exists = sandboxState.users.some(
            (u) => u.email.toLowerCase() === String(data.email).toLowerCase(),
          );
          if (exists) {
            throw new PrismaClientKnownRequestError(
              `Unique constraint failed on the fields: (\`email\`)`,
              { code: 'P2002', meta: { target: ['email'] } },
            );
          }
          const newUser = {
            id: data.id || `u-${Date.now().toString(36)}`,
            email: String(data.email).toLowerCase(),
            name: data.name || 'New Kampus Student',
            role: data.role || 'student',
            tier: data.tier || 'basic',
            passwordHash: data.passwordHash || '$2b$10$hashed',
            refreshTokenHash: data.refreshTokenHash || null,
            createdAt: new Date().toISOString(),
          };
          sandboxState.users.push(newUser);
          sandboxState.escrowWallets[newUser.id] =
            data.escrowBalance !== undefined ? Number(data.escrowBalance) : 400;

          // Nested listings.create support
          if (data.listings && data.listings.create) {
            const toCreate = Array.isArray(data.listings.create)
              ? data.listings.create
              : [data.listings.create];
            for (const item of toCreate) {
              await self.listing.create({
                data: { ...item, landlordId: newUser.id },
              });
            }
          }
          return shapePrismaRecord('user', newUser, args);
        },
        async update(args = {}) {
          const idx = sandboxState.users.findIndex((u) => matchPrismaWhere(u, args.where));
          if (idx === -1) {
            throw new PrismaClientKnownRequestError('Record to update not found.', {
              code: 'P2025',
              meta: { cause: 'Record to update not found.' },
            });
          }
          const data = args.data || {};
          if (
            data.email &&
            sandboxState.users.some(
              (u, i) => i !== idx && u.email.toLowerCase() === String(data.email).toLowerCase(),
            )
          ) {
            throw new PrismaClientKnownRequestError(
              `Unique constraint failed on the fields: (\`email\`)`,
              { code: 'P2002', meta: { target: ['email'] } },
            );
          }
          sandboxState.users[idx] = applyPrismaUpdatePatch(sandboxState.users[idx], data);
          return shapePrismaRecord('user', sandboxState.users[idx], args);
        },
        async upsert(args = {}) {
          const existing = sandboxState.users.find((u) => matchPrismaWhere(u, args.where));
          if (existing) {
            return this.update({
              where: args.where,
              data: args.update || {},
              select: args.select,
              include: args.include,
            });
          }
          return this.create({
            data: args.create || {},
            select: args.select,
            include: args.include,
          });
        },
        async delete(args = {}) {
          const idx = sandboxState.users.findIndex((u) => matchPrismaWhere(u, args.where));
          if (idx === -1) {
            throw new PrismaClientKnownRequestError('Record to delete does not exist.', {
              code: 'P2025',
              meta: { cause: 'Record to delete does not exist.' },
            });
          }
          const [removed] = sandboxState.users.splice(idx, 1);
          return shapePrismaRecord('user', removed, args);
        },
      };

      this.listing = {
        async findMany(args = {}) {
          let list = sandboxState.listings.filter((l) => matchPrismaWhere(l, args.where));
          list = applyPrismaOrderBy(list, args.orderBy);
          list = paginatePrismaList(list, args);
          return list.map((l) => shapePrismaRecord('listing', l, args));
        },
        async findUnique(args = {}) {
          const found = sandboxState.listings.find((l) => matchPrismaWhere(l, args.where));
          return found ? shapePrismaRecord('listing', found, args) : null;
        },
        async findUniqueOrThrow(args = {}) {
          const found = await this.findUnique(args);
          if (!found) {
            throw new PrismaClientKnownRequestError('No Listing found', {
              code: 'P2025',
              meta: { cause: 'Record to query does not exist.' },
            });
          }
          return found;
        },
        async findFirst(args = {}) {
          const list = await this.findMany({ ...args, take: 1 });
          return list[0] || null;
        },
        async count(args = {}) {
          return sandboxState.listings.filter((l) => matchPrismaWhere(l, args.where)).length;
        },
        async aggregate(args = {}) {
          const list = sandboxState.listings.filter((l) => matchPrismaWhere(l, args.where));
          const out = {};
          if (args._count) out._count = args._count === true ? list.length : { _all: list.length };
          if (args._avg) {
            out._avg = {};
            for (const f of Object.keys(args._avg)) {
              out._avg[f] =
                list.length > 0
                  ? Math.round(
                      (list.reduce((s, x) => s + Number(x[f] || 0), 0) / list.length) * 100,
                    ) / 100
                  : null;
            }
          }
          if (args._min) {
            out._min = {};
            for (const f of Object.keys(args._min)) {
              out._min[f] = list.length > 0 ? Math.min(...list.map((x) => Number(x[f] || 0))) : null;
            }
          }
          if (args._max) {
            out._max = {};
            for (const f of Object.keys(args._max)) {
              out._max[f] = list.length > 0 ? Math.max(...list.map((x) => Number(x[f] || 0))) : null;
            }
          }
          if (args._sum) {
            out._sum = {};
            for (const f of Object.keys(args._sum)) {
              out._sum[f] = list.reduce((s, x) => s + Number(x[f] || 0), 0);
            }
          }
          return out;
        },
        async create(args = {}) {
          const data = args.data || {};
          const nextId =
            sandboxState.listings.reduce((max, item) => Math.max(max, item.id), 0) + 1;
          const ownerId =
            data.landlord?.connect?.id || data.landlordId || data.authorId || 'u-landlord-2';
          const created = {
            id: data.id || nextId,
            title: data.title || 'New Kampus Hostel',
            campusZone: data.campusZone || 'North Gate',
            rentPerYear: data.rentPerYear !== undefined ? Number(data.rentPerYear) : 200,
            roomsAvailable: data.roomsAvailable !== undefined ? Number(data.roomsAvailable) : 3,
            amenities: data.amenities || ['solar-inverter', 'borehole-water'],
            verified: data.verified !== undefined ? Boolean(data.verified) : true,
            published: data.published !== undefined ? Boolean(data.published) : true,
            landlordId: ownerId,
            authorId: ownerId,
            content: data.content || 'Student hostel listing on Kampus.',
            createdAt: new Date().toISOString(),
          };
          sandboxState.listings.push(created);
          return shapePrismaRecord('listing', created, args);
        },
        async update(args = {}) {
          const idx = sandboxState.listings.findIndex((l) => matchPrismaWhere(l, args.where));
          if (idx === -1) {
            throw new PrismaClientKnownRequestError('Record to update not found.', {
              code: 'P2025',
              meta: { cause: 'Record to update not found.' },
            });
          }
          sandboxState.listings[idx] = applyPrismaUpdatePatch(
            sandboxState.listings[idx],
            args.data || {},
          );
          return shapePrismaRecord('listing', sandboxState.listings[idx], args);
        },
        async upsert(args = {}) {
          const existing = sandboxState.listings.find((l) => matchPrismaWhere(l, args.where));
          if (existing) {
            return this.update({
              where: args.where,
              data: args.update || {},
              select: args.select,
              include: args.include,
            });
          }
          return this.create({
            data: args.create || {},
            select: args.select,
            include: args.include,
          });
        },
        async delete(args = {}) {
          const idx = sandboxState.listings.findIndex((l) => matchPrismaWhere(l, args.where));
          if (idx === -1) {
            throw new PrismaClientKnownRequestError('Record to delete does not exist.', {
              code: 'P2025',
              meta: { cause: 'Record to delete does not exist.' },
            });
          }
          const [removed] = sandboxState.listings.splice(idx, 1);
          return shapePrismaRecord('listing', removed, args);
        },
      };

      this.booking = {
        async findMany(args = {}) {
          let list = sandboxState.bookings.filter((b) => matchPrismaWhere(b, args.where));
          list = applyPrismaOrderBy(list, args.orderBy);
          list = paginatePrismaList(list, args);
          return list.map((b) => shapePrismaRecord('booking', b, args));
        },
        async findUnique(args = {}) {
          const found = sandboxState.bookings.find((b) => matchPrismaWhere(b, args.where));
          return found ? shapePrismaRecord('booking', found, args) : null;
        },
        async findFirst(args = {}) {
          const list = await this.findMany({ ...args, take: 1 });
          return list[0] || null;
        },
        async count(args = {}) {
          return sandboxState.bookings.filter((b) => matchPrismaWhere(b, args.where)).length;
        },
        async create(args = {}) {
          const data = args.data || {};
          if (
            data.idempotencyKey &&
            sandboxState.bookings.some((b) => b.idempotencyKey === data.idempotencyKey)
          ) {
            throw new PrismaClientKnownRequestError(
              `Unique constraint failed on the fields: (\`idempotencyKey\`)`,
              { code: 'P2002', meta: { target: ['idempotencyKey'] } },
            );
          }
          const created = {
            id: data.id || `bk-${sandboxState.bookings.length + 101}`,
            studentId: data.student?.connect?.id || data.studentId || 'u-student-3',
            listingId: Number(data.listing?.connect?.id ?? data.listingId ?? 1),
            amount: Number(data.amount ?? 180),
            status: data.status || 'held-in-escrow',
            idempotencyKey: data.idempotencyKey || `idem-${Date.now()}`,
            createdAt: new Date().toISOString(),
          };
          sandboxState.bookings.push(created);
          return shapePrismaRecord('booking', created, args);
        },
        async update(args = {}) {
          const idx = sandboxState.bookings.findIndex((b) => matchPrismaWhere(b, args.where));
          if (idx === -1) {
            throw new PrismaClientKnownRequestError('Record to update not found.', {
              code: 'P2025',
              meta: { cause: 'Record to update not found.' },
            });
          }
          sandboxState.bookings[idx] = applyPrismaUpdatePatch(
            sandboxState.bookings[idx],
            args.data || {},
          );
          return shapePrismaRecord('booking', sandboxState.bookings[idx], args);
        },
        async upsert(args = {}) {
          const existing = sandboxState.bookings.find((b) => matchPrismaWhere(b, args.where));
          if (existing) {
            return this.update({
              where: args.where,
              data: args.update || {},
              select: args.select,
              include: args.include,
            });
          }
          return this.create({
            data: args.create || {},
            select: args.select,
            include: args.include,
          });
        },
      };
    }

    async $connect() {
      return true;
    }

    async $disconnect() {
      return true;
    }

    async $transaction(arg) {
      const snapshot = JSON.stringify({
        users: sandboxState.users,
        listings: sandboxState.listings,
        bookings: sandboxState.bookings,
        escrowWallets: sandboxState.escrowWallets,
        auditLogs: sandboxState.auditLogs,
      });
      try {
        if (typeof arg === 'function') {
          return await arg(this);
        }
        if (Array.isArray(arg)) {
          return await Promise.all(arg);
        }
        return null;
      } catch (err) {
        const restored = JSON.parse(snapshot);
        sandboxState.users = restored.users;
        sandboxState.listings = restored.listings;
        sandboxState.bookings = restored.bookings;
        sandboxState.escrowWallets = restored.escrowWallets;
        sandboxState.auditLogs = restored.auditLogs;
        logToConsole('WARN', 'Prisma.$transaction', `Rolled back Prisma transaction: ${err.message}`);
        throw err;
      }
    }
  }

  class PrismaService extends PrismaClient {}

  const PrismaNamespace = {
    PrismaClientKnownRequestError,
    SortOrder: { asc: 'asc', desc: 'desc' },
    QueryMode: { default: 'default', insensitive: 'insensitive' },
  };

  // ---------------------------------------------------------------------------
  // 6c. In-Memory Mongoose ODM Engine (`@nestjs/mongoose` + `mongoose`)
  // ---------------------------------------------------------------------------
  class MongoServerError extends Error {
    constructor(message, { code = 11000, keyPattern = {}, keyValue = {} } = {}) {
      super(message);
      this.name = 'MongoServerError';
      this.code = code;
      this.keyPattern = keyPattern;
      this.keyValue = keyValue;
    }
  }

  class CastError extends Error {
    constructor(type, value, path) {
      super(`Cast to ${type} failed for value "${value}" at path "${path}"`);
      this.name = 'CastError';
      this.kind = type;
      this.value = value;
      this.path = path;
    }
  }

  function Schema(options = {}) {
    return function (target) {
      Reflect.defineMetadata('mongoose:schema', options, target);
    };
  }

  function Prop(options = {}) {
    return function (target, propertyKey) {
      const props = Reflect.getMetadata('mongoose:props', target.constructor) || {};
      props[propertyKey] = options;
      Reflect.defineMetadata('mongoose:props', props, target.constructor);
    };
  }

  const SchemaFactory = {
    createForClass(target) {
      return {
        target,
        indexes: [],
        index(fields, options) {
          this.indexes.push({ fields, options });
          return this;
        },
        pre() {
          return this;
        },
        post() {
          return this;
        },
        virtual() {
          return { get: () => {} };
        },
      };
    },
  };

  function getModelToken(nameOrClass) {
    const raw =
      typeof nameOrClass === 'function' ? nameOrClass.name : String(nameOrClass || 'Model');
    return raw.endsWith('Model') ? raw : `${raw}Model`;
  }

  function InjectModel(nameOrClass) {
    return Inject(getModelToken(nameOrClass));
  }

  function InjectConnection() {
    return Inject('DatabaseConnection');
  }

  const MongooseModule = {
    forRoot: () => class MongooseRootModule {},
    forRootAsync: () => class MongooseRootAsyncModule {},
    forFeature: () => class MongooseFeatureModule {},
  };

  function matchMongoCondition(fieldVal, cond, fullCompareObj) {
    if (cond === undefined) return true;
    if (cond === null || typeof cond !== 'object' || cond instanceof RegExp) {
      if (cond instanceof RegExp) {
        return cond.test(String(fieldVal ?? ''));
      }
      if (Array.isArray(fieldVal)) {
        return fieldVal.includes(cond);
      }
      if (
        (typeof fieldVal === 'number' || typeof cond === 'number') &&
        String(fieldVal) === String(cond)
      ) {
        return true;
      }
      return fieldVal === cond;
    }

    for (const [op, opVal] of Object.entries(cond)) {
      if (op === '$options') continue;
      if (op === '$eq' && fieldVal !== opVal) return false;
      if (op === '$ne' && fieldVal === opVal) return false;
      if (op === '$gt' && !(Number(fieldVal) > Number(opVal))) return false;
      if (op === '$gte' && !(Number(fieldVal) >= Number(opVal))) return false;
      if (op === '$lt' && !(Number(fieldVal) < Number(opVal))) return false;
      if (op === '$lte' && !(Number(fieldVal) <= Number(opVal))) return false;
      if (op === '$in' && Array.isArray(opVal)) {
        if (Array.isArray(fieldVal)) {
          if (!fieldVal.some((x) => opVal.includes(x))) return false;
        } else if (!opVal.includes(fieldVal)) {
          return false;
        }
      }
      if (op === '$nin' && Array.isArray(opVal)) {
        if (Array.isArray(fieldVal)) {
          if (fieldVal.some((x) => opVal.includes(x))) return false;
        } else if (opVal.includes(fieldVal)) {
          return false;
        }
      }
      if (op === '$exists') {
        const exists = fieldVal !== undefined && fieldVal !== null;
        if (Boolean(opVal) !== exists) return false;
      }
      if (op === '$all' && Array.isArray(opVal)) {
        if (!Array.isArray(fieldVal) || !opVal.every((v) => fieldVal.includes(v))) return false;
      }
      if (op === '$size') {
        if (!Array.isArray(fieldVal) || fieldVal.length !== Number(opVal)) return false;
      }
      if (op === '$regex') {
        const flags = cond.$options || 'i';
        const rx = opVal instanceof RegExp ? opVal : new RegExp(String(opVal), flags);
        if (!rx.test(String(fieldVal ?? ''))) return false;
      }
    }
    return true;
  }

  function matchMongoFilter(doc, filter) {
    if (!filter || typeof filter !== 'object' || Object.keys(filter).length === 0) return true;
    for (const [key, cond] of Object.entries(filter)) {
      if (key === '$and' && Array.isArray(cond)) {
        if (!cond.every((sub) => matchMongoFilter(doc, sub))) return false;
        continue;
      }
      if (key === '$or' && Array.isArray(cond)) {
        if (!cond.some((sub) => matchMongoFilter(doc, sub))) return false;
        continue;
      }
      if (key === '$nor' && Array.isArray(cond)) {
        if (cond.some((sub) => matchMongoFilter(doc, sub))) return false;
        continue;
      }
      const actualKey = key === '_id' && doc._id === undefined ? 'id' : key;
      const val = doc[actualKey];
      if (!matchMongoCondition(val, cond, doc)) return false;
    }
    return true;
  }

  function applyMongoProjection(doc, selectSpec) {
    if (!selectSpec) return doc;
    const out = { ...doc };
    if (typeof selectSpec === 'string') {
      const tokens = selectSpec.trim().split(/\s+/).filter(Boolean);
      const inclusions = tokens.filter((t) => !t.startsWith('-')).map((t) => t.replace(/^\+/, ''));
      const exclusions = tokens.filter((t) => t.startsWith('-')).map((t) => t.slice(1));

      if (inclusions.length > 0 && !tokens.some((t) => t.startsWith('+'))) {
        const projected = { _id: doc._id ?? doc.id, id: doc.id ?? doc._id };
        for (const f of inclusions) {
          if (f in out) projected[f] = out[f];
        }
        if (exclusions.includes('_id')) delete projected._id;
        return projected;
      }
      for (const ex of exclusions) {
        delete out[ex];
      }
      return out;
    }
    if (typeof selectSpec === 'object') {
      const entries = Object.entries(selectSpec);
      const hasInclusion = entries.some(([k, v]) => k !== '_id' && Boolean(v));
      if (hasInclusion) {
        const projected = { _id: doc._id ?? doc.id, id: doc.id ?? doc._id };
        for (const [k, v] of entries) {
          if (v && k in out) projected[k] = out[k];
        }
        if (selectSpec._id === 0 || selectSpec._id === false) delete projected._id;
        return projected;
      }
      for (const [k, v] of entries) {
        if (!v) delete out[k];
      }
    }
    return out;
  }

  function applyMongoPopulate(modelName, doc, populateSpecs) {
    if (!Array.isArray(populateSpecs) || populateSpecs.length === 0) return doc;
    const out = { ...doc };
    for (const spec of populateSpecs) {
      const path = typeof spec === 'string' ? spec : spec.path;
      const select = typeof spec === 'object' ? spec.select : undefined;
      if (modelName === 'listing' && path === 'landlord') {
        const landlord = sandboxState.users.find((u) => u.id === doc.landlordId);
        out.landlord = landlord
          ? applyMongoProjection({ _id: landlord.id, ...landlord }, select)
          : null;
      } else if (modelName === 'user' && path === 'listings') {
        const listings = sandboxState.listings
          .filter((l) => l.landlordId === doc.id)
          .map((l) => applyMongoProjection({ _id: l.id, ...l }, select));
        out.listings = listings;
      } else if (modelName === 'booking' && path === 'student') {
        const student = sandboxState.users.find((u) => u.id === doc.studentId);
        out.student = student
          ? applyMongoProjection({ _id: student.id, ...student }, select)
          : null;
      } else if (modelName === 'booking' && path === 'listing') {
        const listing = sandboxState.listings.find((l) => l.id === Number(doc.listingId));
        out.listing = listing
          ? applyMongoProjection({ _id: listing.id, ...listing }, select)
          : null;
      }
    }
    return out;
  }

  function applyMongoSort(list, sortSpec) {
    if (!sortSpec) return [...list];
    const pairs = [];
    if (typeof sortSpec === 'string') {
      for (const tok of sortSpec.trim().split(/\s+/).filter(Boolean)) {
        if (tok.startsWith('-')) pairs.push([tok.slice(1), -1]);
        else pairs.push([tok.replace(/^\+/, ''), 1]);
      }
    } else if (typeof sortSpec === 'object') {
      for (const [k, v] of Object.entries(sortSpec)) {
        pairs.push([k, v === -1 || v === 'desc' || v === 'descending' ? -1 : 1]);
      }
    }
    return [...list].sort((a, b) => {
      for (const [field, dir] of pairs) {
        const k = field === '_id' && a._id === undefined ? 'id' : field;
        if (a[k] < b[k]) return -1 * dir;
        if (a[k] > b[k]) return 1 * dir;
      }
      return 0;
    });
  }

  function applyMongoUpdateOperators(targetDoc, updateSpec, isInsert = false) {
    if (!updateSpec || typeof updateSpec !== 'object') return targetDoc;
    const next = {
      ...targetDoc,
      amenities: Array.isArray(targetDoc.amenities) ? [...targetDoc.amenities] : undefined,
    };
    const hasDollarOp = Object.keys(updateSpec).some((k) => k.startsWith('$'));

    if (!hasDollarOp) {
      Object.assign(next, updateSpec);
      return next;
    }

    if (isInsert && updateSpec.$setOnInsert && typeof updateSpec.$setOnInsert === 'object') {
      Object.assign(next, updateSpec.$setOnInsert);
    }
    if (updateSpec.$set && typeof updateSpec.$set === 'object') {
      Object.assign(next, updateSpec.$set);
    }
    if (updateSpec.$unset && typeof updateSpec.$unset === 'object') {
      for (const k of Object.keys(updateSpec.$unset)) {
        delete next[k];
      }
    }
    if (updateSpec.$inc && typeof updateSpec.$inc === 'object') {
      for (const [k, delta] of Object.entries(updateSpec.$inc)) {
        next[k] = Number(next[k] || 0) + Number(delta);
      }
    }
    if (updateSpec.$min && typeof updateSpec.$min === 'object') {
      for (const [k, val] of Object.entries(updateSpec.$min)) {
        if (next[k] === undefined || val < next[k]) next[k] = val;
      }
    }
    if (updateSpec.$max && typeof updateSpec.$max === 'object') {
      for (const [k, val] of Object.entries(updateSpec.$max)) {
        if (next[k] === undefined || val > next[k]) next[k] = val;
      }
    }
    if (updateSpec.$push && typeof updateSpec.$push === 'object') {
      for (const [k, val] of Object.entries(updateSpec.$push)) {
        const arr = Array.isArray(next[k]) ? [...next[k]] : [];
        if (val && typeof val === 'object' && Array.isArray(val.$each)) {
          arr.push(...val.$each);
        } else {
          arr.push(val);
        }
        next[k] = arr;
      }
    }
    if (updateSpec.$addToSet && typeof updateSpec.$addToSet === 'object') {
      for (const [k, val] of Object.entries(updateSpec.$addToSet)) {
        const arr = Array.isArray(next[k]) ? [...next[k]] : [];
        const items = val && typeof val === 'object' && Array.isArray(val.$each) ? val.$each : [val];
        for (const item of items) {
          if (!arr.includes(item)) arr.push(item);
        }
        next[k] = arr;
      }
    }
    if (updateSpec.$pull && typeof updateSpec.$pull === 'object') {
      for (const [k, val] of Object.entries(updateSpec.$pull)) {
        const arr = Array.isArray(next[k]) ? next[k] : [];
        next[k] = arr.filter((item) => item !== val);
      }
    }
    return next;
  }

  class MongooseQuery {
    constructor(modelName, executorFn, initialProjection = null) {
      this._modelName = modelName;
      this._executorFn = executorFn;
      this._select = initialProjection;
      this._populates = [];
      this._sort = null;
      this._skip = 0;
      this._limit = null;
      this._lean = false;
    }

    select(proj) {
      this._select = proj;
      return this;
    }

    populate(pathOrSpec, selectStr) {
      if (typeof pathOrSpec === 'string') {
        this._populates.push({ path: pathOrSpec, select: selectStr });
      } else if (pathOrSpec && typeof pathOrSpec === 'object') {
        this._populates.push(pathOrSpec);
      }
      return this;
    }

    sort(sortSpec) {
      this._sort = sortSpec;
      return this;
    }

    skip(n) {
      this._skip = Number(n) || 0;
      return this;
    }

    limit(n) {
      this._limit = Number(n);
      return this;
    }

    lean() {
      this._lean = true;
      return this;
    }

    async exec() {
      return this._executorFn({
        select: this._select,
        populates: this._populates,
        sort: this._sort,
        skip: this._skip,
        limit: this._limit,
        lean: this._lean,
      });
    }

    then(onFulfilled, onRejected) {
      return this.exec().then(onFulfilled, onRejected);
    }

    catch(onRejected) {
      return this.exec().catch(onRejected);
    }
  }

  function createMongooseModel(modelName, getCollectionFn, createItemFn) {
    function formatDoc(raw, qOpts) {
      if (!raw) return null;
      let doc = { _id: raw.id, ...raw };
      doc = applyMongoPopulate(modelName, doc, qOpts.populates);
      doc = applyMongoProjection(doc, qOpts.select);
      return doc;
    }

    return {
      modelName,
      find(filter = {}, projection = null) {
        return new MongooseQuery(
          modelName,
          async (qOpts) => {
            const col = getCollectionFn();
            let list = col.filter((item) => matchMongoFilter(item, filter));
            list = applyMongoSort(list, qOpts.sort);
            if (qOpts.skip > 0) list = list.slice(qOpts.skip);
            if (qOpts.limit !== null && qOpts.limit !== undefined) {
              list = list.slice(0, qOpts.limit);
            }
            return list.map((item) => formatDoc(item, qOpts));
          },
          projection,
        );
      },

      findOne(filter = {}, projection = null) {
        return new MongooseQuery(
          modelName,
          async (qOpts) => {
            const col = getCollectionFn();
            let list = col.filter((item) => matchMongoFilter(item, filter));
            list = applyMongoSort(list, qOpts.sort);
            const found = list[0];
            return found ? formatDoc(found, qOpts) : null;
          },
          projection,
        );
      },

      findById(id, projection = null) {
        return this.findOne({ _id: id }, projection);
      },

      countDocuments(filter = {}) {
        return new MongooseQuery(modelName, async () => {
          const col = getCollectionFn();
          return col.filter((item) => matchMongoFilter(item, filter)).length;
        });
      },

      async exists(filter = {}) {
        const col = getCollectionFn();
        const found = col.find((item) => matchMongoFilter(item, filter));
        return found ? { _id: found.id } : null;
      },

      async create(docOrDocs) {
        if (Array.isArray(docOrDocs)) {
          const out = [];
          for (const d of docOrDocs) {
            out.push(await createItemFn(d));
          }
          return out;
        }
        return createItemFn(docOrDocs);
      },

      findOneAndUpdate(filter = {}, update = {}, options = {}) {
        return new MongooseQuery(modelName, async (qOpts) => {
          const col = getCollectionFn();
          const idx = col.findIndex((item) => matchMongoFilter(item, filter));
          if (idx === -1) {
            if (!options.upsert) return null;
            const seed = {};
            for (const [k, v] of Object.entries(filter)) {
              if (!k.startsWith('$') && (typeof v !== 'object' || v === null)) {
                seed[k === '_id' ? 'id' : k] = v;
              }
            }
            const merged = applyMongoUpdateOperators(seed, update, true);
            const created = await createItemFn(merged);
            return formatDoc(created, qOpts);
          }

          const beforeDoc = { ...col[idx] };
          const updatedDoc = applyMongoUpdateOperators(col[idx], update, false);
          col[idx] = updatedDoc;
          const returnAfter =
            options.new === true || options.returnDocument === 'after' || options.upsert === true;
          return formatDoc(returnAfter ? updatedDoc : beforeDoc, qOpts);
        });
      },

      findByIdAndUpdate(id, update = {}, options = {}) {
        return this.findOneAndUpdate({ _id: id }, update, options);
      },

      findOneAndDelete(filter = {}) {
        return new MongooseQuery(modelName, async (qOpts) => {
          const col = getCollectionFn();
          const idx = col.findIndex((item) => matchMongoFilter(item, filter));
          if (idx === -1) return null;
          const [deleted] = col.splice(idx, 1);
          return formatDoc(deleted, qOpts);
        });
      },

      findByIdAndDelete(id) {
        return this.findOneAndDelete({ _id: id });
      },

      async deleteMany(filter = {}) {
        const col = getCollectionFn();
        let deletedCount = 0;
        for (let i = col.length - 1; i >= 0; i--) {
          if (matchMongoFilter(col[i], filter)) {
            col.splice(i, 1);
            deletedCount++;
          }
        }
        return { acknowledged: true, deletedCount };
      },

      async aggregate(pipeline = []) {
        let docs = getCollectionFn().map((d) => ({ _id: d.id, ...d }));
        for (const stage of pipeline) {
          if (stage.$match) {
            docs = docs.filter((d) => matchMongoFilter(d, stage.$match));
          } else if (stage.$sort) {
            docs = applyMongoSort(docs, stage.$sort);
          } else if (stage.$skip) {
            docs = docs.slice(Number(stage.$skip));
          } else if (stage.$limit) {
            docs = docs.slice(0, Number(stage.$limit));
          } else if (stage.$group) {
            const grpSpec = stage.$group;
            const idExpr = grpSpec._id;
            const buckets = new Map();
            for (const d of docs) {
              const groupKey =
                typeof idExpr === 'string' && idExpr.startsWith('$')
                  ? d[idExpr.slice(1)]
                  : idExpr;
              const mapKey = JSON.stringify(groupKey);
              if (!buckets.has(mapKey)) {
                buckets.set(mapKey, { keyVal: groupKey, rows: [] });
              }
              buckets.get(mapKey).rows.push(d);
            }
            const grouped = [];
            for (const { keyVal, rows } of buckets.values()) {
              const outRow = { _id: keyVal };
              for (const [accField, accSpec] of Object.entries(grpSpec)) {
                if (accField === '_id') continue;
                if (accSpec && typeof accSpec === 'object') {
                  if ('$sum' in accSpec) {
                    const expr = accSpec.$sum;
                    outRow[accField] =
                      typeof expr === 'number'
                        ? rows.length * expr
                        : rows.reduce((s, r) => s + Number(r[String(expr).slice(1)] || 0), 0);
                  } else if ('$avg' in accSpec) {
                    const f = String(accSpec.$avg).slice(1);
                    outRow[accField] =
                      rows.length > 0
                        ? Math.round(
                            (rows.reduce((s, r) => s + Number(r[f] || 0), 0) / rows.length) * 100,
                          ) / 100
                        : null;
                  } else if ('$min' in accSpec) {
                    const f = String(accSpec.$min).slice(1);
                    outRow[accField] =
                      rows.length > 0 ? Math.min(...rows.map((r) => Number(r[f] || 0))) : null;
                  } else if ('$max' in accSpec) {
                    const f = String(accSpec.$max).slice(1);
                    outRow[accField] =
                      rows.length > 0 ? Math.max(...rows.map((r) => Number(r[f] || 0))) : null;
                  } else if ('$push' in accSpec) {
                    const f = String(accSpec.$push).slice(1);
                    outRow[accField] = rows.map((r) => r[f]);
                  }
                }
              }
              grouped.push(outRow);
            }
            docs = grouped;
          } else if (stage.$project) {
            docs = docs.map((d) => applyMongoProjection(d, stage.$project));
          }
        }
        return docs;
      },
    };
  }

  function createKampusMongooseModels() {
    const userModel = createMongooseModel(
      'user',
      () => sandboxState.users,
      async (data) => {
        const email = String(data.email || '').toLowerCase();
        if (sandboxState.users.some((u) => u.email.toLowerCase() === email)) {
          throw new MongoServerError(
            `E11000 duplicate key error collection: kampus.users index: email_1 dup key: { email: "${email}" }`,
            { code: 11000, keyPattern: { email: 1 }, keyValue: { email } },
          );
        }
        const user = {
          id: data.id || data._id || `u-${Date.now().toString(36)}`,
          email,
          name: data.name || 'New Kampus Student',
          role: data.role || 'student',
          tier: data.tier || 'basic',
          passwordHash: data.passwordHash || '$2b$10$hashed',
          refreshTokenHash: null,
          createdAt: new Date().toISOString(),
        };
        sandboxState.users.push(user);
        sandboxState.escrowWallets[user.id] =
          data.escrowBalance !== undefined ? Number(data.escrowBalance) : 400;
        return { _id: user.id, ...user };
      },
    );

    const listingModel = createMongooseModel(
      'listing',
      () => sandboxState.listings,
      async (data) => {
        const nextId =
          sandboxState.listings.reduce((max, item) => Math.max(max, item.id), 0) + 1;
        const ownerId = data.landlordId || data.authorId || 'u-landlord-2';
        const listing = {
          id: data.id || data._id || nextId,
          title: data.title || 'New Kampus Hostel',
          campusZone: data.campusZone || 'North Gate',
          rentPerYear: data.rentPerYear !== undefined ? Number(data.rentPerYear) : 180,
          roomsAvailable: data.roomsAvailable !== undefined ? Number(data.roomsAvailable) : 3,
          amenities: Array.isArray(data.amenities)
            ? [...data.amenities]
            : ['solar-inverter', 'borehole-water'],
          verified: data.verified !== undefined ? Boolean(data.verified) : true,
          published: data.published !== undefined ? Boolean(data.published) : true,
          landlordId: ownerId,
          authorId: ownerId,
          content: data.content || 'Verified student hostel on Kampus.',
          createdAt: new Date().toISOString(),
        };
        sandboxState.listings.push(listing);
        return { _id: listing.id, ...listing };
      },
    );

    const bookingModel = createMongooseModel(
      'booking',
      () => sandboxState.bookings,
      async (data) => {
        if (
          data.idempotencyKey &&
          sandboxState.bookings.some((b) => b.idempotencyKey === data.idempotencyKey)
        ) {
          throw new MongoServerError(
            `E11000 duplicate key error collection: kampus.bookings index: idempotencyKey_1 dup key`,
            {
              code: 11000,
              keyPattern: { idempotencyKey: 1 },
              keyValue: { idempotencyKey: data.idempotencyKey },
            },
          );
        }
        const booking = {
          id: data.id || data._id || `bk-${sandboxState.bookings.length + 101}`,
          studentId: data.studentId || 'u-student-3',
          userId: data.studentId || 'u-student-3',
          listingId: Number(data.listingId || 1),
          amount: Number(data.amount ?? 180),
          status: data.status || 'held-in-escrow',
          idempotencyKey: data.idempotencyKey || undefined,
          createdAt: new Date().toISOString(),
        };
        sandboxState.bookings.push(booking);
        return { _id: booking.id, ...booking };
      },
    );

    const connection = {
      async startSession() {
        return {
          async withTransaction(fn) {
            const snapshot = JSON.stringify({
              users: sandboxState.users,
              listings: sandboxState.listings,
              bookings: sandboxState.bookings,
              escrowWallets: sandboxState.escrowWallets,
              auditLogs: sandboxState.auditLogs,
            });
            try {
              return await fn();
            } catch (err) {
              const restored = JSON.parse(snapshot);
              sandboxState.users = restored.users;
              sandboxState.listings = restored.listings;
              sandboxState.bookings = restored.bookings;
              sandboxState.escrowWallets = restored.escrowWallets;
              sandboxState.auditLogs = restored.auditLogs;
              throw err;
            }
          },
          async endSession() {},
        };
      },
    };

    return { userModel, listingModel, bookingModel, connection };
  }

  class MongooseService {
    constructor() {
      const m = createKampusMongooseModels();
      this.userModel = m.userModel;
      this.listingModel = m.listingModel;
      this.bookingModel = m.bookingModel;
      this.connection = m.connection;
    }
  }

  class CacheManager {
    async get(key) {
      const entry = sandboxState.cache.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        sandboxState.cache.delete(key);
        return undefined;
      }
      return JSON.parse(JSON.stringify(entry.value));
    }
    async set(key, value, ttlMs = 30000) {
      sandboxState.cache.set(key, {
        value: JSON.parse(JSON.stringify(value)),
        ttlMs,
        expiresAt: Date.now() + ttlMs,
        cachedAt: new Date().toISOString(),
      });
    }
    async del(key) {
      sandboxState.cache.delete(key);
    }
    async reset() {
      sandboxState.cache.clear();
    }
  }

  class JwtService {
    sign(payload, options = {}) {
      const secret = options.secret || 'dev-access-secret';
      const nowSec = Math.floor(Date.now() / 1000);
      let expSec = nowSec + 900;
      if (typeof options.expiresIn === 'number') {
        expSec = nowSec + options.expiresIn;
      } else if (typeof options.expiresIn === 'string') {
        const m = /^(\d+)([smhd])$/.exec(options.expiresIn);
        if (m) {
          const n = Number(m[1]);
          const mult = { s: 1, m: 60, h: 3600, d: 86400 }[m[2]] || 60;
          expSec = nowSec + n * mult;
        }
      }
      const fullPayload = { ...payload, iat: nowSec, exp: expSec };
      const b64Header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const b64Payload = btoa(JSON.stringify(fullPayload));
      const sig = btoa(`${secret}:${b64Payload}`).replace(/=+$/, '');
      return `${b64Header}.${b64Payload}.${sig}`;
    }

    verify(token, options = {}) {
      const secret = options.secret || 'dev-access-secret';
      if (!token || typeof token !== 'string') {
        throw new UnauthorizedException('Malformed JWT');
      }
      if (PRESET_TOKENS[token]) {
        const preset = PRESET_TOKENS[token];
        if (preset.expired) {
          throw new UnauthorizedException('jwt expired');
        }
        if (options.secret && preset.secret && options.secret !== preset.secret) {
          throw new UnauthorizedException('invalid signature');
        }
        return { ...preset.payload };
      }

      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new UnauthorizedException('jwt malformed');
      }
      const [, b64Payload, sig] = parts;
      const expectedSig = btoa(`${secret}:${b64Payload}`).replace(/=+$/, '');
      if (sig !== expectedSig) {
        throw new UnauthorizedException('invalid signature');
      }
      let decoded;
      try {
        decoded = JSON.parse(atob(b64Payload));
      } catch {
        throw new UnauthorizedException('invalid token payload');
      }
      if (decoded.exp && Math.floor(Date.now() / 1000) > decoded.exp) {
        throw new UnauthorizedException('jwt expired');
      }
      return decoded;
    }
  }

  const studentPayload = {
    sub: 'u-student-3',
    id: 'u-student-3',
    email: 'ada@kampus.edu',
    name: 'Adaobi Okafor',
    role: 'student',
    tier: 'basic',
  };
  const landlordPayload = {
    sub: 'u-landlord-2',
    id: 'u-landlord-2',
    email: 'chidi@kampus.edu',
    name: 'Chidi Nwosu',
    role: 'landlord',
    tier: 'verified',
  };
  const adminPayload = {
    sub: 'u-admin-1',
    id: 'u-admin-1',
    email: 'admin@kampus.edu',
    name: 'Grace Bello',
    role: 'admin',
    tier: 'campus-admin',
  };

  const PRESET_TOKENS = {
    'demo-student-jwt': { secret: 'dev-access-secret', payload: studentPayload },
    'demo-user-jwt': { secret: 'dev-access-secret', payload: studentPayload },
    'demo-landlord-jwt': { secret: 'dev-access-secret', payload: landlordPayload },
    'demo-mod-jwt': { secret: 'dev-access-secret', payload: landlordPayload },
    'demo-admin-jwt': { secret: 'dev-access-secret', payload: adminPayload },
    'demo-expired-jwt': {
      secret: 'dev-access-secret',
      expired: true,
      payload: studentPayload,
    },
  };

  class EventEmitter2 {
    constructor() {
      this.listeners = new Map();
    }
    on(eventName, fn) {
      const list = this.listeners.get(eventName) || [];
      list.push(fn);
      this.listeners.set(eventName, list);
    }
    emit(eventName, payload) {
      const record = {
        id: Date.now() + '-' + Math.random().toString(36).slice(2, 5),
        eventName,
        payload: JSON.parse(JSON.stringify(payload ?? {})),
        timestamp: new Date().toISOString().split('T')[1].slice(0, 12),
      };
      sandboxState.eventsLog.push(record);
      const handlers = this.listeners.get(eventName) || [];
      for (const fn of handlers) {
        try {
          fn(payload);
        } catch (err) {
          logToConsole('ERROR', 'EventEmitter', `Listener error on ${eventName}: ${err.message}`);
        }
      }
      return handlers.length > 0;
    }
  }

  class ThrottlerStorageService {
    increment(key, ttlMs, limit) {
      const now = Date.now();
      let record = sandboxState.throttler.get(key);
      if (!record || now > record.expiresAt) {
        record = {
          key,
          hits: 0,
          limit,
          ttlMs,
          expiresAt: now + ttlMs,
        };
      }
      record.hits += 1;
      record.limit = limit;
      sandboxState.throttler.set(key, record);
      return {
        totalHits: record.hits,
        timeToExpireSec: Math.max(1, Math.ceil((record.expiresAt - now) / 1000)),
        isBlocked: record.hits > limit,
      };
    }
  }

  class ThrottlerGuard {
    constructor(reflector, storage) {
      this.reflector = reflector || new Reflector();
      this.storage = storage || new ThrottlerStorageService();
      this.defaultLimit = 5;
      this.defaultTtl = 60000;
    }
    canActivate(context) {
      const targets = [context.getHandler(), context.getClass()];
      const skip = this.reflector.getAllAndOverride(SKIP_THROTTLE_KEY, targets);
      if (skip) return true;

      const custom = this.reflector.getAllAndOverride(THROTTLE_KEY, targets);
      const limit = custom?.default?.limit ?? custom?.limit ?? this.defaultLimit;
      const ttl = custom?.default?.ttl ?? custom?.ttl ?? this.defaultTtl;

      const req = context.switchToHttp().getRequest();
      const res = context.switchToHttp().getResponse();
      const trackerKey = `${req.ip || '127.0.0.1'}:${context.getClass().name}.${context.getHandler().name}`;
      const stats = this.storage.increment(trackerKey, ttl, limit);

      res.setHeader('x-ratelimit-limit', String(limit));
      res.setHeader('x-ratelimit-remaining', String(Math.max(0, limit - stats.totalHits)));
      res.setHeader('x-ratelimit-reset', `${stats.timeToExpireSec}s`);

      if (stats.isBlocked) {
        res.setHeader('retry-after', String(stats.timeToExpireSec));
        throw new ThrottlerException(
          `ThrottlerException: Too Many Requests (${stats.totalHits}/${limit} in ${ttl / 1000}s window)`,
        );
      }
      return true;
    }
  }

  class CacheInterceptor {
    constructor(cache, reflector) {
      this.cache = cache || new CacheManager();
      this.reflector = reflector || new Reflector();
    }
    async intercept(context, next) {
      const req = context.switchToHttp().getRequest();
      const res = context.switchToHttp().getResponse();
      if (req.method !== 'GET') return next.handle();

      const targets = [context.getHandler(), context.getClass()];
      const customKey = this.reflector.getAllAndOverride(CACHE_KEY_METADATA, targets);
      const ttl = this.reflector.getAllAndOverride(CACHE_TTL_KEY, targets) ?? 30000;
      const key = customKey || `http:${req.method}:${req.originalUrl}`;

      const cached = await this.cache.get(key);
      if (cached !== undefined) {
        res.setHeader('x-cache', 'HIT');
        res.setHeader('x-cache-key', key);
        return of(cached);
      }

      res.setHeader('x-cache', 'MISS');
      res.setHeader('x-cache-key', key);
      return next.handle().pipe(
        tap((data) => {
          this.cache.set(key, data, ttl);
        }),
      );
    }
  }

  class ClassSerializerInterceptor {
    intercept(context, next) {
      return next.handle().pipe(
        map((data) => this.serialize(data)),
      );
    }
    serialize(value) {
      if (Array.isArray(value)) return value.map((v) => this.serialize(v));
      if (value && typeof value === 'object') {
        const excluded = new Set([
          ...(Reflect.getMetadata(META.EXCLUDE_PROPS, value.constructor) || []),
          ...(Array.isArray(value.__excluded) ? value.__excluded : []),
        ]);
        const copy = {};
        for (const [k, v] of Object.entries(value)) {
          if (k === '__excluded') continue;
          if (excluded.has(k)) continue;
          copy[k] = this.serialize(v);
        }
        return copy;
      }
      return value;
    }
  }

  const cryptoShim = {
    randomUUID: () =>
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
          }),
    createHash: () => ({
      _data: '',
      update(str) {
        this._data += String(str);
        return this;
      },
      digest() {
        let h1 = 0xdeadbeef ^ this._data.length;
        let h2 = 0x41c6ce57 ^ this._data.length;
        for (let i = 0; i < this._data.length; i++) {
          const ch = this._data.charCodeAt(i);
          h1 = Math.imul(h1 ^ ch, 2654435761);
          h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return (
          'sha256_' +
          (h2 >>> 0).toString(16).padStart(8, '0') +
          (h1 >>> 0).toString(16).padStart(8, '0')
        );
      },
    }),
    timingSafeEqual: (a, b) => {
      const strA = String(a);
      const strB = String(b);
      if (strA.length !== strB.length) return false;
      let diff = 0;
      for (let i = 0; i < strA.length; i++) {
        diff |= strA.charCodeAt(i) ^ strB.charCodeAt(i);
      }
      return diff === 0;
    },
  };

  const bcryptShim = {
    async hash(plain, rounds = 10) {
      const digest = cryptoShim.createHash().update(`salt_${rounds}:${plain}`).digest();
      return `$2b$${rounds}$${digest}`;
    },
    async compare(plain, hash) {
      if (!hash || typeof hash !== 'string') return false;
      if (hash === '$2b$10$demoHashForAdmin123!' && plain === 'Admin123!') return true;
      if (hash === '$2b$10$demoHashForMod123!' && plain === 'Landlord123!') return true;
      if (hash === '$2b$10$demoHashForUser123!' && (plain === 'Student123!' || plain === 'User1234!'))
        return true;
      const m = /^\$2b\$(\d+)\$/.exec(hash);
      const rounds = m ? Number(m[1]) : 10;
      const expected = await this.hash(plain, rounds);
      return expected === hash;
    },
  };

  // ---------------------------------------------------------------------------
  // 6B. @nestjs/testing, Jest Spies/Assertions & Supertest Runtime
  // ---------------------------------------------------------------------------
  const allCreatedMocks = [];

  function createJestMockFn(defaultImpl) {
    let impl = defaultImpl || (() => undefined);
    const onceQueue = [];
    const mockState = {
      calls: [],
      results: [],
      instances: [],
    };

    const spy = function (...args) {
      mockState.calls.push(args);
      spy.calls = mockState.calls;
      const activeFn = onceQueue.length > 0 ? onceQueue.shift() : impl;
      try {
        const val = activeFn.apply(this, args);
        mockState.results.push({ type: 'return', value: val });
        return val;
      } catch (err) {
        mockState.results.push({ type: 'throw', value: err });
        throw err;
      }
    };

    spy._isMockFunction = true;
    spy.mock = mockState;
    spy.calls = mockState.calls;

    spy.mockImplementation = (fn) => {
      impl = fn;
      return spy;
    };
    spy.mockImplementationOnce = (fn) => {
      onceQueue.push(fn);
      return spy;
    };
    spy.mockReturnValue = (val) => {
      impl = () => val;
      return spy;
    };
    spy.mockReturnValueOnce = (val) => {
      onceQueue.push(() => val);
      return spy;
    };
    spy.mockResolvedValue = (val) => {
      impl = () => Promise.resolve(val);
      return spy;
    };
    spy.mockResolvedValueOnce = (val) => {
      onceQueue.push(() => Promise.resolve(val));
      return spy;
    };
    spy.mockRejectedValue = (err) => {
      impl = () => Promise.reject(err);
      return spy;
    };
    spy.mockRejectedValueOnce = (err) => {
      onceQueue.push(() => Promise.reject(err));
      return spy;
    };
    spy.mockClear = () => {
      mockState.calls.length = 0;
      mockState.results.length = 0;
      mockState.instances.length = 0;
      return spy;
    };
    spy.mockReset = () => {
      spy.mockClear();
      onceQueue.length = 0;
      impl = () => undefined;
      return spy;
    };

    allCreatedMocks.push(spy);
    return spy;
  }

  const jestShim = {
    fn: (impl) => createJestMockFn(impl),
    spyOn: (obj, methodName) => {
      const original = obj && typeof obj[methodName] === 'function' ? obj[methodName].bind(obj) : () => undefined;
      const spy = createJestMockFn(original);
      spy.mockRestore = () => {
        if (obj) obj[methodName] = original;
      };
      if (obj) obj[methodName] = spy;
      return spy;
    },
    clearAllMocks: () => {
      for (const m of allCreatedMocks) m.mockClear();
    },
    resetAllMocks: () => {
      for (const m of allCreatedMocks) m.mockReset();
    },
  };

  function deepEqual(a, b) {
    if (a === b) return true;
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      if (typeof b._asymmetricMatch === 'function') return b._asymmetricMatch(a);
      if (typeof a._asymmetricMatch === 'function') return a._asymmetricMatch(b);
      if (Array.isArray(a) !== Array.isArray(b)) return false;
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      for (const k of keysA) {
        if (!deepEqual(a[k], b[k])) return false;
      }
      return true;
    }
    return false;
  }

  function partialMatchObject(actual, subset) {
    if (actual === subset) return true;
    if (!actual || !subset || typeof actual !== 'object' || typeof subset !== 'object') {
      return actual === subset;
    }
    if (typeof subset._asymmetricMatch === 'function') return subset._asymmetricMatch(actual);
    for (const [k, v] of Object.entries(subset)) {
      if (!partialMatchObject(actual[k], v)) return false;
    }
    return true;
  }

  function createExpectMatchers(actual, isNot = false) {
    const check = (cond, failMsg) => {
      const ok = isNot ? !cond : cond;
      if (!ok) {
        throw new BadRequestException(`AssertionFailed: ${failMsg}`);
      }
      return true;
    };

    const matchers = {
      toBe(expected) {
        return check(
          actual === expected,
          `Expected ${JSON.stringify(actual)} ${isNot ? 'not ' : ''}to be ${JSON.stringify(expected)}`,
        );
      },
      toEqual(expected) {
        return check(
          deepEqual(actual, expected),
          `Expected ${JSON.stringify(actual)} ${isNot ? 'not ' : ''}to equal ${JSON.stringify(expected)}`,
        );
      },
      toStrictEqual(expected) {
        return check(
          deepEqual(actual, expected),
          `Expected ${JSON.stringify(actual)} ${isNot ? 'not ' : ''}to strictly equal ${JSON.stringify(expected)}`,
        );
      },
      toMatchObject(subset) {
        return check(
          partialMatchObject(actual, subset),
          `Expected ${JSON.stringify(actual)} ${isNot ? 'not ' : ''}to match object ${JSON.stringify(subset)}`,
        );
      },
      toBeDefined() {
        return check(actual !== undefined, `Expected value ${isNot ? 'not ' : ''}to be defined`);
      },
      toBeUndefined() {
        return check(actual === undefined, `Expected value ${isNot ? 'not ' : ''}to be undefined`);
      },
      toBeNull() {
        return check(actual === null, `Expected ${JSON.stringify(actual)} ${isNot ? 'not ' : ''}to be null`);
      },
      toBeTruthy() {
        return check(Boolean(actual), `Expected ${JSON.stringify(actual)} ${isNot ? 'not ' : ''}to be truthy`);
      },
      toBeFalsy() {
        return check(!actual, `Expected ${JSON.stringify(actual)} ${isNot ? 'not ' : ''}to be falsy`);
      },
      toBeGreaterThan(n) {
        return check(Number(actual) > n, `Expected ${actual} to be > ${n}`);
      },
      toBeGreaterThanOrEqual(n) {
        return check(Number(actual) >= n, `Expected ${actual} to be >= ${n}`);
      },
      toBeLessThan(n) {
        return check(Number(actual) < n, `Expected ${actual} to be < ${n}`);
      },
      toContain(item) {
        const has = Array.isArray(actual)
          ? actual.some((el) => deepEqual(el, item))
          : String(actual).includes(String(item));
        return check(has, `Expected ${JSON.stringify(actual)} ${isNot ? 'not ' : ''}to contain ${JSON.stringify(item)}`);
      },
      toHaveLength(len) {
        return check(
          actual?.length === len,
          `Expected length ${len}, received ${actual?.length}`,
        );
      },
      toHaveProperty(propPath, expectedVal) {
        const parts = String(propPath).split('.');
        let cur = actual;
        let exists = true;
        for (const p of parts) {
          if (cur == null || !(p in Object(cur))) {
            exists = false;
            break;
          }
          cur = cur[p];
        }
        const matchesVal = expectedVal === undefined ? true : deepEqual(cur, expectedVal);
        return check(
          exists && matchesVal,
          `Expected object to have property "${propPath}"${expectedVal !== undefined ? ` = ${JSON.stringify(expectedVal)}` : ''}`,
        );
      },
      toHaveBeenCalled() {
        const calls = actual?.mock?.calls || actual?.calls || [];
        return check(
          calls.length > 0,
          `Expected mock function ${isNot ? 'not ' : ''}to have been called (calls: ${calls.length})`,
        );
      },
      toHaveBeenCalledTimes(expectedCount) {
        const calls = actual?.mock?.calls || actual?.calls || [];
        return check(
          calls.length === expectedCount,
          `Expected mock function to have been called ${expectedCount} times, but was called ${calls.length} times`,
        );
      },
      toHaveBeenCalledWith(...expectedArgs) {
        const calls = actual?.mock?.calls || actual?.calls || [];
        const matched = calls.some(
          (callArgs) =>
            callArgs.length === expectedArgs.length &&
            expectedArgs.every((expArg, idx) =>
              partialMatchObject(callArgs[idx], expArg) || deepEqual(callArgs[idx], expArg),
            ),
        );
        return check(
          matched,
          `Expected mock function ${isNot ? 'not ' : ''}to have been called with ${JSON.stringify(expectedArgs)}. Actual calls: ${JSON.stringify(calls)}`,
        );
      },
      toThrow(expectedErr) {
        let threw = false;
        let caught = null;
        try {
          if (typeof actual === 'function') actual();
        } catch (err) {
          threw = true;
          caught = err;
        }
        if (isNot) {
          return check(!threw, `Expected function not to throw, but it threw ${caught?.message || caught}`);
        }
        if (!threw) {
          throw new BadRequestException('AssertionFailed: Expected function to throw an exception, but it did not throw');
        }
        if (expectedErr) {
          if (typeof expectedErr === 'function' && !(caught instanceof expectedErr) && caught?.name !== expectedErr.name) {
            throw new BadRequestException(
              `AssertionFailed: Expected function to throw ${expectedErr.name}, but threw ${caught?.constructor?.name || caught?.message}`,
            );
          }
          if (typeof expectedErr === 'string' && !String(caught?.message || caught).includes(expectedErr)) {
            throw new BadRequestException(
              `AssertionFailed: Expected error message to include "${expectedErr}", got "${caught?.message || caught}"`,
            );
          }
        }
        return true;
      },
    };

    if (!isNot) {
      matchers.not = createExpectMatchers(actual, true);
      matchers.resolves = {
        async toBe(expected) {
          const val = await actual;
          return createExpectMatchers(val).toBe(expected);
        },
        async toEqual(expected) {
          const val = await actual;
          return createExpectMatchers(val).toEqual(expected);
        },
        async toMatchObject(subset) {
          const val = await actual;
          return createExpectMatchers(val).toMatchObject(subset);
        },
        async toHaveProperty(prop, val) {
          const resolved = await actual;
          return createExpectMatchers(resolved).toHaveProperty(prop, val);
        },
      };
      matchers.rejects = {
        async toThrow(expectedErr) {
          let threw = false;
          let caught = null;
          try {
            await actual;
          } catch (err) {
            threw = true;
            caught = err;
          }
          if (!threw) {
            throw new BadRequestException(
              `AssertionFailed: Expected promise to reject${expectedErr ? ` with ${expectedErr.name || expectedErr}` : ''}, but it resolved successfully`,
            );
          }
          if (expectedErr) {
            if (
              typeof expectedErr === 'function' &&
              !(caught instanceof expectedErr) &&
              caught?.name !== expectedErr.name
            ) {
              throw new BadRequestException(
                `AssertionFailed: Expected promise to reject with ${expectedErr.name}, but rejected with ${caught?.constructor?.name || caught?.name || caught?.message}`,
              );
            }
            if (
              typeof expectedErr === 'string' &&
              !String(caught?.message || JSON.stringify(caught)).includes(expectedErr)
            ) {
              throw new BadRequestException(
                `AssertionFailed: Expected rejection message to include "${expectedErr}", got "${caught?.message || caught}"`,
              );
            }
          }
          return true;
        },
        async toBeInstanceOf(ErrCls) {
          return this.toThrow(ErrCls);
        },
      };
    }

    return matchers;
  }

  const expectShim = Object.assign(
    (actual) => createExpectMatchers(actual, false),
    {
      any: (Cls) => ({
        _asymmetricMatch: (val) => {
          if (Cls === Number) return typeof val === 'number';
          if (Cls === String) return typeof val === 'string';
          if (Cls === Boolean) return typeof val === 'boolean';
          if (Cls === Object) return val !== null && typeof val === 'object';
          if (Cls === Array) return Array.isArray(val);
          return val instanceof Cls;
        },
      }),
      objectContaining: (subset) => ({
        _asymmetricMatch: (val) => partialMatchObject(val, subset),
      }),
      stringContaining: (substr) => ({
        _asymmetricMatch: (val) => typeof val === 'string' && val.includes(substr),
      }),
    },
  );

  class TestingModule {
    constructor(meta, providerOverrides, guardOverrides, interceptorOverrides, pipeOverrides) {
      this.meta = meta || {};
      this.providerOverrides = providerOverrides || new Map();
      this.guardOverrides = guardOverrides || new Map();
      this.interceptorOverrides = interceptorOverrides || new Map();
      this.pipeOverrides = pipeOverrides || new Map();
      this.instances = new Map();
      this.customDefs = new Map();
      this.controllers = [];
      this.injectables = [];
      this._bootstrapMetadata();
    }

    _bootstrapMetadata() {
      const reflector = new Reflector();
      const dbService = new DatabaseService();
      const prismaService = new PrismaService();
      const mongooseService = new MongooseService();
      const cacheManager = new CacheManager();
      const jwtService = new JwtService();
      const eventEmitter = new EventEmitter2();
      const throttlerStorage = new ThrottlerStorageService();

      const defaults = [
        [Reflector, reflector],
        ['Reflector', reflector],
        [DatabaseService, dbService],
        ['DatabaseService', dbService],
        [PrismaService, prismaService],
        ['PrismaService', prismaService],
        [PrismaClient, prismaService],
        ['PrismaClient', prismaService],
        [MongooseService, mongooseService],
        ['MongooseService', mongooseService],
        ['UserModel', mongooseService.userModel],
        ['ListingModel', mongooseService.listingModel],
        ['HostelModel', mongooseService.listingModel],
        ['BookingModel', mongooseService.bookingModel],
        ['DatabaseConnection', mongooseService.connection],
        [CacheManager, cacheManager],
        [CACHE_MANAGER, cacheManager],
        [JwtService, jwtService],
        ['JwtService', jwtService],
        [EventEmitter2, eventEmitter],
        ['EventEmitter2', eventEmitter],
        [ThrottlerStorageService, throttlerStorage],
      ];
      for (const [k, v] of defaults) {
        this.instances.set(k, v);
      }

      const registerModuleMeta = (mMeta) => {
        if (!mMeta) return;
        for (const imp of mMeta.imports || []) {
          if (typeof imp === 'function') {
            registerModuleMeta(Reflect.getOwnMetadata(META.MODULE, imp));
          } else if (imp && typeof imp === 'object') {
            registerModuleMeta(imp);
          }
        }
        for (const ctrl of mMeta.controllers || []) {
          if (!this.controllers.includes(ctrl)) this.controllers.push(ctrl);
        }
        for (const prov of mMeta.providers || []) {
          if (typeof prov === 'function') {
            if (!this.injectables.includes(prov)) this.injectables.push(prov);
          } else if (prov && typeof prov === 'object' && 'provide' in prov) {
            this.customDefs.set(prov.provide, prov);
            if (typeof prov.provide === 'function' && prov.provide.name) {
              this.customDefs.set(prov.provide.name, prov);
            }
          }
        }
      };

      registerModuleMeta(this.meta);

      // Apply explicit .overrideProvider() overrides
      for (const [token, def] of this.providerOverrides.entries()) {
        this.customDefs.set(token, def);
        this.instances.delete(token);
        if (typeof token === 'function' && token.name) {
          this.customDefs.set(token.name, def);
          this.instances.delete(token.name);
        }
      }
    }

    get(token) {
      return this._resolveToken(token);
    }

    async resolve(token) {
      return this._resolveToken(token);
    }

    _resolveToken(token) {
      if (!token) return undefined;
      if (this.customDefs.has(token)) {
        const def = this.customDefs.get(token);
        let resolved;
        if ('useValue' in def) resolved = def.useValue;
        else if (def.useFactory) {
          const deps = (def.inject || []).map((t) => this._resolveToken(t));
          resolved = def.useFactory(...deps);
        } else if (def.useClass) {
          resolved = this._instantiate(def.useClass);
        }
        this.instances.set(token, resolved);
        return resolved;
      }
      if (typeof token === 'function' && token.name && this.customDefs.has(token.name)) {
        const def = this.customDefs.get(token.name);
        const resolved = 'useValue' in def ? def.useValue : def.useClass ? this._instantiate(def.useClass) : undefined;
        this.instances.set(token, resolved);
        return resolved;
      }
      if (this.instances.has(token)) return this.instances.get(token);
      if (typeof token === 'function' && token.name && this.instances.has(token.name)) {
        return this.instances.get(token.name);
      }
      if (typeof token === 'function') {
        return this._instantiate(token);
      }
      return undefined;
    }

    _instantiate(Cls) {
      if (!Cls || typeof Cls !== 'function') return Cls;
      if (this.guardOverrides.has(Cls)) {
        const gDef = this.guardOverrides.get(Cls);
        return 'useValue' in gDef ? gDef.useValue : this._instantiate(gDef.useClass);
      }
      if (this.interceptorOverrides.has(Cls)) {
        const iDef = this.interceptorOverrides.get(Cls);
        return 'useValue' in iDef ? iDef.useValue : this._instantiate(iDef.useClass);
      }
      if (this.pipeOverrides.has(Cls)) {
        const pDef = this.pipeOverrides.get(Cls);
        return 'useValue' in pDef ? pDef.useValue : this._instantiate(pDef.useClass);
      }
      if (this.customDefs.has(Cls)) {
        return this._resolveToken(Cls);
      }
      if (this.instances.has(Cls)) return this.instances.get(Cls);

      const paramTypes = Reflect.getOwnMetadata('design:paramtypes', Cls) || [];
      const explicitTokens = Reflect.getOwnMetadata(META.INJECT_TOKENS, Cls) || {};
      const str = Cls.toString();
      const m = /constructor\s*\(([^)]*)\)/.exec(str);
      const paramNames = m
        ? m[1]
            .split(',')
            .map((s) => s.trim().replace(/:.*$/, '').replace(/=.*$/, '').trim())
            .filter(Boolean)
        : [];
      const maxLen = Math.max(
        paramTypes.length,
        paramNames.length,
        Cls.length,
        ...Object.keys(explicitTokens).map((k) => Number(k) + 1),
      );

      const args = [];
      for (let i = 0; i < maxLen; i++) {
        const token = explicitTokens[i] !== undefined ? explicitTokens[i] : paramTypes[i];
        let resolved = this._resolveToken(token);
        if (resolved === undefined) {
          const pName = (paramNames[i] || '').toLowerCase();
          if (pName.includes('prisma')) resolved = this._resolveToken(PrismaService);
          else if (pName.includes('db') || pName.includes('database'))
            resolved = this._resolveToken(DatabaseService);
          else if (pName.includes('jwt')) resolved = this._resolveToken(JwtService);
          else if (pName.includes('cache')) resolved = this._resolveToken(CACHE_MANAGER);
          else if (pName.includes('event')) resolved = this._resolveToken(EventEmitter2);
          else if (pName.includes('reflector')) resolved = this._resolveToken(Reflector);
          else {
            const stem = pName.replace(/service$/, '').trim();
            if (stem.length >= 3) {
              for (const inj of this.injectables) {
                if (inj !== Cls && inj.name.toLowerCase().includes(stem)) {
                  resolved = this._instantiate(inj);
                  break;
                }
              }
            }
          }
        }
        args.push(resolved);
      }

      const instance = new Cls(...args);
      this.instances.set(Cls, instance);
      if (Cls.name) this.instances.set(Cls.name, instance);
      return instance;
    }

    createNestApplication() {
      const testingModule = this;
      const appGlobalPipes = [];
      const appGlobalGuards = [];
      const appGlobalInterceptors = [];
      const appGlobalFilters = [];
      let isInitialized = false;
      let isClosed = false;

      const app = {
        useGlobalPipes(...pipes) {
          appGlobalPipes.push(...pipes);
          return this;
        },
        useGlobalGuards(...guards) {
          appGlobalGuards.push(...guards);
          return this;
        },
        useGlobalInterceptors(...interceptors) {
          appGlobalInterceptors.push(...interceptors);
          return this;
        },
        useGlobalFilters(...filters) {
          appGlobalFilters.push(...filters);
          return this;
        },
        async init() {
          isInitialized = true;
          return this;
        },
        async close() {
          isClosed = true;
        },
        get(token) {
          return testingModule.get(token);
        },
        getHttpServer() {
          return {
            _isNestTestingHttpServer: true,
            app,
            testingModule,
            isInitialized: () => isInitialized,
            isClosed: () => isClosed,
            dispatchRequest: async (reqSpec) => {
              return testingModule._executeHttpRequest(reqSpec, {
                appGlobalPipes,
                appGlobalGuards,
                appGlobalInterceptors,
                appGlobalFilters,
              });
            },
          };
        },
      };
      return app;
    }

    async _executeHttpRequest(requestSpec, globalHooks) {
      const rawHeaders = {};
      for (const [k, v] of Object.entries(requestSpec.headers || {})) {
        if (v !== undefined && v !== '') rawHeaders[k.toLowerCase()] = String(v);
      }
      const { path: reqPath, query: reqQuery } = parseUrlAndQuery(requestSpec.url || '/');
      const reqMethod = String(requestSpec.method || 'GET').toUpperCase();
      const responseHeaders = { 'content-type': 'application/json' };

      const req = {
        method: reqMethod,
        url: requestSpec.url || '/',
        originalUrl: requestSpec.url || '/',
        path: reqPath,
        headers: rawHeaders,
        query: reqQuery,
        params: {},
        body:
          requestSpec.body !== undefined && requestSpec.body !== ''
            ? typeof requestSpec.body === 'string'
              ? safeJsonParse(requestSpec.body)
              : JSON.parse(JSON.stringify(requestSpec.body))
            : {},
        ip: rawHeaders['x-forwarded-for'] || '127.0.0.1',
        user: undefined,
      };

      const jwtService = this._resolveToken(JwtService) || new JwtService();
      const authHeader = rawHeaders['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const tokenStr = authHeader.slice(7).trim();
        try {
          req.user = jwtService.verify(tokenStr);
        } catch {
          // leave undefined
        }
      }

      const res = {
        statusCode: reqMethod === 'POST' ? 201 : 200,
        headers: responseHeaders,
        setHeader(name, value) {
          responseHeaders[String(name).toLowerCase()] = String(value);
        },
        getHeader(name) {
          return responseHeaders[String(name).toLowerCase()];
        },
        status(code) {
          this.statusCode = code;
          return this;
        },
      };

      let matchedRoute = null;
      for (const CtrlCls of this.controllers) {
        const ctrlMeta = Reflect.getOwnMetadata(META.CONTROLLER, CtrlCls) || { prefix: '' };
        const routes = Reflect.getOwnMetadata(META.ROUTES, CtrlCls) || [];
        for (const r of routes) {
          if (r.method !== reqMethod) continue;
          const pattern = normalizePath(`/${ctrlMeta.prefix}/${r.path}`);
          const params = matchRoutePattern(pattern, reqPath);
          if (params !== null) {
            matchedRoute = {
              CtrlCls,
              ctrlInstance: this._instantiate(CtrlCls),
              handler: r.handler,
              handlerName: r.handlerName,
              params,
            };
            break;
          }
        }
        if (matchedRoute) break;
      }

      req.params = matchedRoute ? matchedRoute.params : {};
      const executionContext = {
        getType: () => 'http',
        getClass: () => matchedRoute?.CtrlCls,
        getHandler: () => matchedRoute?.handler,
        switchToHttp: () => ({
          getRequest: () => req,
          getResponse: () => res,
          getNext: () => () => {},
        }),
      };

      try {
        if (!matchedRoute) {
          throw new NotFoundException(`Cannot ${reqMethod} ${reqPath}`);
        }
        const customCode = Reflect.getOwnMetadata(META.HTTP_CODE, matchedRoute.handler);
        if (customCode) res.statusCode = customCode;

        // Guards (including .overrideGuard())
        const ctrlGuards = Reflect.getOwnMetadata(META.GUARDS, matchedRoute.CtrlCls) || [];
        const routeGuards = Reflect.getOwnMetadata(META.GUARDS, matchedRoute.handler) || [];
        const allGuards = [...(globalHooks.appGlobalGuards || []), ...ctrlGuards, ...routeGuards];
        for (const guardRef of allGuards) {
          const guard = this._instantiate(guardRef);
          let allowed = await guard.canActivate(executionContext);
          if (allowed instanceof Observable) allowed = await allowed.toPromise();
          if (!allowed) throw new ForbiddenException('Forbidden resource');
        }

        // Pipes (including app.useGlobalPipes(new ValidationPipe(...)))
        const ctrlPipes = Reflect.getOwnMetadata(META.PIPES, matchedRoute.CtrlCls) || [];
        const routePipes = Reflect.getOwnMetadata(META.PIPES, matchedRoute.handler) || [];
        const paramDefs =
          Reflect.getOwnMetadata(META.PARAMS, matchedRoute.CtrlCls, matchedRoute.handlerName) || [];
        const paramTypes =
          Reflect.getOwnMetadata(
            'design:paramtypes',
            matchedRoute.CtrlCls.prototype,
            matchedRoute.handlerName,
          ) || [];
        const sortedParams = [...paramDefs].sort((a, b) => a.index - b.index);
        const handlerArgs = [];

        for (const pDef of sortedParams) {
          let val;
          if (pDef.type === 'param') val = pDef.data ? req.params[pDef.data] : { ...req.params };
          else if (pDef.type === 'query') val = pDef.data ? req.query[pDef.data] : { ...req.query };
          else if (pDef.type === 'body') val = pDef.data ? req.body?.[pDef.data] : req.body;
          else if (pDef.type === 'headers') val = pDef.data ? req.headers[pDef.data] : { ...req.headers };
          else if (pDef.type === 'req') val = req;
          else if (pDef.type === 'res') val = res;
          else if (pDef.type === 'custom' && typeof pDef.factory === 'function') {
            val = pDef.factory(pDef.data, executionContext);
          }

          const metatype = paramTypes[pDef.index];
          const metadata = { type: pDef.type, metatype, data: pDef.data };
          if (['param', 'query', 'body', 'custom'].includes(pDef.type)) {
            const effectivePipes = [
              ...(globalHooks.appGlobalPipes || []),
              ...ctrlPipes,
              ...routePipes,
              ...(pDef.pipes || []),
            ];
            for (const pipeRef of effectivePipes) {
              const pipe = this._instantiate(pipeRef);
              val = await pipe.transform(val, metadata);
            }
          }
          handlerArgs[pDef.index] = val;
        }

        const rawResult = await matchedRoute.handler.apply(matchedRoute.ctrlInstance, handlerArgs);
        const resolvedBody =
          rawResult instanceof Observable ? await rawResult.toPromise() : rawResult;

        return {
          status: res.statusCode,
          statusCode: res.statusCode,
          headers: { ...res.headers },
          body: res.statusCode === 204 ? null : resolvedBody,
          text: JSON.stringify(resolvedBody),
        };
      } catch (caughtException) {
        const routeFilters = matchedRoute
          ? Reflect.getOwnMetadata(META.FILTERS, matchedRoute.handler) || []
          : [];
        const ctrlFilters = matchedRoute
          ? Reflect.getOwnMetadata(META.FILTERS, matchedRoute.CtrlCls) || []
          : [];
        const allFilters = [...routeFilters, ...ctrlFilters, ...(globalHooks.appGlobalFilters || [])];

        let filterReply = null;
        const filterRes = {
          status(code) {
            res.statusCode = code;
            return this;
          },
          json(b) {
            filterReply = b;
            return this;
          },
          send(b) {
            filterReply = b;
            return this;
          },
          setHeader: res.setHeader.bind(res),
        };
        const argumentsHost = {
          getType: () => 'http',
          switchToHttp: () => ({
            getRequest: () => req,
            getResponse: () => filterRes,
          }),
        };

        for (const filterRef of allFilters) {
          const filter = this._instantiate(filterRef);
          const catchTypes = Reflect.getOwnMetadata(META.CATCH, filter.constructor) || [];
          const matches =
            catchTypes.length === 0 ||
            catchTypes.some((ErrCls) => caughtException instanceof ErrCls);
          if (matches && typeof filter.catch === 'function') {
            await filter.catch(caughtException, argumentsHost);
            return {
              status: res.statusCode,
              statusCode: res.statusCode,
              headers: { ...res.headers },
              body: filterReply,
              text: JSON.stringify(filterReply),
            };
          }
        }

        const status =
          caughtException instanceof HttpException ? caughtException.getStatus() : 500;
        const errBody =
          caughtException instanceof HttpException
            ? caughtException.getResponse()
            : {
                statusCode: 500,
                error: 'Internal Server Error',
                message: caughtException?.message || 'Internal server error',
              };
        return {
          status,
          statusCode: status,
          headers: { ...res.headers },
          body: errBody,
          text: JSON.stringify(errBody),
        };
      }
    }
  }

  const Test = {
    createTestingModule(meta) {
      const providerOverrides = new Map();
      const guardOverrides = new Map();
      const interceptorOverrides = new Map();
      const pipeOverrides = new Map();

      const builder = {
        overrideProvider(token) {
          return {
            useValue(val) {
              providerOverrides.set(token, { provide: token, useValue: val });
              return builder;
            },
            useClass(cls) {
              providerOverrides.set(token, { provide: token, useClass: cls });
              return builder;
            },
            useFactory(opt) {
              const fn = typeof opt === 'function' ? opt : opt?.factory;
              providerOverrides.set(token, {
                provide: token,
                useFactory: fn,
                inject: opt?.inject || [],
              });
              return builder;
            },
          };
        },
        overrideGuard(guard) {
          return {
            useValue(val) {
              guardOverrides.set(guard, { useValue: val });
              return builder;
            },
            useClass(cls) {
              guardOverrides.set(guard, { useClass: cls });
              return builder;
            },
          };
        },
        overrideInterceptor(int) {
          return {
            useValue(val) {
              interceptorOverrides.set(int, { useValue: val });
              return builder;
            },
            useClass(cls) {
              interceptorOverrides.set(int, { useClass: cls });
              return builder;
            },
          };
        },
        overridePipe(pipe) {
          return {
            useValue(val) {
              pipeOverrides.set(pipe, { useValue: val });
              return builder;
            },
            useClass(cls) {
              pipeOverrides.set(pipe, { useClass: cls });
              return builder;
            },
          };
        },
        async compile() {
          return new TestingModule(
            meta,
            providerOverrides,
            guardOverrides,
            interceptorOverrides,
            pipeOverrides,
          );
        },
      };
      return builder;
    },
  };

  function supertestRequest(serverOrApp) {
    const server =
      serverOrApp && typeof serverOrApp.getHttpServer === 'function'
        ? serverOrApp.getHttpServer()
        : serverOrApp;

    const createReqChain = (method, url) => {
      const headers = {};
      let bodyPayload = undefined;
      let queryParams = {};
      const expectations = [];

      const executeChain = async () => {
        if (!server || typeof server.dispatchRequest !== 'function') {
          throw new Error(
            'supertest request() requires app.getHttpServer() from moduleRef.createNestApplication()',
          );
        }
        let finalUrl = url;
        const qEntries = Object.entries(queryParams);
        if (qEntries.length > 0) {
          const qs = qEntries
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
            .join('&');
          finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
        }
        const response = await server.dispatchRequest({
          method,
          url: finalUrl,
          headers,
          body: bodyPayload,
        });

        for (const exp of expectations) {
          if (typeof exp.statusOrFn === 'number') {
            if (response.status !== exp.statusOrFn) {
              throw new BadRequestException(
                `Supertest AssertionFailed: expected HTTP ${exp.statusOrFn}, got HTTP ${response.status} (${JSON.stringify(response.body)})`,
              );
            }
            if (exp.expectedBody !== undefined) {
              if (!partialMatchObject(response.body, exp.expectedBody)) {
                throw new BadRequestException(
                  `Supertest AssertionFailed: expected response body to match ${JSON.stringify(exp.expectedBody)}, got ${JSON.stringify(response.body)}`,
                );
              }
            }
          } else if (typeof exp.statusOrFn === 'function') {
            exp.statusOrFn(response);
          }
        }
        return response;
      };

      const chain = {
        set(field, val) {
          if (field && typeof field === 'object') {
            for (const [k, v] of Object.entries(field)) headers[k] = String(v);
          } else if (typeof field === 'string') {
            headers[field] = String(val);
          }
          return chain;
        },
        query(q) {
          if (q && typeof q === 'object') {
            queryParams = { ...queryParams, ...q };
          }
          return chain;
        },
        send(b) {
          bodyPayload = b;
          return chain;
        },
        expect(statusOrFn, expectedBody) {
          expectations.push({ statusOrFn, expectedBody });
          return chain;
        },
        then(onFulfilled, onRejected) {
          return executeChain().then(onFulfilled, onRejected);
        },
        catch(onRejected) {
          return executeChain().catch(onRejected);
        },
      };

      return chain;
    };

    return {
      get: (url) => createReqChain('GET', url),
      post: (url) => createReqChain('POST', url),
      patch: (url) => createReqChain('PATCH', url),
      put: (url) => createReqChain('PUT', url),
      delete: (url) => createReqChain('DELETE', url),
    };
  }
  supertestRequest.default = supertestRequest;
  supertestRequest.agent = supertestRequest;

  // ---------------------------------------------------------------------------
  // 7. Module Loader & TypeScript Compilation
  // ---------------------------------------------------------------------------
  function createVirtualModules() {
    const nestCommon = {
      Controller,
      Injectable,
      Module,
      Get,
      Post,
      Patch,
      Put,
      Delete,
      HttpCode,
      Header,
      Version,
      SetMetadata,
      applyDecorators,
      UseGuards,
      UseInterceptors,
      UsePipes,
      UseFilters,
      Catch,
      Inject,
      Param,
      Query,
      Body,
      Headers,
      Req,
      Request,
      Res,
      Ip,
      createParamDecorator,
      HttpStatus,
      HttpException,
      BadRequestException,
      UnauthorizedException,
      ForbiddenException,
      NotFoundException,
      RequestTimeoutException,
      ConflictException,
      PayloadTooLargeException,
      UnprocessableEntityException,
      InternalServerErrorException,
      ServiceUnavailableException,
      ParseIntPipe,
      ParseBoolPipe,
      ParseUUIDPipe,
      DefaultValuePipe,
      ParseEnumPipe,
      ValidationPipe,
      ClassSerializerInterceptor,
      Logger,
      Scope: { DEFAULT: 'DEFAULT', REQUEST: 'REQUEST', TRANSIENT: 'TRANSIENT' },
    };

    const nestCore = {
      Reflector,
      APP_GUARD: 'APP_GUARD',
      APP_INTERCEPTOR: 'APP_INTERCEPTOR',
      APP_PIPE: 'APP_PIPE',
      APP_FILTER: 'APP_FILTER',
    };

    const nestThrottler = {
      ThrottlerGuard,
      ThrottlerException,
      Throttle,
      SkipThrottle,
      ThrottlerStorageService,
    };

    const nestCache = {
      CACHE_MANAGER,
      CacheInterceptor,
      CacheTTL,
      CacheKey,
      CacheManager,
    };

    const nestJwt = {
      JwtService,
    };

    const nestEvents = {
      EventEmitter2,
      OnEvent,
    };

    const rxjsModule = {
      Observable,
      of,
      from,
      throwError,
      TimeoutError,
      map,
      tap,
      catchError,
      delay,
      timeout,
    };

    const classValidator = {
      IsOptional,
      IsString,
      IsNotEmpty,
      IsEmail,
      IsInt,
      IsNumber,
      IsBoolean,
      Min,
      Max,
      MinLength,
      MaxLength,
      IsEnum,
      IsIn,
      Matches,
      IsArray,
      IsUUID,
    };

    const classTransformer = {
      Type,
      Exclude,
    };

    const sandboxSdk = {
      Public,
      IS_PUBLIC_KEY,
      Roles,
      ROLES_KEY,
      CurrentUser,
      DatabaseService,
      PrismaService,
      PrismaClient,
      Prisma: PrismaNamespace,
      PrismaClientKnownRequestError,
      QueryFailedError,
      CacheManager,
      JwtService,
      EventEmitter2,
      ThrottlerStorageService,
      PRESET_TOKENS,
      Test,
      TestingModule,
      jest: jestShim,
      expect: expectShim,
      request: supertestRequest,
    };

    const nestTestingModule = {
      Test,
      TestingModule,
    };

    const jestGlobalsModule = {
      jest: jestShim,
      expect: expectShim,
    };

    const prismaClientModule = {
      PrismaClient,
      PrismaService,
      Prisma: PrismaNamespace,
      PrismaClientKnownRequestError,
    };

    const nestMongooseModule = {
      Schema,
      Prop,
      SchemaFactory,
      InjectModel,
      InjectConnection,
      getModelToken,
      MongooseModule,
    };

    const mongooseModule = {
      Model: class Model {},
      Document: class Document {},
      Schema: {
        Types: {
          ObjectId: String,
          Mixed: Object,
        },
      },
      Types: {
        ObjectId: Object.assign(
          function ObjectId(id) {
            return String(id || `oid-${Date.now().toString(36)}`);
          },
          {
            isValid: (v) => Boolean(v && String(v).length >= 1),
          },
        ),
      },
      Error: {
        CastError,
      },
      CastError,
      MongoServerError,
      MongooseService,
    };

    return {
      '@nestjs/common': nestCommon,
      '@nestjs/core': nestCore,
      '@nestjs/testing': nestTestingModule,
      '@nestjs/throttler': nestThrottler,
      '@nestjs/cache-manager': nestCache,
      '@nestjs/jwt': nestJwt,
      '@nestjs/event-emitter': nestEvents,
      '@prisma/client': prismaClientModule,
      '@nestjs/mongoose': nestMongooseModule,
      mongoose: mongooseModule,
      supertest: supertestRequest,
      '@jest/globals': jestGlobalsModule,
      '@nestjs/swagger': {
        ApiTags: () => () => {},
        ApiProperty: () => () => {},
        ApiPropertyOptional: () => () => {},
        ApiBearerAuth: () => () => {},
        PartialType: (Base) => class extends Base {},
      },
      rxjs: rxjsModule,
      'rxjs/operators': rxjsModule,
      'class-validator': classValidator,
      'class-transformer': classTransformer,
      crypto: cryptoShim,
      bcryptjs: bcryptShim,
      bcrypt: bcryptShim,
      '@playground/sandbox': sandboxSdk,
    };
  }

  function transpileTs(code, fileName = 'file.ts') {
    if (global.ts && typeof global.ts.transpileModule === 'function') {
      const res = global.ts.transpileModule(code, {
        fileName,
        compilerOptions: {
          target: global.ts.ScriptTarget.ES2020,
          module: global.ts.ModuleKind.CommonJS,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          esModuleInterop: true,
        },
      });
      return res.outputText;
    }
    throw new Error('TypeScript compiler not loaded yet');
  }

  function normalizePath(p) {
    const cleaned = ('/' + String(p || '').replace(/^\/+|\/+$/g, '')).replace(/\/+/g, '/');
    return cleaned === '' ? '/' : cleaned;
  }

  function matchRoutePattern(pattern, actualPath) {
    const patParts = normalizePath(pattern).split('/').filter(Boolean);
    const actParts = normalizePath(actualPath).split('/').filter(Boolean);
    if (patParts.length !== actParts.length) return null;
    const params = {};
    for (let i = 0; i < patParts.length; i++) {
      const pp = patParts[i];
      const ap = actParts[i];
      if (pp.startsWith(':')) {
        params[pp.slice(1)] = decodeURIComponent(ap);
      } else if (pp.toLowerCase() !== ap.toLowerCase()) {
        return null;
      }
    }
    return params;
  }

  function parseUrlAndQuery(rawUrl) {
    const [pathPart, queryPart] = String(rawUrl || '/').split('?');
    const query = {};
    if (queryPart) {
      const searchParams = new URLSearchParams(queryPart);
      for (const [k, v] of searchParams.entries()) {
        query[k] = v;
      }
    }
    return { path: normalizePath(pathPart), query };
  }

  // ---------------------------------------------------------------------------
  // 8. Compile & Execute Request Pipeline
  // ---------------------------------------------------------------------------
  async function executeSandboxRequest(files, requestSpec) {
    const startedAt = performance.now();
    const pipeline = [];
    const logsBefore = sandboxState.consoleLogs.length;

    const virtualModules = createVirtualModules();
    const compiledMap = new Map();
    const moduleExportsCache = new Map();

    for (const file of files) {
      if (!/\.(ts|js)$/i.test(file.name)) continue;
      try {
        const js = transpileTs(file.code, file.name);
        compiledMap.set(file.name, js);
      } catch (compileErr) {
        return {
          status: 500,
          statusText: 'Compilation Error',
          durationMs: Math.round(performance.now() - startedAt),
          headers: {},
          body: {
            statusCode: 500,
            error: 'TypeScript Compilation Error',
            file: file.name,
            message: compileErr.message,
          },
          pipeline: [
            {
              stage: 'compile',
              name: `Compile ${file.name}`,
              status: 'error',
              detail: compileErr.message,
              durationMs: 0,
            },
          ],
          logs: [],
        };
      }
    }

    function resolveFileName(fromFile, importPath) {
      const clean = importPath.replace(/^\.\//, '').replace(/\.(ts|js)$/, '');
      for (const candidate of [`${clean}.ts`, clean, `${clean}/index.ts`]) {
        if (compiledMap.has(candidate)) return candidate;
      }
      const base = clean.split('/').pop();
      for (const key of compiledMap.keys()) {
        if (key === `${base}.ts` || key.endsWith(`/${base}.ts`)) return key;
      }
      return null;
    }

    function formatLogArg(a) {
      return typeof a === 'object' ? JSON.stringify(a) : String(a);
    }

    function requireFile(fileName) {
      if (moduleExportsCache.has(fileName)) {
        return moduleExportsCache.get(fileName);
      }
      const js = compiledMap.get(fileName);
      if (!js) {
        throw new Error(`Cannot find file "${fileName}" in sandbox workspace`);
      }
      const exportsObj = {};
      const moduleObj = { exports: exportsObj };
      moduleExportsCache.set(fileName, exportsObj);

      const localRequire = (specifier) => {
        if (virtualModules[specifier]) return virtualModules[specifier];
        const resolved = resolveFileName(fileName, specifier);
        if (resolved) return requireFile(resolved);
        throw new Error(`Cannot find module '${specifier}' imported from ${fileName}`);
      };

      const customConsole = {
        log: (...args) => logToConsole('LOG', fileName, args.map(formatLogArg).join(' ')),
        warn: (...args) => logToConsole('WARN', fileName, args.map(formatLogArg).join(' ')),
        error: (...args) => logToConsole('ERROR', fileName, args.map(formatLogArg).join(' ')),
      };

      const fn = new Function(
        'exports',
        'module',
        'require',
        'Reflect',
        'console',
        'Buffer',
        'jest',
        'expect',
        js,
      );
      fn(
        exportsObj,
        moduleObj,
        localRequire,
        global.Reflect,
        customConsole,
        {
          from: (str) => String(str),
        },
        jestShim,
        expectShim,
      );
      moduleExportsCache.set(fileName, moduleObj.exports);
      return moduleObj.exports;
    }

    const allExports = [];
    try {
      for (const file of files) {
        if (!/\.(ts|js)$/i.test(file.name)) continue;
        const exp = requireFile(file.name);
        for (const [exportName, val] of Object.entries(exp || {})) {
          allExports.push({ fileName: file.name, exportName, value: val });
        }
      }
    } catch (evalErr) {
      return {
        status: 500,
        statusText: 'Runtime Evaluation Error',
        durationMs: Math.round(performance.now() - startedAt),
        headers: {},
        body: {
          statusCode: 500,
          error: 'Runtime Evaluation Error',
          message: evalErr.message,
        },
        pipeline: [
          {
            stage: 'compile',
            name: 'Module Evaluation',
            status: 'error',
            detail: evalErr.message,
            durationMs: 0,
          },
        ],
        logs: sandboxState.consoleLogs.slice(logsBefore),
      };
    }

    const reflector = new Reflector();
    const dbService = new DatabaseService();
    const prismaService = new PrismaService();
    const mongooseService = new MongooseService();
    const cacheManager = new CacheManager();
    const jwtService = new JwtService();
    const eventEmitter = new EventEmitter2();
    const throttlerStorage = new ThrottlerStorageService();

    const singletonInstances = new Map([
      [Reflector, reflector],
      ['Reflector', reflector],
      [DatabaseService, dbService],
      ['DatabaseService', dbService],
      [PrismaService, prismaService],
      ['PrismaService', prismaService],
      [PrismaClient, prismaService],
      ['PrismaClient', prismaService],
      [MongooseService, mongooseService],
      ['MongooseService', mongooseService],
      ['UserModel', mongooseService.userModel],
      ['User', mongooseService.userModel],
      ['ListingModel', mongooseService.listingModel],
      ['Listing', mongooseService.listingModel],
      ['HostelModel', mongooseService.listingModel],
      ['BookingModel', mongooseService.bookingModel],
      ['Booking', mongooseService.bookingModel],
      ['DatabaseConnection', mongooseService.connection],
      ['Connection', mongooseService.connection],
      [CacheManager, cacheManager],
      ['CacheManager', cacheManager],
      [CACHE_MANAGER, cacheManager],
      [JwtService, jwtService],
      ['JwtService', jwtService],
      [EventEmitter2, eventEmitter],
      ['EventEmitter2', eventEmitter],
      [ThrottlerStorageService, throttlerStorage],
      ['ThrottlerStorageService', throttlerStorage],
    ]);

    const customProviderDefs = new Map();
    const globalGuards = [];
    const globalInterceptors = [];
    const globalPipes = [];
    const globalFilters = [];
    const middlewares = [];
    const controllers = [];
    const injectables = [];

    for (const item of allExports) {
      const val = item.value;
      if (typeof val === 'function') {
        const modMeta = Reflect.getOwnMetadata(META.MODULE, val);
        const ctrlMeta = Reflect.getOwnMetadata(META.CONTROLLER, val);
        const injMeta = Reflect.getOwnMetadata(META.INJECTABLE, val);

        if (modMeta) {
          for (const prov of modMeta.providers || []) {
            if (typeof prov === 'function') {
              injectables.push(prov);
            } else if (prov && typeof prov === 'object' && 'provide' in prov) {
              if (prov.provide === 'APP_GUARD') globalGuards.push(prov.useClass || prov.useValue);
              else if (prov.provide === 'APP_INTERCEPTOR')
                globalInterceptors.push(prov.useClass || prov.useValue);
              else if (prov.provide === 'APP_PIPE')
                globalPipes.push(prov.useClass || prov.useValue);
              else if (prov.provide === 'APP_FILTER')
                globalFilters.push(prov.useClass || prov.useValue);
              else customProviderDefs.set(prov.provide, prov);
            }
          }
          for (const ctrl of modMeta.controllers || []) {
            if (!controllers.includes(ctrl)) controllers.push(ctrl);
          }
        }
        if (ctrlMeta && !controllers.includes(val)) {
          controllers.push(val);
        }
        if (injMeta && !injectables.includes(val)) {
          injectables.push(val);
        }
        if (
          val.prototype &&
          typeof val.prototype.use === 'function' &&
          !ctrlMeta &&
          !modMeta
        ) {
          middlewares.push(val);
        }
      }
    }

    const BUILTIN_PRIMITIVES = new Set([
      Object,
      Function,
      String,
      Number,
      Boolean,
      Array,
      Symbol,
    ]);
    const instantiatingSet = new Set();

    function resolveToken(token) {
      if (!token || BUILTIN_PRIMITIVES.has(token)) return undefined;
      if (singletonInstances.has(token)) return singletonInstances.get(token);
      if (typeof token === 'function' && singletonInstances.has(token.name)) {
        return singletonInstances.get(token.name);
      }

      if (customProviderDefs.has(token)) {
        const def = customProviderDefs.get(token);
        let resolved;
        if ('useValue' in def) resolved = def.useValue;
        else if (def.useFactory) {
          const deps = (def.inject || []).map((t) => resolveToken(t));
          resolved = def.useFactory(...deps);
        } else if (def.useClass) {
          resolved = instantiateClass(def.useClass);
        }
        singletonInstances.set(token, resolved);
        return resolved;
      }

      if (typeof token === 'function') {
        return instantiateClass(token);
      }

      for (const item of allExports) {
        if (typeof item.value === 'function' && item.value.name === token) {
          return instantiateClass(item.value);
        }
      }
      return undefined;
    }

    function instantiateClass(Cls) {
      if (typeof Cls !== 'function' || BUILTIN_PRIMITIVES.has(Cls)) return Cls;
      if (singletonInstances.has(Cls)) return singletonInstances.get(Cls);
      if (instantiatingSet.has(Cls)) return undefined;
      instantiatingSet.add(Cls);

      const paramTypes = Reflect.getOwnMetadata('design:paramtypes', Cls) || [];
      const explicitTokens = Reflect.getOwnMetadata(META.INJECT_TOKENS, Cls) || {};
      const paramNames = extractConstructorParamNames(Cls);
      const maxLen = Math.max(
        paramTypes.length,
        paramNames.length,
        Cls.length,
        ...Object.keys(explicitTokens).map((k) => Number(k) + 1),
      );

      const args = [];
      for (let i = 0; i < maxLen; i++) {
        const token = explicitTokens[i] !== undefined ? explicitTokens[i] : paramTypes[i];
        let resolved = resolveToken(token);
        if (resolved === undefined) {
          const pName = (paramNames[i] || '').toLowerCase();
          if (pName.includes('reflector')) resolved = reflector;
          else if (pName.includes('db') || pName.includes('database') || pName.includes('repo'))
            resolved = dbService;
          else if (pName.includes('cache')) resolved = cacheManager;
          else if (pName.includes('jwt')) resolved = jwtService;
          else if (pName.includes('event')) resolved = eventEmitter;
          else if (pName.includes('throttler') || pName.includes('storage'))
            resolved = throttlerStorage;
          else {
            const stem = pName.replace(/service$/, '').trim();
            if (stem.length >= 3) {
              for (const inj of injectables) {
                if (inj !== Cls && inj.name.toLowerCase().includes(stem)) {
                  resolved = instantiateClass(inj);
                  break;
                }
              }
            }
          }
        }
        args.push(resolved);
      }

      const instance = new Cls(...args);
      instantiatingSet.delete(Cls);
      singletonInstances.set(Cls, instance);
      singletonInstances.set(Cls.name, instance);

      const eventHandlers = Reflect.getOwnMetadata(META.ON_EVENT, Cls) || [];
      for (const eh of eventHandlers) {
        if (typeof instance[eh.methodName] === 'function') {
          eventEmitter.on(eh.eventName, (payload) => instance[eh.methodName](payload));
        }
      }

      return instance;
    }

    function extractConstructorParamNames(Cls) {
      const str = Cls.toString();
      const m = /constructor\s*\(([^)]*)\)/.exec(str);
      if (!m) return [];
      return m[1]
        .split(',')
        .map((s) => s.trim().replace(/:.*$/, '').replace(/=.*$/, '').trim())
        .filter(Boolean);
    }

    for (const inj of injectables) {
      instantiateClass(inj);
    }

    const rawHeaders = {};
    for (const [k, v] of Object.entries(requestSpec.headers || {})) {
      if (v !== undefined && v !== '') rawHeaders[k.toLowerCase()] = String(v);
    }

    const { path: reqPath, query: reqQuery } = parseUrlAndQuery(requestSpec.url || '/');
    const reqMethod = String(requestSpec.method || 'GET').toUpperCase();
    const responseHeaders = { 'content-type': 'application/json' };

    const req = {
      method: reqMethod,
      url: requestSpec.url || '/',
      originalUrl: requestSpec.url || '/',
      path: reqPath,
      headers: rawHeaders,
      query: reqQuery,
      params: {},
      body:
        requestSpec.body !== undefined && requestSpec.body !== ''
          ? typeof requestSpec.body === 'string'
            ? safeJsonParse(requestSpec.body)
            : JSON.parse(JSON.stringify(requestSpec.body))
          : {},
      ip: rawHeaders['x-forwarded-for'] || requestSpec.ip || '127.0.0.1',
      user: undefined,
    };

    const authHeader = rawHeaders['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const tokenStr = authHeader.slice(7).trim();
      try {
        req.user = jwtService.verify(tokenStr);
      } catch {
        // Leave req.user undefined so JwtAuthGuard can reject it with 401
      }
    }

    const res = {
      statusCode: reqMethod === 'POST' ? 201 : 200,
      headers: responseHeaders,
      setHeader(name, value) {
        responseHeaders[String(name).toLowerCase()] = String(value);
      },
      getHeader(name) {
        return responseHeaders[String(name).toLowerCase()];
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
    };

    let matchedRoute = null;
    for (const CtrlCls of controllers) {
      const ctrlMeta = Reflect.getOwnMetadata(META.CONTROLLER, CtrlCls) || { prefix: '' };
      const routes = Reflect.getOwnMetadata(META.ROUTES, CtrlCls) || [];

      for (const r of routes) {
        if (r.method !== reqMethod) continue;
        const routeVersion =
          Reflect.getOwnMetadata(META.VERSION, r.handler) || ctrlMeta.version;

        const candidatePaths = [];
        if (routeVersion) {
          candidatePaths.push(
            normalizePath(`/v${routeVersion}/${ctrlMeta.prefix}/${r.path}`),
          );
        }
        candidatePaths.push(normalizePath(`/${ctrlMeta.prefix}/${r.path}`));

        for (const pattern of candidatePaths) {
          const params = matchRoutePattern(pattern, reqPath);
          if (params !== null) {
            const headerVer = rawHeaders['x-api-version'];
            if (
              routeVersion &&
              !reqPath.startsWith(`/v${routeVersion}`) &&
              headerVer &&
              String(headerVer) !== String(routeVersion)
            ) {
              continue;
            }
            matchedRoute = {
              CtrlCls,
              ctrlInstance: instantiateClass(CtrlCls),
              handler: r.handler,
              handlerName: r.handlerName,
              params,
              pattern,
            };
            break;
          }
        }
        if (matchedRoute) break;
      }
      if (matchedRoute) break;
    }

    req.params = matchedRoute ? matchedRoute.params : {};

    const executionContext = {
      getType: () => 'http',
      getClass: () => matchedRoute?.CtrlCls,
      getHandler: () => matchedRoute?.handler,
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
        getNext: () => () => {},
      }),
    };

    try {
      // STAGE 1: Middleware
      for (const MwCls of middlewares) {
        const stepStart = performance.now();
        const mwInstance = instantiateClass(MwCls);
        let nextCalled = false;
        let nextErr = null;
        await mwInstance.use(req, res, (err) => {
          nextCalled = true;
          nextErr = err;
        });
        const dur = Math.max(1, Math.round(performance.now() - stepStart));
        if (nextErr) {
          pipeline.push({
            stage: 'middleware',
            name: `${MwCls.name}.use`,
            status: 'error',
            detail: `Passed error to next(): ${nextErr.message || nextErr}`,
            durationMs: dur,
          });
          throw nextErr;
        }
        pipeline.push({
          stage: 'middleware',
          name: `${MwCls.name}.use`,
          status: nextCalled ? 'pass' : 'short-circuit',
          detail: nextCalled
            ? `Processed request${req.id ? ` (req.id="${req.id}")` : ''} and called next()`
            : 'Short-circuited without calling next()',
          durationMs: dur,
        });
        if (!nextCalled) {
          return buildFinalOutput(res.statusCode, null, res.headers, pipeline, startedAt, logsBefore);
        }
      }

      if (!matchedRoute) {
        throw new NotFoundException(`Cannot ${reqMethod} ${reqPath}`);
      }

      const customCode = Reflect.getOwnMetadata(META.HTTP_CODE, matchedRoute.handler);
      if (customCode) res.statusCode = customCode;
      const customHeaders = Reflect.getOwnMetadata(META.HEADERS, matchedRoute.handler) || [];
      for (const h of customHeaders) {
        res.setHeader(h.name, h.value);
      }

      // STAGE 2: Guards
      const ctrlGuards = Reflect.getOwnMetadata(META.GUARDS, matchedRoute.CtrlCls) || [];
      const routeGuards = Reflect.getOwnMetadata(META.GUARDS, matchedRoute.handler) || [];
      const allGuards = [...globalGuards, ...ctrlGuards, ...routeGuards];

      for (const guardRef of allGuards) {
        const stepStart = performance.now();
        const guard = instantiateClass(guardRef);
        const guardName = guard.constructor?.name || 'Guard';
        try {
          let result = await guard.canActivate(executionContext);
          if (result instanceof Observable) {
            result = await result.toPromise();
          }
          const dur = Math.max(1, Math.round(performance.now() - stepStart));
          if (!result) {
            pipeline.push({
              stage: 'guard',
              name: `${guardName}.canActivate`,
              status: 'error',
              detail: 'Returned false -> NestJS throws 403 ForbiddenException',
              durationMs: dur,
            });
            throw new ForbiddenException('Forbidden resource');
          }
          pipeline.push({
            stage: 'guard',
            name: `${guardName}.canActivate`,
            status: 'pass',
            detail: `Returned true${req.user ? ` (user: ${req.user.email || req.user.id}, role: ${req.user.role})` : ''}`,
            durationMs: dur,
          });
        } catch (guardErr) {
          const dur = Math.max(1, Math.round(performance.now() - stepStart));
          if (!pipeline.some((p) => p.name === `${guardName}.canActivate`)) {
            pipeline.push({
              stage: 'guard',
              name: `${guardName}.canActivate`,
              status: 'error',
              detail: `Blocked request: ${guardErr.message}`,
              durationMs: dur,
            });
          }
          throw guardErr;
        }
      }

      // STAGE 3 & 6: Interceptors
      const ctrlInterceptors =
        Reflect.getOwnMetadata(META.INTERCEPTORS, matchedRoute.CtrlCls) || [];
      const routeInterceptors =
        Reflect.getOwnMetadata(META.INTERCEPTORS, matchedRoute.handler) || [];
      const allInterceptors = [
        ...globalInterceptors,
        ...ctrlInterceptors,
        ...routeInterceptors,
      ].map((ref) => instantiateClass(ref));

      const invokeHandlerWithPipes = () =>
        new Observable((observer) => {
          (async () => {
            try {
              // STAGE 4: Pipes
              const ctrlPipes =
                Reflect.getOwnMetadata(META.PIPES, matchedRoute.CtrlCls) || [];
              const routePipes =
                Reflect.getOwnMetadata(META.PIPES, matchedRoute.handler) || [];
              const paramDefs =
                Reflect.getOwnMetadata(
                  META.PARAMS,
                  matchedRoute.CtrlCls,
                  matchedRoute.handlerName,
                ) || [];
              const paramTypes =
                Reflect.getOwnMetadata(
                  'design:paramtypes',
                  matchedRoute.CtrlCls.prototype,
                  matchedRoute.handlerName,
                ) || [];

              const sortedParams = [...paramDefs].sort((a, b) => a.index - b.index);
              const handlerArgs = [];

              for (const pDef of sortedParams) {
                let val;
                if (pDef.type === 'param') {
                  val = pDef.data ? req.params[pDef.data] : { ...req.params };
                } else if (pDef.type === 'query') {
                  val = pDef.data ? req.query[pDef.data] : { ...req.query };
                } else if (pDef.type === 'body') {
                  val = pDef.data ? req.body?.[pDef.data] : req.body;
                } else if (pDef.type === 'headers') {
                  val = pDef.data ? req.headers[pDef.data] : { ...req.headers };
                } else if (pDef.type === 'req') {
                  val = req;
                } else if (pDef.type === 'res') {
                  val = res;
                } else if (pDef.type === 'ip') {
                  val = req.ip;
                } else if (pDef.type === 'custom' && typeof pDef.factory === 'function') {
                  val = pDef.factory(pDef.data, executionContext);
                }

                const metatype = paramTypes[pDef.index];
                const metadata = {
                  type: pDef.type,
                  metatype,
                  data: pDef.data,
                };

                if (['param', 'query', 'body', 'custom'].includes(pDef.type)) {
                  const effectivePipes = [
                    ...globalPipes,
                    ...ctrlPipes,
                    ...routePipes,
                    ...(pDef.pipes || []),
                  ];
                  for (const pipeRef of effectivePipes) {
                    const pipeStart = performance.now();
                    const pipe = instantiateClass(pipeRef);
                    const pipeName = pipe.constructor?.name || 'Pipe';
                    const beforePreview = previewValue(val);
                    try {
                      val = await pipe.transform(val, metadata);
                      const afterPreview = previewValue(val);
                      pipeline.push({
                        stage: 'pipe',
                        name: `${pipeName}.transform (@${capitalize(pDef.type)}${pDef.data ? `('${pDef.data}')` : ''})`,
                        status: beforePreview !== afterPreview ? 'transform' : 'pass',
                        detail:
                          beforePreview !== afterPreview
                            ? `${beforePreview} → ${afterPreview}`
                            : `Validated ${afterPreview}`,
                        durationMs: Math.max(1, Math.round(performance.now() - pipeStart)),
                      });
                    } catch (pipeErr) {
                      pipeline.push({
                        stage: 'pipe',
                        name: `${pipeName}.transform (@${capitalize(pDef.type)}${pDef.data ? `('${pDef.data}')` : ''})`,
                        status: 'error',
                        detail: `Rejected input ${beforePreview}: ${formatExceptionDetail(pipeErr)}`,
                        durationMs: Math.max(1, Math.round(performance.now() - pipeStart)),
                      });
                      throw pipeErr;
                    }
                  }
                }

                handlerArgs[pDef.index] = val;
              }

              // STAGE 5: Controller Route Handler
              const handlerStart = performance.now();
              const rawResult = await matchedRoute.handler.apply(
                matchedRoute.ctrlInstance,
                handlerArgs,
              );
              const resolvedResult =
                rawResult instanceof Observable ? await rawResult.toPromise() : rawResult;

              pipeline.push({
                stage: 'handler',
                name: `${matchedRoute.CtrlCls.name}.${matchedRoute.handlerName}`,
                status: 'pass',
                detail: `Returned ${previewValue(resolvedResult)}`,
                durationMs: Math.max(1, Math.round(performance.now() - handlerStart)),
              });

              observer.next(resolvedResult);
              observer.complete();
            } catch (err) {
              observer.error(err);
            }
          })();
        });

      let streamFactory = invokeHandlerWithPipes;
      for (let i = allInterceptors.length - 1; i >= 0; i--) {
        const interceptor = allInterceptors[i];
        const interceptorName = interceptor.constructor?.name || 'Interceptor';
        const nextFn = streamFactory;

        streamFactory = () =>
          new Observable((observer) => {
            const preStart = performance.now();
            let nextHandleCalled = false;
            pipeline.push({
              stage: 'interceptor-pre',
              name: `${interceptorName} (pre)`,
              status: 'pass',
              detail: 'Entered interceptor before route handler',
              durationMs: 1,
            });

            const callHandler = {
              handle: () => {
                nextHandleCalled = true;
                return nextFn();
              },
            };

            Promise.resolve(interceptor.intercept(executionContext, callHandler))
              .then((obs) => {
                const stream = from(obs);
                stream.subscribe({
                  next: (val) => {
                    pipeline.push({
                      stage: 'interceptor-post',
                      name: `${interceptorName} (post)`,
                      status: nextHandleCalled ? 'transform' : 'short-circuit',
                      detail: nextHandleCalled
                        ? `Processed response stream (${Math.max(1, Math.round(performance.now() - preStart))}ms)`
                        : `Short-circuited handler (served directly from ${interceptorName})`,
                      durationMs: Math.max(1, Math.round(performance.now() - preStart)),
                    });
                    observer.next(val);
                  },
                  error: (err) => {
                    pipeline.push({
                      stage: 'interceptor-post',
                      name: `${interceptorName} (error stream)`,
                      status: 'error',
                      detail: `Stream error: ${err.message}`,
                      durationMs: Math.max(1, Math.round(performance.now() - preStart)),
                    });
                    observer.error(err);
                  },
                  complete: () => observer.complete(),
                });
              })
              .catch((err) => observer.error(err));
          });
      }

      const finalBody = await streamFactory().toPromise();
      return buildFinalOutput(
        res.statusCode,
        res.statusCode === 204 ? null : finalBody,
        res.headers,
        pipeline,
        startedAt,
        logsBefore,
      );
    } catch (caughtException) {
      // STAGE 7: Exception Filters
      const routeFilters = matchedRoute
        ? Reflect.getOwnMetadata(META.FILTERS, matchedRoute.handler) || []
        : [];
      const ctrlFilters = matchedRoute
        ? Reflect.getOwnMetadata(META.FILTERS, matchedRoute.CtrlCls) || []
        : [];
      const allFilters = [...routeFilters, ...ctrlFilters, ...globalFilters];

      let filterReply = null;
      const filterRes = {
        status(code) {
          res.statusCode = code;
          return this;
        },
        json(body) {
          filterReply = body;
          return this;
        },
        send(body) {
          filterReply = body;
          return this;
        },
        setHeader: res.setHeader.bind(res),
      };

      const argumentsHost = {
        getType: () => 'http',
        switchToHttp: () => ({
          getRequest: () => req,
          getResponse: () => filterRes,
        }),
      };

      for (const filterRef of allFilters) {
        const filter = instantiateClass(filterRef);
        const catchTypes = Reflect.getOwnMetadata(META.CATCH, filter.constructor) || [];
        const matches =
          catchTypes.length === 0 ||
          catchTypes.some((ErrCls) => caughtException instanceof ErrCls);

        if (matches && typeof filter.catch === 'function') {
          const filterStart = performance.now();
          await filter.catch(caughtException, argumentsHost);
          pipeline.push({
            stage: 'filter',
            name: `${filter.constructor.name}.catch`,
            status: 'transform',
            detail: `Caught ${caughtException.name || 'Error'} and formatted HTTP ${res.statusCode} response`,
            durationMs: Math.max(1, Math.round(performance.now() - filterStart)),
          });
          return buildFinalOutput(
            res.statusCode,
            filterReply,
            res.headers,
            pipeline,
            startedAt,
            logsBefore,
          );
        }
      }

      const status =
        caughtException instanceof HttpException ? caughtException.getStatus() : 500;
      const errBody =
        caughtException instanceof HttpException
          ? caughtException.getResponse()
          : {
              statusCode: 500,
              error: 'Internal Server Error',
              message: caughtException?.message || 'Internal server error',
            };

      pipeline.push({
        stage: 'filter',
        name: 'BaseExceptionFilter (Built-in)',
        status: 'error',
        detail: `Formatted ${caughtException.name || 'Error'} into HTTP ${status}`,
        durationMs: 1,
      });

      return buildFinalOutput(
        status,
        errBody,
        res.headers,
        pipeline,
        startedAt,
        logsBefore,
      );
    }
  }

  function buildFinalOutput(status, body, headers, pipeline, startedAt, logsBefore) {
    return {
      status,
      statusText: HttpStatus[status] || (status < 400 ? 'OK' : 'Error'),
      durationMs: Math.max(1, Math.round(performance.now() - startedAt)),
      headers: { ...headers },
      body,
      pipeline,
      logs: sandboxState.consoleLogs.slice(logsBefore),
    };
  }

  function safeJsonParse(str) {
    if (str === undefined || str === null) return {};
    if (typeof str === 'object') return JSON.parse(JSON.stringify(str));
    const trimmed = String(str).trim();
    if (!trimmed) return {};

    // 1. Standard strict JSON
    try {
      return JSON.parse(trimmed);
    } catch {
      // continue to smart auto-heal
    }

    // 2. Remove trailing commas before } or ] and auto-close missing '}' if user forgot closing brace
    let healed = trimmed.replace(/,\s*([}\]])/g, '$1');
    const openBraces = (healed.match(/\{/g) || []).length;
    const closeBraces = (healed.match(/\}/g) || []).length;
    if (healed.startsWith('{') && openBraces > closeBraces) {
      healed = healed.replace(/,\s*$/, '') + '\n' + '}'.repeat(openBraces - closeBraces);
    }
    try {
      return JSON.parse(healed);
    } catch {
      // continue to relaxed JS object literal recovery (e.g. unquoted keys or single quotes)
    }

    // 3. Relaxed JSON: quote unquoted keys and convert single-quoted strings
    try {
      const relaxed = healed
        .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
        .replace(/:\s*'([^']*)'/g, ': "$1"');
      return JSON.parse(relaxed);
    } catch {
      return { __rawInvalidJson: trimmed };
    }
  }

  function capitalize(s) {
    return String(s).charAt(0).toUpperCase() + String(s).slice(1);
  }

  function previewValue(val) {
    if (val === undefined) return 'undefined';
    if (val === null) return 'null';
    if (typeof val === 'string') return `"${val.length > 36 ? val.slice(0, 36) + '…' : val}"`;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (Array.isArray(val)) return `Array(${val.length})`;
    if (typeof val === 'object') {
      const keys = Object.keys(val);
      return `{ ${keys.slice(0, 4).join(', ')}${keys.length > 4 ? ', …' : ''} }`;
    }
    return String(val);
  }

  function formatExceptionDetail(err) {
    if (err instanceof HttpException) {
      const r = err.getResponse();
      if (Array.isArray(r?.message)) return r.message.join(', ');
      if (typeof r?.message === 'string') return r.message;
    }
    return err?.message || String(err);
  }

  global.NestSandboxEngine = {
    executeRequest: executeSandboxRequest,
    getState: () => sandboxState,
    resetState: resetSandboxState,
    PRESET_TOKENS,
  };
})(window);

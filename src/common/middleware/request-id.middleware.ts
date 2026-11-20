import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export type RequestWithId = Request & { id?: string };

/**
 * LESSON: Middleware
 * Middleware is the FIRST thing to run (before guards) and has the plain Express
 * `(req, res, next)` signature. Good for request IDs, CORS-like header tweaks, body parsing.
 * It cannot know which handler will run - for that use guards/interceptors.
 *
 * Reuses an inbound `x-request-id` (e.g. set by a gateway) or mints a new one.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction): void {
    const incoming = req.headers['x-request-id'];
    req.id = typeof incoming === 'string' && incoming.length <= 100 ? incoming : randomUUID();
    res.setHeader('x-request-id', req.id);
    next();
  }
}

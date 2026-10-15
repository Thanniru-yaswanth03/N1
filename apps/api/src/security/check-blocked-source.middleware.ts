import { Request, Response, NextFunction } from 'express';
import { blockedSourceService } from '../services/blocked-source.service.js';
import { hashIp } from './tokens.js';
import { ApiErrorResponse } from '@n1/shared';

/**
 * Middleware that rejects requests originating from abusive blocked sources.
 */
export async function checkBlockedSource(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const forwarded = req.headers['x-forwarded-for'];
  const clientIp =
    (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : null) ||
    req.ip ||
    req.socket.remoteAddress ||
    '127.0.0.1';
  const ipHash = hashIp(clientIp);

  const blocked = await blockedSourceService.isBlocked(ipHash);
  if (blocked) {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: 'FORBIDDEN_SOURCE',
        message: 'Your IP or source has been restricted due to abuse policy violations',
      },
      timestamp: new Date().toISOString(),
    };
    res.status(403).json(errorResponse);
    return;
  }

  next();
}

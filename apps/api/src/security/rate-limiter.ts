import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '@n1/shared';

function createRateLimitHandler(code: string, message: string) {
  return (_req: Request, res: Response) => {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code,
        message,
      },
      timestamp: new Date().toISOString(),
    };
    res.status(429).json(errorResponse);
  };
}

export function shouldSkipRateLimit(req: Request): boolean {
  if (req.headers['x-test-rate-limit'] === 'true') {
    return false;
  }
  if (process.env['DISABLE_RATE_LIMITS'] === 'true') {
    return true;
  }
  return process.env['NODE_ENV'] === 'test' && process.env['ENABLE_TEST_RATE_LIMITS'] !== 'true';
}

/**
 * Global rate limiter: 120 requests per minute per IP.
 */
export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  handler: createRateLimitHandler('TOO_MANY_REQUESTS', 'Too many requests. Please try again later.'),
});

/**
 * Upload rate limiter: 15 uploads per 15 minutes per IP.
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  handler: createRateLimitHandler(
    'UPLOAD_RATE_LIMITED',
    'Upload limit reached (max 15 drops per 15 minutes). Please wait before uploading again.'
  ),
});

/**
 * Unlock rate limiter: 5 attempts per 5 minutes per IP + code (brute-force defense).
 */
export const unlockRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  keyGenerator: (req: Request) => {
    const rawIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const ip = ipKeyGenerator(rawIp);
    const code = typeof req.params['code'] === 'string' ? req.params['code'].toUpperCase().trim() : '';
    return `${ip}:${code}`;
  },
  handler: createRateLimitHandler(
    'UNLOCK_RATE_LIMITED',
    'Too many password attempts. Please wait 5 minutes before trying again.'
  ),
});

/**
 * Code lookup rate limiter: 30 requests per minute per IP (prevents enumeration).
 */
export const codeLookupRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  handler: createRateLimitHandler(
    'LOOKUP_RATE_LIMITED',
    'Too many drop lookup attempts. Please slow down.'
  ),
});

/**
 * Board room creation rate limiter: 30 rooms per 15 minutes per IP.
 */
export const boardCreationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  handler: createRateLimitHandler(
    'BOARD_CREATION_RATE_LIMITED',
    'Too many board rooms created from this IP. Please try again later.'
  ),
});

/**
 * Admin login rate limiter: 5 attempts per 15 minutes per IP (brute-force defense).
 */
export const adminLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  handler: createRateLimitHandler(
    'ADMIN_LOGIN_RATE_LIMITED',
    'Too many failed admin login attempts. Please wait 15 minutes before trying again.'
  ),
});

/**
 * Admin API rate limiter: 120 requests per minute per IP.
 */
export const adminApiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  handler: createRateLimitHandler(
    'ADMIN_RATE_LIMITED',
    'Too many admin requests. Please slow down.'
  ),
});

/**
 * Abuse report rate limiter: 10 reports per hour per IP.
 */
export const abuseReportRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkipRateLimit,
  handler: createRateLimitHandler(
    'REPORT_RATE_LIMITED',
    'Too many abuse reports submitted. Please wait before submitting more reports.'
  ),
});


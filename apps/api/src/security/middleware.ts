import helmet from 'helmet';
import cors from 'cors';
import express, { Request, Response, NextFunction, Express } from 'express';
import { ApiErrorResponse } from '@n1/shared';
import { env } from '../config/env.js';

/**
 * Applies hardened Helmet headers.
 */
export function configureHelmet(app: Express): void {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'", env.CLIENT_URL],
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xContentTypeOptions: true, // nosniff
      hidePoweredBy: true,
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
    })
  );
}

/**
 * Configures CORS based on environment.
 */
export function configureCors(app: Express): void {
  // Support comma-separated CLIENT_URL values and strip trailing slashes
  const clientOrigins = (env.CLIENT_URL || '')
    .split(',')
    .map(u => u.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const allowedOrigins = Array.from(
    new Set([...clientOrigins, 'http://localhost:3000', 'http://127.0.0.1:3000'])
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);

        const normalizedOrigin = origin.replace(/\/+$/, '');

        // Direct match with allowed origins
        if (allowedOrigins.includes(normalizedOrigin)) {
          return callback(null, true);
        }

        // Allow Vercel preview deployments if client URL uses vercel
        const isVercelPreview =
          allowedOrigins.some(o => o.includes('.vercel.app')) &&
          /^https:\/\/[a-z0-9-]+[a-z0-9]\.vercel\.app$/.test(normalizedOrigin);

        if (isVercelPreview) {
          return callback(null, true);
        }

        // Return false to reject unauthorized origins without throwing 500 server errors
        return callback(null, false);
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'x-deletion-token',
        'x-unlock-token',
        'x-drop-password',
        'x-test-rate-limit',
        'x-client-id',
      ],
      exposedHeaders: ['Content-Disposition', 'Content-Length'],
      credentials: true,
      maxAge: 86400, // 24 hours preflight cache
    })
  );
}

/**
 * Recursively sanitizes object keys against NoSQL operator injection ($gt, $ne, $where) and dot notation.
 */
export function sanitizeNoSql<T>(input: T): T {
  if (!input || typeof input !== 'object') {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeNoSql(item)) as unknown as T;
  }

  const cleanObj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    // Prohibit MongoDB operator keys ($gt, $ne, $where, etc.) and dot notation property traversal
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    cleanObj[key] = sanitizeNoSql(value);
  }

  return cleanObj as T;
}

/**
 * Middleware that recursively cleanses incoming request body, query, and params against NoSQL injection.
 */
export function noSqlSanitizer(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeNoSql(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeNoSql(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeNoSql(req.params);
  }
  next();
}

/**
 * Configures global request body size limits to prevent Denial-of-Service / Memory exhaustion.
 */
export function configureBodyLimits(app: Express): void {
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
}

export interface SecureError extends Error {
  statusCode?: number;
  code?: string;
  details?: Array<{ field?: string; issue: string }>;
}

/**
 * Strips absolute system filesystem paths from error messages.
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message) return '';
  // Redact Windows absolute paths (e.g. C:\Users\... or \\?\...)
  let sanitized = message.replace(/[A-Za-z]:\\[^"'\s\n\r<>&]+/g, '[redacted_path]');
  // Redact Unix absolute paths (e.g. /home/... or /var/...)
  sanitized = sanitized.replace(/\/(?:[a-zA-Z0-9_.-]+\/)+[a-zA-Z0-9_.-]+/g, '[redacted_path]');
  return sanitized;
}

/**
 * Secure global error handling middleware.
 * Prevents information disclosure: never exposes stack traces or file system paths in production.
 */
export function secureErrorHandler(
  err: SecureError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  const isProd = env.NODE_ENV === 'production';

  const rawMessage = err.message || 'An unexpected error occurred.';
  const safeMessage =
    statusCode === 500 && isProd
      ? 'An internal server error occurred.'
      : sanitizeErrorMessage(rawMessage);

  // Construct standard error response envelope
  const errorResponse: ApiErrorResponse = {
    success: false,
    error: {
      code: err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR'),
      message: safeMessage,
      details: !isProd && err.details ? err.details : undefined,
    },
    timestamp: new Date().toISOString(),
  };

  // Internal logging server-side only
  if (statusCode === 500) {
    console.error('[Internal Error]:', err);
  }

  res.status(statusCode).json(errorResponse);
}

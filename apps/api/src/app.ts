import express, { Express, Request, Response } from 'express';
import { apiRouter } from './routes/index.js';
import { healthRouter } from './routes/health.router.js';
import { ApiErrorResponse } from '@n1/shared';
import {
  configureHelmet,
  configureCors,
  configureBodyLimits,
  noSqlSanitizer,
  globalRateLimiter,
  secureErrorHandler,
} from './security/index.js';
import { metricsService } from './services/metrics.service.js';

export function createApp(): Express {
  const app = express();

  // Operational Observability: Latency and Status Code Tracking (Zero Personal Data)
  app.use((_req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      metricsService.recordRequest(duration, res.statusCode);
    });
    next();
  });

  // 1. Hardened Helmet Security Headers
  configureHelmet(app);

  // 2. Environment-Aware CORS
  configureCors(app);

  // 3. Global Request Size Limits (1MB)
  configureBodyLimits(app);

  // 4. NoSQL / MongoDB Operator Injection Sanitizer
  app.use(noSqlSanitizer);

  // 5. Global Rate Limiter
  app.use(globalRateLimiter);

  // Root health check (standard cloud load balancer endpoint)
  app.use('/health', healthRouter);

  // Versioned API routes (/api/v1/...) and standard /api routes
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter);

  // Root welcome route
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      name: 'N1 API Service',
      version: '1.0.0',
      status: 'online',
      documentation: '/api/v1/health',
    });
  });

  // 404 Not Found handler
  app.use((req: Request, res: Response) => {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${req.method} ${req.originalUrl} not found`,
      },
      timestamp: new Date().toISOString(),
    };
    res.status(404).json(errorResponse);
  });

  // 5. Secure Error Handler (prevents stack trace disclosure in production)
  app.use(secureErrorHandler);

  return app;
}

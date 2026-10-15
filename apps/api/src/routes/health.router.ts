import { Router, Request, Response } from 'express';
import { ApiResponse, HealthCheckData } from '@n1/shared';
import { env } from '../config/env.js';
import { isDatabaseConnected } from '../database/connection.js';
import mongoose from 'mongoose';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  const dbConnected = isDatabaseConnected();

  const data: HealthCheckData = {
    status: dbConnected ? 'ok' : 'degraded',
    service: 'n1-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: env.NODE_ENV,
    database: {
      connected: dbConnected,
      name: mongoose.connection.name || undefined,
    },
    storage: {
      driver: env.STORAGE_DRIVER,
      healthy: true,
    },
  };

  const response: ApiResponse<HealthCheckData> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };

  res.status(200).json(response);
});

healthRouter.get('/metrics', async (_req: Request, res: Response) => {
  const { metricsService } = await import('../services/metrics.service.js');
  const metrics = await metricsService.getMetricsSnapshot();

  res.status(200).json({
    success: true,
    data: metrics,
    timestamp: new Date().toISOString(),
  });
});


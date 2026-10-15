import { z } from 'zod';

export const HealthCheckResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'error']),
  service: z.string(),
  version: z.string(),
  timestamp: z.string().datetime(),
  uptimeSeconds: z.number().nonnegative(),
  environment: z.string(),
  database: z
    .object({
      connected: z.boolean(),
      name: z.string().optional(),
    })
    .optional(),
  storage: z
    .object({
      driver: z.string(),
      healthy: z.boolean(),
    })
    .optional(),
});

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;

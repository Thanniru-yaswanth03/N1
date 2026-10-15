import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service.js';
import { ApiErrorResponse } from '@n1/shared';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      adminUser?: string;
    }
  }
}

/**
 * Authorization middleware for all admin routes.
 * Supports Bearer Session Token and direct x-admin-key header.
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const adminKeyHeader = req.headers['x-admin-key'] as string | undefined;

  // 1. Check API Key
  if (adminKeyHeader) {
    if (adminService.verifyApiKey(adminKeyHeader)) {
      req.adminUser = 'api-key-admin';
      return next();
    }
  }

  // 2. Check Bearer Token
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const result = adminService.verifyAdminToken(token);
    if (result.valid) {
      req.adminUser = result.username || 'admin';
      return next();
    }
  }

  const errorResponse: ApiErrorResponse = {
    success: false,
    error: {
      code: 'ADMIN_UNAUTHORIZED',
      message: 'Access denied: Valid admin credentials or API key required',
    },
    timestamp: new Date().toISOString(),
  };

  res.status(401).json(errorResponse);
}

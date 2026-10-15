import { Router, Request, Response, NextFunction } from 'express';
import {
  adminLoginSchema,
  updateAbuseReportSchema,
  blockSourceSchema,
} from '@n1/validation';
import { adminService } from '../services/admin.service.js';
import { blockedSourceService } from '../services/blocked-source.service.js';
import { auditLogger } from '../services/audit-logger.service.js';
import {
  requireAdminAuth,
  adminLoginRateLimiter,
  adminApiRateLimiter,
  hashIp,
} from '../security/index.js';

export const adminRouter = Router();

/**
 * POST /api/admin/auth/login
 * Authenticates admin and returns a signed session token.
 */
adminRouter.post(
  '/auth/login',
  adminLoginRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parseResult = adminLoginSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid login parameters',
            details: parseResult.error.errors.map(e => ({
              field: e.path.join('.'),
              issue: e.message,
            })),
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const ipHash = hashIp(clientIp);

      const isValid = await adminService.verifyCredentials(
        parseResult.data.username,
        parseResult.data.password,
        ipHash
      );

      if (!isValid) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_ADMIN_CREDENTIALS',
            message: 'Invalid admin username or password',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const token = adminService.generateAdminToken(parseResult.data.username);
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

      res.status(200).json({
        success: true,
        data: {
          token,
          username: parseResult.data.username,
          expiresAt,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }
);

/**
 * GET /api/admin/auth/me
 * Verifies the current admin session.
 */
adminRouter.get(
  '/auth/me',
  requireAdminAuth,
  (req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      data: {
        username: req.adminUser,
        role: 'admin',
      },
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * POST /api/admin/auth/logout
 * Logs the admin session out.
 */
adminRouter.post(
  '/auth/logout',
  requireAdminAuth,
  async (req: Request, res: Response): Promise<void> => {
    await auditLogger.log({
      eventType: 'ADMIN_LOGOUT',
      severity: 'info',
      adminUser: req.adminUser,
      action: 'Admin logged out',
    });

    res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully' },
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * GET /api/admin/drops
 * Lists active and expired Drops with filtering.
 */
adminRouter.get(
  '/drops',
  requireAdminAuth,
  adminApiRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const type = typeof req.query.type === 'string' ? req.query.type : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const limit = Number(req.query.limit) || 25;
      const skip = Number(req.query.skip) || 0;

      const { drops, total } = await adminService.listDrops({
        status,
        type,
        search,
        limit,
        skip,
      });

      res.status(200).json({
        success: true,
        data: {
          drops,
          total,
          limit,
          skip,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }
);

/**
 * GET /api/admin/drops/:code
 * Inspects Drop metadata with sensitive secrets redacted.
 */
adminRouter.get(
  '/drops/:code',
  requireAdminAuth,
  adminApiRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const code = req.params.code?.toUpperCase().trim();
      if (!code) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_CODE', message: 'Drop code is required' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const drop = await adminService.inspectDrop(code);
      if (!drop) {
        res.status(404).json({
          success: false,
          error: { code: 'DROP_NOT_FOUND', message: 'Drop not found' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: drop,
        timestamp: new Date().toISOString(),
      });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }
);

/**
 * DELETE /api/admin/drops/:code
 * Permanently deletes / purges a Drop.
 */
adminRouter.delete(
  '/drops/:code',
  requireAdminAuth,
  adminApiRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const code = req.params.code?.toUpperCase().trim();
      if (!code) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_CODE', message: 'Drop code is required' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const reason = typeof req.body?.reason === 'string' ? req.body.reason : 'Admin removal';

      const deleted = await adminService.deleteDropByAdmin(code, req.adminUser || 'admin', reason);
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: { code: 'DROP_NOT_FOUND', message: 'Drop not found' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { message: `Drop ${code} successfully deleted` },
        timestamp: new Date().toISOString(),
      });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }
);

/**
 * GET /api/admin/reports
 * Lists abuse reports.
 */
adminRouter.get(
  '/reports',
  requireAdminAuth,
  adminApiRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const reports = await adminService.listAbuseReports(status);

      res.status(200).json({
        success: true,
        data: reports,
        timestamp: new Date().toISOString(),
      });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }
);

/**
 * PATCH /api/admin/reports/:id
 * Updates an abuse report status and resolution.
 */
adminRouter.patch(
  '/reports/:id',
  requireAdminAuth,
  adminApiRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parseResult = updateAbuseReportSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid update parameters',
            details: parseResult.error.errors.map(e => ({
              field: e.path.join('.'),
              issue: e.message,
            })),
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const reportId = req.params.id;
      if (!reportId) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_ID', message: 'Report ID is required' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const updated = await adminService.updateAbuseReport(
        reportId,
        parseResult.data,
        req.adminUser || 'admin'
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          error: { code: 'REPORT_NOT_FOUND', message: 'Abuse report not found' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: updated,
        timestamp: new Date().toISOString(),
      });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }
);

/**
 * GET /api/admin/blocked-sources
 * Lists blocked source IP hashes.
 */
adminRouter.get(
  '/blocked-sources',
  requireAdminAuth,
  adminApiRateLimiter,
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const blocked = await blockedSourceService.listBlocked();
      res.status(200).json({
        success: true,
        data: blocked,
        timestamp: new Date().toISOString(),
      });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }
);

/**
 * POST /api/admin/blocked-sources
 * Blocks a source IP hash.
 */
adminRouter.post(
  '/blocked-sources',
  requireAdminAuth,
  adminApiRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parseResult = blockSourceSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid block parameters',
            details: parseResult.error.errors.map(e => ({
              field: e.path.join('.'),
              issue: e.message,
            })),
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const doc = await blockedSourceService.blockSource({
        ipHash: parseResult.data.ipHash,
        reason: parseResult.data.reason,
        blockedBy: req.adminUser || 'admin',
        durationHours: parseResult.data.durationHours,
      });

      res.status(201).json({
        success: true,
        data: {
          id: doc._id.toString(),
          ipHash: doc.ipHash,
          reason: doc.reason,
          blockedBy: doc.blockedBy,
          blockedAt: doc.blockedAt.toISOString(),
          expiresAt: doc.expiresAt ? doc.expiresAt.toISOString() : null,
          isActive: doc.isActive,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }
);

/**
 * DELETE /api/admin/blocked-sources/:ipHash
 * Unblocks a source IP hash.
 */
adminRouter.delete(
  '/blocked-sources/:ipHash',
  requireAdminAuth,
  adminApiRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ipHash = req.params.ipHash;
      if (!ipHash) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_IP_HASH', message: 'IP hash is required' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const unblocked = await blockedSourceService.unblockSource(
        ipHash,
        req.adminUser || 'admin'
      );

      if (!unblocked) {
        res.status(404).json({
          success: false,
          error: { code: 'SOURCE_NOT_FOUND', message: 'Blocked source not found or already inactive' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { message: 'Source unblocked successfully' },
        timestamp: new Date().toISOString(),
      });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }
);

/**
 * GET /api/admin/system/health
 * Returns system health metrics.
 */
adminRouter.get(
  '/system/health',
  requireAdminAuth,
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const health = await adminService.getSystemHealth();
      res.status(200).json({
        success: true,
        data: health,
        timestamp: new Date().toISOString(),
      });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }
);

/**
 * GET /api/admin/system/storage
 * Returns physical storage disk usage.
 */
adminRouter.get(
  '/system/storage',
  requireAdminAuth,
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storage = await adminService.getStorageMetrics();
      res.status(200).json({
        success: true,
        data: storage,
        timestamp: new Date().toISOString(),
      });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }
);

/**
 * GET /api/admin/system/stats
 * Returns upload/download and drop metrics.
 */
adminRouter.get(
  '/system/stats',
  requireAdminAuth,
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await adminService.getTelemetryStatistics();
      res.status(200).json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }
);

/**
 * GET /api/admin/audit-logs
 * Queries security audit logs.
 */
adminRouter.get(
  '/audit-logs',
  requireAdminAuth,
  adminApiRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = Number(req.query.limit) || 50;
      const skip = Number(req.query.skip) || 0;
      const severity = typeof req.query.severity === 'string' ? req.query.severity : undefined;
      const eventType = typeof req.query.eventType === 'string' ? req.query.eventType : undefined;

      const { logs, total } = await auditLogger.query({
        limit,
        skip,
        severity,
        eventType,
      });

      res.status(200).json({
        success: true,
        data: {
          logs,
          total,
          limit,
          skip,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }
);

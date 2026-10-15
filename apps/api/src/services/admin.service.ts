import crypto from 'node:crypto';
import mongoose from 'mongoose';
import {
  AdminDropDetail,
  AdminDropListItem,
  AbuseReport,
  SystemHealthMetrics,
  StorageMetrics,
  TelemetryStatistics,
} from '@n1/shared';
import { CreateAbuseReportInput, UpdateAbuseReportInput } from '@n1/validation';
import { env } from '../config/env.js';
import { timingSafeEqual } from '../security/tokens.js';
import { Drop } from '../models/drop.model.js';
import { DropFile } from '../models/drop-file.model.js';
import { AbuseReport as AbuseReportModel } from '../models/abuse-report.model.js';
import { BlockedSource } from '../models/blocked-source.model.js';
import { storageService } from './storage.service.js';
import { auditLogger } from './audit-logger.service.js';

export class AdminService {
  /**
   * Constant-time comparison of admin credentials.
   */
  async verifyCredentials(username: string, password: string, clientIpHash?: string): Promise<boolean> {
    const isUserValid = timingSafeEqual(username, env.ADMIN_USERNAME);
    const isPassValid = timingSafeEqual(password, env.ADMIN_PASSWORD);

    const success = isUserValid && isPassValid;

    await auditLogger.log({
      eventType: success ? 'ADMIN_LOGIN_SUCCESS' : 'ADMIN_LOGIN_FAILED',
      severity: success ? 'info' : 'security',
      adminUser: isUserValid ? username : 'unknown',
      action: success ? 'Admin logged in successfully' : 'Failed admin login attempt',
      ipHash: clientIpHash,
    });

    return success;
  }

  /**
   * Generates a signed, stateless Admin Session Token.
   */
  generateAdminToken(username: string): string {
    const now = Date.now();
    const ttlMs = 2 * 60 * 60 * 1000; // 2 hours
    const exp = now + ttlMs;

    const payload = JSON.stringify({
      sub: username,
      role: 'admin',
      exp,
    });

    const b64Payload = Buffer.from(payload).toString('base64url');
    const signature = crypto
      .createHmac('sha256', env.JWT_SECRET)
      .update(b64Payload)
      .digest('base64url');

    return `${b64Payload}.${signature}`;
  }

  /**
   * Validates an Admin Session Token.
   */
  verifyAdminToken(token: string): { valid: boolean; username?: string } {
    if (!token || typeof token !== 'string') return { valid: false };

    const parts = token.split('.');
    if (parts.length !== 2) return { valid: false };

    const [b64Payload, signature] = parts;
    if (!b64Payload || !signature) return { valid: false };

    const expectedSignature = crypto
      .createHmac('sha256', env.JWT_SECRET)
      .update(b64Payload)
      .digest('base64url');

    if (!timingSafeEqual(signature, expectedSignature)) {
      return { valid: false };
    }

    try {
      const payloadStr = Buffer.from(b64Payload, 'base64url').toString('utf8');
      const payload = JSON.parse(payloadStr);

      if (payload.role !== 'admin' || Date.now() > payload.exp) {
        return { valid: false };
      }

      return { valid: true, username: payload.sub };
    } catch {
      return { valid: false };
    }
  }

  /**
   * Verifies an Admin API key.
   */
  verifyApiKey(key: string): boolean {
    if (!key || typeof key !== 'string') return false;
    return timingSafeEqual(key, env.ADMIN_API_KEY);
  }

  /**
   * Lists paginated drops for admin inspection with search and status filters.
   */
  async listDrops(options: {
    status?: string;
    type?: string;
    search?: string;
    limit?: number;
    skip?: number;
  } = {}): Promise<{ drops: AdminDropListItem[]; total: number }> {
    const limit = Math.min(100, Math.max(1, options.limit || 25));
    const skip = Math.max(0, options.skip || 0);

    const filter: Record<string, unknown> = {};

    if (options.status) {
      filter['status'] = options.status;
    }
    if (options.type) {
      filter['type'] = options.type;
    }
    if (options.search) {
      const clean = options.search.toUpperCase().trim();
      filter['code'] = { $regex: clean };
    }

    const [docs, total] = await Promise.all([
      Drop.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      Drop.countDocuments(filter).exec(),
    ]);

    const drops: AdminDropListItem[] = docs.map(d => ({
      id: d._id.toString(),
      code: d.code,
      type: d.type,
      totalSizeBytes: d.totalSizeBytes,
      fileCount: d.fileCount,
      hasPassword: Boolean(d.passwordHash),
      viewCount: d.viewCount,
      viewLimit: d.viewLimit,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
      expiresAt: d.expiresAt.toISOString(),
      isExpired: d.isExpired,
    }));

    return { drops, total };
  }

  /**
   * Inspects detailed metadata of a drop.
   * STRICT SECURITY: Excludes passwordHash, ownerDeleteTokenHash, and physical file paths!
   */
  async inspectDrop(code: string): Promise<AdminDropDetail | null> {
    const drop = await Drop.findOne({ code: code.toUpperCase().trim() })
      .lean()
      .exec();

    if (!drop) return null;

    const files = await DropFile.find({ dropId: drop._id.toString() })
      .lean()
      .exec();

    return {
      id: drop._id.toString(),
      code: drop.code,
      type: drop.type,
      textContent: drop.textContent,
      totalSizeBytes: drop.totalSizeBytes,
      fileCount: drop.fileCount,
      hasPassword: Boolean(drop.passwordHash),
      viewLimit: drop.viewLimit,
      viewCount: drop.viewCount,
      burnAfterReading: drop.burnAfterReading,
      status: drop.status,
      createdAt: drop.createdAt.toISOString(),
      expiresAt: drop.expiresAt.toISOString(),
      isExpired: drop.isExpired,
      ipHash: drop.ipHash,
      files: files.map(f => ({
        id: f._id.toString(),
        originalName: f.originalName,
        fileSizeBytes: f.fileSizeBytes,
        mimeType: f.mimeType,
        extension: f.extension,
        checksum: f.checksum,
      })),
    };
  }

  /**
   * Admin deletion: purges physical files and deletes drop metadata.
   */
  async deleteDropByAdmin(code: string, adminUser: string, reason = 'Admin manual deletion'): Promise<boolean> {
    const drop = await Drop.findOne({ code: code.toUpperCase().trim() }).exec();
    if (!drop) return false;

    // Purge associated physical files from storage
    const files = await DropFile.find({ dropId: drop._id.toString() }).exec();
    for (const f of files) {
      await storageService.deleteFile(f.filePath).catch(() => {});
    }

    // Delete file records
    await DropFile.deleteMany({ dropId: drop._id.toString() }).exec();

    // Mark drop as deleted
    drop.status = 'deleted';
    drop.textContent = null;
    drop.isExpired = true;
    await drop.save();

    await auditLogger.log({
      eventType: 'DROP_DELETED_BY_ADMIN',
      severity: 'warn',
      adminUser,
      targetId: drop.code,
      action: `Deleted drop ${drop.code}: ${reason}`,
      details: { fileCount: files.length, totalSize: drop.totalSizeBytes },
      ipHash: drop.ipHash,
    });

    return true;
  }

  /**
   * Lists abuse reports.
   */
  async listAbuseReports(status?: string): Promise<AbuseReport[]> {
    const filter: Record<string, unknown> = {};
    if (status) {
      filter['status'] = status;
    }

    const docs = await AbuseReportModel.find(filter)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return docs.map(d => ({
      id: d._id.toString(),
      dropCode: d.dropCode,
      reason: d.reason,
      description: d.description,
      reporterIpHash: d.reporterIpHash,
      status: d.status,
      resolutionNote: d.resolutionNote || undefined,
      resolvedBy: d.resolvedBy || undefined,
      createdAt: d.createdAt.toISOString(),
      resolvedAt: d.resolvedAt ? d.resolvedAt.toISOString() : undefined,
    }));
  }

  /**
   * Creates an abuse report submitted by a recipient.
   */
  async createAbuseReport(
    dropCode: string,
    input: CreateAbuseReportInput,
    reporterIpHash: string
  ): Promise<AbuseReport> {
    const report = new AbuseReportModel({
      dropCode: dropCode.toUpperCase().trim(),
      reason: input.reason,
      description: input.description,
      reporterIpHash,
      status: 'pending',
      createdAt: new Date(),
    });

    const saved = await report.save();

    await auditLogger.log({
      eventType: 'ABUSE_REPORT_SUBMITTED',
      severity: 'warn',
      adminUser: 'recipient',
      targetId: dropCode.toUpperCase().trim(),
      action: `Abuse report submitted for reason: ${input.reason}`,
      details: { reportId: saved._id.toString() },
      ipHash: reporterIpHash,
    });

    return {
      id: saved._id.toString(),
      dropCode: saved.dropCode,
      reason: saved.reason,
      description: saved.description,
      reporterIpHash: saved.reporterIpHash,
      status: saved.status,
      createdAt: saved.createdAt.toISOString(),
    };
  }

  /**
   * Updates an abuse report status.
   */
  async updateAbuseReport(
    id: string,
    input: UpdateAbuseReportInput,
    adminUser: string
  ): Promise<AbuseReport | null> {
    const report = await AbuseReportModel.findById(id).exec();
    if (!report) return null;

    report.status = input.status;
    if (input.resolutionNote !== undefined) {
      report.resolutionNote = input.resolutionNote;
    }
    report.resolvedBy = adminUser;
    report.resolvedAt = new Date();

    const saved = await report.save();

    await auditLogger.log({
      eventType: 'ABUSE_REPORT_RESOLVED',
      severity: 'info',
      adminUser,
      targetId: report.dropCode,
      action: `Abuse report ${id} marked as ${input.status}`,
      details: { note: input.resolutionNote },
    });

    return {
      id: saved._id.toString(),
      dropCode: saved.dropCode,
      reason: saved.reason,
      description: saved.description,
      reporterIpHash: saved.reporterIpHash,
      status: saved.status,
      resolutionNote: saved.resolutionNote || undefined,
      resolvedBy: saved.resolvedBy || undefined,
      createdAt: saved.createdAt.toISOString(),
      resolvedAt: saved.resolvedAt?.toISOString(),
    };
  }

  /**
   * Inspects live system health metrics.
   */
  async getSystemHealth(): Promise<SystemHealthMetrics> {
    const startTime = Date.now();
    let dbStatus = 'connected';
    let latencyMs = 0;

    try {
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
        latencyMs = Date.now() - startTime;
      } else {
        dbStatus = 'disconnected';
      }
    } catch {
      dbStatus = 'error';
    }

    const mem = process.memoryUsage();

    return {
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        rssBytes: mem.rss,
        heapUsedBytes: mem.heapUsed,
        heapTotalBytes: mem.heapTotal,
      },
      nodeVersion: process.version,
      database: {
        status: dbStatus,
        latencyMs,
      },
      worker: {
        active: true,
        intervalSeconds: env.CLEANUP_INTERVAL_SECONDS,
      },
    };
  }

  /**
   * Retrieves physical disk storage metrics.
   */
  async getStorageMetrics(): Promise<StorageMetrics> {
    return storageService.getStorageStats();
  }

  /**
   * Computes aggregate platform statistics.
   */
  async getTelemetryStatistics(): Promise<TelemetryStatistics> {
    const [
      totalDropsCreated,
      activeDropsCount,
      expiredDropsCount,
      burnedDropsCount,
      viewsAggregate,
      textDropsCount,
      fileDropsCount,
      bytesAggregate,
      totalAbuseReports,
      pendingAbuseReports,
      blockedSourcesCount,
    ] = await Promise.all([
      Drop.countDocuments({}).exec(),
      Drop.countDocuments({ status: 'active' }).exec(),
      Drop.countDocuments({ status: 'expired' }).exec(),
      Drop.countDocuments({ status: 'burned' }).exec(),
      Drop.aggregate([{ $group: { _id: null, totalViews: { $sum: '$viewCount' } } }]).exec(),
      Drop.countDocuments({ type: 'text' }).exec(),
      Drop.countDocuments({ type: 'file' }).exec(),
      Drop.aggregate([{ $group: { _id: null, totalBytes: { $sum: '$totalSizeBytes' } } }]).exec(),
      AbuseReportModel.countDocuments({}).exec(),
      AbuseReportModel.countDocuments({ status: 'pending' }).exec(),
      BlockedSource.countDocuments({ isActive: true }).exec(),
    ]);

    const totalViewsCount = viewsAggregate[0]?.totalViews || 0;
    const totalBytesStored = bytesAggregate[0]?.totalBytes || 0;

    return {
      totalDropsCreated,
      activeDropsCount,
      expiredDropsCount,
      burnedDropsCount,
      totalViewsCount,
      textDropsCount,
      fileDropsCount,
      totalBytesStored,
      totalAbuseReports,
      pendingAbuseReports,
      blockedSourcesCount,
    };
  }
}

export const adminService = new AdminService();

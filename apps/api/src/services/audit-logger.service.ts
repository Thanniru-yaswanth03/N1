import { AuditLog, IAuditLogDocument } from '../models/audit-log.model.js';
import { AuditLogEvent, AuditLogSeverity } from '@n1/shared';

export interface CreateAuditLogParams {
  eventType: string;
  severity?: AuditLogSeverity;
  adminUser?: string;
  targetId?: string;
  action: string;
  details?: Record<string, unknown>;
  ipHash?: string;
}

export class AuditLoggerService {
  /**
   * Records a security or administrative audit log event.
   */
  async log(params: CreateAuditLogParams): Promise<IAuditLogDocument> {
    try {
      const entry = new AuditLog({
        eventType: params.eventType,
        severity: params.severity || 'info',
        adminUser: params.adminUser || 'system',
        targetId: params.targetId || null,
        action: params.action,
        details: params.details || {},
        ipHash: params.ipHash || '',
        timestamp: new Date(),
      });
      return await entry.save();
    } catch (err) {
      console.error('[AuditLogger] Failed to write audit log entry', err);
      // Fallback object so operations aren't blocked by log failures
      return {
        ...params,
        timestamp: new Date(),
      } as unknown as IAuditLogDocument;
    }
  }

  /**
   * Queries paginated audit logs.
   */
  async query(options: {
    limit?: number;
    skip?: number;
    severity?: string;
    eventType?: string;
  } = {}): Promise<{ logs: AuditLogEvent[]; total: number }> {
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const skip = Math.max(0, options.skip || 0);

    const filter: Record<string, unknown> = {};
    if (options.severity) {
      filter['severity'] = options.severity;
    }
    if (options.eventType) {
      filter['eventType'] = options.eventType;
    }

    const [docs, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean().exec(),
      AuditLog.countDocuments(filter).exec(),
    ]);

    const logs: AuditLogEvent[] = docs.map(d => ({
      id: d._id.toString(),
      eventType: d.eventType,
      severity: d.severity,
      adminUser: d.adminUser,
      targetId: d.targetId || undefined,
      action: d.action,
      details: d.details as Record<string, unknown>,
      ipHash: d.ipHash || undefined,
      timestamp: d.timestamp.toISOString(),
    }));

    return { logs, total };
  }
}

export const auditLogger = new AuditLoggerService();

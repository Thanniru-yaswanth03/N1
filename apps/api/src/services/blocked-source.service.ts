import { BlockedSource, IBlockedSourceDocument } from '../models/blocked-source.model.js';
import { BlockedSource as IBlockedSource } from '@n1/shared';
import { auditLogger } from './audit-logger.service.js';

export class BlockedSourceService {
  /**
   * Checks if an IP hash is currently blocked and unexpired.
   */
  async isBlocked(ipHash: string): Promise<boolean> {
    if (!ipHash) return false;

    const source = await BlockedSource.findOne({
      ipHash,
      isActive: true,
    }).exec();

    if (!source) return false;

    // Check expiration
    if (source.expiresAt && source.expiresAt.getTime() <= Date.now()) {
      source.isActive = false;
      await source.save();
      return false;
    }

    return true;
  }

  /**
   * Blocks a source IP hash.
   */
  async blockSource(params: {
    ipHash: string;
    reason: string;
    blockedBy: string;
    durationHours?: number;
  }): Promise<IBlockedSourceDocument> {
    const expiresAt = params.durationHours
      ? new Date(Date.now() + params.durationHours * 3600 * 1000)
      : null;

    const source = await BlockedSource.findOneAndUpdate(
      { ipHash: params.ipHash },
      {
        $set: {
          reason: params.reason,
          blockedBy: params.blockedBy,
          blockedAt: new Date(),
          expiresAt,
          isActive: true,
        },
      },
      { upsert: true, returnDocument: 'after' }
    ).exec();

    await auditLogger.log({
      eventType: 'SOURCE_BLOCKED',
      severity: 'security',
      adminUser: params.blockedBy,
      targetId: params.ipHash,
      action: `Blocked source with reason: ${params.reason}`,
      details: { expiresAt: expiresAt?.toISOString() || 'permanent' },
      ipHash: params.ipHash,
    });

    return source as IBlockedSourceDocument;
  }

  /**
   * Unblocks a source IP hash.
   */
  async unblockSource(ipHash: string, adminUser: string): Promise<boolean> {
    const result = await BlockedSource.findOneAndUpdate(
      { ipHash, isActive: true },
      { $set: { isActive: false } },
      { returnDocument: 'after' }
    ).exec();

    if (result) {
      await auditLogger.log({
        eventType: 'SOURCE_UNBLOCKED',
        severity: 'info',
        adminUser,
        targetId: ipHash,
        action: `Unblocked source`,
        ipHash,
      });
      return true;
    }
    return false;
  }

  /**
   * Lists all active blocked sources.
   */
  async listBlocked(): Promise<IBlockedSource[]> {
    const docs = await BlockedSource.find({ isActive: true })
      .sort({ blockedAt: -1 })
      .lean()
      .exec();

    return docs.map(d => ({
      id: d._id.toString(),
      ipHash: d.ipHash,
      reason: d.reason,
      blockedBy: d.blockedBy,
      blockedAt: d.blockedAt.toISOString(),
      expiresAt: d.expiresAt ? d.expiresAt.toISOString() : null,
      isActive: d.isActive,
    }));
  }
}

export const blockedSourceService = new BlockedSourceService();

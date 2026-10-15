import { Drop, IDropDocument } from '../models/drop.model.js';
import { DropModelStatus } from '@n1/shared';

export interface IDropRepository {
  create(data: Partial<IDropDocument>): Promise<IDropDocument>;
  findById(id: string): Promise<IDropDocument | null>;
  findByCode(code: string): Promise<IDropDocument | null>;
  incrementViewCount(id: string): Promise<IDropDocument | null>;
  atomicIncrementViewIfAllowed(
    id: string,
    viewLimit: number | null
  ): Promise<{ allowed: boolean; drop: IDropDocument | null }>;
  atomicBurnTextDrop(id: string): Promise<IDropDocument | null>;
  atomicBurnFileDrop(id: string): Promise<boolean>;
  updateStatus(id: string, status: DropModelStatus): Promise<IDropDocument | null>;
  markAsExpired(id: string): Promise<IDropDocument | null>;
  markAsBurned(id: string): Promise<IDropDocument | null>;
  markAsDeleted(id: string): Promise<IDropDocument | null>;
  findExpiredPendingDrops(limit?: number, referenceTime?: Date): Promise<IDropDocument[]>;
  findExpiredTombstones(cutoffDate: Date, limit?: number): Promise<IDropDocument[]>;
  purgeDropContent(id: string, keepBurnedStatus?: boolean): Promise<IDropDocument | null>;
  deleteById(id: string): Promise<boolean>;
  deleteByCode(code: string): Promise<boolean>;
  countActive(): Promise<number>;
}

export class DropRepository implements IDropRepository {
  /**
   * Persists a new Drop document to MongoDB.
   */
  async create(data: Partial<IDropDocument>): Promise<IDropDocument> {
    const drop = new Drop(data);
    return drop.save();
  }

  /**
   * Retrieves a Drop by its MongoDB ObjectId.
   */
  async findById(id: string): Promise<IDropDocument | null> {
    return Drop.findById(id).exec();
  }

  /**
   * Retrieves a Drop by its 6-character short code.
   */
  async findByCode(code: string): Promise<IDropDocument | null> {
    return Drop.findOne({ code: code.toUpperCase().trim() }).exec();
  }

  /**
   * Atomically increments the view count of a Drop.
   */
  async incrementViewCount(id: string): Promise<IDropDocument | null> {
    return Drop.findByIdAndUpdate(
      id,
      { $inc: { viewCount: 1 } },
      { returnDocument: 'after' }
    ).exec();
  }

  /**
   * Atomically increments view count if and only if view limit is not exceeded and drop is active.
   * Completely eliminates race condition view-limit bypasses.
   */
  async atomicIncrementViewIfAllowed(
    id: string,
    viewLimit: number | null
  ): Promise<{ allowed: boolean; drop: IDropDocument | null }> {
    const now = new Date();
    const filter: Record<string, unknown> = {
      _id: id,
      status: 'active',
      isExpired: false,
      expiresAt: { $gt: now },
    };

    if (viewLimit !== null) {
      filter['viewCount'] = { $lt: viewLimit };
    }

    const updated = await Drop.findOneAndUpdate(
      filter,
      { $inc: { viewCount: 1 } },
      { returnDocument: 'after' }
    ).exec();

    if (!updated) {
      return { allowed: false, drop: null };
    }

    // If new viewCount meets or exceeds viewLimit, transition to expired
    if (viewLimit !== null && updated.viewCount >= viewLimit) {
      await Drop.findByIdAndUpdate(id, {
        $set: { status: 'expired', isExpired: true },
      }).exec();
    }

    return { allowed: true, drop: updated };
  }

  /**
   * Atomically claims and burns a burn-after-reading text drop upon initial read.
   * Prevents concurrent race conditions where multiple recipients read the same burned drop.
   */
  async atomicBurnTextDrop(id: string): Promise<IDropDocument | null> {
    const now = new Date();
    return Drop.findOneAndUpdate(
      {
        _id: id,
        status: 'active',
        isExpired: false,
        expiresAt: { $gt: now },
        burnAfterReading: true,
      },
      {
        $set: { status: 'burned', isExpired: true },
        $inc: { viewCount: 1 },
      },
      { returnDocument: 'before' }
    ).exec();
  }

  /**
   * Atomically marks a burn-after-reading file drop as burned upon first download/read.
   */
  async atomicBurnFileDrop(id: string): Promise<boolean> {
    const now = new Date();
    const updated = await Drop.findOneAndUpdate(
      {
        _id: id,
        status: 'active',
        isExpired: false,
        expiresAt: { $gt: now },
        burnAfterReading: true,
      },
      {
        $set: { status: 'burned', isExpired: true },
      },
      { returnDocument: 'after' }
    ).exec();
    return Boolean(updated);
  }

  /**
   * Updates the lifecycle status of a Drop.
   */
  async updateStatus(id: string, status: DropModelStatus): Promise<IDropDocument | null> {
    return Drop.findByIdAndUpdate(
      id,
      {
        $set: {
          status,
          isExpired: status === 'expired' || status === 'burned' || status === 'deleted',
        },
      },
      { returnDocument: 'after' }
    ).exec();
  }

  /**
   * Marks a drop as expired.
   */
  async markAsExpired(id: string): Promise<IDropDocument | null> {
    return this.updateStatus(id, 'expired');
  }

  /**
   * Marks a drop as burned (one-time burn after reading).
   */
  async markAsBurned(id: string): Promise<IDropDocument | null> {
    return this.updateStatus(id, 'burned');
  }

  /**
   * Marks a drop as deleted (manual owner deletion).
   */
  async markAsDeleted(id: string): Promise<IDropDocument | null> {
    return this.updateStatus(id, 'deleted');
  }

  /**
   * Finds all drops that have passed their expiration timestamp but still require content purging.
   * Leverages the compound indexes on expiresAt.
   */
  async findExpiredPendingDrops(limit = 100, referenceTime: Date = new Date()): Promise<IDropDocument[]> {
    return Drop.find({
      $or: [
        { expiresAt: { $lte: referenceTime }, isExpired: false },
        { expiresAt: { $lte: referenceTime }, fileCount: { $gt: 0 } },
        { expiresAt: { $lte: referenceTime }, textContent: { $ne: null } },
      ],
    })
      .limit(limit)
      .exec();
  }

  /**
   * Finds tombstone drop records that have exceeded the retention window.
   */
  async findExpiredTombstones(cutoffDate: Date, limit = 100): Promise<IDropDocument[]> {
    return Drop.find({
      expiresAt: { $lte: cutoffDate },
    })
      .limit(limit)
      .exec();
  }

  /**
   * Irreversibly purges content from a drop document and marks it expired.
   * Sets isExpired to true, clears textContent, and zeroes counters.
   */
  async purgeDropContent(id: string, keepBurnedStatus = false): Promise<IDropDocument | null> {
    const update: Record<string, unknown> = {
      isExpired: true,
      textContent: null,
      fileCount: 0,
      totalSizeBytes: 0,
    };
    if (!keepBurnedStatus) {
      update['status'] = 'expired';
    }
    return Drop.findByIdAndUpdate(
      id,
      { $set: update },
      { returnDocument: 'after' }
    ).exec();
  }

  /**
   * Permanently deletes a Drop by ID.
   */
  async deleteById(id: string): Promise<boolean> {
    const result = await Drop.findByIdAndDelete(id).exec();
    return Boolean(result);
  }

  /**
   * Permanently deletes a Drop by code.
   */
  async deleteByCode(code: string): Promise<boolean> {
    const result = await Drop.findOneAndDelete({ code: code.toUpperCase().trim() }).exec();
    return Boolean(result);
  }

  /**
   * Returns the count of currently active drops.
   */
  async countActive(): Promise<number> {
    return Drop.countDocuments({ status: 'active', isExpired: false }).exec();
  }
}

export const dropRepository = new DropRepository();

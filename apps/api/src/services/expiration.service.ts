import { StorageService, storageService } from './storage.service.js';
import { DropRepository, dropRepository } from '../repositories/drop.repository.js';
import { DropFileRepository, dropFileRepository } from '../repositories/drop-file.repository.js';
import { boardRoomRepository } from '../repositories/board-room.repository.js';
import { duelRoomRepository } from '../repositories/duel-room.repository.js';
import { env } from '../config/env.js';

export interface CleanupResult {
  processedDrops: number;
  purgedBlobsCount: number;
  deletedFilesCount: number;
  missingFilesCount: number;
  failedFilesCount: number;
  tombstonesDeletedCount: number;
  errors: string[];
}

export interface ExpirationServiceOptions {
  storage?: StorageService;
  dropRepo?: DropRepository;
  dropFileRepo?: DropFileRepository;
  cleanupIntervalMs?: number;
  tombstoneRetentionMs?: number;
  enableLogging?: boolean;
}

export class ExpirationService {
  private readonly storage: StorageService;
  private readonly dropRepo: DropRepository;
  private readonly dropFileRepo: DropFileRepository;
  private readonly cleanupIntervalMs: number;
  private readonly tombstoneRetentionMs: number;
  private readonly enableLogging: boolean;

  private timer: NodeJS.Timeout | null = null;
  private isCleaning = false;
  private active = false;

  constructor(options: ExpirationServiceOptions = {}) {
    this.storage = options.storage ?? storageService;
    this.dropRepo = options.dropRepo ?? dropRepository;
    this.dropFileRepo = options.dropFileRepo ?? dropFileRepository;
    this.cleanupIntervalMs =
      options.cleanupIntervalMs ?? env.CLEANUP_INTERVAL_SECONDS * 1000;
    this.tombstoneRetentionMs =
      options.tombstoneRetentionMs ?? env.TOMBSTONE_RETENTION_SECONDS * 1000;
    this.enableLogging = options.enableLogging ?? (env.NODE_ENV !== 'test');
  }

  /**
   * Starts the background recurring expiration cleanup runner.
   * Runs inside the local Node process with zero external infrastructure (no Redis / paid cron).
   */
  public start(): void {
    if (this.active) {
      return;
    }
    this.active = true;
    if (this.enableLogging) {
      this.safeLog(`[ExpirationEngine] Worker started. Interval: ${this.cleanupIntervalMs / 1000}s`);
    }

    this.timer = setInterval(async () => {
      try {
        await this.cleanExpiredDrops();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.safeWarn(`[ExpirationEngine] Scheduled sweep error: ${msg}`);
      }
    }, this.cleanupIntervalMs);

    // Unref timer so it does not block the Node event loop from terminating if needed
    if (this.timer && typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  /**
   * Stops the background cleanup worker timer.
   */
  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.active = false;
    if (this.enableLogging) {
      this.safeLog('[ExpirationEngine] Worker stopped.');
    }
  }

  /**
   * Returns true if the scheduled worker is currently running.
   */
  public isRunning(): boolean {
    return this.active;
  }

  /**
   * Returns true if a cleanup operation is currently executing.
   */
  public isCleanupInProgress(): boolean {
    return this.isCleaning;
  }

  /**
   * Executes a deterministic cleanup sweep:
   * 1. Purges physical files and clears text for expired drops (`expiresAt <= referenceTime`).
   * 2. Deletes DropFile metadata from database.
   * 3. Marks drop record as expired tombstone (`isExpired: true, textContent: null, fileCount: 0`).
   * 4. Permanently removes tombstone records older than the configured retention threshold.
   *
   * Idempotent: multiple consecutive invocations produce identical safe state.
   * Concurrency-safe: overlapping calls exit immediately with CLEANUP_ALREADY_IN_PROGRESS.
   * Missing-file safe: handles missing physical files without halting.
   */
  public async cleanExpiredDrops(referenceTime?: Date): Promise<CleanupResult> {
    const result: CleanupResult = {
      processedDrops: 0,
      purgedBlobsCount: 0,
      deletedFilesCount: 0,
      missingFilesCount: 0,
      failedFilesCount: 0,
      tombstonesDeletedCount: 0,
      errors: [],
    };

    // Concurrency Lock: Prevent duplicate overlapping execution
    if (this.isCleaning) {
      result.errors.push('CLEANUP_ALREADY_IN_PROGRESS');
      return result;
    }

    this.isCleaning = true;
    const now = referenceTime ?? new Date();

    try {
      // -------------------------------------------------------------
      // Phase 1: Purge Blobs & Text for Expired Pending Drops
      // -------------------------------------------------------------
      const expiredPendingDrops = await this.dropRepo.findExpiredPendingDrops(500, now);

      for (const drop of expiredPendingDrops) {
        try {
          result.processedDrops++;

          // A. Delete associated physical files from disk storage
          const files = await this.dropFileRepo.findByDropId(drop._id);
          for (const file of files) {
            try {
              const deleted = await this.storage.deleteFile(file.filePath);
              if (deleted) {
                result.deletedFilesCount++;
              } else {
                // File was already missing from disk - handled gracefully
                result.missingFilesCount++;
              }
            } catch (fileErr: unknown) {
              result.failedFilesCount++;
              const msg = fileErr instanceof Error ? fileErr.message : String(fileErr);
              result.errors.push(`File deletion failed for drop ${drop.code}: ${msg}`);
              this.safeWarn(`[ExpirationEngine] File deletion error for drop ${drop.code}: ${msg}`);
            }
          }

          // B. Delete DropFile metadata records from database
          if (files.length > 0) {
            const filesDeletedFromDb = await this.dropFileRepo.deleteByDropId(drop._id);
            result.purgedBlobsCount += filesDeletedFromDb;
          }

          // C. Sanitize Drop record: clear text content, zero counters, set isExpired
          await this.dropRepo.purgeDropContent(
            drop._id.toString(),
            drop.status === 'burned'
          );
        } catch (dropErr: unknown) {
          const msg = dropErr instanceof Error ? dropErr.message : String(dropErr);
          result.errors.push(`Purge failed for drop ${drop.code}: ${msg}`);
          this.safeWarn(`[ExpirationEngine] Purge error for drop ${drop.code}: ${msg}`);
        }
      }

      // -------------------------------------------------------------
      // Phase 2: Database Tombstone Retention Cleanup
      // -------------------------------------------------------------
      if (this.tombstoneRetentionMs > 0) {
        const tombstoneCutoff = new Date(now.getTime() - this.tombstoneRetentionMs);
        const tombstones = await this.dropRepo.findExpiredTombstones(tombstoneCutoff, 500);

        for (const tombstone of tombstones) {
          try {
            // Clean up any lingering file metadata if present
            const lingeringFiles = await this.dropFileRepo.findByDropId(tombstone._id);
            for (const f of lingeringFiles) {
              await this.storage.deleteFile(f.filePath).catch(() => {});
            }
            if (lingeringFiles.length > 0) {
              await this.dropFileRepo.deleteByDropId(tombstone._id);
            }

            // Permanently remove Drop record from database
            const deleted = await this.dropRepo.deleteById(tombstone._id.toString());
            if (deleted) {
              result.tombstonesDeletedCount++;
            }
          } catch (tombstoneErr: unknown) {
            const msg = tombstoneErr instanceof Error ? tombstoneErr.message : String(tombstoneErr);
            result.errors.push(`Tombstone purge failed for drop ${tombstone.code}: ${msg}`);
            this.safeWarn(`[ExpirationEngine] Tombstone purge error for drop ${tombstone.code}: ${msg}`);
          }
        }
      }

      // Clean up expired Study Board rooms
      try {
        await boardRoomRepository.deleteExpired(now);
      } catch (boardErr: unknown) {
        const msg = boardErr instanceof Error ? boardErr.message : String(boardErr);
        this.safeWarn(`[ExpirationEngine] Board rooms purge error: ${msg}`);
      }

      // Clean up expired Duel rooms
      try {
        await duelRoomRepository.deleteExpired(now);
      } catch (duelErr: unknown) {
        const msg = duelErr instanceof Error ? duelErr.message : String(duelErr);
        this.safeWarn(`[ExpirationEngine] Duel rooms purge error: ${msg}`);
      }

      // Safe summary logging (does not expose file paths, hashes, or tokens)
      if (
        this.enableLogging &&
        (result.processedDrops > 0 || result.tombstonesDeletedCount > 0)
      ) {
        this.safeLog(
          `[ExpirationEngine] Sweep completed: ${result.processedDrops} drops purged, ` +
            `${result.deletedFilesCount} files unlinked, ` +
            `${result.missingFilesCount} missing files handled, ` +
            `${result.tombstonesDeletedCount} tombstones permanently deleted.`
        );
      }
    } finally {
      this.isCleaning = false;
    }

    return result;
  }

  /**
   * Safe logger preserving privacy - avoids leaking internal filesystem paths or hashes.
   */
  private safeLog(message: string): void {
    console.log(message);
  }

  /**
   * Safe warning logger.
   */
  private safeWarn(message: string): void {
    console.warn(message);
  }
}

export const expirationService = new ExpirationService();

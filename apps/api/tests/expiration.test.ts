import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from '../src/database/connection.js';
import { Drop } from '../src/models/drop.model.js';
import { DropFile } from '../src/models/drop-file.model.js';
import { storageService, StorageService } from '../src/services/storage.service.js';
import { dropRepository } from '../src/repositories/drop.repository.js';
import { dropFileRepository } from '../src/repositories/drop-file.repository.js';
import { ExpirationService } from '../src/services/expiration.service.js';
import { hashPassword } from '../src/security/passwords.js';

describe('N1 Phase 7: Self-Destruct and Expiration Engine Tests', () => {
  const app = createApp();
  const testTrackedCodes: string[] = [];
  const testTrackedFiles: string[] = [];

  const samplePngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
  ]);

  beforeAll(async () => {
    await connectDatabase();
    if (isDatabaseConnected()) {
      await Drop.deleteMany({ expiresAt: { $lt: new Date('2026-10-01T00:00:00Z') } });
    }
  });

  async function cleanDatabaseAndStorage() {
    if (isDatabaseConnected() && testTrackedCodes.length > 0) {
      const drops = await Drop.find({ code: { $in: testTrackedCodes } });
      const dropIds = drops.map(d => d._id);
      const files = await DropFile.find({ dropId: { $in: dropIds } });
      for (const file of files) {
        await storageService.deleteFile(file.filePath);
      }
      await DropFile.deleteMany({ dropId: { $in: dropIds } });
      await Drop.deleteMany({ code: { $in: testTrackedCodes } });
      testTrackedCodes.length = 0;
    }

    for (const filePath of testTrackedFiles) {
      await storageService.deleteFile(filePath);
    }
    testTrackedFiles.length = 0;
  }

  beforeEach(async () => {
    await cleanDatabaseAndStorage();
  });

  afterAll(async () => {
    await cleanDatabaseAndStorage();
    await disconnectDatabase();
  });

  // Helper to create a physical file on disk and associated DB documents
  async function createTestFileDrop(params: {
    code: string;
    expiresAt: Date;
    isExpired?: boolean;
    textContent?: string | null;
    password?: string;
  }) {
    testTrackedCodes.push(params.code);

    let passwordHash: string | null = null;
    if (params.password) {
      passwordHash = await hashPassword(params.password);
    }

    const drop = await dropRepository.create({
      code: params.code,
      type: 'file',
      textContent: params.textContent ?? null,
      totalSizeBytes: samplePngBuffer.length,
      fileCount: 1,
      expiresAt: params.expiresAt,
      isExpired: params.isExpired ?? false,
      passwordHash,
      viewLimit: null,
      viewCount: 0,
      burnAfterReading: false,
      ownerDeleteTokenHash: 'mock_token_hash_' + params.code,
      ipHash: 'mock_ip_hash',
      status: params.isExpired ? 'expired' : 'active',
    });

    // Write file directly to private storage
    const yearMonth = new Date().toISOString().slice(0, 7);
    const storageKey = `${yearMonth}/${params.code.toLowerCase()}_sample.png`;
    const storageRoot = storageService.getStorageRoot();
    const absPath = path.resolve(storageRoot, storageKey);
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, samplePngBuffer);
    testTrackedFiles.push(storageKey);

    const fileDoc = await dropFileRepository.create({
      dropId: drop._id as mongoose.Types.ObjectId,
      originalName: 'sample.png',
      storedName: `${params.code.toLowerCase()}_sample.png`,
      fileSizeBytes: samplePngBuffer.length,
      mimeType: 'image/png',
      extension: 'png',
      filePath: storageKey,
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    });

    return { drop, fileDoc, absPath, storageKey };
  }

  // Helper to create an active text drop
  async function createTestTextDrop(params: {
    code: string;
    expiresAt: Date;
    isExpired?: boolean;
    textContent: string;
    password?: string;
  }) {
    testTrackedCodes.push(params.code);

    let passwordHash: string | null = null;
    if (params.password) {
      passwordHash = await hashPassword(params.password);
    }

    const drop = await dropRepository.create({
      code: params.code,
      type: 'text',
      textContent: params.textContent,
      totalSizeBytes: Buffer.byteLength(params.textContent),
      fileCount: 0,
      expiresAt: params.expiresAt,
      isExpired: params.isExpired ?? false,
      passwordHash,
      viewLimit: null,
      viewCount: 0,
      burnAfterReading: false,
      ownerDeleteTokenHash: 'mock_token_hash_' + params.code,
      ipHash: 'mock_ip_hash',
      status: params.isExpired ? 'expired' : 'active',
    });

    return drop;
  }

  describe('1. Drop Before Expiration', () => {
    it('does not touch active drops that have not yet expired', async () => {
      const now = new Date('2026-10-01T12:00:00Z');
      const futureExpiry = new Date('2026-10-01T13:00:00Z'); // 1 hour into the future
      const code = 'FUTR01';

      const { drop, absPath } = await createTestFileDrop({
        code,
        expiresAt: futureExpiry,
      });

      expect(fs.existsSync(absPath)).toBe(true);

      const expirationService = new ExpirationService({ enableLogging: false });
      const result = await expirationService.cleanExpiredDrops(now);

      // Verify cleanup result
      expect(result.processedDrops).toBe(0);
      expect(result.deletedFilesCount).toBe(0);
      expect(result.tombstonesDeletedCount).toBe(0);

      // Verify physical file still exists on disk
      expect(fs.existsSync(absPath)).toBe(true);

      // Verify DB record is untouched
      const dropInDb = await dropRepository.findById(drop._id.toString());
      expect(dropInDb).not.toBeNull();
      expect(dropInDb?.isExpired).toBe(false);
      expect(dropInDb?.status).toBe('active');
      expect(dropInDb?.fileCount).toBe(1);

      // Verify DropFile record remains intact
      const filesInDb = await dropFileRepository.findByDropId(drop._id);
      expect(filesInDb.length).toBe(1);
    });
  });

  describe('2. Drop Exactly at Expiration', () => {
    it('purges physical file and marks drop expired when expiresAt <= current time', async () => {
      const exactTime = new Date('2026-10-01T14:30:00Z');
      const code = 'EXAC01';

      const { drop, absPath } = await createTestFileDrop({
        code,
        expiresAt: exactTime, // exactly equal to current check time
      });

      expect(fs.existsSync(absPath)).toBe(true);

      const expirationService = new ExpirationService({ enableLogging: false });
      const result = await expirationService.cleanExpiredDrops(exactTime);

      expect(result.processedDrops).toBe(1);
      expect(result.deletedFilesCount).toBe(1);
      expect(result.purgedBlobsCount).toBe(1);

      // Physical file must be deleted from disk
      expect(fs.existsSync(absPath)).toBe(false);

      // DB Drop document must be updated to expired tombstone
      const dropInDb = await dropRepository.findById(drop._id.toString());
      expect(dropInDb).not.toBeNull();
      expect(dropInDb?.isExpired).toBe(true);
      expect(dropInDb?.status).toBe('expired');
      expect(dropInDb?.fileCount).toBe(0);
      expect(dropInDb?.totalSizeBytes).toBe(0);
      expect(dropInDb?.textContent).toBeNull();

      // DropFile metadata documents must be removed
      const filesInDb = await dropFileRepository.findByDropId(drop._id);
      expect(filesInDb.length).toBe(0);
    });
  });

  describe('3. Drop After Expiration', () => {
    it('purges file and sanitizes text for drops that expired in the past', async () => {
      const pastExpiry = new Date('2026-10-01T10:00:00Z');
      const checkTime = new Date('2026-10-01T11:00:00Z'); // 1 hour past expiry
      const code = 'PAST01';

      const { drop, absPath } = await createTestFileDrop({
        code,
        expiresAt: pastExpiry,
        textContent: 'Lingering secret message',
      });

      expect(fs.existsSync(absPath)).toBe(true);

      const expirationService = new ExpirationService({ enableLogging: false });
      const result = await expirationService.cleanExpiredDrops(checkTime);

      expect(result.processedDrops).toBe(1);
      expect(result.deletedFilesCount).toBe(1);

      // Physical file unlinked
      expect(fs.existsSync(absPath)).toBe(false);

      // Document sanitized
      const dropInDb = await dropRepository.findById(drop._id.toString());
      expect(dropInDb?.isExpired).toBe(true);
      expect(dropInDb?.status).toBe('expired');
      expect(dropInDb?.textContent).toBeNull();
      expect(dropInDb?.fileCount).toBe(0);
    });
  });

  describe('4. Multiple Expired Drops Batch Processing', () => {
    it('cleans up multiple expired drops (text and files) in a single sweep while keeping active drops intact', async () => {
      const checkTime = new Date('2026-10-02T12:00:00Z');

      // Drop 1: Expired Text Drop
      const textDrop = await createTestTextDrop({
        code: 'MULT01',
        expiresAt: new Date('2026-10-02T11:00:00Z'),
        textContent: 'Classified payload 1',
      });

      // Drop 2: Expired File Drop
      const fileDrop = await createTestFileDrop({
        code: 'MULT02',
        expiresAt: new Date('2026-10-02T11:30:00Z'),
      });

      // Drop 3: Active Drop (Future)
      const activeDrop = await createTestFileDrop({
        code: 'MULT03',
        expiresAt: new Date('2026-10-02T13:00:00Z'),
      });

      expect(fs.existsSync(fileDrop.absPath)).toBe(true);
      expect(fs.existsSync(activeDrop.absPath)).toBe(true);

      const expirationService = new ExpirationService({ enableLogging: false });
      const result = await expirationService.cleanExpiredDrops(checkTime);

      expect(result.processedDrops).toBe(2);
      expect(result.deletedFilesCount).toBe(1);

      // Expired drops purged
      const textInDb = await dropRepository.findById(textDrop._id.toString());
      expect(textInDb?.isExpired).toBe(true);
      expect(textInDb?.textContent).toBeNull();

      const fileInDb = await dropRepository.findById(fileDrop.drop._id.toString());
      expect(fileInDb?.isExpired).toBe(true);
      expect(fileInDb?.fileCount).toBe(0);
      expect(fs.existsSync(fileDrop.absPath)).toBe(false);

      // Active drop remains untouched
      const activeInDb = await dropRepository.findById(activeDrop.drop._id.toString());
      expect(activeInDb?.isExpired).toBe(false);
      expect(activeInDb?.status).toBe('active');
      expect(fs.existsSync(activeDrop.absPath)).toBe(true);
    });
  });

  describe('5. Missing Physical File Handling', () => {
    it('gracefully handles missing physical files without halting or crashing', async () => {
      const checkTime = new Date('2026-10-03T09:00:00Z');
      const code = 'MISS01';

      const { drop, absPath } = await createTestFileDrop({
        code,
        expiresAt: new Date('2026-10-03T08:00:00Z'),
      });

      // Pre-delete the physical file from disk to simulate external deletion or corrupted state
      if (fs.existsSync(absPath)) {
        fs.unlinkSync(absPath);
      }
      expect(fs.existsSync(absPath)).toBe(false);

      const expirationService = new ExpirationService({ enableLogging: false });
      const result = await expirationService.cleanExpiredDrops(checkTime);

      // Handled cleanly
      expect(result.processedDrops).toBe(1);
      expect(result.missingFilesCount).toBe(1);
      expect(result.deletedFilesCount).toBe(0);
      expect(result.failedFilesCount).toBe(0);
      expect(result.errors.length).toBe(0);

      // Drop document still sanitized properly
      const dropInDb = await dropRepository.findById(drop._id.toString());
      expect(dropInDb?.isExpired).toBe(true);
      expect(dropInDb?.status).toBe('expired');
      expect(dropInDb?.fileCount).toBe(0);

      // File metadata still cleaned up from DB
      const filesInDb = await dropFileRepository.findByDropId(drop._id);
      expect(filesInDb.length).toBe(0);
    });
  });

  describe('6. Repeated Cleanup (Idempotency)', () => {
    it('produces identical safe results on consecutive sweeps without duplicate work or errors', async () => {
      const checkTime = new Date('2026-10-04T10:00:00Z');
      const code = 'IDEM01';

      const { drop, absPath } = await createTestFileDrop({
        code,
        expiresAt: new Date('2026-10-04T09:00:00Z'),
      });

      const expirationService = new ExpirationService({ enableLogging: false });

      // Run 1: Purges file and marks expired
      const result1 = await expirationService.cleanExpiredDrops(checkTime);
      expect(result1.processedDrops).toBe(1);
      expect(result1.deletedFilesCount).toBe(1);
      expect(fs.existsSync(absPath)).toBe(false);

      // Run 2: Immediately run again with same check time
      const result2 = await expirationService.cleanExpiredDrops(checkTime);
      expect(result2.processedDrops).toBe(0);
      expect(result2.deletedFilesCount).toBe(0);
      expect(result2.missingFilesCount).toBe(0);
      expect(result2.failedFilesCount).toBe(0);
      expect(result2.errors.length).toBe(0);

      // Run 3: Run yet again
      const result3 = await expirationService.cleanExpiredDrops(checkTime);
      expect(result3.processedDrops).toBe(0);
      expect(result3.errors.length).toBe(0);

      // State is still consistent
      const dropInDb = await dropRepository.findById(drop._id.toString());
      expect(dropInDb?.isExpired).toBe(true);
      expect(dropInDb?.fileCount).toBe(0);
    });
  });

  describe('7. Failed Deletion Error Isolation', () => {
    it('isolates filesystem deletion errors safely and continues processing remaining drops', async () => {
      const checkTime = new Date('2026-10-05T10:00:00Z');

      const drop1 = await createTestFileDrop({
        code: 'FAIL01',
        expiresAt: new Date('2026-10-05T09:00:00Z'),
      });

      // Create a mock StorageService where deleteFile throws an exception for FAIL01
      const faultyStorage = new StorageService();
      faultyStorage.deleteFile = async (keyOrPath: string): Promise<boolean> => {
        if (keyOrPath.includes('fail01')) {
          throw new Error('EACCES: permission denied, unlink');
        }
        return storageService.deleteFile(keyOrPath);
      };

      const expirationService = new ExpirationService({
        storage: faultyStorage,
        enableLogging: false,
      });

      const result = await expirationService.cleanExpiredDrops(checkTime);

      // Error was captured safely
      expect(result.processedDrops).toBe(1);
      expect(result.failedFilesCount).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain('File deletion failed for drop FAIL01');

      // Drop document still sanitized despite physical file failure
      const dropInDb = await dropRepository.findById(drop1.drop._id.toString());
      expect(dropInDb?.isExpired).toBe(true);
    });
  });

  describe('8. Database Cleanup (Tombstone Retention Purging)', () => {
    it('permanently deletes Drop records from MongoDB once they exceed the tombstone retention window', async () => {
      // 24-hour retention window (86,400,000 ms)
      const retentionMs = 24 * 60 * 60 * 1000;
      const checkTime = new Date('2026-10-10T12:00:00Z');

      // Drop A: Expired 30 hours ago (> 24h retention window) -> should be permanently deleted from DB
      const oldDrop = await createTestTextDrop({
        code: 'TOMB01',
        expiresAt: new Date(checkTime.getTime() - 30 * 60 * 60 * 1000),
        textContent: 'Old message',
        isExpired: true,
      });

      // Drop B: Expired 2 hours ago (< 24h retention window) -> should remain in DB as tombstone
      const recentDrop = await createTestTextDrop({
        code: 'TOMB02',
        expiresAt: new Date(checkTime.getTime() - 2 * 60 * 60 * 1000),
        textContent: 'Recent message',
        isExpired: false,
      });

      const expirationService = new ExpirationService({
        tombstoneRetentionMs: retentionMs,
        enableLogging: false,
      });

      const result = await expirationService.cleanExpiredDrops(checkTime);

      // Old drop was deleted from DB
      expect(result.tombstonesDeletedCount).toBeGreaterThanOrEqual(1);
      const oldInDb = await dropRepository.findById(oldDrop._id.toString());
      expect(oldInDb).toBeNull();

      // Recent drop was sanitized and marked expired, but NOT deleted from DB (retained as tombstone)
      const recentInDb = await dropRepository.findById(recentDrop._id.toString());
      expect(recentInDb).not.toBeNull();
      expect(recentInDb?.isExpired).toBe(true);
      expect(recentInDb?.status).toBe('expired');
      expect(recentInDb?.textContent).toBeNull();
    });
  });

  describe('9. Expired Drop Access Rejection (Download & Unlock)', () => {
    it('rejects file downloads with 410 Gone once a drop is expired', async () => {
      const code = 'NOACC1';
      const { fileDoc } = await createTestFileDrop({
        code,
        expiresAt: new Date(Date.now() - 5000), // expired 5 seconds ago
      });

      // 1. Run expiration engine to purge files
      const expirationService = new ExpirationService({ enableLogging: false });
      await expirationService.cleanExpiredDrops(new Date());

      // 2. Attempt single file download
      const downloadRes = await request(app).get(`/api/drop/${code}/download/${fileDoc._id.toString()}`);
      expect(downloadRes.status).toBe(410);
      expect(downloadRes.body.success).toBe(false);
      expect(downloadRes.body.error.code).toBe('DROP_EXPIRED');

      // 3. Attempt ZIP download
      const zipRes = await request(app).get(`/api/drop/${code}/download-zip`);
      expect(zipRes.status).toBe(410);
      expect(zipRes.body.success).toBe(false);
      expect(zipRes.body.error.code).toBe('DROP_EXPIRED');
    });

    it('rejects passphrase unlock with 410 Gone when drop is expired', async () => {
      const code = 'NOACC2';
      await createTestTextDrop({
        code,
        expiresAt: new Date(Date.now() - 5000),
        textContent: 'Encrypted message',
        password: 'correct_passphrase_123',
      });

      // Run expiration engine
      const expirationService = new ExpirationService({ enableLogging: false });
      await expirationService.cleanExpiredDrops(new Date());

      // Attempt to unlock with correct password
      const unlockRes = await request(app)
        .post(`/api/drop/${code}/unlock`)
        .send({ password: 'correct_passphrase_123' });

      expect(unlockRes.status).toBe(410);
      expect(unlockRes.body.success).toBe(false);
      expect(unlockRes.body.error.code).toBe('DROP_EXPIRED');
    });

    it('returns 410 Gone on direct GET /api/drop/:code for expired drops', async () => {
      const code = 'NOACC3';
      await createTestTextDrop({
        code,
        expiresAt: new Date(Date.now() - 5000),
        textContent: 'Secret payload',
      });

      const res = await request(app).get(`/api/drop/${code}`);
      expect(res.status).toBe(410);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DROP_EXPIRED');
    });
  });

  describe('10. Scheduled Worker Lifecycle & Concurrency Locking', () => {
    it('starts and stops background interval timer cleanly', () => {
      const service = new ExpirationService({
        cleanupIntervalMs: 60000,
        enableLogging: false,
      });

      expect(service.isRunning()).toBe(false);
      service.start();
      expect(service.isRunning()).toBe(true);

      // Calling start again when already running is a no-op
      service.start();
      expect(service.isRunning()).toBe(true);

      service.stop();
      expect(service.isRunning()).toBe(false);

      // Calling stop again is safe
      service.stop();
      expect(service.isRunning()).toBe(false);
    });

    it('prevents concurrent cleanup execution using in-memory lock', async () => {
      // Simulate a long-running dropRepo query
      const slowDropRepo = {
        findExpiredPendingDrops: async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return [];
        },
        findExpiredTombstones: async () => [],
        purgeDropContent: async () => null,
        deleteById: async () => true,
      };

      const lockedService = new ExpirationService({
        dropRepo: slowDropRepo as unknown as typeof dropRepository,
        enableLogging: false,
      });

      // Launch first sweep asynchronously
      const promise1 = lockedService.cleanExpiredDrops();
      expect(lockedService.isCleanupInProgress()).toBe(true);

      // Launch second sweep concurrently while first is in flight
      const promise2 = lockedService.cleanExpiredDrops();

      const [res1, res2] = await Promise.all([promise1, promise2]);

      expect(res1.errors).not.toContain('CLEANUP_ALREADY_IN_PROGRESS');
      expect(res2.errors).toContain('CLEANUP_ALREADY_IN_PROGRESS');
      expect(lockedService.isCleanupInProgress()).toBe(false);
    });
  });
});

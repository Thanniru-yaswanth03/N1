import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import {
  connectDatabase,
  disconnectDatabase,
  isDatabaseConnected,
} from '../src/database/connection.js';
import { Drop } from '../src/models/drop.model.js';
import { DropFile } from '../src/models/drop-file.model.js';
import { dropRepository } from '../src/repositories/drop.repository.js';
import { dropFileRepository } from '../src/repositories/drop-file.repository.js';

describe('MongoDB Data Layer & Repository Tests', () => {
  const TEST_DB_URI = process.env['MONGODB_URI'] || 'mongodb://127.0.0.1:27017/n1_drop_test';

  beforeAll(async () => {
    await connectDatabase(TEST_DB_URI);
  });

  afterAll(async () => {
    // Clean up test collections and disconnect
    if (isDatabaseConnected()) {
      await Drop.deleteMany({ code: /^TEST/ });
      await DropFile.deleteMany({ originalName: /^test-/ });
      await disconnectDatabase();
    }
  });

  describe('1. Connection Module', () => {
    it('successfully connects to MongoDB instance', () => {
      expect(isDatabaseConnected()).toBe(true);
      expect(mongoose.connection.readyState).toBe(1);
    });

    it('handles connection error when given an invalid URI', async () => {
      // Create an isolated mongoose instance to test invalid URI
      const isolatedMongoose = new mongoose.Mongoose();
      await expect(
        isolatedMongoose.connect('mongodb://invalid-host-that-does-not-exist:27017/db', {
          serverSelectionTimeoutMS: 800,
        })
      ).rejects.toThrow();
    });
  });

  describe('2. Model Schema Indexes', () => {
    it('defines unique index on Drop code', () => {
      const dropIndexes = Drop.schema.indexes();
      const codeIndex = dropIndexes.find(idx => {
        const fields = idx[0];
        return fields['code'] === 1;
      });

      expect(codeIndex).toBeDefined();
      expect(codeIndex?.[1]?.unique).toBe(true);
    });

    it('defines expiration index on Drop expiresAt and isExpired', () => {
      const dropIndexes = Drop.schema.indexes();
      const expiryIndex = dropIndexes.find(idx => {
        const fields = idx[0];
        return fields['expiresAt'] === 1 && fields['isExpired'] === 1;
      });

      expect(expiryIndex).toBeDefined();
    });

    it('defines index on DropFile dropId and unique index on storedName', () => {
      const fileIndexes = DropFile.schema.indexes();

      const dropIdIndex = fileIndexes.find(idx => {
        const fields = idx[0];
        return fields['dropId'] === 1;
      });
      expect(dropIdIndex).toBeDefined();

      const storedNameIndex = fileIndexes.find(idx => {
        const fields = idx[0];
        return fields['storedName'] === 1;
      });
      expect(storedNameIndex).toBeDefined();
      expect(storedNameIndex?.[1]?.unique).toBe(true);
    });
  });

  describe('3. Drop Model Validation & Rejection of Invalid Data', () => {
    it('rejects Drop creation when required fields are missing', async () => {
      const invalidDrop = new Drop({});
      const error = await invalidDrop
        .validate()
        .catch((err: unknown) => err as mongoose.Error.ValidationError);

      expect(error).toBeDefined();
      expect(error?.errors['code']).toBeDefined();
      expect(error?.errors['type']).toBeDefined();
      expect(error?.errors['expiresAt']).toBeDefined();
      expect(error?.errors['ownerDeleteTokenHash']).toBeDefined();
    });

    it('rejects invalid code format (not 6 alphanumeric characters)', async () => {
      const invalidCodeDrop = new Drop({
        code: 'TOOLONG123',
        type: 'text',
        expiresAt: new Date(Date.now() + 3600000),
        ownerDeleteTokenHash: 'dummy_hash',
      });
      const error = await invalidCodeDrop
        .validate()
        .catch((err: unknown) => err as mongoose.Error.ValidationError);
      expect(error?.errors['code']).toBeDefined();
    });

    it('rejects invalid drop type', async () => {
      const invalidTypeDrop = new Drop({
        code: 'TEST01',
        type: 'invalid_type' as unknown as 'text',
        expiresAt: new Date(Date.now() + 3600000),
        ownerDeleteTokenHash: 'dummy_hash',
      });
      const error = await invalidTypeDrop
        .validate()
        .catch((err: unknown) => err as mongoose.Error.ValidationError);
      expect(error?.errors['type']).toBeDefined();
    });

    it('rejects negative or excessive file count (> 10 files)', async () => {
      const excessiveFilesDrop = new Drop({
        code: 'TEST02',
        type: 'file',
        fileCount: 15,
        expiresAt: new Date(Date.now() + 3600000),
        ownerDeleteTokenHash: 'dummy_hash',
      });
      const error = await excessiveFilesDrop
        .validate()
        .catch((err: unknown) => err as mongoose.Error.ValidationError);
      expect(error?.errors['fileCount']).toBeDefined();
    });

    it('rejects text content exceeding 10,000 characters', async () => {
      const oversizedTextDrop = new Drop({
        code: 'TEST03',
        type: 'text',
        textContent: 'a'.repeat(10001),
        expiresAt: new Date(Date.now() + 3600000),
        ownerDeleteTokenHash: 'dummy_hash',
      });
      const error = await oversizedTextDrop
        .validate()
        .catch((err: unknown) => err as mongoose.Error.ValidationError);
      expect(error?.errors['textContent']).toBeDefined();
    });
  });

  describe('4. DropFile Model Validation', () => {
    it('rejects DropFile when required fields are missing', async () => {
      const invalidFile = new DropFile({});
      const error = await invalidFile
        .validate()
        .catch((err: unknown) => err as mongoose.Error.ValidationError);

      expect(error).toBeDefined();
      expect(error?.errors['dropId']).toBeDefined();
      expect(error?.errors['originalName']).toBeDefined();
      expect(error?.errors['storedName']).toBeDefined();
      expect(error?.errors['fileSizeBytes']).toBeDefined();
      expect(error?.errors['mimeType']).toBeDefined();
    });

    it('rejects file size <= 0 or > 50 MB', async () => {
      const zeroByteFile = new DropFile({
        dropId: new mongoose.Types.ObjectId(),
        originalName: 'test.png',
        storedName: 'uuid-1.png',
        fileSizeBytes: 0,
        mimeType: 'image/png',
        extension: 'png',
        filePath: 'storage/drops/test.png',
        checksum: 'abc',
      });
      const zeroError = await zeroByteFile
        .validate()
        .catch((err: unknown) => err as mongoose.Error.ValidationError);
      expect(zeroError?.errors['fileSizeBytes']).toBeDefined();

      const oversizedFile = new DropFile({
        dropId: new mongoose.Types.ObjectId(),
        originalName: 'huge.zip',
        storedName: 'uuid-2.zip',
        fileSizeBytes: 52428801, // 50MB + 1 byte
        mimeType: 'application/zip',
        extension: 'zip',
        filePath: 'storage/drops/huge.zip',
        checksum: 'abc',
      });
      const oversizeError = await oversizedFile
        .validate()
        .catch((err: unknown) => err as mongoose.Error.ValidationError);
      expect(oversizeError?.errors['fileSizeBytes']).toBeDefined();
    });
  });

  describe('5. DropRepository Operations', () => {
    const testCode = 'TEST99';
    let createdDropId: string;

    it('creates and persists a valid Drop document', async () => {
      // Ensure clean state for testCode
      await Drop.deleteOne({ code: testCode });

      const drop = await dropRepository.create({
        code: testCode,
        type: 'text',
        textContent: 'Confidential N1 credentials payload',
        totalSizeBytes: 35,
        fileCount: 0,
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
        ownerDeleteTokenHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        ipHash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
        status: 'active',
      });

      expect(drop._id).toBeDefined();
      expect(drop.code).toBe(testCode);
      expect(drop.isExpired).toBe(false);
      expect(drop.viewCount).toBe(0);
      createdDropId = drop._id.toString();
    });

    it('finds a drop by code', async () => {
      const found = await dropRepository.findByCode(testCode);
      expect(found).not.toBeNull();
      expect(found?.code).toBe(testCode);
      expect(found?.textContent).toBe('Confidential N1 credentials payload');
    });

    it('finds a drop by id', async () => {
      const found = await dropRepository.findById(createdDropId);
      expect(found).not.toBeNull();
      expect(found?.code).toBe(testCode);
    });

    it('increments view count atomically', async () => {
      const updated = await dropRepository.incrementViewCount(createdDropId);
      expect(updated?.viewCount).toBe(1);

      const secondUpdate = await dropRepository.incrementViewCount(createdDropId);
      expect(secondUpdate?.viewCount).toBe(2);
    });

    it('marks a drop as expired', async () => {
      const expired = await dropRepository.markAsExpired(createdDropId);
      expect(expired?.status).toBe('expired');
      expect(expired?.isExpired).toBe(true);
    });

    it('marks a drop as burned', async () => {
      const burned = await dropRepository.markAsBurned(createdDropId);
      expect(burned?.status).toBe('burned');
      expect(burned?.isExpired).toBe(true);
    });

    it('finds pending expired drops using expiration query index', async () => {
      // Create a drop already expired in the past
      const pastExpiredCode = 'TEST00';
      await Drop.deleteOne({ code: pastExpiredCode });

      await dropRepository.create({
        code: pastExpiredCode,
        type: 'text',
        textContent: 'Past drop',
        expiresAt: new Date(Date.now() - 60000), // 1 min ago
        isExpired: false,
        ownerDeleteTokenHash: 'hash123',
        status: 'active',
      });

      const pending = await dropRepository.findExpiredPendingDrops(10);
      const foundPast = pending.find(d => d.code === pastExpiredCode);
      expect(foundPast).toBeDefined();

      await dropRepository.deleteByCode(pastExpiredCode);
    });

    it('deletes a drop by id', async () => {
      const deleted = await dropRepository.deleteById(createdDropId);
      expect(deleted).toBe(true);

      const foundAfterDelete = await dropRepository.findById(createdDropId);
      expect(foundAfterDelete).toBeNull();
    });
  });

  describe('6. DropFileRepository Operations', () => {
    let testDropId: mongoose.Types.ObjectId;

    beforeAll(async () => {
      testDropId = new mongoose.Types.ObjectId();
    });

    it('creates a single DropFile', async () => {
      const file = await dropFileRepository.create({
        dropId: testDropId,
        originalName: 'test-document.pdf',
        storedName: 'test-stored-uuid-001.bin',
        fileSizeBytes: 1048576, // 1 MB
        mimeType: 'application/pdf',
        extension: 'pdf',
        filePath: 'storage/drops/test-stored-uuid-001.bin',
        checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      });

      expect(file._id).toBeDefined();
      expect(file.originalName).toBe('test-document.pdf');
      expect(file.dropId.toString()).toBe(testDropId.toString());
    });

    it('creates multiple DropFiles in batch', async () => {
      const files = await dropFileRepository.createMany([
        {
          dropId: testDropId,
          originalName: 'test-photo.png',
          storedName: 'test-stored-uuid-002.bin',
          fileSizeBytes: 524288,
          mimeType: 'image/png',
          extension: 'png',
          filePath: 'storage/drops/test-stored-uuid-002.bin',
          checksum: 'abc123sha256',
        },
        {
          dropId: testDropId,
          originalName: 'test-archive.zip',
          storedName: 'test-stored-uuid-003.bin',
          fileSizeBytes: 2097152,
          mimeType: 'application/zip',
          extension: 'zip',
          filePath: 'storage/drops/test-stored-uuid-003.bin',
          checksum: 'def456sha256',
        },
      ]);

      expect(files.length).toBe(2);
    });

    it('finds files by dropId', async () => {
      const files = await dropFileRepository.findByDropId(testDropId);
      expect(files.length).toBe(3);
    });

    it('finds file by storedName', async () => {
      const file = await dropFileRepository.findByStoredName('test-stored-uuid-001.bin');
      expect(file).not.toBeNull();
      expect(file?.originalName).toBe('test-document.pdf');
    });

    it('deletes all files for a dropId', async () => {
      const deletedCount = await dropFileRepository.deleteByDropId(testDropId);
      expect(deletedCount).toBe(3);

      const remaining = await dropFileRepository.findByDropId(testDropId);
      expect(remaining.length).toBe(0);
    });
  });
});

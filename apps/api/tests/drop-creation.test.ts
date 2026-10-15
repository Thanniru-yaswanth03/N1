import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from '../src/database/connection.js';
import { Drop } from '../src/models/drop.model.js';
import { DropFile } from '../src/models/drop-file.model.js';
import { dropService } from '../src/services/drop.service.js';
import { storageService } from '../src/services/storage.service.js';
import { verifyPassword } from '../src/security/passwords.js';

describe('N1 Drop Creation API (POST /api/drop)', () => {
  const app = createApp();
  const createdDropCodes: string[] = [];

  // Authentic test file buffers with valid magic bytes
  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG Signature
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
  ]);

  const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');
  const validTxtBuffer = Buffer.from('N1 Privacy Sharing Platform text file payload.\n');

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    // Clean up created drops and files
    if (isDatabaseConnected() && createdDropCodes.length > 0) {
      const drops = await Drop.find({ code: { $in: createdDropCodes } });
      const dropIds = drops.map(d => d._id);

      const files = await DropFile.find({ dropId: { $in: dropIds } });
      for (const file of files) {
        await storageService.deleteFile(file.filePath);
      }

      await DropFile.deleteMany({ dropId: { $in: dropIds } });
      await Drop.deleteMany({ code: { $in: createdDropCodes } });
    }
    await disconnectDatabase();
  });

  describe('1. Valid Text Drops', () => {
    it('creates a text drop with valid payload (JSON)', async () => {
      const res = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '1h',
          text_content: 'Confidential message: The eagle flies at midnight.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const { code, redirectUrl, expiresAt, deletionToken, data } = res.body;

      // 6-character uppercase alphanumeric code
      expect(code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
      // Excludes ambiguous characters (0, O, 1, I)
      expect(code).not.toMatch(/[0O1I]/);

      expect(redirectUrl).toBe(`/drop/success/${code}`);
      expect(expiresAt).toBeDefined();
      expect(deletionToken).toHaveLength(64); // 32-byte hex

      expect(data.dropType).toBe('text');
      expect(data.fileCount).toBe(0);
      expect(data.burnAfterReading).toBe(false);
      expect(data.isPasswordProtected).toBe(false);

      createdDropCodes.push(code);

      // Verify MongoDB document
      const dropDoc = await Drop.findOne({ code });
      expect(dropDoc).toBeDefined();
      expect(dropDoc?.textContent).toBe('Confidential message: The eagle flies at midnight.');
      expect(dropDoc?.fileCount).toBe(0);
      expect(dropDoc?.passwordHash).toBeNull();
      expect(dropDoc?.ownerDeleteTokenHash).toBeDefined();
      expect(dropDoc?.ownerDeleteTokenHash).not.toBe(deletionToken); // Must be securely hashed

      // Security check: Never leak hashes, paths, or MongoDB internals
      expect(res.body.passwordHash).toBeUndefined();
      expect(res.body.ownerDeleteTokenHash).toBeUndefined();
      expect(res.body._id).toBeUndefined();
      expect(res.body.data.passwordHash).toBeUndefined();
      expect(res.body.data.ownerDeleteTokenHash).toBeUndefined();
      expect(res.body.data._id).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('storage/drops');
    });

    it('supports alternative endpoints (/api/drops and /api/v1/drops)', async () => {
      const res1 = await request(app)
        .post('/api/drops')
        .send({
          drop_type: 'text',
          expiry: '15m',
          text_content: 'Testing /api/drops route',
        });
      expect(res1.status).toBe(201);
      createdDropCodes.push(res1.body.code);

      const res2 = await request(app)
        .post('/api/v1/drops')
        .send({
          drop_type: 'text',
          expiry: '15m',
          text_content: 'Testing /api/v1/drops route',
        });
      expect(res2.status).toBe(201);
      createdDropCodes.push(res2.body.code);
    });

    it('creates a text drop using multipart/form-data', async () => {
      const res = await request(app)
        .post('/api/drop')
        .field('drop_type', 'text')
        .field('expiry', '24h')
        .field('text_content', 'Multipart text payload');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dropType).toBe('text');
      createdDropCodes.push(res.body.code);
    });
  });

  describe('2. Valid File Drops', () => {
    it('creates a file drop with a single valid file (PNG)', async () => {
      const res = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '6h')
        .attach('files', validPngBuffer, 'diagram.png');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const { code, data } = res.body;
      expect(code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
      expect(data.dropType).toBe('files');
      expect(data.fileCount).toBe(1);
      expect(data.totalSizeBytes).toBe(validPngBuffer.length);

      createdDropCodes.push(code);

      // Verify MongoDB Drop and DropFile documents
      const dropDoc = await Drop.findOne({ code });
      expect(dropDoc).toBeDefined();
      expect(dropDoc?.type).toBe('file');
      expect(dropDoc?.totalSizeBytes).toBe(validPngBuffer.length);

      const fileDocs = await DropFile.find({ dropId: dropDoc?._id });
      expect(fileDocs).toHaveLength(1);
      expect(fileDocs[0]?.originalName).toBe('diagram.png');
      expect(fileDocs[0]?.extension).toBe('png');
      expect(fileDocs[0]?.mimeType).toBe('image/png');
      expect(fileDocs[0]?.checksum).toBeDefined();

      // Verify file exists in private storage and is not named with original filename
      const fullPath = path.resolve(storageService.getStorageRoot(), fileDocs[0]!.filePath);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(fileDocs[0]!.storedName).not.toBe('diagram.png');
      expect(fileDocs[0]!.storedName).toMatch(/^[a-f0-9-]+\.png$/);

      // Security check: Server path must not be leaked in response
      expect(JSON.stringify(res.body)).not.toContain(fullPath);
      expect(JSON.stringify(res.body)).not.toContain('storage/drops');
    });

    it('creates a file drop with multiple valid files (PNG, PDF, TXT)', async () => {
      const res = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '7d')
        .attach('files', validPngBuffer, 'screenshot.png')
        .attach('files', validPdfBuffer, 'whitepaper.pdf')
        .attach('files', validTxtBuffer, 'notes.txt');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fileCount).toBe(3);
      expect(res.body.data.totalSizeBytes).toBe(
        validPngBuffer.length + validPdfBuffer.length + validTxtBuffer.length
      );

      const { code } = res.body;
      createdDropCodes.push(code);

      const dropDoc = await Drop.findOne({ code });
      const fileDocs = await DropFile.find({ dropId: dropDoc?._id });
      expect(fileDocs).toHaveLength(3);

      const extensions = fileDocs.map(f => f.extension).sort();
      expect(extensions).toEqual(['pdf', 'png', 'txt']);
    });
  });

  describe('3. File Count & Size Limits', () => {
    it('rejects uploads exceeding 10 files (TOO_MANY_FILES)', async () => {
      const req = request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h');

      // Attach 11 files
      for (let i = 1; i <= 11; i++) {
        req.attach('files', validTxtBuffer, `document_${i}.txt`);
      }

      const res = await req;
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TOO_MANY_FILES');
    });

    it('rejects oversized individual file (> 50 MB) with HTTP 413', async () => {
      // Direct unit test on DropService to avoid allocating 51MB physical buffer over HTTP
      const oversizedMockFile: Express.Multer.File = {
        fieldname: 'files',
        originalname: 'huge_archive.zip',
        encoding: '7bit',
        mimetype: 'application/zip',
        size: 51 * 1024 * 1024, // 51 MB (exceeds 50 MB limit)
        destination: storageService.getTempDir(),
        filename: 'staging_huge.zip',
        path: path.join(storageService.getTempDir(), 'staging_huge.zip'),
        buffer: Buffer.alloc(0),
        stream: null as unknown as Readable,
      };

      await expect(
        dropService.createDrop({
          drop_type: 'files',
          expiry: '1h',
          files: [oversizedMockFile],
        })
      ).rejects.toMatchObject({
        statusCode: 413,
        code: 'FILE_TOO_LARGE',
      });
    });

    it('rejects oversized aggregate drop size (> 200 MB) with HTTP 413', async () => {
      // 5 files of 45 MB each = 225 MB total (exceeds 200 MB limit)
      const mockFiles: Express.Multer.File[] = Array.from({ length: 5 }, (_, i) => ({
        fieldname: 'files',
        originalname: `chunk_${i}.zip`,
        encoding: '7bit',
        mimetype: 'application/zip',
        size: 45 * 1024 * 1024,
        destination: storageService.getTempDir(),
        filename: `staging_chunk_${i}.zip`,
        path: path.join(storageService.getTempDir(), `staging_chunk_${i}.zip`),
        buffer: Buffer.alloc(0),
        stream: null as unknown as Readable,
      }));

      await expect(
        dropService.createDrop({
          drop_type: 'files',
          expiry: '1h',
          files: mockFiles,
        })
      ).rejects.toMatchObject({
        statusCode: 413,
        code: 'TOTAL_SIZE_EXCEEDED',
      });
    });
  });

  describe('4. Text Length Limits', () => {
    it('accepts text at exactly 10,000 characters', async () => {
      const maxText = 'A'.repeat(10000);
      const res = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '15m',
          text_content: maxText,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      createdDropCodes.push(res.body.code);
    });

    it('rejects text exceeding 10,000 characters (TEXT_TOO_LONG)', async () => {
      const oversizedText = 'A'.repeat(10001);
      const res = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '15m',
          text_content: oversizedText,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TEXT_TOO_LONG');
    });
  });

  describe('5. Extension, MIME & Binary Validation', () => {
    it('rejects file with disallowed extension (.exe)', async () => {
      const res = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .attach('files', Buffer.from('MZ\x90\x00'), 'malware.exe');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_EXTENSION');
    });

    it('rejects file with dangerous double extension (e.g. invoice.pdf.exe)', async () => {
      const res = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .attach('files', Buffer.from('MZ\x90\x00'), 'invoice.pdf.exe');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DANGEROUS_FILE_EXTENSION');
    });

    it('rejects file with invalid magic bytes (fake PNG with text content)', async () => {
      const fakePngBuffer = Buffer.from('This is completely plain text not a real PNG image!');
      const res = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .attach('files', fakePngBuffer, 'fake.png');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_FILE_SIGNATURE');
    });
  });

  describe('6. Expiry Presets', () => {
    it.each(['15m', '1h', '6h', '24h', '7d'] as const)(
      'accepts valid expiry preset %s',
      async preset => {
        const res = await request(app)
          .post('/api/drop')
          .send({
            drop_type: 'text',
            expiry: preset,
            text_content: `Testing preset ${preset}`,
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.expiresAt).toBeDefined();

        createdDropCodes.push(res.body.code);
      }
    );

    it('rejects invalid expiry preset', async () => {
      const res = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '999d',
          text_content: 'Invalid expiry test',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_EXPIRY');
    });
  });

  describe('7. Optional Features (Password, View Limit, Burn After Reading)', () => {
    it('creates a password-protected drop and verifies bcrypt hash', async () => {
      const password = 'SuperSecretPassphrase#2026';
      const res = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '1h',
          text_content: 'Protected secret message',
          password,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isPasswordProtected).toBe(true);

      const { code } = res.body;
      createdDropCodes.push(code);

      const dropDoc = await Drop.findOne({ code });
      expect(dropDoc?.passwordHash).toBeDefined();
      expect(dropDoc?.passwordHash).not.toBe(password);

      // Verify bcrypt hash matches original password
      const isValid = await verifyPassword(password, dropDoc!.passwordHash!);
      expect(isValid).toBe(true);

      // Verify incorrect password fails
      const isInvalid = await verifyPassword('WrongPassword', dropDoc!.passwordHash!);
      expect(isInvalid).toBe(false);
    });

    it('creates a drop with maximum view limit', async () => {
      const res = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '1h',
          text_content: 'View limit 5 test',
          max_views: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.viewLimit).toBe(5);

      const { code } = res.body;
      createdDropCodes.push(code);

      const dropDoc = await Drop.findOne({ code });
      expect(dropDoc?.viewLimit).toBe(5);
    });

    it('rejects invalid view limit (e.g. 0 or > 100)', async () => {
      const res1 = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '1h',
          text_content: 'Invalid view limit 0',
          max_views: 0,
        });
      expect(res1.status).toBe(400);
      expect(res1.body.error.code).toBe('INVALID_VIEW_LIMIT');

      const res2 = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '1h',
          text_content: 'Invalid view limit 101',
          max_views: 101,
        });
      expect(res2.status).toBe(400);
      expect(res2.body.error.code).toBe('INVALID_VIEW_LIMIT');
    });

    it('creates a drop with burn-after-reading enabled', async () => {
      const res = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '1h',
          text_content: 'This message will self-destruct after reading',
          burn_after_reading: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.burnAfterReading).toBe(true);

      const { code } = res.body;
      createdDropCodes.push(code);

      const dropDoc = await Drop.findOne({ code });
      expect(dropDoc?.burnAfterReading).toBe(true);
    });
  });

  describe('8. Malformed Requests & Edge Cases', () => {
    it('rejects missing drop_type', async () => {
      const res = await request(app)
        .post('/api/drop')
        .send({
          expiry: '1h',
          text_content: 'No drop type provided',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_DROP_TYPE');
    });

    it('rejects invalid drop_type', async () => {
      const res = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'video',
          expiry: '1h',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_DROP_TYPE');
    });

    it('rejects text drop with empty text_content', async () => {
      const res = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '1h',
          text_content: '   ',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EMPTY_TEXT_CONTENT');
    });

    it('rejects file drop with 0 files attached', async () => {
      const res = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('NO_FILES_PROVIDED');
    });

    it('rejects file uploaded to text drop', async () => {
      const res = await request(app)
        .post('/api/drop')
        .field('drop_type', 'text')
        .field('expiry', '1h')
        .field('text_content', 'Valid text with illicit file')
        .attach('files', validTxtBuffer, 'extra.txt');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('UNEXPECTED_FILES');
    });
  });

  describe('9. Storage Rollback & Failure Compensation', () => {
    it('cleans up staged temporary files when validation fails', async () => {
      const tempDir = storageService.getTempDir();
      const filesBefore = fs.readdirSync(tempDir);

      // Attempt upload with fake PNG (fails signature inspection)
      await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .attach('files', Buffer.from('FAKE_PNG_CONTENT'), 'invalid.png');

      const filesAfter = fs.readdirSync(tempDir);
      // No temporary upload files should remain stranded in staging
      expect(filesAfter.length).toBe(filesBefore.length);
    });

    it('rolls back and cleans up storage when file DB metadata insertion fails', async () => {
      // Mock dropFileRepo.createMany to throw an error
      const repoWithMock = dropService as unknown as {
        dropFileRepo: { createMany: (docs: unknown[]) => Promise<unknown> };
      };
      const originalCreateMany = repoWithMock.dropFileRepo.createMany;
      repoWithMock.dropFileRepo.createMany = async () => {
        throw new Error('Simulated Database File Insertion Error');
      };

      const storageRoot = storageService.getStorageRoot();
      const filesBefore = fs.readdirSync(storageRoot);

      try {
        await expect(
          request(app)
            .post('/api/drop')
            .field('drop_type', 'files')
            .field('expiry', '1h')
            .attach('files', validTxtBuffer, 'rollback_test.txt')
        ).resolves.toMatchObject({
          status: 500,
        });

        const filesAfter = fs.readdirSync(storageRoot);
        // Staged files rolled back from permanent storage
        expect(filesAfter.length).toBe(filesBefore.length);
      } finally {
        repoWithMock.dropFileRepo.createMany = originalCreateMany;
      }
    });

    it('rejects passwords exceeding 128 characters (PASSWORD_TOO_LONG)', async () => {
      const longPass = 'A'.repeat(129);
      const res = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '1h',
          text_content: 'Testing long password',
          password: longPass,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PASSWORD_TOO_LONG');
    });
  });
});

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from '../src/database/connection.js';
import { Drop } from '../src/models/drop.model.js';
import { DropFile } from '../src/models/drop-file.model.js';
import { storageService } from '../src/services/storage.service.js';
import { expirationService } from '../src/services/expiration.service.js';

describe('N1 Phase 15: Critical Lifecycle & Integration Scenarios', () => {
  const app = createApp();
  const trackedCodes: string[] = [];
  const trackedFiles: string[] = [];

  const sampleFileContent = 'Confidential file content created for N1 complete verification 2026.';
  const sampleFileBuffer = Buffer.from(sampleFileContent, 'utf-8');

  beforeAll(async () => {
    await connectDatabase();
  });

  async function cleanupTestData() {
    if (isDatabaseConnected() && trackedCodes.length > 0) {
      const drops = await Drop.find({ code: { $in: trackedCodes } });
      const dropIds = drops.map(d => d._id);
      const files = await DropFile.find({ dropId: { $in: dropIds } });
      for (const file of files) {
        await storageService.deleteFile(file.filePath).catch(() => {});
      }
      await DropFile.deleteMany({ dropId: { $in: dropIds } });
      await Drop.deleteMany({ code: { $in: trackedCodes } });
      trackedCodes.length = 0;
    }

    for (const filePath of trackedFiles) {
      await storageService.deleteFile(filePath).catch(() => {});
    }
    trackedFiles.length = 0;
  }

  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await disconnectDatabase();
  });

  describe('Scenario 1: Critical Text Drop Lifecycle', () => {
    it('creates text Drop -> receives code -> opens Drop -> reads text -> expires -> access rejected', async () => {
      // 1. Create text Drop
      const textPayload = 'Secret encryption note: Meet at 0900 UTC.';
      const createRes = await request(app)
        .post('/api/drop')
        .field('drop_type', 'text')
        .field('text_content', textPayload)
        .field('expiry', '15m')
        .expect(201);

      expect(createRes.body.success).toBe(true);
      expect(createRes.body.code).toBeDefined();
      expect(createRes.body.code.length).toBe(6);
      expect(createRes.body.ownerDeletionToken).toBeDefined();

      const dropCode = createRes.body.code;
      trackedCodes.push(dropCode);

      // 2. Open Drop & Read decrypted text
      const readRes = await request(app)
        .get(`/api/drop/${dropCode}`)
        .expect(200);

      expect(readRes.body.success).toBe(true);
      expect(readRes.body.data.textContent).toBe(textPayload);
      expect(readRes.body.data.viewCount).toBe(1);
      expect(readRes.body.data.status).toBe('ACTIVE');

      // 3. Expire Drop (advance expiration date into past and run cleanup)
      await Drop.updateOne(
        { code: dropCode },
        { $set: { expiresAt: new Date(Date.now() - 60000) } }
      );

      const sweepResult = await expirationService.cleanExpiredDrops();
      expect(sweepResult.processedDrops).toBeGreaterThanOrEqual(1);

      // 4. Verify access is strictly rejected once expired (HTTP 410)
      const expiredRes = await request(app)
        .get(`/api/drop/${dropCode}`)
        .expect(410);

      expect(expiredRes.body.success).toBe(false);
      expect(expiredRes.body.error.code).toBe('DROP_EXPIRED');
    });
  });

  describe('Scenario 2: Critical File Drop Lifecycle & Physical Disk Removal', () => {
    it('uploads file -> creates Drop -> downloads file -> downloads ZIP -> expires -> downloads rejected & physical file removed', async () => {
      // 1. Upload file and create Drop
      const createRes = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .attach('files', sampleFileBuffer, 'audit-evidence.txt')
        .expect(201);

      expect(createRes.body.success).toBe(true);
      const dropCode = createRes.body.code;
      trackedCodes.push(dropCode);

      // 2. Open recipient URL and retrieve metadata
      const recipientRes = await request(app)
        .get(`/api/drop/${dropCode}`)
        .expect(200);

      expect(recipientRes.body.success).toBe(true);
      expect(recipientRes.body.data.files).toHaveLength(1);

      const fileMeta = recipientRes.body.data.files[0];
      expect(fileMeta.name).toBe('audit-evidence.txt');
      expect(fileMeta.sizeBytes).toBe(sampleFileBuffer.length);

      // Locate physical file on disk to verify presence
      const dbFile = await DropFile.findById(fileMeta.id);
      expect(dbFile).not.toBeNull();
      const physicalDiskPath = path.isAbsolute(dbFile!.filePath)
        ? dbFile!.filePath
        : path.join(storageService.getStorageRoot(), dbFile!.filePath);
      expect(fs.existsSync(physicalDiskPath)).toBe(true);

      // 3. Download individual file & verify exact byte-for-byte stream
      const downloadRes = await request(app)
        .get(`/api/drop/${dropCode}/download/${fileMeta.id}`)
        .responseType('blob')
        .expect(200);

      expect(downloadRes.headers['content-disposition']).toContain('attachment');
      expect(downloadRes.headers['content-disposition']).toContain('audit-evidence.txt');
      expect(Buffer.from(downloadRes.body)).toEqual(sampleFileBuffer);

      // 4. Download dynamic ZIP archive & verify ZIP structure
      const zipRes = await request(app)
        .get(`/api/drop/${dropCode}/download-zip`)
        .responseType('blob')
        .expect(200);

      expect(zipRes.headers['content-type']).toContain('application/zip');
      expect(zipRes.headers['content-disposition']).toContain('.zip');
      // Verify ZIP magic header bytes: 0x50, 0x4b, 0x03, 0x04 ('PK\x03\x04')
      const zipBuffer = Buffer.from(zipRes.body);
      expect(zipBuffer[0]).toBe(0x50);
      expect(zipBuffer[1]).toBe(0x4b);

      // 5. Expire Drop and execute cleanup sweep
      await Drop.updateOne(
        { code: dropCode },
        { $set: { expiresAt: new Date(Date.now() - 120000) } }
      );

      const sweep = await expirationService.cleanExpiredDrops();
      expect(sweep.processedDrops).toBeGreaterThanOrEqual(1);

      // 6. Verify subsequent file download is rejected with HTTP 410
      const rejectedDownload = await request(app)
        .get(`/api/drop/${dropCode}/download/${fileMeta.id}`)
        .expect(410);

      expect(rejectedDownload.body.error.code).toBe('DROP_EXPIRED');

      // 7. Verify subsequent ZIP download is rejected with HTTP 410
      const rejectedZip = await request(app)
        .get(`/api/drop/${dropCode}/download-zip`)
        .expect(410);

      expect(rejectedZip.body.error.code).toBe('DROP_EXPIRED');

      // 8. CRITICAL: Verify physical file is permanently removed from filesystem!
      expect(fs.existsSync(physicalDiskPath)).toBe(false);
    });
  });

  describe('Scenario 3: Password-Protected Drop Flow', () => {
    it('enforces password challenge -> rejects wrong password -> unlocks with correct passphrase -> permits access', async () => {
      const passphrase = 'SuperSecretKey99!';

      // 1. Create password-protected drop
      const createRes = await request(app)
        .post('/api/drop')
        .field('drop_type', 'text')
        .field('text_content', 'Classified payload protected by bcrypt')
        .field('expiry', '1h')
        .field('password', passphrase)
        .expect(201);

      const code = createRes.body.code;
      trackedCodes.push(code);

      // 2. Unauthenticated access gets challenge with content redacted
      const challengeRes = await request(app)
        .get(`/api/drop/${code}`)
        .expect(200);

      expect(challengeRes.body.data.requiresPassword).toBe(true);
      expect(challengeRes.body.data.textContent).toBeUndefined();

      // 3. Unlock with invalid password rejected with 401
      const failUnlock = await request(app)
        .post(`/api/drop/${code}/unlock`)
        .send({ password: 'WrongPassword123' })
        .expect(401);

      expect(failUnlock.body.success).toBe(false);
      expect(failUnlock.body.error.code).toBe('INVALID_PASSWORD');

      // 4. Unlock with correct password succeeds and returns access token
      const successUnlock = await request(app)
        .post(`/api/drop/${code}/unlock`)
        .send({ password: passphrase })
        .expect(200);

      expect(successUnlock.body.success).toBe(true);
      expect(successUnlock.body.data.accessToken).toBeDefined();
      const accessToken = successUnlock.body.data.accessToken;

      // 5. Authorized access with access token reveals plaintext
      const authorizedRes = await request(app)
        .get(`/api/drop/${code}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(authorizedRes.body.data.textContent).toBe('Classified payload protected by bcrypt');
    });
  });

  describe('Scenario 4: View Limit Exact Enforcement', () => {
    it('permits exactly max_views retrievals and shuts down immediately on view limit exhaustion', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .field('drop_type', 'text')
        .field('text_content', 'Two-time view message only')
        .field('expiry', '1h')
        .field('max_views', '2')
        .expect(201);

      const code = createRes.body.code;
      trackedCodes.push(code);

      // View 1
      const v1 = await request(app).get(`/api/drop/${code}`).expect(200);
      expect(v1.body.data.viewCount).toBe(1);

      // View 2 (limit reached)
      const v2 = await request(app).get(`/api/drop/${code}`).expect(200);
      expect(v2.body.data.viewCount).toBe(2);

      // View 3 (exceeded: rejected with 410 VIEW_LIMIT_REACHED)
      const v3 = await request(app).get(`/api/drop/${code}`).expect(410);
      expect(v3.body.error.code).toBe('VIEW_LIMIT_REACHED');
    });
  });

  describe('Scenario 5: Burn-After-Reading Self-Destruction', () => {
    it('self-destructs drop and purges physical file immediately after file download', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .field('burn_after_reading', 'true')
        .attach('files', sampleFileBuffer, 'burn-me.txt')
        .expect(201);

      const code = createRes.body.code;
      trackedCodes.push(code);

      const recipientRes = await request(app).get(`/api/drop/${code}`).expect(200);
      const fileId = recipientRes.body.data.files[0].id;

      const dbFile = await DropFile.findById(fileId);
      const physicalPath = path.isAbsolute(dbFile!.filePath)
        ? dbFile!.filePath
        : path.join(storageService.getStorageRoot(), dbFile!.filePath);
      expect(fs.existsSync(physicalPath)).toBe(true);

      // First download succeeds
      await request(app)
        .get(`/api/drop/${code}/download/${fileId}`)
        .expect(200);

      // Immediate subsequent retrieval rejected with 410 DROP_BURNED
      const burnedRes = await request(app).get(`/api/drop/${code}`).expect(410);
      expect(burnedRes.body.error.code).toBe('DROP_BURNED');

      // Verify physical disk file is already deleted!
      expect(fs.existsSync(physicalPath)).toBe(false);
    });
  });

  describe('Scenario 6: Manual Deletion with Owner Token', () => {
    it('rejects deletion with invalid token and permanently purges on valid token', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .field('drop_type', 'text')
        .field('text_content', 'Drop for manual deletion test')
        .field('expiry', '1h')
        .expect(201);

      const code = createRes.body.code;
      const ownerToken = createRes.body.ownerDeletionToken;
      trackedCodes.push(code);

      // Delete with bad token rejected with 401
      await request(app)
        .delete(`/api/drop/${code}`)
        .send({ deletionToken: 'invalid_token_xyz' })
        .expect(401);

      // Delete with valid owner token succeeds
      const delRes = await request(app)
        .delete(`/api/drop/${code}`)
        .send({ deletionToken: ownerToken })
        .expect(200);

      expect(delRes.body.success).toBe(true);

      // Subsequent access rejected with 410 DROP_DELETED
      const accessRes = await request(app).get(`/api/drop/${code}`).expect(410);
      expect(accessRes.body.error.code).toBe('DROP_DELETED');
    });
  });

  describe('Scenario 7: Multiple Files & ZIP Packaging', () => {
    it('accepts multiple files in single drop and dynamically archives all in ZIP', async () => {
      const file1 = Buffer.from('Alpha report content', 'utf-8');
      const file2 = Buffer.from('Beta notes text', 'utf-8');
      const file3 = Buffer.from('Gamma document data', 'utf-8');

      const createRes = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .attach('files', file1, 'alpha.txt')
        .attach('files', file2, 'beta.txt')
        .attach('files', file3, 'gamma.txt')
        .expect(201);

      const code = createRes.body.code;
      trackedCodes.push(code);

      const recipientRes = await request(app).get(`/api/drop/${code}`).expect(200);
      expect(recipientRes.body.data.fileCount).toBe(3);
      expect(recipientRes.body.data.files).toHaveLength(3);

      const zipRes = await request(app)
        .get(`/api/drop/${code}/download-zip`)
        .expect(200);

      expect(zipRes.headers['content-type']).toContain('application/zip');
    });
  });

  describe('Scenario 8: Maximum Limits & Oversized Protection', () => {
    it('rejects text drops exceeding 10,000 characters with HTTP 400', async () => {
      const oversized = 'X'.repeat(10001);
      const res = await request(app)
        .post('/api/drop')
        .field('drop_type', 'text')
        .field('text_content', oversized)
        .field('expiry', '1h')
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TEXT_TOO_LONG');
    });

    it('rejects file drops with 0 attached files', async () => {
      const res = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NO_FILES_PROVIDED');
    });
  });

  describe('Scenario 9: Security Attack Defense', () => {
    it('prevents path traversal in download routes', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .field('drop_type', 'text')
        .field('text_content', 'Safe drop')
        .field('expiry', '1h')
        .expect(201);

      const code = createRes.body.code;
      trackedCodes.push(code);

      // Attempt path traversal via fileId
      const traversalRes = await request(app)
        .get(`/api/drop/${code}/download/..%2F..%2Fetc%2Fpasswd`)
        .expect(404);

      expect(traversalRes.body.success).toBe(false);
    });

    it('sanitizes malicious filenames with directory traversal patterns', async () => {
      const res = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .attach('files', sampleFileBuffer, '../../safe-notes.txt')
        .expect(201);

      const code = res.body.code;
      trackedCodes.push(code);

      const recipientRes = await request(app).get(`/api/drop/${code}`).expect(200);
      const savedName = recipientRes.body.data.files[0].name;

      // File original name must be sanitized and not contain path separators
      expect(savedName).not.toContain('..');
      expect(savedName).not.toContain('/');
      expect(savedName).not.toContain('\\');
    });

    it('rejects non-existent Drop code lookup with HTTP 404', async () => {
      const res = await request(app)
        .get('/api/drop/ZZZZZZ')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DROP_NOT_FOUND');
    });
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from '../src/database/connection.js';
import { Drop } from '../src/models/drop.model.js';
import { DropFile } from '../src/models/drop-file.model.js';
import { storageService } from '../src/services/storage.service.js';

describe('N1 Drop Retrieval and Downloads (Phase 6)', () => {
  const app = createApp();
  const createdDropCodes: string[] = [];

  const samplePngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG Signature
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
  ]);

  const sampleTxtBuffer = Buffer.from('Plain text contents for testing downloads.\n');

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
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

  describe('1. Unlocked Text Drop Retrieval (GET /api/drop/:code)', () => {
    it('retrieves an active text drop and increments view count', async () => {
      // 1. Create text drop
      const createRes = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '1h',
          text_content: 'Confidential strategic briefing 2026.',
        });
      expect(createRes.status).toBe(201);
      const { code } = createRes.body;
      createdDropCodes.push(code);

      // 2. Retrieve text drop
      const getRes = await request(app).get(`/api/drop/${code}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);
      expect(getRes.body.data.code).toBe(code);
      expect(getRes.body.data.status).toBe('ACTIVE');
      expect(getRes.body.data.dropType).toBe('text');
      expect(getRes.body.data.textContent).toBe('Confidential strategic briefing 2026.');
      expect(getRes.body.data.viewCount).toBe(1);

      // Security check: No hashes or internals leaked
      expect(getRes.body.data.passwordHash).toBeUndefined();
      expect(getRes.body.data.ownerDeleteTokenHash).toBeUndefined();
      expect(getRes.body.data._id).toBeUndefined();

      // 3. Second retrieval increments viewCount
      const getRes2 = await request(app).get(`/api/drop/${code}`);
      expect(getRes2.status).toBe(200);
      expect(getRes2.body.data.viewCount).toBe(2);
    });

    it('performs case-insensitive lookup (lowercase and mixed case)', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '1h',
          text_content: 'Case insensitivity test payload.',
        });
      const { code } = createRes.body;
      createdDropCodes.push(code);

      // Lookup in lowercase
      const resLower = await request(app).get(`/api/drop/${code.toLowerCase()}`);
      expect(resLower.status).toBe(200);
      expect(resLower.body.data.code).toBe(code);

      // Lookup in uppercase
      const resUpper = await request(app).get(`/api/drop/${code.toUpperCase()}`);
      expect(resUpper.status).toBe(200);
      expect(resUpper.body.data.code).toBe(code);
    });

    it('returns HTTP 404 for non-existent Drop code', async () => {
      const res = await request(app).get('/api/drop/ZZZZZZ');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DROP_NOT_FOUND');
    });
  });

  describe('2. Unlocked File Drop Retrieval', () => {
    it('retrieves metadata and public download URLs for a file drop', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .attach('files', samplePngBuffer, 'chart.png')
        .attach('files', sampleTxtBuffer, 'readme.txt');

      expect(createRes.status).toBe(201);
      const { code } = createRes.body;
      createdDropCodes.push(code);

      const getRes = await request(app).get(`/api/drop/${code}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);

      const data = getRes.body.data;
      expect(data.code).toBe(code);
      expect(data.status).toBe('ACTIVE');
      expect(data.dropType).toBe('files');
      expect(data.fileCount).toBe(2);
      expect(data.files).toHaveLength(2);

      const pngFile = data.files.find(
        (f: { name: string; extension: string; mimeType: string; sizeBytes: number; downloadUrl: string }) =>
          f.name === 'chart.png'
      );
      expect(pngFile).toBeDefined();
      expect(pngFile.extension).toBe('png');
      expect(pngFile.mimeType).toBe('image/png');
      expect(pngFile.sizeBytes).toBe(samplePngBuffer.length);
      expect(pngFile.downloadUrl).toMatch(new RegExp(`^/api/drop/${code}/download/`));

      expect(data.downloadZipUrl).toBe(`/api/drop/${code}/download-zip`);
      expect(data.downloadAllUrl).toBe(`/api/drop/${code}/download-zip`);
    });
  });

  describe('3. Password Protection & Secure Unlock Flow', () => {
    it('returns password challenge when accessing protected drop without credentials', async () => {
      const password = 'VaultAccessKey#2026';
      const createRes = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '1h',
          text_content: 'Top secret vault combination: 42-88-19',
          password,
        });
      const { code } = createRes.body;
      createdDropCodes.push(code);

      // Access without password
      const challengeRes = await request(app).get(`/api/drop/${code}`);
      expect(challengeRes.status).toBe(200);
      expect(challengeRes.body.success).toBe(true);
      expect(challengeRes.body.data.status).toBe('PASSWORD_LOCKED');
      expect(challengeRes.body.data.requiresPassword).toBe(true);
      // Ensure content is not disclosed
      expect(challengeRes.body.data.textContent).toBeUndefined();
      expect(challengeRes.body.data.files).toBeUndefined();
      expect(challengeRes.body.data.passwordHash).toBeUndefined();
    });

    it('rejects invalid password unlock with HTTP 401', async () => {
      const password = 'CorrectPassword#1';
      const createRes = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '1h',
          text_content: 'Classified notes',
          password,
        });
      const { code } = createRes.body;
      createdDropCodes.push(code);

      const unlockRes = await request(app)
        .post(`/api/drop/${code}/unlock`)
        .send({ password: 'WrongPassword' });

      expect(unlockRes.status).toBe(401);
      expect(unlockRes.body.success).toBe(false);
      expect(unlockRes.body.error.code).toBe('INVALID_PASSWORD');
    });

    it('unlocks protected drop with correct password and grants access token', async () => {
      const password = 'CorrectPassword#1';
      const createRes = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '1h',
          text_content: 'Classified notes unlocked!',
          password,
        });
      const { code } = createRes.body;
      createdDropCodes.push(code);

      // 1. Submit password to unlock endpoint
      const unlockRes = await request(app)
        .post(`/api/drop/${code}/unlock`)
        .send({ password });

      expect(unlockRes.status).toBe(200);
      expect(unlockRes.body.success).toBe(true);
      expect(unlockRes.body.data.accessToken).toBeDefined();
      expect(unlockRes.body.data.drop.textContent).toBe('Classified notes unlocked!');

      const token = unlockRes.body.data.accessToken;

      // 2. Access drop with Bearer authorization header
      const bearerRes = await request(app)
        .get(`/api/drop/${code}`)
        .set('Authorization', `Bearer ${token}`);

      expect(bearerRes.status).toBe(200);
      expect(bearerRes.body.data.status).toBe('ACTIVE');
      expect(bearerRes.body.data.textContent).toBe('Classified notes unlocked!');

      // 3. Access drop with query param token
      const queryRes = await request(app).get(`/api/drop/${code}?token=${token}`);
      expect(queryRes.status).toBe(200);
      expect(queryRes.body.data.textContent).toBe('Classified notes unlocked!');

      // 4. Access drop with direct x-drop-password header
      const directPassRes = await request(app)
        .get(`/api/drop/${code}`)
        .set('x-drop-password', password);
      expect(directPassRes.status).toBe(200);
      expect(directPassRes.body.data.textContent).toBe('Classified notes unlocked!');
    });
  });

  describe('4. Expiration & Status Checks', () => {
    it('returns HTTP 410 Gone for expired drop', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '15m',
          text_content: 'Expired text test',
        });
      const { code } = createRes.body;
      createdDropCodes.push(code);

      // Manually backdate expiration in DB
      await Drop.updateOne({ code }, { expiresAt: new Date(Date.now() - 10000) });

      const res = await request(app).get(`/api/drop/${code}`);
      expect(res.status).toBe(410);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DROP_EXPIRED');
    });

    it('returns HTTP 410 Gone for deleted drop', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '1h',
          text_content: 'Deleted text test',
        });
      const { code } = createRes.body;
      createdDropCodes.push(code);

      await Drop.updateOne({ code }, { status: 'deleted', isExpired: true });

      const res = await request(app).get(`/api/drop/${code}`);
      expect(res.status).toBe(410);
      expect(res.body.error.code).toBe('DROP_DELETED');
    });
  });

  describe('5. View Limit Enforcement', () => {
    it('enforces maximum view limit and expires drop when exhausted', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '1h',
          text_content: 'Two views allowed only.',
          max_views: 2,
        });
      const { code } = createRes.body;
      createdDropCodes.push(code);

      // View 1
      const res1 = await request(app).get(`/api/drop/${code}`);
      expect(res1.status).toBe(200);
      expect(res1.body.data.viewCount).toBe(1);

      // View 2
      const res2 = await request(app).get(`/api/drop/${code}`);
      expect(res2.status).toBe(200);
      expect(res2.body.data.viewCount).toBe(2);

      // View 3: Limit reached -> 410 Gone
      const res3 = await request(app).get(`/api/drop/${code}`);
      expect(res3.status).toBe(410);
      expect(res3.body.error.code).toBe('VIEW_LIMIT_REACHED');
    });
  });

  describe('6. Burn-After-Reading Behavior', () => {
    it('burns text drop immediately upon the first view', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '1h',
          text_content: 'This text message burns after reading.',
          burn_after_reading: true,
        });
      const { code } = createRes.body;
      createdDropCodes.push(code);

      // First read: succeeds
      const res1 = await request(app).get(`/api/drop/${code}`);
      expect(res1.status).toBe(200);
      expect(res1.body.data.textContent).toBe('This text message burns after reading.');

      // Second read: burned -> 410 Gone
      const res2 = await request(app).get(`/api/drop/${code}`);
      expect(res2.status).toBe(410);
      expect(res2.body.error.code).toBe('DROP_BURNED');
    });
  });

  describe('7. File Streaming & Downloads (GET /api/drop/:code/download/:fileId)', () => {
    it('streams single file with correct Content-Type, Content-Length, and nosniff', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .attach('files', samplePngBuffer, 'sample.png');

      const { code } = createRes.body;
      createdDropCodes.push(code);

      const dropRes = await request(app).get(`/api/drop/${code}`);
      const fileId = dropRes.body.data.files[0].id;

      const downloadRes = await request(app)
        .get(`/api/drop/${code}/download/${fileId}`)
        .responseType('blob');

      expect(downloadRes.status).toBe(200);
      expect(downloadRes.headers['content-type']).toBe('image/png');
      expect(downloadRes.headers['x-content-type-options']).toBe('nosniff');
      expect(downloadRes.headers['content-disposition']).toContain('attachment');
      expect(downloadRes.headers['content-disposition']).toContain('sample.png');
      expect(Number(downloadRes.headers['content-length'])).toBe(samplePngBuffer.length);

      // Verify streamed byte content equals original buffer
      expect(Buffer.from(downloadRes.body)).toEqual(samplePngBuffer);
    });

    it('prevents file download if drop is expired', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '15m')
        .attach('files', sampleTxtBuffer, 'expire_test.txt');

      const { code } = createRes.body;
      createdDropCodes.push(code);

      const dropRes = await request(app).get(`/api/drop/${code}`);
      const fileId = dropRes.body.data.files[0].id;

      // Expire drop in DB
      await Drop.updateOne({ code }, { expiresAt: new Date(Date.now() - 5000) });

      const downloadRes = await request(app).get(`/api/drop/${code}/download/${fileId}`);
      expect(downloadRes.status).toBe(410);
      expect(downloadRes.body.error.code).toBe('DROP_EXPIRED');
    });

    it('prevents file download from password-protected drop without authorization', async () => {
      const password = 'DownloadAuthKey#1';
      const createRes = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .field('password', password)
        .attach('files', sampleTxtBuffer, 'protected.txt');

      const { code } = createRes.body;
      createdDropCodes.push(code);

      // Retrieve fileId via unlock
      const unlockRes = await request(app)
        .post(`/api/drop/${code}/unlock`)
        .send({ password });
      const fileId = unlockRes.body.data.drop.files[0].id;
      const token = unlockRes.body.data.accessToken;

      // Unauthorized download attempt -> 401
      const unauthRes = await request(app).get(`/api/drop/${code}/download/${fileId}`);
      expect(unauthRes.status).toBe(401);
      expect(unauthRes.body.error.code).toBe('UNAUTHORIZED');

      // Authorized download with Bearer token -> 200
      const authRes = await request(app)
        .get(`/api/drop/${code}/download/${fileId}`)
        .set('Authorization', `Bearer ${token}`)
        .responseType('blob');
      expect(authRes.status).toBe(200);
      expect(Buffer.from(authRes.body)).toEqual(sampleTxtBuffer);
    });

    it('rejects downloading a file that does not belong to the requested Drop code', async () => {
      // Create drop 1
      const res1 = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .attach('files', sampleTxtBuffer, 'file1.txt');
      createdDropCodes.push(res1.body.code);

      // Create drop 2
      const res2 = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .attach('files', sampleTxtBuffer, 'file2.txt');
      createdDropCodes.push(res2.body.code);

      const drop1Meta = await request(app).get(`/api/drop/${res1.body.code}`);
      const file1Id = drop1Meta.body.data.files[0].id;

      // Attempt to download file 1 using drop 2's code
      const crossRes = await request(app).get(`/api/drop/${res2.body.code}/download/${file1Id}`);
      expect(crossRes.status).toBe(404);
      expect(crossRes.body.error.code).toBe('FILE_NOT_FOUND');
    });

    it('cleanly handles missing physical file on disk (HTTP 404)', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .attach('files', sampleTxtBuffer, 'missing.txt');
      const { code } = createRes.body;
      createdDropCodes.push(code);

      const dropMeta = await request(app).get(`/api/drop/${code}`);
      const fileId = dropMeta.body.data.files[0].id;

      // Delete file physically from disk
      const fileDoc = await DropFile.findById(fileId);
      const absPath = path.resolve(storageService.getStorageRoot(), fileDoc!.filePath);
      if (fs.existsSync(absPath)) {
        fs.unlinkSync(absPath);
      }

      const res = await request(app).get(`/api/drop/${code}/download/${fileId}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('FILE_NOT_FOUND');
    });
  });

  describe('8. Dynamic Streaming ZIP Download (GET /api/drop/:code/download-zip)', () => {
    it('generates and streams a valid ZIP archive on-the-fly containing all files', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .attach('files', samplePngBuffer, 'icon.png')
        .attach('files', sampleTxtBuffer, 'guide.txt');

      const { code } = createRes.body;
      createdDropCodes.push(code);

      const zipRes = await request(app)
        .get(`/api/drop/${code}/download-zip`)
        .responseType('blob');

      expect(zipRes.status).toBe(200);
      expect(zipRes.headers['content-type']).toBe('application/zip');
      expect(zipRes.headers['content-disposition']).toContain(`${code}_files.zip`);
      expect(zipRes.headers['x-content-type-options']).toBe('nosniff');

      // Verify ZIP magic bytes (PK\x03\x04 = 0x50, 0x4b, 0x03, 0x04)
      const zipBuffer = Buffer.from(zipRes.body);
      expect(zipBuffer.length).toBeGreaterThan(50);
      expect(zipBuffer[0]).toBe(0x50);
      expect(zipBuffer[1]).toBe(0x4b);
      expect(zipBuffer[2]).toBe(0x03);
      expect(zipBuffer[3]).toBe(0x04);
    });

    it('supports alternative endpoint /api/drop/:code/download-all', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .attach('files', sampleTxtBuffer, 'doc.txt');

      const { code } = createRes.body;
      createdDropCodes.push(code);

      const zipRes = await request(app)
        .get(`/api/drop/${code}/download-all`)
        .responseType('blob');

      expect(zipRes.status).toBe(200);
      expect(zipRes.headers['content-type']).toBe('application/zip');
    });

    it('rejects downloading ZIP for text drops with HTTP 400', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '1h',
          text_content: 'Text drop payload',
        });
      const { code } = createRes.body;
      createdDropCodes.push(code);

      const res = await request(app).get(`/api/drop/${code}/download-zip`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('NOT_A_FILE_DROP');
    });

    it('burns file drop after download when burn_after_reading is true', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .field('burn_after_reading', 'true')
        .attach('files', sampleTxtBuffer, 'burn_file.txt');

      const { code } = createRes.body;
      createdDropCodes.push(code);

      // Download file once: succeeds
      const meta = await request(app).get(`/api/drop/${code}`);
      const fileId = meta.body.data.files[0].id;

      const dlRes1 = await request(app).get(`/api/drop/${code}/download/${fileId}`);
      expect(dlRes1.status).toBe(200);

      // Subsequent retrieval or download attempt fails: 410 Gone (DROP_BURNED)
      const dlRes2 = await request(app).get(`/api/drop/${code}/download/${fileId}`);
      expect(dlRes2.status).toBe(410);
      expect(dlRes2.body.error.code).toBe('DROP_BURNED');

      const getResAfter = await request(app).get(`/api/drop/${code}`);
      expect(getResAfter.status).toBe(410);
      expect(getResAfter.body.error.code).toBe('DROP_BURNED');
    });
  });
});

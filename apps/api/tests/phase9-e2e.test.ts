import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { Drop } from '../src/models/drop.model.js';
import { DropFile } from '../src/models/drop-file.model.js';

describe('N1 Phase 9: Success Page and Recipient Experience Backend & E2E', () => {
  let app: ReturnType<typeof createApp>;
  const createdDropCodes: string[] = [];

  beforeAll(async () => {
    await connectDatabase(process.env['MONGODB_URI'] || 'mongodb://127.0.0.1:27017/n1_test_db');
    app = createApp();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0 && createdDropCodes.length > 0) {
      const drops = await Drop.find({ code: { $in: createdDropCodes } });
      const dropIds = drops.map(d => d._id);
      await DropFile.deleteMany({ dropId: { $in: dropIds } });
      await Drop.deleteMany({ code: { $in: createdDropCodes } });
    }
    await disconnectDatabase();
  });

  it('1. Creates a real Text Drop, verifies success payload, and retrieves decrypted content on recipient route', async () => {
    const textPayload = {
      drop_type: 'text',
      text_content: 'Confidential project secrets for Phase 9 recipient testing.',
      expiry: '1h',
    };

    const createRes = await request(app)
      .post('/api/drop')
      .send(textPayload)
      .expect(201);

    expect(createRes.body.success).toBe(true);
    expect(createRes.body.code).toBeDefined();
    expect(createRes.body.shareUrl).toContain(`/d/${createRes.body.code}`);
    expect(createRes.body.redirectUrl).toBe(`/drop/success/${createRes.body.code}`);
    expect(createRes.body.deletionToken).toBeDefined();
    expect(createRes.body.expiresAt).toBeDefined();

    const code = createRes.body.code;
    createdDropCodes.push(code);

    // Recipient retrieves drop
    const getRes = await request(app)
      .get(`/api/drop/${code}`)
      .expect(200);

    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.dropType).toBe('text');
    expect(getRes.body.data.textContent).toBe(textPayload.text_content);
    expect(getRes.body.data.viewCount).toBe(1);
    expect(getRes.body.data.expiresAt).toBeDefined();
    expect(getRes.body.data.createdAt).toBeDefined();
  });

  it('2. Creates a real File Drop with images and text, retrieves metadata, and tests inline previews and downloads', async () => {
    // 1x1 authentic transparent PNG binary
    const pngBuffer = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
      'hex'
    );
    const textBuffer = Buffer.from('console.log("Hello from recipient preview test");\n', 'utf-8');

    const createRes = await request(app)
      .post('/api/drop')
      .field('drop_type', 'files')
      .field('expiry', '1h')
      .attach('files', pngBuffer, 'preview-sample.png')
      .attach('files', textBuffer, 'script.txt')
      .expect(201);

    expect(createRes.body.success).toBe(true);
    const code = createRes.body.code;
    const deletionToken = createRes.body.deletionToken;
    createdDropCodes.push(code);

    // Recipient views drop
    const getRes = await request(app)
      .get(`/api/drop/${code}`)
      .expect(200);

    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.dropType).toBe('files');
    expect(getRes.body.data.files).toHaveLength(2);

    const pngFile = getRes.body.data.files.find((f: { name: string }) => f.name === 'preview-sample.png');
    const txtFile = getRes.body.data.files.find((f: { name: string }) => f.name === 'script.txt');
    expect(pngFile).toBeDefined();
    expect(txtFile).toBeDefined();

    // Test regular download (attachment disposition)
    const downloadRes = await request(app)
      .get(pngFile.downloadUrl)
      .expect(200);

    expect(downloadRes.headers['content-disposition']).toContain('attachment');
    expect(downloadRes.headers['content-disposition']).toContain('preview-sample.png');

    // Test inline preview (inline disposition)
    const previewRes = await request(app)
      .get(`${pngFile.downloadUrl}?inline=true`)
      .expect(200);

    expect(previewRes.headers['content-disposition']).toContain('inline');
    expect(previewRes.headers['content-type']).toContain('image/png');

    // Test text preview
    const txtPreviewRes = await request(app)
      .get(`${txtFile.downloadUrl}?inline=true`)
      .expect(200);

    expect(txtPreviewRes.headers['content-disposition']).toContain('inline');
    expect(txtPreviewRes.text).toContain('Hello from recipient preview test');

    // Test ZIP download
    const zipRes = await request(app)
      .get(getRes.body.data.downloadZipUrl)
      .expect(200);

    expect(zipRes.headers['content-type']).toBe('application/zip');
    expect(zipRes.headers['content-disposition']).toContain(`${code}_files.zip`);

    // Test Owner Delete Drop from Success page
    const deleteRes = await request(app)
      .delete(`/api/drop/${code}`)
      .send({ deletionToken })
      .expect(200);

    expect(deleteRes.body.success).toBe(true);

    // After deletion, access should return 410 Gone
    await request(app)
      .get(`/api/drop/${code}`)
      .expect(410);
  });

  it('3. Password-protected Drop returns challenge, unlocks with valid passphrase, and enforces auth on downloads', async () => {
    const createRes = await request(app)
      .post('/api/drop')
      .send({
        drop_type: 'text',
        text_content: 'Super secret confidential drop',
        password: 'Phase9MasterPassphrase!',
        expiry: '1h',
      })
      .expect(201);

    const code = createRes.body.code;
    createdDropCodes.push(code);

    // Recipient visits without auth -> receives challenge
    const challengeRes = await request(app)
      .get(`/api/drop/${code}`)
      .expect(200);

    expect(challengeRes.body.data.status).toBe('PASSWORD_LOCKED');
    expect(challengeRes.body.data.requiresPassword).toBe(true);
    expect(challengeRes.body.data.textContent).toBeUndefined();

    // Recipient attempts wrong passphrase -> 401
    await request(app)
      .post(`/api/drop/${code}/unlock`)
      .send({ password: 'WrongPassword123' })
      .expect(401);

    // Recipient submits correct passphrase -> 200 with accessToken & unlocked content
    const unlockRes = await request(app)
      .post(`/api/drop/${code}/unlock`)
      .send({ password: 'Phase9MasterPassphrase!' })
      .expect(200);

    expect(unlockRes.body.data.accessToken).toBeDefined();
    expect(unlockRes.body.data.drop.textContent).toBe('Super secret confidential drop');
  });

  it('4. View limit exhaustion deactivates drop and returns 410 Gone on subsequent access', async () => {
    const createRes = await request(app)
      .post('/api/drop')
      .send({
        drop_type: 'text',
        text_content: 'Single view drop',
        max_views: 1,
        expiry: '1h',
      })
      .expect(201);

    const code = createRes.body.code;
    createdDropCodes.push(code);

    // First view succeeds
    await request(app)
      .get(`/api/drop/${code}`)
      .expect(200);

    // Second view is rejected with 410 Gone
    const secondViewRes = await request(app)
      .get(`/api/drop/${code}`)
      .expect(410);

    expect(secondViewRes.body.error.code).toBe('VIEW_LIMIT_REACHED');
  });

  it('5. Burn-after-reading drop immediately self-destructs upon access', async () => {
    const createRes = await request(app)
      .post('/api/drop')
      .send({
        drop_type: 'text',
        text_content: 'This message will self-destruct',
        burn_after_reading: true,
        expiry: '1h',
      })
      .expect(201);

    const code = createRes.body.code;
    createdDropCodes.push(code);

    // First view reads content and marks burned
    const firstRes = await request(app)
      .get(`/api/drop/${code}`)
      .expect(200);

    expect(firstRes.body.data.status).toBe('BURNED');
    expect(firstRes.body.data.textContent).toBe('This message will self-destruct');

    // Second view fails with 410 Gone
    const secondRes = await request(app)
      .get(`/api/drop/${code}`)
      .expect(410);

    expect(secondRes.body.error.code).toBe('DROP_BURNED');
  });
});

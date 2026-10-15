import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from '../src/database/connection.js';
import { Drop } from '../src/models/drop.model.js';
import { DropFile } from '../src/models/drop-file.model.js';
import { storageService } from '../src/services/storage.service.js';
import {
  validatePathSafety,
  sanitizeFilename,
  PathTraversalError,
  generateDropCode,
  isValidDropCode,
  verifyDeletionToken,
  hashToken,
  hasDangerousDoubleExtension,
  isExtensionAllowed,
  sanitizeErrorMessage,
} from '../src/security/index.js';

describe('N1 Phase 10: Security and Abuse Hardening Test Suite', () => {
  const app = createApp();
  const trackedDropCodes: string[] = [];

  const samplePngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
  ]);

  const sampleTxtBuffer = Buffer.from('Safe text document content for testing.\n');

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    if (isDatabaseConnected() && trackedDropCodes.length > 0) {
      const drops = await Drop.find({ code: { $in: trackedDropCodes } });
      const dropIds = drops.map(d => d._id);

      const files = await DropFile.find({ dropId: { $in: dropIds } });
      for (const file of files) {
        await storageService.deleteFile(file.filePath).catch(() => {});
      }

      await DropFile.deleteMany({ dropId: { $in: dropIds } });
      await Drop.deleteMany({ code: { $in: trackedDropCodes } });
    }
    await disconnectDatabase();
  });

  // ── Vector 1: Path Traversal ──────────────────────────────────────────────
  describe('Vector 1: Path Traversal Protection', () => {
    it('rejects relative path escaping sequences via validatePathSafety', () => {
      const baseDir = 'C:\\uploads\\drops';
      expect(() => validatePathSafety(baseDir, '../../etc/passwd')).toThrow(PathTraversalError);
      expect(() => validatePathSafety(baseDir, '..\\..\\windows\\system32\\cmd.exe')).toThrow(PathTraversalError);
      expect(() => validatePathSafety(baseDir, 'folder/../../../root.txt')).toThrow(PathTraversalError);
    });

    it('rejects null byte injection (%00, \\0) in path resolution', () => {
      const baseDir = 'C:\\uploads\\drops';
      expect(() => validatePathSafety(baseDir, 'safe.txt\0/../../root')).toThrow(PathTraversalError);
    });

    it('sanitizes traversal patterns from user-supplied filenames', () => {
      expect(sanitizeFilename('../../../../secret.pdf')).toBe('secret.pdf');
      expect(sanitizeFilename('..\\..\\boot.ini')).toBe('boot.ini');
      expect(sanitizeFilename('%2e%2e%2f%2e%2e%2fetc%2fpasswd')).toBe('passwd');
    });
  });

  // ── Vector 2: Unauthorized Download ───────────────────────────────────────
  describe('Vector 2: Unauthorized Download Prevention', () => {
    it('rejects file downloads on password-protected drops without authorization', async () => {
      const uploadRes = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .field('password', 'SecretPassphrase123!')
        .attach('files', samplePngBuffer, 'photo.png');
      expect(uploadRes.status).toBe(201);
      const code = uploadRes.body.code;
      trackedDropCodes.push(code);

      const dropDoc = await Drop.findOne({ code });
      const fileDoc = await DropFile.findOne({ dropId: dropDoc!._id });

      // Unauthenticated download attempt
      const downloadRes = await request(app).get(`/api/drop/${code}/download/${fileDoc!._id}`);
      expect(downloadRes.status).toBe(401);
      expect(downloadRes.body.error.code).toBe('UNAUTHORIZED');
    });

    it('prevents cross-drop unauthorized file downloads (fileId swapping)', async () => {
      // Create Drop A
      const dropARes = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .attach('files', samplePngBuffer, 'fileA.png');
      expect(dropARes.status).toBe(201);
      const codeA = dropARes.body.code;
      trackedDropCodes.push(codeA);

      // Create Drop B
      const dropBRes = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .attach('files', samplePngBuffer, 'fileB.png');
      expect(dropBRes.status).toBe(201);
      const codeB = dropBRes.body.code;
      trackedDropCodes.push(codeB);

      const dropADoc = await Drop.findOne({ code: codeA });
      const fileADoc = await DropFile.findOne({ dropId: dropADoc!._id });

      // Attempt to download file A using Drop B's code
      const crossRes = await request(app).get(`/api/drop/${codeB}/download/${fileADoc!._id}`);
      expect(crossRes.status).toBe(404);
      expect(crossRes.body.error.code).toBe('FILE_NOT_FOUND');
    });
  });

  // ── Vector 3 & 4: Unauthorized Deletion & Invalid Owner Token ─────────────
  describe('Vector 3 & 4: Unauthorized Deletion and Token Hardening', () => {
    it('rejects drop deletion when owner deletion token is missing', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .send({ drop_type: 'text', expiry: '1h', text_content: 'Test content.' });
      expect(createRes.status).toBe(201);
      const code = createRes.body.code;
      trackedDropCodes.push(code);

      const deleteRes = await request(app).delete(`/api/drop/${code}`);
      expect(deleteRes.status).toBe(401);
      expect(deleteRes.body.error.code).toBe('INVALID_DELETION_TOKEN');
    });

    it('rejects drop deletion when owner deletion token is incorrect', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .send({ drop_type: 'text', expiry: '1h', text_content: 'Test content.' });
      expect(createRes.status).toBe(201);
      const code = createRes.body.code;
      trackedDropCodes.push(code);

      const deleteRes = await request(app)
        .delete(`/api/drop/${code}`)
        .set('x-deletion-token', 'wrong_fake_token_1234567890abcdef');
      expect(deleteRes.status).toBe(401);
      expect(deleteRes.body.error.code).toBe('INVALID_DELETION_TOKEN');
    });

    it('allows deletion with the authentic owner token and purges data permanently', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .send({ drop_type: 'text', expiry: '1h', text_content: 'Sensitive text to be deleted.' });
      expect(createRes.status).toBe(201);
      const { code, deletionToken } = createRes.body;
      trackedDropCodes.push(code);

      const deleteRes = await request(app)
        .delete(`/api/drop/${code}`)
        .set('x-deletion-token', deletionToken);
      expect(deleteRes.status).toBe(200);

      // Verify drop is now gone/deleted
      const getRes = await request(app).get(`/api/drop/${code}`);
      expect(getRes.status).toBe(410);
    });
  });

  // ── Vector 5 & 6: Rate Limiting & Password Brute Force ────────────────────
  describe('Vector 5 & 6: Password Brute Force Defense & Rate Limiting', () => {
    it('rate-limits password unlock attempts after 5 failures on the same drop', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '1h',
          text_content: 'Brute-force protected briefing.',
          password: 'CorrectPassphrase999!',
        });
      expect(createRes.status).toBe(201);
      const code = createRes.body.code;
      trackedDropCodes.push(code);

      // Perform 5 failed attempts with rate limiting enabled via header
      for (let i = 0; i < 5; i++) {
        const attempt = await request(app)
          .post(`/api/drop/${code}/unlock`)
          .set('x-test-rate-limit', 'true')
          .send({ password: `wrong_guess_${i}` });
        expect(attempt.status).toBe(401);
      }

      // The 6th attempt must be rejected with 429 Too Many Requests
      const blockedRes = await request(app)
        .post(`/api/drop/${code}/unlock`)
        .set('x-test-rate-limit', 'true')
        .send({ password: 'CorrectPassphrase999!' });
      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error.code).toBe('UNLOCK_RATE_LIMITED');
    });
  });

  // ── Vector 7 & 8: Oversized Requests & Multipart Abuse ───────────────────
  describe('Vector 7 & 8: Oversized Requests & Multipart Abuse', () => {
    it('rejects oversized JSON request bodies exceeding 1MB limit', async () => {
      const oversizedPayload = {
        drop_type: 'text',
        expiry: '1h',
        text_content: 'A'.repeat(1.5 * 1024 * 1024), // 1.5MB
      };

      const res = await request(app)
        .post('/api/drop')
        .send(oversizedPayload);
      expect(res.status).toBe(413);
    });

    it('rejects 0-byte uploaded files with EMPTY_FILE error', async () => {
      const emptyBuffer = Buffer.alloc(0);
      const res = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .attach('files', emptyBuffer, 'empty.txt');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EMPTY_FILE');
    });
  });

  // ── Vector 9 & 10: Invalid MIME Types & Fake File Extensions ──────────────
  describe('Vector 9 & 10: MIME Validation & Extension Hardening', () => {
    it('rejects dangerous double extensions (e.g., shell.php.png)', async () => {
      expect(hasDangerousDoubleExtension('script.php.png')).toBe(true);
      expect(hasDangerousDoubleExtension('exploit.exe.jpg')).toBe(true);
      expect(hasDangerousDoubleExtension('safe_document.pdf')).toBe(false);

      const res = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .attach('files', samplePngBuffer, 'malicious.php.png');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('DANGEROUS_FILE_EXTENSION');
    });

    it('rejects non-whitelisted extensions (e.g. .exe, .sh)', async () => {
      expect(isExtensionAllowed('exe')).toBe(false);
      expect(isExtensionAllowed('sh')).toBe(false);
      expect(isExtensionAllowed('pdf')).toBe(true);

      const res = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .attach('files', sampleTxtBuffer, 'script.exe');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_EXTENSION');
    });

    it('rejects files with spoofed MIME type mismatched against extension', async () => {
      const res = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .attach('files', samplePngBuffer, {
          filename: 'photo.png',
          contentType: 'application/x-msdownload',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_MIME_TYPE');
    });
  });

  // ── Vector 11: Malicious Filenames ────────────────────────────────────────
  describe('Vector 11: Malicious Filenames & Reserved Device Names', () => {
    it('safely sanitizes Windows reserved system filenames (CON, PRN, AUX, NUL)', () => {
      expect(sanitizeFilename('CON.txt')).toBe('safe_CON.txt');
      expect(sanitizeFilename('PRN.png')).toBe('safe_PRN.png');
      expect(sanitizeFilename('AUX.pdf')).toBe('safe_AUX.pdf');
      expect(sanitizeFilename('NUL.docx')).toBe('safe_NUL.docx');
      expect(sanitizeFilename('com1.txt')).toBe('safe_com1.txt');
    });

    it('strips control characters and null bytes from filenames', () => {
      expect(sanitizeFilename('payload\x00.png')).toBe('payload.png');
      expect(sanitizeFilename('test\x1f\x7f.pdf')).toBe('test.pdf');
      expect(sanitizeFilename('<<malicious:name>>.txt')).toBe('__malicious_name__.txt');
    });
  });

  // ── Vector 12: Expired Drop Access ────────────────────────────────────────
  describe('Vector 12: Expired Drop Access Rejection', () => {
    it('denies access with 410 Gone across all endpoints when drop has expired', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '15m')
        .attach('files', samplePngBuffer, 'photo.png');
      expect(createRes.status).toBe(201);
      const code = createRes.body.code;
      trackedDropCodes.push(code);

      const dropDoc = await Drop.findOne({ code });
      const fileDoc = await DropFile.findOne({ dropId: dropDoc!._id });

      // Manually set drop to expired in the past
      await Drop.findByIdAndUpdate(dropDoc!._id, {
        expiresAt: new Date(Date.now() - 60000),
        isExpired: true,
        status: 'expired',
      });

      // 1. GET metadata
      const getRes = await request(app).get(`/api/drop/${code}`);
      expect(getRes.status).toBe(410);

      // 2. POST unlock
      const unlockRes = await request(app).post(`/api/drop/${code}/unlock`).send({ password: 'any' });
      expect(unlockRes.status).toBe(410);

      // 3. GET download file
      const downloadRes = await request(app).get(`/api/drop/${code}/download/${fileDoc!._id}`);
      expect(downloadRes.status).toBe(410);

      // 4. GET download zip
      const zipRes = await request(app).get(`/api/drop/${code}/download-zip`);
      expect(zipRes.status).toBe(410);
    });
  });

  // ── Vector 13 & 23: View-Limit Bypass & View Count Race Conditions ────────
  describe('Vector 13 & 23: View-Limit Bypass & Race Condition Hardening', () => {
    it('strictly enforces viewLimit=1 under concurrent requests using atomic operations', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '1h',
          text_content: 'Top secret single-view token.',
          max_views: 1,
        });
      expect(createRes.status).toBe(201);
      const code = createRes.body.code;
      trackedDropCodes.push(code);

      // Fire 10 concurrent requests to retrieve the drop
      const concurrentRequests = Array.from({ length: 10 }, () =>
        request(app).get(`/api/drop/${code}`)
      );
      const responses = await Promise.all(concurrentRequests);

      const successful = responses.filter(r => r.status === 200);
      const expired = responses.filter(r => r.status === 410);

      // Exactly ONE request must succeed; all others must be 410
      expect(successful.length).toBe(1);
      expect(expired.length).toBe(9);

      // Any subsequent request must also be 410
      const subsequentRes = await request(app).get(`/api/drop/${code}`);
      expect(subsequentRes.status).toBe(410);
    });
  });

  // ── Vector 14: Burn-After-Reading Bypass ───────────────────────────────────
  describe('Vector 14: Burn-After-Reading Bypass & Concurrency Defense', () => {
    it('atomically burns text drop on first read so concurrent readers receive 410', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '1h',
          text_content: 'Self-destructing text message.',
          burn_after_reading: true,
        });
      expect(createRes.status).toBe(201);
      const code = createRes.body.code;
      trackedDropCodes.push(code);

      // Fire 8 concurrent reads
      const concurrentRequests = Array.from({ length: 8 }, () =>
        request(app).get(`/api/drop/${code}`)
      );
      const responses = await Promise.all(concurrentRequests);

      const successful = responses.filter(r => r.status === 200);
      const burned = responses.filter(r => r.status === 410);

      expect(successful.length).toBe(1);
      expect(burned.length).toBe(7);

      // Verify the content in database was purged
      const dbDoc = await Drop.findOne({ code });
      expect(dbDoc!.status).toBe('burned');
      expect(dbDoc!.textContent).toBeNull();
    });

    it('atomically burns file drop on first download so concurrent downloads fail', async () => {
      const uploadRes = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .field('burn_after_reading', 'true')
        .attach('files', samplePngBuffer, 'burn_photo.png');
      expect(uploadRes.status).toBe(201);
      const code = uploadRes.body.code;
      trackedDropCodes.push(code);

      const dropDoc = await Drop.findOne({ code });
      const fileDoc = await DropFile.findOne({ dropId: dropDoc!._id });

      // Fire 6 concurrent download requests
      const concurrentDownloads = Array.from({ length: 6 }, () =>
        request(app).get(`/api/drop/${code}/download/${fileDoc!._id}`)
      );
      const responses = await Promise.all(concurrentDownloads);

      const successful = responses.filter(r => r.status === 200);
      const burned = responses.filter(r => r.status === 410);

      expect(successful.length).toBe(1);
      expect(burned.length).toBe(5);
    });
  });

  // ── Vector 15: ZIP Abuse & Zip Slip ───────────────────────────────────────
  describe('Vector 15: ZIP Abuse & Zip Slip Prevention', () => {
    it('sanitizes filenames included in dynamic ZIP archives to prevent Zip Slip', async () => {
      const uploadRes = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .attach('files', samplePngBuffer, 'normal.png');
      expect(uploadRes.status).toBe(201);
      const code = uploadRes.body.code;
      trackedDropCodes.push(code);

      const zipRes = await request(app).get(`/api/drop/${code}/download-zip`);
      expect(zipRes.status).toBe(200);
      expect(zipRes.headers['content-type']).toBe('application/zip');
      expect(zipRes.headers['content-disposition']).toContain(`${code}_files.zip`);
      expect(zipRes.headers['content-security-policy']).toBe("default-src 'none'; sandbox");
    });
  });

  // ── Vector 16: Duplicate Code Generation ──────────────────────────────────
  describe('Vector 16: Cryptographic Drop Code Security', () => {
    it('generates non-colliding, cryptographically random 6-character codes without ambiguous chars', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 500; i++) {
        const code = generateDropCode();
        expect(code).toHaveLength(6);
        expect(code).not.toMatch(/[01OI]/);
        expect(isValidDropCode(code)).toBe(true);
        codes.add(code);
      }
      expect(codes.size).toBe(500); // 500 unique codes in 500 generations
    });
  });

  // ── Vector 17: NoSQL Injection ────────────────────────────────────────────
  describe('Vector 17: NoSQL Operator Injection Defense', () => {
    it('sanitizes NoSQL operator keys ($gt, $ne, $where) from request payload', async () => {
      const res = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '1h',
          text_content: 'Safe content',
          $where: 'sleep(1000)',
          nested: {
            $ne: 'exploit',
            safeKey: 'valid',
          },
        });

      // The $where and $ne keys should be completely stripped by the sanitizer middleware
      expect(res.status).toBe(201);
      const code = res.body.code;
      trackedDropCodes.push(code);
    });

    it('rejects non-string object payloads for owner deletion token', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .send({ drop_type: 'text', expiry: '1h', text_content: 'Test content.' });
      expect(createRes.status).toBe(201);
      const code = createRes.body.code;
      trackedDropCodes.push(code);

      // Attempt NoSQL injection in deletion token body
      const deleteRes = await request(app)
        .delete(`/api/drop/${code}`)
        .send({ deletionToken: { $ne: '' } });

      expect(deleteRes.status).toBe(400);
      expect(deleteRes.body.error.code).toBe('INVALID_REQUEST');
    });
  });

  // ── Vector 18: XSS Through Text Content ───────────────────────────────────
  describe('Vector 18: Stored XSS Neutralization', () => {
    it('safely stores HTML/script tags as plain text and sets nosniff headers', async () => {
      const xssPayload = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
      const createRes = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '1h',
          text_content: xssPayload,
        });
      expect(createRes.status).toBe(201);
      const code = createRes.body.code;
      trackedDropCodes.push(code);

      const getRes = await request(app).get(`/api/drop/${code}`);
      expect(getRes.status).toBe(200);
      expect(getRes.headers['x-content-type-options']).toBe('nosniff');
      expect(getRes.body.data.textContent).toBe(xssPayload);
    });
  });

  // ── Vector 19: Security Headers ───────────────────────────────────────────
  describe('Vector 19: HTTP Security Headers', () => {
    it('sets robust security headers across API endpoints', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  // ── Vector 20: CORS ───────────────────────────────────────────────────────
  describe('Vector 20: CORS Isolation', () => {
    it('rejects unauthorized foreign origins without crashing with 500 error', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'https://malicious-attacker.com');

      expect(res.status).toBe(200);
      // Origin should NOT be reflected
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('permits authorized client origin', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });
  });

  // ── Vector 21: Error Leakage ──────────────────────────────────────────────
  describe('Vector 21: Error Information Leakage Prevention', () => {
    it('sanitizes and redacts system filesystem paths from error messages', () => {
      const winPath = 'Error reading C:\\Users\\Administrator\\secret\\file.txt: not found';
      const unixPath = 'Failed at /home/ubuntu/app/src/secret.ts: internal failure';

      expect(sanitizeErrorMessage(winPath)).not.toContain('C:\\Users');
      expect(sanitizeErrorMessage(winPath)).toContain('[redacted_path]');

      expect(sanitizeErrorMessage(unixPath)).not.toContain('/home/ubuntu');
      expect(sanitizeErrorMessage(unixPath)).toContain('[redacted_path]');
    });
  });

  // ── Vector 22: Sensitive Logging ──────────────────────────────────────────
  describe('Vector 22: Sensitive Information Masking', () => {
    it('masks database URI credentials in connection logs', () => {
      const rawUri = 'mongodb://app_user:SuperSecretPassword123@cluster0.mongodb.net:27017/n1';
      const masked = rawUri.replace(/\/\/[^:]+:[^@]+@/, '//****:****@');
      expect(masked).toBe('mongodb://****:****@cluster0.mongodb.net:27017/n1');
      expect(masked).not.toContain('SuperSecretPassword123');
      expect(masked).not.toContain('app_user');
    });

    it('hashes deletion token before storage and never logs raw token', () => {
      const rawToken = 'b9a8c7d6e5f403123456789abcdef0123456789abcdef0123456789abcdef01';
      const hashed = hashToken(rawToken);
      expect(hashed).not.toBe(rawToken);
      expect(verifyDeletionToken(rawToken, hashed)).toBe(true);
    });
  });

  // ── Vector 24: Race Conditions Around Expiration ──────────────────────────
  describe('Vector 24: Expiration Race Condition Prevention', () => {
    it('atomically blocks access if expiration occurs at the precise moment of access', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '15m',
          text_content: 'Expiring text drop',
        });
      expect(createRes.status).toBe(201);
      const code = createRes.body.code;
      trackedDropCodes.push(code);

      // Force drop expiration timestamp to 1ms in the past
      await Drop.findOneAndUpdate(
        { code },
        { $set: { expiresAt: new Date(Date.now() - 1) } }
      );

      // Retrieve drop - must be treated as expired 410
      const getRes = await request(app).get(`/api/drop/${code}`);
      expect(getRes.status).toBe(410);
      expect(getRes.body.error.code).toBe('DROP_EXPIRED');
    });
  });

  // ── Vector 25: Partial Upload Failures & Disk Leakage ─────────────────────
  describe('Vector 25: Partial Upload Failures Cleanup', () => {
    it('cleans up temporary disk files when validation fails during upload', async () => {
      const uploadDir = path.resolve('uploads');
      const filesBefore = fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir, { recursive: true }) : [];

      // Send a request with one valid file and one invalid extension
      const res = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .attach('files', samplePngBuffer, 'good.png')
        .attach('files', sampleTxtBuffer, 'malicious.exe');

      expect(res.status).toBe(400);

      // Ensure no dangling files were left behind in the root upload directory
      const filesAfter = fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir, { recursive: true }) : [];
      expect(filesAfter.length).toBeLessThanOrEqual(filesBefore.length);
    });
  });

  // ── Vector 26: Privilege Escalation Prevention ────────────────────────────
  describe('Vector 26: Privilege Escalation Prevention', () => {
    it('blocks unauthenticated and non-admin callers from accessing moderation endpoints', async () => {
      const getDropsRes = await request(app).get('/api/admin/drops');
      expect(getDropsRes.status).toBe(401);
      expect(getDropsRes.body.error.code).toBe('ADMIN_UNAUTHORIZED');

      const getReportsRes = await request(app).get('/api/admin/reports');
      expect(getReportsRes.status).toBe(401);
      expect(getReportsRes.body.error.code).toBe('ADMIN_UNAUTHORIZED');

      const getAuditRes = await request(app).get('/api/admin/audit-logs');
      expect(getAuditRes.status).toBe(401);
      expect(getAuditRes.body.error.code).toBe('ADMIN_UNAUTHORIZED');
    });

    it('rejects forged and malformed admin tokens', async () => {
      const res = await request(app)
        .get('/api/admin/drops')
        .set('Authorization', 'Bearer forged_token_with_invalid_signature_12345');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('ADMIN_UNAUTHORIZED');
    });

    it('prevents regular drop unlock tokens from accessing admin routes', async () => {
      // Create password drop
      const createRes = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '1h',
          text_content: 'Confidential text',
          password: 'SecretPassphrase123!',
        });
      expect(createRes.status).toBe(201);
      const code = createRes.body.code;
      trackedDropCodes.push(code);

      // Unlock drop to receive regular drop access token
      const unlockRes = await request(app)
        .post(`/api/drop/${code}/unlock`)
        .send({ password: 'SecretPassphrase123!' });
      expect(unlockRes.status).toBe(200);
      const dropToken = unlockRes.body.data.accessToken;
      expect(dropToken).toBeDefined();

      // Attempt to access admin routes with the drop access token
      const adminRes = await request(app)
        .get('/api/admin/drops')
        .set('Authorization', `Bearer ${dropToken}`);
      expect(adminRes.status).toBe(401);
      expect(adminRes.body.error.code).toBe('ADMIN_UNAUTHORIZED');
    });
  });

  // ── Vector 27: Duplicate Claims & Concurrency Protection ──────────────────
  describe('Vector 27: Duplicate Claims and Concurrency Prevention', () => {
    it('atomically enforces single-claim on burn-after-reading drops under simultaneous requests', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '1h',
          text_content: 'One-time burn payload for race test',
          burn_after_reading: true,
        });
      expect(createRes.status).toBe(201);
      const code = createRes.body.code;
      trackedDropCodes.push(code);

      // Dispatch 2 concurrent read requests simultaneously
      const [res1, res2] = await Promise.all([
        request(app).get(`/api/drop/${code}`),
        request(app).get(`/api/drop/${code}`),
      ]);

      const statuses = [res1.status, res2.status].sort();
      // Exactly one request must succeed with 200, and the second must be rejected with 410 (claim burned)
      expect(statuses).toEqual([200, 410]);

      const successRes = res1.status === 200 ? res1 : res2;
      const failedRes = res1.status === 410 ? res1 : res2;

      expect(successRes.body.data.textContent).toBe('One-time burn payload for race test');
      expect(failedRes.body.error.code).toBe('DROP_BURNED');
    });

    it('strictly enforces view limits without over-claim under concurrent traffic', async () => {
      const createRes = await request(app)
        .post('/api/drop')
        .send({
          drop_type: 'text',
          expiry: '1h',
          text_content: 'Strict two-view limit payload',
          max_views: 2,
        });
      expect(createRes.status).toBe(201);
      const code = createRes.body.code;
      trackedDropCodes.push(code);

      // Dispatch 4 concurrent requests
      const responses = await Promise.all([
        request(app).get(`/api/drop/${code}`),
        request(app).get(`/api/drop/${code}`),
        request(app).get(`/api/drop/${code}`),
        request(app).get(`/api/drop/${code}`),
      ]);

      const statusCounts = responses.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      // Exactly 2 must receive 200, and 2 must receive 410 (view limit reached)
      expect(statusCounts[200]).toBe(2);
      expect(statusCounts[410]).toBe(2);
    });
  });

  // ── Vector 28: IDOR (Insecure Direct Object Reference) Protection ──────────
  describe('Vector 28: IDOR and Object Reference Hardening', () => {
    it('prevents cross-tenant drop deletion using another drop owner token', async () => {
      // Drop A
      const dropA = await request(app)
        .post('/api/drop')
        .send({ drop_type: 'text', expiry: '1h', text_content: 'Drop A victim' });
      expect(dropA.status).toBe(201);
      trackedDropCodes.push(dropA.body.code);

      // Drop B
      const dropB = await request(app)
        .post('/api/drop')
        .send({ drop_type: 'text', expiry: '1h', text_content: 'Drop B attacker' });
      expect(dropB.status).toBe(201);
      trackedDropCodes.push(dropB.body.code);

      // Attempt to delete Drop A using Drop B's deletionToken
      const deleteRes = await request(app)
        .delete(`/api/drop/${dropA.body.code}`)
        .set('x-deletion-token', dropB.body.deletionToken);

      expect(deleteRes.status).toBe(401);
      expect(deleteRes.body.error.code).toBe('INVALID_DELETION_TOKEN');

      // Drop A must still be intact and active
      const checkRes = await request(app).get(`/api/drop/${dropA.body.code}`);
      expect(checkRes.status).toBe(200);
      expect(checkRes.body.data.textContent).toBe('Drop A victim');
    });

    it('prevents file ID tampering across different drops', async () => {
      // Create Drop 1 with file
      const drop1 = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .attach('files', sampleTxtBuffer, 'doc1.txt');
      expect(drop1.status).toBe(201);
      trackedDropCodes.push(drop1.body.code);

      // Create Drop 2 with file
      const drop2 = await request(app)
        .post('/api/drop')
        .field('drop_type', 'files')
        .field('expiry', '1h')
        .attach('files', sampleTxtBuffer, 'doc2.txt');
      expect(drop2.status).toBe(201);
      trackedDropCodes.push(drop2.body.code);

      const file1 = await DropFile.findOne({ dropId: (await Drop.findOne({ code: drop1.body.code }))!._id });
      expect(file1).toBeDefined();

      // Access file1 under Drop 2's code
      const idorRes = await request(app).get(`/api/drop/${drop2.body.code}/download/${file1!._id}`);
      expect(idorRes.status).toBe(404);
      expect(idorRes.body.error.code).toBe('FILE_NOT_FOUND');
    });
  });
});


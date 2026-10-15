import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { Drop } from '../src/models/drop.model.js';
import { DropFile } from '../src/models/drop-file.model.js';
import { AuditLog } from '../src/models/audit-log.model.js';
import { AbuseReport } from '../src/models/abuse-report.model.js';
import { BlockedSource } from '../src/models/blocked-source.model.js';
import { dropService } from '../src/services/drop.service.js';
import { env } from '../src/config/env.js';
import { hashIp } from '../src/security/tokens.js';

describe('N1 Phase 14: Admin and Moderation Suite', () => {
  const app = createApp();
  let adminToken: string;
  let testDropCode: string;

  beforeAll(async () => {
    await connectDatabase();
    await Drop.deleteMany({});
    await DropFile.deleteMany({});
    await AuditLog.deleteMany({});
    await AbuseReport.deleteMany({});
    await BlockedSource.deleteMany({});

    // Create a sample drop with password
    const sampleDrop = await dropService.createDrop({
      type: 'text',
      text_content: 'Confidential administrative test content',
      expiry: '1h',
      password: 'SampleProtectedPassword123!',
      clientIp: '198.51.100.42',
    });
    testDropCode = sampleDrop.code;
  });

  afterAll(async () => {
    await Drop.deleteMany({});
    await DropFile.deleteMany({});
    await AuditLog.deleteMany({});
    await AbuseReport.deleteMany({});
    await BlockedSource.deleteMany({});
    await disconnectDatabase();
  });

  describe('1. Admin Authentication & Session Security', () => {
    it('rejects invalid credentials with HTTP 401 and logs security event', async () => {
      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({
          username: 'wrong-admin',
          password: 'wrong-password',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_ADMIN_CREDENTIALS');

      // Verify audit log captured failed login
      const audit = await AuditLog.findOne({ eventType: 'ADMIN_LOGIN_FAILED' });
      expect(audit).not.toBeNull();
      expect(audit?.severity).toBe('security');
    });

    it('authenticates with correct credentials and returns signed session token', async () => {
      const res = await request(app)
        .post('/api/admin/auth/login')
        .send({
          username: env.ADMIN_USERNAME,
          password: env.ADMIN_PASSWORD,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.username).toBe(env.ADMIN_USERNAME);
      expect(res.body.data.expiresAt).toBeDefined();

      adminToken = res.body.data.token;

      // Verify audit log captured success
      const audit = await AuditLog.findOne({ eventType: 'ADMIN_LOGIN_SUCCESS' });
      expect(audit).not.toBeNull();
    });

    it('verifies session with GET /api/admin/auth/me', async () => {
      const res = await request(app)
        .get('/api/admin/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.username).toBe(env.ADMIN_USERNAME);
      expect(res.body.data.role).toBe('admin');
    });

    it('rejects protected admin routes when authorization is missing', async () => {
      const res = await request(app).get('/api/admin/drops');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('ADMIN_UNAUTHORIZED');
    });

    it('allows access with x-admin-key header', async () => {
      const res = await request(app)
        .get('/api/admin/system/health')
        .set('x-admin-key', env.ADMIN_API_KEY);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('healthy');
    });
  });

  describe('2. Secret Redaction & Metadata Inspection', () => {
    it('lists drops without exposing passwordHash, ownerDeleteTokenHash, or filePath', async () => {
      const res = await request(app)
        .get('/api/admin/drops')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.drops.length).toBeGreaterThanOrEqual(1);

      const item = res.body.data.drops.find((d: any) => d.code === testDropCode);
      expect(item).toBeDefined();
      expect(item.hasPassword).toBe(true);
      expect(item.passwordHash).toBeUndefined();
      expect(item.ownerDeleteTokenHash).toBeUndefined();
      expect(item.filePath).toBeUndefined();
    });

    it('inspects Drop detail and strictly redacts all security secrets', async () => {
      const res = await request(app)
        .get(`/api/admin/drops/${testDropCode}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe(testDropCode);
      expect(res.body.data.textContent).toBe('Confidential administrative test content');
      expect(res.body.data.hasPassword).toBe(true);

      // Verify strict redaction
      expect(res.body.data.passwordHash).toBeUndefined();
      expect(res.body.data.ownerDeleteTokenHash).toBeUndefined();
      expect(res.body.data.filePath).toBeUndefined();

      // Verify IP is hashed for privacy
      expect(res.body.data.ipHash).toBeDefined();
      expect(res.body.data.ipHash).not.toBe('198.51.100.42');
    });
  });

  describe('3. Admin Drop Deletion & Purge', () => {
    it('allows admin to permanently delete any Drop and logs audit', async () => {
      // Create a dedicated drop to delete
      const dropToDelete = await dropService.createDrop({
        type: 'text',
        text_content: 'Drop to be purged by admin',
        expiry: '1h',
      });

      const res = await request(app)
        .delete(`/api/admin/drops/${dropToDelete.code}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Terms violation removal' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify drop status changed to deleted
      const check = await Drop.findOne({ code: dropToDelete.code });
      expect(check?.status).toBe('deleted');
      expect(check?.textContent).toBeNull();

      // Verify audit log
      const audit = await AuditLog.findOne({
        eventType: 'DROP_DELETED_BY_ADMIN',
        targetId: dropToDelete.code,
      });
      expect(audit).not.toBeNull();
      expect(audit?.action).toContain('Terms violation removal');
    });
  });

  describe('4. Abuse Reporting & Moderation Flow', () => {
    let reportId: string;

    it('allows a recipient to submit an abuse report via public endpoint', async () => {
      const res = await request(app)
        .post(`/api/drop/${testDropCode}/report`)
        .send({
          reason: 'phishing',
          description: 'This drop mimics a login page to steal credentials.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const report = await AbuseReport.findOne({ dropCode: testDropCode });
      expect(report).not.toBeNull();
      expect(report?.reason).toBe('phishing');
      expect(report?.status).toBe('pending');
      reportId = report!._id.toString();
    });

    it('allows admin to list abuse reports', async () => {
      const res = await request(app)
        .get('/api/admin/reports')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].reason).toBe('phishing');
    });

    it('allows admin to update abuse report status and add resolution notes', async () => {
      const res = await request(app)
        .patch(`/api/admin/reports/${reportId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'resolved',
          resolutionNote: 'Reviewed and confirmed phishing pattern; drop removed.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('resolved');
      expect(res.body.data.resolvedBy).toBe(env.ADMIN_USERNAME);
    });
  });

  describe('5. Abusive Source Blocking & Enforcement', () => {
    const abusiveIp = '203.0.113.195';
    const abusiveIpHash = hashIp(abusiveIp);

    it('blocks an abusive source IP hash', async () => {
      const res = await request(app)
        .post('/api/admin/blocked-sources')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ipHash: abusiveIpHash,
          reason: 'Automated spam bot pattern',
          durationHours: 24,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ipHash).toBe(abusiveIpHash);
      expect(res.body.data.isActive).toBe(true);
    });

    it('enforces blocklist and rejects uploads from blocked source with HTTP 403', async () => {
      // Simulate request from blocked IP
      const res = await request(app)
        .post('/api/drop')
        .set('X-Forwarded-For', abusiveIp)
        .send({
          type: 'text',
          text_content: 'Malicious spam upload attempt',
          expiry: '1h',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN_SOURCE');
    });

    it('unblocks the source and restores access', async () => {
      const res = await request(app)
        .delete(`/api/admin/blocked-sources/${abusiveIpHash}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = await BlockedSource.findOne({ ipHash: abusiveIpHash });
      expect(check?.isActive).toBe(false);
    });
  });

  describe('6. System Health, Storage Metrics & Telemetry', () => {
    it('returns system health with database ping and memory metrics', async () => {
      const res = await request(app)
        .get('/api/admin/system/health')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('healthy');
      expect(res.body.data.database.status).toBe('connected');
      expect(res.body.data.memory.heapUsedBytes).toBeGreaterThan(0);
      expect(res.body.data.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });

    it('returns storage metrics without exposing absolute local filesystem path', async () => {
      const res = await request(app)
        .get('/api/admin/system/storage')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.rootPathMasked).toBe('./storage/drops');
      expect(res.body.data.fileCount).toBeGreaterThanOrEqual(0);
      expect(res.body.data.totalSizeBytes).toBeGreaterThanOrEqual(0);
    });

    it('returns telemetry statistics', async () => {
      const res = await request(app)
        .get('/api/admin/system/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalDropsCreated).toBeGreaterThanOrEqual(1);
      expect(res.body.data.totalAbuseReports).toBeGreaterThanOrEqual(1);
    });
  });

  describe('7. Security Audit Logging', () => {
    it('queries chronological security audit logs', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.logs.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.total).toBeGreaterThanOrEqual(2);

      const hasLoginEvent = res.body.data.logs.some(
        (l: any) => l.eventType === 'ADMIN_LOGIN_SUCCESS' || l.eventType === 'ADMIN_LOGIN_FAILED'
      );
      expect(hasLoginEvent).toBe(true);
    });
  });
});

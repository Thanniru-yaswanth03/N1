import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { boardRoomRepository } from '../src/repositories/board-room.repository.js';
import { BoardRoomModel } from '../src/models/board-room.model.js';
import { expirationService } from '../src/services/expiration.service.js';

describe('N1 Phase 12: Study Board API & Expiration Tests', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase();
    // Clean test board rooms
    await BoardRoomModel.deleteMany({ title: /Test/i });
  });

  afterAll(async () => {
    await BoardRoomModel.deleteMany({ title: /Test/i });
    await disconnectDatabase();
  });

  describe('1. Room Creation (POST /api/board/rooms)', () => {
    it('creates a new blank study board room with default 24h expiration', async () => {
      const res = await request(app)
        .post('/api/board/rooms')
        .send({
          title: 'Test CS50 Study Room',
          template: 'blank',
          expiresInHours: 24,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toMatch(/^[A-Z0-9]{6}$/);
      expect(res.body.data.title).toBe('Test CS50 Study Room');
      expect(res.body.data.template).toBe('blank');
      expect(res.body.data.elementCount).toBe(0);
      expect(res.body.data.isExpired).toBe(false);
    });

    it('creates a room seeded with starter elements for mindmap template', async () => {
      const res = await request(app)
        .post('/api/board/rooms')
        .send({
          title: 'Test Mind Map Session',
          template: 'mindmap',
          expiresInHours: 6,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.template).toBe('mindmap');
      expect(res.body.data.elementCount).toBeGreaterThan(0);
    });

    it('rejects invalid template enum', async () => {
      const res = await request(app)
        .post('/api/board/rooms')
        .send({
          title: 'Test Invalid Room',
          template: 'invalid-template',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid expiration duration (< 1h or > 168h)', async () => {
      const res = await request(app)
        .post('/api/board/rooms')
        .send({
          title: 'Test Out of bounds Expiry',
          expiresInHours: 500,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('2. Room Retrieval & Elements Sync', () => {
    let createdCode = '';

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/board/rooms')
        .send({
          title: 'Test Retrieval Room',
          template: 'flowchart',
          expiresInHours: 12,
        });
      createdCode = res.body.data.code;
    });

    it('retrieves room details and canvas elements by code', async () => {
      const res = await request(app).get(`/api/board/rooms/${createdCode}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe(createdCode);
      expect(res.body.data.title).toBe('Test Retrieval Room');
      expect(res.body.data.template).toBe('flowchart');
      expect(Array.isArray(res.body.data.elements)).toBe(true);
      expect(res.body.data.timeRemainingSeconds).toBeGreaterThan(0);
    });

    it('returns 404 for non-existent room code', async () => {
      const res = await request(app).get('/api/board/rooms/ZZZZZZ');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ROOM_NOT_FOUND');
    });

    it('updates canvas elements via PUT /api/board/rooms/:code/elements', async () => {
      const sampleElement = {
        id: 'test-sticky-1',
        type: 'sticky',
        x: 100,
        y: 150,
        width: 200,
        height: 150,
        color: '#fbbf24',
        content: 'Synchronized test sticky note',
        strokeWidth: 2,
        zIndex: 1,
        updatedAt: Date.now(),
      };

      const putRes = await request(app)
        .put(`/api/board/rooms/${createdCode}/elements`)
        .send({ elements: [sampleElement] });

      expect(putRes.status).toBe(200);
      expect(putRes.body.success).toBe(true);

      // Verify persistence
      const getRes = await request(app).get(`/api/board/rooms/${createdCode}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.elements.length).toBe(1);
      expect(getRes.body.data.elements[0].id).toBe('test-sticky-1');
    });

    it('clears board elements via POST /api/board/rooms/:code/clear', async () => {
      const clearRes = await request(app).post(`/api/board/rooms/${createdCode}/clear`);
      expect(clearRes.status).toBe(200);
      expect(clearRes.body.success).toBe(true);

      const getRes = await request(app).get(`/api/board/rooms/${createdCode}`);
      expect(getRes.body.data.elements.length).toBe(0);
    });
  });

  describe('3. Room Expiration & Auto-Cleanup', () => {
    it('returns HTTP 410 Gone when accessing an expired room', async () => {
      // Create an already-expired room in MongoDB
      const past = new Date(Date.now() - 3600 * 1000);
      const expiredRoom = await boardRoomRepository.create({
        code: 'EXP999',
        title: 'Test Expired Room',
        template: 'blank',
        elements: [{ id: 'elem1', type: 'stroke', x: 0, y: 0, width: 10, height: 10, color: '#fff', strokeWidth: 2, zIndex: 1, updatedAt: Date.now() }],
        createdAt: new Date(Date.now() - 7200 * 1000),
        expiresAt: past,
        isExpired: false,
        lastActivityAt: past,
      });

      const res = await request(app).get(`/api/board/rooms/${expiredRoom.code}`);
      expect(res.status).toBe(410);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ROOM_EXPIRED');

      // Elements should be immediately purged
      const dbRoom = await boardRoomRepository.findByCode(expiredRoom.code);
      expect(dbRoom?.isExpired).toBe(true);
      expect(dbRoom?.elements.length).toBe(0);
    });

    it('permanently removes expired rooms during ExpirationService cleanup sweep', async () => {
      // Create a test expired room
      const past = new Date(Date.now() - 10000);
      await boardRoomRepository.create({
        code: 'DEL777',
        title: 'Test Room For Sweep',
        template: 'blank',
        elements: [],
        createdAt: new Date(Date.now() - 20000),
        expiresAt: past,
        isExpired: true,
        lastActivityAt: past,
      });

      // Run cleanup
      await expirationService.cleanExpiredDrops();

      // Check room was deleted
      const check = await boardRoomRepository.findByCode('DEL777');
      expect(check).toBeNull();
    });
  });
});

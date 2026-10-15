import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';

describe('GET /health probe', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('should return HTTP 200 with status ok at /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.service).toBe('n1-api');
    expect(res.body.data.storage.healthy).toBe(true);
    expect(res.body.data.database.connected).toBe(true);
  });

  it('should return HTTP 200 with status ok at /api/v1/health', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.database.connected).toBe(true);
  });

  it('should return HTTP 404 for unknown endpoints with standard error envelope', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('should return operational observability technical metrics at /health/metrics', async () => {
    const res = await request(app).get('/health/metrics');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(res.body.data.memory.heapUsedMB).toBeGreaterThan(0);
    expect(res.body.data.http.totalRequests).toBeGreaterThanOrEqual(1);
    expect(res.body.data.http.latency).toBeDefined();
    expect(res.body.data.websockets.board).toBeDefined();
    expect(res.body.data.websockets.duel).toBeDefined();
    expect(res.body.data.drops.activeCount).toBeGreaterThanOrEqual(0);
    expect(res.body.data.errors).toEqual({
      storageErrors: 0,
      databaseErrors: 0,
    });
  });

  it('should return operational observability technical metrics at /api/v1/health/metrics', async () => {
    const res = await request(app).get('/api/v1/health/metrics');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.http.statusCodes).toBeDefined();
  });
});

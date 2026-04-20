import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ============================================================================
// Mock Setup
// ============================================================================

const JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-chars-long!!';
const BUILDING_ID = '550e8400-e29b-41d4-a716-446655440099';
const EQUIPMENT_ID = '550e8400-e29b-41d4-a716-446655440010';

const mockAssetsService = {
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
  getHealth: vi.fn(),
  getMetrics: vi.fn(),
  linkSensors: vi.fn(),
};

vi.mock('@backend/config', () => ({
  config: {
    JWT_SECRET,
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    NODE_ENV: 'test',
    RATE_LIMIT_WINDOW_MS: 900000,
    RATE_LIMIT_MAX_REQUESTS: 1000,
    RATE_LIMIT_AUTH_MAX: 50,
  },
}));

vi.mock('@backend/config/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@backend/config/redis', () => {
  const p = {
    zremrangebyscore: vi.fn().mockReturnThis(),
    zadd: vi.fn().mockReturnThis(),
    zcard: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([[null,0],[null,1],[null,1],[null,1]]),
  };
  return { getRedisClient: vi.fn(() => ({ pipeline: vi.fn(() => p) })), connectRedis: vi.fn(), disconnectRedis: vi.fn() };
});

vi.mock('@backend/config/database', () => ({ prisma: {}, connectDatabase: vi.fn(), disconnectDatabase: vi.fn() }));
vi.mock('@backend/config/mqtt', () => ({ getMqttClient: vi.fn(), subscribeMqttTopics: vi.fn(), disconnectMqtt: vi.fn() }));

vi.mock('@backend/modules/assets/assets.service', () => ({
  assetsService: mockAssetsService,
  AssetsService: vi.fn().mockImplementation(() => mockAssetsService),
}));

import assetsRoutes from '@backend/modules/assets/assets.routes';
import { errorHandler } from '@backend/middleware/errorHandler';
import { rateLimiter } from '@backend/middleware/rateLimiter';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(rateLimiter({ maxRequests: 1000 }));
  app.use('/api/v1/equipment', assetsRoutes);
  app.use(errorHandler);
  return app;
}

function token(role: string) {
  return jwt.sign(
    { userId: 'user-1', email: 'test@test.com', role, buildingId: BUILDING_ID },
    JWT_SECRET,
    { expiresIn: '15m', subject: 'user-1' }
  );
}

describe('Assets API Integration Tests', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => { app = createApp(); });
  beforeEach(() => { vi.clearAllMocks(); });

  const mockEquipment = {
    id: EQUIPMENT_ID,
    buildingId: BUILDING_ID,
    name: 'Main Generator',
    type: 'genset',
    healthStatus: 'green',
    serialNumber: 'GEN-001',
    manufacturer: 'Caterpillar',
    model: 'C9',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  // =========================================================================
  // GET /api/v1/equipment
  // =========================================================================
  describe('GET /api/v1/equipment', () => {
    it('IT-ASSET-01: should return 200 with equipment list for sys_admin', async () => {
      mockAssetsService.list.mockResolvedValue({
        equipment: [mockEquipment],
        total: 1,
      });

      const res = await request(app)
        .get('/api/v1/equipment')
        .set('Authorization', `Bearer ${token('sys_admin')}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta).toBeDefined();
    });

    it('IT-ASSET-02: should return 403 for financial_decision_maker', async () => {
      const res = await request(app)
        .get('/api/v1/equipment')
        .set('Authorization', `Bearer ${token('financial_decision_maker')}`);

      expect(res.status).toBe(403);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/equipment');
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // POST /api/v1/equipment
  // =========================================================================
  describe('POST /api/v1/equipment', () => {
    const createBody = {
      buildingId: BUILDING_ID,
      name: 'New Chiller',
      type: 'chiller',
    };

    it('IT-ASSET-03: should return 201 for sys_admin with valid body', async () => {
      mockAssetsService.create.mockResolvedValue({
        id: 'new-eq-id',
        ...createBody,
        healthStatus: 'green',
        isActive: true,
        createdAt: new Date().toISOString(),
      });

      const res = await request(app)
        .post('/api/v1/equipment')
        .set('Authorization', `Bearer ${token('sys_admin')}`)
        .send(createBody);

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('New Chiller');
    });

    it('IT-ASSET-04: should return 400 on missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/equipment')
        .set('Authorization', `Bearer ${token('sys_admin')}`)
        .send({ name: 'No Type' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 for technician creating equipment', async () => {
      const res = await request(app)
        .post('/api/v1/equipment')
        .set('Authorization', `Bearer ${token('technician')}`)
        .send(createBody);

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // GET /api/v1/equipment/:id
  // =========================================================================
  describe('GET /api/v1/equipment/:id', () => {
    it('IT-ASSET-05: should return 200 with equipment detail', async () => {
      mockAssetsService.getById.mockResolvedValue(mockEquipment);

      const res = await request(app)
        .get(`/api/v1/equipment/${EQUIPMENT_ID}`)
        .set('Authorization', `Bearer ${token('sys_admin')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(EQUIPMENT_ID);
    });

    it('should return 400 for non-UUID id', async () => {
      const res = await request(app)
        .get('/api/v1/equipment/not-a-uuid')
        .set('Authorization', `Bearer ${token('sys_admin')}`);

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // PUT /api/v1/equipment/:id
  // =========================================================================
  describe('PUT /api/v1/equipment/:id', () => {
    it('IT-ASSET-06: should return 200 for sys_admin update', async () => {
      mockAssetsService.update.mockResolvedValue({
        ...mockEquipment,
        name: 'Updated Generator',
      });

      const res = await request(app)
        .put(`/api/v1/equipment/${EQUIPMENT_ID}`)
        .set('Authorization', `Bearer ${token('sys_admin')}`)
        .send({ name: 'Updated Generator' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Generator');
    });
  });

  // =========================================================================
  // DELETE /api/v1/equipment/:id
  // =========================================================================
  describe('DELETE /api/v1/equipment/:id', () => {
    it('IT-ASSET-07: should return 204 for sys_admin', async () => {
      mockAssetsService.softDelete.mockResolvedValue(undefined);

      const res = await request(app)
        .delete(`/api/v1/equipment/${EQUIPMENT_ID}`)
        .set('Authorization', `Bearer ${token('sys_admin')}`);

      expect(res.status).toBe(204);
    });

    it('IT-ASSET-08: should return 403 for technician', async () => {
      const res = await request(app)
        .delete(`/api/v1/equipment/${EQUIPMENT_ID}`)
        .set('Authorization', `Bearer ${token('technician')}`);

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // GET /api/v1/equipment/:id/health
  // =========================================================================
  describe('GET /api/v1/equipment/:id/health', () => {
    it('IT-ASSET-09: should return 200 for any authenticated user', async () => {
      mockAssetsService.getHealth.mockResolvedValue({
        id: EQUIPMENT_ID,
        healthStatus: 'green',
        metrics: {},
      });

      const res = await request(app)
        .get(`/api/v1/equipment/${EQUIPMENT_ID}/health`)
        .set('Authorization', `Bearer ${token('financial_decision_maker')}`);

      expect(res.status).toBe(200);
    });
  });

  // =========================================================================
  // POST /api/v1/equipment/:id/sensors
  // =========================================================================
  describe('POST /api/v1/equipment/:id/sensors', () => {
    it('IT-ASSET-11: should return 201 for sys_admin linking sensors', async () => {
      mockAssetsService.linkSensors.mockResolvedValue({ linked: 2 });

      const res = await request(app)
        .post(`/api/v1/equipment/${EQUIPMENT_ID}/sensors`)
        .set('Authorization', `Bearer ${token('sys_admin')}`)
        .send({
          sensorIds: [
            '550e8400-e29b-41d4-a716-446655440020',
            '550e8400-e29b-41d4-a716-446655440021',
          ],
        });

      expect(res.status).toBe(201);
    });
  });
});

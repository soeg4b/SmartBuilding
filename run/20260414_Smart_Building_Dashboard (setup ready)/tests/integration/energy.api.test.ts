import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ============================================================================
// Mock Setup
// ============================================================================

const JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-chars-long!!';
const BUILDING_ID = '550e8400-e29b-41d4-a716-446655440099';

const mockEnergyService = {
  getConsumption: vi.fn(),
  getTrends: vi.fn(),
  getPeakLoad: vi.fn(),
  getBillingProjection: vi.fn(),
  getTariffs: vi.fn(),
  upsertTariff: vi.fn(),
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

vi.mock('@backend/modules/energy/energy.service', () => ({
  energyService: mockEnergyService,
  EnergyService: vi.fn().mockImplementation(() => mockEnergyService),
}));

import energyRoutes from '@backend/modules/energy/energy.routes';
import { errorHandler } from '@backend/middleware/errorHandler';
import { rateLimiter } from '@backend/middleware/rateLimiter';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(rateLimiter({ maxRequests: 1000 }));
  app.use('/api/v1/energy', energyRoutes);
  app.use(errorHandler);
  return app;
}

function token(role: string, buildingId?: string) {
  return jwt.sign(
    { userId: 'user-1', email: 'test@test.com', role, buildingId },
    JWT_SECRET,
    { expiresIn: '15m', subject: 'user-1' }
  );
}

describe('Energy API Integration Tests', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => { app = createApp(); });
  beforeEach(() => { vi.clearAllMocks(); });

  // =========================================================================
  // GET /api/v1/energy/consumption
  // =========================================================================
  describe('GET /api/v1/energy/consumption', () => {
    it('IT-ENERGY-01: should return 200 with consumption data for valid buildingId', async () => {
      mockEnergyService.getConsumption.mockResolvedValue({
        buildingId: BUILDING_ID,
        totalCurrentKwh: 250.5,
        sensors: [],
        timestamp: new Date().toISOString(),
      });

      const res = await request(app)
        .get('/api/v1/energy/consumption')
        .query({ buildingId: BUILDING_ID })
        .set('Authorization', `Bearer ${token('sys_admin')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.buildingId).toBe(BUILDING_ID);
      expect(res.body.data.totalCurrentKwh).toBe(250.5);
    });

    it('IT-ENERGY-02: should return 400 on missing buildingId', async () => {
      const res = await request(app)
        .get('/api/v1/energy/consumption')
        .set('Authorization', `Bearer ${token('sys_admin')}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/energy/consumption');
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // GET /api/v1/energy/trends
  // =========================================================================
  describe('GET /api/v1/energy/trends', () => {
    it('IT-ENERGY-03: should return 200 with trend data', async () => {
      mockEnergyService.getTrends.mockResolvedValue({
        buildingId: BUILDING_ID,
        interval: 'daily',
        series: [{ timestamp: '2026-04-01T00:00:00Z', kwh: 500, peakKw: 80 }],
        summary: { totalKwh: 500, avgPowerFactor: 0.92, peakKw: 80, peakTimestamp: '2026-04-01' },
      });

      const res = await request(app)
        .get('/api/v1/energy/trends')
        .query({
          buildingId: BUILDING_ID,
          from: '2026-04-01T00:00:00Z',
          to: '2026-04-15T00:00:00Z',
          interval: 'daily',
        })
        .set('Authorization', `Bearer ${token('technician')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.series).toHaveLength(1);
      expect(res.body.data.summary.totalKwh).toBe(500);
    });
  });

  // =========================================================================
  // GET /api/v1/energy/billing-projection
  // =========================================================================
  describe('GET /api/v1/energy/billing-projection', () => {
    it('IT-ENERGY-04: should return 200 for financial_decision_maker', async () => {
      mockEnergyService.getBillingProjection.mockResolvedValue({
        projectedCost: 15000000,
        currency: 'IDR',
      });

      const res = await request(app)
        .get('/api/v1/energy/billing-projection')
        .query({ buildingId: BUILDING_ID })
        .set('Authorization', `Bearer ${token('financial_decision_maker')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.projectedCost).toBeDefined();
    });

    it('IT-ENERGY-05: should return 403 for technician', async () => {
      const res = await request(app)
        .get('/api/v1/energy/billing-projection')
        .query({ buildingId: BUILDING_ID })
        .set('Authorization', `Bearer ${token('technician')}`);

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // GET /api/v1/energy/tariffs
  // =========================================================================
  describe('GET /api/v1/energy/tariffs', () => {
    it('IT-ENERGY-07: should return 200 for sys_admin', async () => {
      mockEnergyService.getTariffs.mockResolvedValue([
        { id: 't1', name: 'Standard', ratePerKwh: 1500, currency: 'IDR' },
      ]);

      const res = await request(app)
        .get('/api/v1/energy/tariffs')
        .query({ buildingId: BUILDING_ID })
        .set('Authorization', `Bearer ${token('sys_admin')}`);

      expect(res.status).toBe(200);
    });

    it('IT-ENERGY-08: should return 403 for non-admin', async () => {
      const res = await request(app)
        .get('/api/v1/energy/tariffs')
        .query({ buildingId: BUILDING_ID })
        .set('Authorization', `Bearer ${token('technician')}`);

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // PUT /api/v1/energy/tariffs
  // =========================================================================
  describe('PUT /api/v1/energy/tariffs', () => {
    it('IT-ENERGY-09: should return 201 for sys_admin with valid body', async () => {
      mockEnergyService.upsertTariff.mockResolvedValue({
        id: 't1',
        name: 'Updated',
        ratePerKwh: 1600,
        currency: 'IDR',
      });

      const res = await request(app)
        .put('/api/v1/energy/tariffs')
        .set('Authorization', `Bearer ${token('sys_admin')}`)
        .send({
          buildingId: BUILDING_ID,
          name: 'Updated',
          ratePerKwh: 1600,
          currency: 'IDR',
          effectiveFrom: '2026-05-01T00:00:00Z',
        });

      expect(res.status).toBe(201);
    });
  });
});

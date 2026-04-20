import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ============================================================================
// Mock Setup
// ============================================================================

const JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-chars-long!!';
const BUILDING_ID = '550e8400-e29b-41d4-a716-446655440099';

const mockDashboardService = {
  getExecutiveSummary: vi.fn(),
  getOperationsSummary: vi.fn(),
  getTechnicianSummary: vi.fn(),
  getBuildingSummary: vi.fn(),
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

vi.mock('@backend/modules/dashboard/dashboard.service', () => ({
  dashboardService: mockDashboardService,
  DashboardService: vi.fn().mockImplementation(() => mockDashboardService),
}));

import dashboardRoutes from '@backend/modules/dashboard/dashboard.routes';
import { errorHandler } from '@backend/middleware/errorHandler';
import { rateLimiter } from '@backend/middleware/rateLimiter';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(rateLimiter({ maxRequests: 1000 }));
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use(errorHandler);
  return app;
}

function token(role: string, buildingId: string = BUILDING_ID) {
  return jwt.sign(
    { userId: 'user-1', email: 'test@test.com', role, buildingId },
    JWT_SECRET,
    { expiresIn: '15m', subject: 'user-1' }
  );
}

describe('Dashboard API Integration Tests', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => { app = createApp(); });
  beforeEach(() => { vi.clearAllMocks(); });

  // =========================================================================
  // GET /api/v1/dashboard/executive
  // =========================================================================
  describe('GET /api/v1/dashboard/executive', () => {
    it('IT-DASH-01: should return 200 for financial_decision_maker', async () => {
      mockDashboardService.getExecutiveSummary.mockResolvedValue({
        energyCost: 15000000,
        savings: 2000000,
        comfortIndex: 0.87,
        energyTrend: [],
      });

      const res = await request(app)
        .get('/api/v1/dashboard/executive')
        .query({ buildingId: BUILDING_ID })
        .set('Authorization', `Bearer ${token('financial_decision_maker')}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('energyCost');
      expect(res.body.data).toHaveProperty('comfortIndex');
    });

    it('IT-RBAC-01: should return 403 for sys_admin', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/executive')
        .query({ buildingId: BUILDING_ID })
        .set('Authorization', `Bearer ${token('sys_admin')}`);

      expect(res.status).toBe(403);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/dashboard/executive');
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // GET /api/v1/dashboard/operations
  // =========================================================================
  describe('GET /api/v1/dashboard/operations', () => {
    it('IT-DASH-02: should return 200 for sys_admin', async () => {
      mockDashboardService.getOperationsSummary.mockResolvedValue({
        sensorCounts: { online: 15, offline: 3, stale: 2 },
        equipmentHealth: { green: 8, yellow: 1, red: 1 },
        recentEvents: [],
      });

      const res = await request(app)
        .get('/api/v1/dashboard/operations')
        .query({ buildingId: BUILDING_ID })
        .set('Authorization', `Bearer ${token('sys_admin')}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('sensorCounts');
      expect(res.body.data).toHaveProperty('equipmentHealth');
    });

    it('IT-RBAC-03: should return 403 for technician', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/operations')
        .query({ buildingId: BUILDING_ID })
        .set('Authorization', `Bearer ${token('technician')}`);

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // GET /api/v1/dashboard/technician
  // =========================================================================
  describe('GET /api/v1/dashboard/technician', () => {
    it('IT-DASH-03: should return 200 for technician', async () => {
      mockDashboardService.getTechnicianSummary.mockResolvedValue({
        assignedEquipment: [],
        pendingAlerts: 3,
        recentActivity: [],
      });

      const res = await request(app)
        .get('/api/v1/dashboard/technician')
        .query({ buildingId: BUILDING_ID })
        .set('Authorization', `Bearer ${token('technician')}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('pendingAlerts');
    });

    it('IT-RBAC-05: should return 403 for financial_decision_maker', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/technician')
        .query({ buildingId: BUILDING_ID })
        .set('Authorization', `Bearer ${token('financial_decision_maker')}`);

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // GET /api/v1/dashboard/summary
  // =========================================================================
  describe('GET /api/v1/dashboard/summary', () => {
    it('IT-DASH-04: should return 200 for any authenticated user', async () => {
      mockDashboardService.getBuildingSummary.mockResolvedValue({
        buildingId: BUILDING_ID,
        name: 'Building A',
        floors: 5,
        sensors: 20,
        equipment: 10,
      });

      const res = await request(app)
        .get('/api/v1/dashboard/summary')
        .query({ buildingId: BUILDING_ID })
        .set('Authorization', `Bearer ${token('technician')}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('buildingId');
    });
  });
});

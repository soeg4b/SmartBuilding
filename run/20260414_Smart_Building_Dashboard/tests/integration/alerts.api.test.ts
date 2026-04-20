import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ============================================================================
// Mock Setup
// ============================================================================

const JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-chars-long!!';
const BUILDING_ID = '550e8400-e29b-41d4-a716-446655440099';
const RULE_ID = '550e8400-e29b-41d4-a716-446655440030';
const ALERT_ID = '550e8400-e29b-41d4-a716-446655440040';

const mockAlertsService = {
  listAlertRules: vi.fn(),
  createAlertRule: vi.fn(),
  updateAlertRule: vi.fn(),
  updateRuleStatus: vi.fn(),
  deleteAlertRule: vi.fn(),
  listAlerts: vi.fn(),
  getAlertById: vi.fn(),
  acknowledgeAlert: vi.fn(),
  resolveAlert: vi.fn(),
  listNotifications: vi.fn(),
  markNotificationsRead: vi.fn(),
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

vi.mock('@backend/modules/alerts/alerts.service', () => ({
  alertsService: mockAlertsService,
  AlertsService: vi.fn().mockImplementation(() => mockAlertsService),
}));

import { alertRulesRouter, alertsRouter, notificationsRouter } from '@backend/modules/alerts/alerts.routes';
import { errorHandler } from '@backend/middleware/errorHandler';
import { rateLimiter } from '@backend/middleware/rateLimiter';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(rateLimiter({ maxRequests: 1000 }));
  app.use('/api/v1/alert-rules', alertRulesRouter);
  app.use('/api/v1/alerts', alertsRouter);
  app.use('/api/v1/notifications', notificationsRouter);
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

describe('Alerts API Integration Tests', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => { app = createApp(); });
  beforeEach(() => { vi.clearAllMocks(); });

  // =========================================================================
  // Alert Rules CRUD
  // =========================================================================
  describe('Alert Rules', () => {
    it('IT-ALERT-01: should return 200 with rules list for sys_admin', async () => {
      mockAlertsService.listAlertRules.mockResolvedValue([
        { id: RULE_ID, name: 'High Temp', operator: '>', threshold: 30, severity: 'warning' },
      ]);

      const res = await request(app)
        .get('/api/v1/alert-rules')
        .set('Authorization', `Bearer ${token('sys_admin')}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('IT-ALERT-02: should return 403 for technician listing rules', async () => {
      const res = await request(app)
        .get('/api/v1/alert-rules')
        .set('Authorization', `Bearer ${token('technician')}`);

      expect(res.status).toBe(403);
    });

    it('IT-ALERT-03: should return 201 for sys_admin creating rule', async () => {
      mockAlertsService.createAlertRule.mockResolvedValue({
        id: 'new-rule',
        name: 'CO2 Alert',
        operator: '>',
        threshold: 1000,
        severity: 'critical',
      });

      const res = await request(app)
        .post('/api/v1/alert-rules')
        .set('Authorization', `Bearer ${token('sys_admin')}`)
        .send({
          name: 'CO2 Alert',
          buildingId: BUILDING_ID,
          operator: '>',
          threshold: 1000,
          severity: 'critical',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('CO2 Alert');
    });

    it('IT-ALERT-04: should return 200 for sys_admin updating rule', async () => {
      mockAlertsService.updateAlertRule.mockResolvedValue({
        id: RULE_ID,
        name: 'Updated Rule',
        operator: '>=',
        threshold: 35,
      });

      const res = await request(app)
        .put(`/api/v1/alert-rules/${RULE_ID}`)
        .set('Authorization', `Bearer ${token('sys_admin')}`)
        .send({ name: 'Updated Rule', threshold: 35 });

      expect(res.status).toBe(200);
    });

    it('IT-ALERT-05: should return 200 for toggling rule status', async () => {
      mockAlertsService.updateRuleStatus.mockResolvedValue({ id: RULE_ID, isActive: false });

      const res = await request(app)
        .patch(`/api/v1/alert-rules/${RULE_ID}/status`)
        .set('Authorization', `Bearer ${token('sys_admin')}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });

    it('IT-ALERT-06: should return 204 for deleting rule', async () => {
      mockAlertsService.deleteAlertRule.mockResolvedValue(undefined);

      const res = await request(app)
        .delete(`/api/v1/alert-rules/${RULE_ID}`)
        .set('Authorization', `Bearer ${token('sys_admin')}`);

      expect(res.status).toBe(204);
    });

    it('should return 400 for invalid operator in create', async () => {
      const res = await request(app)
        .post('/api/v1/alert-rules')
        .set('Authorization', `Bearer ${token('sys_admin')}`)
        .send({
          name: 'Bad Rule',
          buildingId: BUILDING_ID,
          operator: '!=',
          threshold: 100,
          severity: 'info',
        });

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // Alerts
  // =========================================================================
  describe('Alerts', () => {
    it('IT-ALERT-07: should return 200 with filtered alerts for sys_admin', async () => {
      mockAlertsService.listAlerts.mockResolvedValue({
        alerts: [{ id: ALERT_ID, status: 'active', severity: 'critical' }],
        total: 1,
      });

      const res = await request(app)
        .get('/api/v1/alerts')
        .query({ status: 'active' })
        .set('Authorization', `Bearer ${token('sys_admin')}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('IT-ALERT-08: should return 403 for financial_decision_maker', async () => {
      const res = await request(app)
        .get('/api/v1/alerts')
        .set('Authorization', `Bearer ${token('financial_decision_maker')}`);

      expect(res.status).toBe(403);
    });

    it('IT-ALERT-09: should return 200 for valid alert detail', async () => {
      mockAlertsService.getAlertById.mockResolvedValue({
        id: ALERT_ID,
        status: 'active',
        severity: 'critical',
        message: 'Temperature exceeded threshold',
      });

      const res = await request(app)
        .get(`/api/v1/alerts/${ALERT_ID}`)
        .set('Authorization', `Bearer ${token('sys_admin')}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(ALERT_ID);
    });

    it('IT-ALERT-10: should return 200 when acknowledging alert', async () => {
      mockAlertsService.acknowledgeAlert.mockResolvedValue({
        id: ALERT_ID,
        status: 'acknowledged',
        acknowledgedAt: new Date().toISOString(),
        acknowledgedBy: 'user-1',
      });

      const res = await request(app)
        .patch(`/api/v1/alerts/${ALERT_ID}/acknowledge`)
        .set('Authorization', `Bearer ${token('sys_admin')}`)
        .send({ comment: 'Acknowledged, investigating.' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('acknowledged');
    });

    it('IT-ALERT-12: should return 200 when resolving alert', async () => {
      mockAlertsService.resolveAlert.mockResolvedValue({
        id: ALERT_ID,
        status: 'resolved',
        resolvedAt: new Date().toISOString(),
        resolvedBy: 'user-1',
      });

      const res = await request(app)
        .patch(`/api/v1/alerts/${ALERT_ID}/resolve`)
        .set('Authorization', `Bearer ${token('technician')}`)
        .send({ comment: 'Fixed by replacing sensor.' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('resolved');
    });

    it('should allow technician to view alerts', async () => {
      mockAlertsService.listAlerts.mockResolvedValue({ alerts: [], total: 0 });

      const res = await request(app)
        .get('/api/v1/alerts')
        .set('Authorization', `Bearer ${token('technician')}`);

      expect(res.status).toBe(200);
    });
  });

  // =========================================================================
  // Notifications
  // =========================================================================
  describe('Notifications', () => {
    it('IT-NOTIF-01: should return 200 with notifications', async () => {
      mockAlertsService.listNotifications.mockResolvedValue({
        notifications: [{ id: 'n1', message: 'Alert triggered', isRead: false }],
        total: 1,
      });

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${token('sys_admin')}`);

      expect(res.status).toBe(200);
    });

    it('IT-NOTIF-03: should return 200 when marking notifications read', async () => {
      mockAlertsService.markNotificationsRead.mockResolvedValue({ updated: 1 });

      const res = await request(app)
        .patch('/api/v1/notifications/read')
        .set('Authorization', `Bearer ${token('sys_admin')}`)
        .send({ ids: ['550e8400-e29b-41d4-a716-446655440050'] });

      expect(res.status).toBe(200);
    });
  });
});

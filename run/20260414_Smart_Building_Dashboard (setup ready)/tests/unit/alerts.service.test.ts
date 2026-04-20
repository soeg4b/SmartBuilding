import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Mocks
// ============================================================================

const mockPrisma = {
  alertRule: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  alert: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  notification: {
    findMany: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
};

vi.mock('@backend/config/database', () => ({
  prisma: mockPrisma,
}));

vi.mock('@backend/config/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { AlertsService } from '@backend/modules/alerts/alerts.service';

describe('AlertsService', () => {
  let alertsService: AlertsService;

  const mockAlertRule = {
    id: 'rule-1',
    buildingId: 'building-1',
    name: 'High Temperature Alert',
    sensorType: 'temperature',
    sensorId: 'sensor-1',
    operator: 'gt',
    threshold: 30,
    severity: 'warning',
    cooldownMinutes: 15,
    emailNotification: true,
    emailRecipients: ['admin@test.com'],
    isActive: true,
    createdBy: 'user-1',
    createdAt: new Date('2026-04-01T00:00:00Z'),
    updatedAt: new Date('2026-04-01T00:00:00Z'),
    sensor: { id: 'sensor-1', name: 'Temp Sensor 1', type: 'temperature' },
    creator: { id: 'user-1', name: 'Admin' },
  };

  beforeEach(() => {
    alertsService = new AlertsService();
    vi.clearAllMocks();
  });

  // =========================================================================
  // listAlertRules()
  // =========================================================================
  describe('listAlertRules()', () => {
    it('should return all alert rules', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([mockAlertRule]);

      const result = await alertsService.listAlertRules();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rule-1');
      expect(result[0].name).toBe('High Temperature Alert');
      expect(result[0].operator).toBe('>'); // mapped from 'gt'
      expect(result[0].severity).toBe('warning');
    });

    it('should filter by buildingId', async () => {
      mockPrisma.alertRule.findMany.mockResolvedValue([]);

      await alertsService.listAlertRules('building-1');

      expect(mockPrisma.alertRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ buildingId: 'building-1' }),
        })
      );
    });

    it('should map all operators correctly', async () => {
      const operators = [
        { prisma: 'gt', api: '>' },
        { prisma: 'lt', api: '<' },
        { prisma: 'gte', api: '>=' },
        { prisma: 'lte', api: '<=' },
        { prisma: 'eq', api: '==' },
      ];

      for (const op of operators) {
        mockPrisma.alertRule.findMany.mockResolvedValue([
          { ...mockAlertRule, operator: op.prisma },
        ]);

        const result = await alertsService.listAlertRules();
        expect(result[0].operator).toBe(op.api);
      }
    });
  });

  // =========================================================================
  // createAlertRule()
  // =========================================================================
  describe('createAlertRule()', () => {
    const createInput = {
      name: 'New Alert Rule',
      buildingId: 'building-1',
      sensorType: 'temperature',
      sensorId: 'sensor-1',
      operator: '>',
      threshold: 35,
      severity: 'critical',
      cooldownMinutes: 10,
      emailNotification: true,
      emailRecipients: ['admin@test.com'],
      isActive: true,
    };

    it('should create alert rule with mapped operator', async () => {
      mockPrisma.alertRule.create.mockResolvedValue({
        id: 'new-rule-1',
        ...createInput,
        operator: 'gt', // stored as Prisma enum
        createdAt: new Date(),
      });

      const result = await alertsService.createAlertRule(createInput, 'user-1');

      expect(result.id).toBe('new-rule-1');
      expect(result.operator).toBe('>');
      expect(mockPrisma.alertRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            operator: 'gt',
            createdBy: 'user-1',
          }),
        })
      );
    });

    it('should throw INVALID_OPERATOR for unknown operator', async () => {
      const badInput = { ...createInput, operator: '!=' };

      await expect(alertsService.createAlertRule(badInput, 'user-1'))
        .rejects.toMatchObject({
          statusCode: 400,
          code: 'INVALID_OPERATOR',
        });
    });

    it('should handle nullable sensorType and sensorId', async () => {
      const inputWithNulls = {
        ...createInput,
        sensorType: null,
        sensorId: null,
      };

      mockPrisma.alertRule.create.mockResolvedValue({
        id: 'new-rule-2',
        ...inputWithNulls,
        operator: 'gt',
        createdAt: new Date(),
      });

      const result = await alertsService.createAlertRule(inputWithNulls, 'user-1');
      expect(result.id).toBe('new-rule-2');
    });
  });

  // =========================================================================
  // updateAlertRule()
  // =========================================================================
  describe('updateAlertRule()', () => {
    it('should update an existing rule', async () => {
      mockPrisma.alertRule.findUnique.mockResolvedValue(mockAlertRule);
      mockPrisma.alertRule.update.mockResolvedValue({
        ...mockAlertRule,
        name: 'Updated Rule',
        operator: 'gte',
        threshold: 40,
        updatedAt: new Date(),
      });

      const result = await alertsService.updateAlertRule('rule-1', {
        name: 'Updated Rule',
        operator: '>=',
        threshold: 40,
      });

      expect(result.name).toBe('Updated Rule');
      expect(result.operator).toBe('>=');
    });

    it('should throw ALERT_RULE_NOT_FOUND for nonexistent rule', async () => {
      mockPrisma.alertRule.findUnique.mockResolvedValue(null);

      await expect(alertsService.updateAlertRule('nonexistent', { name: 'x' }))
        .rejects.toMatchObject({
          statusCode: 404,
          code: 'ALERT_RULE_NOT_FOUND',
        });
    });

    it('should throw INVALID_OPERATOR for bad operator update', async () => {
      mockPrisma.alertRule.findUnique.mockResolvedValue(mockAlertRule);

      await expect(
        alertsService.updateAlertRule('rule-1', { operator: '!!' })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_OPERATOR',
      });
    });

    it('should only update provided fields', async () => {
      mockPrisma.alertRule.findUnique.mockResolvedValue(mockAlertRule);
      mockPrisma.alertRule.update.mockResolvedValue({
        ...mockAlertRule,
        threshold: 50,
        updatedAt: new Date(),
      });

      await alertsService.updateAlertRule('rule-1', { threshold: 50 });

      const updateCall = mockPrisma.alertRule.update.mock.calls[0][0];
      expect(updateCall.data).toHaveProperty('threshold', 50);
      expect(updateCall.data).not.toHaveProperty('name');
      expect(updateCall.data).not.toHaveProperty('operator');
    });
  });

  // =========================================================================
  // updateRuleStatus()
  // =========================================================================
  describe('updateRuleStatus()', () => {
    it('should toggle rule isActive status', async () => {
      mockPrisma.alertRule.findUnique.mockResolvedValue(mockAlertRule);
      mockPrisma.alertRule.update.mockResolvedValue({ ...mockAlertRule, isActive: false });

      const result = await alertsService.updateRuleStatus('rule-1', false);

      expect(result.isActive).toBe(false);
    });

    it('should throw ALERT_RULE_NOT_FOUND for nonexistent rule', async () => {
      mockPrisma.alertRule.findUnique.mockResolvedValue(null);

      await expect(alertsService.updateRuleStatus('nonexistent', false))
        .rejects.toMatchObject({
          statusCode: 404,
          code: 'ALERT_RULE_NOT_FOUND',
        });
    });
  });

  // =========================================================================
  // deleteAlertRule()
  // =========================================================================
  describe('deleteAlertRule()', () => {
    it('should delete an existing rule', async () => {
      mockPrisma.alertRule.findUnique.mockResolvedValue(mockAlertRule);
      mockPrisma.alertRule.delete.mockResolvedValue(mockAlertRule);

      await expect(alertsService.deleteAlertRule('rule-1')).resolves.toBeUndefined();

      expect(mockPrisma.alertRule.delete).toHaveBeenCalledWith({ where: { id: 'rule-1' } });
    });

    it('should throw ALERT_RULE_NOT_FOUND for nonexistent rule', async () => {
      mockPrisma.alertRule.findUnique.mockResolvedValue(null);

      await expect(alertsService.deleteAlertRule('nonexistent'))
        .rejects.toMatchObject({
          statusCode: 404,
          code: 'ALERT_RULE_NOT_FOUND',
        });
    });
  });
});

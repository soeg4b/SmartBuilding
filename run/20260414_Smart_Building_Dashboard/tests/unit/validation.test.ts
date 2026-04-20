import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
} from '@backend/modules/auth/auth.validation';
import {
  energyConsumptionQuerySchema,
  energyTrendsQuerySchema,
  peakLoadQuerySchema,
  billingProjectionQuerySchema,
  updateTariffSchema,
} from '@backend/modules/energy/energy.validation';
import {
  createEquipmentSchema,
  updateEquipmentSchema,
  listEquipmentQuerySchema,
  equipmentIdParamSchema,
  metricsQuerySchema,
  linkSensorsSchema,
} from '@backend/modules/assets/assets.validation';
import {
  createAlertRuleSchema,
  updateAlertRuleSchema,
  alertRuleIdParamSchema,
  updateRuleStatusSchema,
  listAlertsQuerySchema,
  acknowledgeAlertSchema,
  resolveAlertSchema,
  listNotificationsQuerySchema,
  markNotificationsReadSchema,
} from '@backend/modules/alerts/alerts.validation';
import {
  listSensorsQuerySchema,
  sensorIdParamSchema,
  sensorReadingsQuerySchema,
  listZonesQuerySchema,
  zoneIdParamSchema,
} from '@backend/modules/environmental/environmental.validation';
import {
  buildingIdParamSchema,
  listFloorsQuerySchema,
  floorIdParamSchema,
  updateSensorPlacementsSchema,
} from '@backend/modules/spatial/spatial.validation';
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  userIdParamSchema,
  listUsersQuerySchema,
} from '@backend/modules/users/users.validation';

// ============================================================================
// Auth Validation
// ============================================================================

describe('Auth Validation Schemas', () => {
  describe('loginSchema', () => {
    it('UT-VAL-01: should accept valid email + password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'MySecurePass123',
      });
      expect(result.success).toBe(true);
    });

    it('UT-VAL-02: should reject missing email', () => {
      const result = loginSchema.safeParse({ password: 'Pass123!' });
      expect(result.success).toBe(false);
    });

    it('UT-VAL-03: should reject empty password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', () => {
      const result = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'Pass123!',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    const validRegister = {
      email: 'new@example.com',
      name: 'New User',
      password: 'SecurePass123!',
      role: 'technician',
    };

    it('UT-VAL-04: should accept valid registration data', () => {
      const result = registerSchema.safeParse(validRegister);
      expect(result.success).toBe(true);
    });

    it('should require name of at least 2 characters', () => {
      const result = registerSchema.safeParse({ ...validRegister, name: 'A' });
      expect(result.success).toBe(false);
    });

    it('should require password of at least 8 characters', () => {
      const result = registerSchema.safeParse({ ...validRegister, password: 'short' });
      expect(result.success).toBe(false);
    });

    it('UT-VAL-05: should reject invalid role', () => {
      const result = registerSchema.safeParse({ ...validRegister, role: 'superuser' });
      expect(result.success).toBe(false);
    });

    it('should accept all valid roles', () => {
      for (const role of ['financial_decision_maker', 'sys_admin', 'technician']) {
        const result = registerSchema.safeParse({ ...validRegister, role });
        expect(result.success).toBe(true);
      }
    });

    it('should accept optional buildingId as UUID', () => {
      const result = registerSchema.safeParse({
        ...validRegister,
        buildingId: '550e8400-e29b-41d4-a716-446655440001',
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-UUID buildingId', () => {
      const result = registerSchema.safeParse({
        ...validRegister,
        buildingId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should accept null buildingId', () => {
      const result = registerSchema.safeParse({
        ...validRegister,
        buildingId: null,
      });
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// Energy Validation
// ============================================================================

describe('Energy Validation Schemas', () => {
  describe('energyConsumptionQuerySchema', () => {
    it('should accept valid UUID buildingId', () => {
      const result = energyConsumptionQuerySchema.safeParse({
        buildingId: '550e8400-e29b-41d4-a716-446655440001',
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-UUID buildingId', () => {
      const result = energyConsumptionQuerySchema.safeParse({
        buildingId: 'abc',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('energyTrendsQuerySchema', () => {
    const validParams = {
      buildingId: '550e8400-e29b-41d4-a716-446655440001',
      from: '2026-04-01T00:00:00Z',
      to: '2026-04-15T00:00:00Z',
      interval: 'daily',
    };

    it('UT-VAL-06: should accept valid date range with interval', () => {
      const result = energyTrendsQuerySchema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    it('should default interval to daily', () => {
      const result = energyTrendsQuerySchema.safeParse({
        buildingId: validParams.buildingId,
        from: validParams.from,
        to: validParams.to,
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.interval).toBe('daily');
    });

    it('should accept all valid intervals', () => {
      for (const interval of ['hourly', 'daily', 'weekly', 'monthly']) {
        const result = energyTrendsQuerySchema.safeParse({ ...validParams, interval });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid interval', () => {
      const result = energyTrendsQuerySchema.safeParse({
        ...validParams,
        interval: 'yearly',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid date string', () => {
      const result = energyTrendsQuerySchema.safeParse({
        ...validParams,
        from: 'not-a-date',
      });
      expect(result.success).toBe(false);
    });

    it('should accept compare parameter', () => {
      const result = energyTrendsQuerySchema.safeParse({
        ...validParams,
        compare: 'previous_period',
      });
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// Assets Validation
// ============================================================================

describe('Assets Validation Schemas', () => {
  describe('createEquipmentSchema', () => {
    const validEquipment = {
      buildingId: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Main Generator',
      type: 'genset',
    };

    it('UT-VAL-07: should accept valid equipment with required fields', () => {
      const result = createEquipmentSchema.safeParse(validEquipment);
      expect(result.success).toBe(true);
    });

    it('should reject missing name', () => {
      const result = createEquipmentSchema.safeParse({
        buildingId: validEquipment.buildingId,
        type: 'genset',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing buildingId', () => {
      const result = createEquipmentSchema.safeParse({
        name: 'Test',
        type: 'genset',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid equipment type', () => {
      const result = createEquipmentSchema.safeParse({
        ...validEquipment,
        type: 'spaceship',
      });
      expect(result.success).toBe(false);
    });

    it('should accept all valid equipment types', () => {
      const types = ['genset', 'pump', 'ahu', 'chiller', 'boiler', 'elevator', 'transformer'];
      for (const type of types) {
        const result = createEquipmentSchema.safeParse({ ...validEquipment, type });
        expect(result.success).toBe(true);
      }
    });

    it('should accept optional metadata as record', () => {
      const result = createEquipmentSchema.safeParse({
        ...validEquipment,
        metadata: { capacity: '500kW', brand: 'Caterpillar' },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('listEquipmentQuerySchema', () => {
    it('UT-VAL-10: should coerce page/limit to numbers', () => {
      const result = listEquipmentQuerySchema.safeParse({
        page: '2',
        limit: '50',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(50);
      }
    });

    it('should enforce max limit of 100', () => {
      const result = listEquipmentQuerySchema.safeParse({ limit: '200' });
      expect(result.success).toBe(false);
    });

    it('should default page to 1 and limit to 20', () => {
      const result = listEquipmentQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });
  });

  describe('equipmentIdParamSchema', () => {
    it('UT-VAL-09: should reject non-UUID id', () => {
      const result = equipmentIdParamSchema.safeParse({ id: 'not-uuid' });
      expect(result.success).toBe(false);
    });

    it('should accept valid UUID', () => {
      const result = equipmentIdParamSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440001',
      });
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// Alerts Validation
// ============================================================================

describe('Alerts Validation Schemas', () => {
  describe('createAlertRuleSchema', () => {
    const validRule = {
      name: 'High Temp Alert',
      buildingId: '550e8400-e29b-41d4-a716-446655440001',
      operator: '>',
      threshold: 30,
      severity: 'warning',
    };

    it('UT-VAL-08: should accept valid alert rule', () => {
      const result = createAlertRuleSchema.safeParse(validRule);
      expect(result.success).toBe(true);
    });

    it('should accept all valid operators', () => {
      for (const operator of ['>', '<', '>=', '<=', '==']) {
        const result = createAlertRuleSchema.safeParse({ ...validRule, operator });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid operator', () => {
      const result = createAlertRuleSchema.safeParse({ ...validRule, operator: '!=' });
      expect(result.success).toBe(false);
    });

    it('should accept all valid severities', () => {
      for (const severity of ['info', 'warning', 'critical']) {
        const result = createAlertRuleSchema.safeParse({ ...validRule, severity });
        expect(result.success).toBe(true);
      }
    });

    it('should default cooldownMinutes to 15', () => {
      const result = createAlertRuleSchema.safeParse(validRule);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.cooldownMinutes).toBe(15);
    });

    it('should default emailNotification to false', () => {
      const result = createAlertRuleSchema.safeParse(validRule);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.emailNotification).toBe(false);
    });

    it('should validate email recipients', () => {
      const result = createAlertRuleSchema.safeParse({
        ...validRule,
        emailRecipients: ['not-email'],
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid email recipients', () => {
      const result = createAlertRuleSchema.safeParse({
        ...validRule,
        emailRecipients: ['admin@test.com', 'tech@test.com'],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('listAlertsQuerySchema', () => {
    it('should coerce page/limit from strings', () => {
      const result = listAlertsQuerySchema.safeParse({ page: '2', limit: '10' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(10);
      }
    });

    it('should accept status filter', () => {
      for (const status of ['active', 'acknowledged', 'resolved']) {
        const result = listAlertsQuerySchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid status', () => {
      const result = listAlertsQuerySchema.safeParse({ status: 'pending' });
      expect(result.success).toBe(false);
    });
  });

  describe('acknowledgeAlertSchema', () => {
    it('should accept optional comment', () => {
      const result = acknowledgeAlertSchema.safeParse({ comment: 'Noted.' });
      expect(result.success).toBe(true);
    });

    it('should accept empty body', () => {
      const result = acknowledgeAlertSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject comment over 1000 characters', () => {
      const result = acknowledgeAlertSchema.safeParse({
        comment: 'x'.repeat(1001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('markNotificationsReadSchema', () => {
    it('should accept array of UUIDs', () => {
      const result = markNotificationsReadSchema.safeParse({
        ids: ['550e8400-e29b-41d4-a716-446655440001'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-UUID ids', () => {
      const result = markNotificationsReadSchema.safeParse({
        ids: ['not-uuid'],
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty object (ids required)', () => {
      const result = markNotificationsReadSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// Environmental Validation
// ============================================================================

describe('Environmental Validation Schemas', () => {
  describe('listSensorsQuerySchema', () => {
    it('should accept valid filter params', () => {
      const result = listSensorsQuerySchema.safeParse({
        buildingId: '550e8400-e29b-41d4-a716-446655440001',
        type: 'temperature',
        status: 'online',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid sensor type', () => {
      const result = listSensorsQuerySchema.safeParse({ type: 'pressure' });
      expect(result.success).toBe(false);
    });

    it('should accept all valid sensor types', () => {
      const types = ['temperature', 'humidity', 'co2', 'energy_meter', 'power_factor', 'fuel_level', 'vibration', 'runtime'];
      for (const type of types) {
        const result = listSensorsQuerySchema.safeParse({ type });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('sensorReadingsQuerySchema', () => {
    it('should accept valid datetime range', () => {
      const result = sensorReadingsQuerySchema.safeParse({
        from: '2026-04-01T00:00:00Z',
        to: '2026-04-15T00:00:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('should default interval to raw', () => {
      const result = sensorReadingsQuerySchema.safeParse({
        from: '2026-04-01T00:00:00Z',
        to: '2026-04-15T00:00:00Z',
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.interval).toBe('raw');
    });
  });
});

// ============================================================================
// Spatial Validation
// ============================================================================

describe('Spatial Validation Schemas', () => {
  describe('updateSensorPlacementsSchema', () => {
    it('should accept valid placements', () => {
      const result = updateSensorPlacementsSchema.safeParse({
        placements: [
          { sensorId: '550e8400-e29b-41d4-a716-446655440001', x: 50, y: 30 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should reject x/y out of 0-100 range', () => {
      const result = updateSensorPlacementsSchema.safeParse({
        placements: [
          { sensorId: '550e8400-e29b-41d4-a716-446655440001', x: 150, y: 30 },
        ],
      });
      expect(result.success).toBe(false);
    });

    it('should default rotation to 0', () => {
      const result = updateSensorPlacementsSchema.safeParse({
        placements: [
          { sensorId: '550e8400-e29b-41d4-a716-446655440001', x: 50, y: 50 },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.placements[0].rotation).toBe(0);
    });

    it('should reject rotation > 360', () => {
      const result = updateSensorPlacementsSchema.safeParse({
        placements: [
          { sensorId: '550e8400-e29b-41d4-a716-446655440001', x: 50, y: 50, rotation: 400 },
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('UUID param schemas', () => {
    it('should accept valid UUIDs', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440001';
      expect(buildingIdParamSchema.safeParse({ id: uuid }).success).toBe(true);
      expect(floorIdParamSchema.safeParse({ id: uuid }).success).toBe(true);
      expect(sensorIdParamSchema.safeParse({ id: uuid }).success).toBe(true);
      expect(userIdParamSchema.safeParse({ id: uuid }).success).toBe(true);
    });

    it('should reject non-UUIDs', () => {
      expect(buildingIdParamSchema.safeParse({ id: 'abc' }).success).toBe(false);
      expect(floorIdParamSchema.safeParse({ id: '123' }).success).toBe(false);
    });
  });
});

// ============================================================================
// Users Validation
// ============================================================================

describe('Users Validation Schemas', () => {
  describe('createUserSchema', () => {
    const validUser = {
      email: 'user@example.com',
      name: 'Test User',
      password: 'SecurePass123!',
      role: 'technician',
    };

    it('should accept valid user data', () => {
      const result = createUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should reject password shorter than 8 chars', () => {
      const result = createUserSchema.safeParse({ ...validUser, password: 'short' });
      expect(result.success).toBe(false);
    });

    it('should reject name shorter than 2 chars', () => {
      const result = createUserSchema.safeParse({ ...validUser, name: 'X' });
      expect(result.success).toBe(false);
    });
  });

  describe('listUsersQuerySchema', () => {
    it('should accept role filter', () => {
      const result = listUsersQuerySchema.safeParse({ role: 'sys_admin' });
      expect(result.success).toBe(true);
    });

    it('should accept search parameter', () => {
      const result = listUsersQuerySchema.safeParse({ search: 'admin' });
      expect(result.success).toBe(true);
    });

    it('should coerce page/limit', () => {
      const result = listUsersQuerySchema.safeParse({ page: '3', limit: '25' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.limit).toBe(25);
      }
    });
  });

  describe('updateUserStatusSchema', () => {
    it('should accept boolean isActive', () => {
      expect(updateUserStatusSchema.safeParse({ isActive: true }).success).toBe(true);
      expect(updateUserStatusSchema.safeParse({ isActive: false }).success).toBe(true);
    });

    it('should reject non-boolean isActive', () => {
      expect(updateUserStatusSchema.safeParse({ isActive: 'yes' }).success).toBe(false);
    });
  });
});

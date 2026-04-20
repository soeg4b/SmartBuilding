import { z } from 'zod';

export const createAlertRuleSchema = z.object({
  name: z.string().min(1).max(255),
  buildingId: z.string().uuid(),
  sensorType: z
    .enum(['temperature', 'humidity', 'co2', 'energy_meter', 'power_factor', 'fuel_level', 'vibration', 'runtime'])
    .optional()
    .nullable(),
  sensorId: z.string().uuid().optional().nullable(),
  operator: z.enum(['>', '<', '>=', '<=', '==']),
  threshold: z.number(),
  severity: z.enum(['info', 'warning', 'critical']),
  cooldownMinutes: z.number().int().min(1).default(15),
  emailNotification: z.boolean().default(false),
  emailRecipients: z.array(z.string().email()).default([]),
  isActive: z.boolean().default(true),
});

export const updateAlertRuleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  sensorType: z
    .enum(['temperature', 'humidity', 'co2', 'energy_meter', 'power_factor', 'fuel_level', 'vibration', 'runtime'])
    .optional()
    .nullable(),
  sensorId: z.string().uuid().optional().nullable(),
  operator: z.enum(['>', '<', '>=', '<=', '==']).optional(),
  threshold: z.number().optional(),
  severity: z.enum(['info', 'warning', 'critical']).optional(),
  cooldownMinutes: z.number().int().min(1).optional(),
  emailNotification: z.boolean().optional(),
  emailRecipients: z.array(z.string().email()).optional(),
});

export const alertRuleIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const updateRuleStatusSchema = z.object({
  isActive: z.boolean(),
});

export const listAlertsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  buildingId: z.string().uuid().optional(),
  severity: z.enum(['info', 'warning', 'critical']).optional(),
  status: z.enum(['active', 'acknowledged', 'resolved']).optional(),
  sensorType: z
    .enum(['temperature', 'humidity', 'co2', 'energy_meter', 'power_factor', 'fuel_level', 'vibration', 'runtime'])
    .optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

export const alertIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const acknowledgeAlertSchema = z.object({
  comment: z.string().max(1000).optional(),
});

export const resolveAlertSchema = z.object({
  comment: z.string().max(1000).optional(),
});

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  unreadOnly: z.coerce.boolean().optional().default(false),
});

export const markNotificationsReadSchema = z.object({
  ids: z.array(z.string().uuid()),
});

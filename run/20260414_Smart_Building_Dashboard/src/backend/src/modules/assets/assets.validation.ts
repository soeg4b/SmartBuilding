import { z } from 'zod';

export const listEquipmentQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  buildingId: z.string().uuid().optional(),
  type: z
    .enum(['genset', 'pump', 'ahu', 'chiller', 'boiler', 'elevator', 'transformer'])
    .optional(),
  healthStatus: z.enum(['green', 'yellow', 'red']).optional(),
});

export const equipmentIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const createEquipmentSchema = z.object({
  buildingId: z.string().uuid(),
  floorId: z.string().uuid().optional().nullable(),
  zoneId: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(255),
  type: z.enum(['genset', 'pump', 'ahu', 'chiller', 'boiler', 'elevator', 'transformer']),
  serialNumber: z.string().max(100).optional().nullable(),
  manufacturer: z.string().max(255).optional().nullable(),
  model: z.string().max(255).optional().nullable(),
  installDate: z.string().datetime({ offset: true }).optional().nullable(),
  lastServiceDate: z.string().datetime({ offset: true }).optional().nullable(),
  nextServiceDate: z.string().datetime({ offset: true }).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateEquipmentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  floorId: z.string().uuid().optional().nullable(),
  zoneId: z.string().uuid().optional().nullable(),
  serialNumber: z.string().max(100).optional().nullable(),
  manufacturer: z.string().max(255).optional().nullable(),
  model: z.string().max(255).optional().nullable(),
  installDate: z.string().datetime({ offset: true }).optional().nullable(),
  lastServiceDate: z.string().datetime({ offset: true }).optional().nullable(),
  nextServiceDate: z.string().datetime({ offset: true }).optional().nullable(),
  healthStatus: z.enum(['green', 'yellow', 'red']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const metricsQuerySchema = z.object({
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
  interval: z.enum(['raw', '1min', '5min', '15min', 'hourly', 'daily']).default('hourly'),
});

export const linkSensorsSchema = z.object({
  sensorIds: z.array(z.string().uuid()).min(1),
  role: z.string().max(50).optional(),
});

export const sensorIdParamSchema = z.object({
  id: z.string().uuid(),
  sensorId: z.string().uuid(),
});

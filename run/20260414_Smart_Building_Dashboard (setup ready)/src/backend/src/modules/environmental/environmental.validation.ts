import { z } from 'zod';

export const listSensorsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  buildingId: z.string().uuid().optional(),
  type: z.enum(['temperature', 'humidity', 'co2', 'energy_meter', 'power_factor', 'fuel_level', 'vibration', 'runtime']).optional(),
  status: z.enum(['online', 'offline', 'stale']).optional(),
  zoneId: z.string().uuid().optional(),
});

export const sensorIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const sensorReadingsQuerySchema = z.object({
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
  interval: z.enum(['raw', '1min', '5min', '15min', 'hourly']).default('raw'),
});

export const listZonesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  buildingId: z.string().uuid().optional(),
  floorId: z.string().uuid().optional(),
  status: z.enum(['normal', 'warning', 'critical']).optional(),
});

export const zoneIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const zoneReadingsQuerySchema = z.object({
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
  interval: z.enum(['raw', '1min', '5min', '15min', 'hourly']).default('15min'),
});

import { z } from 'zod';

export const buildingIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listFloorsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  buildingId: z.string().uuid().optional(),
});

export const floorIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const floorPlanIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listFloorPlansQuerySchema = z.object({
  buildingId: z.string().uuid().optional(),
  floorId: z.string().uuid().optional(),
});

export const updateSensorPlacementsSchema = z.object({
  placements: z.array(
    z.object({
      sensorId: z.string().uuid(),
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
      rotation: z.number().int().min(0).max(360).default(0),
    })
  ),
});

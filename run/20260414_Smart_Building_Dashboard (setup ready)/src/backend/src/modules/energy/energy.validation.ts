import { z } from 'zod';

export const energyConsumptionQuerySchema = z.object({
  buildingId: z.string().uuid(),
});

export const energyTrendsQuerySchema = z.object({
  buildingId: z.string().uuid(),
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
  interval: z.enum(['hourly', 'daily', 'weekly', 'monthly']).default('daily'),
  compare: z.enum(['previous_period']).optional(),
});

export const peakLoadQuerySchema = z.object({
  buildingId: z.string().uuid(),
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
});

export const billingProjectionQuerySchema = z.object({
  buildingId: z.string().uuid(),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format')
    .optional(),
});

export const tariffQuerySchema = z.object({
  buildingId: z.string().uuid(),
});

export const updateTariffSchema = z.object({
  buildingId: z.string().uuid(),
  name: z.string().min(1).max(100),
  ratePerKwh: z.number().positive(),
  currency: z.string().length(3).default('IDR'),
  effectiveFrom: z.string().datetime({ offset: true }),
  effectiveTo: z.string().datetime({ offset: true }).optional().nullable(),
});

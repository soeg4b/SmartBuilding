import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2).max(255),
  password: z.string().min(8).max(128),
  role: z.enum(['financial_decision_maker', 'sys_admin', 'technician']),
  buildingId: z.string().uuid().optional().nullable(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).max(255).optional(),
  role: z.enum(['financial_decision_maker', 'sys_admin', 'technician']).optional(),
  buildingId: z.string().uuid().optional().nullable(),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const userIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  role: z.enum(['financial_decision_maker', 'sys_admin', 'technician']).optional(),
  buildingId: z.string().uuid().optional(),
  search: z.string().max(255).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

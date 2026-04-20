import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  role: z.enum(['financial_decision_maker', 'sys_admin', 'technician']),
  buildingId: z.string().uuid().optional().nullable(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

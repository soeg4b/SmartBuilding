import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { authRateLimiter } from '../../middleware/rateLimiter';
import { loginSchema, registerSchema } from './auth.validation';
import * as authController from './auth.controller';

const router = Router();

// POST /api/v1/auth/register (sys_admin only)
router.post('/register', authenticate, requireRole('sys_admin'), validate({ body: registerSchema }), authController.register);

// POST /api/v1/auth/login (rate limited: 5 attempts per 15 min)
router.post('/login', authRateLimiter, validate({ body: loginSchema }), authController.login);

// POST /api/v1/auth/refresh
router.post('/refresh', authController.refresh);

// POST /api/v1/auth/logout
router.post('/logout', authenticate, authController.logout);

// GET /api/v1/auth/me
router.get('/me', authenticate, authController.getMe);

export default router;

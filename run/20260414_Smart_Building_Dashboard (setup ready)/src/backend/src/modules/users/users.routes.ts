import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  userIdParamSchema,
  listUsersQuerySchema,
} from './users.validation';
import * as usersController from './users.controller';

const router = Router();

// All user management routes require sys_admin role
router.use(authenticate, requireRole('sys_admin'));

// GET /api/v1/users
router.get(
  '/',
  validate({ query: listUsersQuerySchema }),
  usersController.listUsers
);

// POST /api/v1/users
router.post(
  '/',
  validate({ body: createUserSchema }),
  usersController.createUser
);

// GET /api/v1/users/:id
router.get(
  '/:id',
  validate({ params: userIdParamSchema }),
  usersController.getUser
);

// PUT /api/v1/users/:id
router.put(
  '/:id',
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  usersController.updateUser
);

// PATCH /api/v1/users/:id/status
router.patch(
  '/:id/status',
  validate({ params: userIdParamSchema, body: updateUserStatusSchema }),
  usersController.updateUserStatus
);

export default router;

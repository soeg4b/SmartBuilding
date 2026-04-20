import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import * as dashboardController from './dashboard.controller';

const router = Router();

router.use(authenticate);

// GET /api/v1/dashboard/executive
router.get(
  '/executive',
  requireRole('financial_decision_maker'),
  dashboardController.getExecutiveDashboard
);

// GET /api/v1/dashboard/operations
router.get(
  '/operations',
  requireRole('sys_admin'),
  dashboardController.getOperationsDashboard
);

// GET /api/v1/dashboard/technician
router.get(
  '/technician',
  requireRole('technician'),
  dashboardController.getTechnicianDashboard
);

// GET /api/v1/dashboard/summary
router.get('/summary', dashboardController.getBuildingSummary);

export default router;

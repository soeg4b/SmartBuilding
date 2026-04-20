import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import {
  energyConsumptionQuerySchema,
  energyTrendsQuerySchema,
  peakLoadQuerySchema,
  billingProjectionQuerySchema,
  tariffQuerySchema,
  updateTariffSchema,
} from './energy.validation';
import * as energyController from './energy.controller';

const router = Router();

router.use(authenticate);

// GET /api/v1/energy/consumption
router.get(
  '/consumption',
  validate({ query: energyConsumptionQuerySchema }),
  energyController.getConsumption
);

// GET /api/v1/energy/trends
router.get(
  '/trends',
  validate({ query: energyTrendsQuerySchema }),
  energyController.getTrends
);

// GET /api/v1/energy/peak-load
router.get(
  '/peak-load',
  validate({ query: peakLoadQuerySchema }),
  energyController.getPeakLoad
);

// GET /api/v1/energy/billing-projection
router.get(
  '/billing-projection',
  requireRole('financial_decision_maker', 'sys_admin'),
  validate({ query: billingProjectionQuerySchema }),
  energyController.getBillingProjection
);

// GET /api/v1/energy/tariffs
router.get(
  '/tariffs',
  requireRole('sys_admin'),
  validate({ query: tariffQuerySchema }),
  energyController.getTariffs
);

// PUT /api/v1/energy/tariffs
router.put(
  '/tariffs',
  requireRole('sys_admin'),
  validate({ body: updateTariffSchema }),
  energyController.updateTariff
);

export default router;

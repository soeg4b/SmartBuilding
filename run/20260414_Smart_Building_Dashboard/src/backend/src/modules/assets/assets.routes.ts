import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import {
  listEquipmentQuerySchema,
  equipmentIdParamSchema,
  createEquipmentSchema,
  updateEquipmentSchema,
  metricsQuerySchema,
  linkSensorsSchema,
  sensorIdParamSchema,
} from './assets.validation';
import * as assetsController from './assets.controller';

const router = Router();

router.use(authenticate);

// GET /api/v1/equipment
router.get(
  '/',
  requireRole('sys_admin', 'technician'),
  validate({ query: listEquipmentQuerySchema }),
  assetsController.listEquipment
);

// POST /api/v1/equipment
router.post(
  '/',
  requireRole('sys_admin'),
  validate({ body: createEquipmentSchema }),
  assetsController.createEquipment
);

// GET /api/v1/equipment/:id
router.get(
  '/:id',
  requireRole('sys_admin', 'technician'),
  validate({ params: equipmentIdParamSchema }),
  assetsController.getEquipment
);

// PUT /api/v1/equipment/:id
router.put(
  '/:id',
  requireRole('sys_admin'),
  validate({ params: equipmentIdParamSchema, body: updateEquipmentSchema }),
  assetsController.updateEquipment
);

// DELETE /api/v1/equipment/:id
router.delete(
  '/:id',
  requireRole('sys_admin'),
  validate({ params: equipmentIdParamSchema }),
  assetsController.deleteEquipment
);

// GET /api/v1/equipment/:id/health
router.get(
  '/:id/health',
  validate({ params: equipmentIdParamSchema }),
  assetsController.getEquipmentHealth
);

// GET /api/v1/equipment/:id/metrics
router.get(
  '/:id/metrics',
  requireRole('sys_admin', 'technician'),
  validate({ params: equipmentIdParamSchema, query: metricsQuerySchema }),
  assetsController.getEquipmentMetrics
);

// POST /api/v1/equipment/:id/sensors
router.post(
  '/:id/sensors',
  requireRole('sys_admin'),
  validate({ params: equipmentIdParamSchema, body: linkSensorsSchema }),
  assetsController.linkSensors
);

// DELETE /api/v1/equipment/:id/sensors/:sensorId
router.delete(
  '/:id/sensors/:sensorId',
  requireRole('sys_admin'),
  validate({ params: sensorIdParamSchema }),
  assetsController.unlinkSensor
);

export default router;

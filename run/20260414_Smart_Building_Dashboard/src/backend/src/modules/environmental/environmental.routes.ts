import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import {
  listSensorsQuerySchema,
  sensorIdParamSchema,
  sensorReadingsQuerySchema,
  listZonesQuerySchema,
  zoneIdParamSchema,
  zoneReadingsQuerySchema,
} from './environmental.validation';
import * as envController from './environmental.controller';

const sensorsRouter = Router();
const zonesRouter = Router();

sensorsRouter.use(authenticate);
zonesRouter.use(authenticate);

// --- Sensor routes ---

// GET /api/v1/sensors
sensorsRouter.get(
  '/',
  requireRole('sys_admin', 'technician'),
  validate({ query: listSensorsQuerySchema }),
  envController.listSensors
);

// GET /api/v1/sensors/:id
sensorsRouter.get(
  '/:id',
  validate({ params: sensorIdParamSchema }),
  envController.getSensor
);

// GET /api/v1/sensors/:id/readings
sensorsRouter.get(
  '/:id/readings',
  validate({ params: sensorIdParamSchema, query: sensorReadingsQuerySchema }),
  envController.getSensorReadings
);

// --- Zone routes ---

// GET /api/v1/zones
zonesRouter.get(
  '/',
  validate({ query: listZonesQuerySchema }),
  envController.listZones
);

// GET /api/v1/zones/:id
zonesRouter.get(
  '/:id',
  validate({ params: zoneIdParamSchema }),
  envController.getZone
);

// GET /api/v1/zones/:id/readings
zonesRouter.get(
  '/:id/readings',
  validate({ params: zoneIdParamSchema, query: zoneReadingsQuerySchema }),
  envController.getZoneReadings
);

export { sensorsRouter, zonesRouter };

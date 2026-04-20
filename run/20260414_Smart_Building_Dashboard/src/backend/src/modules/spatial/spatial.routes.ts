import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { config } from '../../config';
import { sendError } from '../../utils/apiResponse';
import {
  buildingIdParamSchema,
  listFloorsQuerySchema,
  floorIdParamSchema,
  floorPlanIdParamSchema,
  listFloorPlansQuerySchema,
  updateSensorPlacementsSchema,
} from './spatial.validation';
import * as spatialController from './spatial.controller';

// --- Multer config for floor plan uploads ---
const uploadDir = path.resolve(config.UPLOAD_DIR, 'floor-plans');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.svg' || ext === '.png' || ext === '.pdf' || ext === '.dwg') {
    cb(null, true);
  } else {
    cb(new Error('Only SVG, PNG, PDF, and DWG files are allowed'));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.MAX_FILE_SIZE },
});

// SVG sanitization middleware
function sanitizeSvg(req: any, _res: any, next: any) {
  if (req.file && path.extname(req.file.originalname).toLowerCase() === '.svg') {
    const content = fs.readFileSync(req.file.path, 'utf-8');
    // Basic SVG sanitization: strip script tags and event handlers
    const sanitized = content
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/\bon\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/\bon\w+\s*=\s*'[^']*'/gi, '')
      .replace(/javascript:/gi, '');
    fs.writeFileSync(req.file.path, sanitized, 'utf-8');
  }
  next();
}

// --- Routers ---
const buildingsRouter = Router();
const floorsRouter = Router();
const floorPlansRouter = Router();

buildingsRouter.use(authenticate);
floorsRouter.use(authenticate);
floorPlansRouter.use(authenticate);

// --- Building routes ---
buildingsRouter.get('/', spatialController.listBuildings);
buildingsRouter.get(
  '/:id',
  validate({ params: buildingIdParamSchema }),
  spatialController.getBuilding
);

// --- Floor routes ---
floorsRouter.get(
  '/',
  validate({ query: listFloorsQuerySchema }),
  spatialController.listFloors
);
floorsRouter.get(
  '/:id',
  validate({ params: floorIdParamSchema }),
  spatialController.getFloor
);

// --- Floor Plan routes ---
floorPlansRouter.get(
  '/',
  validate({ query: listFloorPlansQuerySchema }),
  spatialController.listFloorPlans
);

floorPlansRouter.get('/digital-twin/source', spatialController.getDigitalTwinSource);
floorPlansRouter.get('/digital-twin/source/file', spatialController.getDigitalTwinSourceFile);

floorPlansRouter.post(
  '/',
  requireRole('sys_admin'),
  upload.single('file'),
  sanitizeSvg,
  spatialController.uploadFloorPlan
);

floorPlansRouter.put(
  '/:id',
  requireRole('sys_admin'),
  validate({ params: floorPlanIdParamSchema }),
  upload.single('file'),
  sanitizeSvg,
  spatialController.replaceFloorPlan
);

floorPlansRouter.delete(
  '/:id',
  requireRole('sys_admin'),
  validate({ params: floorPlanIdParamSchema }),
  spatialController.deleteFloorPlan
);

floorPlansRouter.get(
  '/:id/file',
  validate({ params: floorPlanIdParamSchema }),
  spatialController.getFloorPlanFile
);

floorPlansRouter.get(
  '/:id/sensors',
  validate({ params: floorPlanIdParamSchema }),
  spatialController.getSensorPlacements
);

floorPlansRouter.put(
  '/:id/sensors',
  requireRole('sys_admin'),
  validate({ params: floorPlanIdParamSchema, body: updateSensorPlacementsSchema }),
  spatialController.updateSensorPlacements
);

export { buildingsRouter, floorsRouter, floorPlansRouter };

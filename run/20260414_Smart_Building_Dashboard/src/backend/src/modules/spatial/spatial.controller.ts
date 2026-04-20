import { Request, Response, NextFunction } from 'express';
import { spatialService } from './spatial.service';
import { sendSuccess, sendNoContent } from '../../utils/apiResponse';
import { buildPaginationMeta } from '../../utils/pagination';
import path from 'path';

export async function getDigitalTwinSource(_req: Request, res: Response, next: NextFunction) {
  try {
    const source = spatialService.getDigitalTwinSource();
    sendSuccess(res, {
      name: source.name,
      fileType: source.fileType,
      fileSize: source.fileSize,
      lastModified: source.lastModified,
      fileUrl: '/api/v1/floor-plans/digital-twin/source/file',
    });
  } catch (error) {
    next(error);
  }
}

export async function getDigitalTwinSourceFile(_req: Request, res: Response, next: NextFunction) {
  try {
    const source = spatialService.getDigitalTwinSource();
    const contentType = source.fileType === 'pdf' ? 'application/pdf' : 'application/acad';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${source.name}"`);
    res.sendFile(source.absolutePath);
  } catch (error) {
    next(error);
  }
}

export async function listBuildings(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await spatialService.listBuildings();
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function getBuilding(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await spatialService.getBuildingById(req.params.id);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function listFloors(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, buildingId } = req.query as any;
    const result = await spatialService.listFloors({ page, limit, buildingId });

    const meta = buildPaginationMeta(result.total, {
      page: page || 1,
      limit: limit || 50,
      skip: ((page || 1) - 1) * (limit || 50),
    });

    sendSuccess(res, result.floors, 200, meta);
  } catch (error) {
    next(error);
  }
}

export async function getFloor(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await spatialService.getFloorById(req.params.id);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function listFloorPlans(req: Request, res: Response, next: NextFunction) {
  try {
    const { buildingId, floorId } = req.query as any;
    const data = await spatialService.listFloorPlans({ buildingId, floorId });
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function uploadFloorPlan(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({
        error: { code: 'NO_FILE', message: 'No file uploaded' },
      });
      return;
    }

    const { buildingId, floorId, label } = req.body;
    const ext = path
      .extname(req.file.originalname)
      .toLowerCase()
      .replace('.', '') as 'svg' | 'png' | 'pdf' | 'dwg';

    const data = await spatialService.createFloorPlan({
      buildingId,
      floorId,
      label,
      fileType: ext,
      filePath: req.file.path,
      fileSize: req.file.size,
      uploadedBy: req.user?.userId,
    });

    sendSuccess(res, data, 201);
  } catch (error) {
    next(error);
  }
}

export async function replaceFloorPlan(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({
        error: { code: 'NO_FILE', message: 'No file uploaded' },
      });
      return;
    }

    const ext = path
      .extname(req.file.originalname)
      .toLowerCase()
      .replace('.', '') as 'svg' | 'png' | 'pdf' | 'dwg';

    const data = await spatialService.updateFloorPlan(req.params.id, {
      filePath: req.file.path,
      fileSize: req.file.size,
      fileType: ext,
    });

    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function deleteFloorPlan(req: Request, res: Response, next: NextFunction) {
  try {
    await spatialService.deleteFloorPlan(req.params.id);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
}

export async function getFloorPlanFile(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await spatialService.getFloorPlanFile(req.params.id);

    const contentTypeMap: Record<string, string> = {
      svg: 'image/svg+xml',
      png: 'image/png',
      pdf: 'application/pdf',
      dwg: 'application/acad',
    };
    const contentType = contentTypeMap[result.fileType] ?? 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.sendFile(result.filePath);
  } catch (error) {
    next(error);
  }
}

export async function getSensorPlacements(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await spatialService.getSensorPlacements(req.params.id);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function updateSensorPlacements(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await spatialService.updateSensorPlacements(req.params.id, req.body.placements);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

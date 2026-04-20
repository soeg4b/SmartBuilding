import { Request, Response, NextFunction } from 'express';
import { environmentalService } from './environmental.service';
import { sendSuccess } from '../../utils/apiResponse';
import { buildPaginationMeta } from '../../utils/pagination';

export async function listSensors(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, buildingId, type, status, zoneId } = req.query as any;
    const result = await environmentalService.listSensors({
      page,
      limit,
      buildingId,
      type,
      status,
      zoneId,
    });

    const meta = buildPaginationMeta(result.total, {
      page: page || 1,
      limit: limit || 20,
      skip: ((page || 1) - 1) * (limit || 20),
    });

    sendSuccess(res, result.sensors, 200, meta);
  } catch (error) {
    next(error);
  }
}

export async function getSensor(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await environmentalService.getSensorById(req.params.id);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function getSensorReadings(req: Request, res: Response, next: NextFunction) {
  try {
    const { from, to, interval } = req.query as any;
    const data = await environmentalService.getSensorReadings(req.params.id, {
      from,
      to,
      interval,
    });
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function listZones(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, buildingId, floorId, status } = req.query as any;
    const result = await environmentalService.listZones({
      page,
      limit,
      buildingId,
      floorId,
      status,
    });

    const meta = buildPaginationMeta(result.total, {
      page: page || 1,
      limit: limit || 20,
      skip: ((page || 1) - 1) * (limit || 20),
    });

    sendSuccess(res, result.zones, 200, meta);
  } catch (error) {
    next(error);
  }
}

export async function getZone(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await environmentalService.getZoneById(req.params.id);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function getZoneReadings(req: Request, res: Response, next: NextFunction) {
  try {
    const { from, to, interval } = req.query as any;
    const data = await environmentalService.getZoneReadings(req.params.id, {
      from,
      to,
      interval,
    });
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

import { Request, Response, NextFunction } from 'express';
import { assetsService } from './assets.service';
import { sendSuccess, sendNoContent } from '../../utils/apiResponse';
import { buildPaginationMeta } from '../../utils/pagination';

export async function listEquipment(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, buildingId, type, healthStatus } = req.query as any;
    const result = await assetsService.list({ page, limit, buildingId, type, healthStatus });

    const meta = buildPaginationMeta(result.total, {
      page: page || 1,
      limit: limit || 20,
      skip: ((page || 1) - 1) * (limit || 20),
    });

    sendSuccess(res, result.equipment, 200, meta);
  } catch (error) {
    next(error);
  }
}

export async function getEquipment(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await assetsService.getById(req.params.id);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function createEquipment(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await assetsService.create(req.body);
    sendSuccess(res, data, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateEquipment(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await assetsService.update(req.params.id, req.body);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function deleteEquipment(req: Request, res: Response, next: NextFunction) {
  try {
    await assetsService.softDelete(req.params.id);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
}

export async function getEquipmentHealth(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await assetsService.getHealth(req.params.id);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function getEquipmentMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const { from, to, interval } = req.query as any;
    const data = await assetsService.getMetrics(req.params.id, { from, to, interval });
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function linkSensors(req: Request, res: Response, next: NextFunction) {
  try {
    const { sensorIds, role } = req.body;
    const data = await assetsService.linkSensors(req.params.id, sensorIds, role);
    sendSuccess(res, data, 201);
  } catch (error) {
    next(error);
  }
}

export async function unlinkSensor(req: Request, res: Response, next: NextFunction) {
  try {
    await assetsService.unlinkSensor(req.params.id, req.params.sensorId);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
}

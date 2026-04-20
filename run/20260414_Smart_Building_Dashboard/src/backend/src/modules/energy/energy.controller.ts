import { Request, Response, NextFunction } from 'express';
import { energyService } from './energy.service';
import { sendSuccess } from '../../utils/apiResponse';

export async function getConsumption(req: Request, res: Response, next: NextFunction) {
  try {
    const { buildingId } = req.query as any;
    const data = await energyService.getConsumption(buildingId);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function getTrends(req: Request, res: Response, next: NextFunction) {
  try {
    const { buildingId, from, to, interval, compare } = req.query as any;
    const data = await energyService.getTrends({ buildingId, from, to, interval, compare });
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function getPeakLoad(req: Request, res: Response, next: NextFunction) {
  try {
    const { buildingId, from, to } = req.query as any;
    const data = await energyService.getPeakLoad({ buildingId, from, to });
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function getBillingProjection(req: Request, res: Response, next: NextFunction) {
  try {
    const { buildingId, month } = req.query as any;
    const data = await energyService.getBillingProjection({ buildingId, month });
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function getTariffs(req: Request, res: Response, next: NextFunction) {
  try {
    const { buildingId } = req.query as any;
    const data = await energyService.getTariffs(buildingId);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function updateTariff(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await energyService.upsertTariff(req.body, req.user!.userId);
    sendSuccess(res, data, 201);
  } catch (error) {
    next(error);
  }
}

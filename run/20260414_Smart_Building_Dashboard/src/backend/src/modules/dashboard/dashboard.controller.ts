import { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service';
import { sendSuccess } from '../../utils/apiResponse';

export async function getExecutiveDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const buildingId = req.query.buildingId as string || req.user!.buildingId;
    if (!buildingId) {
      res.status(400).json({
        error: { code: 'MISSING_BUILDING', message: 'buildingId is required' },
      });
      return;
    }
    const data = await dashboardService.getExecutiveSummary(buildingId);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function getOperationsDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const buildingId = req.query.buildingId as string || req.user!.buildingId;
    if (!buildingId) {
      res.status(400).json({
        error: { code: 'MISSING_BUILDING', message: 'buildingId is required' },
      });
      return;
    }
    const data = await dashboardService.getOperationsSummary(buildingId);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function getTechnicianDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const buildingId = req.query.buildingId as string || req.user!.buildingId;
    if (!buildingId) {
      res.status(400).json({
        error: { code: 'MISSING_BUILDING', message: 'buildingId is required' },
      });
      return;
    }
    const data = await dashboardService.getTechnicianSummary(req.user!.userId, buildingId);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function getBuildingSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const buildingId = req.query.buildingId as string || req.user!.buildingId;
    if (!buildingId) {
      res.status(400).json({
        error: { code: 'MISSING_BUILDING', message: 'buildingId is required' },
      });
      return;
    }
    const data = await dashboardService.getBuildingSummary(buildingId);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

import { Request, Response, NextFunction } from 'express';
import { alertsService } from './alerts.service';
import { sendSuccess, sendNoContent } from '../../utils/apiResponse';
import { buildPaginationMeta } from '../../utils/pagination';

// --- Alert Rules ---

export async function listAlertRules(req: Request, res: Response, next: NextFunction) {
  try {
    const { buildingId } = req.query as any;
    const data = await alertsService.listAlertRules(buildingId);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function createAlertRule(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await alertsService.createAlertRule(req.body, req.user!.userId);
    sendSuccess(res, data, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateAlertRule(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await alertsService.updateAlertRule(req.params.id, req.body);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function updateRuleStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await alertsService.updateRuleStatus(req.params.id, req.body.isActive);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function deleteAlertRule(req: Request, res: Response, next: NextFunction) {
  try {
    await alertsService.deleteAlertRule(req.params.id);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
}

// --- Alerts ---

export async function listAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, buildingId, severity, status, sensorType, from, to } = req.query as any;
    const result = await alertsService.listAlerts({
      page,
      limit,
      buildingId,
      severity,
      status,
      sensorType,
      from,
      to,
    });

    const meta = buildPaginationMeta(result.total, {
      page: page || 1,
      limit: limit || 20,
      skip: ((page || 1) - 1) * (limit || 20),
    });

    sendSuccess(res, result.alerts, 200, meta);
  } catch (error) {
    next(error);
  }
}

export async function getAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await alertsService.getAlertById(req.params.id);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function acknowledgeAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await alertsService.acknowledgeAlert(
      req.params.id,
      req.user!.userId,
      req.body.comment
    );
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

export async function resolveAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await alertsService.resolveAlert(
      req.params.id,
      req.user!.userId,
      req.body.comment
    );
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

// --- Notifications ---

export async function listNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, unreadOnly } = req.query as any;
    const result = await alertsService.listNotifications(req.user!.userId, {
      page,
      limit,
      unreadOnly,
    });

    const meta = buildPaginationMeta(result.total, {
      page: page || 1,
      limit: limit || 20,
      skip: ((page || 1) - 1) * (limit || 20),
    });

    sendSuccess(res, result.notifications, 200, meta);
  } catch (error) {
    next(error);
  }
}

export async function markNotificationsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await alertsService.markNotificationsRead(req.user!.userId, req.body.ids);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import {
  createAlertRuleSchema,
  updateAlertRuleSchema,
  alertRuleIdParamSchema,
  updateRuleStatusSchema,
  listAlertsQuerySchema,
  alertIdParamSchema,
  acknowledgeAlertSchema,
  resolveAlertSchema,
  listNotificationsQuerySchema,
  markNotificationsReadSchema,
} from './alerts.validation';
import * as alertsController from './alerts.controller';

const alertRulesRouter = Router();
const alertsRouter = Router();
const notificationsRouter = Router();

alertRulesRouter.use(authenticate);
alertsRouter.use(authenticate);
notificationsRouter.use(authenticate);

// --- Alert Rules (sys_admin only) ---

alertRulesRouter.get(
  '/',
  requireRole('sys_admin'),
  alertsController.listAlertRules
);

alertRulesRouter.post(
  '/',
  requireRole('sys_admin'),
  validate({ body: createAlertRuleSchema }),
  alertsController.createAlertRule
);

alertRulesRouter.put(
  '/:id',
  requireRole('sys_admin'),
  validate({ params: alertRuleIdParamSchema, body: updateAlertRuleSchema }),
  alertsController.updateAlertRule
);

alertRulesRouter.patch(
  '/:id/status',
  requireRole('sys_admin'),
  validate({ params: alertRuleIdParamSchema, body: updateRuleStatusSchema }),
  alertsController.updateRuleStatus
);

alertRulesRouter.delete(
  '/:id',
  requireRole('sys_admin'),
  validate({ params: alertRuleIdParamSchema }),
  alertsController.deleteAlertRule
);

// --- Alerts (sys_admin + technician) ---

alertsRouter.get(
  '/',
  requireRole('sys_admin', 'technician'),
  validate({ query: listAlertsQuerySchema }),
  alertsController.listAlerts
);

alertsRouter.get(
  '/:id',
  requireRole('sys_admin', 'technician'),
  validate({ params: alertIdParamSchema }),
  alertsController.getAlert
);

alertsRouter.patch(
  '/:id/acknowledge',
  requireRole('sys_admin', 'technician'),
  validate({ params: alertIdParamSchema, body: acknowledgeAlertSchema }),
  alertsController.acknowledgeAlert
);

alertsRouter.patch(
  '/:id/resolve',
  requireRole('sys_admin', 'technician'),
  validate({ params: alertIdParamSchema, body: resolveAlertSchema }),
  alertsController.resolveAlert
);

// --- Notifications (any authenticated user) ---

notificationsRouter.get(
  '/',
  validate({ query: listNotificationsQuerySchema }),
  alertsController.listNotifications
);

notificationsRouter.patch(
  '/read',
  validate({ body: markNotificationsReadSchema }),
  alertsController.markNotificationsRead
);

export { alertRulesRouter, alertsRouter, notificationsRouter };

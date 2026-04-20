import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';

// Map API operators to Prisma AlertOperator enum values
const operatorToPrisma: Record<string, string> = {
  '>': 'gt',
  '<': 'lt',
  '>=': 'gte',
  '<=': 'lte',
  '==': 'eq',
};

const prismaToOperator: Record<string, string> = {
  gt: '>',
  lt: '<',
  gte: '>=',
  lte: '<=',
  eq: '==',
};

export class AlertsService {
  // --- Alert Rules ---

  async listAlertRules(buildingId?: string) {
    const where: Prisma.AlertRuleWhereInput = {};
    if (buildingId) where.buildingId = buildingId;

    const rules = await prisma.alertRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        sensor: { select: { id: true, name: true, type: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    return rules.map((r) => ({
      id: r.id,
      buildingId: r.buildingId,
      name: r.name,
      sensorType: r.sensorType,
      sensorId: r.sensorId,
      sensorName: r.sensor?.name ?? null,
      operator: prismaToOperator[r.operator] ?? r.operator,
      threshold: r.threshold,
      severity: r.severity,
      cooldownMinutes: r.cooldownMinutes,
      emailNotification: r.emailNotification,
      emailRecipients: r.emailRecipients,
      isActive: r.isActive,
      createdBy: r.createdBy,
      createdByName: r.creator?.name ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async createAlertRule(
    input: {
      name: string;
      buildingId: string;
      sensorType?: string | null;
      sensorId?: string | null;
      operator: string;
      threshold: number;
      severity: string;
      cooldownMinutes: number;
      emailNotification: boolean;
      emailRecipients: string[];
      isActive: boolean;
    },
    userId: string
  ) {
    const prismaOperator = operatorToPrisma[input.operator];
    if (!prismaOperator) {
      throw Object.assign(new Error(`Invalid operator: ${input.operator}`), {
        statusCode: 400,
        code: 'INVALID_OPERATOR',
      });
    }

    const rule = await prisma.alertRule.create({
      data: {
        name: input.name,
        buildingId: input.buildingId,
        sensorType: input.sensorType as any ?? null,
        sensorId: input.sensorId ?? null,
        operator: prismaOperator as any,
        threshold: input.threshold,
        severity: input.severity as any,
        cooldownMinutes: input.cooldownMinutes,
        emailNotification: input.emailNotification,
        emailRecipients: input.emailRecipients,
        isActive: input.isActive,
        createdBy: userId,
      },
    });

    return {
      id: rule.id,
      name: rule.name,
      buildingId: rule.buildingId,
      sensorType: rule.sensorType,
      sensorId: rule.sensorId,
      operator: input.operator,
      threshold: rule.threshold,
      severity: rule.severity,
      cooldownMinutes: rule.cooldownMinutes,
      emailNotification: rule.emailNotification,
      emailRecipients: rule.emailRecipients,
      isActive: rule.isActive,
      createdBy: rule.createdBy,
      createdAt: rule.createdAt.toISOString(),
    };
  }

  async updateAlertRule(id: string, input: Record<string, any>) {
    const existing = await prisma.alertRule.findUnique({ where: { id } });
    if (!existing) {
      throw Object.assign(new Error('Alert rule not found'), {
        statusCode: 404,
        code: 'ALERT_RULE_NOT_FOUND',
      });
    }

    const data: Record<string, any> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.sensorType !== undefined) data.sensorType = input.sensorType;
    if (input.sensorId !== undefined) data.sensorId = input.sensorId;
    if (input.operator !== undefined) {
      const prismaOp = operatorToPrisma[input.operator];
      if (!prismaOp) {
        throw Object.assign(new Error(`Invalid operator: ${input.operator}`), {
          statusCode: 400,
          code: 'INVALID_OPERATOR',
        });
      }
      data.operator = prismaOp;
    }
    if (input.threshold !== undefined) data.threshold = input.threshold;
    if (input.severity !== undefined) data.severity = input.severity;
    if (input.cooldownMinutes !== undefined) data.cooldownMinutes = input.cooldownMinutes;
    if (input.emailNotification !== undefined) data.emailNotification = input.emailNotification;
    if (input.emailRecipients !== undefined) data.emailRecipients = input.emailRecipients;

    const rule = await prisma.alertRule.update({ where: { id }, data });

    return {
      id: rule.id,
      name: rule.name,
      operator: prismaToOperator[rule.operator] ?? rule.operator,
      threshold: rule.threshold,
      severity: rule.severity,
      isActive: rule.isActive,
      updatedAt: rule.updatedAt.toISOString(),
    };
  }

  async updateRuleStatus(id: string, isActive: boolean) {
    const existing = await prisma.alertRule.findUnique({ where: { id } });
    if (!existing) {
      throw Object.assign(new Error('Alert rule not found'), {
        statusCode: 404,
        code: 'ALERT_RULE_NOT_FOUND',
      });
    }

    const rule = await prisma.alertRule.update({
      where: { id },
      data: { isActive },
    });

    return { id: rule.id, isActive: rule.isActive };
  }

  async deleteAlertRule(id: string) {
    const existing = await prisma.alertRule.findUnique({ where: { id } });
    if (!existing) {
      throw Object.assign(new Error('Alert rule not found'), {
        statusCode: 404,
        code: 'ALERT_RULE_NOT_FOUND',
      });
    }

    await prisma.alertRule.delete({ where: { id } });
  }

  // --- Alerts ---

  async listAlerts(params: {
    page: number;
    limit: number;
    buildingId?: string;
    severity?: string;
    status?: string;
    sensorType?: string;
    from?: string;
    to?: string;
  }) {
    const skip = (params.page - 1) * params.limit;

    const where: Prisma.AlertWhereInput = {};
    if (params.buildingId) where.buildingId = params.buildingId;
    if (params.severity) where.severity = params.severity as any;
    if (params.status) where.status = params.status as any;
    if (params.from || params.to) {
      where.triggeredAt = {};
      if (params.from) where.triggeredAt.gte = new Date(params.from);
      if (params.to) where.triggeredAt.lte = new Date(params.to);
    }

    // Filter by sensor type: requires joining through sensor
    if (params.sensorType) {
      where.sensor = { type: params.sensorType as any };
    }

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { triggeredAt: 'desc' },
        include: {
          alertRule: { select: { name: true } },
          sensor: { select: { id: true, name: true, type: true, unit: true } },
          acknowledger: { select: { id: true, name: true } },
          resolver: { select: { id: true, name: true } },
        },
      }),
      prisma.alert.count({ where }),
    ]);

    return {
      alerts: alerts.map((a) => ({
        id: a.id,
        ruleName: a.alertRule?.name ?? null,
        severity: a.severity,
        status: a.status,
        sensorId: a.sensorId,
        sensorName: a.sensor?.name ?? null,
        sensorType: a.sensor?.type ?? null,
        currentValue: a.sensorValue,
        threshold: a.thresholdValue,
        operator: a.operator,
        unit: a.sensor?.unit ?? null,
        message: a.message,
        triggeredAt: a.triggeredAt.toISOString(),
        acknowledgedAt: a.acknowledgedAt?.toISOString() ?? null,
        acknowledgedBy: a.acknowledger?.name ?? null,
        resolvedAt: a.resolvedAt?.toISOString() ?? null,
        resolvedBy: a.resolver?.name ?? null,
        comment: a.comment,
      })),
      total,
    };
  }

  async getAlertById(id: string) {
    const alert = await prisma.alert.findUnique({
      where: { id },
      include: {
        alertRule: { select: { name: true, operator: true, threshold: true } },
        sensor: { select: { id: true, name: true, type: true, unit: true } },
        building: { select: { id: true, name: true } },
        acknowledger: { select: { id: true, name: true } },
        resolver: { select: { id: true, name: true } },
      },
    });

    if (!alert) {
      throw Object.assign(new Error('Alert not found'), {
        statusCode: 404,
        code: 'ALERT_NOT_FOUND',
      });
    }

    return {
      id: alert.id,
      alertRuleId: alert.alertRuleId,
      ruleName: alert.alertRule?.name ?? null,
      buildingId: alert.buildingId,
      buildingName: alert.building.name,
      severity: alert.severity,
      status: alert.status,
      sensorId: alert.sensorId,
      sensorName: alert.sensor?.name ?? null,
      sensorType: alert.sensor?.type ?? null,
      sensorValue: alert.sensorValue,
      thresholdValue: alert.thresholdValue,
      operator: alert.operator,
      unit: alert.sensor?.unit ?? null,
      message: alert.message,
      triggeredAt: alert.triggeredAt.toISOString(),
      acknowledgedAt: alert.acknowledgedAt?.toISOString() ?? null,
      acknowledgedBy: alert.acknowledger
        ? { id: alert.acknowledger.id, name: alert.acknowledger.name }
        : null,
      resolvedAt: alert.resolvedAt?.toISOString() ?? null,
      resolvedBy: alert.resolver
        ? { id: alert.resolver.id, name: alert.resolver.name }
        : null,
      comment: alert.comment,
    };
  }

  async acknowledgeAlert(id: string, userId: string, comment?: string) {
    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) {
      throw Object.assign(new Error('Alert not found'), {
        statusCode: 404,
        code: 'ALERT_NOT_FOUND',
      });
    }

    if (alert.status !== 'active') {
      throw Object.assign(new Error('Alert is not in active status'), {
        statusCode: 400,
        code: 'INVALID_ALERT_STATUS',
      });
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
        ...(comment ? { comment } : {}),
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      acknowledgedAt: updated.acknowledgedAt?.toISOString(),
    };
  }

  async resolveAlert(id: string, userId: string, comment?: string) {
    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) {
      throw Object.assign(new Error('Alert not found'), {
        statusCode: 404,
        code: 'ALERT_NOT_FOUND',
      });
    }

    if (alert.status === 'resolved') {
      throw Object.assign(new Error('Alert is already resolved'), {
        statusCode: 400,
        code: 'ALREADY_RESOLVED',
      });
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: userId,
        ...(comment ? { comment } : {}),
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      resolvedAt: updated.resolvedAt?.toISOString(),
    };
  }

  // --- Notifications ---

  async listNotifications(userId: string, params: { page: number; limit: number; unreadOnly: boolean }) {
    const skip = (params.page - 1) * params.limit;

    const where: Prisma.NotificationWhereInput = { userId };
    if (params.unreadOnly) where.isRead = false;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        severity: n.severity,
        isRead: n.isRead,
        alertId: n.alertId,
        createdAt: n.createdAt.toISOString(),
      })),
      total,
    };
  }

  async markNotificationsRead(userId: string, ids: string[]) {
    await prisma.notification.updateMany({
      where: {
        id: { in: ids },
        userId,
      },
      data: { isRead: true },
    });

    return { markedCount: ids.length };
  }
}

export const alertsService = new AlertsService();

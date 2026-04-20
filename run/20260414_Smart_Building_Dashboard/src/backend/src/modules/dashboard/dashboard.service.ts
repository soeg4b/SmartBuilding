import { prisma } from '../../config/database';

export class DashboardService {
  async getExecutiveSummary(buildingId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Energy cost today
    const energySensors = await prisma.sensor.findMany({
      where: { buildingId, type: 'energy_meter', isActive: true },
      select: { id: true },
    });
    const energyIds = energySensors.map((s) => s.id);

    let todayKwh = 0;
    if (energyIds.length > 0) {
      const result = await prisma.$queryRaw<Array<{ total: number }>>`
        SELECT COALESCE(SUM(sr.value), 0) AS total
        FROM sensor_readings sr
        WHERE sr.sensor_id = ANY(${energyIds}::uuid[])
          AND sr.time >= ${todayStart}
      `;
      todayKwh = Number(result[0]?.total ?? 0);
    }

    // Get tariff
    const tariff = await prisma.energyTariff.findFirst({
      where: {
        buildingId,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
    const tariffRate = tariff ? Number(tariff.ratePerKwh) : 1444.7;
    const energyCostToday = Math.round(todayKwh * tariffRate);

    // Billing projection (simplified)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysElapsed = Math.max(1, Math.floor((now.getTime() - monthStart.getTime()) / (24 * 60 * 60 * 1000)));

    let monthKwh = 0;
    if (energyIds.length > 0) {
      const result = await prisma.$queryRaw<Array<{ total: number }>>`
        SELECT COALESCE(SUM(sr.value), 0) AS total
        FROM sensor_readings sr
        WHERE sr.sensor_id = ANY(${energyIds}::uuid[])
          AND sr.time >= ${monthStart}
      `;
      monthKwh = Number(result[0]?.total ?? 0);
    }

    const projectedMonthly = Math.round((monthKwh / daysElapsed) * daysInMonth * tariffRate);

    // Last month actual
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    let lastMonthActual = 0;
    if (energyIds.length > 0) {
      const result = await prisma.$queryRaw<Array<{ total: number }>>`
        SELECT COALESCE(SUM(sr.value), 0) AS total
        FROM sensor_readings sr
        WHERE sr.sensor_id = ANY(${energyIds}::uuid[])
          AND sr.time >= ${lastMonthStart}
          AND sr.time < ${monthStart}
      `;
      lastMonthActual = Math.round(Number(result[0]?.total ?? 0) * tariffRate);
    }

    const variancePercent = lastMonthActual > 0
      ? Math.round(((projectedMonthly - lastMonthActual) / lastMonthActual) * 10000) / 100
      : 0;

    // Energy trend 7 days
    let energyTrend7d: Array<{ date: string; kwh: number }> = [];
    if (energyIds.length > 0) {
      const trendData = await prisma.$queryRaw<Array<{ bucket: Date; kwh: number }>>`
        SELECT
          time_bucket('1 day'::interval, sr.time) AS bucket,
          SUM(sr.value) AS kwh
        FROM sensor_readings sr
        WHERE sr.sensor_id = ANY(${energyIds}::uuid[])
          AND sr.time >= ${sevenDaysAgo}
        GROUP BY bucket
        ORDER BY bucket ASC
      `;
      energyTrend7d = trendData.map((d) => ({
        date: d.bucket.toISOString().split('T')[0],
        kwh: Math.round(Number(d.kwh)),
      }));
    }

    // Top anomalies (recent critical/warning alerts)
    const anomalies = await prisma.alert.findMany({
      where: {
        buildingId,
        severity: { in: ['warning', 'critical'] },
        triggeredAt: { gte: sevenDaysAgo },
      },
      orderBy: { triggeredAt: 'desc' },
      take: 5,
      select: {
        id: true,
        message: true,
        severity: true,
        triggeredAt: true,
      },
    });

    // Comfort overview (zones)
    const zones = await prisma.zone.findMany({
      where: { floor: { buildingId } },
      include: {
        sensors: {
          where: { isActive: true, type: { in: ['temperature', 'humidity', 'co2'] } },
          select: { id: true, type: true },
        },
      },
    });

    let zonesNormal = 0;
    let zonesWarning = 0;
    let zonesCritical = 0;

    for (const zone of zones) {
      const activeAlerts = await prisma.alert.count({
        where: {
          buildingId,
          status: 'active',
          sensorId: { in: zone.sensors.map((s) => s.id) },
        },
      });

      const criticalAlerts = await prisma.alert.count({
        where: {
          buildingId,
          status: 'active',
          severity: 'critical',
          sensorId: { in: zone.sensors.map((s) => s.id) },
        },
      });

      if (criticalAlerts > 0) zonesCritical++;
      else if (activeAlerts > 0) zonesWarning++;
      else zonesNormal++;
    }

    return {
      energyCostToday: { value: energyCostToday, currency: 'IDR' },
      billingProjection: {
        projectedMonthly,
        lastMonthActual,
        variancePercent,
        currency: 'IDR',
      },
      energyTrend7d,
      topAnomalies: anomalies.map((a) => ({
        id: a.id,
        message: a.message,
        severity: a.severity,
        timestamp: a.triggeredAt.toISOString(),
      })),
      comfortOverview: { zonesNormal, zonesWarning, zonesCritical },
    };
  }

  async getOperationsSummary(buildingId?: string) {
    const where: any = {};
    if (buildingId) where.buildingId = buildingId;

    // Sensor status
    const [totalSensors, onlineSensors, offlineSensors, staleSensors] = await Promise.all([
      prisma.sensor.count({ where: { ...where, isActive: true } }),
      prisma.sensor.count({ where: { ...where, isActive: true, status: 'online' } }),
      prisma.sensor.count({ where: { ...where, isActive: true, status: 'offline' } }),
      prisma.sensor.count({ where: { ...where, isActive: true, status: 'stale' } }),
    ]);

    // Alert summary
    const [criticalAlerts, warningAlerts, infoAlerts] = await Promise.all([
      prisma.alert.count({ where: { ...where, status: 'active', severity: 'critical' } }),
      prisma.alert.count({ where: { ...where, status: 'active', severity: 'warning' } }),
      prisma.alert.count({ where: { ...where, status: 'active', severity: 'info' } }),
    ]);

    // Equipment health
    const [greenEquipment, yellowEquipment, redEquipment] = await Promise.all([
      prisma.equipment.count({ where: { ...where, isActive: true, healthStatus: 'green' } }),
      prisma.equipment.count({ where: { ...where, isActive: true, healthStatus: 'yellow' } }),
      prisma.equipment.count({ where: { ...where, isActive: true, healthStatus: 'red' } }),
    ]);

    // Recent events (last 10 alerts)
    const recentAlerts = await prisma.alert.findMany({
      where: { ...where, status: { in: ['active', 'acknowledged'] } },
      orderBy: { triggeredAt: 'desc' },
      take: 10,
      select: {
        id: true,
        message: true,
        severity: true,
        triggeredAt: true,
      },
    });

    // Last data ingestion
    const lastReading = await prisma.sensorReading.findFirst({
      orderBy: { time: 'desc' },
      select: { time: true },
    });

    return {
      sensorStatus: {
        total: totalSensors,
        online: onlineSensors,
        offline: offlineSensors,
        stale: staleSensors,
      },
      alertSummary: {
        critical: criticalAlerts,
        warning: warningAlerts,
        info: infoAlerts,
        activeTotal: criticalAlerts + warningAlerts + infoAlerts,
      },
      equipmentHealth: {
        green: greenEquipment,
        yellow: yellowEquipment,
        red: redEquipment,
      },
      recentEvents: recentAlerts.map((a) => ({
        type: 'alert',
        message: a.message,
        severity: a.severity,
        timestamp: a.triggeredAt.toISOString(),
      })),
      lastDataIngestion: lastReading?.time.toISOString() ?? null,
    };
  }

  async getTechnicianSummary(userId: string, buildingId?: string) {
    const where: any = { isActive: true };
    if (buildingId) where.buildingId = buildingId;

    // Assigned assets (equipment with non-green health)
    const assets = await prisma.equipment.findMany({
      where: {
        ...where,
        healthStatus: { in: ['yellow', 'red'] },
      },
      take: 20,
      orderBy: [{ healthStatus: 'asc' }, { name: 'asc' }],
      include: {
        building: { select: { name: true } },
        floor: { select: { name: true } },
        zone: { select: { name: true } },
      },
    });

    const assignedAssets = await Promise.all(
      assets.map(async (a) => {
        // Get key metric
        const latestMetric = await prisma.equipmentMetric.findFirst({
          where: { equipmentId: a.id },
          orderBy: { time: 'desc' },
        });

        const location = [a.floor?.name, a.zone?.name]
          .filter(Boolean)
          .join(' - ') || a.building.name;

        return {
          id: a.id,
          name: a.name,
          type: a.type,
          healthStatus: a.healthStatus,
          keyMetric: latestMetric
            ? `${latestMetric.metricType}: ${latestMetric.value}`
            : null,
          location,
        };
      })
    );

    // Pending alerts
    const pendingAlerts = await prisma.alert.findMany({
      where: {
        ...(buildingId ? { buildingId } : {}),
        status: 'active',
      },
      orderBy: [{ severity: 'asc' }, { triggeredAt: 'desc' }],
      take: 10,
      select: {
        id: true,
        severity: true,
        message: true,
        triggeredAt: true,
      },
    });

    // Recent activity (acknowledged/resolved by this user)
    const recentActivity = await prisma.alert.findMany({
      where: {
        OR: [
          { acknowledgedBy: userId },
          { resolvedBy: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        message: true,
        acknowledgedAt: true,
        resolvedAt: true,
      },
    });

    return {
      assignedAssets,
      pendingAlerts: pendingAlerts.map((a) => ({
        id: a.id,
        severity: a.severity,
        message: a.message,
        timestamp: a.triggeredAt.toISOString(),
      })),
      recentActivity: recentActivity.map((a) => ({
        type: a.status === 'resolved' ? 'alert_resolved' : 'alert_acknowledged',
        message: a.message,
        timestamp: (a.resolvedAt ?? a.acknowledgedAt)?.toISOString() ?? null,
      })),
    };
  }

  async getBuildingSummary(buildingId: string) {
    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      include: {
        _count: {
          select: { floors: true, sensors: true, equipment: true },
        },
      },
    });

    if (!building) {
      throw Object.assign(new Error('Building not found'), {
        statusCode: 404,
        code: 'BUILDING_NOT_FOUND',
      });
    }

    const [activeAlerts, onlineSensors] = await Promise.all([
      prisma.alert.count({ where: { buildingId, status: 'active' } }),
      prisma.sensor.count({ where: { buildingId, isActive: true, status: 'online' } }),
    ]);

    return {
      building: {
        id: building.id,
        name: building.name,
        address: building.address,
        city: building.city,
      },
      stats: {
        floors: building._count.floors,
        totalSensors: building._count.sensors,
        onlineSensors,
        totalEquipment: building._count.equipment,
        activeAlerts,
      },
    };
  }
}

export const dashboardService = new DashboardService();

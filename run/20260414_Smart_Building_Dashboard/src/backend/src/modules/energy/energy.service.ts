import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';

export class EnergyService {
  async getConsumption(buildingId: string) {
    // Get current energy readings from energy_meter sensors in the building
    const sensors = await prisma.sensor.findMany({
      where: {
        buildingId,
        type: 'energy_meter',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        unit: true,
        status: true,
        lastSeenAt: true,
      },
    });

    // Get latest reading for each energy sensor
    const readings = await Promise.all(
      sensors.map(async (sensor) => {
        const latest = await prisma.sensorReading.findFirst({
          where: { sensorId: sensor.id },
          orderBy: { time: 'desc' },
        });
        return {
          sensorId: sensor.id,
          sensorName: sensor.name,
          unit: sensor.unit,
          status: sensor.status,
          lastSeenAt: sensor.lastSeenAt?.toISOString() ?? null,
          currentValue: latest?.value ?? null,
          lastReadingAt: latest?.time.toISOString() ?? null,
        };
      })
    );

    // Calculate total current kWh
    const totalKwh = readings.reduce((sum, r) => sum + (r.currentValue ?? 0), 0);

    return {
      buildingId,
      totalCurrentKwh: totalKwh,
      sensors: readings,
      timestamp: new Date().toISOString(),
    };
  }

  async getTrends(params: {
    buildingId: string;
    from: string;
    to: string;
    interval: string;
    compare?: string;
  }) {
    const fromDate = new Date(params.from);
    const toDate = new Date(params.to);

    // Get energy meter sensor IDs for the building
    const sensorIds = await prisma.sensor.findMany({
      where: {
        buildingId: params.buildingId,
        type: 'energy_meter',
        isActive: true,
      },
      select: { id: true },
    });

    const ids = sensorIds.map((s) => s.id);

    if (ids.length === 0) {
      return {
        buildingId: params.buildingId,
        interval: params.interval,
        series: [],
        summary: { totalKwh: 0, avgPowerFactor: 0, peakKw: 0, peakTimestamp: null },
      };
    }

    // Use time_bucket for aggregation (TimescaleDB)
    const intervalMap: Record<string, string> = {
      hourly: '1 hour',
      daily: '1 day',
      weekly: '1 week',
      monthly: '1 month',
    };
    const bucket = intervalMap[params.interval] || '1 day';

    const series = await prisma.$queryRaw<
      Array<{ bucket: Date; kwh: number; peak_kw: number }>
    >`
      SELECT
        time_bucket(${bucket}::interval, sr.time) AS bucket,
        SUM(sr.value) AS kwh,
        MAX(sr.value) AS peak_kw
      FROM sensor_readings sr
      WHERE sr.sensor_id = ANY(${ids}::uuid[])
        AND sr.time >= ${fromDate}
        AND sr.time < ${toDate}
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    // Power factor sensors
    const pfSensors = await prisma.sensor.findMany({
      where: {
        buildingId: params.buildingId,
        type: 'power_factor',
        isActive: true,
      },
      select: { id: true },
    });
    const pfIds = pfSensors.map((s) => s.id);

    let avgPowerFactor = 0;
    if (pfIds.length > 0) {
      const pfResult = await prisma.$queryRaw<Array<{ avg_pf: number }>>`
        SELECT AVG(sr.value) AS avg_pf
        FROM sensor_readings sr
        WHERE sr.sensor_id = ANY(${pfIds}::uuid[])
          AND sr.time >= ${fromDate}
          AND sr.time < ${toDate}
      `;
      avgPowerFactor = pfResult[0]?.avg_pf ?? 0;
    }

    const totalKwh = series.reduce((sum, s) => sum + Number(s.kwh), 0);
    const peakEntry = series.reduce(
      (max, s) => (Number(s.peak_kw) > (max?.peak_kw ?? 0) ? s : max),
      series[0]
    );

    const result: any = {
      buildingId: params.buildingId,
      interval: params.interval,
      series: series.map((s) => ({
        timestamp: s.bucket.toISOString(),
        kwh: Number(s.kwh),
        peakKw: Number(s.peak_kw),
      })),
      summary: {
        totalKwh,
        avgPowerFactor: Math.round(avgPowerFactor * 100) / 100,
        peakKw: peakEntry ? Number(peakEntry.peak_kw) : 0,
        peakTimestamp: peakEntry?.bucket.toISOString() ?? null,
      },
    };

    // Comparison with previous period
    if (params.compare === 'previous_period') {
      const duration = toDate.getTime() - fromDate.getTime();
      const compFrom = new Date(fromDate.getTime() - duration);
      const compTo = fromDate;

      const compSeries = await prisma.$queryRaw<
        Array<{ bucket: Date; kwh: number; peak_kw: number }>
      >`
        SELECT
          time_bucket(${bucket}::interval, sr.time) AS bucket,
          SUM(sr.value) AS kwh,
          MAX(sr.value) AS peak_kw
        FROM sensor_readings sr
        WHERE sr.sensor_id = ANY(${ids}::uuid[])
          AND sr.time >= ${compFrom}
          AND sr.time < ${compTo}
        GROUP BY bucket
        ORDER BY bucket ASC
      `;

      result.comparison = compSeries.map((s) => ({
        timestamp: s.bucket.toISOString(),
        kwh: Number(s.kwh),
        peakKw: Number(s.peak_kw),
      }));
    }

    return result;
  }

  async getPeakLoad(params: { buildingId: string; from: string; to: string }) {
    const fromDate = new Date(params.from);
    const toDate = new Date(params.to);

    const sensorIds = await prisma.sensor.findMany({
      where: {
        buildingId: params.buildingId,
        type: 'energy_meter',
        isActive: true,
      },
      select: { id: true },
    });
    const ids = sensorIds.map((s) => s.id);

    if (ids.length === 0) {
      return { buildingId: params.buildingId, peakKw: 0, peakTimestamp: null };
    }

    const result = await prisma.$queryRaw<Array<{ peak_kw: number; peak_time: Date }>>`
      SELECT
        sr.value AS peak_kw,
        sr.time AS peak_time
      FROM sensor_readings sr
      WHERE sr.sensor_id = ANY(${ids}::uuid[])
        AND sr.time >= ${fromDate}
        AND sr.time < ${toDate}
      ORDER BY sr.value DESC
      LIMIT 1
    `;

    return {
      buildingId: params.buildingId,
      peakKw: result[0] ? Number(result[0].peak_kw) : 0,
      peakTimestamp: result[0]?.peak_time.toISOString() ?? null,
      from: params.from,
      to: params.to,
    };
  }

  async getBillingProjection(params: { buildingId: string; month?: string }) {
    const now = new Date();
    const monthStr = params.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [year, month] = monthStr.split('-').map(Number);

    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd = new Date(Date.UTC(year, month, 1));
    const daysInMonth = new Date(year, month, 0).getDate();

    const elapsed = Math.min(
      Math.floor((now.getTime() - monthStart.getTime()) / (24 * 60 * 60 * 1000)),
      daysInMonth
    );
    const remaining = daysInMonth - elapsed;

    // Get energy sensor ids
    const sensorIds = await prisma.sensor.findMany({
      where: {
        buildingId: params.buildingId,
        type: 'energy_meter',
        isActive: true,
      },
      select: { id: true },
    });
    const ids = sensorIds.map((s) => s.id);

    let consumedKwh = 0;
    if (ids.length > 0) {
      const result = await prisma.$queryRaw<Array<{ total: number }>>`
        SELECT COALESCE(SUM(sr.value), 0) AS total
        FROM sensor_readings sr
        WHERE sr.sensor_id = ANY(${ids}::uuid[])
          AND sr.time >= ${monthStart}
          AND sr.time < ${now}
      `;
      consumedKwh = Number(result[0]?.total ?? 0);
    }

    // Get current tariff
    const tariff = await prisma.energyTariff.findFirst({
      where: {
        buildingId: params.buildingId,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    const tariffPerKwh = tariff ? Number(tariff.ratePerKwh) : 1444.7; // Default PLN tariff

    // Project based on daily average
    const dailyAvg = elapsed > 0 ? consumedKwh / elapsed : 0;
    const projectedKwh = dailyAvg * daysInMonth;
    const projectedCostIdr = Math.round(projectedKwh * tariffPerKwh);

    // Last month actual
    const lastMonthStart = new Date(Date.UTC(year, month - 2, 1));
    const lastMonthEnd = monthStart;
    let lastMonthActualIdr: number | null = null;

    if (ids.length > 0) {
      const lastResult = await prisma.$queryRaw<Array<{ total: number }>>`
        SELECT COALESCE(SUM(sr.value), 0) AS total
        FROM sensor_readings sr
        WHERE sr.sensor_id = ANY(${ids}::uuid[])
          AND sr.time >= ${lastMonthStart}
          AND sr.time < ${lastMonthEnd}
      `;
      const lastMonthKwh = Number(lastResult[0]?.total ?? 0);
      lastMonthActualIdr = Math.round(lastMonthKwh * tariffPerKwh);
    }

    const variancePercent =
      lastMonthActualIdr && lastMonthActualIdr > 0
        ? Math.round(((projectedCostIdr - lastMonthActualIdr) / lastMonthActualIdr) * 10000) / 100
        : null;

    return {
      buildingId: params.buildingId,
      month: monthStr,
      consumedKwh: Math.round(consumedKwh * 100) / 100,
      projectedKwh: Math.round(projectedKwh * 100) / 100,
      tariffPerKwh,
      projectedCostIdr,
      lastMonthActualIdr,
      variancePercent,
      daysElapsed: elapsed,
      daysRemaining: remaining,
      updatedAt: now.toISOString(),
    };
  }

  async getTariffs(buildingId: string) {
    const tariffs = await prisma.energyTariff.findMany({
      where: { buildingId },
      orderBy: { effectiveFrom: 'desc' },
    });

    return tariffs.map((t) => ({
      id: t.id,
      buildingId: t.buildingId,
      name: t.name,
      ratePerKwh: Number(t.ratePerKwh),
      currency: t.currency,
      effectiveFrom: t.effectiveFrom.toISOString(),
      effectiveTo: t.effectiveTo?.toISOString() ?? null,
      createdBy: t.createdBy,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  async upsertTariff(
    input: {
      buildingId: string;
      name: string;
      ratePerKwh: number;
      currency: string;
      effectiveFrom: string;
      effectiveTo?: string | null;
    },
    userId: string
  ) {
    const tariff = await prisma.energyTariff.create({
      data: {
        buildingId: input.buildingId,
        name: input.name,
        ratePerKwh: input.ratePerKwh,
        currency: input.currency,
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
        createdBy: userId,
      },
    });

    return {
      id: tariff.id,
      buildingId: tariff.buildingId,
      name: tariff.name,
      ratePerKwh: Number(tariff.ratePerKwh),
      currency: tariff.currency,
      effectiveFrom: tariff.effectiveFrom.toISOString(),
      effectiveTo: tariff.effectiveTo?.toISOString() ?? null,
      createdAt: tariff.createdAt.toISOString(),
    };
  }
}

export const energyService = new EnergyService();

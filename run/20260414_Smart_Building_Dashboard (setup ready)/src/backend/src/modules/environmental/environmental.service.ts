import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';

export class EnvironmentalService {
  async listSensors(params: {
    page: number;
    limit: number;
    buildingId?: string;
    type?: string;
    status?: string;
    zoneId?: string;
  }) {
    const skip = (params.page - 1) * params.limit;

    const where: Prisma.SensorWhereInput = { isActive: true };
    if (params.buildingId) where.buildingId = params.buildingId;
    if (params.type) where.type = params.type as any;
    if (params.status) where.status = params.status as any;
    if (params.zoneId) where.zoneId = params.zoneId;

    const [sensors, total] = await Promise.all([
      prisma.sensor.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { name: 'asc' },
        include: {
          building: { select: { id: true, name: true } },
          zone: { select: { id: true, name: true } },
        },
      }),
      prisma.sensor.count({ where }),
    ]);

    return {
      sensors: sensors.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        unit: s.unit,
        status: s.status,
        lastSeenAt: s.lastSeenAt?.toISOString() ?? null,
        buildingId: s.buildingId,
        buildingName: s.building.name,
        zoneId: s.zoneId,
        zoneName: s.zone?.name ?? null,
        isActive: s.isActive,
      })),
      total,
    };
  }

  async getSensorById(id: string) {
    const sensor = await prisma.sensor.findUnique({
      where: { id },
      include: {
        building: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } },
      },
    });

    if (!sensor) {
      throw Object.assign(new Error('Sensor not found'), {
        statusCode: 404,
        code: 'SENSOR_NOT_FOUND',
      });
    }

    // Get latest reading
    const latestReading = await prisma.sensorReading.findFirst({
      where: { sensorId: id },
      orderBy: { time: 'desc' },
    });

    return {
      id: sensor.id,
      name: sensor.name,
      type: sensor.type,
      unit: sensor.unit,
      mqttTopic: sensor.mqttTopic,
      status: sensor.status,
      lastSeenAt: sensor.lastSeenAt?.toISOString() ?? null,
      buildingId: sensor.buildingId,
      buildingName: sensor.building.name,
      zoneId: sensor.zoneId,
      zoneName: sensor.zone?.name ?? null,
      metadata: sensor.metadata,
      isActive: sensor.isActive,
      latestReading: latestReading
        ? {
            value: latestReading.value,
            quality: latestReading.quality,
            timestamp: latestReading.time.toISOString(),
          }
        : null,
    };
  }

  async getSensorReadings(
    sensorId: string,
    params: { from: string; to: string; interval: string }
  ) {
    const sensor = await prisma.sensor.findUnique({
      where: { id: sensorId },
      select: { id: true, type: true, unit: true },
    });

    if (!sensor) {
      throw Object.assign(new Error('Sensor not found'), {
        statusCode: 404,
        code: 'SENSOR_NOT_FOUND',
      });
    }

    const fromDate = new Date(params.from);
    const toDate = new Date(params.to);

    if (params.interval === 'raw') {
      const readings = await prisma.sensorReading.findMany({
        where: {
          sensorId,
          time: { gte: fromDate, lt: toDate },
        },
        orderBy: { time: 'asc' },
        take: 10000, // cap raw results
      });

      return {
        sensorId,
        sensorType: sensor.type,
        unit: sensor.unit,
        readings: readings.map((r) => ({
          timestamp: r.time.toISOString(),
          value: r.value,
          quality: r.quality,
        })),
      };
    }

    // Use time_bucket for aggregated intervals
    const bucketMap: Record<string, string> = {
      '1min': '1 minute',
      '5min': '5 minutes',
      '15min': '15 minutes',
      hourly: '1 hour',
    };
    const bucket = bucketMap[params.interval] || '15 minutes';

    const readings = await prisma.$queryRaw<
      Array<{ bucket: Date; avg_value: number; min_value: number; max_value: number }>
    >`
      SELECT
        time_bucket(${bucket}::interval, sr.time) AS bucket,
        AVG(sr.value) AS avg_value,
        MIN(sr.value) AS min_value,
        MAX(sr.value) AS max_value
      FROM sensor_readings sr
      WHERE sr.sensor_id = ${sensorId}::uuid
        AND sr.time >= ${fromDate}
        AND sr.time < ${toDate}
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    return {
      sensorId,
      sensorType: sensor.type,
      unit: sensor.unit,
      readings: readings.map((r) => ({
        timestamp: r.bucket.toISOString(),
        value: Math.round(Number(r.avg_value) * 100) / 100,
        min: Math.round(Number(r.min_value) * 100) / 100,
        max: Math.round(Number(r.max_value) * 100) / 100,
      })),
    };
  }

  async listZones(params: {
    page: number;
    limit: number;
    buildingId?: string;
    floorId?: string;
    status?: string;
  }) {
    const skip = (params.page - 1) * params.limit;

    const where: Prisma.ZoneWhereInput = {};
    if (params.floorId) where.floorId = params.floorId;
    if (params.buildingId) {
      where.floor = { buildingId: params.buildingId };
    }

    const [zones, total] = await Promise.all([
      prisma.zone.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { name: 'asc' },
        include: {
          floor: { select: { id: true, name: true, buildingId: true } },
          sensors: {
            where: { isActive: true },
            select: { id: true, type: true, unit: true, status: true },
          },
        },
      }),
      prisma.zone.count({ where }),
    ]);

    // For each zone, get latest readings per sensor type
    const zonesWithReadings = await Promise.all(
      zones.map(async (zone) => {
        const readings: Record<string, any> = {};

        const sensorTypes = ['temperature', 'humidity', 'co2'] as const;
        for (const sType of sensorTypes) {
          const typeSensors = zone.sensors.filter((s) => s.type === sType);
          if (typeSensors.length === 0) continue;

          const latestReadings = await Promise.all(
            typeSensors.map((s) =>
              prisma.sensorReading.findFirst({
                where: { sensorId: s.id },
                orderBy: { time: 'desc' },
              })
            )
          );

          const validReadings = latestReadings.filter(Boolean);
          if (validReadings.length === 0) continue;

          const avgValue =
            validReadings.reduce((sum, r) => sum + (r?.value ?? 0), 0) / validReadings.length;
          const unit = typeSensors[0].unit;

          const readingStatus = this.getReadingStatus(sType, avgValue, zone);

          readings[sType] = {
            value: Math.round(avgValue * 10) / 10,
            unit,
            status: readingStatus,
            ...(sType === 'co2' ? { aqiLabel: this.getCo2Label(avgValue) } : {}),
          };
        }

        const zoneStatus = this.computeZoneStatus(readings);
        const lastUpdated = zone.sensors.reduce(
          (latest: Date | null, s) => {
            // Use sensor lastSeenAt if available
            return latest;
          },
          null
        );

        // Filter by status if requested
        if (params.status && zoneStatus !== params.status) {
          return null;
        }

        return {
          id: zone.id,
          name: zone.name,
          floorId: zone.floorId,
          floorName: zone.floor.name,
          status: zoneStatus,
          readings,
          sensorCount: zone.sensors.length,
          lastUpdated: new Date().toISOString(),
        };
      })
    );

    const filtered = zonesWithReadings.filter(Boolean);

    return {
      zones: filtered,
      total: params.status ? filtered.length : total,
    };
  }

  async getZoneById(id: string) {
    const zone = await prisma.zone.findUnique({
      where: { id },
      include: {
        floor: {
          select: { id: true, name: true, buildingId: true, building: { select: { name: true } } },
        },
        sensors: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            type: true,
            unit: true,
            status: true,
            lastSeenAt: true,
          },
        },
      },
    });

    if (!zone) {
      throw Object.assign(new Error('Zone not found'), {
        statusCode: 404,
        code: 'ZONE_NOT_FOUND',
      });
    }

    // Get latest readings for each sensor
    const sensorsWithReadings = await Promise.all(
      zone.sensors.map(async (s) => {
        const latest = await prisma.sensorReading.findFirst({
          where: { sensorId: s.id },
          orderBy: { time: 'desc' },
        });
        return {
          ...s,
          lastSeenAt: s.lastSeenAt?.toISOString() ?? null,
          latestReading: latest
            ? { value: latest.value, timestamp: latest.time.toISOString() }
            : null,
        };
      })
    );

    return {
      id: zone.id,
      name: zone.name,
      type: zone.type,
      floorId: zone.floorId,
      floorName: zone.floor.name,
      buildingId: zone.floor.buildingId,
      buildingName: zone.floor.building.name,
      thresholds: {
        tempMin: Number(zone.tempMin),
        tempMax: Number(zone.tempMax),
        humidityMin: Number(zone.humidityMin),
        humidityMax: Number(zone.humidityMax),
        co2Max: zone.co2Max,
      },
      sensors: sensorsWithReadings,
    };
  }

  async getZoneReadings(
    zoneId: string,
    params: { from: string; to: string; interval: string }
  ) {
    const zone = await prisma.zone.findUnique({
      where: { id: zoneId },
      include: {
        sensors: {
          where: { isActive: true },
          select: { id: true, type: true, unit: true },
        },
      },
    });

    if (!zone) {
      throw Object.assign(new Error('Zone not found'), {
        statusCode: 404,
        code: 'ZONE_NOT_FOUND',
      });
    }

    const fromDate = new Date(params.from);
    const toDate = new Date(params.to);

    const bucketMap: Record<string, string> = {
      raw: '1 minute',
      '1min': '1 minute',
      '5min': '5 minutes',
      '15min': '15 minutes',
      hourly: '1 hour',
    };
    const bucket = bucketMap[params.interval] || '15 minutes';

    const sensorIds = zone.sensors.map((s) => s.id);

    if (sensorIds.length === 0) {
      return { zoneId, readings: {} };
    }

    // Aggregate by sensor type
    const sensorTypes = [...new Set(zone.sensors.map((s) => s.type))];
    const result: Record<string, any> = {};

    for (const sType of sensorTypes) {
      const typeIds = zone.sensors.filter((s) => s.type === sType).map((s) => s.id);

      const readings = await prisma.$queryRaw<
        Array<{ bucket: Date; avg_value: number }>
      >`
        SELECT
          time_bucket(${bucket}::interval, sr.time) AS bucket,
          AVG(sr.value) AS avg_value
        FROM sensor_readings sr
        WHERE sr.sensor_id = ANY(${typeIds}::uuid[])
          AND sr.time >= ${fromDate}
          AND sr.time < ${toDate}
        GROUP BY bucket
        ORDER BY bucket ASC
      `;

      result[sType] = readings.map((r) => ({
        timestamp: r.bucket.toISOString(),
        value: Math.round(Number(r.avg_value) * 100) / 100,
      }));
    }

    return { zoneId, readings: result };
  }

  private getReadingStatus(
    type: 'temperature' | 'humidity' | 'co2',
    value: number,
    zone: { tempMin: any; tempMax: any; humidityMin: any; humidityMax: any; co2Max: number }
  ): string {
    if (type === 'temperature') {
      const min = Number(zone.tempMin);
      const max = Number(zone.tempMax);
      if (value < min - 2 || value > max + 2) return 'critical';
      if (value < min || value > max) return 'warning';
      return 'normal';
    }
    if (type === 'humidity') {
      const min = Number(zone.humidityMin);
      const max = Number(zone.humidityMax);
      if (value < min - 10 || value > max + 10) return 'critical';
      if (value < min || value > max) return 'warning';
      return 'normal';
    }
    if (type === 'co2') {
      if (value > zone.co2Max * 1.5) return 'critical';
      if (value > zone.co2Max) return 'warning';
      return 'normal';
    }
    return 'normal';
  }

  private getCo2Label(ppm: number): string {
    if (ppm <= 400) return 'Excellent';
    if (ppm <= 600) return 'Good';
    if (ppm <= 800) return 'Moderate';
    if (ppm <= 1000) return 'Poor';
    return 'Hazardous';
  }

  private computeZoneStatus(readings: Record<string, any>): string {
    const statuses = Object.values(readings).map((r: any) => r.status);
    if (statuses.includes('critical')) return 'critical';
    if (statuses.includes('warning')) return 'warning';
    return 'normal';
  }
}

export const environmentalService = new EnvironmentalService();

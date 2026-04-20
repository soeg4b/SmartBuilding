import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';

export class AssetsService {
  async list(params: {
    page: number;
    limit: number;
    buildingId?: string;
    type?: string;
    healthStatus?: string;
  }) {
    const skip = (params.page - 1) * params.limit;

    const where: Prisma.EquipmentWhereInput = { isActive: true };
    if (params.buildingId) where.buildingId = params.buildingId;
    if (params.type) where.type = params.type as any;
    if (params.healthStatus) where.healthStatus = params.healthStatus as any;

    const [equipment, total] = await Promise.all([
      prisma.equipment.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { name: 'asc' },
        include: {
          building: { select: { id: true, name: true } },
          floor: { select: { id: true, name: true } },
          zone: { select: { id: true, name: true } },
          equipmentSensors: { select: { sensorId: true } },
        },
      }),
      prisma.equipment.count({ where }),
    ]);

    const result = await Promise.all(
      equipment.map(async (e) => {
        // Get latest metrics
        const metrics = await this.getLatestMetrics(e.id);

        return {
          id: e.id,
          name: e.name,
          type: e.type,
          location: {
            buildingId: e.buildingId,
            buildingName: e.building.name,
            floorId: e.floorId,
            floorName: e.floor?.name ?? null,
            zoneId: e.zoneId,
            zoneName: e.zone?.name ?? null,
          },
          serialNumber: e.serialNumber,
          installDate: e.installDate?.toISOString() ?? null,
          lastServiceDate: e.lastServiceDate?.toISOString() ?? null,
          nextServiceDate: e.nextServiceDate?.toISOString() ?? null,
          healthStatus: e.healthStatus,
          metrics,
          linkedSensorCount: e.equipmentSensors.length,
          isActive: e.isActive,
        };
      })
    );

    return { equipment: result, total };
  }

  async getById(id: string) {
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        building: { select: { id: true, name: true } },
        floor: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } },
        equipmentSensors: {
          include: {
            sensor: {
              select: { id: true, name: true, type: true, unit: true, status: true },
            },
          },
        },
      },
    });

    if (!equipment) {
      throw Object.assign(new Error('Equipment not found'), {
        statusCode: 404,
        code: 'EQUIPMENT_NOT_FOUND',
      });
    }

    const metrics = await this.getLatestMetrics(id);

    return {
      id: equipment.id,
      name: equipment.name,
      type: equipment.type,
      location: {
        buildingId: equipment.buildingId,
        buildingName: equipment.building.name,
        floorId: equipment.floorId,
        floorName: equipment.floor?.name ?? null,
        zoneId: equipment.zoneId,
        zoneName: equipment.zone?.name ?? null,
      },
      serialNumber: equipment.serialNumber,
      manufacturer: equipment.manufacturer,
      model: equipment.model,
      installDate: equipment.installDate?.toISOString() ?? null,
      lastServiceDate: equipment.lastServiceDate?.toISOString() ?? null,
      nextServiceDate: equipment.nextServiceDate?.toISOString() ?? null,
      healthStatus: equipment.healthStatus,
      metadata: equipment.metadata,
      metrics,
      linkedSensors: equipment.equipmentSensors.map((es) => ({
        sensorId: es.sensorId,
        name: es.sensor.name,
        type: es.sensor.type,
        unit: es.sensor.unit,
        status: es.sensor.status,
        role: es.role,
      })),
      isActive: equipment.isActive,
    };
  }

  async create(input: {
    buildingId: string;
    floorId?: string | null;
    zoneId?: string | null;
    name: string;
    type: string;
    serialNumber?: string | null;
    manufacturer?: string | null;
    model?: string | null;
    installDate?: string | null;
    lastServiceDate?: string | null;
    nextServiceDate?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const equipment = await prisma.equipment.create({
      data: {
        buildingId: input.buildingId,
        floorId: input.floorId ?? null,
        zoneId: input.zoneId ?? null,
        name: input.name,
        type: input.type as any,
        serialNumber: input.serialNumber ?? null,
        manufacturer: input.manufacturer ?? null,
        model: input.model ?? null,
        installDate: input.installDate ? new Date(input.installDate) : null,
        lastServiceDate: input.lastServiceDate ? new Date(input.lastServiceDate) : null,
        nextServiceDate: input.nextServiceDate ? new Date(input.nextServiceDate) : null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    return {
      ...equipment,
      installDate: equipment.installDate?.toISOString() ?? null,
      lastServiceDate: equipment.lastServiceDate?.toISOString() ?? null,
      nextServiceDate: equipment.nextServiceDate?.toISOString() ?? null,
      createdAt: equipment.createdAt.toISOString(),
    };
  }

  async update(id: string, input: Record<string, any>) {
    await this.getById(id); // ensures exists

    const data: Record<string, any> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.floorId !== undefined) data.floorId = input.floorId;
    if (input.zoneId !== undefined) data.zoneId = input.zoneId;
    if (input.serialNumber !== undefined) data.serialNumber = input.serialNumber;
    if (input.manufacturer !== undefined) data.manufacturer = input.manufacturer;
    if (input.model !== undefined) data.model = input.model;
    if (input.healthStatus !== undefined) data.healthStatus = input.healthStatus;
    if (input.metadata !== undefined) data.metadata = input.metadata;
    if (input.installDate !== undefined) {
      data.installDate = input.installDate ? new Date(input.installDate) : null;
    }
    if (input.lastServiceDate !== undefined) {
      data.lastServiceDate = input.lastServiceDate ? new Date(input.lastServiceDate) : null;
    }
    if (input.nextServiceDate !== undefined) {
      data.nextServiceDate = input.nextServiceDate ? new Date(input.nextServiceDate) : null;
    }

    const equipment = await prisma.equipment.update({
      where: { id },
      data,
    });

    return {
      ...equipment,
      installDate: equipment.installDate?.toISOString() ?? null,
      lastServiceDate: equipment.lastServiceDate?.toISOString() ?? null,
      nextServiceDate: equipment.nextServiceDate?.toISOString() ?? null,
      createdAt: equipment.createdAt.toISOString(),
      updatedAt: equipment.updatedAt.toISOString(),
    };
  }

  async softDelete(id: string) {
    await this.getById(id);
    await prisma.equipment.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getHealth(id: string) {
    const equipment = await prisma.equipment.findUnique({
      where: { id },
      include: {
        equipmentSensors: {
          include: {
            sensor: {
              select: { id: true, name: true, type: true, unit: true, status: true },
            },
          },
        },
      },
    });

    if (!equipment) {
      throw Object.assign(new Error('Equipment not found'), {
        statusCode: 404,
        code: 'EQUIPMENT_NOT_FOUND',
      });
    }

    // Get latest reading for each linked sensor
    const sensorData = await Promise.all(
      equipment.equipmentSensors.map(async (es) => {
        const latest = await prisma.sensorReading.findFirst({
          where: { sensorId: es.sensorId },
          orderBy: { time: 'desc' },
        });
        return {
          sensorId: es.sensorId,
          name: es.sensor.name,
          type: es.sensor.type,
          unit: es.sensor.unit,
          status: es.sensor.status,
          role: es.role,
          latestValue: latest?.value ?? null,
          lastReadingAt: latest?.time.toISOString() ?? null,
        };
      })
    );

    return {
      equipmentId: equipment.id,
      name: equipment.name,
      type: equipment.type,
      healthStatus: equipment.healthStatus,
      sensors: sensorData,
    };
  }

  async getMetrics(
    id: string,
    params: { from: string; to: string; interval: string }
  ) {
    await this.getById(id); // ensure exists

    const fromDate = new Date(params.from);
    const toDate = new Date(params.to);

    if (params.interval === 'raw') {
      const metrics = await prisma.equipmentMetric.findMany({
        where: {
          equipmentId: id,
          time: { gte: fromDate, lt: toDate },
        },
        orderBy: { time: 'asc' },
        take: 10000,
      });

      return {
        equipmentId: id,
        metrics: metrics.map((m) => ({
          timestamp: m.time.toISOString(),
          metricType: m.metricType,
          value: m.value,
        })),
      };
    }

    const bucketMap: Record<string, string> = {
      '1min': '1 minute',
      '5min': '5 minutes',
      '15min': '15 minutes',
      hourly: '1 hour',
      daily: '1 day',
    };
    const bucket = bucketMap[params.interval] || '1 hour';

    const metrics = await prisma.$queryRaw<
      Array<{ bucket: Date; metric_type: string; avg_value: number }>
    >`
      SELECT
        time_bucket(${bucket}::interval, em.time) AS bucket,
        em.metric_type,
        AVG(em.value) AS avg_value
      FROM equipment_metrics em
      WHERE em.equipment_id = ${id}::uuid
        AND em.time >= ${fromDate}
        AND em.time < ${toDate}
      GROUP BY bucket, em.metric_type
      ORDER BY bucket ASC
    `;

    return {
      equipmentId: id,
      metrics: metrics.map((m) => ({
        timestamp: m.bucket.toISOString(),
        metricType: m.metric_type,
        value: Math.round(Number(m.avg_value) * 100) / 100,
      })),
    };
  }

  async linkSensors(equipmentId: string, sensorIds: string[], role?: string) {
    await this.getById(equipmentId);

    const data = sensorIds.map((sensorId) => ({
      equipmentId,
      sensorId,
      role: role ?? null,
    }));

    await prisma.equipmentSensor.createMany({
      data,
      skipDuplicates: true,
    });

    return { equipmentId, linkedSensorCount: sensorIds.length };
  }

  async unlinkSensor(equipmentId: string, sensorId: string) {
    await prisma.equipmentSensor.delete({
      where: {
        equipmentId_sensorId: { equipmentId, sensorId },
      },
    });
  }

  private async getLatestMetrics(equipmentId: string) {
    const metricTypes = ['running_hours', 'cycle_count', 'fuel_level', 'operating_hours'] as const;
    const result: Record<string, number | null> = {};

    for (const metricType of metricTypes) {
      const latest = await prisma.equipmentMetric.findFirst({
        where: { equipmentId, metricType },
        orderBy: { time: 'desc' },
      });
      result[metricType] = latest?.value ?? null;
    }

    return {
      runningHours: result.running_hours,
      cycleCount: result.cycle_count,
      fuelLevel: result.fuel_level,
      operatingHours: result.operating_hours,
    };
  }
}

export const assetsService = new AssetsService();

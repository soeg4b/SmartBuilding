import { prisma } from '../../config/database';
import path from 'path';
import fs from 'fs';
import { config } from '../../config';

type DigitalTwinSource = {
  name: string;
  absolutePath: string;
  fileSize: number;
  lastModified: string;
  fileType: 'dwg' | 'pdf';
};

export class SpatialService {
  private resolveDefaultDigitalTwinSourcePath(): string | null {
    const candidates = [
      path.resolve(process.cwd(), '../../Drawing4.dwg'),
      path.resolve(process.cwd(), '../../Drawing4.pdf'),
      path.resolve(process.cwd(), '../Drawing4.dwg'),
      path.resolve(process.cwd(), '../Drawing4.pdf'),
      path.resolve(process.cwd(), 'Drawing4.dwg'),
      path.resolve(process.cwd(), 'Drawing4.pdf'),
      path.resolve(__dirname, '../../../../../../Drawing4.dwg'),
      path.resolve(__dirname, '../../../../../../Drawing4.pdf'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }

    return null;
  }

  getDigitalTwinSource(): DigitalTwinSource {
    const sourcePath = this.resolveDefaultDigitalTwinSourcePath();
    if (!sourcePath) {
      throw Object.assign(new Error('Drawing4.dwg or Drawing4.pdf not found'), {
        statusCode: 404,
        code: 'DIGITAL_TWIN_SOURCE_NOT_FOUND',
      });
    }

    const stats = fs.statSync(sourcePath);
    const extension = path.extname(sourcePath).toLowerCase();

    return {
      name: path.basename(sourcePath),
      absolutePath: sourcePath,
      fileSize: stats.size,
      lastModified: stats.mtime.toISOString(),
      fileType: extension === '.pdf' ? 'pdf' : 'dwg',
    };
  }

  async listBuildings() {
    const buildings = await prisma.building.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { floors: true, sensors: true } },
      },
    });

    return buildings.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      city: b.city,
      timezone: b.timezone,
      floorCount: b._count.floors,
      sensorCount: b._count.sensors,
      createdAt: b.createdAt.toISOString(),
    }));
  }

  async getBuildingById(id: string) {
    const building = await prisma.building.findUnique({
      where: { id },
      include: {
        floors: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, name: true, level: true, sortOrder: true },
        },
        _count: { select: { sensors: true, equipment: true } },
      },
    });

    if (!building) {
      throw Object.assign(new Error('Building not found'), {
        statusCode: 404,
        code: 'BUILDING_NOT_FOUND',
      });
    }

    return {
      id: building.id,
      name: building.name,
      address: building.address,
      city: building.city,
      timezone: building.timezone,
      floors: building.floors,
      sensorCount: building._count.sensors,
      equipmentCount: building._count.equipment,
      createdAt: building.createdAt.toISOString(),
    };
  }

  async listFloors(params: { page: number; limit: number; buildingId?: string }) {
    const skip = (params.page - 1) * params.limit;

    const where: any = {};
    if (params.buildingId) where.buildingId = params.buildingId;

    const [floors, total] = await Promise.all([
      prisma.floor.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: [{ buildingId: 'asc' }, { sortOrder: 'asc' }],
        include: {
          building: { select: { name: true } },
          _count: { select: { zones: true } },
        },
      }),
      prisma.floor.count({ where }),
    ]);

    return {
      floors: floors.map((f) => ({
        id: f.id,
        buildingId: f.buildingId,
        buildingName: f.building.name,
        name: f.name,
        level: f.level,
        sortOrder: f.sortOrder,
        zoneCount: f._count.zones,
      })),
      total,
    };
  }

  async getFloorById(id: string) {
    const floor = await prisma.floor.findUnique({
      where: { id },
      include: {
        building: { select: { id: true, name: true } },
        zones: {
          orderBy: { name: 'asc' },
          select: { id: true, name: true, type: true },
        },
        floorPlans: {
          select: { id: true, label: true, fileType: true },
        },
      },
    });

    if (!floor) {
      throw Object.assign(new Error('Floor not found'), {
        statusCode: 404,
        code: 'FLOOR_NOT_FOUND',
      });
    }

    return {
      id: floor.id,
      buildingId: floor.buildingId,
      buildingName: floor.building.name,
      name: floor.name,
      level: floor.level,
      sortOrder: floor.sortOrder,
      zones: floor.zones,
      floorPlans: floor.floorPlans,
    };
  }

  async listFloorPlans(params: { buildingId?: string; floorId?: string }) {
    const where: any = {};
    if (params.buildingId) where.buildingId = params.buildingId;
    if (params.floorId) where.floorId = params.floorId;

    const plans = await prisma.floorPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        building: { select: { name: true } },
        floor: { select: { name: true } },
      },
    });

    return plans.map((p) => ({
      id: p.id,
      buildingId: p.buildingId,
      buildingName: p.building.name,
      floorId: p.floorId,
      floorName: p.floor.name,
      label: p.label,
      fileType: p.fileType,
      fileSize: p.fileSize,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  async createFloorPlan(input: {
    buildingId: string;
    floorId: string;
    label?: string;
    fileType: 'svg' | 'png' | 'pdf' | 'dwg';
    filePath: string;
    fileSize: number;
    uploadedBy?: string;
  }) {
    const plan = await prisma.floorPlan.create({
      data: {
        buildingId: input.buildingId,
        floorId: input.floorId,
        label: input.label ?? null,
        fileType: input.fileType,
        filePath: input.filePath,
        fileSize: input.fileSize,
        uploadedBy: input.uploadedBy ?? null,
      },
    });

    return {
      id: plan.id,
      buildingId: plan.buildingId,
      floorId: plan.floorId,
      label: plan.label,
      fileType: plan.fileType,
      fileSize: plan.fileSize,
      filePath: plan.filePath,
      createdAt: plan.createdAt.toISOString(),
    };
  }

  async updateFloorPlan(
    id: string,
    input: { filePath: string; fileSize: number; fileType: 'svg' | 'png' | 'pdf' | 'dwg' }
  ) {
    const existing = await prisma.floorPlan.findUnique({ where: { id } });
    if (!existing) {
      throw Object.assign(new Error('Floor plan not found'), {
        statusCode: 404,
        code: 'FLOOR_PLAN_NOT_FOUND',
      });
    }

    // Remove old file
    const oldPath = path.resolve(existing.filePath);
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }

    const plan = await prisma.floorPlan.update({
      where: { id },
      data: {
        filePath: input.filePath,
        fileSize: input.fileSize,
        fileType: input.fileType,
      },
    });

    return {
      id: plan.id,
      buildingId: plan.buildingId,
      floorId: plan.floorId,
      label: plan.label,
      fileType: plan.fileType,
      fileSize: plan.fileSize,
      filePath: plan.filePath,
      updatedAt: plan.updatedAt.toISOString(),
    };
  }

  async deleteFloorPlan(id: string) {
    const existing = await prisma.floorPlan.findUnique({ where: { id } });
    if (!existing) {
      throw Object.assign(new Error('Floor plan not found'), {
        statusCode: 404,
        code: 'FLOOR_PLAN_NOT_FOUND',
      });
    }

    // Delete file from disk
    const filePath = path.resolve(existing.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete sensor placements first, then the floor plan
    await prisma.sensorPlacement.deleteMany({ where: { floorPlanId: id } });
    await prisma.floorPlan.delete({ where: { id } });
  }

  async getFloorPlanFile(id: string) {
    const plan = await prisma.floorPlan.findUnique({ where: { id } });
    if (!plan) {
      throw Object.assign(new Error('Floor plan not found'), {
        statusCode: 404,
        code: 'FLOOR_PLAN_NOT_FOUND',
      });
    }

    const filePath = path.resolve(plan.filePath);
    if (!fs.existsSync(filePath)) {
      throw Object.assign(new Error('Floor plan file not found on disk'), {
        statusCode: 404,
        code: 'FILE_NOT_FOUND',
      });
    }

    return {
      filePath,
      fileType: plan.fileType,
      label: plan.label,
    };
  }

  async getSensorPlacements(floorPlanId: string) {
    const plan = await prisma.floorPlan.findUnique({ where: { id: floorPlanId } });
    if (!plan) {
      throw Object.assign(new Error('Floor plan not found'), {
        statusCode: 404,
        code: 'FLOOR_PLAN_NOT_FOUND',
      });
    }

    const placements = await prisma.sensorPlacement.findMany({
      where: { floorPlanId },
      include: {
        sensor: {
          select: { id: true, name: true, type: true, unit: true, status: true },
        },
      },
    });

    return {
      floorPlanId,
      placements: placements.map((p) => ({
        id: p.id,
        sensorId: p.sensorId,
        sensorName: p.sensor.name,
        sensorType: p.sensor.type,
        sensorUnit: p.sensor.unit,
        sensorStatus: p.sensor.status,
        x: Number(p.x),
        y: Number(p.y),
        rotation: p.rotation,
      })),
    };
  }

  async updateSensorPlacements(
    floorPlanId: string,
    placements: Array<{ sensorId: string; x: number; y: number; rotation: number }>
  ) {
    const plan = await prisma.floorPlan.findUnique({ where: { id: floorPlanId } });
    if (!plan) {
      throw Object.assign(new Error('Floor plan not found'), {
        statusCode: 404,
        code: 'FLOOR_PLAN_NOT_FOUND',
      });
    }

    // Upsert placements in a transaction
    await prisma.$transaction(async (tx) => {
      for (const p of placements) {
        await tx.sensorPlacement.upsert({
          where: {
            floorPlanId_sensorId: { floorPlanId, sensorId: p.sensorId },
          },
          create: {
            floorPlanId,
            sensorId: p.sensorId,
            x: p.x,
            y: p.y,
            rotation: p.rotation,
          },
          update: {
            x: p.x,
            y: p.y,
            rotation: p.rotation,
          },
        });
      }
    });

    return {
      floorPlanId,
      placementCount: placements.length,
    };
  }
}

export const spatialService = new SpatialService();

import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';

const SALT_ROUNDS = 12;

export class UsersService {
  async list(params: {
    page: number;
    limit: number;
    role?: string;
    buildingId?: string;
    search?: string;
  }) {
    const skip = (params.page - 1) * params.limit;

    const where: Prisma.UserWhereInput = {};

    if (params.role) {
      where.role = params.role as any;
    }
    if (params.buildingId) {
      where.buildingId = params.buildingId;
    }
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          buildingId: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        ...u,
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
      })),
      total,
    };
  }

  async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        buildingId: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw Object.assign(new Error('User not found'), {
        statusCode: 404,
        code: 'USER_NOT_FOUND',
      });
    }

    return {
      ...user,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async create(input: {
    email: string;
    name: string;
    password: string;
    role: string;
    buildingId?: string | null;
  }) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw Object.assign(new Error('Email already registered'), {
        statusCode: 409,
        code: 'EMAIL_EXISTS',
      });
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        role: input.role as any,
        buildingId: input.buildingId ?? null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        buildingId: true,
        isActive: true,
        createdAt: true,
      },
    });

    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async update(
    id: string,
    input: {
      email?: string;
      name?: string;
      role?: string;
      buildingId?: string | null;
    }
  ) {
    await this.getById(id); // throws if not found

    if (input.email) {
      const existing = await prisma.user.findFirst({
        where: { email: input.email, NOT: { id } },
      });
      if (existing) {
        throw Object.assign(new Error('Email already in use'), {
          statusCode: 409,
          code: 'EMAIL_EXISTS',
        });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(input.email && { email: input.email }),
        ...(input.name && { name: input.name }),
        ...(input.role && { role: input.role as any }),
        ...(input.buildingId !== undefined && { buildingId: input.buildingId }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        buildingId: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...user,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async updateStatus(id: string, isActive: boolean) {
    await this.getById(id); // throws if not found

    const user = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    return user;
  }
}

export const usersService = new UsersService();

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { config } from '../../config';
import { logger } from '../../config/logger';
import { LoginInput, RegisterInput } from './auth.validation';
import { JwtPayload } from '../../middleware/auth';

const SALT_ROUNDS = 12;

export class AuthService {
  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user || !user.isActive) {
      throw Object.assign(new Error('Invalid email or password'), {
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw Object.assign(new Error('Invalid email or password'), {
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        buildingId: user.buildingId,
        isActive: user.isActive,
        lastLoginAt: new Date().toISOString(),
        createdAt: user.createdAt.toISOString(),
      },
      accessToken,
      refreshToken,
    };
  }

  async register(input: RegisterInput) {
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
        role: input.role,
        buildingId: input.buildingId ?? null,
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      buildingId: user.buildingId,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async refresh(refreshTokenValue: string) {
    const tokenHash = this.hashToken(refreshTokenValue);

    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken || !storedToken.user.isActive) {
      throw Object.assign(new Error('Invalid or expired refresh token'), {
        statusCode: 401,
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    const accessToken = this.generateAccessToken(storedToken.user);
    return { accessToken };
  }

  async logout(refreshTokenValue: string) {
    const tokenHash = this.hashToken(refreshTokenValue);

    await prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
    };
  }

  private generateAccessToken(user: {
    id: string;
    email: string;
    role: string;
    buildingId: string | null;
  }): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      buildingId: user.buildingId ?? undefined,
    };

    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_ACCESS_EXPIRY,
      subject: user.id,
    } as jwt.SignOptions);
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(token);

    // Parse refresh expiry to milliseconds
    const expiryMs = this.parseExpiry(config.JWT_REFRESH_EXPIRY);

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + expiryMs),
      },
    });

    return token;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days

    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * (multipliers[unit] || 24 * 60 * 60 * 1000);
  }
}

export const authService = new AuthService();

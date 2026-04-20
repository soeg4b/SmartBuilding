import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Must mock before importing auth service
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  refreshToken: {
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
};

vi.mock('@backend/config/database', () => ({
  prisma: mockPrisma,
}));

vi.mock('@backend/config', () => ({
  config: {
    JWT_SECRET: 'test-jwt-secret-that-is-at-least-32-chars-long!!',
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    NODE_ENV: 'test',
  },
}));

vi.mock('@backend/config/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { AuthService } from '@backend/modules/auth/auth.service';

describe('AuthService', () => {
  let authService: AuthService;

  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'admin@smartbuilding.com',
    name: 'Admin User',
    passwordHash: '$2a$12$mockhashedpassword',
    role: 'sys_admin',
    buildingId: '550e8400-e29b-41d4-a716-446655440099',
    isActive: true,
    lastLoginAt: new Date('2026-04-10T10:00:00Z'),
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    authService = new AuthService();
    vi.clearAllMocks();
  });

  // =========================================================================
  // login()
  // =========================================================================
  describe('login()', () => {
    it('UT-AUTH-01: should return user + tokens on valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      vi.spyOn(bcrypt, 'compare').mockImplementation(async () => true);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, lastLoginAt: new Date() });
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      const result = await authService.login({ email: 'admin@smartbuilding.com', password: 'ValidPass123!' });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('admin@smartbuilding.com');
      expect(result.user.role).toBe('sys_admin');
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('UT-AUTH-02: should throw INVALID_CREDENTIALS on wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      vi.spyOn(bcrypt, 'compare').mockImplementation(async () => false);

      await expect(authService.login({ email: 'admin@smartbuilding.com', password: 'WrongPass!' }))
        .rejects.toMatchObject({
          statusCode: 401,
          code: 'INVALID_CREDENTIALS',
        });
    });

    it('UT-AUTH-03: should throw INVALID_CREDENTIALS on nonexistent email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.login({ email: 'nobody@example.com', password: 'SomePass123!' }))
        .rejects.toMatchObject({
          statusCode: 401,
          code: 'INVALID_CREDENTIALS',
        });
    });

    it('UT-AUTH-04: should throw INVALID_CREDENTIALS on inactive user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(authService.login({ email: 'admin@smartbuilding.com', password: 'ValidPass123!' }))
        .rejects.toMatchObject({
          statusCode: 401,
          code: 'INVALID_CREDENTIALS',
        });
    });

    it('should update lastLoginAt on successful login', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      vi.spyOn(bcrypt, 'compare').mockImplementation(async () => true);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      await authService.login({ email: 'admin@smartbuilding.com', password: 'ValidPass123!' });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({ lastLoginAt: expect.any(Date) }),
        })
      );
    });

    it('should generate a valid JWT access token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      vi.spyOn(bcrypt, 'compare').mockImplementation(async () => true);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      const result = await authService.login({ email: 'admin@smartbuilding.com', password: 'ValidPass123!' });

      const decoded = jwt.verify(result.accessToken, 'test-jwt-secret-that-is-at-least-32-chars-long!!') as any;
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
    });
  });

  // =========================================================================
  // register()
  // =========================================================================
  describe('register()', () => {
    const registerInput = {
      email: 'newuser@smartbuilding.com',
      name: 'New User',
      password: 'SecurePass123!',
      role: 'technician' as const,
      buildingId: '550e8400-e29b-41d4-a716-446655440099',
    };

    it('UT-AUTH-05: should create a new user with hashed password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const createdUser = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        email: registerInput.email,
        name: registerInput.name,
        role: registerInput.role,
        buildingId: registerInput.buildingId,
        isActive: true,
        createdAt: new Date('2026-04-15T00:00:00Z'),
      };
      mockPrisma.user.create.mockResolvedValue(createdUser);

      const result = await authService.register(registerInput);

      expect(result).toHaveProperty('id');
      expect(result.email).toBe(registerInput.email);
      expect(result.name).toBe(registerInput.name);
      expect(result.role).toBe(registerInput.role);
    });

    it('UT-AUTH-06: should throw EMAIL_EXISTS for duplicate email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(authService.register(registerInput))
        .rejects.toMatchObject({
          statusCode: 409,
          code: 'EMAIL_EXISTS',
        });
    });

    it('UT-AUTH-11: should hash password with bcrypt', async () => {
      const hashSpy = vi.spyOn(bcrypt, 'hash').mockImplementation(async () => '$2a$12$hashed');
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-id',
        email: registerInput.email,
        name: registerInput.name,
        role: registerInput.role,
        buildingId: registerInput.buildingId,
        isActive: true,
        createdAt: new Date(),
      });

      await authService.register(registerInput);

      expect(hashSpy).toHaveBeenCalledWith(registerInput.password, 12);
    });

    it('should handle nullable buildingId', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-id',
        email: registerInput.email,
        name: registerInput.name,
        role: registerInput.role,
        buildingId: null,
        isActive: true,
        createdAt: new Date(),
      });

      const result = await authService.register({ ...registerInput, buildingId: null });

      expect(result.buildingId).toBeNull();
    });
  });

  // =========================================================================
  // refresh()
  // =========================================================================
  describe('refresh()', () => {
    const fakeToken = crypto.randomBytes(64).toString('hex');

    it('UT-AUTH-07: should return new access token with valid refresh token', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue({
        id: 'rt-1',
        tokenHash: 'hash',
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
        user: mockUser,
      });

      const result = await authService.refresh(fakeToken);

      expect(result).toHaveProperty('accessToken');
      expect(typeof result.accessToken).toBe('string');
    });

    it('UT-AUTH-08: should throw INVALID_REFRESH_TOKEN when token not found', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue(null);

      await expect(authService.refresh('expired-or-invalid-token'))
        .rejects.toMatchObject({
          statusCode: 401,
          code: 'INVALID_REFRESH_TOKEN',
        });
    });

    it('UT-AUTH-09: should throw when user is inactive', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue({
        id: 'rt-1',
        tokenHash: 'hash',
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
        user: { ...mockUser, isActive: false },
      });

      await expect(authService.refresh(fakeToken))
        .rejects.toMatchObject({
          statusCode: 401,
          code: 'INVALID_REFRESH_TOKEN',
        });
    });
  });

  // =========================================================================
  // logout()
  // =========================================================================
  describe('logout()', () => {
    it('UT-AUTH-10: should revoke refresh token', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await authService.logout('some-refresh-token');

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        })
      );
    });
  });

  // =========================================================================
  // getProfile()
  // =========================================================================
  describe('getProfile()', () => {
    it('should return user profile', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.getProfile(mockUser.id);

      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(typeof result.createdAt).toBe('string');
    });

    it('should throw USER_NOT_FOUND for invalid userId', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.getProfile('nonexistent-id'))
        .rejects.toMatchObject({
          statusCode: 404,
          code: 'USER_NOT_FOUND',
        });
    });
  });
});

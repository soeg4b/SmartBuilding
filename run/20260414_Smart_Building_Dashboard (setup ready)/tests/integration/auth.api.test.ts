import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

// ============================================================================
// Mock Setup
// ============================================================================

const JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-chars-long!!';

const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  email: 'admin@smartbuilding.com',
  name: 'Admin User',
  passwordHash: '$2a$12$LJ3m4yS6kmIV0ePSQqzOHeTWXUJZfRCzXb2hmXxZpDL.6JmH6EKJW',
  role: 'sys_admin',
  buildingId: '550e8400-e29b-41d4-a716-446655440099',
  isActive: true,
  lastLoginAt: new Date('2026-04-10T10:00:00Z'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

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
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
}));

vi.mock('@backend/config', () => ({
  config: {
    JWT_SECRET,
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    NODE_ENV: 'test',
    FRONTEND_URL: 'http://localhost:3000',
    RATE_LIMIT_WINDOW_MS: 900000,
    RATE_LIMIT_MAX_REQUESTS: 1000,
    RATE_LIMIT_AUTH_MAX: 50,
    UPLOAD_DIR: './uploads',
    SOCKETIO_CORS_ORIGIN: 'http://localhost:3000',
  },
}));

vi.mock('@backend/config/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@backend/config/redis', () => {
  const mockPipeline = {
    zremrangebyscore: vi.fn().mockReturnThis(),
    zadd: vi.fn().mockReturnThis(),
    zcard: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([
      [null, 0], [null, 1], [null, 1], [null, 1],
    ]),
  };
  return {
    getRedisClient: vi.fn(() => ({
      pipeline: vi.fn(() => mockPipeline),
    })),
    connectRedis: vi.fn(),
    disconnectRedis: vi.fn(),
  };
});

vi.mock('@backend/config/mqtt', () => ({
  getMqttClient: vi.fn(),
  subscribeMqttTopics: vi.fn(),
  disconnectMqtt: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn().mockResolvedValue('$2a$12$hashed'),
  },
}));

import authRoutes from '@backend/modules/auth/auth.routes';
import { errorHandler } from '@backend/middleware/errorHandler';
import { rateLimiter } from '@backend/middleware/rateLimiter';
import bcrypt from 'bcryptjs';

// ============================================================================
// App Setup
// ============================================================================

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(rateLimiter({ maxRequests: 1000 }));
  app.use('/api/v1/auth', authRoutes);
  app.use(errorHandler);
  return app;
}

describe('Auth API Integration Tests', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to generate a valid JWT
  function generateToken(payload: object = {}, opts: object = {}) {
    return jwt.sign(
      { userId: mockUser.id, email: mockUser.email, role: mockUser.role, ...payload },
      JWT_SECRET,
      { expiresIn: '15m', subject: mockUser.id, ...opts }
    );
  }

  // =========================================================================
  // POST /api/v1/auth/login
  // =========================================================================
  describe('POST /api/v1/auth/login', () => {
    it('IT-AUTH-01: should return 200 with user + accessToken on valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@smartbuilding.com', password: 'ValidPass123!' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.user.email).toBe('admin@smartbuilding.com');
      // Verify httpOnly refresh token cookie is set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.includes('refreshToken'))).toBe(true);
    });

    it('IT-AUTH-02: should return 401 on wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@smartbuilding.com', password: 'WrongPass!' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('IT-AUTH-03: should return 401 on nonexistent email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'SomePass123!' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('IT-AUTH-04: should return 401 on inactive user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@smartbuilding.com', password: 'ValidPass123!' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('IT-AUTH-05: should return 400 on missing email field', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ password: 'SomePass123!' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 on invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: 'SomePass123!' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 on empty password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@smartbuilding.com', password: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // =========================================================================
  // POST /api/v1/auth/refresh
  // =========================================================================
  describe('POST /api/v1/auth/refresh', () => {
    it('IT-AUTH-06: should return new accessToken with valid refresh cookie', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue({
        id: 'rt-1',
        tokenHash: 'hash',
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
        user: mockUser,
      });

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'refreshToken=valid-refresh-token');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('IT-AUTH-07: should return 401 on missing refresh cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('NO_REFRESH_TOKEN');
    });

    it('should return 401 on invalid refresh token', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'refreshToken=invalid-token');

      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // POST /api/v1/auth/logout
  // =========================================================================
  describe('POST /api/v1/auth/logout', () => {
    it('IT-AUTH-08: should return 204 for authenticated user', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      const token = generateToken();

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .set('Cookie', 'refreshToken=some-token');

      expect(res.status).toBe(204);
    });

    it('IT-AUTH-09: should return 401 with no auth header', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout');

      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // GET /api/v1/auth/me
  // =========================================================================
  describe('GET /api/v1/auth/me', () => {
    it('IT-AUTH-10: should return user profile with valid token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const token = generateToken();

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('email', 'admin@smartbuilding.com');
      expect(res.body.data).toHaveProperty('role', 'sys_admin');
    });

    it('IT-AUTH-11: should return 401 with expired token', async () => {
      const token = jwt.sign(
        { userId: mockUser.id, email: mockUser.email, role: mockUser.role },
        JWT_SECRET,
        { expiresIn: '-1s', subject: mockUser.id }
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should return 401 without auth header', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // POST /api/v1/auth/register
  // =========================================================================
  describe('POST /api/v1/auth/register', () => {
    const registerBody = {
      email: 'newuser@smartbuilding.com',
      name: 'New User',
      password: 'SecurePass123!',
      role: 'technician',
    };

    it('IT-AUTH-14: should return 201 for authenticated sys_admin', async () => {
      const token = generateToken({ role: 'sys_admin' });
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser); // authenticate check
      mockPrisma.user.findUnique.mockResolvedValueOnce(null); // email check
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        ...registerBody,
        isActive: true,
        buildingId: null,
        createdAt: new Date(),
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${token}`)
        .send(registerBody);

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('email', 'newuser@smartbuilding.com');
    });

    it('IT-AUTH-12: should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(registerBody);

      expect(res.status).toBe(401);
    });

    it('IT-AUTH-13: should return 403 for non-admin role', async () => {
      const token = generateToken({ role: 'technician' });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${token}`)
        .send(registerBody);

      expect(res.status).toBe(403);
    });

    it('IT-AUTH-15: should return 409 for duplicate email', async () => {
      const token = generateToken({ role: 'sys_admin' });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser); // email already exists

      const res = await request(app)
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${token}`)
        .send(registerBody);

      expect(res.status).toBe(409);
    });
  });
});

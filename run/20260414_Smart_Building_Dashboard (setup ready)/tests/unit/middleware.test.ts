import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@backend/config', () => ({
  config: {
    JWT_SECRET: 'test-jwt-secret-that-is-at-least-32-chars-long!!',
    NODE_ENV: 'test',
    RATE_LIMIT_WINDOW_MS: 900000,
    RATE_LIMIT_MAX_REQUESTS: 100,
    RATE_LIMIT_AUTH_MAX: 5,
  },
}));

vi.mock('@backend/config/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const mockPipeline = {
  zremrangebyscore: vi.fn().mockReturnThis(),
  zadd: vi.fn().mockReturnThis(),
  zcard: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  exec: vi.fn(),
};

vi.mock('@backend/config/redis', () => ({
  getRedisClient: vi.fn(() => ({
    pipeline: vi.fn(() => mockPipeline),
  })),
}));

import { authenticate, JwtPayload } from '@backend/middleware/auth';
import { requireRole } from '@backend/middleware/rbac';
import { validate } from '@backend/middleware/validate';
import { rateLimiter } from '@backend/middleware/rateLimiter';
import { errorHandler, createAppError } from '@backend/middleware/errorHandler';

// ============================================================================
// Helpers
// ============================================================================

function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    body: {},
    query: {},
    params: {},
    cookies: {},
    ip: '127.0.0.1',
    method: 'GET',
    path: '/test',
    ...overrides,
  } as unknown as Request;
}

function createMockResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

// ============================================================================
// authenticate middleware
// ============================================================================

describe('authenticate middleware', () => {
  const JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-chars-long!!';

  it('UT-MW-01: should populate req.user with valid JWT', () => {
    const payload: JwtPayload = {
      userId: 'user-1',
      email: 'admin@test.com',
      role: 'sys_admin',
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m', subject: 'user-1' });

    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockResponse();
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user!.userId).toBe('user-1');
    expect(req.user!.email).toBe('admin@test.com');
    expect(req.user!.role).toBe('sys_admin');
  });

  it('UT-MW-02: should reject when Authorization header is missing', () => {
    const req = createMockRequest({ headers: {} });
    const res = createMockResponse();
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
      })
    );
  });

  it('UT-MW-03: should reject expired JWT with TOKEN_EXPIRED', () => {
    const payload: JwtPayload = { userId: 'user-1', email: 'a@b.com', role: 'sys_admin' };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '-1s', subject: 'user-1' });

    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockResponse();
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'TOKEN_EXPIRED' }),
      })
    );
  });

  it('UT-MW-04: should reject malformed JWT with INVALID_TOKEN', () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer not-a-valid-token' },
    });
    const res = createMockResponse();
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'INVALID_TOKEN' }),
      })
    );
  });

  it('should reject when Authorization header does not start with Bearer', () => {
    const req = createMockRequest({
      headers: { authorization: 'Basic some-token' },
    });
    const res = createMockResponse();
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// ============================================================================
// requireRole middleware
// ============================================================================

describe('requireRole middleware', () => {
  it('UT-MW-05: should pass for matching role (sys_admin)', () => {
    const req = createMockRequest();
    req.user = { userId: 'u1', email: 'a@b.com', role: 'sys_admin' };
    const res = createMockResponse();
    const next = vi.fn();

    requireRole('sys_admin')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('UT-MW-06: should reject non-matching role with 403', () => {
    const req = createMockRequest();
    req.user = { userId: 'u1', email: 'a@b.com', role: 'technician' };
    const res = createMockResponse();
    const next = vi.fn();

    requireRole('sys_admin')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'FORBIDDEN' }),
      })
    );
  });

  it('UT-MW-07: should reject unauthenticated request with 401', () => {
    const req = createMockRequest();
    // req.user is undefined
    const res = createMockResponse();
    const next = vi.fn();

    requireRole('sys_admin')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should accept multiple allowed roles', () => {
    const req = createMockRequest();
    req.user = { userId: 'u1', email: 'a@b.com', role: 'technician' };
    const res = createMockResponse();
    const next = vi.fn();

    requireRole('sys_admin', 'technician')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should reject if role not in allowed list of multiple roles', () => {
    const req = createMockRequest();
    req.user = { userId: 'u1', email: 'a@b.com', role: 'financial_decision_maker' };
    const res = createMockResponse();
    const next = vi.fn();

    requireRole('sys_admin', 'technician')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ============================================================================
// validate middleware
// ============================================================================

describe('validate middleware', () => {
  it('UT-MW-08: should return 400 on invalid body', () => {
    const { z } = require('zod');
    const schema = z.object({ email: z.string().email() });

    const req = createMockRequest({ body: { email: 'not-an-email' } });
    const res = createMockResponse();
    const next = vi.fn();

    validate({ body: schema })(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'VALIDATION_ERROR' }),
      })
    );
  });

  it('UT-MW-09: should replace req.body with parsed data', () => {
    const { z } = require('zod');
    const schema = z.object({
      name: z.string().trim(),
      age: z.coerce.number(),
    });

    const req = createMockRequest({ body: { name: '  Alice  ', age: '25' } });
    const res = createMockResponse();
    const next = vi.fn();

    validate({ body: schema })(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.name).toBe('Alice');
    expect(req.body.age).toBe(25);
  });

  it('should validate query params', () => {
    const { z } = require('zod');
    const schema = z.object({
      page: z.coerce.number().int().positive(),
    });

    const req = createMockRequest({ query: { page: '3' } as any });
    const res = createMockResponse();
    const next = vi.fn();

    validate({ query: schema })(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).query.page).toBe(3);
  });

  it('should validate params', () => {
    const { z } = require('zod');
    const schema = z.object({ id: z.string().uuid() });

    const req = createMockRequest({ params: { id: 'not-a-uuid' } });
    const res = createMockResponse();
    const next = vi.fn();

    validate({ params: schema })(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should combine errors from body and params', () => {
    const { z } = require('zod');
    const bodySchema = z.object({ name: z.string().min(1) });
    const paramsSchema = z.object({ id: z.string().uuid() });

    const req = createMockRequest({
      body: { name: '' },
      params: { id: 'bad' },
    });
    const res = createMockResponse();
    const next = vi.fn();

    validate({ body: bodySchema, params: paramsSchema })(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    const responseBody = (res.json as any).mock.calls[0][0];
    expect(responseBody.error.details.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================================
// errorHandler middleware
// ============================================================================

describe('errorHandler middleware', () => {
  it('UT-MW-10: should return 500 with masked message in production', () => {
    // Temporarily override NODE_ENV
    const origConfig = require('@backend/config').config;
    const origEnv = origConfig.NODE_ENV;
    origConfig.NODE_ENV = 'production';

    const err = new Error('Sensitive DB error') as any;
    // No statusCode set → defaults to 500
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'An unexpected error occurred',
        }),
      })
    );

    origConfig.NODE_ENV = origEnv;
  });

  it('UT-MW-11: should return detailed message in non-production', () => {
    const err = createAppError(400, 'BAD_REQUEST', 'Invalid input data');
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'BAD_REQUEST',
          message: 'Invalid input data',
        }),
      })
    );
  });
});

// ============================================================================
// rateLimiter middleware
// ============================================================================

describe('rateLimiter middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('UT-MW-12: should block after max requests exceeded', async () => {
    // Simulate request count > max
    mockPipeline.exec.mockResolvedValue([
      [null, 0],
      [null, 1],
      [null, 101], // requestCount = 101 > 100
      [null, 1],
    ]);

    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn();

    const middleware = rateLimiter({ maxRequests: 100 });
    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: 'RATE_LIMIT_EXCEEDED' }),
      })
    );
  });

  it('UT-MW-13: should set X-RateLimit headers', async () => {
    mockPipeline.exec.mockResolvedValue([
      [null, 0],
      [null, 1],
      [null, 5], // requestCount = 5
      [null, 1],
    ]);

    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn();

    const middleware = rateLimiter({ maxRequests: 100 });
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 95);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
  });

  it('should allow request through when Redis pipeline returns null (fail-open)', async () => {
    mockPipeline.exec.mockResolvedValue(null);

    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn();

    const middleware = rateLimiter();
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should allow request through when Redis throws (fail-open)', async () => {
    mockPipeline.exec.mockRejectedValue(new Error('Redis connection lost'));

    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn();

    const middleware = rateLimiter();
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should set Retry-After header when rate limited', async () => {
    mockPipeline.exec.mockResolvedValue([
      [null, 0],
      [null, 1],
      [null, 101],
      [null, 1],
    ]);

    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn();

    const middleware = rateLimiter({ maxRequests: 100, windowMs: 60000 });
    await middleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', 60);
  });
});

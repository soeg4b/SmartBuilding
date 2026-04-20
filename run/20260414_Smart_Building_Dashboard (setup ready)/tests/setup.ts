import { vi } from 'vitest';

// Set test environment variables before any module loads
process.env.NODE_ENV = 'test';
process.env.PORT = '4001';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/smart_building_test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-chars-long!!';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
process.env.RATE_LIMIT_AUTH_MAX = '5';
process.env.LOG_LEVEL = 'error';
process.env.LOG_FORMAT = 'json';

// Mock Prisma globally
vi.mock('@backend/config/database', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      refreshToken: {
        findFirst: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      sensor: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      sensorReading: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      equipment: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      alertRule: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      alert: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      notification: {
        findMany: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
      building: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      floor: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      zone: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      $queryRaw: vi.fn(),
      $connect: vi.fn(),
      $disconnect: vi.fn(),
    },
    connectDatabase: vi.fn(),
    disconnectDatabase: vi.fn(),
  };
});

// Mock Redis
vi.mock('@backend/config/redis', () => {
  const mockPipeline = {
    zremrangebyscore: vi.fn().mockReturnThis(),
    zadd: vi.fn().mockReturnThis(),
    zcard: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([
      [null, 0],
      [null, 1],
      [null, 1],
      [null, 1],
    ]),
  };

  return {
    getRedisClient: vi.fn(() => ({
      pipeline: vi.fn(() => mockPipeline),
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    })),
    connectRedis: vi.fn(),
    disconnectRedis: vi.fn(),
  };
});

// Mock logger
vi.mock('@backend/config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock MQTT
vi.mock('@backend/config/mqtt', () => ({
  getMqttClient: vi.fn(),
  subscribeMqttTopics: vi.fn(),
  disconnectMqtt: vi.fn(),
}));

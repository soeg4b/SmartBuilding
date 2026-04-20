import Redis from 'ioredis';
import { config } from './index';
import { logger } from './logger';

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 10) {
          logger.error('Redis: max retries reached, giving up');
          return null;
        }
        const delay = Math.min(times * 200, 5000);
        logger.warn(`Redis: retrying connection in ${delay}ms (attempt ${times})`);
        return delay;
      },
      lazyConnect: true,
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
    });

    redis.on('error', (err) => {
      logger.error('Redis connection error', { error: err.message });
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }

  return redis;
}

export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  try {
    await client.connect();
  } catch (error) {
    logger.error('Failed to connect to Redis', { error });
    throw error;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Redis disconnected');
  }
}

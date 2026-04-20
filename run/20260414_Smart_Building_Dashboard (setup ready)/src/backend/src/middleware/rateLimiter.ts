import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../config/redis';
import { config } from '../config';
import { sendError } from '../utils/apiResponse';
import { logger } from '../config/logger';

interface RateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
  keyPrefix?: string;
  keyGenerator?: (req: Request) => string;
}

/**
 * Redis-backed rate limiter middleware factory.
 * Uses a sliding window counter approach.
 */
export function rateLimiter(options: RateLimiterOptions = {}) {
  const {
    windowMs = config.RATE_LIMIT_WINDOW_MS,
    maxRequests = config.RATE_LIMIT_MAX_REQUESTS,
    keyPrefix = 'rl:',
    keyGenerator = defaultKeyGenerator,
  } = options;

  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const redis = getRedisClient();
      const key = `${keyPrefix}${keyGenerator(req)}`;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Use Redis sorted set for sliding window
      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zadd(key, now.toString(), `${now}:${Math.random()}`);
      pipeline.zcard(key);
      pipeline.expire(key, windowSeconds);

      const results = await pipeline.exec();

      if (!results) {
        logger.warn('Rate limiter: Redis pipeline returned null, allowing request through');
        next();
        return;
      }

      const requestCount = results[2]?.[1] as number;

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - requestCount));
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));

      if (requestCount > maxRequests) {
        const retryAfter = Math.ceil(windowMs / 1000);
        res.setHeader('Retry-After', retryAfter);
        sendError(res, 429, 'RATE_LIMIT_EXCEEDED', 'Too many requests, please try again later');
        return;
      }

      next();
    } catch (error) {
      // If Redis is down, allow the request through (fail-open)
      logger.warn('Rate limiter Redis error, allowing request', { error });
      next();
    }
  };
}

function defaultKeyGenerator(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip;
  return `${req.method}:${req.path}:${ip}`;
}

/**
 * Stricter rate limiter for auth endpoints.
 */
export const authRateLimiter = rateLimiter({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  maxRequests: config.RATE_LIMIT_AUTH_MAX,
  keyPrefix: 'rl:auth:',
});

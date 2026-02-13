import type { Request, Response, NextFunction } from 'express';
import { redis } from '../../config/redis.js';
import { logger } from '../utils/logger.js';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix?: string; // Redis key prefix
  skipFailedRequests?: boolean; // Don't count failed requests
  message?: string; // Custom error message
}

interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}

/**
 * Redis-based rate limiter middleware
 * Uses sliding window algorithm for accurate rate limiting
 */
export function rateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyPrefix = 'ratelimit',
    skipFailedRequests = false,
    message = 'Too many requests, please try again later',
  } = config;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Determine the key for rate limiting
    const identifier = getIdentifier(req);
    const key = `${keyPrefix}:${identifier}`;

    try {
      const now = Date.now();
      const windowStart = now - windowMs;

      // Use Redis transaction for atomic operations
      const multi = redis.multi();

      // Remove old entries outside the window
      multi.zremrangebyscore(key, 0, windowStart);

      // Count current requests in window
      multi.zcard(key);

      // Add current request
      multi.zadd(key, now, `${now}-${Math.random()}`);

      // Set expiry on the key
      multi.expire(key, Math.ceil(windowMs / 1000));

      const results = await multi.exec();

      if (!results) {
        // Redis transaction failed, allow request
        logger.warn('Rate limiter: Redis transaction failed');
        next();
        return;
      }

      const currentCount = (results[1]?.[1] as number) || 0;

      // Calculate rate limit info
      const rateLimitInfo: RateLimitInfo = {
        limit: maxRequests,
        current: currentCount + 1,
        remaining: Math.max(0, maxRequests - currentCount - 1),
        resetTime: new Date(now + windowMs),
      };

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', rateLimitInfo.limit);
      res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitInfo.resetTime.getTime() / 1000));

      // Check if rate limit exceeded
      if (currentCount >= maxRequests) {
        const retryAfter = Math.ceil(windowMs / 1000);
        res.setHeader('Retry-After', retryAfter);

        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message,
            retryAfter,
          },
        });
        return;
      }

      // If skipFailedRequests is enabled, remove the request on error
      if (skipFailedRequests) {
        res.on('finish', async () => {
          if (res.statusCode >= 400) {
            try {
              // Remove the last added entry
              await redis.zremrangebyscore(key, now, now);
            } catch {
              // Ignore cleanup errors
            }
          }
        });
      }

      next();
    } catch (error) {
      // On Redis error, allow request but log warning
      logger.warn({ error }, 'Rate limiter: Redis error, allowing request');
      next();
    }
  };
}

/**
 * Get identifier for rate limiting
 * Uses API key tenant ID if available, otherwise IP address
 */
function getIdentifier(req: Request): string {
  // If authenticated with API key, use tenant ID
  if (req.apiKey?.tenantId) {
    return `tenant:${req.apiKey.tenantId}`;
  }

  // If authenticated user, use user ID from auth middleware
  const user = (req as Request & { user?: { id: string } }).user;
  if (user?.id) {
    return `user:${user.id}`;
  }

  // Fall back to IP address
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return `ip:${ip}`;
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  // General API: 100 requests per minute
  api: rateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100,
    keyPrefix: 'rl:api',
  }),

  // Auth endpoints: 10 requests per minute
  auth: rateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'rl:auth',
    message: 'Too many authentication attempts, please try again later',
  }),

  // Public API: 60 requests per minute (per tenant)
  publicApi: rateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 60,
    keyPrefix: 'rl:public',
  }),

  // Webhooks: 1000 requests per minute
  webhooks: rateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 1000,
    keyPrefix: 'rl:webhooks',
  }),

  // File uploads: 10 per minute
  uploads: rateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'rl:uploads',
    message: 'Too many file uploads, please try again later',
  }),

  // AI requests: 30 per minute
  ai: rateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30,
    keyPrefix: 'rl:ai',
    message: 'AI rate limit exceeded, please try again later',
  }),
};

/**
 * Daily quota limiter for API keys
 */
export function dailyQuotaLimiter(maxDaily: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.apiKey?.tenantId) {
      next();
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const key = `quota:daily:${req.apiKey.tenantId}:${today}`;

    try {
      const current = await redis.incr(key);

      // Set expiry to end of day (24 hours from first request)
      if (current === 1) {
        await redis.expire(key, 86400);
      }

      res.setHeader('X-DailyQuota-Limit', maxDaily);
      res.setHeader('X-DailyQuota-Remaining', Math.max(0, maxDaily - current));

      if (current > maxDaily) {
        res.status(429).json({
          success: false,
          error: {
            code: 'DAILY_QUOTA_EXCEEDED',
            message: 'Daily API quota exceeded. Quota resets at midnight UTC.',
            limit: maxDaily,
            used: current,
          },
        });
        return;
      }

      next();
    } catch (error) {
      logger.warn({ error }, 'Daily quota limiter: Redis error');
      next();
    }
  };
}

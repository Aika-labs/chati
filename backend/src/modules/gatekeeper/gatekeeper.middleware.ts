import type { Request, Response, NextFunction } from 'express';
import { rateLimiter } from './rate-limiter.js';
import { ddosProtection } from './ddos-protection.js';
import { tenantGuard } from './tenant-guard.js';
import { RateLimitError, AppError } from '../../shared/middleware/error.handler.js';
import { createModuleLogger } from '../../shared/utils/logger.js';

const logger = createModuleLogger('gatekeeper');

/**
 * DDoS protection middleware for all routes
 */
export async function ddosMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const result = await ddosProtection.checkIP(ip);

    if (!result.allowed) {
      res.set('Retry-After', String(result.retryAfter ?? 300));
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: result.reason ?? 'Too many requests',
        },
      });
      return;
    }

    next();
  } catch (error) {
    logger.error({ error }, 'DDoS middleware error');
    next(); // Fail open to not block legitimate traffic
  }
}

/**
 * API rate limiting middleware (per tenant)
 */
export async function apiRateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.context?.tenantId) {
      next();
      return;
    }

    const result = await rateLimiter.checkApiRequestLimit(req.context.tenantId);

    // Add rate limit headers
    res.set('X-RateLimit-Limit', String(result.limit));
    res.set('X-RateLimit-Remaining', String(result.remaining));
    res.set('X-RateLimit-Reset', result.resetAt.toISOString());

    if (!result.allowed) {
      res.set('Retry-After', '60');
      throw new RateLimitError('API rate limit exceeded');
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Outbound message rate limiting middleware
 */
export async function outboundMessageRateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.context?.tenantId) {
      next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
      return;
    }

    const result = await rateLimiter.checkOutboundMessageLimit(req.context.tenantId);

    // Add rate limit headers
    res.set('X-RateLimit-Limit', String(result.limit));
    res.set('X-RateLimit-Remaining', String(result.remaining));
    res.set('X-RateLimit-Reset', result.resetAt.toISOString());

    if (!result.allowed) {
      const secondsUntilReset = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000);
      res.set('Retry-After', String(secondsUntilReset));
      throw new RateLimitError(
        `Daily message limit (${result.limit}) exceeded. Resets at midnight.`
      );
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Tenant status check middleware
 */
export async function tenantStatusMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.context?.tenantId) {
      next();
      return;
    }

    await tenantGuard.requireActiveTenant(req.context.tenantId);
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Webhook-specific DDoS protection
 */
export async function webhookDDoSMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check overall webhook rate
    const webhookResult = await ddosProtection.checkWebhookRate();
    if (!webhookResult.allowed) {
      logger.error('Webhook DDoS protection triggered');
      res.status(429).json({ success: false });
      return;
    }

    // Check IP
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const ipResult = await ddosProtection.checkIP(ip);
    if (!ipResult.allowed) {
      res.status(429).json({ success: false });
      return;
    }

    next();
  } catch (error) {
    logger.error({ error }, 'Webhook DDoS middleware error');
    next(); // Fail open
  }
}

/**
 * Combined gatekeeper middleware for protected routes
 */
export function gatekeeperMiddleware() {
  return [
    ddosMiddleware,
    apiRateLimitMiddleware,
    tenantStatusMiddleware,
  ];
}

/**
 * Message sending gatekeeper (includes outbound rate limit)
 */
export function messageSendingGatekeeper() {
  return [
    ddosMiddleware,
    apiRateLimitMiddleware,
    tenantStatusMiddleware,
    outboundMessageRateLimitMiddleware,
  ];
}

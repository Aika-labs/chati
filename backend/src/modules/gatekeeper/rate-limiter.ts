import { redis } from '../../config/redis.js';
import { prisma } from '../../config/database.js';
import { RateLimitError } from '../../shared/middleware/error.handler.js';
import { createModuleLogger } from '../../shared/utils/logger.js';
import { env } from '../../config/env.js';

const logger = createModuleLogger('rate-limiter');

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
}

export class RateLimiter {
  /**
   * Check outbound message rate limit (per tenant, per day)
   * Default: 250 messages/day
   */
  async checkOutboundMessageLimit(tenantId: string): Promise<RateLimitResult> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { maxOutboundMessagesPerDay: true },
    });

    const limit = tenant?.maxOutboundMessagesPerDay ?? env.RATE_LIMIT_OUTBOUND_MESSAGES_PER_DAY;
    const key = `ratelimit:outbound:${tenantId}:${this.getTodayKey()}`;

    const current = await redis.get(key);
    const count = current ? parseInt(current, 10) : 0;

    const resetAt = this.getEndOfDay();
    const remaining = Math.max(0, limit - count);

    if (count >= limit) {
      logger.warn({ tenantId, count, limit }, 'Outbound message rate limit exceeded');
      return { allowed: false, remaining: 0, limit, resetAt };
    }

    return { allowed: true, remaining, limit, resetAt };
  }

  /**
   * Increment outbound message counter
   */
  async incrementOutboundMessages(tenantId: string): Promise<void> {
    const key = `ratelimit:outbound:${tenantId}:${this.getTodayKey()}`;
    const ttl = this.getSecondsUntilMidnight();

    await redis.multi()
      .incr(key)
      .expire(key, ttl)
      .exec();

    // Also track in database for analytics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.usageRecord.upsert({
      where: {
        tenantId_type_date: {
          tenantId,
          type: 'OUTBOUND_MESSAGES',
          date: today,
        },
      },
      create: {
        tenantId,
        type: 'OUTBOUND_MESSAGES',
        date: today,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    });
  }

  /**
   * Check inbound message rate limit (per phone number, per minute)
   * Anti-spam/DDoS protection
   */
  async checkInboundMessageLimit(phoneNumber: string): Promise<RateLimitResult> {
    const limit = env.RATE_LIMIT_INBOUND_MESSAGES_PER_MINUTE;
    const key = `ratelimit:inbound:${phoneNumber}`;
    const windowSeconds = 60;

    const current = await redis.get(key);
    const count = current ? parseInt(current, 10) : 0;

    const resetAt = new Date(Date.now() + windowSeconds * 1000);
    const remaining = Math.max(0, limit - count);

    if (count >= limit) {
      logger.warn({ phoneNumber, count, limit }, 'Inbound message rate limit exceeded (potential spam)');
      return { allowed: false, remaining: 0, limit, resetAt };
    }

    return { allowed: true, remaining, limit, resetAt };
  }

  /**
   * Increment inbound message counter
   */
  async incrementInboundMessages(phoneNumber: string): Promise<void> {
    const key = `ratelimit:inbound:${phoneNumber}`;
    const windowSeconds = 60;

    await redis.multi()
      .incr(key)
      .expire(key, windowSeconds)
      .exec();
  }

  /**
   * Check API request rate limit (per tenant, per minute)
   */
  async checkApiRequestLimit(tenantId: string): Promise<RateLimitResult> {
    const limit = env.RATE_LIMIT_API_REQUESTS_PER_MINUTE;
    const key = `ratelimit:api:${tenantId}`;
    const windowSeconds = 60;

    const current = await redis.get(key);
    const count = current ? parseInt(current, 10) : 0;

    const resetAt = new Date(Date.now() + windowSeconds * 1000);
    const remaining = Math.max(0, limit - count);

    if (count >= limit) {
      logger.warn({ tenantId, count, limit }, 'API rate limit exceeded');
      return { allowed: false, remaining: 0, limit, resetAt };
    }

    // Increment counter
    await redis.multi()
      .incr(key)
      .expire(key, windowSeconds)
      .exec();

    return { allowed: true, remaining: remaining - 1, limit, resetAt };
  }

  /**
   * Get current usage for a tenant
   */
  async getUsageStats(tenantId: string): Promise<{
    outboundToday: number;
    outboundLimit: number;
    outboundRemaining: number;
    percentUsed: number;
  }> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { maxOutboundMessagesPerDay: true },
    });

    const limit = tenant?.maxOutboundMessagesPerDay ?? env.RATE_LIMIT_OUTBOUND_MESSAGES_PER_DAY;
    const key = `ratelimit:outbound:${tenantId}:${this.getTodayKey()}`;

    const current = await redis.get(key);
    const count = current ? parseInt(current, 10) : 0;

    return {
      outboundToday: count,
      outboundLimit: limit,
      outboundRemaining: Math.max(0, limit - count),
      percentUsed: Math.round((count / limit) * 100),
    };
  }

  /**
   * Check if tenant is approaching limit (for warnings)
   */
  async isApproachingLimit(tenantId: string, thresholdPercent = 80): Promise<boolean> {
    const stats = await this.getUsageStats(tenantId);
    return stats.percentUsed >= thresholdPercent;
  }

  private getTodayKey(): string {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }

  private getEndOfDay(): Date {
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
  }

  private getSecondsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.floor((midnight.getTime() - now.getTime()) / 1000);
  }
}

export const rateLimiter = new RateLimiter();

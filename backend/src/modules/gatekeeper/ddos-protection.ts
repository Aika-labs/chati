import { redis } from '../../config/redis.js';
import { createModuleLogger } from '../../shared/utils/logger.js';

const logger = createModuleLogger('ddos-protection');

export interface DDoSCheckResult {
  allowed: boolean;
  blocked: boolean;
  reason?: string;
  retryAfter?: number;
}

export class DDoSProtection {
  private readonly WINDOW_SIZE = 60; // 1 minute window
  private readonly BLOCK_DURATION = 300; // 5 minutes block

  // Thresholds
  private readonly MAX_REQUESTS_PER_IP = 100;
  private readonly MAX_REQUESTS_PER_PHONE = 50;
  private readonly MAX_WEBHOOK_REQUESTS = 200;

  /**
   * Check if IP is allowed
   */
  async checkIP(ip: string): Promise<DDoSCheckResult> {
    // Check if IP is blocked
    const blocked = await redis.get(`ddos:blocked:ip:${ip}`);
    if (blocked) {
      const ttl = await redis.ttl(`ddos:blocked:ip:${ip}`);
      return {
        allowed: false,
        blocked: true,
        reason: 'IP temporarily blocked due to excessive requests',
        retryAfter: ttl > 0 ? ttl : this.BLOCK_DURATION,
      };
    }

    // Check request count
    const key = `ddos:count:ip:${ip}`;
    const count = await redis.incr(key);
    
    if (count === 1) {
      await redis.expire(key, this.WINDOW_SIZE);
    }

    if (count > this.MAX_REQUESTS_PER_IP) {
      // Block the IP
      await redis.setex(`ddos:blocked:ip:${ip}`, this.BLOCK_DURATION, '1');
      logger.warn({ ip, count }, 'IP blocked due to excessive requests');
      
      return {
        allowed: false,
        blocked: true,
        reason: 'Too many requests',
        retryAfter: this.BLOCK_DURATION,
      };
    }

    return { allowed: true, blocked: false };
  }

  /**
   * Check if phone number is allowed (for webhook spam)
   */
  async checkPhoneNumber(phone: string): Promise<DDoSCheckResult> {
    // Check if phone is blocked
    const blocked = await redis.get(`ddos:blocked:phone:${phone}`);
    if (blocked) {
      const ttl = await redis.ttl(`ddos:blocked:phone:${phone}`);
      return {
        allowed: false,
        blocked: true,
        reason: 'Phone number temporarily blocked due to spam',
        retryAfter: ttl > 0 ? ttl : this.BLOCK_DURATION,
      };
    }

    // Check message count
    const key = `ddos:count:phone:${phone}`;
    const count = await redis.incr(key);
    
    if (count === 1) {
      await redis.expire(key, this.WINDOW_SIZE);
    }

    if (count > this.MAX_REQUESTS_PER_PHONE) {
      // Block the phone
      await redis.setex(`ddos:blocked:phone:${phone}`, this.BLOCK_DURATION, '1');
      logger.warn({ phone, count }, 'Phone blocked due to spam');
      
      return {
        allowed: false,
        blocked: true,
        reason: 'Too many messages from this number',
        retryAfter: this.BLOCK_DURATION,
      };
    }

    return { allowed: true, blocked: false };
  }

  /**
   * Check webhook endpoint rate
   */
  async checkWebhookRate(): Promise<DDoSCheckResult> {
    const key = 'ddos:count:webhook';
    const count = await redis.incr(key);
    
    if (count === 1) {
      await redis.expire(key, this.WINDOW_SIZE);
    }

    if (count > this.MAX_WEBHOOK_REQUESTS) {
      logger.error({ count }, 'Webhook rate limit exceeded - possible DDoS');
      
      return {
        allowed: false,
        blocked: false,
        reason: 'Webhook rate limit exceeded',
        retryAfter: this.WINDOW_SIZE,
      };
    }

    return { allowed: true, blocked: false };
  }

  /**
   * Manually block an IP
   */
  async blockIP(ip: string, durationSeconds?: number): Promise<void> {
    const duration = durationSeconds ?? this.BLOCK_DURATION;
    await redis.setex(`ddos:blocked:ip:${ip}`, duration, '1');
    logger.info({ ip, duration }, 'IP manually blocked');
  }

  /**
   * Manually unblock an IP
   */
  async unblockIP(ip: string): Promise<void> {
    await redis.del(`ddos:blocked:ip:${ip}`);
    logger.info({ ip }, 'IP unblocked');
  }

  /**
   * Manually block a phone number
   */
  async blockPhone(phone: string, durationSeconds?: number): Promise<void> {
    const duration = durationSeconds ?? this.BLOCK_DURATION;
    await redis.setex(`ddos:blocked:phone:${phone}`, duration, '1');
    logger.info({ phone, duration }, 'Phone manually blocked');
  }

  /**
   * Manually unblock a phone number
   */
  async unblockPhone(phone: string): Promise<void> {
    await redis.del(`ddos:blocked:phone:${phone}`);
    logger.info({ phone }, 'Phone unblocked');
  }

  /**
   * Get blocked IPs list
   */
  async getBlockedIPs(): Promise<string[]> {
    const keys = await redis.keys('ddos:blocked:ip:*');
    return keys.map(k => k.replace('ddos:blocked:ip:', ''));
  }

  /**
   * Get blocked phones list
   */
  async getBlockedPhones(): Promise<string[]> {
    const keys = await redis.keys('ddos:blocked:phone:*');
    return keys.map(k => k.replace('ddos:blocked:phone:', ''));
  }

  /**
   * Get current stats
   */
  async getStats(): Promise<{
    blockedIPs: number;
    blockedPhones: number;
    webhookRequestsLastMinute: number;
  }> {
    const [blockedIPs, blockedPhones, webhookCount] = await Promise.all([
      redis.keys('ddos:blocked:ip:*'),
      redis.keys('ddos:blocked:phone:*'),
      redis.get('ddos:count:webhook'),
    ]);

    return {
      blockedIPs: blockedIPs.length,
      blockedPhones: blockedPhones.length,
      webhookRequestsLastMinute: webhookCount ? parseInt(webhookCount, 10) : 0,
    };
  }
}

export const ddosProtection = new DDoSProtection();

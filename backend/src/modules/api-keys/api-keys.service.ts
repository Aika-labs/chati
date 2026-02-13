import crypto from 'crypto';
import { prisma } from '../../config/database.js';
import { createModuleLogger } from '../../shared/utils/logger.js';
import { AppError } from '../../shared/middleware/error.handler.js';
import type { ApiScope } from '@prisma/client';

const logger = createModuleLogger('api-keys');

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const dailyLimitStore = new Map<string, { count: number; resetAt: number }>();

export interface CreateApiKeyInput {
  name: string;
  scopes: ApiScope[];
  rateLimit?: number;
  dailyLimit?: number;
  expiresAt?: Date | null;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  apiKey?: {
    id: string;
    tenantId: string;
    scopes: ApiScope[];
  };
  error?: string | undefined;
}

export class ApiKeysService {
  /**
   * Generate a new API key
   */
  async createApiKey(tenantId: string, userId: string, input: CreateApiKeyInput) {
    // Generate a secure random key
    const rawKey = this.generateKey();
    const hashedKey = this.hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 12); // "ck_live_xxxx"

    const apiKey = await prisma.apiKey.create({
      data: {
        name: input.name,
        key: hashedKey,
        keyPrefix,
        scopes: input.scopes,
        rateLimit: input.rateLimit || 100,
        dailyLimit: input.dailyLimit || 10000,
        expiresAt: input.expiresAt ?? null,
        tenantId,
        createdById: userId,
      },
    });

    logger.info({ tenantId, apiKeyId: apiKey.id }, 'API key created');

    // Return the raw key only once (it won't be retrievable later)
    return {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey, // Only returned on creation!
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      rateLimit: apiKey.rateLimit,
      dailyLimit: apiKey.dailyLimit,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  /**
   * Validate an API key and check rate limits
   */
  async validateApiKey(rawKey: string): Promise<ApiKeyValidationResult> {
    const hashedKey = this.hashKey(rawKey);

    const apiKey = await prisma.apiKey.findUnique({
      where: { key: hashedKey },
      select: {
        id: true,
        tenantId: true,
        scopes: true,
        isActive: true,
        expiresAt: true,
        rateLimit: true,
        dailyLimit: true,
      },
    });

    if (!apiKey) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (!apiKey.isActive) {
      return { valid: false, error: 'API key is disabled' };
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return { valid: false, error: 'API key has expired' };
    }

    // Check rate limits
    const rateLimitResult = this.checkRateLimit(apiKey.id, apiKey.rateLimit, apiKey.dailyLimit);
    if (!rateLimitResult.allowed) {
      return { valid: false, error: rateLimitResult.error || 'Rate limit exceeded' };
    }

    // Update last used
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: new Date(),
        requestCount: { increment: 1 },
      },
    });

    return {
      valid: true,
      apiKey: {
        id: apiKey.id,
        tenantId: apiKey.tenantId,
        scopes: apiKey.scopes,
      },
    };
  }

  /**
   * Check if API key has required scope
   */
  hasScope(scopes: ApiScope[], required: ApiScope): boolean {
    return scopes.includes(required);
  }

  /**
   * List API keys for a tenant
   */
  async listApiKeys(tenantId: string) {
    const keys = await prisma.apiKey.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        rateLimit: true,
        dailyLimit: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        requestCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return keys;
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(id: string, tenantId: string) {
    const apiKey = await prisma.apiKey.findFirst({
      where: { id, tenantId },
    });

    if (!apiKey) {
      throw new AppError(404, 'API_KEY_NOT_FOUND', 'API key not found');
    }

    await prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info({ tenantId, apiKeyId: id }, 'API key revoked');
  }

  /**
   * Delete an API key
   */
  async deleteApiKey(id: string, tenantId: string) {
    const apiKey = await prisma.apiKey.findFirst({
      where: { id, tenantId },
    });

    if (!apiKey) {
      throw new AppError(404, 'API_KEY_NOT_FOUND', 'API key not found');
    }

    await prisma.apiKey.delete({
      where: { id },
    });

    logger.info({ tenantId, apiKeyId: id }, 'API key deleted');
  }

  /**
   * Log API request for audit
   */
  async logRequest(
    apiKeyId: string,
    tenantId: string,
    data: {
      method: string;
      endpoint: string;
      statusCode: number;
      responseTime: number;
      ipAddress?: string | undefined;
      userAgent?: string | undefined;
      errorCode?: string | undefined;
      errorMessage?: string | undefined;
    }
  ) {
    await prisma.apiAuditLog.create({
      data: {
        apiKeyId,
        tenantId,
        method: data.method,
        endpoint: data.endpoint,
        statusCode: data.statusCode,
        responseTime: data.responseTime,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        errorCode: data.errorCode ?? null,
        errorMessage: data.errorMessage ?? null,
      },
    });
  }

  /**
   * Get audit logs for a tenant
   */
  async getAuditLogs(
    tenantId: string,
    options: { apiKeyId?: string | undefined; limit?: number | undefined; offset?: number | undefined }
  ) {
    const { apiKeyId, limit = 50, offset = 0 } = options;

    const [logs, total] = await Promise.all([
      prisma.apiAuditLog.findMany({
        where: {
          tenantId,
          ...(apiKeyId && { apiKeyId }),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.apiAuditLog.count({
        where: {
          tenantId,
          ...(apiKeyId && { apiKeyId }),
        },
      }),
    ]);

    return { logs, total };
  }

  // Private methods

  private generateKey(): string {
    const prefix = 'ck_live_';
    const randomPart = crypto.randomBytes(24).toString('base64url');
    return `${prefix}${randomPart}`;
  }

  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  private checkRateLimit(
    apiKeyId: string,
    rateLimit: number,
    dailyLimit: number
  ): { allowed: boolean; error?: string } {
    const now = Date.now();

    // Per-minute rate limit
    const minuteKey = `minute:${apiKeyId}`;
    const minuteData = rateLimitStore.get(minuteKey);

    if (minuteData) {
      if (now < minuteData.resetAt) {
        if (minuteData.count >= rateLimit) {
          return {
            allowed: false,
            error: `Rate limit exceeded. Limit: ${rateLimit}/min`,
          };
        }
        minuteData.count++;
      } else {
        rateLimitStore.set(minuteKey, { count: 1, resetAt: now + 60000 });
      }
    } else {
      rateLimitStore.set(minuteKey, { count: 1, resetAt: now + 60000 });
    }

    // Daily limit
    const dayKey = `day:${apiKeyId}`;
    const dayData = dailyLimitStore.get(dayKey);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    if (dayData) {
      if (now < dayData.resetAt) {
        if (dayData.count >= dailyLimit) {
          return {
            allowed: false,
            error: `Daily limit exceeded. Limit: ${dailyLimit}/day`,
          };
        }
        dayData.count++;
      } else {
        dailyLimitStore.set(dayKey, { count: 1, resetAt: endOfDay.getTime() });
      }
    } else {
      dailyLimitStore.set(dayKey, { count: 1, resetAt: endOfDay.getTime() });
    }

    return { allowed: true };
  }
}

export const apiKeysService = new ApiKeysService();

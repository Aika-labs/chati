import type { Request, Response, NextFunction } from 'express';
import { apiKeysService } from '../../modules/api-keys/api-keys.service.js';
import type { ApiScope } from '@prisma/client';

// Extend Express Request to include API key context
declare global {
  namespace Express {
    interface Request {
      apiKey?: {
        id: string;
        tenantId: string;
        scopes: ApiScope[];
      };
    }
  }
}

/**
 * Middleware to authenticate requests using API key
 * Expects header: X-API-Key: ck_live_xxxxx
 */
export function apiKeyAuth(requiredScope?: ApiScope) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();
    const apiKeyHeader = req.headers['x-api-key'] as string | undefined;

    if (!apiKeyHeader) {
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_API_KEY',
          message: 'API key is required. Include X-API-Key header.',
        },
      });
      return;
    }

    const result = await apiKeysService.validateApiKey(apiKeyHeader);

    if (!result.valid || !result.apiKey) {
      // Log failed attempt
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: result.error || 'Invalid API key',
        },
      });
      return;
    }

    // Check required scope
    if (requiredScope && !apiKeysService.hasScope(result.apiKey.scopes, requiredScope)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_SCOPE',
          message: `This endpoint requires the ${requiredScope} scope`,
        },
      });
      return;
    }

    // Attach API key info to request
    req.apiKey = result.apiKey;

    // Log successful request after response
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      apiKeysService.logRequest(result.apiKey!.id, result.apiKey!.tenantId, {
        method: req.method,
        endpoint: req.originalUrl,
        statusCode: res.statusCode,
        responseTime,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      }).catch(() => {
        // Silently fail audit logging
      });
    });

    next();
  };
}

/**
 * Helper to require specific scopes
 */
export function requireScope(scope: ApiScope) {
  return apiKeyAuth(scope);
}

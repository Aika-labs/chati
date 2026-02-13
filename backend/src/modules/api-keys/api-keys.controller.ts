import type { Request, Response, NextFunction } from 'express';
import { apiKeysService } from './api-keys.service.js';
import type { ApiResponse } from '../../shared/types/index.js';
import type { ApiScope } from '@prisma/client';

export class ApiKeysController {
  /**
   * POST /api/api-keys
   * Create a new API key
   */
  async createApiKey(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.context) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const { name, scopes, rateLimit, dailyLimit, expiresAt } = req.body;

      if (!name || !scopes || !Array.isArray(scopes) || scopes.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Name and scopes are required' },
        });
        return;
      }

      const apiKey = await apiKeysService.createApiKey(
        req.context.tenantId,
        req.context.userId,
        {
          name,
          scopes: scopes as ApiScope[],
          rateLimit,
          dailyLimit,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        }
      );

      res.status(201).json({
        success: true,
        data: apiKey,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/api-keys
   * List all API keys for tenant
   */
  async listApiKeys(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.context) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const keys = await apiKeysService.listApiKeys(req.context.tenantId);

      res.json({
        success: true,
        data: keys,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/api-keys/:id/revoke
   * Revoke an API key
   */
  async revokeApiKey(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.context) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      await apiKeysService.revokeApiKey(req.params.id as string, req.context.tenantId);

      res.json({
        success: true,
        data: { message: 'API key revoked' },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/api-keys/:id
   * Delete an API key
   */
  async deleteApiKey(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.context) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      await apiKeysService.deleteApiKey(req.params.id as string, req.context.tenantId);

      res.json({
        success: true,
        data: { message: 'API key deleted' },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/api-keys/audit-logs
   * Get audit logs
   */
  async getAuditLogs(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.context) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const { apiKeyId, limit, offset } = req.query;

      const result = await apiKeysService.getAuditLogs(req.context.tenantId, {
        apiKeyId: typeof apiKeyId === 'string' ? apiKeyId : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/api-keys/scopes
   * Get available scopes
   */
  async getScopes(
    _req: Request,
    res: Response<ApiResponse>,
    _next: NextFunction
  ): Promise<void> {
    const scopes = [
      { id: 'MESSAGES_READ', name: 'Leer mensajes', description: 'Ver mensajes y conversaciones' },
      { id: 'MESSAGES_WRITE', name: 'Enviar mensajes', description: 'Enviar mensajes a contactos' },
      { id: 'CONTACTS_READ', name: 'Leer contactos', description: 'Ver lista de contactos' },
      { id: 'CONTACTS_WRITE', name: 'Gestionar contactos', description: 'Crear, editar y eliminar contactos' },
      { id: 'CONVERSATIONS_READ', name: 'Leer conversaciones', description: 'Ver conversaciones' },
      { id: 'CONVERSATIONS_WRITE', name: 'Gestionar conversaciones', description: 'Cerrar, archivar conversaciones' },
      { id: 'APPOINTMENTS_READ', name: 'Leer citas', description: 'Ver calendario de citas' },
      { id: 'APPOINTMENTS_WRITE', name: 'Gestionar citas', description: 'Crear, editar y cancelar citas' },
      { id: 'KNOWLEDGE_READ', name: 'Leer conocimiento', description: 'Ver productos, servicios y documentos' },
      { id: 'KNOWLEDGE_WRITE', name: 'Gestionar conocimiento', description: 'Subir documentos, crear productos' },
      { id: 'ANALYTICS_READ', name: 'Ver analytics', description: 'Acceder a reportes y estadisticas' },
      { id: 'WEBHOOKS_MANAGE', name: 'Gestionar webhooks', description: 'Configurar webhooks de eventos' },
    ];

    res.json({
      success: true,
      data: scopes,
    });
  }
}

export const apiKeysController = new ApiKeysController();

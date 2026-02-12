import type { Request, Response, NextFunction } from 'express';
import {
  tenantService,
  updateTenantSchema,
  updateWhatsAppConfigSchema,
  updateGoogleConfigSchema,
} from './tenant.service.js';
import type { ApiResponse } from '../../shared/types/index.js';

export class TenantController {
  /**
   * GET /api/tenants/current
   */
  async getCurrent(
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

      const tenant = await tenantService.getTenant(req.context.tenantId);

      res.json({
        success: true,
        data: tenant,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/tenants/current
   */
  async updateCurrent(
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

      const input = updateTenantSchema.parse(req.body);
      const tenant = await tenantService.updateTenant(req.context.tenantId, input);

      res.json({
        success: true,
        data: tenant,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tenants/current/usage
   */
  async getUsage(
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

      const usage = await tenantService.getTenantUsage(req.context.tenantId);

      res.json({
        success: true,
        data: usage,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/tenants/current/whatsapp
   */
  async updateWhatsAppConfig(
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

      const input = updateWhatsAppConfigSchema.parse(req.body);
      const result = await tenantService.updateWhatsAppConfig(req.context.tenantId, input);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/tenants/current/google
   */
  async updateGoogleConfig(
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

      const input = updateGoogleConfigSchema.parse(req.body);
      const result = await tenantService.updateGoogleConfig(req.context.tenantId, input);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tenants/current/users
   */
  async getUsers(
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

      const users = await tenantService.getTenantUsers(req.context.tenantId);

      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const tenantController = new TenantController();

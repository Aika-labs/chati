import type { Request, Response, NextFunction } from 'express';
import { templatesService } from './templates.service.js';
import type { ApiResponse } from '../../shared/types/index.js';
import type { TemplateCategory } from '@prisma/client';

export class TemplatesController {
  /**
   * GET /api/templates
   * Get all templates (global + tenant-specific)
   */
  async getTemplates(
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

      const { category, industry } = req.query;

      const templates = await templatesService.getTemplates(
        req.context.tenantId,
        category as TemplateCategory | undefined,
        industry as string | undefined
      );

      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/templates/categories
   * Get all template categories
   */
  async getCategories(
    _req: Request,
    res: Response<ApiResponse>,
    _next: NextFunction
  ): Promise<void> {
    const categories = templatesService.getCategories();

    res.json({
      success: true,
      data: categories,
    });
  }

  /**
   * GET /api/templates/:id
   * Get a single template
   */
  async getTemplate(
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

      const template = await templatesService.getTemplate(
        req.params.id as string,
        req.context.tenantId
      );

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/templates
   * Create a custom template
   */
  async createTemplate(
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

      const template = await templatesService.createTemplate(
        req.context.tenantId,
        req.body
      );

      res.status(201).json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/templates/:id
   * Update a custom template
   */
  async updateTemplate(
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

      const template = await templatesService.updateTemplate(
        req.params.id as string,
        req.context.tenantId,
        req.body
      );

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/templates/:id
   * Delete a custom template
   */
  async deleteTemplate(
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

      await templatesService.deleteTemplate(req.params.id as string, req.context.tenantId);

      res.json({
        success: true,
        data: { message: 'Template deleted' },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/templates/:id/use
   * Use a template (increment usage count)
   */
  async useTemplate(
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

      const template = await templatesService.useTemplate(
        req.params.id as string,
        req.context.tenantId
      );

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const templatesController = new TemplatesController();

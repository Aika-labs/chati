import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { autoReplyService } from './autoreply.service.js';
import type { ApiResponse } from '../../shared/types/index.js';

const createAutoReplySchema = z.object({
  name: z.string().min(1).max(100),
  triggerType: z.enum(['KEYWORD', 'PATTERN', 'GREETING', 'THANKS', 'GOODBYE']),
  keywords: z.array(z.string()).optional(),
  pattern: z.string().optional(),
  response: z.string().min(1).max(4096),
  priority: z.number().int().min(0).max(1000).optional(),
  caseSensitive: z.boolean().optional(),
  exactMatch: z.boolean().optional(),
});

const updateAutoReplySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  triggerType: z.enum(['KEYWORD', 'PATTERN', 'GREETING', 'THANKS', 'GOODBYE']).optional(),
  keywords: z.array(z.string()).optional(),
  pattern: z.string().nullable().optional(),
  response: z.string().min(1).max(4096).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  caseSensitive: z.boolean().optional(),
  exactMatch: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const testMatchSchema = z.object({
  message: z.string().min(1),
});

export class AutoReplyController {
  /**
   * GET /api/autoreply - List all auto-reply rules
   */
  async list(
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

      const rules = await autoReplyService.list(req.context.tenantId);

      res.json({
        success: true,
        data: rules,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/autoreply/:id - Get a single auto-reply rule
   */
  async get(
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

      const ruleId = req.params['id'];
      if (!ruleId || typeof ruleId !== 'string') {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Rule ID required' },
        });
        return;
      }
      const rule = await autoReplyService.get(req.context.tenantId, ruleId);

      if (!rule) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Auto-reply rule not found' },
        });
        return;
      }

      res.json({
        success: true,
        data: rule,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/autoreply - Create a new auto-reply rule
   */
  async create(
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

      const input = createAutoReplySchema.parse(req.body);
      const rule = await autoReplyService.create(req.context.tenantId, {
        ...input,
        keywords: input.keywords ?? [],
      });

      res.status(201).json({
        success: true,
        data: rule,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/autoreply/:id - Update an auto-reply rule
   */
  async update(
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

      const ruleId = req.params['id'];
      if (!ruleId || typeof ruleId !== 'string') {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Rule ID required' },
        });
        return;
      }
      const input = updateAutoReplySchema.parse(req.body);
      const rule = await autoReplyService.update(req.context.tenantId, ruleId, input);

      res.json({
        success: true,
        data: rule,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/autoreply/:id - Delete an auto-reply rule
   */
  async delete(
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

      const ruleId = req.params['id'];
      if (!ruleId || typeof ruleId !== 'string') {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Rule ID required' },
        });
        return;
      }
      await autoReplyService.delete(req.context.tenantId, ruleId);

      res.json({
        success: true,
        data: { deleted: true },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/autoreply/test - Test if a message matches any rule
   */
  async testMatch(
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

      const input = testMatchSchema.parse(req.body);
      const match = await autoReplyService.findMatch(req.context.tenantId, input.message);

      res.json({
        success: true,
        data: match,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/autoreply/defaults - Create default auto-reply rules
   */
  async createDefaults(
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

      await autoReplyService.createDefaultRules(req.context.tenantId);
      const rules = await autoReplyService.list(req.context.tenantId);

      res.status(201).json({
        success: true,
        data: rules,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const autoReplyController = new AutoReplyController();

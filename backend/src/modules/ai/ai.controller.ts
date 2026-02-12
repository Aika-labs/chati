import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { aiService } from './ai.service.js';
import type { ApiResponse } from '../../shared/types/index.js';

const processMessageSchema = z.object({
  conversationId: z.string().min(1),
  message: z.string().min(1),
});

const quickResponseSchema = z.object({
  prompt: z.string().min(1),
});

export class AIController {
  /**
   * POST /api/ai/process
   * Process a message and get AI response
   */
  async processMessage(
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

      const input = processMessageSchema.parse(req.body);
      const response = await aiService.processMessage(
        req.context.tenantId,
        input.conversationId,
        input.message
      );

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/ai/quick
   * Generate a quick response without conversation context
   */
  async quickResponse(
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

      const input = quickResponseSchema.parse(req.body);
      const response = await aiService.generateQuickResponse(input.prompt);

      res.json({
        success: true,
        data: { response },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/ai/detect-intent
   * Detect intent from a message
   */
  async detectIntent(
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

      const { message } = req.body as { message: string };
      if (!message) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Message required' },
        });
        return;
      }

      // Create a minimal context for intent detection
      const intent = await aiService.detectIntent(message, {
        tenantId: req.context.tenantId,
        contactId: '',
        conversationId: '',
        recentMessages: [],
        contactInfo: { phone: '', tags: [] },
        businessContext: { services: [], workingHours: '', timezone: '' },
      });

      res.json({
        success: true,
        data: intent,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const aiController = new AIController();

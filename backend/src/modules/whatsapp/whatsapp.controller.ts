import type { Request, Response, NextFunction } from 'express';
import {
  whatsappService,
  sendTextMessageSchema,
  sendTemplateMessageSchema,
  sendInteractiveButtonsSchema,
  sendInteractiveListSchema,
} from './whatsapp.service.js';
import { whatsappWebhookHandler } from './whatsapp.webhook.js';
import type { ApiResponse, WhatsAppWebhookPayload } from '../../shared/types/index.js';
import { createModuleLogger } from '../../shared/utils/logger.js';

const logger = createModuleLogger('whatsapp-controller');

export class WhatsAppController {
  /**
   * GET /api/whatsapp/webhook - Verify webhook
   */
  verifyWebhook(req: Request, res: Response): void {
    const mode = req.query['hub.mode'] as string;
    const token = req.query['hub.verify_token'] as string;
    const challenge = req.query['hub.challenge'] as string;

    const result = whatsappWebhookHandler.verifyWebhook(mode, token, challenge);

    if (result) {
      res.status(200).send(result);
    } else {
      res.status(403).send('Forbidden');
    }
  }

  /**
   * POST /api/whatsapp/webhook - Receive webhook events
   */
  async receiveWebhook(
    req: Request,
    res: Response<ApiResponse>,
    _next: NextFunction
  ): Promise<void> {
    try {
      // Always respond quickly to Meta
      res.status(200).json({ success: true });

      // Process webhook asynchronously
      const payload = req.body as WhatsAppWebhookPayload;
      const processedMessages = await whatsappWebhookHandler.processWebhook(payload);

      // TODO: Emit events via Socket.io for real-time updates
      // TODO: Queue AI processing for each message

      logger.info({ messageCount: processedMessages.length }, 'Webhook processed');
    } catch (error) {
      logger.error({ error }, 'Webhook processing error');
      // Don't call next(error) - we already responded
    }
  }

  /**
   * POST /api/whatsapp/send/text
   */
  async sendTextMessage(
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

      const input = sendTextMessageSchema.parse(req.body);
      const result = await whatsappService.sendTextMessage(req.context.tenantId, input);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/whatsapp/send/template
   */
  async sendTemplateMessage(
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

      const input = sendTemplateMessageSchema.parse(req.body);
      const result = await whatsappService.sendTemplateMessage(req.context.tenantId, input);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/whatsapp/send/buttons
   */
  async sendInteractiveButtons(
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

      const input = sendInteractiveButtonsSchema.parse(req.body);
      const result = await whatsappService.sendInteractiveButtons(req.context.tenantId, input);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/whatsapp/send/list
   */
  async sendInteractiveList(
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

      const input = sendInteractiveListSchema.parse(req.body);
      const result = await whatsappService.sendInteractiveList(req.context.tenantId, input);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/whatsapp/mark-read/:messageId
   */
  async markAsRead(
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

      const messageId = req.params.messageId;
      if (!messageId || typeof messageId !== 'string') {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Message ID required' },
        });
        return;
      }

      await whatsappService.markAsRead(req.context.tenantId, messageId);

      res.json({
        success: true,
        data: { marked: true },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const whatsappController = new WhatsAppController();

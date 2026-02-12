import type { Request, Response, NextFunction } from 'express';
import {
  whatsappService,
  sendTextMessageSchema,
  sendTemplateMessageSchema,
  sendInteractiveButtonsSchema,
  sendInteractiveListSchema,
} from './whatsapp.service.js';
import { whatsappWebhookHandler, type ProcessedInboundMessage } from './whatsapp.webhook.js';
import { aiService } from '../ai/ai.service.js';
import { prisma } from '../../config/database.js';
import { emitToTenant } from '../realtime/socket.handler.js';
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
      // Always respond quickly to Meta (within 20 seconds)
      res.status(200).json({ success: true });

      // Process webhook asynchronously
      const payload = req.body as WhatsAppWebhookPayload;
      const processedMessages = await whatsappWebhookHandler.processWebhook(payload);

      // Process each message with AI and send response
      for (const message of processedMessages) {
        // Emit real-time event to dashboard
        emitToTenant(message.tenantId, 'new_message', {
          conversationId: message.conversationId,
          contactId: message.contactId,
          messageId: message.messageId,
          from: message.from,
          content: message.content,
          type: message.type,
        });

        // Process with AI if enabled for this conversation
        await this.processMessageWithAI(message);
      }

      logger.info({ messageCount: processedMessages.length }, 'Webhook processed');
    } catch (error) {
      logger.error({ error }, 'Webhook processing error');
      // Don't call next(error) - we already responded
    }
  }

  /**
   * Process a message with AI and send automatic response
   */
  private async processMessageWithAI(message: ProcessedInboundMessage): Promise<void> {
    try {
      // Check if AI is enabled for this conversation
      const conversation = await prisma.conversation.findUnique({
        where: { id: message.conversationId },
        select: { isAiEnabled: true, aiTakenOver: true },
      });

      if (!conversation?.isAiEnabled || conversation.aiTakenOver) {
        logger.debug({ conversationId: message.conversationId }, 'AI disabled for conversation');
        return;
      }

      // Skip if no text content
      if (!message.content) {
        logger.debug({ messageId: message.messageId }, 'No text content to process');
        return;
      }

      // Generate AI response
      const aiResponse = await aiService.processMessage(
        message.tenantId,
        message.conversationId,
        message.content
      );

      // Send response via WhatsApp
      const { messageId: waMessageId } = await whatsappService.sendTextMessage(
        message.tenantId,
        {
          to: message.from,
          message: aiResponse.message,
        }
      );

      // Save outbound message to database
      const outboundMessage = await prisma.message.create({
        data: {
          tenantId: message.tenantId,
          conversationId: message.conversationId,
          direction: 'OUTBOUND',
          type: 'TEXT',
          content: aiResponse.message,
          waMessageId,
          waStatus: 'SENT',
          isAiGenerated: true,
          aiIntent: aiResponse.intent.type,
        },
      });

      // Update conversation
      await prisma.conversation.update({
        where: { id: message.conversationId },
        data: {
          lastMessageAt: new Date(),
          currentIntent: aiResponse.intent.type,
          // If AI suggests handoff, mark it
          ...(aiResponse.shouldHandoff ? { aiTakenOver: true } : {}),
        },
      });

      // Emit outbound message event
      emitToTenant(message.tenantId, 'new_message', {
        conversationId: message.conversationId,
        messageId: outboundMessage.id,
        direction: 'OUTBOUND',
        content: aiResponse.message,
        isAiGenerated: true,
        intent: aiResponse.intent.type,
      });

      // If handoff suggested, emit notification
      if (aiResponse.shouldHandoff) {
        emitToTenant(message.tenantId, 'handoff_requested', {
          conversationId: message.conversationId,
          contactId: message.contactId,
          reason: 'AI confidence low or complex query',
        });
      }

      logger.info({
        tenantId: message.tenantId,
        conversationId: message.conversationId,
        intent: aiResponse.intent.type,
        shouldHandoff: aiResponse.shouldHandoff,
      }, 'AI response sent');
    } catch (error) {
      logger.error({ error, messageId: message.messageId }, 'Failed to process message with AI');
      // Don't throw - we don't want to break the webhook processing
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

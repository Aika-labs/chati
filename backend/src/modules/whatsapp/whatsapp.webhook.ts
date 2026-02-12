import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { createModuleLogger } from '../../shared/utils/logger.js';
import type { WhatsAppWebhookPayload, WhatsAppMessage } from '../../shared/types/index.js';

const logger = createModuleLogger('whatsapp-webhook');

export interface ProcessedInboundMessage {
  tenantId: string;
  contactId: string;
  conversationId: string;
  messageId: string;
  from: string;
  type: string;
  content: string | null;
  mediaUrl: string | null;
  contactName: string | null;
}

export class WhatsAppWebhookHandler {
  /**
   * Verify webhook (GET request from Meta)
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      logger.info('Webhook verified successfully');
      return challenge;
    }
    logger.warn({ mode, token }, 'Webhook verification failed');
    return null;
  }

  /**
   * Process incoming webhook payload
   */
  async processWebhook(payload: WhatsAppWebhookPayload): Promise<ProcessedInboundMessage[]> {
    const processedMessages: ProcessedInboundMessage[] = [];

    if (payload.object !== 'whatsapp_business_account') {
      logger.debug({ object: payload.object }, 'Ignoring non-WhatsApp webhook');
      return processedMessages;
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        const phoneNumberId = value.metadata.phone_number_id;

        // Find tenant by phone number ID
        const tenant = await prisma.tenant.findFirst({
          where: { whatsappPhoneNumberId: phoneNumberId },
          select: { id: true, status: true },
        });

        if (!tenant) {
          logger.warn({ phoneNumberId }, 'No tenant found for phone number');
          continue;
        }

        if (tenant.status === 'SUSPENDED' || tenant.status === 'BANNED') {
          logger.warn({ tenantId: tenant.id, status: tenant.status }, 'Tenant is not active');
          continue;
        }

        // Process messages
        if (value.messages) {
          for (const message of value.messages) {
            const contactInfo = value.contacts?.find(c => c.wa_id === message.from);
            const processed = await this.processInboundMessage(
              tenant.id,
              message,
              contactInfo?.profile.name ?? null
            );
            if (processed) {
              processedMessages.push(processed);
            }
          }
        }

        // Process status updates
        if (value.statuses) {
          for (const status of value.statuses) {
            await this.processStatusUpdate(tenant.id, status);
          }
        }
      }
    }

    return processedMessages;
  }

  /**
   * Process a single inbound message
   */
  private async processInboundMessage(
    tenantId: string,
    message: WhatsAppMessage,
    contactName: string | null
  ): Promise<ProcessedInboundMessage | null> {
    try {
      // Get or create contact
      const contact = await prisma.contact.upsert({
        where: {
          tenantId_phone: {
            tenantId,
            phone: message.from,
          },
        },
        create: {
          tenantId,
          phone: message.from,
          name: contactName,
          firstContactAt: new Date(),
          lastContactAt: new Date(),
          totalMessages: 1,
        },
        update: {
          ...(contactName ? { name: contactName } : {}),
          lastContactAt: new Date(),
          totalMessages: { increment: 1 },
        },
      });

      // Get or create conversation
      let conversation = await prisma.conversation.findFirst({
        where: {
          tenantId,
          contactId: contact.id,
          status: 'OPEN',
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            tenantId,
            contactId: contact.id,
            status: 'OPEN',
            isAiEnabled: true,
          },
        });
      }

      // Extract message content
      const { content, mediaUrl, mediaType, fileName } = this.extractMessageContent(message);

      // Create message record
      const dbMessage = await prisma.message.create({
        data: {
          tenantId,
          conversationId: conversation.id,
          direction: 'INBOUND',
          type: this.mapMessageType(message.type),
          content,
          mediaUrl,
          mediaType,
          fileName,
          waMessageId: message.id,
          waStatus: 'DELIVERED',
          waTimestamp: new Date(parseInt(message.timestamp) * 1000),
        },
      });

      // Update conversation last message time
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });

      // Track usage
      await this.trackUsage(tenantId, 'INBOUND_MESSAGES');

      logger.info({
        tenantId,
        contactId: contact.id,
        conversationId: conversation.id,
        messageId: dbMessage.id,
        type: message.type,
      }, 'Inbound message processed');

      return {
        tenantId,
        contactId: contact.id,
        conversationId: conversation.id,
        messageId: dbMessage.id,
        from: message.from,
        type: message.type,
        content,
        mediaUrl,
        contactName,
      };
    } catch (error) {
      logger.error({ error, tenantId, messageId: message.id }, 'Failed to process inbound message');
      return null;
    }
  }

  /**
   * Process message status update
   */
  private async processStatusUpdate(
    tenantId: string,
    status: { id: string; status: string; timestamp: string; recipient_id: string }
  ): Promise<void> {
    try {
      const waStatus = this.mapWaStatus(status.status);

      await prisma.message.updateMany({
        where: {
          tenantId,
          waMessageId: status.id,
        },
        data: {
          waStatus,
        },
      });

      logger.debug({ tenantId, messageId: status.id, status: waStatus }, 'Message status updated');
    } catch (error) {
      logger.error({ error, tenantId, statusId: status.id }, 'Failed to update message status');
    }
  }

  /**
   * Extract content from WhatsApp message
   */
  private extractMessageContent(message: WhatsAppMessage): {
    content: string | null;
    mediaUrl: string | null;
    mediaType: string | null;
    fileName: string | null;
  } {
    switch (message.type) {
      case 'text':
        return {
          content: message.text?.body ?? null,
          mediaUrl: null,
          mediaType: null,
          fileName: null,
        };
      case 'image':
        return {
          content: null,
          mediaUrl: message.image?.id ?? null,
          mediaType: message.image?.mime_type ?? null,
          fileName: null,
        };
      case 'document':
        return {
          content: null,
          mediaUrl: message.document?.id ?? null,
          mediaType: message.document?.mime_type ?? null,
          fileName: message.document?.filename ?? null,
        };
      default:
        return {
          content: JSON.stringify(message),
          mediaUrl: null,
          mediaType: null,
          fileName: null,
        };
    }
  }

  /**
   * Map WhatsApp message type to our enum
   */
  private mapMessageType(type: string): 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'AUDIO' | 'VIDEO' | 'LOCATION' | 'CONTACT' | 'INTERACTIVE' | 'TEMPLATE' {
    const typeMap: Record<string, 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'AUDIO' | 'VIDEO' | 'LOCATION' | 'CONTACT' | 'INTERACTIVE' | 'TEMPLATE'> = {
      text: 'TEXT',
      image: 'IMAGE',
      document: 'DOCUMENT',
      audio: 'AUDIO',
      video: 'VIDEO',
      location: 'LOCATION',
      contacts: 'CONTACT',
      interactive: 'INTERACTIVE',
    };
    return typeMap[type] ?? 'TEXT';
  }

  /**
   * Map WhatsApp status to our enum
   */
  private mapWaStatus(status: string): 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' {
    const statusMap: Record<string, 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'> = {
      sent: 'SENT',
      delivered: 'DELIVERED',
      read: 'READ',
      failed: 'FAILED',
    };
    return statusMap[status] ?? 'PENDING';
  }

  /**
   * Track usage for rate limiting
   */
  private async trackUsage(tenantId: string, type: 'INBOUND_MESSAGES' | 'OUTBOUND_MESSAGES'): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.usageRecord.upsert({
      where: {
        tenantId_type_date: {
          tenantId,
          type,
          date: today,
        },
      },
      create: {
        tenantId,
        type,
        date: today,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    });
  }
}

export const whatsappWebhookHandler = new WhatsAppWebhookHandler();

import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { createModuleLogger } from '../../shared/utils/logger.js';
import { AppError } from '../../shared/middleware/error.handler.js';
import { env } from '../../config/env.js';
import { createModuleLogger } from '../../shared/utils/logger.js';
import { AppError } from '../../shared/middleware/error.handler.js';
import type { WhatsAppMessage, WhatsAppWebhookPayload } from '../../shared/types/index.js';

const logger = createModuleLogger('whatsapp');

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

// Validation schemas
export const sendTextMessageSchema = z.object({
  to: z.string().min(10),
  message: z.string().min(1).max(4096),
});

export const sendTemplateMessageSchema = z.object({
  to: z.string().min(10),
  templateName: z.string().min(1),
  languageCode: z.string().default('es'),
  components: z.array(z.object({
    type: z.enum(['header', 'body', 'button']),
    parameters: z.array(z.object({
      type: z.enum(['text', 'image', 'document', 'video']),
      text: z.string().optional(),
      image: z.object({ link: z.string().url() }).optional(),
    })),
  })).optional(),
});

export const sendInteractiveButtonsSchema = z.object({
  to: z.string().min(10),
  bodyText: z.string().min(1),
  buttons: z.array(z.object({
    id: z.string().min(1),
    title: z.string().min(1).max(20),
  })).min(1).max(3),
  headerText: z.string().optional(),
  footerText: z.string().optional(),
});

export const sendInteractiveListSchema = z.object({
  to: z.string().min(10),
  bodyText: z.string().min(1),
  buttonText: z.string().min(1).max(20),
  sections: z.array(z.object({
    title: z.string().min(1),
    rows: z.array(z.object({
      id: z.string().min(1),
      title: z.string().min(1).max(24),
      description: z.string().max(72).optional(),
    })).min(1).max(10),
  })).min(1).max(10),
  headerText: z.string().optional(),
  footerText: z.string().optional(),
});

export type SendTextMessageInput = z.infer<typeof sendTextMessageSchema>;
export type SendTemplateMessageInput = z.infer<typeof sendTemplateMessageSchema>;
export type SendInteractiveButtonsInput = z.infer<typeof sendInteractiveButtonsSchema>;
export type SendInteractiveListInput = z.infer<typeof sendInteractiveListSchema>;

interface WhatsAppApiResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

export class WhatsAppService {
  /**
   * Send a text message
   */
  async sendTextMessage(
    tenantId: string,
    input: SendTextMessageInput
  ): Promise<{ messageId: string }> {
    const tenant = await this.getTenantConfig(tenantId);

    const response = await this.callWhatsAppApi<WhatsAppApiResponse>(
      tenant.whatsappPhoneNumberId,
      tenant.whatsappAccessToken,
      'messages',
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: input.to,
        type: 'text',
        text: {
          preview_url: true,
          body: input.message,
        },
      }
    );

    const messageId = response.messages[0]?.id;
    if (!messageId) {
      throw new AppError(500, 'WHATSAPP_ERROR', 'Failed to get message ID from WhatsApp');
    }

    logger.info({ tenantId, to: input.to, messageId }, 'Text message sent');

    return { messageId };
  }

  /**
   * Send a template message (for initiating conversations)
   */
  async sendTemplateMessage(
    tenantId: string,
    input: SendTemplateMessageInput
  ): Promise<{ messageId: string }> {
    const tenant = await this.getTenantConfig(tenantId);

    const response = await this.callWhatsAppApi<WhatsAppApiResponse>(
      tenant.whatsappPhoneNumberId,
      tenant.whatsappAccessToken,
      'messages',
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: input.to,
        type: 'template',
        template: {
          name: input.templateName,
          language: {
            code: input.languageCode,
          },
          components: input.components,
        },
      }
    );

    const messageId = response.messages[0]?.id;
    if (!messageId) {
      throw new AppError(500, 'WHATSAPP_ERROR', 'Failed to get message ID from WhatsApp');
    }

    logger.info({ tenantId, to: input.to, templateName: input.templateName, messageId }, 'Template message sent');

    return { messageId };
  }

  /**
   * Send interactive buttons message
   */
  async sendInteractiveButtons(
    tenantId: string,
    input: SendInteractiveButtonsInput
  ): Promise<{ messageId: string }> {
    const tenant = await this.getTenantConfig(tenantId);

    const interactive: Record<string, unknown> = {
      type: 'button',
      body: {
        text: input.bodyText,
      },
      action: {
        buttons: input.buttons.map((btn) => ({
          type: 'reply',
          reply: {
            id: btn.id,
            title: btn.title,
          },
        })),
      },
    };

    if (input.headerText) {
      interactive.header = { type: 'text', text: input.headerText };
    }
    if (input.footerText) {
      interactive.footer = { text: input.footerText };
    }

    const response = await this.callWhatsAppApi<WhatsAppApiResponse>(
      tenant.whatsappPhoneNumberId,
      tenant.whatsappAccessToken,
      'messages',
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: input.to,
        type: 'interactive',
        interactive,
      }
    );

    const messageId = response.messages[0]?.id;
    if (!messageId) {
      throw new AppError(500, 'WHATSAPP_ERROR', 'Failed to get message ID from WhatsApp');
    }

    logger.info({ tenantId, to: input.to, messageId }, 'Interactive buttons sent');

    return { messageId };
  }

  /**
   * Send interactive list message
   */
  async sendInteractiveList(
    tenantId: string,
    input: SendInteractiveListInput
  ): Promise<{ messageId: string }> {
    const tenant = await this.getTenantConfig(tenantId);

    const interactive: Record<string, unknown> = {
      type: 'list',
      body: {
        text: input.bodyText,
      },
      action: {
        button: input.buttonText,
        sections: input.sections,
      },
    };

    if (input.headerText) {
      interactive.header = { type: 'text', text: input.headerText };
    }
    if (input.footerText) {
      interactive.footer = { text: input.footerText };
    }

    const response = await this.callWhatsAppApi<WhatsAppApiResponse>(
      tenant.whatsappPhoneNumberId,
      tenant.whatsappAccessToken,
      'messages',
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: input.to,
        type: 'interactive',
        interactive,
      }
    );

    const messageId = response.messages[0]?.id;
    if (!messageId) {
      throw new AppError(500, 'WHATSAPP_ERROR', 'Failed to get message ID from WhatsApp');
    }

    logger.info({ tenantId, to: input.to, messageId }, 'Interactive list sent');

    return { messageId };
  }

  /**
   * Mark message as read
   */
  async markAsRead(tenantId: string, messageId: string): Promise<void> {
    const tenant = await this.getTenantConfig(tenantId);

    await this.callWhatsAppApi(
      tenant.whatsappPhoneNumberId,
      tenant.whatsappAccessToken,
      'messages',
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }
    );

    logger.debug({ tenantId, messageId }, 'Message marked as read');
  }

  /**
   * Download media from WhatsApp
   */
  async downloadMedia(tenantId: string, mediaId: string): Promise<{ url: string; mimeType: string }> {
    const tenant = await this.getTenantConfig(tenantId);

    // First, get the media URL
    const mediaInfo = await this.callWhatsAppApi<{ url: string; mime_type: string }>(
      tenant.whatsappPhoneNumberId,
      tenant.whatsappAccessToken,
      mediaId,
      null,
      'GET'
    );

    return {
      url: mediaInfo.url,
      mimeType: mediaInfo.mime_type,
    };
  }

  /**
   * Get tenant WhatsApp configuration
   */
  private async getTenantConfig(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        whatsappPhoneNumberId: true,
        whatsappBusinessAccountId: true,
        whatsappAccessToken: true,
        status: true,
      },
    });

    if (!tenant) {
      throw new AppError(404, 'TENANT_NOT_FOUND', 'Tenant not found');
    }

    if (tenant.status === 'SUSPENDED' || tenant.status === 'BANNED') {
      throw new AppError(403, 'TENANT_INACTIVE', 'Tenant is not active');
    }

    if (!tenant.whatsappPhoneNumberId || !tenant.whatsappAccessToken) {
      throw new AppError(400, 'WHATSAPP_NOT_CONFIGURED', 'WhatsApp is not configured for this tenant');
    }

    return {
      whatsappPhoneNumberId: tenant.whatsappPhoneNumberId,
      whatsappBusinessAccountId: tenant.whatsappBusinessAccountId,
      whatsappAccessToken: tenant.whatsappAccessToken,
    };
  }

  /**
   * Call WhatsApp Cloud API
   */
  private async callWhatsAppApi<T>(
    phoneNumberId: string,
    accessToken: string,
    endpoint: string,
    body: unknown,
    method: 'GET' | 'POST' = 'POST'
  ): Promise<T> {
    const url = `${WHATSAPP_API_URL}/${phoneNumberId}/${endpoint}`;

    const options: globalThis.RequestInit = {
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }

    const response = await globalThis.fetch(url, options);
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error({ url, status: response.status, error: errorData }, 'WhatsApp API error');
      throw new AppError(
        response.status,
        'WHATSAPP_API_ERROR',
        `WhatsApp API error: ${response.statusText}`,
        errorData
      );
    }

    return response.json() as Promise<T>;
  }
}

export const whatsappService = new WhatsAppService();

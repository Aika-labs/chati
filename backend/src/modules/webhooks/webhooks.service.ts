import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { logger } from '../../shared/utils/logger.js';
import crypto from 'crypto';
import type { WebhookEvent, WebhookDeliveryStatus, Prisma } from '@prisma/client';

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

interface CreateWebhookInput {
  name: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
  headers?: Record<string, string>;
  maxRetries?: number;
  retryDelay?: number;
}

interface UpdateWebhookInput {
  name?: string;
  url?: string;
  events?: WebhookEvent[];
  secret?: string;
  headers?: Record<string, string>;
  isActive?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

class WebhooksService {
  /**
   * Create a new webhook
   */
  async createWebhook(tenantId: string, input: CreateWebhookInput) {
    // Generate a secret if not provided
    const secret = input.secret || crypto.randomBytes(32).toString('hex');

    const webhook = await prisma.webhook.create({
      data: {
        tenantId,
        name: input.name,
        url: input.url,
        events: input.events,
        secret,
        headers: input.headers as Prisma.InputJsonValue,
        maxRetries: input.maxRetries ?? 3,
        retryDelay: input.retryDelay ?? 60,
      },
    });

    return {
      ...webhook,
      secret, // Return the secret only on creation
    };
  }

  /**
   * Get all webhooks for a tenant
   */
  async getWebhooks(tenantId: string) {
    return prisma.webhook.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        maxRetries: true,
        retryDelay: true,
        lastTriggeredAt: true,
        successCount: true,
        failureCount: true,
        createdAt: true,
        updatedAt: true,
        // Don't expose secret or headers
      },
    });
  }

  /**
   * Get a single webhook
   */
  async getWebhook(tenantId: string, webhookId: string) {
    return prisma.webhook.findFirst({
      where: { id: webhookId, tenantId },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        headers: true,
        isActive: true,
        maxRetries: true,
        retryDelay: true,
        lastTriggeredAt: true,
        successCount: true,
        failureCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Update a webhook
   */
  async updateWebhook(tenantId: string, webhookId: string, input: UpdateWebhookInput) {
    return prisma.webhook.update({
      where: { id: webhookId, tenantId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.url && { url: input.url }),
        ...(input.events && { events: input.events }),
        ...(input.secret && { secret: input.secret }),
        ...(input.headers && { headers: input.headers as Prisma.InputJsonValue }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.maxRetries !== undefined && { maxRetries: input.maxRetries }),
        ...(input.retryDelay !== undefined && { retryDelay: input.retryDelay }),
      },
    });
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(tenantId: string, webhookId: string) {
    return prisma.webhook.delete({
      where: { id: webhookId, tenantId },
    });
  }

  /**
   * Regenerate webhook secret
   */
  async regenerateSecret(tenantId: string, webhookId: string) {
    const newSecret = crypto.randomBytes(32).toString('hex');

    await prisma.webhook.update({
      where: { id: webhookId, tenantId },
      data: { secret: newSecret },
    });

    return { secret: newSecret };
  }

  /**
   * Dispatch an event to all subscribed webhooks
   */
  async dispatchEvent(tenantId: string, event: WebhookEvent, data: Record<string, unknown>) {
    // Find all active webhooks subscribed to this event
    const webhooks = await prisma.webhook.findMany({
      where: {
        tenantId,
        isActive: true,
        events: { has: event },
      },
    });

    if (webhooks.length === 0) {
      return { dispatched: 0 };
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    // Create delivery records and queue for processing
    const deliveries = await Promise.all(
      webhooks.map(async (webhook) => {
        const delivery = await prisma.webhookDelivery.create({
          data: {
            webhookId: webhook.id,
            tenantId,
            event,
            payload: payload as unknown as Prisma.InputJsonValue,
            status: 'PENDING',
          },
        });

        // Queue for immediate processing
        await this.queueDelivery(delivery.id);

        return delivery;
      })
    );

    return { dispatched: deliveries.length };
  }

  /**
   * Queue a delivery for processing
   */
  private async queueDelivery(deliveryId: string) {
    await redis.lpush('webhook:queue', deliveryId);
  }

  /**
   * Process pending webhook deliveries (called by worker)
   */
  async processQueue() {
    const deliveryId = await redis.rpop('webhook:queue');
    if (!deliveryId) return null;

    return this.deliverWebhook(deliveryId);
  }

  /**
   * Deliver a webhook
   */
  async deliverWebhook(deliveryId: string) {
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    });

    if (!delivery || !delivery.webhook) {
      logger.warn({ deliveryId }, 'Webhook delivery not found');
      return null;
    }

    const { webhook } = delivery;
    const payload = delivery.payload as unknown as WebhookPayload;
    const startTime = Date.now();

    try {
      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': payload.event,
        'X-Webhook-Timestamp': payload.timestamp,
        'X-Webhook-Delivery-Id': deliveryId,
        ...(webhook.headers as Record<string, string> || {}),
      };

      // Add signature if secret exists
      if (webhook.secret) {
        const signature = this.generateSignature(JSON.stringify(payload), webhook.secret);
        headers['X-Webhook-Signature'] = signature;
      }

      // Make the request
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      const responseTime = Date.now() - startTime;
      const responseBody = await response.text();

      if (response.ok) {
        // Success
        await prisma.$transaction([
          prisma.webhookDelivery.update({
            where: { id: deliveryId },
            data: {
              status: 'SUCCESS',
              attempts: delivery.attempts + 1,
              statusCode: response.status,
              responseBody: responseBody.substring(0, 1000), // Limit stored response
              responseTime,
            },
          }),
          prisma.webhook.update({
            where: { id: webhook.id },
            data: {
              lastTriggeredAt: new Date(),
              successCount: { increment: 1 },
            },
          }),
        ]);

        return { success: true, statusCode: response.status };
      } else {
        // HTTP error
        throw new Error(`HTTP ${response.status}: ${responseBody.substring(0, 200)}`);
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if we should retry
      const newAttempts = delivery.attempts + 1;
      const shouldRetry = newAttempts < webhook.maxRetries;

      const newStatus: WebhookDeliveryStatus = shouldRetry ? 'RETRYING' : 'FAILED';
      const nextRetryAt = shouldRetry
        ? new Date(Date.now() + webhook.retryDelay * 1000 * Math.pow(2, newAttempts - 1)) // Exponential backoff
        : null;

      await prisma.$transaction([
        prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            status: newStatus,
            attempts: newAttempts,
            errorMessage,
            responseTime,
            nextRetryAt,
          },
        }),
        prisma.webhook.update({
          where: { id: webhook.id },
          data: {
            lastTriggeredAt: new Date(),
            failureCount: { increment: 1 },
          },
        }),
      ]);

      // Queue for retry if needed
      if (shouldRetry && nextRetryAt) {
        const delayMs = nextRetryAt.getTime() - Date.now();
        setTimeout(() => this.queueDelivery(deliveryId), delayMs);
      }

      logger.warn({ deliveryId, error: errorMessage, attempts: newAttempts }, 'Webhook delivery failed');

      return { success: false, error: errorMessage, willRetry: shouldRetry };
    }
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Get delivery history for a webhook
   */
  async getDeliveries(tenantId: string, webhookId: string, limit = 50) {
    return prisma.webhookDelivery.findMany({
      where: { webhookId, tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        event: true,
        status: true,
        attempts: true,
        statusCode: true,
        responseTime: true,
        errorMessage: true,
        createdAt: true,
      },
    });
  }

  /**
   * Test a webhook by sending a test event
   */
  async testWebhook(tenantId: string, webhookId: string) {
    const webhook = await prisma.webhook.findFirst({
      where: { id: webhookId, tenantId },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const testPayload: WebhookPayload = {
      event: 'MESSAGE_RECEIVED' as WebhookEvent,
      timestamp: new Date().toISOString(),
      data: {
        test: true,
        message: 'This is a test webhook delivery',
        webhookId,
      },
    };

    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId,
        tenantId,
        event: 'MESSAGE_RECEIVED',
        payload: testPayload as unknown as Prisma.InputJsonValue,
        status: 'PENDING',
      },
    });

    // Process immediately
    const result = await this.deliverWebhook(delivery.id);

    return {
      deliveryId: delivery.id,
      ...result,
    };
  }

  /**
   * Get available webhook events
   */
  getAvailableEvents(): { event: WebhookEvent; description: string; category: string }[] {
    return [
      // Messages
      { event: 'MESSAGE_RECEIVED', description: 'When a new message is received from a contact', category: 'Messages' },
      { event: 'MESSAGE_SENT', description: 'When a message is sent to a contact', category: 'Messages' },
      { event: 'MESSAGE_DELIVERED', description: 'When a message is delivered to WhatsApp', category: 'Messages' },
      { event: 'MESSAGE_READ', description: 'When a message is read by the contact', category: 'Messages' },
      { event: 'MESSAGE_FAILED', description: 'When a message fails to send', category: 'Messages' },
      // Conversations
      { event: 'CONVERSATION_STARTED', description: 'When a new conversation begins', category: 'Conversations' },
      { event: 'CONVERSATION_CLOSED', description: 'When a conversation is closed', category: 'Conversations' },
      { event: 'CONVERSATION_ASSIGNED', description: 'When a conversation is assigned to an agent', category: 'Conversations' },
      // Contacts
      { event: 'CONTACT_CREATED', description: 'When a new contact is created', category: 'Contacts' },
      { event: 'CONTACT_UPDATED', description: 'When a contact is updated', category: 'Contacts' },
      // Appointments
      { event: 'APPOINTMENT_CREATED', description: 'When a new appointment is scheduled', category: 'Appointments' },
      { event: 'APPOINTMENT_UPDATED', description: 'When an appointment is modified', category: 'Appointments' },
      { event: 'APPOINTMENT_CANCELLED', description: 'When an appointment is cancelled', category: 'Appointments' },
      { event: 'APPOINTMENT_REMINDER', description: 'When an appointment reminder is sent', category: 'Appointments' },
      // AI
      { event: 'AI_HANDOFF_REQUESTED', description: 'When AI requests human handoff', category: 'AI' },
    ];
  }
}

export const webhooksService = new WebhooksService();

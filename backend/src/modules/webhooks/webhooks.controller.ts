import type { Response } from 'express';
import { webhooksService } from './webhooks.service.js';
import type { WebhookEvent } from '@prisma/client';

// Type for authenticated request
interface AuthenticatedRequest {
  user?: { tenantId: string };
  apiKey?: { tenantId: string };
  body: Record<string, unknown>;
  params: Record<string, string>;
  query: Record<string, string | string[] | undefined>;
}

export const webhooksController = {
  /**
   * Create a new webhook
   */
  async create(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenantId || req.apiKey?.tenantId;
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant not found' },
        });
      }

      const { name, url, events, secret, headers, maxRetries, retryDelay } = req.body as {
        name: string;
        url: string;
        events: WebhookEvent[];
        secret?: string;
        headers?: Record<string, string>;
        maxRetries?: number;
        retryDelay?: number;
      };

      if (!name || !url || !events || events.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Name, URL, and at least one event are required' },
        });
      }

      // Validate URL
      try {
        new URL(url);
      } catch {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid URL format' },
        });
      }

      const webhook = await webhooksService.createWebhook(tenantId, {
        name,
        url,
        events,
        ...(secret && { secret }),
        ...(headers && { headers }),
        ...(maxRetries !== undefined && { maxRetries }),
        ...(retryDelay !== undefined && { retryDelay }),
      });

      return res.status(201).json({
        success: true,
        data: webhook,
      });
    } catch (error) {
      console.error('Create webhook error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create webhook' },
      });
    }
  },

  /**
   * List all webhooks
   */
  async list(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenantId || req.apiKey?.tenantId;
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant not found' },
        });
      }

      const webhooks = await webhooksService.getWebhooks(tenantId);

      return res.json({
        success: true,
        data: { webhooks },
      });
    } catch (error) {
      console.error('List webhooks error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list webhooks' },
      });
    }
  },

  /**
   * Get a single webhook
   */
  async get(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenantId || req.apiKey?.tenantId;
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant not found' },
        });
      }

      const id = req.params.id ?? '';
      if (!id) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Webhook ID is required' },
        });
      }

      const webhook = await webhooksService.getWebhook(tenantId, id);

      if (!webhook) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Webhook not found' },
        });
      }

      return res.json({
        success: true,
        data: webhook,
      });
    } catch (error) {
      console.error('Get webhook error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get webhook' },
      });
    }
  },

  /**
   * Update a webhook
   */
  async update(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenantId || req.apiKey?.tenantId;
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant not found' },
        });
      }

      const id = req.params.id ?? '';
      if (!id) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Webhook ID is required' },
        });
      }

      const { name, url, events, headers, isActive, maxRetries, retryDelay } = req.body as {
        name?: string;
        url?: string;
        events?: WebhookEvent[];
        headers?: Record<string, string>;
        isActive?: boolean;
        maxRetries?: number;
        retryDelay?: number;
      };

      // Validate URL if provided
      if (url) {
        try {
          new URL(url);
        } catch {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid URL format' },
          });
        }
      }

      const webhook = await webhooksService.updateWebhook(tenantId, id, {
        ...(name && { name }),
        ...(url && { url }),
        ...(events && { events }),
        ...(headers && { headers }),
        ...(isActive !== undefined && { isActive }),
        ...(maxRetries !== undefined && { maxRetries }),
        ...(retryDelay !== undefined && { retryDelay }),
      });

      return res.json({
        success: true,
        data: webhook,
      });
    } catch (error) {
      console.error('Update webhook error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update webhook' },
      });
    }
  },

  /**
   * Delete a webhook
   */
  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenantId || req.apiKey?.tenantId;
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant not found' },
        });
      }

      const id = req.params.id ?? '';
      if (!id) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Webhook ID is required' },
        });
      }

      await webhooksService.deleteWebhook(tenantId, id);

      return res.json({
        success: true,
        message: 'Webhook deleted successfully',
      });
    } catch (error) {
      console.error('Delete webhook error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete webhook' },
      });
    }
  },

  /**
   * Regenerate webhook secret
   */
  async regenerateSecret(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenantId || req.apiKey?.tenantId;
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant not found' },
        });
      }

      const id = req.params.id ?? '';
      if (!id) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Webhook ID is required' },
        });
      }

      const result = await webhooksService.regenerateSecret(tenantId, id);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Regenerate secret error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to regenerate secret' },
      });
    }
  },

  /**
   * Test a webhook
   */
  async test(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenantId || req.apiKey?.tenantId;
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant not found' },
        });
      }

      const id = req.params.id ?? '';
      if (!id) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Webhook ID is required' },
        });
      }

      const result = await webhooksService.testWebhook(tenantId, id);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Test webhook error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to test webhook' },
      });
    }
  },

  /**
   * Get webhook deliveries
   */
  async getDeliveries(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenantId || req.apiKey?.tenantId;
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant not found' },
        });
      }

      const id = req.params.id ?? '';
      if (!id) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Webhook ID is required' },
        });
      }

      const limitStr = req.query.limit;
      const limit = typeof limitStr === 'string' ? parseInt(limitStr, 10) : 50;

      const deliveries = await webhooksService.getDeliveries(tenantId, id, limit);

      return res.json({
        success: true,
        data: { deliveries },
      });
    } catch (error) {
      console.error('Get deliveries error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get deliveries' },
      });
    }
  },

  /**
   * Get available webhook events
   */
  async getEvents(_req: AuthenticatedRequest, res: Response) {
    try {
      const events = webhooksService.getAvailableEvents();

      return res.json({
        success: true,
        data: { events },
      });
    } catch (error) {
      console.error('Get events error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get events' },
      });
    }
  },
};

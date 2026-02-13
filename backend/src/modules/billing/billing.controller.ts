import type { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { billingService } from './billing.service.js';
import { env } from '../../config/env.js';
import type { ApiResponse } from '../../shared/types/index.js';
import { createModuleLogger } from '../../shared/utils/logger.js';

const logger = createModuleLogger('billing');

export class BillingController {
  /**
   * POST /api/billing/create-checkout-session
   * Create a Stripe Checkout session for subscription
   */
  async createCheckoutSession(
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

      const { planId } = req.body as { planId: string };

      if (!planId) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_PLAN', message: 'Plan ID is required' },
        });
        return;
      }

      const result = await billingService.createCheckoutSession(
        req.context.tenantId,
        planId
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/billing/verify-checkout
   * Verify checkout session after successful payment
   */
  async verifyCheckout(
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

      const { sessionId } = req.body as { sessionId: string };

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_SESSION', message: 'Session ID is required' },
        });
        return;
      }

      await billingService.verifyCheckoutSession(sessionId);

      res.json({
        success: true,
        data: { message: 'Subscription activated' },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/billing/start-trial
   * Start free trial without payment
   */
  async startTrial(
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

      const { planId } = req.body as { planId: string };

      await billingService.startTrial(req.context.tenantId, planId || 'starter');

      res.json({
        success: true,
        data: { message: 'Trial started' },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/billing/portal
   * Create customer portal session for managing subscription
   */
  async createPortalSession(
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

      const url = await billingService.createPortalSession(req.context.tenantId);

      res.json({
        success: true,
        data: { portalUrl: url },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/billing/webhook
   * Handle Stripe webhook events
   */
  async handleWebhook(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const sig = req.headers['stripe-signature'] as string;

      if (!sig || !env.STRIPE_WEBHOOK_SECRET) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_SIGNATURE', message: 'Webhook signature required' },
        });
        return;
      }

      let event: Stripe.Event;

      try {
        const stripe = new Stripe(env.STRIPE_SECRET_KEY!);
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          env.STRIPE_WEBHOOK_SECRET!
        );
      } catch (err) {
        logger.error({ error: err }, 'Webhook signature verification failed');
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_SIGNATURE', message: 'Invalid webhook signature' },
        });
        return;
      }

      await billingService.handleWebhook(event);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}

export const billingController = new BillingController();

import { Router } from 'express';
import express from 'express';
import { billingController } from './billing.controller.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

export const billingRoutes = Router();

// Protected routes (require authentication)
billingRoutes.post(
  '/create-checkout-session',
  authMiddleware,
  (req, res, next) => billingController.createCheckoutSession(req, res, next)
);

billingRoutes.post(
  '/verify-checkout',
  authMiddleware,
  (req, res, next) => billingController.verifyCheckout(req, res, next)
);

billingRoutes.post(
  '/start-trial',
  authMiddleware,
  (req, res, next) => billingController.startTrial(req, res, next)
);

billingRoutes.post(
  '/portal',
  authMiddleware,
  (req, res, next) => billingController.createPortalSession(req, res, next)
);

// Webhook route (no auth, uses Stripe signature verification)
// Note: This needs raw body, so it should be mounted before body parser
billingRoutes.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  (req, res, next) => billingController.handleWebhook(req, res, next)
);

// Health check
billingRoutes.get('/health', (_req, res) => {
  res.json({ module: 'billing', status: 'ok' });
});

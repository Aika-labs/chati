import { Router } from 'express';
import { whatsappController } from './whatsapp.controller.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

export const whatsappRoutes = Router();

// Webhook routes (no auth - called by Meta)
whatsappRoutes.get('/webhook', (req, res) => whatsappController.verifyWebhook(req, res));
whatsappRoutes.post('/webhook', (req, res, next) => whatsappController.receiveWebhook(req, res, next));

// Protected routes
whatsappRoutes.use(authMiddleware);

// Send messages
whatsappRoutes.post('/send/text', (req, res, next) => whatsappController.sendTextMessage(req, res, next));
whatsappRoutes.post('/send/template', (req, res, next) => whatsappController.sendTemplateMessage(req, res, next));
whatsappRoutes.post('/send/buttons', (req, res, next) => whatsappController.sendInteractiveButtons(req, res, next));
whatsappRoutes.post('/send/list', (req, res, next) => whatsappController.sendInteractiveList(req, res, next));

// Message actions
whatsappRoutes.post('/mark-read/:messageId', (req, res, next) => whatsappController.markAsRead(req, res, next));

// Health check
whatsappRoutes.get('/health', (_req, res) => {
  res.json({ module: 'whatsapp', status: 'ok' });
});

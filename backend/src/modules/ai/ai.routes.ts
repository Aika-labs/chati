import { Router } from 'express';
import { aiController } from './ai.controller.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

export const aiRoutes = Router();

// All routes require authentication
aiRoutes.use(authMiddleware);

// AI endpoints
aiRoutes.post('/process', (req, res, next) => aiController.processMessage(req, res, next));
aiRoutes.post('/quick', (req, res, next) => aiController.quickResponse(req, res, next));
aiRoutes.post('/detect-intent', (req, res, next) => aiController.detectIntent(req, res, next));

// Health check
aiRoutes.get('/health', (_req, res) => {
  res.json({ module: 'ai', status: 'ok' });
});

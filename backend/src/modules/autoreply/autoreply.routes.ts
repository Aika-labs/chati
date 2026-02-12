import { Router } from 'express';
import { autoReplyController } from './autoreply.controller.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

export const autoReplyRoutes = Router();

// All routes require authentication
autoReplyRoutes.use(authMiddleware);

// CRUD operations
autoReplyRoutes.get('/', (req, res, next) => autoReplyController.list(req, res, next));
autoReplyRoutes.get('/:id', (req, res, next) => autoReplyController.get(req, res, next));
autoReplyRoutes.post('/', (req, res, next) => autoReplyController.create(req, res, next));
autoReplyRoutes.patch('/:id', (req, res, next) => autoReplyController.update(req, res, next));
autoReplyRoutes.delete('/:id', (req, res, next) => autoReplyController.delete(req, res, next));

// Utility endpoints
autoReplyRoutes.post('/test', (req, res, next) => autoReplyController.testMatch(req, res, next));
autoReplyRoutes.post('/defaults', (req, res, next) => autoReplyController.createDefaults(req, res, next));

// Health check
autoReplyRoutes.get('/health', (_req, res) => {
  res.json({ module: 'autoreply', status: 'ok' });
});

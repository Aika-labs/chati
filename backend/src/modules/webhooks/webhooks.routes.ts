import { Router } from 'express';
import { webhooksController } from './webhooks.controller.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get available events (no webhook ID needed)
router.get('/events', webhooksController.getEvents);

// CRUD operations
router.post('/', webhooksController.create);
router.get('/', webhooksController.list);
router.get('/:id', webhooksController.get);
router.patch('/:id', webhooksController.update);
router.delete('/:id', webhooksController.delete);

// Webhook actions
router.post('/:id/test', webhooksController.test);
router.post('/:id/regenerate-secret', webhooksController.regenerateSecret);
router.get('/:id/deliveries', webhooksController.getDeliveries);

export const webhooksRoutes = router;

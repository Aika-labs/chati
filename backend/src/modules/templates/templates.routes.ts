import { Router } from 'express';
import { templatesController } from './templates.controller.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

export const templatesRoutes = Router();

// All routes require authentication
templatesRoutes.use(authMiddleware);

// Get categories (no auth needed for this one)
templatesRoutes.get('/categories', (req, res, next) =>
  templatesController.getCategories(req, res, next)
);

// CRUD operations
templatesRoutes.get('/', (req, res, next) =>
  templatesController.getTemplates(req, res, next)
);

templatesRoutes.get('/:id', (req, res, next) =>
  templatesController.getTemplate(req, res, next)
);

templatesRoutes.post('/', (req, res, next) =>
  templatesController.createTemplate(req, res, next)
);

templatesRoutes.patch('/:id', (req, res, next) =>
  templatesController.updateTemplate(req, res, next)
);

templatesRoutes.delete('/:id', (req, res, next) =>
  templatesController.deleteTemplate(req, res, next)
);

// Use template
templatesRoutes.post('/:id/use', (req, res, next) =>
  templatesController.useTemplate(req, res, next)
);

// Health check
templatesRoutes.get('/health', (_req, res) => {
  res.json({ module: 'templates', status: 'ok' });
});

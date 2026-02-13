import { Router } from 'express';
import { apiKeysController } from './api-keys.controller.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

export const apiKeysRoutes = Router();

// All routes require authentication
apiKeysRoutes.use(authMiddleware);

// Get available scopes
apiKeysRoutes.get('/scopes', (req, res, next) =>
  apiKeysController.getScopes(req, res, next)
);

// Get audit logs
apiKeysRoutes.get('/audit-logs', (req, res, next) =>
  apiKeysController.getAuditLogs(req, res, next)
);

// CRUD operations
apiKeysRoutes.get('/', (req, res, next) =>
  apiKeysController.listApiKeys(req, res, next)
);

apiKeysRoutes.post('/', (req, res, next) =>
  apiKeysController.createApiKey(req, res, next)
);

apiKeysRoutes.post('/:id/revoke', (req, res, next) =>
  apiKeysController.revokeApiKey(req, res, next)
);

apiKeysRoutes.delete('/:id', (req, res, next) =>
  apiKeysController.deleteApiKey(req, res, next)
);

import { Router } from 'express';
import { tenantController } from './tenant.controller.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

export const tenantRoutes = Router();

// All routes require authentication
tenantRoutes.use(authMiddleware);

// Tenant management
tenantRoutes.get('/current', (req, res, next) => tenantController.getCurrent(req, res, next));
tenantRoutes.patch('/current', (req, res, next) => tenantController.updateCurrent(req, res, next));
tenantRoutes.get('/current/usage', (req, res, next) => tenantController.getUsage(req, res, next));

// Configuration
tenantRoutes.put('/current/whatsapp', (req, res, next) => tenantController.updateWhatsAppConfig(req, res, next));
tenantRoutes.put('/current/google', (req, res, next) => tenantController.updateGoogleConfig(req, res, next));

// Users
tenantRoutes.get('/current/users', (req, res, next) => tenantController.getUsers(req, res, next));

// Health check
tenantRoutes.get('/health', (_req, res) => {
  res.json({ module: 'tenant', status: 'ok' });
});

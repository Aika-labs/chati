import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

export const authRoutes = Router();

// Public routes
authRoutes.post('/register', (req, res, next) => authController.register(req, res, next));
authRoutes.post('/login', (req, res, next) => authController.login(req, res, next));

// Protected routes
authRoutes.post('/refresh', authMiddleware, (req, res, next) => authController.refresh(req, res, next));
authRoutes.get('/me', authMiddleware, (req, res, next) => authController.me(req, res, next));

// Health check
authRoutes.get('/health', (_req, res) => {
  res.json({ module: 'auth', status: 'ok' });
});

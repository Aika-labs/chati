import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

export const authRoutes = Router();

// Public routes - Email/Password
authRoutes.post('/register', (req, res, next) => authController.register(req, res, next));
authRoutes.post('/login', (req, res, next) => authController.login(req, res, next));

// Google OAuth routes
authRoutes.get('/google', (req, res, next) => authController.googleLogin(req, res, next));
authRoutes.get('/google/callback', (req, res, next) => authController.googleCallback(req, res, next));

// Google integrations (protected)
authRoutes.get('/google/calendar', authMiddleware, (req, res, next) => authController.googleCalendarConnect(req, res, next));
authRoutes.get('/google/sheets', authMiddleware, (req, res, next) => authController.googleSheetsConnect(req, res, next));

// Clerk routes
authRoutes.post('/clerk', (req, res, next) => authController.clerkAuth(req, res, next));
authRoutes.post('/clerk/webhook', (req, res, next) => authController.clerkWebhook(req, res, next));

// Protected routes
authRoutes.post('/refresh', authMiddleware, (req, res, next) => authController.refresh(req, res, next));
authRoutes.get('/me', authMiddleware, (req, res, next) => authController.me(req, res, next));

// Health check
authRoutes.get('/health', (_req, res) => {
  res.json({ module: 'auth', status: 'ok' });
});

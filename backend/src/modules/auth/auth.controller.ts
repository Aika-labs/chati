import type { Request, Response, NextFunction } from 'express';
import { authService, registerSchema, loginSchema } from './auth.service.js';
import { googleOAuthService } from './google-oauth.service.js';
import { clerkService } from './clerk.service.js';
import { env } from '../../config/env.js';
import type { ApiResponse } from '../../shared/types/index.js';

export class AuthController {
  /**
   * POST /api/auth/register
   */
  async register(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const input = registerSchema.parse(req.body);
      const result = await authService.register(input);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   */
  async login(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const input = loginSchema.parse(req.body);
      const result = await authService.login(input);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/refresh
   */
  async refresh(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.context) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const result = await authService.refreshToken(req.context.userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   */
  async me(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.context) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          userId: req.context.userId,
          tenantId: req.context.tenantId,
          tenant: req.context.tenant,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Google OAuth
  // ============================================

  /**
   * GET /api/auth/google - Redirect to Google OAuth
   */
  async googleLogin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const state = req.query.state as string | undefined;
      const url = googleOAuthService.getLoginUrl(state);
      res.redirect(url);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/google/callback - Handle Google OAuth callback
   */
  async googleCallback(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string | undefined;

      if (!code) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_CODE', message: 'Authorization code required' },
        });
        return;
      }

      // Check if this is for Calendar/Sheets integration
      if (state) {
        try {
          const parsed = JSON.parse(state) as { type?: string; tenantId?: string };
          if (parsed.type === 'calendar' && parsed.tenantId) {
            await googleOAuthService.handleCalendarCallback(code, parsed.tenantId);
            res.redirect(`${env.FRONTEND_URL}/dashboard/settings?connected=calendar`);
            return;
          }
          if (parsed.type === 'sheets' && parsed.tenantId) {
            await googleOAuthService.handleSheetsCallback(code, parsed.tenantId);
            res.redirect(`${env.FRONTEND_URL}/dashboard/settings?connected=sheets`);
            return;
          }
        } catch {
          // Not a JSON state, continue with login flow
        }
      }

      // Handle login
      const result = await googleOAuthService.handleLoginCallback(code);

      // Redirect to frontend with token
      const params = new URLSearchParams({
        token: result.token,
        isNewUser: String(result.isNewUser),
      });
      res.redirect(`${env.FRONTEND_URL}/auth/callback?${params.toString()}`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/google/calendar - Connect Google Calendar
   */
  async googleCalendarConnect(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.context) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const url = googleOAuthService.getCalendarAuthUrl(req.context.tenantId);
      res.redirect(url);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/google/sheets - Connect Google Sheets
   */
  async googleSheetsConnect(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.context) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const url = googleOAuthService.getSheetsAuthUrl(req.context.tenantId);
      res.redirect(url);
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // Clerk Authentication
  // ============================================

  /**
   * POST /api/auth/clerk - Verify Clerk session and get/create user
   */
  async clerkAuth(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '');

      if (!sessionToken) {
        res.status(401).json({
          success: false,
          error: { code: 'MISSING_TOKEN', message: 'Clerk session token required' },
        });
        return;
      }

      const result = await clerkService.verifyAndGetUser(sessionToken);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/clerk/webhook - Handle Clerk webhooks
   */
  async clerkWebhook(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      // Verify webhook signature (in production, use svix library)
      const webhookSecret = env.CLERK_WEBHOOK_SECRET;
      if (webhookSecret) {
        // TODO: Verify signature with svix
      }

      await clerkService.handleWebhook(req.body);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();

import { google } from 'googleapis';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { createModuleLogger } from '../../shared/utils/logger.js';
import { AppError, AuthenticationError } from '../../shared/middleware/error.handler.js';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../../shared/types/index.js';

const logger = createModuleLogger('google-oauth');

// Google OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_REDIRECT_URI
);

// Scopes for different Google services
const SCOPES = {
  login: ['openid', 'email', 'profile'],
  calendar: ['https://www.googleapis.com/auth/calendar'],
  sheets: ['https://www.googleapis.com/auth/spreadsheets'],
};

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface GoogleAuthResult {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: string;
    plan: string;
  };
  token: string;
  expiresAt: Date;
  isNewUser: boolean;
}

export class GoogleOAuthService {
  /**
   * Generate OAuth URL for login
   */
  getLoginUrl(state?: string): string {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new AppError(500, 'CONFIG_ERROR', 'Google OAuth not configured');
    }

    const opts: { access_type: string; scope: string[]; prompt: string; state?: string } = {
      access_type: 'offline',
      scope: SCOPES.login,
      prompt: 'consent',
    };
    if (state) opts.state = state;

    return oauth2Client.generateAuthUrl(opts);
  }

  /**
   * Generate OAuth URL for Calendar access
   */
  getCalendarAuthUrl(tenantId: string): string {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new AppError(500, 'CONFIG_ERROR', 'Google OAuth not configured');
    }

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [...SCOPES.login, ...SCOPES.calendar],
      state: JSON.stringify({ type: 'calendar', tenantId }),
      prompt: 'consent',
    });
  }

  /**
   * Generate OAuth URL for Sheets access
   */
  getSheetsAuthUrl(tenantId: string): string {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new AppError(500, 'CONFIG_ERROR', 'Google OAuth not configured');
    }

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [...SCOPES.login, ...SCOPES.sheets],
      state: JSON.stringify({ type: 'sheets', tenantId }),
      prompt: 'consent',
    });
  }

  /**
   * Handle OAuth callback for login
   */
  async handleLoginCallback(code: string): Promise<GoogleAuthResult> {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const userInfo = await this.getUserInfo(tokens.access_token!);

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: userInfo.email },
      include: { tenant: true },
    });

    let isNewUser = false;

    if (!user) {
      // Create new tenant and user
      isNewUser = true;
      const slug = this.generateSlug(userInfo.name);

      const result = await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: userInfo.name,
            slug,
            status: 'TRIAL',
            plan: 'FREE',
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            businessName: userInfo.name,
          },
        });

        const newUser = await tx.user.create({
          data: {
            email: userInfo.email,
            password: '', // No password for OAuth users
            name: userInfo.name,
            role: 'OWNER',
            tenantId: tenant.id,
          },
          include: { tenant: true },
        });

        return newUser;
      });

      user = result;
      logger.info({ userId: user.id, email: userInfo.email }, 'New user registered via Google');
    } else {
      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      logger.info({ userId: user.id }, 'User logged in via Google');
    }

    // Check tenant status
    if (user.tenant.status === 'BANNED') {
      throw new AuthenticationError('Account has been banned');
    }

    // Generate JWT
    const token = this.generateToken({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        status: user.tenant.status,
        plan: user.tenant.plan,
      },
      token,
      expiresAt,
      isNewUser,
    };
  }

  /**
   * Handle OAuth callback for Calendar integration
   */
  async handleCalendarCallback(code: string, tenantId: string): Promise<void> {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      throw new AppError(400, 'NO_REFRESH_TOKEN', 'No refresh token received. Please revoke access and try again.');
    }

    // Get user's primary calendar ID
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarList = await calendar.calendarList.list();
    const primaryCalendar = calendarList.data.items?.find(c => c.primary);

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        googleRefreshToken: tokens.refresh_token,
        googleCalendarId: primaryCalendar?.id ?? 'primary',
      },
    });

    logger.info({ tenantId }, 'Google Calendar connected');
  }

  /**
   * Handle OAuth callback for Sheets integration
   */
  async handleSheetsCallback(code: string, tenantId: string): Promise<void> {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      throw new AppError(400, 'NO_REFRESH_TOKEN', 'No refresh token received. Please revoke access and try again.');
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        googleRefreshToken: tokens.refresh_token,
      },
    });

    logger.info({ tenantId }, 'Google Sheets connected');
  }

  /**
   * Get authenticated Google client for a tenant
   */
  async getAuthenticatedClient(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { googleRefreshToken: true },
    });

    if (!tenant?.googleRefreshToken) {
      throw new AppError(400, 'NOT_CONNECTED', 'Google account not connected');
    }

    const client = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI
    );

    client.setCredentials({ refresh_token: tenant.googleRefreshToken });

    return client;
  }

  /**
   * Get user info from Google
   */
  private async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new AuthenticationError('Failed to get user info from Google');
    }

    const data = await response.json() as { id: string; email: string; name: string; picture?: string };
    const result: GoogleUserInfo = {
      id: data.id,
      email: data.email,
      name: data.name,
    };
    if (data.picture) result.picture = data.picture;
    return result;
  }

  /**
   * Generate a unique slug from name
   */
  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const random = Math.random().toString(36).slice(2, 6);
    return `${base}-${random}`;
  }

  /**
   * Generate JWT token
   */
  private generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
  }
}

export const googleOAuthService = new GoogleOAuthService();

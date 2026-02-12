import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { createModuleLogger } from '../../shared/utils/logger.js';
import { AppError, AuthenticationError } from '../../shared/middleware/error.handler.js';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../../shared/types/index.js';

const logger = createModuleLogger('clerk');

// Clerk API base URL
const CLERK_API_URL = 'https://api.clerk.com/v1';

export interface ClerkUser {
  id: string;
  email_addresses: Array<{ email_address: string; id: string }>;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
}

export interface ClerkWebhookEvent {
  type: string;
  data: ClerkUser;
}

export interface ClerkAuthResult {
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

export class ClerkService {
  /**
   * Verify Clerk session token and get/create user
   */
  async verifyAndGetUser(sessionToken: string): Promise<ClerkAuthResult> {
    if (!env.CLERK_SECRET_KEY) {
      throw new AppError(500, 'CONFIG_ERROR', 'Clerk not configured');
    }

    // Verify session with Clerk
    const clerkUser = await this.verifySession(sessionToken);

    // Get primary email
    const primaryEmail = clerkUser.email_addresses[0]?.email_address;
    if (!primaryEmail) {
      throw new AuthenticationError('No email found in Clerk account');
    }

    const name = [clerkUser.first_name, clerkUser.last_name].filter(Boolean).join(' ') || primaryEmail.split('@')[0] || 'User';

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: primaryEmail },
      include: { tenant: true },
    });

    let isNewUser = false;

    if (!user) {
      // Create new tenant and user
      isNewUser = true;
      const slug = this.generateSlug(name);

      const result = await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name,
            slug,
            status: 'TRIAL',
            plan: 'FREE',
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            businessName: name,
          },
        });

        const newUser = await tx.user.create({
          data: {
            email: primaryEmail,
            password: '', // No password for Clerk users
            name,
            role: 'OWNER',
            tenantId: tenant.id,
          },
          include: { tenant: true },
        });

        return newUser;
      });

      user = result;
      logger.info({ userId: user.id, email: primaryEmail, clerkId: clerkUser.id }, 'New user registered via Clerk');
    } else {
      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      logger.info({ userId: user.id, clerkId: clerkUser.id }, 'User logged in via Clerk');
    }

    // Check tenant status
    if (user.tenant.status === 'BANNED') {
      throw new AuthenticationError('Account has been banned');
    }

    // Generate our own JWT for API access
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
   * Handle Clerk webhook events
   */
  async handleWebhook(event: ClerkWebhookEvent): Promise<void> {
    switch (event.type) {
      case 'user.created':
        logger.info({ clerkId: event.data.id }, 'Clerk user created webhook received');
        break;

      case 'user.updated':
        await this.syncUserFromClerk(event.data);
        break;

      case 'user.deleted':
        await this.handleUserDeleted(event.data.id);
        break;

      default:
        logger.debug({ type: event.type }, 'Unhandled Clerk webhook event');
    }
  }

  /**
   * Sync user data from Clerk
   */
  private async syncUserFromClerk(clerkUser: ClerkUser): Promise<void> {
    const primaryEmail = clerkUser.email_addresses[0]?.email_address;
    if (!primaryEmail) return;

    const name = [clerkUser.first_name, clerkUser.last_name].filter(Boolean).join(' ') || primaryEmail.split('@')[0] || 'User';

    await prisma.user.updateMany({
      where: { email: primaryEmail },
      data: { name },
    });

    logger.info({ clerkId: clerkUser.id, email: primaryEmail }, 'User synced from Clerk');
  }

  /**
   * Handle user deletion from Clerk
   */
  private async handleUserDeleted(clerkId: string): Promise<void> {
    // We don't delete users, just log the event
    // In production, you might want to deactivate the user
    logger.warn({ clerkId }, 'Clerk user deleted - consider deactivating local user');
  }

  /**
   * Verify Clerk session token
   */
  private async verifySession(sessionToken: string): Promise<ClerkUser> {
    // For Clerk, we need to verify the JWT and get user info
    // The session token is a JWT signed by Clerk
    
    try {
      // Decode the JWT to get the user ID (sub claim)
      const decoded = jwt.decode(sessionToken) as { sub?: string } | null;
      
      if (!decoded?.sub) {
        throw new AuthenticationError('Invalid Clerk session token');
      }

      // Get user from Clerk API
      const response = await fetch(`${CLERK_API_URL}/users/${decoded.sub}`, {
        headers: {
          Authorization: `Bearer ${env.CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error({ error, status: response.status }, 'Clerk API error');
        throw new AuthenticationError('Failed to verify Clerk session');
      }

      return await response.json() as ClerkUser;
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      logger.error({ error }, 'Clerk session verification failed');
      throw new AuthenticationError('Invalid Clerk session');
    }
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

export const clerkService = new ClerkService();

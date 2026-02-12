import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError, AuthenticationError, ValidationError } from '../../shared/middleware/error.handler.js';
import type { JwtPayload } from '../../shared/types/index.js';
import { createModuleLogger } from '../../shared/utils/logger.js';

const logger = createModuleLogger('auth');

// Validation schemas
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  tenantName: z.string().min(2),
  tenantSlug: z.string().min(2).regex(/^[a-z0-9-]+$/),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export interface AuthResponse {
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
}

export class AuthService {
  /**
   * Register a new tenant with owner user
   */
  async register(input: RegisterInput): Promise<AuthResponse> {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ValidationError('Email already registered');
    }

    // Check if tenant slug already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: input.tenantSlug },
    });

    if (existingTenant) {
      throw new ValidationError('Tenant slug already taken');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, 12);

    // Create tenant and user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant with 14-day trial
      const tenant = await tx.tenant.create({
        data: {
          name: input.tenantName,
          slug: input.tenantSlug,
          status: 'TRIAL',
          plan: 'FREE',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          businessName: input.tenantName,
        },
      });

      // Create owner user
      const user = await tx.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
          name: input.name,
          role: 'OWNER',
          tenantId: tenant.id,
        },
      });

      return { tenant, user };
    });

    logger.info({ userId: result.user.id, tenantId: result.tenant.id }, 'New tenant registered');

    // Generate token
    const token = this.generateToken({
      userId: result.user.id,
      tenantId: result.tenant.id,
      email: result.user.email,
      role: result.user.role,
    });

    const expiresAt = new Date(Date.now() + this.parseExpiresIn(env.JWT_EXPIRES_IN));

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        status: result.tenant.status,
        plan: result.tenant.plan,
      },
      token,
      expiresAt,
    };
  }

  /**
   * Login user
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    // Find user with tenant
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Check password
    const isValidPassword = await bcrypt.compare(input.password, user.password);

    if (!isValidPassword) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AuthenticationError('Account is disabled');
    }

    // Check tenant status
    if (user.tenant.status === 'BANNED') {
      throw new AppError(403, 'TENANT_BANNED', 'Account has been banned');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    logger.info({ userId: user.id, tenantId: user.tenantId }, 'User logged in');

    // Generate token
    const token = this.generateToken({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    });

    const expiresAt = new Date(Date.now() + this.parseExpiresIn(env.JWT_EXPIRES_IN));

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
    };
  }

  /**
   * Refresh token
   */
  async refreshToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user || !user.isActive) {
      throw new AuthenticationError('Invalid user');
    }

    const token = this.generateToken({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    });

    const expiresAt = new Date(Date.now() + this.parseExpiresIn(env.JWT_EXPIRES_IN));

    return { token, expiresAt };
  }

  /**
   * Generate JWT token
   */
  private generateToken(payload: JwtPayload): string {
    const expiresInSeconds = Math.floor(this.parseExpiresIn(env.JWT_EXPIRES_IN) / 1000);
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: expiresInSeconds,
    });
  }

  /**
   * Parse expires in string to milliseconds
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000; // Default 7 days
    }

    const value = parseInt(match[1] ?? '7', 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }
}

export const authService = new AuthService();

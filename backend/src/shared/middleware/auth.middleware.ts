import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { prisma } from '../../config/database.js';
import { AuthenticationError, AuthorizationError, TenantSuspendedError } from './error.handler.js';
import type { JwtPayload, RequestContext } from '../types/index.js';

// Extend Express Request type
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      context?: RequestContext;
    }
  }
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);

    // Verify JWT
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Get tenant info
    const tenant = await prisma.tenant.findUnique({
      where: { id: payload.tenantId },
      select: {
        id: true,
        name: true,
        status: true,
        plan: true,
      },
    });

    if (!tenant) {
      throw new AuthorizationError('Tenant not found');
    }

    // Check tenant status
    if (tenant.status === 'SUSPENDED') {
      throw new TenantSuspendedError();
    }

    if (tenant.status === 'BANNED') {
      throw new AuthorizationError('Account has been banned');
    }

    // Attach context to request
    req.context = {
      userId: payload.userId,
      tenantId: payload.tenantId,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        status: tenant.status as RequestContext['tenant']['status'],
        plan: tenant.plan as RequestContext['tenant']['plan'],
      },
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid token'));
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Token expired'));
      return;
    }
    next(error);
  }
}

// Optional auth - doesn't fail if no token
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }

  await authMiddleware(req, res, next);
}

// Role-based access control
export function requireRole(..._roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.context) {
      next(new AuthenticationError());
      return;
    }

    // For now, we'll implement role checking when we have the user model
    // This is a placeholder for role-based access
    next();
  };
}

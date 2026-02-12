import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { TenantSuspendedError, AuthorizationError } from '../../shared/middleware/error.handler.js';
import { createModuleLogger } from '../../shared/utils/logger.js';
import type { TenantStatus } from '../../shared/types/index.js';

const logger = createModuleLogger('tenant-guard');

export interface TenantGuardResult {
  allowed: boolean;
  status: TenantStatus;
  reason?: string;
}

export class TenantGuard {
  private readonly CACHE_TTL = 60; // Cache tenant status for 60 seconds

  /**
   * Check if tenant is allowed to perform operations
   */
  async checkTenantStatus(tenantId: string): Promise<TenantGuardResult> {
    // Try cache first
    const cached = await this.getCachedStatus(tenantId);
    if (cached) {
      return this.evaluateStatus(cached);
    }

    // Fetch from database
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        status: true,
        suspensionReason: true,
        trialEndsAt: true,
        plan: true,
      },
    });

    if (!tenant) {
      return { allowed: false, status: 'BANNED', reason: 'Tenant not found' };
    }

    // Check trial expiration
    if (tenant.status === 'TRIAL' && tenant.trialEndsAt) {
      if (new Date() > tenant.trialEndsAt) {
        // Auto-suspend expired trials
        await this.suspendTenant(tenantId, 'Trial period expired');
        return { allowed: false, status: 'SUSPENDED', reason: 'Trial period expired' };
      }
    }

    // Cache the status
    await this.cacheStatus(tenantId, tenant.status as TenantStatus);

    return this.evaluateStatus(tenant.status as TenantStatus, tenant.suspensionReason ?? undefined);
  }

  /**
   * Suspend a tenant
   */
  async suspendTenant(tenantId: string, reason: string): Promise<void> {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: 'SUSPENDED',
        suspendedAt: new Date(),
        suspensionReason: reason,
      },
    });

    // Invalidate cache
    await this.invalidateCache(tenantId);

    logger.warn({ tenantId, reason }, 'Tenant suspended');
  }

  /**
   * Reactivate a tenant
   */
  async reactivateTenant(tenantId: string): Promise<void> {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: 'ACTIVE',
        suspendedAt: null,
        suspensionReason: null,
      },
    });

    // Invalidate cache
    await this.invalidateCache(tenantId);

    logger.info({ tenantId }, 'Tenant reactivated');
  }

  /**
   * Ban a tenant (permanent)
   */
  async banTenant(tenantId: string, reason: string): Promise<void> {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: 'BANNED',
        suspendedAt: new Date(),
        suspensionReason: reason,
      },
    });

    // Invalidate cache
    await this.invalidateCache(tenantId);

    logger.error({ tenantId, reason }, 'Tenant banned');
  }

  /**
   * Check payment status and suspend if overdue
   */
  async checkPaymentStatus(tenantId: string): Promise<boolean> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        plan: true,
        lastPaymentAt: true,
        status: true,
      },
    });

    if (!tenant) return false;

    // Free plan doesn't need payment
    if (tenant.plan === 'FREE') return true;

    // Check if payment is overdue (more than 7 days)
    if (tenant.lastPaymentAt) {
      const daysSincePayment = Math.floor(
        (Date.now() - tenant.lastPaymentAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSincePayment > 37) { // ~30 days billing cycle + 7 days grace
        await this.suspendTenant(tenantId, 'Payment overdue');
        return false;
      }
    }

    return true;
  }

  /**
   * Get auto-response message for suspended tenants
   */
  getSuspendedMessage(reason?: string): string {
    if (reason?.includes('Trial')) {
      return 'Lo sentimos, el período de prueba ha terminado. Por favor contacte al administrador para continuar usando el servicio.';
    }
    if (reason?.includes('Payment')) {
      return 'El servicio está temporalmente suspendido por falta de pago. Por favor contacte al administrador.';
    }
    return 'El servicio está temporalmente no disponible. Por favor intente más tarde.';
  }

  /**
   * Middleware helper - throws if tenant not allowed
   */
  async requireActiveTenant(tenantId: string): Promise<void> {
    const result = await this.checkTenantStatus(tenantId);

    if (!result.allowed) {
      if (result.status === 'SUSPENDED') {
        throw new TenantSuspendedError();
      }
      if (result.status === 'BANNED') {
        throw new AuthorizationError('Account has been banned');
      }
      throw new AuthorizationError(result.reason ?? 'Access denied');
    }
  }

  private evaluateStatus(status: TenantStatus, reason?: string): TenantGuardResult {
    switch (status) {
      case 'ACTIVE':
      case 'TRIAL':
        return { allowed: true, status };
      case 'SUSPENDED':
        return { allowed: false, status, reason: reason ?? 'Account suspended' };
      case 'BANNED':
        return { allowed: false, status, reason: reason ?? 'Account banned' };
      default:
        return { allowed: false, status: 'BANNED', reason: 'Unknown status' };
    }
  }

  private async getCachedStatus(tenantId: string): Promise<TenantStatus | null> {
    const cached = await redis.get(`tenant:status:${tenantId}`);
    return cached as TenantStatus | null;
  }

  private async cacheStatus(tenantId: string, status: TenantStatus): Promise<void> {
    await redis.setex(`tenant:status:${tenantId}`, this.CACHE_TTL, status);
  }

  private async invalidateCache(tenantId: string): Promise<void> {
    await redis.del(`tenant:status:${tenantId}`);
  }
}

export const tenantGuard = new TenantGuard();

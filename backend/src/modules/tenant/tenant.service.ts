import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { NotFoundError, ValidationError, AuthorizationError } from '../../shared/middleware/error.handler.js';
import { createModuleLogger } from '../../shared/utils/logger.js';
import type { TenantStatus, PlanType } from '../../shared/types/index.js';

const logger = createModuleLogger('tenant');

// Validation schemas
export const updateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  businessName: z.string().optional(),
  businessDescription: z.string().optional(),
  timezone: z.string().optional(),
  workingHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  workingHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  workingDays: z.array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])).optional(),
});

export const updateWhatsAppConfigSchema = z.object({
  whatsappPhoneNumberId: z.string().min(1),
  whatsappBusinessAccountId: z.string().min(1),
  whatsappAccessToken: z.string().min(1),
});

export const updateGoogleConfigSchema = z.object({
  googleCalendarId: z.string().optional(),
  googleSheetId: z.string().optional(),
});

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type UpdateWhatsAppConfigInput = z.infer<typeof updateWhatsAppConfigSchema>;
export type UpdateGoogleConfigInput = z.infer<typeof updateGoogleConfigSchema>;

export class TenantService {
  /**
   * Get tenant by ID
   */
  async getTenant(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        plan: true,
        trialEndsAt: true,
        businessName: true,
        businessDescription: true,
        timezone: true,
        workingHoursStart: true,
        workingHoursEnd: true,
        workingDays: true,
        maxOutboundMessagesPerDay: true,
        maxDocuments: true,
        maxContacts: true,
        // Don't expose sensitive tokens
        whatsappPhoneNumberId: true,
        googleCalendarId: true,
        googleSheetId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!tenant) {
      throw new NotFoundError('Tenant');
    }

    return tenant;
  }

  /**
   * Update tenant settings
   */
  async updateTenant(tenantId: string, input: UpdateTenantInput) {
    // Filter out undefined values for Prisma strict mode
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.businessName !== undefined) data.businessName = input.businessName;
    if (input.businessDescription !== undefined) data.businessDescription = input.businessDescription;
    if (input.timezone !== undefined) data.timezone = input.timezone;
    if (input.workingHoursStart !== undefined) data.workingHoursStart = input.workingHoursStart;
    if (input.workingHoursEnd !== undefined) data.workingHoursEnd = input.workingHoursEnd;
    if (input.workingDays !== undefined) data.workingDays = input.workingDays;

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data,
    });

    logger.info({ tenantId }, 'Tenant updated');

    return tenant;
  }

  /**
   * Update WhatsApp configuration
   */
  async updateWhatsAppConfig(tenantId: string, input: UpdateWhatsAppConfigInput) {
    await prisma.tenant.update({
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        whatsappPhoneNumberId: input.whatsappPhoneNumberId,
        whatsappBusinessAccountId: input.whatsappBusinessAccountId,
        whatsappAccessToken: input.whatsappAccessToken,
      },
    });

    logger.info({ tenantId }, 'WhatsApp config updated');

    return { success: true };
  }

  /**
   * Update Google configuration
   */
  async updateGoogleConfig(tenantId: string, input: UpdateGoogleConfigInput) {
    // Filter out undefined values for Prisma strict mode
    const data: Record<string, unknown> = {};
    if (input.googleCalendarId !== undefined) data.googleCalendarId = input.googleCalendarId;
    if (input.googleSheetId !== undefined) data.googleSheetId = input.googleSheetId;

    await prisma.tenant.update({
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data,
    });

    logger.info({ tenantId }, 'Google config updated');

    return { success: true };
  }

  /**
   * Get tenant usage statistics
   */
  async getTenantUsage(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      tenant,
      todayUsage,
      contactCount,
      documentCount,
      conversationCount,
      appointmentCount,
    ] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          maxOutboundMessagesPerDay: true,
          maxDocuments: true,
          maxContacts: true,
        },
      }),
      prisma.usageRecord.findMany({
        where: {
          tenantId,
          date: today,
        },
      }),
      prisma.contact.count({ where: { tenantId } }),
      prisma.document.count({ where: { tenantId } }),
      prisma.conversation.count({ where: { tenantId } }),
      prisma.appointment.count({ where: { tenantId } }),
    ]);

    if (!tenant) {
      throw new NotFoundError('Tenant');
    }

    const outboundMessages = todayUsage.find(u => u.type === 'OUTBOUND_MESSAGES')?.count ?? 0;
    const inboundMessages = todayUsage.find(u => u.type === 'INBOUND_MESSAGES')?.count ?? 0;
    const aiRequests = todayUsage.find(u => u.type === 'AI_REQUESTS')?.count ?? 0;

    return {
      today: {
        outboundMessages,
        inboundMessages,
        aiRequests,
      },
      limits: {
        outboundMessagesPerDay: tenant.maxOutboundMessagesPerDay,
        outboundMessagesRemaining: Math.max(0, tenant.maxOutboundMessagesPerDay - outboundMessages),
        documents: tenant.maxDocuments,
        contacts: tenant.maxContacts,
      },
      totals: {
        contacts: contactCount,
        documents: documentCount,
        conversations: conversationCount,
        appointments: appointmentCount,
      },
    };
  }

  /**
   * Suspend tenant (admin or payment failure)
   */
  async suspendTenant(tenantId: string, reason: string) {
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: 'SUSPENDED',
        suspendedAt: new Date(),
        suspensionReason: reason,
      },
    });

    logger.warn({ tenantId, reason }, 'Tenant suspended');

    return tenant;
  }

  /**
   * Reactivate tenant
   */
  async reactivateTenant(tenantId: string) {
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: 'ACTIVE',
        suspendedAt: null,
        suspensionReason: null,
      },
    });

    logger.info({ tenantId }, 'Tenant reactivated');

    return tenant;
  }

  /**
   * Get all users for a tenant
   */
  async getTenantUsers(tenantId: string) {
    const users = await prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return users;
  }

  /**
   * Add user to tenant
   */
  async addUser(
    tenantId: string,
    input: { email: string; name: string; password: string; role: 'ADMIN' | 'AGENT' }
  ) {
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        password: hashedPassword,
        role: input.role,
        tenantId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    logger.info({ tenantId, userId: user.id }, 'User added to tenant');

    return user;
  }

  /**
   * Remove user from tenant
   */
  async removeUser(tenantId: string, userId: string, requestingUserId: string) {
    // Can't remove yourself
    if (userId === requestingUserId) {
      throw new ValidationError('Cannot remove yourself');
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Can't remove owner
    if (user.role === 'OWNER') {
      throw new AuthorizationError('Cannot remove tenant owner');
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    logger.info({ tenantId, userId }, 'User removed from tenant');

    return { success: true };
  }
}

export const tenantService = new TenantService();

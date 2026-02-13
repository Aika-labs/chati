import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import type { ApiResponse } from '../../shared/types/index.js';
import { AppError } from '../../shared/middleware/error.handler.js';
import type { AppointmentStatus } from '@prisma/client';

export class PublicApiController {
  // ============================================
  // MESSAGES
  // ============================================

  /**
   * POST /api/v1/messages
   * Send a message to a contact
   */
  async sendMessage(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const tenantId = req.apiKey!.tenantId;
      const { phone, content, type = 'TEXT' } = req.body;

      if (!phone || !content) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'phone and content are required' },
        });
        return;
      }

      // Find or create contact
      let contact = await prisma.contact.findFirst({
        where: { tenantId, phone },
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            tenantId,
            phone,
            firstContactAt: new Date(),
            lastContactAt: new Date(),
          },
        });
      }

      // Find or create conversation
      let conversation = await prisma.conversation.findFirst({
        where: { contactId: contact.id, status: 'OPEN' },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            tenantId,
            contactId: contact.id,
            status: 'OPEN',
            lastMessageAt: new Date(),
          },
        });
      }

      // Create message
      const message = await prisma.message.create({
        data: {
          tenantId,
          conversationId: conversation.id,
          direction: 'OUTBOUND',
          type,
          content,
          waStatus: 'PENDING',
          isAiGenerated: false,
        },
      });

      // Update conversation
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });

      res.status(201).json({
        success: true,
        data: {
          messageId: message.id,
          conversationId: conversation.id,
          contactId: contact.id,
          status: message.waStatus,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/conversations/:conversationId/messages
   * Get messages for a conversation
   */
  async getMessages(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const tenantId = req.apiKey!.tenantId;
      const { conversationId } = req.params;
      const { limit = '50', offset = '0' } = req.query;

      // Verify conversation belongs to tenant
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId as string, tenantId },
      });

      if (!conversation) {
        throw new AppError(404, 'NOT_FOUND', 'Conversation not found');
      }

      const messages = await prisma.message.findMany({
        where: { conversationId: conversationId as string },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      });

      res.json({
        success: true,
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // CONTACTS
  // ============================================

  /**
   * GET /api/v1/contacts
   * List contacts
   */
  async listContacts(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const tenantId = req.apiKey!.tenantId;
      const { limit = '50', offset = '0', search } = req.query;

      const where = {
        tenantId,
        ...(search && {
          OR: [
            { name: { contains: search as string, mode: 'insensitive' as const } },
            { phone: { contains: search as string } },
            { email: { contains: search as string, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [contacts, total] = await Promise.all([
        prisma.contact.findMany({
          where,
          orderBy: { lastContactAt: 'desc' },
          take: parseInt(limit as string, 10),
          skip: parseInt(offset as string, 10),
          include: {
            tags: true,
          },
        }),
        prisma.contact.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          contacts,
          pagination: {
            total,
            limit: parseInt(limit as string, 10),
            offset: parseInt(offset as string, 10),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/contacts/:id
   * Get a contact
   */
  async getContact(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const tenantId = req.apiKey!.tenantId;
      const { id } = req.params;

      const contact = await prisma.contact.findFirst({
        where: { id: id as string, tenantId },
        include: {
          tags: true,
          conversations: {
            take: 5,
            orderBy: { lastMessageAt: 'desc' },
          },
        },
      });

      if (!contact) {
        throw new AppError(404, 'NOT_FOUND', 'Contact not found');
      }

      res.json({
        success: true,
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/contacts
   * Create a contact
   */
  async createContact(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const tenantId = req.apiKey!.tenantId;
      const { phone, name, email, notes } = req.body;

      if (!phone) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'phone is required' },
        });
        return;
      }

      // Check if contact already exists
      const existing = await prisma.contact.findFirst({
        where: { tenantId, phone },
      });

      if (existing) {
        res.status(409).json({
          success: false,
          error: { code: 'DUPLICATE', message: 'Contact with this phone already exists' },
        });
        return;
      }

      const contact = await prisma.contact.create({
        data: {
          tenantId,
          phone,
          name,
          email,
          notes,
          firstContactAt: new Date(),
          lastContactAt: new Date(),
        },
      });

      res.status(201).json({
        success: true,
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/contacts/:id
   * Update a contact
   */
  async updateContact(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const tenantId = req.apiKey!.tenantId;
      const { id } = req.params;
      const { name, email, notes } = req.body;

      const existing = await prisma.contact.findFirst({
        where: { id: id as string, tenantId },
      });

      if (!existing) {
        throw new AppError(404, 'NOT_FOUND', 'Contact not found');
      }

      const contact = await prisma.contact.update({
        where: { id: id as string },
        data: { name, email, notes },
      });

      res.json({
        success: true,
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // CONVERSATIONS
  // ============================================

  /**
   * GET /api/v1/conversations
   * List conversations
   */
  async listConversations(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const tenantId = req.apiKey!.tenantId;
      const { limit = '50', offset = '0', status } = req.query;

      const where = {
        tenantId,
        ...(status && { status: status as 'OPEN' | 'CLOSED' | 'ARCHIVED' }),
      };

      const [conversations, total] = await Promise.all([
        prisma.conversation.findMany({
          where,
          orderBy: { lastMessageAt: 'desc' },
          take: parseInt(limit as string, 10),
          skip: parseInt(offset as string, 10),
          include: {
            contact: true,
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
        }),
        prisma.conversation.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          conversations,
          pagination: {
            total,
            limit: parseInt(limit as string, 10),
            offset: parseInt(offset as string, 10),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/conversations/:id
   * Get a conversation
   */
  async getConversation(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const tenantId = req.apiKey!.tenantId;
      const { id } = req.params;

      const conversation = await prisma.conversation.findFirst({
        where: { id: id as string, tenantId },
        include: {
          contact: true,
          messages: {
            take: 50,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!conversation) {
        throw new AppError(404, 'NOT_FOUND', 'Conversation not found');
      }

      res.json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/conversations/:id/close
   * Close a conversation
   */
  async closeConversation(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const tenantId = req.apiKey!.tenantId;
      const { id } = req.params;

      const existing = await prisma.conversation.findFirst({
        where: { id: id as string, tenantId },
      });

      if (!existing) {
        throw new AppError(404, 'NOT_FOUND', 'Conversation not found');
      }

      const conversation = await prisma.conversation.update({
        where: { id: id as string },
        data: { status: 'CLOSED' },
      });

      res.json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // APPOINTMENTS
  // ============================================

  /**
   * GET /api/v1/appointments
   * List appointments
   */
  async listAppointments(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const tenantId = req.apiKey!.tenantId;
      const { limit = '50', offset = '0', status, from, to } = req.query;

      const where = {
        tenantId,
        ...(status && { status: status as AppointmentStatus }),
        ...(from && { scheduledAt: { gte: new Date(from as string) } }),
        ...(to && { scheduledAt: { lte: new Date(to as string) } }),
      };

      const [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
          where,
          orderBy: { scheduledAt: 'asc' },
          take: parseInt(limit as string, 10),
          skip: parseInt(offset as string, 10),
          include: {
            contact: true,
            service: true,
          },
        }),
        prisma.appointment.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          appointments,
          pagination: {
            total,
            limit: parseInt(limit as string, 10),
            offset: parseInt(offset as string, 10),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/appointments/:id
   * Get an appointment
   */
  async getAppointment(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const tenantId = req.apiKey!.tenantId;
      const { id } = req.params;

      const appointment = await prisma.appointment.findFirst({
        where: { id: id as string, tenantId },
        include: {
          contact: true,
          service: true,
        },
      });

      if (!appointment) {
        throw new AppError(404, 'NOT_FOUND', 'Appointment not found');
      }

      res.json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/appointments
   * Create an appointment
   */
  async createAppointment(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const tenantId = req.apiKey!.tenantId;
      const { contactId, serviceId, scheduledAt, duration, title, description } = req.body;

      if (!contactId || !scheduledAt) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'contactId and scheduledAt are required' },
        });
        return;
      }

      // Verify contact belongs to tenant
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, tenantId },
      });

      if (!contact) {
        throw new AppError(404, 'NOT_FOUND', 'Contact not found');
      }

      const appointment = await prisma.appointment.create({
        data: {
          tenantId,
          contactId,
          serviceId,
          scheduledAt: new Date(scheduledAt),
          duration: duration || 60,
          title: title || 'Cita',
          description,
          status: 'SCHEDULED',
        },
        include: {
          contact: true,
          service: true,
        },
      });

      res.status(201).json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/appointments/:id
   * Update an appointment
   */
  async updateAppointment(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const tenantId = req.apiKey!.tenantId;
      const { id } = req.params;
      const { scheduledAt, duration, title, description, status } = req.body;

      const existing = await prisma.appointment.findFirst({
        where: { id: id as string, tenantId },
      });

      if (!existing) {
        throw new AppError(404, 'NOT_FOUND', 'Appointment not found');
      }

      const appointment = await prisma.appointment.update({
        where: { id: id as string },
        data: {
          ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
          ...(duration && { duration }),
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(status && { status }),
        },
        include: {
          contact: true,
          service: true,
        },
      });

      res.json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/appointments/:id/cancel
   * Cancel an appointment
   */
  async cancelAppointment(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const tenantId = req.apiKey!.tenantId;
      const { id } = req.params;

      const existing = await prisma.appointment.findFirst({
        where: { id: id as string, tenantId },
      });

      if (!existing) {
        throw new AppError(404, 'NOT_FOUND', 'Appointment not found');
      }

      const appointment = await prisma.appointment.update({
        where: { id: id as string },
        data: { status: 'CANCELLED' },
      });

      res.json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ANALYTICS
  // ============================================

  /**
   * GET /api/v1/analytics/stats
   * Get dashboard stats
   */
  async getStats(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      const tenantId = req.apiKey!.tenantId;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());

      const [
        totalContacts,
        totalConversations,
        openConversations,
        totalMessages,
        messagesThisMonth,
        appointmentsThisWeek,
      ] = await Promise.all([
        prisma.contact.count({ where: { tenantId } }),
        prisma.conversation.count({ where: { tenantId } }),
        prisma.conversation.count({ where: { tenantId, status: 'OPEN' } }),
        prisma.message.count({
          where: { conversation: { tenantId } },
        }),
        prisma.message.count({
          where: {
            conversation: { tenantId },
            createdAt: { gte: startOfMonth },
          },
        }),
        prisma.appointment.count({
          where: {
            tenantId,
            scheduledAt: { gte: startOfWeek },
          },
        }),
      ]);

      res.json({
        success: true,
        data: {
          totalContacts,
          totalConversations,
          openConversations,
          totalMessages,
          messagesThisMonth,
          appointmentsThisWeek,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const publicApiController = new PublicApiController();

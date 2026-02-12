import { prisma } from '../../config/database.js';
import { createModuleLogger } from '../../shared/utils/logger.js';
import { NotFoundError } from '../../shared/middleware/error.handler.js';
import type { PaginationParams, PaginatedResponse } from '../../shared/types/index.js';

const logger = createModuleLogger('contacts');

export interface ContactFilters {
  search?: string;
  tags?: string[];
}

export class ContactsService {
  /**
   * Get contacts with pagination and filters
   */
  async getContacts(
    tenantId: string,
    pagination: PaginationParams,
    filters?: ContactFilters
  ): Promise<PaginatedResponse<unknown>> {
    const where: Record<string, unknown> = { tenantId };

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.tags?.length) {
      where.tags = { some: { tag: { name: { in: filters.tags } } } };
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: {
          tags: { include: { tag: true } },
          _count: { select: { conversations: true, appointments: true } },
        },
        orderBy: { lastContactAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      prisma.contact.count({ where }),
    ]);

    return {
      data: contacts.map(c => ({
        ...c,
        tags: c.tags.map(t => t.tag),
        conversationCount: c._count.conversations,
        appointmentCount: c._count.appointments,
      })),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  /**
   * Get single contact with full details
   */
  async getContact(tenantId: string, contactId: string) {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId },
      include: {
        tags: { include: { tag: true } },
        conversations: {
          orderBy: { lastMessageAt: 'desc' },
          take: 5,
          include: {
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
        appointments: {
          where: { scheduledAt: { gte: new Date() } },
          orderBy: { scheduledAt: 'asc' },
          take: 5,
        },
      },
    });

    if (!contact) throw new NotFoundError('Contact');

    return {
      ...contact,
      tags: contact.tags.map(t => t.tag),
    };
  }

  /**
   * Update contact
   */
  async updateContact(tenantId: string, contactId: string, data: {
    name?: string;
    email?: string;
    notes?: string;
  }) {
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId },
    });

    if (!contact) throw new NotFoundError('Contact');

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.notes !== undefined) updateData.notes = data.notes;

    return prisma.contact.update({
      where: { id: contactId },
      data: updateData,
    });
  }

  /**
   * Add tag to contact
   */
  async addTag(tenantId: string, contactId: string, tagName: string) {
    // Get or create tag
    let tag = await prisma.tag.findFirst({
      where: { tenantId, name: tagName },
    });

    if (!tag) {
      tag = await prisma.tag.create({
        data: { tenantId, name: tagName },
      });
    }

    // Add tag to contact
    await prisma.contactTag.upsert({
      where: { contactId_tagId: { contactId, tagId: tag.id } },
      create: { contactId, tagId: tag.id },
      update: {},
    });

    logger.info({ tenantId, contactId, tagName }, 'Tag added to contact');

    return tag;
  }

  /**
   * Remove tag from contact
   */
  async removeTag(tenantId: string, contactId: string, tagId: string) {
    await prisma.contactTag.deleteMany({
      where: { contactId, tagId },
    });

    logger.info({ tenantId, contactId, tagId }, 'Tag removed from contact');
  }

  /**
   * Get all tags for tenant
   */
  async getTags(tenantId: string) {
    return prisma.tag.findMany({
      where: { tenantId },
      include: { _count: { select: { contacts: true } } },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get conversation history for contact
   */
  async getConversationHistory(tenantId: string, contactId: string, limit = 50) {
    const conversations = await prisma.conversation.findMany({
      where: { tenantId, contactId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: limit,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Flatten messages from all conversations
    const allMessages = conversations
      .flatMap(c => c.messages)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return allMessages;
  }

  /**
   * Export contacts to CSV format
   */
  async exportContacts(tenantId: string): Promise<string> {
    const contacts = await prisma.contact.findMany({
      where: { tenantId },
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const headers = ['Nombre', 'Teléfono', 'Email', 'Tags', 'Notas', 'Primer Contacto', 'Último Contacto', 'Total Mensajes'];
    const rows = contacts.map(c => [
      c.name ?? '',
      c.phone,
      c.email ?? '',
      c.tags.map(t => t.tag.name).join('; '),
      c.notes ?? '',
      c.firstContactAt.toISOString(),
      c.lastContactAt.toISOString(),
      c.totalMessages.toString(),
    ]);

    return [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
  }
}

export const contactsService = new ContactsService();

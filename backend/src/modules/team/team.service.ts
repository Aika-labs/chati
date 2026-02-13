import { prisma } from '../../config/database.js';
import type { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

interface CreateTeamMemberInput {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  skills?: string[];
  maxConcurrent?: number;
}

interface UpdateTeamMemberInput {
  name?: string;
  role?: UserRole;
  skills?: string[];
  maxConcurrent?: number;
  isActive?: boolean;
  isAvailable?: boolean;
}

class TeamService {
  /**
   * Get all team members for a tenant
   */
  async getTeamMembers(tenantId: string) {
    return prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isAvailable: true,
        skills: true,
        maxConcurrent: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            assignedConversations: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single team member
   */
  async getTeamMember(tenantId: string, userId: string) {
    return prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isAvailable: true,
        skills: true,
        maxConcurrent: true,
        lastLoginAt: true,
        createdAt: true,
        assignedConversations: {
          where: { isActive: true },
          include: {
            conversation: {
              include: {
                contact: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Create a new team member
   */
  async createTeamMember(tenantId: string, input: CreateTeamMemberInput) {
    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new Error('Email already in use');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, 10);

    return prisma.user.create({
      data: {
        tenantId,
        email: input.email,
        name: input.name,
        password: hashedPassword,
        role: input.role,
        skills: input.skills || [],
        maxConcurrent: input.maxConcurrent || 10,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        skills: true,
        maxConcurrent: true,
        createdAt: true,
      },
    });
  }

  /**
   * Update a team member
   */
  async updateTeamMember(tenantId: string, userId: string, input: UpdateTeamMemberInput) {
    return prisma.user.update({
      where: { id: userId, tenantId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.role && { role: input.role }),
        ...(input.skills && { skills: input.skills }),
        ...(input.maxConcurrent !== undefined && { maxConcurrent: input.maxConcurrent }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.isAvailable !== undefined && { isAvailable: input.isAvailable }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isAvailable: true,
        skills: true,
        maxConcurrent: true,
      },
    });
  }

  /**
   * Delete a team member
   */
  async deleteTeamMember(tenantId: string, userId: string) {
    // First unassign all conversations
    await prisma.conversationAssignment.deleteMany({
      where: { userId },
    });

    return prisma.user.delete({
      where: { id: userId, tenantId },
    });
  }

  /**
   * Assign a conversation to a team member
   */
  async assignConversation(tenantId: string, conversationId: string, userId: string, assignedBy?: string) {
    // Verify conversation belongs to tenant
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Verify user belongs to tenant
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check user's current load
    const currentAssignments = await prisma.conversationAssignment.count({
      where: { userId, isActive: true },
    });

    if (currentAssignments >= user.maxConcurrent) {
      throw new Error('User has reached maximum concurrent conversations');
    }

    // Create or update assignment
    return prisma.conversationAssignment.upsert({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      create: {
        conversationId,
        userId,
        assignedBy: assignedBy ?? null,
        isActive: true,
      },
      update: {
        isActive: true,
        assignedAt: new Date(),
        assignedBy: assignedBy ?? null,
      },
    });
  }

  /**
   * Unassign a conversation from a team member
   */
  async unassignConversation(tenantId: string, conversationId: string, userId: string) {
    // Verify conversation belongs to tenant
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    return prisma.conversationAssignment.update({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      data: { isActive: false },
    });
  }

  /**
   * Get available agents for assignment
   */
  async getAvailableAgents(tenantId: string) {
    const agents = await prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        isAvailable: true,
        role: { in: ['AGENT', 'ADMIN', 'OWNER'] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        skills: true,
        maxConcurrent: true,
        _count: {
          select: {
            assignedConversations: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    // Filter agents who haven't reached their limit
    return agents.filter((agent) => agent._count.assignedConversations < agent.maxConcurrent);
  }

  /**
   * Update user availability status
   */
  async setAvailability(tenantId: string, userId: string, isAvailable: boolean) {
    return prisma.user.update({
      where: { id: userId, tenantId },
      data: { isAvailable },
      select: {
        id: true,
        name: true,
        isAvailable: true,
      },
    });
  }

  /**
   * Get team statistics
   */
  async getTeamStats(tenantId: string) {
    const [totalMembers, activeMembers, availableMembers, totalAssignments] = await Promise.all([
      prisma.user.count({ where: { tenantId } }),
      prisma.user.count({ where: { tenantId, isActive: true } }),
      prisma.user.count({ where: { tenantId, isActive: true, isAvailable: true } }),
      prisma.conversationAssignment.count({ where: { isActive: true, conversation: { tenantId } } }),
    ]);

    return {
      totalMembers,
      activeMembers,
      availableMembers,
      totalAssignments,
    };
  }
}

export const teamService = new TeamService();

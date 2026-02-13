import type { Response } from 'express';
import { teamService } from './team.service.js';
import type { UserRole } from '@prisma/client';

interface AuthenticatedRequest {
  user?: { id: string; tenantId: string; role: string };
  body: Record<string, unknown>;
  params: Record<string, string>;
  query: Record<string, string | string[] | undefined>;
}

// Permission check helper
function canManageTeam(role: string): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

export const teamController = {
  /**
   * List all team members
   */
  async list(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const members = await teamService.getTeamMembers(tenantId);

      return res.json({
        success: true,
        data: { members },
      });
    } catch (error) {
      console.error('List team members error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list team members' },
      });
    }
  },

  /**
   * Get a single team member
   */
  async get(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const userId = req.params.id ?? '';
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'User ID is required' },
        });
      }

      const member = await teamService.getTeamMember(tenantId, userId);

      if (!member) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Team member not found' },
        });
      }

      return res.json({
        success: true,
        data: member,
      });
    } catch (error) {
      console.error('Get team member error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get team member' },
      });
    }
  },

  /**
   * Create a new team member
   */
  async create(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const userRole = req.user?.role;

      if (!tenantId || !userRole) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      if (!canManageTeam(userRole)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only admins can create team members' },
        });
      }

      const { email, name, password, role, skills, maxConcurrent } = req.body as {
        email: string;
        name: string;
        password: string;
        role: UserRole;
        skills?: string[];
        maxConcurrent?: number;
      };

      if (!email || !name || !password || !role) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Email, name, password, and role are required' },
        });
      }

      const member = await teamService.createTeamMember(tenantId, {
        email,
        name,
        password,
        role,
        ...(skills && { skills }),
        ...(maxConcurrent !== undefined && { maxConcurrent }),
      });

      return res.status(201).json({
        success: true,
        data: member,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create team member';
      console.error('Create team member error:', error);
      return res.status(400).json({
        success: false,
        error: { code: 'CREATE_ERROR', message },
      });
    }
  },

  /**
   * Update a team member
   */
  async update(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const userRole = req.user?.role;

      if (!tenantId || !userRole) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      if (!canManageTeam(userRole)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only admins can update team members' },
        });
      }

      const userId = req.params.id ?? '';
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'User ID is required' },
        });
      }

      const { name, role, skills, maxConcurrent, isActive, isAvailable } = req.body as {
        name?: string;
        role?: UserRole;
        skills?: string[];
        maxConcurrent?: number;
        isActive?: boolean;
        isAvailable?: boolean;
      };

      const member = await teamService.updateTeamMember(tenantId, userId, {
        ...(name && { name }),
        ...(role && { role }),
        ...(skills && { skills }),
        ...(maxConcurrent !== undefined && { maxConcurrent }),
        ...(isActive !== undefined && { isActive }),
        ...(isAvailable !== undefined && { isAvailable }),
      });

      return res.json({
        success: true,
        data: member,
      });
    } catch (error) {
      console.error('Update team member error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update team member' },
      });
    }
  },

  /**
   * Delete a team member
   */
  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const userRole = req.user?.role;

      if (!tenantId || !userRole) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      if (!canManageTeam(userRole)) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Only admins can delete team members' },
        });
      }

      const userId = req.params.id ?? '';
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'User ID is required' },
        });
      }

      await teamService.deleteTeamMember(tenantId, userId);

      return res.json({
        success: true,
        message: 'Team member deleted successfully',
      });
    } catch (error) {
      console.error('Delete team member error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete team member' },
      });
    }
  },

  /**
   * Assign conversation to team member
   */
  async assignConversation(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const assignedBy = req.user?.id;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const { conversationId, userId } = req.body as {
        conversationId: string;
        userId: string;
      };

      if (!conversationId || !userId) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Conversation ID and User ID are required' },
        });
      }

      const assignment = await teamService.assignConversation(tenantId, conversationId, userId, assignedBy);

      return res.json({
        success: true,
        data: assignment,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to assign conversation';
      console.error('Assign conversation error:', error);
      return res.status(400).json({
        success: false,
        error: { code: 'ASSIGN_ERROR', message },
      });
    }
  },

  /**
   * Unassign conversation from team member
   */
  async unassignConversation(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const { conversationId, userId } = req.body as {
        conversationId: string;
        userId: string;
      };

      if (!conversationId || !userId) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Conversation ID and User ID are required' },
        });
      }

      await teamService.unassignConversation(tenantId, conversationId, userId);

      return res.json({
        success: true,
        message: 'Conversation unassigned successfully',
      });
    } catch (error) {
      console.error('Unassign conversation error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to unassign conversation' },
      });
    }
  },

  /**
   * Get available agents for assignment
   */
  async getAvailableAgents(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const agents = await teamService.getAvailableAgents(tenantId);

      return res.json({
        success: true,
        data: { agents },
      });
    } catch (error) {
      console.error('Get available agents error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get available agents' },
      });
    }
  },

  /**
   * Set user availability
   */
  async setAvailability(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;

      if (!tenantId || !userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const { isAvailable } = req.body as { isAvailable: boolean };

      if (isAvailable === undefined) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'isAvailable is required' },
        });
      }

      const result = await teamService.setAvailability(tenantId, userId, isAvailable);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Set availability error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to set availability' },
      });
    }
  },

  /**
   * Get team statistics
   */
  async getStats(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
        });
      }

      const stats = await teamService.getTeamStats(tenantId);

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Get team stats error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get team stats' },
      });
    }
  },
};

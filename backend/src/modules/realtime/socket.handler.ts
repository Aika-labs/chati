import type { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { createModuleLogger } from '../../shared/utils/logger.js';
import type { JwtPayload } from '../../shared/types/index.js';

const logger = createModuleLogger('socket');

interface AuthenticatedSocket extends Socket {
  userId?: string;
  tenantId?: string;
}

export function setupSocketHandlers(io: SocketIOServer): void {
  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token as string | undefined;

    if (!token) {
      next(new Error('Authentication required'));
      return;
    }

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      socket.userId = payload.userId;
      socket.tenantId = payload.tenantId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info({ socketId: socket.id, userId: socket.userId }, 'Client connected');

    // Auto-join tenant room
    if (socket.tenantId) {
      socket.join(`tenant:${socket.tenantId}`);
    }

    // Join conversation room
    socket.on('join:conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      logger.debug({ socketId: socket.id, conversationId }, 'Joined conversation room');
    });

    // Leave conversation room
    socket.on('leave:conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      logger.debug({ socketId: socket.id, conversationId }, 'Left conversation room');
    });

    // Typing indicator
    socket.on('typing:start', (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        userId: socket.userId,
        conversationId,
      });
    });

    socket.on('typing:stop', (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit('typing:stop', {
        userId: socket.userId,
        conversationId,
      });
    });

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'Client disconnected');
    });
  });
}

// Event emitters for use in other modules
export class SocketEmitter {
  constructor(private io: SocketIOServer) {}

  /**
   * Emit new message to tenant and conversation
   */
  emitNewMessage(tenantId: string, conversationId: string, message: unknown): void {
    this.io.to(`tenant:${tenantId}`).emit('message:new', message);
    this.io.to(`conversation:${conversationId}`).emit('message:new', message);
  }

  /**
   * Emit message status update
   */
  emitMessageStatus(tenantId: string, conversationId: string, messageId: string, status: string): void {
    this.io.to(`conversation:${conversationId}`).emit('message:status', {
      messageId,
      status,
    });
  }

  /**
   * Emit new conversation
   */
  emitNewConversation(tenantId: string, conversation: unknown): void {
    this.io.to(`tenant:${tenantId}`).emit('conversation:new', conversation);
  }

  /**
   * Emit conversation update
   */
  emitConversationUpdate(tenantId: string, conversationId: string, update: unknown): void {
    this.io.to(`tenant:${tenantId}`).emit('conversation:update', {
      conversationId,
      ...update as object,
    });
  }

  /**
   * Emit new appointment
   */
  emitNewAppointment(tenantId: string, appointment: unknown): void {
    this.io.to(`tenant:${tenantId}`).emit('appointment:new', appointment);
  }

  /**
   * Emit appointment update
   */
  emitAppointmentUpdate(tenantId: string, appointment: unknown): void {
    this.io.to(`tenant:${tenantId}`).emit('appointment:update', appointment);
  }

  /**
   * Emit rate limit warning
   */
  emitRateLimitWarning(tenantId: string, usage: { current: number; limit: number; percent: number }): void {
    this.io.to(`tenant:${tenantId}`).emit('ratelimit:warning', usage);
  }
}

// Singleton instance (set in app.ts)
let socketEmitter: SocketEmitter | null = null;

export function initSocketEmitter(io: SocketIOServer): void {
  socketEmitter = new SocketEmitter(io);
}

export function getSocketEmitter(): SocketEmitter | null {
  return socketEmitter;
}

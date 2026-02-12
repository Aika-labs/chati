import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { env } from './config/env.js';
import { checkDatabaseConnection, disconnectDatabase } from './config/database.js';
import { checkRedisConnection, redis } from './config/redis.js';
import { logger } from './shared/utils/logger.js';
import { errorHandler } from './shared/middleware/error.handler.js';

// Import routes
import { authRoutes } from './modules/auth/auth.routes.js';
import { tenantRoutes } from './modules/tenant/tenant.routes.js';
import { whatsappRoutes } from './modules/whatsapp/whatsapp.routes.js';
import { aiRoutes } from './modules/ai/ai.routes.js';
import { calendarRoutes } from './modules/calendar/calendar.routes.js';
import { contactsRoutes } from './modules/contacts/contacts.routes.js';
import { ragRoutes } from './modules/rag/rag.routes.js';
import { knowledgeRoutes } from './modules/knowledge/knowledge.routes.js';

// Import Socket.io handler
import { setupSocketHandlers } from './modules/realtime/socket.handler.js';

const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: env.NODE_ENV === 'production' ? false : '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  logger.info({
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Health check
app.get('/health', async (_req, res) => {
  const dbHealthy = await checkDatabaseConnection();
  const redisHealthy = await checkRedisConnection();

  const status = dbHealthy && redisHealthy ? 200 : 503;

  res.status(status).json({
    status: status === 200 ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealthy ? 'up' : 'down',
      redis: redisHealthy ? 'up' : 'down',
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/knowledge', knowledgeRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
});

// Error handler
app.use(errorHandler);

// Setup Socket.io handlers
setupSocketHandlers(io);

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  httpServer.close(async () => {
    logger.info('HTTP server closed');

    await disconnectDatabase();
    logger.info('Database disconnected');

    await redis.quit();
    logger.info('Redis disconnected');

    process.exit(0);
  });

  // Force exit after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
httpServer.listen(env.PORT, env.HOST, () => {
  logger.info(`🚀 Chati server running on http://${env.HOST}:${env.PORT}`);
  logger.info(`📡 Socket.io ready for connections`);
  logger.info(`🌍 Environment: ${env.NODE_ENV}`);
});

export { app, io };

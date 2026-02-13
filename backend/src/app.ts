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
import { rateLimiters } from './shared/middleware/rate-limiter.middleware.js';

// Import routes
import { authRoutes } from './modules/auth/auth.routes.js';
import { tenantRoutes } from './modules/tenant/tenant.routes.js';
import { whatsappRoutes } from './modules/whatsapp/whatsapp.routes.js';
import { aiRoutes } from './modules/ai/ai.routes.js';
import { calendarRoutes } from './modules/calendar/calendar.routes.js';
import { contactsRoutes } from './modules/contacts/contacts.routes.js';
import { ragRoutes } from './modules/rag/rag.routes.js';
import { knowledgeRoutes } from './modules/knowledge/knowledge.routes.js';
import { autoReplyRoutes } from './modules/autoreply/autoreply.routes.js';
import { billingRoutes } from './modules/billing/billing.routes.js';
import { templatesRoutes } from './modules/templates/templates.routes.js';
import { apiKeysRoutes } from './modules/api-keys/api-keys.routes.js';
import { publicApiRoutes } from './modules/public-api/public-api.routes.js';
import { docsRoutes } from './modules/docs/docs.routes.js';
import { webhooksRoutes } from './modules/webhooks/webhooks.routes.js';
import { teamRoutes } from './modules/team/team.routes.js';

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

// Readiness check (for Kubernetes)
app.get('/ready', async (_req, res) => {
  const dbHealthy = await checkDatabaseConnection();
  const redisHealthy = await checkRedisConnection();

  if (dbHealthy && redisHealthy) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false });
  }
});

// API Routes with rate limiting
app.use('/api/auth', rateLimiters.auth, authRoutes);
app.use('/api/tenants', rateLimiters.api, tenantRoutes);
app.use('/api/whatsapp', rateLimiters.webhooks, whatsappRoutes);
app.use('/api/ai', rateLimiters.ai, aiRoutes);
app.use('/api/calendar', rateLimiters.api, calendarRoutes);
app.use('/api/contacts', rateLimiters.api, contactsRoutes);
app.use('/api/rag', rateLimiters.uploads, ragRoutes);
app.use('/api/knowledge', rateLimiters.api, knowledgeRoutes);
app.use('/api/autoreply', rateLimiters.api, autoReplyRoutes);
app.use('/api/billing', rateLimiters.api, billingRoutes);
app.use('/api/templates', rateLimiters.api, templatesRoutes);
app.use('/api/api-keys', rateLimiters.api, apiKeysRoutes);
app.use('/api/webhooks', rateLimiters.api, webhooksRoutes);
app.use('/api/team', rateLimiters.api, teamRoutes);
app.use('/api/v1', rateLimiters.publicApi, publicApiRoutes);
app.use('/api/docs', docsRoutes);

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

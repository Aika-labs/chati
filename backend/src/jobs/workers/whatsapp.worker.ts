import { Worker, Job } from 'bullmq';
import { QUEUE_NAMES, type WhatsAppSendJob } from '../queue.js';
import { whatsappService } from '../../modules/whatsapp/whatsapp.service.js';
import { prisma } from '../../config/database.js';
import { createModuleLogger } from '../../shared/utils/logger.js';
import { getSocketEmitter } from '../../modules/realtime/socket.handler.js';
import { getRedisConnection } from '../../config/redis.js';

const logger = createModuleLogger('whatsapp-worker');

const connection = getRedisConnection();

export function startWhatsAppWorker(): Worker {
  const worker = new Worker<WhatsAppSendJob>(
    QUEUE_NAMES.WHATSAPP_SEND,
    async (job: Job<WhatsAppSendJob>) => {
      const { tenantId, to, message, conversationId } = job.data;

      logger.info({ jobId: job.id, tenantId, to }, 'Processing WhatsApp send job');

      try {
        // Send message via WhatsApp API
        const result = await whatsappService.sendTextMessage(tenantId, { to, message });

        // Update message status if we have a conversation
        if (conversationId) {
          // Find the pending message
          const pendingMessage = await prisma.message.findFirst({
            where: {
              conversationId,
              direction: 'OUTBOUND',
              waStatus: 'PENDING',
              content: message,
            },
            orderBy: { createdAt: 'desc' },
          });

          if (pendingMessage) {
            await prisma.message.update({
              where: { id: pendingMessage.id },
              data: {
                waStatus: 'SENT',
                waMessageId: result.messageId,
              },
            });

            // Emit status update
            const emitter = getSocketEmitter();
            if (emitter) {
              emitter.emitMessageStatus(tenantId, conversationId, pendingMessage.id, 'SENT');
            }
          }
        }

        logger.info({ jobId: job.id, messageId: result.messageId }, 'WhatsApp message sent');

        return { messageId: result.messageId };
      } catch (error) {
        logger.error({ error, jobId: job.id }, 'WhatsApp send failed');

        // Update message status to failed
        if (conversationId) {
          await prisma.message.updateMany({
            where: {
              conversationId,
              direction: 'OUTBOUND',
              waStatus: 'PENDING',
              content: message,
            },
            data: { waStatus: 'FAILED' },
          });
        }

        throw error;
      }
    },
    {
      connection,
      concurrency: 10,
      limiter: {
        max: 50, // Max 50 messages per second
        duration: 1000,
      },
    }
  );

  worker.on('completed', (job) => {
    logger.debug({ jobId: job.id }, 'WhatsApp job completed');
  });

  worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, error: error.message }, 'WhatsApp job failed');
  });

  return worker;
}

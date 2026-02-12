import { Worker, Job } from 'bullmq';
import { QUEUE_NAMES, type AIProcessingJob, addWhatsAppSendJob } from '../queue.js';
import { aiService } from '../../modules/ai/ai.service.js';
import { prisma } from '../../config/database.js';
import { createModuleLogger } from '../../shared/utils/logger.js';
import { getSocketEmitter } from '../../modules/realtime/socket.handler.js';

const logger = createModuleLogger('ai-worker');

const connection = {
  host: new URL(process.env.REDIS_URL ?? 'redis://localhost:6379').hostname,
  port: parseInt(new URL(process.env.REDIS_URL ?? 'redis://localhost:6379').port || '6379'),
};

export function startAIWorker(): Worker {
  const worker = new Worker<AIProcessingJob>(
    QUEUE_NAMES.AI_PROCESSING,
    async (job: Job<AIProcessingJob>) => {
      const { tenantId, conversationId, userMessage } = job.data;

      logger.info({ jobId: job.id, tenantId, conversationId }, 'Processing AI job');

      try {
        // Get conversation with contact info
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: {
            contact: { select: { name: true, phone: true } },
          },
        });

        if (!conversation) {
          throw new Error('Conversation not found');
        }

        // Use the AI service to process the message
        const response = await aiService.processMessage(tenantId, conversationId, userMessage);

        // Save AI response as message
        const aiMessage = await prisma.message.create({
          data: {
            tenantId,
            conversationId,
            direction: 'OUTBOUND',
            content: response.message,
            waStatus: 'PENDING',
            isAiGenerated: true,
            aiIntent: String(response.intent),
          },
        });

        // Queue WhatsApp send
        await addWhatsAppSendJob({
          tenantId,
          to: conversation.contact.phone,
          message: response.message,
          conversationId,
        });

        // Emit real-time update
        const emitter = getSocketEmitter();
        if (emitter) {
          emitter.emitNewMessage(tenantId, conversationId, aiMessage);
        }

        logger.info({ jobId: job.id, messageId: aiMessage.id }, 'AI response generated');

        return { messageId: aiMessage.id, intent: response.intent };
      } catch (error) {
        logger.error({ error, jobId: job.id }, 'AI processing failed');
        throw error;
      }
    },
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    logger.debug({ jobId: job.id }, 'AI job completed');
  });

  worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, error: error.message }, 'AI job failed');
  });

  return worker;
}

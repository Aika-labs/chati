import { Queue, Job } from 'bullmq';

import { createModuleLogger } from '../shared/utils/logger.js';

const logger = createModuleLogger('queue');

// Queue names
export const QUEUE_NAMES = {
  AI_PROCESSING: 'ai-processing',
  RAG_INDEXING: 'rag-indexing',
  REMINDERS: 'reminders',
  WHATSAPP_SEND: 'whatsapp-send',
} as const;

// Connection config for BullMQ
const connection = {
  host: new URL(process.env.REDIS_URL ?? 'redis://localhost:6379').hostname,
  port: parseInt(new URL(process.env.REDIS_URL ?? 'redis://localhost:6379').port || '6379'),
};

// Create queues
export const aiQueue = new Queue(QUEUE_NAMES.AI_PROCESSING, { connection });
export const ragQueue = new Queue(QUEUE_NAMES.RAG_INDEXING, { connection });
export const reminderQueue = new Queue(QUEUE_NAMES.REMINDERS, { connection });
export const whatsappQueue = new Queue(QUEUE_NAMES.WHATSAPP_SEND, { connection });

// Job data types
export interface AIProcessingJob {
  tenantId: string;
  conversationId: string;
  messageId: string;
  userMessage: string;
}

export interface RAGIndexingJob {
  tenantId: string;
  documentId: string;
  fileBuffer: string; // Base64 encoded
  mimeType: string;
}

export interface ReminderJob {
  appointmentId: string;
  type: '24h' | '1h';
}

export interface WhatsAppSendJob {
  tenantId: string;
  to: string;
  message: string;
  conversationId?: string;
}

// Add jobs to queues
export async function addAIProcessingJob(data: AIProcessingJob): Promise<Job> {
  return aiQueue.add('process-message', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}

export async function addRAGIndexingJob(data: RAGIndexingJob): Promise<Job> {
  return ragQueue.add('index-document', data, {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
  });
}

export async function addReminderJob(data: ReminderJob, delay: number): Promise<Job> {
  return reminderQueue.add('send-reminder', data, {
    delay,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });
}

export async function addWhatsAppSendJob(data: WhatsAppSendJob): Promise<Job> {
  return whatsappQueue.add('send-message', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}

// Get queue stats
export async function getQueueStats() {
  const [aiStats, ragStats, reminderStats, whatsappStats] = await Promise.all([
    getQueueInfo(aiQueue),
    getQueueInfo(ragQueue),
    getQueueInfo(reminderQueue),
    getQueueInfo(whatsappQueue),
  ]);

  return {
    ai: aiStats,
    rag: ragStats,
    reminders: reminderStats,
    whatsapp: whatsappStats,
  };
}

async function getQueueInfo(queue: Queue) {
  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}

// Graceful shutdown
export async function closeQueues(): Promise<void> {
  await Promise.all([
    aiQueue.close(),
    ragQueue.close(),
    reminderQueue.close(),
    whatsappQueue.close(),
  ]);
  logger.info('All queues closed');
}

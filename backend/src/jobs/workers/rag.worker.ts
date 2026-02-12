import { Worker, Job } from 'bullmq';
import { QUEUE_NAMES, type RAGIndexingJob } from '../queue.js';
import { ragService } from '../../modules/rag/rag.service.js';
import { createModuleLogger } from '../../shared/utils/logger.js';
import { getRedisConnection } from '../../config/redis.js';

const logger = createModuleLogger('rag-worker');

const connection = getRedisConnection();

export function startRAGWorker(): Worker {
  const worker = new Worker<RAGIndexingJob>(
    QUEUE_NAMES.RAG_INDEXING,
    async (job: Job<RAGIndexingJob>) => {
      const { tenantId, documentId, fileBuffer, mimeType } = job.data;

      logger.info({ jobId: job.id, tenantId, documentId }, 'Processing RAG indexing job');

      try {
        // Decode base64 buffer
        const buffer = Buffer.from(fileBuffer, 'base64');

        // Process document
        await ragService.processDocument(documentId, buffer, mimeType);

        logger.info({ jobId: job.id, documentId }, 'Document indexed successfully');

        return { documentId, status: 'indexed' };
      } catch (error) {
        logger.error({ error, jobId: job.id, documentId }, 'RAG indexing failed');
        throw error;
      }
    },
    {
      connection,
      concurrency: 2, // Limit concurrency for CPU-intensive work
    }
  );

  worker.on('completed', (job) => {
    logger.debug({ jobId: job.id }, 'RAG job completed');
  });

  worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, error: error.message }, 'RAG job failed');
  });

  return worker;
}

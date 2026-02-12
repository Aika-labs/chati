import { Worker, Job } from 'bullmq';
import { QUEUE_NAMES, type RAGIndexingJob } from '../queue.js';
import { ragService } from '../../modules/rag/rag.service.js';
import { createModuleLogger } from '../../shared/utils/logger.js';

const logger = createModuleLogger('rag-worker');

const connection = {
  host: new URL(process.env.REDIS_URL ?? 'redis://localhost:6379').hostname,
  port: parseInt(new URL(process.env.REDIS_URL ?? 'redis://localhost:6379').port || '6379'),
};

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

  worker.on('completed', (_job) => {
    logger.debug({ jobId: _job.id }, 'RAG job completed');
  });

  worker.on('failed', (_job, _error) => {
    logger.error({ jobId: _job?.id, error: _error.message }, 'RAG job failed');
  });

  return worker;
}

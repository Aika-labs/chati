/**
 * Worker entry point - runs background jobs
 */
import { startAllWorkers } from './jobs/workers/index.js';
import { startScheduler, stopScheduler } from './jobs/scheduler.js';
import { closeQueues } from './jobs/queue.js';
import { createModuleLogger } from './shared/utils/logger.js';

const logger = createModuleLogger('worker');

async function main() {
  logger.info('Starting Chati workers...');

  // Start all workers
  const workers = startAllWorkers();

  // Start scheduler for cron jobs
  const schedulerJobs = startScheduler();

  logger.info('All workers and scheduler started');

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');

    // Stop scheduler
    stopScheduler(schedulerJobs);

    // Close workers
    await Promise.all([
      workers.ai.close(),
      workers.rag.close(),
      workers.reminder.close(),
      workers.whatsapp.close(),
    ]);

    // Close queues
    await closeQueues();

    logger.info('Graceful shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error({ error }, 'Worker startup failed');
  process.exit(1);
});

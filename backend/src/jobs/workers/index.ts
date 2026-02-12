import { startAIWorker } from './ai.worker.js';
import { startRAGWorker } from './rag.worker.js';
import { startReminderWorker } from './reminder.worker.js';
import { startWhatsAppWorker } from './whatsapp.worker.js';
import { createModuleLogger } from '../../shared/utils/logger.js';

const logger = createModuleLogger('workers');

export function startAllWorkers() {
  logger.info('Starting all workers...');

  const workers = {
    ai: startAIWorker(),
    rag: startRAGWorker(),
    reminder: startReminderWorker(),
    whatsapp: startWhatsAppWorker(),
  };

  logger.info('All workers started');

  return workers;
}

export { startAIWorker, startRAGWorker, startReminderWorker, startWhatsAppWorker };

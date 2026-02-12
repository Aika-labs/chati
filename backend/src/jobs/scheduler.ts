import { CronJob } from 'cron';
import { calendarService } from '../modules/calendar/calendar.service.js';
import { addReminderJob } from './queue.js';
import { createModuleLogger } from '../shared/utils/logger.js';

const logger = createModuleLogger('scheduler');

/**
 * Schedule reminder jobs for upcoming appointments
 */
async function scheduleReminders(): Promise<void> {
  try {
    // Get appointments needing 24h reminders
    const appointments24h = await calendarService.getAppointmentsForReminders(24);
    for (const apt of appointments24h) {
      await addReminderJob({ appointmentId: apt.id, type: '24h' }, 0);
      logger.info({ appointmentId: apt.id }, 'Scheduled 24h reminder');
    }

    // Get appointments needing 1h reminders
    const appointments1h = await calendarService.getAppointmentsForReminders(1);
    for (const apt of appointments1h) {
      await addReminderJob({ appointmentId: apt.id, type: '1h' }, 0);
      logger.info({ appointmentId: apt.id }, 'Scheduled 1h reminder');
    }
  } catch (error) {
    logger.error({ error }, 'Failed to schedule reminders');
  }
}

export function startScheduler(): CronJob[] {
  const jobs: CronJob[] = [];

  // Run reminder check every 15 minutes
  const reminderJob = new CronJob('*/15 * * * *', scheduleReminders, null, true);
  jobs.push(reminderJob);

  logger.info('Scheduler started');

  return jobs;
}

export function stopScheduler(jobs: CronJob[]): void {
  for (const job of jobs) {
    job.stop();
  }
  logger.info('Scheduler stopped');
}

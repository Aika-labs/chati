import { Worker, Job } from 'bullmq';
import { URL } from 'url';
import { QUEUE_NAMES, type ReminderJob, addWhatsAppSendJob } from '../queue.js';
import { calendarService } from '../../modules/calendar/calendar.service.js';
import { prisma } from '../../config/database.js';
import { createModuleLogger } from '../../shared/utils/logger.js';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const logger = createModuleLogger('reminder-worker');

const connection = {
  host: new URL(process.env.REDIS_URL ?? 'redis://localhost:6379').hostname,
  port: parseInt(new URL(process.env.REDIS_URL ?? 'redis://localhost:6379').port || '6379'),
};

export function startReminderWorker(): Worker {
  const worker = new Worker<ReminderJob>(
    QUEUE_NAMES.REMINDERS,
    async (job: Job<ReminderJob>) => {
      const { appointmentId, type } = job.data;

      logger.info({ jobId: job.id, appointmentId, type }, 'Processing reminder job');

      try {
        // Get appointment details
        const appointment = await prisma.appointment.findUnique({
          where: { id: appointmentId },
          include: {
            contact: { select: { phone: true, name: true } },
            service: { select: { name: true } },
            tenant: { select: { businessName: true } },
          },
        });

        if (!appointment) {
          logger.warn({ appointmentId }, 'Appointment not found for reminder');
          return { skipped: true, reason: 'not_found' };
        }

        // Skip if cancelled
        if (appointment.status === 'CANCELLED') {
          logger.info({ appointmentId }, 'Skipping reminder for cancelled appointment');
          return { skipped: true, reason: 'cancelled' };
        }

        // Format reminder message
        const dateStr = format(appointment.scheduledAt, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es });
        const timeLabel = type === '24h' ? 'mañana' : 'en 1 hora';

        const message = `Hola ${appointment.contact.name ?? ''}! 👋

Te recordamos tu cita ${timeLabel}:

📅 ${dateStr}
${appointment.service ? `💼 Servicio: ${appointment.service.name}` : ''}
🏢 ${appointment.tenant.businessName}

¿Confirmas tu asistencia? Responde "Sí" para confirmar o "No" para cancelar.`;

        // Queue WhatsApp message
        await addWhatsAppSendJob({
          tenantId: appointment.tenantId,
          to: appointment.contact.phone,
          message,
        });

        // Mark reminder as sent
        await calendarService.markReminderSent(appointmentId, type);

        logger.info({ jobId: job.id, appointmentId }, 'Reminder sent successfully');

        return { sent: true, appointmentId };
      } catch (error) {
        logger.error({ error, jobId: job.id, appointmentId }, 'Reminder processing failed');
        throw error;
      }
    },
    {
      connection,
      concurrency: 10,
    }
  );

  worker.on('completed', (job) => {
    logger.debug({ jobId: job.id }, 'Reminder job completed');
  });

  worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, error: error.message }, 'Reminder job failed');
  });

  return worker;
}

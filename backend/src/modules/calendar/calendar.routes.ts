import { Router } from 'express';
import { z } from 'zod';
import { calendarService } from './calendar.service.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

export const calendarRoutes = Router();

calendarRoutes.use(authMiddleware);

// Get available slots
calendarRoutes.get('/slots', async (req, res, next) => {
  try {
    if (!req.context) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
      return;
    }
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const slots = await calendarService.getAvailableSlots(req.context.tenantId, date);
    res.json({ success: true, data: slots });
  } catch (error) { next(error); }
});

// Get appointments
calendarRoutes.get('/appointments', async (req, res, next) => {
  try {
    if (!req.context) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
      return;
    }
    const startDate = req.query.start ? new Date(req.query.start as string) : new Date();
    const endDate = req.query.end ? new Date(req.query.end as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const appointments = await calendarService.getAppointments(req.context.tenantId, startDate, endDate);
    res.json({ success: true, data: appointments });
  } catch (error) { next(error); }
});

// Create appointment
calendarRoutes.post('/appointments', async (req, res, next) => {
  try {
    if (!req.context) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
      return;
    }
    const schema = z.object({
      contactId: z.string(),
      serviceId: z.string().optional(),
      scheduledAt: z.string().transform(s => new Date(s)),
      duration: z.number().optional(),
      title: z.string(),
      description: z.string().optional(),
    });
    const parsed = schema.parse(req.body);
    const appointmentData: { contactId: string; scheduledAt: Date; title: string; serviceId?: string; duration?: number; description?: string } = {
      contactId: parsed.contactId,
      scheduledAt: parsed.scheduledAt,
      title: parsed.title,
    };
    if (parsed.serviceId) appointmentData.serviceId = parsed.serviceId;
    if (parsed.duration) appointmentData.duration = parsed.duration;
    if (parsed.description) appointmentData.description = parsed.description;
    
    const appointment = await calendarService.createAppointment(req.context.tenantId, appointmentData);
    res.status(201).json({ success: true, data: appointment });
  } catch (error) { next(error); }
});

// Update appointment status
calendarRoutes.patch('/appointments/:id/status', async (req, res, next) => {
  try {
    if (!req.context) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
      return;
    }
    const { status } = req.body as { status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' };
    const appointment = await calendarService.updateAppointmentStatus(req.context.tenantId, req.params.id ?? '', status);
    res.json({ success: true, data: appointment });
  } catch (error) { next(error); }
});

// Reschedule appointment
calendarRoutes.patch('/appointments/:id/reschedule', async (req, res, next) => {
  try {
    if (!req.context) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
      return;
    }
    const { scheduledAt } = req.body as { scheduledAt: string };
    const appointment = await calendarService.rescheduleAppointment(req.context.tenantId, req.params.id ?? '', new Date(scheduledAt));
    res.json({ success: true, data: appointment });
  } catch (error) { next(error); }
});

// Health check
calendarRoutes.get('/health', (_req, res) => {
  res.json({ module: 'calendar', status: 'ok' });
});

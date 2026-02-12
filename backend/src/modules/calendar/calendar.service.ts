// import { google } from 'googleapis'; // TODO: Enable later
import { prisma } from '../../config/database.js';
import { createModuleLogger } from '../../shared/utils/logger.js';
import { NotFoundError } from '../../shared/middleware/error.handler.js';
import { addMinutes, startOfDay, endOfDay } from 'date-fns';

const logger = createModuleLogger('calendar');

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface AppointmentData {
  contactId: string;
  serviceId?: string;
  scheduledAt: Date;
  duration?: number;
  title: string;
  description?: string;
}

export class CalendarService {
  /**
   * Get available time slots for a date
   */
  async getAvailableSlots(tenantId: string, date: Date): Promise<TimeSlot[]> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        workingHoursStart: true,
        workingHoursEnd: true,
        workingDays: true,
        timezone: true,
      },
    });

    if (!tenant) throw new NotFoundError('Tenant');

    // Check if it's a working day
    const dayOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];
    if (!tenant.workingDays.includes(dayOfWeek ?? '')) {
      return [];
    }

    // Get existing appointments for the day
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        tenantId,
        scheduledAt: {
          gte: startOfDay(date),
          lte: endOfDay(date),
        },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      select: { scheduledAt: true, duration: true },
    });

    // Generate slots
    const slots: TimeSlot[] = [];
    const [startHour, startMin] = tenant.workingHoursStart.split(':').map(Number);
    const [endHour, endMin] = tenant.workingHoursEnd.split(':').map(Number);

    const slotDuration = 30; // 30-minute slots
    let currentSlot = new Date(date);
    currentSlot.setHours(startHour ?? 9, startMin ?? 0, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(endHour ?? 18, endMin ?? 0, 0, 0);

    while (currentSlot < endTime) {
      const slotEnd = addMinutes(currentSlot, slotDuration);
      
      // Check if slot conflicts with existing appointments
      const isAvailable = !existingAppointments.some(apt => {
        const aptEnd = addMinutes(apt.scheduledAt, apt.duration);
        return currentSlot < aptEnd && slotEnd > apt.scheduledAt;
      });

      slots.push({
        start: new Date(currentSlot),
        end: slotEnd,
        available: isAvailable,
      });

      currentSlot = slotEnd;
    }

    return slots;
  }

  /**
   * Create an appointment
   */
  async createAppointment(tenantId: string, data: AppointmentData) {
    // Verify contact belongs to tenant
    const contact = await prisma.contact.findFirst({
      where: { id: data.contactId, tenantId },
    });

    if (!contact) throw new NotFoundError('Contact');

    // Get service duration if serviceId provided
    let duration = data.duration ?? 60;
    if (data.serviceId) {
      const service = await prisma.service.findFirst({
        where: { id: data.serviceId, tenantId },
      });
      if (service) duration = service.duration;
    }

    const createData: Record<string, unknown> = {
      tenantId,
      contactId: data.contactId,
      scheduledAt: data.scheduledAt,
      duration,
      title: data.title,
      status: 'SCHEDULED',
    };
    if (data.serviceId) createData.serviceId = data.serviceId;
    if (data.description) createData.description = data.description;

    const appointment = await prisma.appointment.create({
      data: createData as Parameters<typeof prisma.appointment.create>[0]['data'],
      include: {
        contact: { select: { name: true, phone: true } },
        service: { select: { name: true, price: true } },
      },
    });

    logger.info({ tenantId, appointmentId: appointment.id }, 'Appointment created');

    // TODO: Sync to Google Calendar if configured

    return appointment;
  }

  /**
   * Update appointment status
   */
  async updateAppointmentStatus(
    tenantId: string,
    appointmentId: string,
    status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  ) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId },
    });

    if (!appointment) throw new NotFoundError('Appointment');

    return prisma.appointment.update({
      where: { id: appointmentId },
      data: { status },
    });
  }

  /**
   * Get appointments for a date range
   */
  async getAppointments(tenantId: string, startDate: Date, endDate: Date) {
    return prisma.appointment.findMany({
      where: {
        tenantId,
        scheduledAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        contact: { select: { id: true, name: true, phone: true } },
        service: { select: { id: true, name: true, price: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  /**
   * Get upcoming appointments for a contact
   */
  async getContactAppointments(tenantId: string, contactId: string) {
    return prisma.appointment.findMany({
      where: {
        tenantId,
        contactId,
        scheduledAt: { gte: new Date() },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      include: {
        service: { select: { name: true, price: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  /**
   * Reschedule an appointment
   */
  async rescheduleAppointment(tenantId: string, appointmentId: string, newDate: Date) {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId },
    });

    if (!appointment) throw new NotFoundError('Appointment');

    return prisma.appointment.update({
      where: { id: appointmentId },
      data: { scheduledAt: newDate },
    });
  }

  /**
   * Get appointments needing reminders
   */
  async getAppointmentsForReminders(hoursAhead: number) {
    const now = new Date();
    const targetTime = addMinutes(now, hoursAhead * 60);
    const windowStart = addMinutes(targetTime, -15);
    const windowEnd = addMinutes(targetTime, 15);

    const reminderField = hoursAhead === 24 ? 'reminder24hSent' : 'reminder1hSent';

    return prisma.appointment.findMany({
      where: {
        scheduledAt: {
          gte: windowStart,
          lte: windowEnd,
        },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        [reminderField]: false,
      },
      include: {
        contact: { select: { phone: true, name: true } },
        service: { select: { name: true } },
        tenant: { select: { businessName: true } },
      },
    });
  }

  /**
   * Mark reminder as sent
   */
  async markReminderSent(appointmentId: string, type: '24h' | '1h') {
    const field = type === '24h' ? 'reminder24hSent' : 'reminder1hSent';
    return prisma.appointment.update({
      where: { id: appointmentId },
      data: { [field]: true },
    });
  }
}

export const calendarService = new CalendarService();

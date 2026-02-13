import { prisma } from '../../config/database.js';
import { createModuleLogger } from '../../shared/utils/logger.js';
import { AppError } from '../../shared/middleware/error.handler.js';
import type { TemplateCategory } from '@prisma/client';

const logger = createModuleLogger('templates');

// Pre-built templates by industry
const DEFAULT_TEMPLATES = [
  // Greeting templates
  {
    name: 'Saludo General',
    description: 'Saludo de bienvenida para cualquier negocio',
    category: 'GREETING' as TemplateCategory,
    industry: null,
    content: 'Hola {{name}}! Bienvenido a {{business}}. ¿En que puedo ayudarte hoy?',
    variables: ['name', 'business'],
    isGlobal: true,
  },
  {
    name: 'Saludo Salon de Belleza',
    description: 'Saludo especializado para salones',
    category: 'GREETING' as TemplateCategory,
    industry: 'salon',
    content: 'Hola {{name}}! Bienvenida a {{business}}. ¿Te gustaria agendar una cita o conocer nuestros servicios?',
    variables: ['name', 'business'],
    isGlobal: true,
  },
  {
    name: 'Saludo Restaurante',
    description: 'Saludo para restaurantes',
    category: 'GREETING' as TemplateCategory,
    industry: 'restaurant',
    content: 'Hola {{name}}! Gracias por contactar {{business}}. ¿Deseas hacer una reservacion o ver nuestro menu?',
    variables: ['name', 'business'],
    isGlobal: true,
  },
  // Appointment templates
  {
    name: 'Confirmacion de Cita',
    description: 'Confirmar una cita agendada',
    category: 'APPOINTMENT' as TemplateCategory,
    industry: null,
    content: 'Tu cita ha sido confirmada para el {{date}} a las {{time}}. Te esperamos en {{address}}. Si necesitas cambiarla, avisanos con anticipacion.',
    variables: ['date', 'time', 'address'],
    isGlobal: true,
  },
  {
    name: 'Recordatorio de Cita',
    description: 'Recordatorio 24 horas antes',
    category: 'APPOINTMENT' as TemplateCategory,
    industry: null,
    content: 'Hola {{name}}! Te recordamos que tienes una cita manana {{date}} a las {{time}}. ¿Confirmas tu asistencia?',
    variables: ['name', 'date', 'time'],
    isGlobal: true,
  },
  // Pricing templates
  {
    name: 'Lista de Precios',
    description: 'Respuesta con precios',
    category: 'PRICING' as TemplateCategory,
    industry: null,
    content: 'Estos son nuestros precios:\n\n{{price_list}}\n\n¿Te gustaria agendar alguno de estos servicios?',
    variables: ['price_list'],
    isGlobal: true,
  },
  // Hours templates
  {
    name: 'Horario de Atencion',
    description: 'Informar horarios',
    category: 'HOURS' as TemplateCategory,
    industry: null,
    content: 'Nuestro horario de atencion es:\n\n{{schedule}}\n\n¿En que horario te gustaria visitarnos?',
    variables: ['schedule'],
    isGlobal: true,
  },
  // Thanks templates
  {
    name: 'Agradecimiento',
    description: 'Agradecer al cliente',
    category: 'THANKS' as TemplateCategory,
    industry: null,
    content: 'Gracias por tu preferencia {{name}}! Fue un placer atenderte. Esperamos verte pronto.',
    variables: ['name'],
    isGlobal: true,
  },
  // Goodbye templates
  {
    name: 'Despedida',
    description: 'Despedida cordial',
    category: 'GOODBYE' as TemplateCategory,
    industry: null,
    content: 'Hasta pronto {{name}}! Si tienes alguna otra pregunta, no dudes en escribirnos. Que tengas un excelente dia!',
    variables: ['name'],
    isGlobal: true,
  },
];

export interface CreateTemplateInput {
  name: string;
  description?: string;
  category: TemplateCategory;
  industry?: string;
  content: string;
  variables?: string[];
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  industry?: string;
  content?: string;
  variables?: string[];
}

export class TemplatesService {
  /**
   * Get all templates (global + tenant-specific)
   */
  async getTemplates(tenantId: string, category?: TemplateCategory, industry?: string) {
    const where = {
      OR: [
        { isGlobal: true },
        { tenantId },
      ],
      ...(category && { category }),
      ...(industry && { industry }),
    };

    const templates = await prisma.responseTemplate.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { usageCount: 'desc' },
      ],
    });

    return templates;
  }

  /**
   * Get a single template
   */
  async getTemplate(id: string, tenantId: string) {
    const template = await prisma.responseTemplate.findFirst({
      where: {
        id,
        OR: [
          { isGlobal: true },
          { tenantId },
        ],
      },
    });

    if (!template) {
      throw new AppError(404, 'TEMPLATE_NOT_FOUND', 'Template not found');
    }

    return template;
  }

  /**
   * Create a custom template for a tenant
   */
  async createTemplate(tenantId: string, input: CreateTemplateInput) {
    const template = await prisma.responseTemplate.create({
      data: {
        ...input,
        variables: input.variables || [],
        tenantId,
        isGlobal: false,
      },
    });

    logger.info({ tenantId, templateId: template.id }, 'Template created');
    return template;
  }

  /**
   * Update a tenant's custom template
   */
  async updateTemplate(id: string, tenantId: string, input: UpdateTemplateInput) {
    // Verify ownership
    const existing = await prisma.responseTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new AppError(404, 'TEMPLATE_NOT_FOUND', 'Template not found or not owned by tenant');
    }

    const template = await prisma.responseTemplate.update({
      where: { id },
      data: input,
    });

    logger.info({ tenantId, templateId: id }, 'Template updated');
    return template;
  }

  /**
   * Delete a tenant's custom template
   */
  async deleteTemplate(id: string, tenantId: string) {
    // Verify ownership
    const existing = await prisma.responseTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new AppError(404, 'TEMPLATE_NOT_FOUND', 'Template not found or not owned by tenant');
    }

    await prisma.responseTemplate.delete({
      where: { id },
    });

    logger.info({ tenantId, templateId: id }, 'Template deleted');
  }

  /**
   * Use a template (increment usage count)
   */
  async useTemplate(id: string, tenantId: string) {
    const template = await this.getTemplate(id, tenantId);

    await prisma.responseTemplate.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });

    return template;
  }

  /**
   * Seed default templates (run once on setup)
   */
  async seedDefaultTemplates() {
    const existingCount = await prisma.responseTemplate.count({
      where: { isGlobal: true },
    });

    if (existingCount > 0) {
      logger.info('Default templates already exist, skipping seed');
      return;
    }

    await prisma.responseTemplate.createMany({
      data: DEFAULT_TEMPLATES,
    });

    logger.info({ count: DEFAULT_TEMPLATES.length }, 'Default templates seeded');
  }

  /**
   * Get template categories
   */
  getCategories() {
    return [
      { id: 'GREETING', name: 'Saludos', description: 'Mensajes de bienvenida' },
      { id: 'APPOINTMENT', name: 'Citas', description: 'Confirmaciones y recordatorios' },
      { id: 'PRICING', name: 'Precios', description: 'Listas de precios y cotizaciones' },
      { id: 'HOURS', name: 'Horarios', description: 'Horarios de atencion' },
      { id: 'LOCATION', name: 'Ubicacion', description: 'Direccion y como llegar' },
      { id: 'THANKS', name: 'Agradecimientos', description: 'Mensajes de agradecimiento' },
      { id: 'GOODBYE', name: 'Despedidas', description: 'Mensajes de despedida' },
      { id: 'FAQ', name: 'FAQ', description: 'Preguntas frecuentes' },
      { id: 'PROMOTION', name: 'Promociones', description: 'Ofertas y descuentos' },
      { id: 'CUSTOM', name: 'Personalizados', description: 'Templates personalizados' },
    ];
  }
}

export const templatesService = new TemplatesService();

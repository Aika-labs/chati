import { Router } from 'express';

export const docsRoutes = Router();

// OpenAPI spec
const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Chati Public API',
    description: 'API publica para integracion con agentes externos, automatizaciones y sistemas de terceros.',
    version: '1.0.0',
    contact: {
      name: 'Chati Support',
      email: 'api@chati.app',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1',
    },
  ],
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key obtenida desde el dashboard de Chati',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'INVALID_INPUT' },
              message: { type: 'string', example: 'phone is required' },
            },
          },
        },
      },
      Contact: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'clx123abc' },
          phone: { type: 'string', example: '+5215512345678' },
          name: { type: 'string', example: 'Juan Perez' },
          email: { type: 'string', example: 'juan@example.com' },
          notes: { type: 'string' },
          score: { type: 'integer', example: 0 },
          firstContactAt: { type: 'string', format: 'date-time' },
          lastContactAt: { type: 'string', format: 'date-time' },
        },
      },
      Message: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          direction: { type: 'string', enum: ['INBOUND', 'OUTBOUND'] },
          type: { type: 'string', enum: ['TEXT', 'IMAGE', 'DOCUMENT', 'AUDIO', 'VIDEO'] },
          content: { type: 'string' },
          waStatus: { type: 'string', enum: ['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED'] },
          isAiGenerated: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Conversation: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: { type: 'string', enum: ['OPEN', 'CLOSED', 'ARCHIVED'] },
          isAiEnabled: { type: 'boolean' },
          lastMessageAt: { type: 'string', format: 'date-time' },
          contact: { $ref: '#/components/schemas/Contact' },
        },
      },
      Appointment: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          scheduledAt: { type: 'string', format: 'date-time' },
          duration: { type: 'integer', description: 'Duracion en minutos' },
          status: { type: 'string', enum: ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] },
          contact: { $ref: '#/components/schemas/Contact' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          limit: { type: 'integer' },
          offset: { type: 'integer' },
        },
      },
    },
  },
  paths: {
    '/messages': {
      post: {
        summary: 'Enviar mensaje',
        description: 'Envia un mensaje de WhatsApp a un contacto',
        tags: ['Messages'],
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone', 'content'],
                properties: {
                  phone: { type: 'string', example: '+5215512345678', description: 'Numero de telefono con codigo de pais' },
                  content: { type: 'string', example: 'Hola! Gracias por contactarnos.' },
                  type: { type: 'string', enum: ['TEXT', 'IMAGE', 'DOCUMENT'], default: 'TEXT' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Mensaje enviado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        messageId: { type: 'string' },
                        conversationId: { type: 'string' },
                        contactId: { type: 'string' },
                        status: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/schemas/Error' },
          401: { description: 'API key invalida' },
          403: { description: 'Scope insuficiente' },
        },
      },
    },
    '/contacts': {
      get: {
        summary: 'Listar contactos',
        tags: ['Contacts'],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Buscar por nombre, telefono o email' },
        ],
        responses: {
          200: {
            description: 'Lista de contactos',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        contacts: { type: 'array', items: { $ref: '#/components/schemas/Contact' } },
                        pagination: { $ref: '#/components/schemas/Pagination' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Crear contacto',
        tags: ['Contacts'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone'],
                properties: {
                  phone: { type: 'string', example: '+5215512345678' },
                  name: { type: 'string', example: 'Juan Perez' },
                  email: { type: 'string', example: 'juan@example.com' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Contacto creado' },
          409: { description: 'Contacto ya existe' },
        },
      },
    },
    '/contacts/{id}': {
      get: {
        summary: 'Obtener contacto',
        tags: ['Contacts'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Contacto encontrado' },
          404: { description: 'Contacto no encontrado' },
        },
      },
      patch: {
        summary: 'Actualizar contacto',
        tags: ['Contacts'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Contacto actualizado' },
          404: { description: 'Contacto no encontrado' },
        },
      },
    },
    '/conversations': {
      get: {
        summary: 'Listar conversaciones',
        tags: ['Conversations'],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['OPEN', 'CLOSED', 'ARCHIVED'] } },
        ],
        responses: {
          200: { description: 'Lista de conversaciones' },
        },
      },
    },
    '/conversations/{id}': {
      get: {
        summary: 'Obtener conversacion',
        tags: ['Conversations'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Conversacion con mensajes' },
          404: { description: 'Conversacion no encontrada' },
        },
      },
    },
    '/conversations/{id}/close': {
      post: {
        summary: 'Cerrar conversacion',
        tags: ['Conversations'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Conversacion cerrada' },
        },
      },
    },
    '/conversations/{conversationId}/messages': {
      get: {
        summary: 'Obtener mensajes de conversacion',
        tags: ['Messages'],
        parameters: [
          { name: 'conversationId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: {
          200: { description: 'Lista de mensajes' },
        },
      },
    },
    '/appointments': {
      get: {
        summary: 'Listar citas',
        tags: ['Appointments'],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: {
          200: { description: 'Lista de citas' },
        },
      },
      post: {
        summary: 'Crear cita',
        tags: ['Appointments'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['contactId', 'scheduledAt'],
                properties: {
                  contactId: { type: 'string' },
                  serviceId: { type: 'string' },
                  scheduledAt: { type: 'string', format: 'date-time' },
                  duration: { type: 'integer', default: 60 },
                  title: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Cita creada' },
        },
      },
    },
    '/appointments/{id}': {
      get: {
        summary: 'Obtener cita',
        tags: ['Appointments'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Cita encontrada' },
          404: { description: 'Cita no encontrada' },
        },
      },
      patch: {
        summary: 'Actualizar cita',
        tags: ['Appointments'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  scheduledAt: { type: 'string', format: 'date-time' },
                  duration: { type: 'integer' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  status: { type: 'string', enum: ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Cita actualizada' },
        },
      },
    },
    '/appointments/{id}/cancel': {
      post: {
        summary: 'Cancelar cita',
        tags: ['Appointments'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Cita cancelada' },
        },
      },
    },
    '/analytics/stats': {
      get: {
        summary: 'Obtener estadisticas',
        tags: ['Analytics'],
        responses: {
          200: {
            description: 'Estadisticas del dashboard',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        totalContacts: { type: 'integer' },
                        totalConversations: { type: 'integer' },
                        openConversations: { type: 'integer' },
                        totalMessages: { type: 'integer' },
                        messagesThisMonth: { type: 'integer' },
                        appointmentsThisWeek: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  tags: [
    { name: 'Messages', description: 'Envio y lectura de mensajes' },
    { name: 'Contacts', description: 'Gestion de contactos' },
    { name: 'Conversations', description: 'Gestion de conversaciones' },
    { name: 'Appointments', description: 'Gestion de citas' },
    { name: 'Analytics', description: 'Estadisticas y reportes' },
  ],
};

// Serve OpenAPI spec as JSON
docsRoutes.get('/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

// Simple HTML documentation page
docsRoutes.get('/', (_req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chati API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '/api/docs/openapi.json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: 'BaseLayout'
      });
    };
  </script>
</body>
</html>
  `);
});

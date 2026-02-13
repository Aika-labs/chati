import { Router } from 'express';
import { apiKeyAuth, requireScope } from '../../shared/middleware/api-key.middleware.js';
import { publicApiController } from './public-api.controller.js';

export const publicApiRoutes = Router();

// All routes require API key authentication
publicApiRoutes.use(apiKeyAuth());

// ============================================
// MESSAGES
// ============================================

// Send a message
publicApiRoutes.post('/messages', requireScope('MESSAGES_WRITE'), (req, res, next) =>
  publicApiController.sendMessage(req, res, next)
);

// Get messages for a conversation
publicApiRoutes.get('/conversations/:conversationId/messages', requireScope('MESSAGES_READ'), (req, res, next) =>
  publicApiController.getMessages(req, res, next)
);

// ============================================
// CONTACTS
// ============================================

// List contacts
publicApiRoutes.get('/contacts', requireScope('CONTACTS_READ'), (req, res, next) =>
  publicApiController.listContacts(req, res, next)
);

// Get a contact
publicApiRoutes.get('/contacts/:id', requireScope('CONTACTS_READ'), (req, res, next) =>
  publicApiController.getContact(req, res, next)
);

// Create a contact
publicApiRoutes.post('/contacts', requireScope('CONTACTS_WRITE'), (req, res, next) =>
  publicApiController.createContact(req, res, next)
);

// Update a contact
publicApiRoutes.patch('/contacts/:id', requireScope('CONTACTS_WRITE'), (req, res, next) =>
  publicApiController.updateContact(req, res, next)
);

// ============================================
// CONVERSATIONS
// ============================================

// List conversations
publicApiRoutes.get('/conversations', requireScope('CONVERSATIONS_READ'), (req, res, next) =>
  publicApiController.listConversations(req, res, next)
);

// Get a conversation
publicApiRoutes.get('/conversations/:id', requireScope('CONVERSATIONS_READ'), (req, res, next) =>
  publicApiController.getConversation(req, res, next)
);

// Close a conversation
publicApiRoutes.post('/conversations/:id/close', requireScope('CONVERSATIONS_WRITE'), (req, res, next) =>
  publicApiController.closeConversation(req, res, next)
);

// ============================================
// APPOINTMENTS
// ============================================

// List appointments
publicApiRoutes.get('/appointments', requireScope('APPOINTMENTS_READ'), (req, res, next) =>
  publicApiController.listAppointments(req, res, next)
);

// Get an appointment
publicApiRoutes.get('/appointments/:id', requireScope('APPOINTMENTS_READ'), (req, res, next) =>
  publicApiController.getAppointment(req, res, next)
);

// Create an appointment
publicApiRoutes.post('/appointments', requireScope('APPOINTMENTS_WRITE'), (req, res, next) =>
  publicApiController.createAppointment(req, res, next)
);

// Update an appointment
publicApiRoutes.patch('/appointments/:id', requireScope('APPOINTMENTS_WRITE'), (req, res, next) =>
  publicApiController.updateAppointment(req, res, next)
);

// Cancel an appointment
publicApiRoutes.post('/appointments/:id/cancel', requireScope('APPOINTMENTS_WRITE'), (req, res, next) =>
  publicApiController.cancelAppointment(req, res, next)
);

// ============================================
// ANALYTICS
// ============================================

// Get dashboard stats
publicApiRoutes.get('/analytics/stats', requireScope('ANALYTICS_READ'), (req, res, next) =>
  publicApiController.getStats(req, res, next)
);

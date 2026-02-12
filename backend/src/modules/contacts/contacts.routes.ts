import { Router } from 'express';
import { contactsService } from './contacts.service.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

export const contactsRoutes = Router();

contactsRoutes.use(authMiddleware);

// Get contacts with pagination
contactsRoutes.get('/', async (req, res, next) => {
  try {
    if (!req.context) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
      return;
    }
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = req.query.search as string | undefined;
    const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;

    const filters: { search?: string; tags?: string[] } = {};
    if (search) filters.search = search;
    if (tags) filters.tags = tags;

    const result = await contactsService.getContacts(
      req.context.tenantId,
      { page, limit },
      filters
    );
    res.json({ success: true, ...result });
  } catch (error) { next(error); }
});

// Get single contact
contactsRoutes.get('/:id', async (req, res, next) => {
  try {
    if (!req.context) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
      return;
    }
    const contact = await contactsService.getContact(req.context.tenantId, req.params.id ?? '');
    res.json({ success: true, data: contact });
  } catch (error) { next(error); }
});

// Update contact
contactsRoutes.patch('/:id', async (req, res, next) => {
  try {
    if (!req.context) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
      return;
    }
    const contact = await contactsService.updateContact(req.context.tenantId, req.params.id ?? '', req.body);
    res.json({ success: true, data: contact });
  } catch (error) { next(error); }
});

// Add tag to contact
contactsRoutes.post('/:id/tags', async (req, res, next) => {
  try {
    if (!req.context) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
      return;
    }
    const { name } = req.body as { name: string };
    const tag = await contactsService.addTag(req.context.tenantId, req.params.id ?? '', name);
    res.json({ success: true, data: tag });
  } catch (error) { next(error); }
});

// Remove tag from contact
contactsRoutes.delete('/:id/tags/:tagId', async (req, res, next) => {
  try {
    if (!req.context) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
      return;
    }
    await contactsService.removeTag(req.context.tenantId, req.params.id ?? '', req.params.tagId ?? '');
    res.json({ success: true });
  } catch (error) { next(error); }
});

// Get conversation history
contactsRoutes.get('/:id/messages', async (req, res, next) => {
  try {
    if (!req.context) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
      return;
    }
    const limit = parseInt(req.query.limit as string) || 50;
    const messages = await contactsService.getConversationHistory(req.context.tenantId, req.params.id ?? '', limit);
    res.json({ success: true, data: messages });
  } catch (error) { next(error); }
});

// Get all tags
contactsRoutes.get('/meta/tags', async (req, res, next) => {
  try {
    if (!req.context) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
      return;
    }
    const tags = await contactsService.getTags(req.context.tenantId);
    res.json({ success: true, data: tags });
  } catch (error) { next(error); }
});

// Export contacts
contactsRoutes.get('/export/csv', async (req, res, next) => {
  try {
    if (!req.context) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
      return;
    }
    const csv = await contactsService.exportContacts(req.context.tenantId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
    res.send(csv);
  } catch (error) { next(error); }
});

// Health check
contactsRoutes.get('/health', (_req, res) => {
  res.json({ module: 'contacts', status: 'ok' });
});

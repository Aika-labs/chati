import { Router } from 'express';
import multer from 'multer';
import { knowledgeService } from './knowledge.service.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { env } from '../../config/env.js';

export const knowledgeRoutes = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 },
});

knowledgeRoutes.use(authMiddleware);

// Products
knowledgeRoutes.get('/products', async (req, res, next) => {
  try {
    if (!req.context) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
      return;
    }
    const products = await knowledgeService.getProducts(req.context.tenantId, req.query.category as string | undefined);
    res.json({ success: true, data: products });
  } catch (error) { next(error); }
});

knowledgeRoutes.post('/products', async (req, res, next) => {
  try {
    if (!req.context) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
      return;
    }
    const product = await knowledgeService.upsertProduct(req.context.tenantId, req.body);
    res.json({ success: true, data: product });
  } catch (error) { next(error); }
});

// Services
knowledgeRoutes.get('/services', async (req, res, next) => {
  try {
    if (!req.context) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
      return;
    }
    const services = await knowledgeService.getServices(req.context.tenantId);
    res.json({ success: true, data: services });
  } catch (error) { next(error); }
});

knowledgeRoutes.post('/services', async (req, res, next) => {
  try {
    if (!req.context) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
      return;
    }
    const service = await knowledgeService.upsertService(req.context.tenantId, req.body);
    res.json({ success: true, data: service });
  } catch (error) { next(error); }
});

// Import from Excel
knowledgeRoutes.post('/import/excel', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.context) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
      return;
    }
    if (!req.file) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'No file' } });
      return;
    }
    const result = await knowledgeService.importFromExcel(req.context.tenantId, req.file);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

// Sync from Google Sheets
knowledgeRoutes.post('/sync/sheets', async (req, res, next) => {
  try {
    if (!req.context) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Auth required' } });
      return;
    }
    const result = await knowledgeService.syncFromGoogleSheets(req.context.tenantId);
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

// Health check
knowledgeRoutes.get('/health', (_req, res) => {
  res.json({ module: 'knowledge', status: 'ok' });
});

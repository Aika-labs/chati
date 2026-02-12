import { Router } from 'express';
import multer from 'multer';
import { ragController } from './rag.controller.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';
import { env } from '../../config/env.js';

export const ragRoutes = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'text/plain',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  },
});

// All routes require authentication
ragRoutes.use(authMiddleware);

// Document management
ragRoutes.post('/upload', upload.single('file'), (req, res, next) => ragController.uploadDocument(req, res, next));
ragRoutes.get('/documents', (req, res, next) => ragController.listDocuments(req, res, next));
ragRoutes.delete('/documents/:documentId', (req, res, next) => ragController.deleteDocument(req, res, next));

// Search
ragRoutes.post('/search', (req, res, next) => ragController.search(req, res, next));

// Health check
ragRoutes.get('/health', (_req, res) => {
  res.json({ module: 'rag', status: 'ok' });
});

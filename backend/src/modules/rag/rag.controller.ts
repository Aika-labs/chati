import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ragService } from './rag.service.js';
import type { ApiResponse } from '../../shared/types/index.js';

const searchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().min(1).max(20).optional().default(5),
});

export class RAGController {
  /**
   * POST /api/rag/upload
   * Upload a document for RAG processing
   */
  async uploadDocument(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.context) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'No file uploaded' },
        });
        return;
      }

      const result = await ragService.uploadDocument(req.context.tenantId, req.file);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/rag/search
   * Search documents using semantic similarity
   */
  async search(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.context) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const input = searchSchema.parse(req.body);
      const results = await ragService.search(req.context.tenantId, input.query, input.limit);

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/rag/documents
   * List all documents for the tenant
   */
  async listDocuments(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.context) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const documents = await ragService.listDocuments(req.context.tenantId);

      res.json({
        success: true,
        data: documents,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/rag/documents/:documentId
   * Delete a document
   */
  async deleteDocument(
    req: Request,
    res: Response<ApiResponse>,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.context) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
        return;
      }

      const documentId = req.params.documentId;
      if (!documentId || typeof documentId !== 'string') {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Document ID required' },
        });
        return;
      }

      await ragService.deleteDocument(req.context.tenantId, documentId);

      res.json({
        success: true,
        data: { deleted: true },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const ragController = new RAGController();

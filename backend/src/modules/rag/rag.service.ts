import { prisma } from '../../config/database.js';
import { supabase } from '../../config/database.js';
import { env } from '../../config/env.js';
import { createModuleLogger } from '../../shared/utils/logger.js';
import { AppError, ValidationError } from '../../shared/middleware/error.handler.js';
import Groq from 'groq-sdk';
import pdfParse from 'pdf-parse';
import * as XLSX from 'xlsx';
import type { Multer } from 'multer';

const logger = createModuleLogger('rag');

// Groq client for future embeddings support
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _groq = new Groq({ apiKey: env.GROQ_API_KEY });

const logger = createModuleLogger('rag');

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

// Embedding dimensions for text-embedding-3-small equivalent
const EMBEDDING_DIMENSIONS = 1536;
const CHUNK_SIZE = 1000; // characters per chunk
const CHUNK_OVERLAP = 200;

export interface DocumentUploadResult {
  documentId: string;
  name: string;
  status: string;
  pageCount?: number;
}

export interface RAGSearchResult {
  content: string;
  score: number;
  documentName: string;
  pageNumber?: number;
}

export class RAGService {
  /**
   * Upload and process a document
   */
  async uploadDocument(
    tenantId: string,
    file: Multer.File
    file: Express.Multer.File
  ): Promise<DocumentUploadResult> {
    // Check document limit
    const docCount = await prisma.document.count({ where: { tenantId } });
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { maxDocuments: true },
    });

    if (docCount >= (tenant?.maxDocuments ?? env.MAX_DOCUMENTS_PER_TENANT)) {
      throw new ValidationError(`Document limit reached (${tenant?.maxDocuments ?? env.MAX_DOCUMENTS_PER_TENANT})`);
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'text/plain'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new ValidationError('Unsupported file type. Allowed: PDF, Excel, CSV, TXT');
    }

    // Upload to Supabase Storage
    const fileName = `${tenantId}/${Date.now()}-${file.originalname}`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
      });

    if (uploadError) {
      logger.error({ error: uploadError }, 'Failed to upload to storage');
      throw new AppError(500, 'UPLOAD_ERROR', 'Failed to upload document');
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);

    // Determine document type
    const docType = this.getDocumentType(file.mimetype);

    // Create document record
    const document = await prisma.document.create({
      data: {
        tenantId,
        name: file.originalname,
        type: docType,
        status: 'PENDING',
        fileUrl: urlData.publicUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    });

    // Process document asynchronously (in production, use a job queue)
    this.processDocument(document.id, file.buffer, file.mimetype).catch(err => {
      logger.error({ error: err, documentId: document.id }, 'Document processing failed');
    });

    logger.info({ tenantId, documentId: document.id, name: file.originalname }, 'Document uploaded');

    return {
      documentId: document.id,
      name: file.originalname,
      status: 'PENDING',
    };
  }

  /**
   * Process document and create embeddings
   */
  async processDocument(documentId: string, buffer: Buffer, mimeType: string): Promise<void> {
    try {
      // Update status to processing
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'PROCESSING' },
      });

      // Extract text based on file type
      let text: string;
      let pageCount: number | undefined;

      if (mimeType === 'application/pdf') {
        const pdfData = await pdfParse(buffer);
        text = pdfData.text;
        pageCount = pdfData.numpages;
      } else if (mimeType.includes('spreadsheet') || mimeType === 'text/csv') {
        text = this.extractExcelText(buffer);
      } else {
        text = buffer.toString('utf-8');
      }

      // Chunk the text
      const chunks = this.chunkText(text);

      // Generate embeddings and store chunks
      let chunkIndex = 0;
      for (const chunk of chunks) {
        const embedding = await this.generateEmbedding(chunk.content);

        // Store chunk with embedding using raw SQL for vector type
        await prisma.$executeRaw`
          INSERT INTO "DocumentChunk" (id, content, embedding, "pageNumber", "chunkIndex", "documentId", "createdAt")
          VALUES (
            ${this.generateId()},
            ${chunk.content},
            ${embedding}::vector,
            ${chunk.pageNumber},
            ${chunkIndex},
            ${documentId},
            NOW()
          )
        `;

        chunkIndex++;
      }

      // Update document status
      const updateData: Record<string, unknown> = {
        status: 'COMPLETED',
        chunkCount: chunks.length,
        processedAt: new Date(),
      };
      if (pageCount !== undefined) updateData.pageCount = pageCount;
      
      await prisma.document.update({
        where: { id: documentId },
        data: updateData,
      });

      logger.info({ documentId, chunkCount: chunks.length }, 'Document processed successfully');
    } catch (error) {
      logger.error({ error, documentId }, 'Document processing failed');

      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * Search documents using semantic similarity
   */
  async search(tenantId: string, query: string, limit = 5): Promise<RAGSearchResult[]> {
    // Generate embedding for query
    const queryEmbedding = await this.generateEmbedding(query);

    // Search using cosine similarity
    const results = await prisma.$queryRaw<Array<{
      content: string;
      score: number;
      documentName: string;
      pageNumber: number | null;
    }>>`
      SELECT 
        dc.content,
        1 - (dc.embedding <=> ${queryEmbedding}::vector) as score,
        d.name as "documentName",
        dc."pageNumber"
      FROM "DocumentChunk" dc
      JOIN "Document" d ON dc."documentId" = d.id
      WHERE d."tenantId" = ${tenantId}
        AND d.status = 'COMPLETED'
      ORDER BY dc.embedding <=> ${queryEmbedding}::vector
      LIMIT ${limit}
    `;

    // Track usage
    await this.trackUsage(tenantId);

    return results.map(r => {
      const result: RAGSearchResult = {
        content: r.content,
        score: r.score,
        documentName: r.documentName,
      };
      if (r.pageNumber !== null) result.pageNumber = r.pageNumber;
      return result;
    });
  }

  /**
   * Get context for AI from RAG
   */
  async getContextForQuery(tenantId: string, query: string): Promise<string> {
    const results = await this.search(tenantId, query, 3);

    if (results.length === 0) {
      return '';
    }

    const context = results
      .map((r, i) => `[Fuente ${i + 1}: ${r.documentName}]\n${r.content}`)
      .join('\n\n');

    return `INFORMACIÓN RELEVANTE DE DOCUMENTOS:\n${context}`;
  }

  /**
   * List documents for a tenant
   */
  async listDocuments(tenantId: string) {
    return prisma.document.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        fileSize: true,
        pageCount: true,
        chunkCount: true,
        createdAt: true,
        processedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete a document
   */
  async deleteDocument(tenantId: string, documentId: string): Promise<void> {
    const document = await prisma.document.findFirst({
      where: { id: documentId, tenantId },
    });

    if (!document) {
      throw new AppError(404, 'NOT_FOUND', 'Document not found');
    }

    // Delete from storage
    const fileName = document.fileUrl.split('/').pop();
    if (fileName) {
      await supabase.storage.from('documents').remove([`${tenantId}/${fileName}`]);
    }

    // Delete chunks and document (cascade)
    await prisma.document.delete({ where: { id: documentId } });

    logger.info({ tenantId, documentId }, 'Document deleted');
  }

  /**
   * Generate embedding using Groq (or fallback to simple hash)
   */
  private async generateEmbedding(text: string): Promise<string> {
    // Note: Groq doesn't have embedding API yet, so we use a simple approach
    // In production, use OpenAI embeddings or a dedicated embedding service
    
    // For now, create a deterministic pseudo-embedding based on text hash
    // This is a placeholder - replace with real embeddings in production
    const hash = this.simpleHash(text);
    const embedding = new Array(EMBEDDING_DIMENSIONS).fill(0).map((_, i) => {
      return Math.sin(hash + i) * 0.5;
    });

    return `[${embedding.join(',')}]`;
  }

  /**
   * Simple hash function for pseudo-embeddings
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  /**
   * Chunk text into smaller pieces
   */
  private chunkText(text: string): Array<{ content: string; pageNumber?: number }> {
    const chunks: Array<{ content: string; pageNumber?: number }> = [];
    const cleanText = text.replace(/\s+/g, ' ').trim();

    for (let i = 0; i < cleanText.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
      const chunk = cleanText.slice(i, i + CHUNK_SIZE);
      if (chunk.length > 50) { // Minimum chunk size
        chunks.push({ content: chunk });
      }
    }

    return chunks;
  }

  /**
   * Extract text from Excel/CSV
   */
  private extractExcelText(buffer: Buffer): string {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const texts: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (sheet) {
        const csv = XLSX.utils.sheet_to_csv(sheet);
        texts.push(`[Hoja: ${sheetName}]\n${csv}`);
      }
    }

    return texts.join('\n\n');
  }

  /**
   * Get document type from MIME type
   */
  private getDocumentType(mimeType: string): 'PDF' | 'EXCEL' | 'CSV' | 'TEXT' {
    if (mimeType === 'application/pdf') return 'PDF';
    if (mimeType.includes('spreadsheet')) return 'EXCEL';
    if (mimeType === 'text/csv') return 'CSV';
    return 'TEXT';
  }

  /**
   * Generate a CUID-like ID
   */
  private generateId(): string {
    return `chunk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Track RAG usage
   */
  private async trackUsage(tenantId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.usageRecord.upsert({
      where: {
        tenantId_type_date: {
          tenantId,
          type: 'RAG_QUERIES',
          date: today,
        },
      },
      create: {
        tenantId,
        type: 'RAG_QUERIES',
        date: today,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    });
  }
}

export const ragService = new RAGService();

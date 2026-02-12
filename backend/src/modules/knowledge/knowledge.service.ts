// import { google } from 'googleapis'; // TODO: Enable later
import * as XLSX from 'xlsx';
import { prisma } from '../../config/database.js';
import { supabase } from '../../config/database.js';
import { createModuleLogger } from '../../shared/utils/logger.js';
import { AppError } from '../../shared/middleware/error.handler.js';
import type { Multer } from 'multer';

const logger = createModuleLogger('knowledge');

export interface PriceListItem {
  name: string;
  description?: string;
  price: number;
  category?: string;
}

export class KnowledgeService {
  /**
   * Sync products/services from Google Sheets
   */
  async syncFromGoogleSheets(tenantId: string): Promise<{ synced: number }> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { googleSheetId: true, googleRefreshToken: true },
    });

    if (!tenant?.googleSheetId) {
      throw new AppError(400, 'NOT_CONFIGURED', 'Google Sheets not configured');
    }

    // TODO: Implement OAuth token refresh and Sheets API call
    // For now, return placeholder
    logger.info({ tenantId }, 'Google Sheets sync requested');

    return { synced: 0 };
  }

  /**
   * Import products from Excel file
   */
  async importFromExcel(tenantId: string, file: Multer.File): Promise<{ imported: number }> {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    
    if (!sheetName) {
      throw new AppError(400, 'INVALID_FILE', 'Excel file has no sheets');
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new AppError(400, 'INVALID_FILE', 'Could not read sheet');
    }

    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    let imported = 0;
    for (const row of data) {
      const name = String(row['nombre'] ?? row['name'] ?? row['Nombre'] ?? '');
      const price = parseFloat(String(row['precio'] ?? row['price'] ?? row['Precio'] ?? '0'));

      if (name && price > 0) {
        await prisma.product.upsert({
          where: {
            id: `${tenantId}-${name.toLowerCase().replace(/\s+/g, '-')}`,
          },
          create: {
            id: `${tenantId}-${name.toLowerCase().replace(/\s+/g, '-')}`,
            tenantId,
            name,
            description: String(row['descripcion'] ?? row['description'] ?? ''),
            price,
            category: String(row['categoria'] ?? row['category'] ?? ''),
            isActive: true,
          },
          update: {
            name,
            description: String(row['descripcion'] ?? row['description'] ?? ''),
            price,
            category: String(row['categoria'] ?? row['category'] ?? ''),
          },
        });
        imported++;
      }
    }

    logger.info({ tenantId, imported }, 'Products imported from Excel');

    return { imported };
  }

  /**
   * Get all products for a tenant
   */
  async getProducts(tenantId: string, category?: string) {
    return prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(category ? { category } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get all services for a tenant
   */
  async getServices(tenantId: string) {
    return prisma.service.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create or update a product
   */
  async upsertProduct(tenantId: string, data: {
    id?: string;
    name: string;
    description?: string;
    price: number;
    category?: string;
    imageUrl?: string;
  }) {
    if (data.id) {
      const updateData: Record<string, unknown> = { name: data.name, price: data.price };
      if (data.description !== undefined) updateData.description = data.description;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
      
      return prisma.product.update({
        where: { id: data.id },
        data: updateData,
      });
    }

    const createData: Record<string, unknown> = {
      tenantId,
      name: data.name,
      price: data.price,
      isActive: true,
    };
    if (data.description !== undefined) createData.description = data.description;
    if (data.category !== undefined) createData.category = data.category;
    if (data.imageUrl !== undefined) createData.imageUrl = data.imageUrl;

    return prisma.product.create({ data: createData as Parameters<typeof prisma.product.create>[0]['data'] });
  }

  /**
   * Create or update a service
   */
  async upsertService(tenantId: string, data: {
    id?: string;
    name: string;
    description?: string;
    price: number;
    duration?: number;
  }) {
    if (data.id) {
      const updateData: Record<string, unknown> = { name: data.name, price: data.price, duration: data.duration ?? 60 };
      if (data.description !== undefined) updateData.description = data.description;
      
      return prisma.service.update({
        where: { id: data.id },
        data: updateData,
      });
    }

    const createData: Record<string, unknown> = {
      tenantId,
      name: data.name,
      price: data.price,
      duration: data.duration ?? 60,
      isActive: true,
    };
    if (data.description !== undefined) createData.description = data.description;

    return prisma.service.create({ data: createData as Parameters<typeof prisma.service.create>[0]['data'] });
  }

  /**
   * Upload product image
   */
  async uploadProductImage(tenantId: string, productId: string, file: Multer.File): Promise<string> {
    const fileName = `${tenantId}/products/${productId}-${Date.now()}.${file.mimetype.split('/')[1]}`;

    const { error } = await supabase.storage
      .from('images')
      .upload(fileName, file.buffer, { contentType: file.mimetype });

    if (error) {
      throw new AppError(500, 'UPLOAD_ERROR', 'Failed to upload image');
    }

    const { data } = supabase.storage.from('images').getPublicUrl(fileName);

    await prisma.product.update({
      where: { id: productId },
      data: { imageUrl: data.publicUrl },
    });

    return data.publicUrl;
  }

  /**
   * Get price list formatted for AI context
   */
  async getPriceListContext(tenantId: string): Promise<string> {
    const [products, services] = await Promise.all([
      this.getProducts(tenantId),
      this.getServices(tenantId),
    ]);

    let context = 'LISTA DE PRECIOS:\n\n';

    if (services.length > 0) {
      context += 'SERVICIOS:\n';
      for (const s of services) {
        context += `- ${s.name}: $${s.price} (${s.duration} min)\n`;
        if (s.description) context += `  ${s.description}\n`;
      }
      context += '\n';
    }

    if (products.length > 0) {
      context += 'PRODUCTOS:\n';
      const byCategory = products.reduce((acc, p) => {
        const cat = p.category ?? 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(p);
        return acc;
      }, {} as Record<string, typeof products>);

      for (const [category, items] of Object.entries(byCategory)) {
        context += `\n[${category}]\n`;
        for (const p of items) {
          context += `- ${p.name}: $${p.price}\n`;
        }
      }
    }

    return context;
  }
}

export const knowledgeService = new KnowledgeService();

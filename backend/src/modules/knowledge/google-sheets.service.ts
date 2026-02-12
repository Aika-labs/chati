import { google, sheets_v4 } from 'googleapis';
import { prisma } from '../../config/database.js';
import { createModuleLogger } from '../../shared/utils/logger.js';
import { AppError } from '../../shared/middleware/error.handler.js';
import { googleOAuthService } from '../auth/google-oauth.service.js';

const logger = createModuleLogger('google-sheets');

export interface SheetProduct {
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
}

export interface SheetService {
  name: string;
  description: string;
  price: number;
  duration: number;
}

export interface SyncResult {
  products: number;
  services: number;
  errors: string[];
}

export class GoogleSheetsService {
  /**
   * Connect a Google Sheet to a tenant
   */
  async connectSheet(tenantId: string, sheetId: string): Promise<{ name: string }> {
    const auth = await googleOAuthService.getAuthenticatedClient(tenantId);
    const sheets = google.sheets({ version: 'v4', auth });

    // Verify access to the sheet
    const response = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    const sheetName = response.data.properties?.title ?? 'Unknown';

    // Save sheet ID to tenant
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { googleSheetId: sheetId },
    });

    logger.info({ tenantId, sheetId, sheetName }, 'Google Sheet connected');

    return { name: sheetName };
  }

  /**
   * Disconnect Google Sheet from tenant
   */
  async disconnectSheet(tenantId: string): Promise<void> {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { googleSheetId: null },
    });

    logger.info({ tenantId }, 'Google Sheet disconnected');
  }

  /**
   * Sync products and services from Google Sheet
   */
  async syncFromSheet(tenantId: string): Promise<SyncResult> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { googleSheetId: true, googleRefreshToken: true },
    });

    if (!tenant?.googleSheetId) {
      throw new AppError(400, 'NOT_CONFIGURED', 'Google Sheet not connected');
    }

    if (!tenant.googleRefreshToken) {
      throw new AppError(400, 'NOT_AUTHENTICATED', 'Google account not connected');
    }

    const auth = await googleOAuthService.getAuthenticatedClient(tenantId);
    const sheets = google.sheets({ version: 'v4', auth });

    const result: SyncResult = { products: 0, services: 0, errors: [] };

    // Try to read Products sheet
    try {
      const productsData = await this.readSheet(sheets, tenant.googleSheetId, 'Productos');
      if (productsData.length > 0) {
        result.products = await this.syncProducts(tenantId, productsData);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Products: ${msg}`);
      logger.warn({ tenantId, error: msg }, 'Failed to sync products');
    }

    // Try to read Services sheet
    try {
      const servicesData = await this.readSheet(sheets, tenant.googleSheetId, 'Servicios');
      if (servicesData.length > 0) {
        result.services = await this.syncServices(tenantId, servicesData);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Services: ${msg}`);
      logger.warn({ tenantId, error: msg }, 'Failed to sync services');
    }

    logger.info({ tenantId, ...result }, 'Google Sheets sync completed');

    return result;
  }

  /**
   * Push products and services to Google Sheet
   */
  async pushToSheet(tenantId: string): Promise<SyncResult> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { googleSheetId: true, googleRefreshToken: true },
    });

    if (!tenant?.googleSheetId) {
      throw new AppError(400, 'NOT_CONFIGURED', 'Google Sheet not connected');
    }

    if (!tenant.googleRefreshToken) {
      throw new AppError(400, 'NOT_AUTHENTICATED', 'Google account not connected');
    }

    const auth = await googleOAuthService.getAuthenticatedClient(tenantId);
    const sheets = google.sheets({ version: 'v4', auth });

    const result: SyncResult = { products: 0, services: 0, errors: [] };

    // Get products and services from database
    const [products, services] = await Promise.all([
      prisma.product.findMany({ where: { tenantId, isActive: true } }),
      prisma.service.findMany({ where: { tenantId, isActive: true } }),
    ]);

    // Push products
    try {
      await this.writeProductsSheet(sheets, tenant.googleSheetId, products);
      result.products = products.length;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Products: ${msg}`);
    }

    // Push services
    try {
      await this.writeServicesSheet(sheets, tenant.googleSheetId, services);
      result.services = services.length;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Services: ${msg}`);
    }

    logger.info({ tenantId, ...result }, 'Pushed data to Google Sheets');

    return result;
  }

  /**
   * Create a new Google Sheet with template structure
   */
  async createTemplateSheet(tenantId: string, title: string): Promise<{ sheetId: string; url: string }> {
    const auth = await googleOAuthService.getAuthenticatedClient(tenantId);
    const sheets = google.sheets({ version: 'v4', auth });

    // Create new spreadsheet
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets: [
          {
            properties: { title: 'Productos', index: 0 },
          },
          {
            properties: { title: 'Servicios', index: 1 },
          },
        ],
      },
    });

    const sheetId = response.data.spreadsheetId!;
    const url = response.data.spreadsheetUrl!;

    // Add headers to Products sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Productos!A1:E1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['Nombre', 'Descripción', 'Precio', 'Categoría', 'URL Imagen']],
      },
    });

    // Add headers to Services sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Servicios!A1:D1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['Nombre', 'Descripción', 'Precio', 'Duración (min)']],
      },
    });

    // Connect the sheet to tenant
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { googleSheetId: sheetId },
    });

    logger.info({ tenantId, sheetId }, 'Created template Google Sheet');

    return { sheetId, url };
  }

  /**
   * Get sheet info
   */
  async getSheetInfo(tenantId: string): Promise<{ id: string; name: string; url: string } | null> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { googleSheetId: true, googleRefreshToken: true },
    });

    if (!tenant?.googleSheetId || !tenant.googleRefreshToken) {
      return null;
    }

    try {
      const auth = await googleOAuthService.getAuthenticatedClient(tenantId);
      const sheets = google.sheets({ version: 'v4', auth });

      const response = await sheets.spreadsheets.get({
        spreadsheetId: tenant.googleSheetId,
      });

      return {
        id: tenant.googleSheetId,
        name: response.data.properties?.title ?? 'Unknown',
        url: response.data.spreadsheetUrl ?? `https://docs.google.com/spreadsheets/d/${tenant.googleSheetId}`,
      };
    } catch (error) {
      logger.warn({ tenantId, error }, 'Failed to get sheet info');
      return null;
    }
  }

  // ============================================
  // Private methods
  // ============================================

  private async readSheet(
    sheets: sheets_v4.Sheets,
    spreadsheetId: string,
    sheetName: string
  ): Promise<string[][]> {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const values = response.data.values ?? [];
    
    // Skip header row
    return values.slice(1);
  }

  private async syncProducts(tenantId: string, rows: string[][]): Promise<number> {
    let synced = 0;

    for (const row of rows) {
      const name = row[0]?.trim();
      const description = row[1]?.trim() ?? '';
      const priceStr = row[2]?.trim() ?? '0';
      const category = row[3]?.trim() ?? '';
      const imageUrl = row[4]?.trim();

      if (!name) continue;

      const price = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
      if (price <= 0) continue;

      const id = `${tenantId}-${name.toLowerCase().replace(/\s+/g, '-')}`;

      const data: {
        name: string;
        description: string;
        price: number;
        category: string;
        isActive: boolean;
        imageUrl?: string;
      } = {
        name,
        description,
        price,
        category,
        isActive: true,
      };
      if (imageUrl) data.imageUrl = imageUrl;

      await prisma.product.upsert({
        where: { id },
        create: { id, tenantId, ...data },
        update: data,
      });

      synced++;
    }

    return synced;
  }

  private async syncServices(tenantId: string, rows: string[][]): Promise<number> {
    let synced = 0;

    for (const row of rows) {
      const name = row[0]?.trim();
      const description = row[1]?.trim() ?? '';
      const priceStr = row[2]?.trim() ?? '0';
      const durationStr = row[3]?.trim() ?? '60';

      if (!name) continue;

      const price = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
      if (price <= 0) continue;

      const duration = parseInt(durationStr, 10) || 60;
      const id = `${tenantId}-svc-${name.toLowerCase().replace(/\s+/g, '-')}`;

      await prisma.service.upsert({
        where: { id },
        create: {
          id,
          tenantId,
          name,
          description,
          price,
          duration,
          isActive: true,
        },
        update: {
          name,
          description,
          price,
          duration,
        },
      });

      synced++;
    }

    return synced;
  }

  private async writeProductsSheet(
    sheets: sheets_v4.Sheets,
    spreadsheetId: string,
    products: Array<{ name: string; description: string | null; price: unknown; category: string | null; imageUrl: string | null }>
  ): Promise<void> {
    // Clear existing data (except header)
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Productos!A2:E1000',
    });

    if (products.length === 0) return;

    // Write new data
    const values = products.map(p => [
      p.name,
      p.description ?? '',
      String(p.price),
      p.category ?? '',
      p.imageUrl ?? '',
    ]);

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Productos!A2',
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  }

  private async writeServicesSheet(
    sheets: sheets_v4.Sheets,
    spreadsheetId: string,
    services: Array<{ name: string; description: string | null; price: unknown; duration: number }>
  ): Promise<void> {
    // Clear existing data (except header)
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Servicios!A2:D1000',
    });

    if (services.length === 0) return;

    // Write new data
    const values = services.map(s => [
      s.name,
      s.description ?? '',
      String(s.price),
      String(s.duration),
    ]);

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Servicios!A2',
      valueInputOption: 'RAW',
      requestBody: { values },
    });
  }
}

export const googleSheetsService = new GoogleSheetsService();

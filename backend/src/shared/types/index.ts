// Common types used across the application

export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'TRIAL';

export type PlanType = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface JwtPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RequestContext {
  userId: string;
  tenantId: string;
  tenant: {
    id: string;
    name: string;
    status: TenantStatus;
    plan: PlanType;
  };
}

// WhatsApp types
export interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'contacts' | 'interactive';
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string };
  document?: { id: string; mime_type: string; sha256: string; filename: string };
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: { display_phone_number: string; phone_number_id: string };
        contacts?: Array<{ profile: { name: string }; wa_id: string }>;
        messages?: WhatsAppMessage[];
        statuses?: Array<{
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

// AI types
export interface AIIntent {
  type: 'schedule' | 'reschedule' | 'cancel' | 'query_availability' | 'query_price' | 'query_info' | 'greeting' | 'other';
  confidence: number;
  entities: {
    date?: string;
    time?: string;
    service?: string;
    product?: string;
  };
}

export interface ConversationContext {
  tenantId: string;
  contactId: string;
  conversationId: string;
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  contactInfo: {
    name?: string;
    phone: string;
    tags: string[];
  };
  businessContext: {
    services: string[];
    workingHours: string;
    timezone: string;
  };
}

// RAG types
export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding: number[];
  metadata: {
    page?: number;
    section?: string;
    source: string;
  };
}

export interface RAGSearchResult {
  chunk: DocumentChunk;
  score: number;
}

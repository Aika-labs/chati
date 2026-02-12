// User & Auth
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'AGENT';
  avatarUrl?: string;
  tenantId: string;
}

export interface Tenant {
  id: string;
  businessName: string;
  slug: string;
  logoUrl?: string;
  plan: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  whatsappPhoneNumber?: string;
  timezone: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: string[];
}

export interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Contacts
export interface Contact {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  notes?: string;
  score: number;
  tags: Tag[];
  firstContactAt: string;
  lastContactAt: string;
  totalMessages: number;
  conversationCount?: number;
  appointmentCount?: number;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  contactCount?: number;
}

// Conversations & Messages
export interface Conversation {
  id: string;
  status: 'OPEN' | 'CLOSED' | 'ARCHIVED';
  isAiEnabled: boolean;
  aiTakenOver: boolean;
  currentIntent?: string;
  contact: Contact;
  lastMessage?: Message;
  lastMessageAt: string;
  unreadCount?: number;
}

export interface Message {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  type: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'AUDIO' | 'VIDEO' | 'LOCATION' | 'INTERACTIVE' | 'TEMPLATE';
  content?: string;
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  waStatus: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  isAiGenerated: boolean;
  aiIntent?: string;
  createdAt: string;
}

// Calendar
export interface Appointment {
  id: string;
  title: string;
  description?: string;
  scheduledAt: string;
  duration: number;
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  contact: Pick<Contact, 'id' | 'name' | 'phone'>;
  service?: Pick<Service, 'id' | 'name' | 'price'>;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

// Knowledge Base
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  imageUrl?: string;
  isActive: boolean;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  isActive: boolean;
}

export interface Document {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  pageCount?: number;
  chunkCount?: number;
  uploadedAt: string;
  processedAt?: string;
}

// Analytics
export interface DashboardStats {
  totalConversations: number;
  activeConversations: number;
  totalMessages: number;
  messagesThisMonth: number;
  totalContacts: number;
  newContactsThisMonth: number;
  appointmentsThisWeek: number;
  messageUsage: {
    used: number;
    limit: number;
    percent: number;
  };
}

// API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
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

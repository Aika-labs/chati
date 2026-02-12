import { z } from 'zod';

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000').transform(Number),
  HOST: z.string().default('0.0.0.0'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Database (Supabase)
  DATABASE_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_KEY: z.string().min(1),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // WhatsApp Cloud API
  WHATSAPP_ACCESS_TOKEN: z.string().min(1),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().min(1),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().min(1),

  // Groq AI
  GROQ_API_KEY: z.string().startsWith('gsk_'),

  // Google OAuth (for login, Calendar, Sheets)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),

  // Clerk Authentication
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_OUTBOUND_MESSAGES_PER_DAY: z.string().default('250').transform(Number),
  RATE_LIMIT_INBOUND_MESSAGES_PER_MINUTE: z.string().default('100').transform(Number),
  RATE_LIMIT_API_REQUESTS_PER_MINUTE: z.string().default('1000').transform(Number),

  // File Upload
  MAX_FILE_SIZE_MB: z.string().default('10').transform(Number),
  MAX_DOCUMENTS_PER_TENANT: z.string().default('50').transform(Number),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();

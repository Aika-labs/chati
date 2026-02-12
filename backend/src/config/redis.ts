import Redis from 'ioredis';
import { createModuleLogger } from '../shared/utils/logger.js';

const logger = createModuleLogger('redis');

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on('connect', () => {
  logger.info('Connected to Redis');
});

redis.on('error', (error) => {
  logger.error({ error }, 'Redis connection error');
});

// Parse Redis URL for BullMQ connection config
export function getRedisConnection(): { host: string; port: number } {
  const url = new globalThis.URL(REDIS_URL);
  return {
    host: url.hostname,
    port: parseInt(url.port || '6379', 10),
  };
}

export async function closeRedis(): Promise<void> {
  await redis.quit();
  logger.info('Redis connection closed');
}

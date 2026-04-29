// lib/redis.ts
import { Redis } from '@upstash/redis';

// For development without Redis, use in-memory fallback
const isDev = process.env.NODE_ENV === 'development';
const useRedis = !isDev && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: any;

if (useRedis) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  console.log('✅ Using Upstash Redis for production');
} else {
  // In-memory fallback for development
  console.log('📦 Using in-memory store (development mode)');
  const memoryStore = new Map();
  
  redis = {
    async hget(key: string, field: string) {
      const data = memoryStore.get(key);
      return data?.[field] || null;
    },
    async hset(key: string, data: Record<string, any>) {
      const existing = memoryStore.get(key) || {};
      memoryStore.set(key, { ...existing, ...data });
      return 1;
    },
    async hincrby(key: string, field: string, increment: number) {
      const existing = memoryStore.get(key) || {};
      const current = existing[field] || 0;
      existing[field] = current + increment;
      memoryStore.set(key, existing);
      return existing[field];
    },
    async expire(key: string, seconds: number) {
      // Simple implementation - in-memory doesn't auto-expire
      return 1;
    },
    async del(key: string) {
      memoryStore.delete(key);
      return 1;
    }
  };
}

export { redis };
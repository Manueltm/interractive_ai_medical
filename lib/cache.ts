// Create a cache utility
// lib/cache.ts
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function getCached(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

export function setCached(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}
// Cache Repository Implementation
import { ICacheRepository } from '../../domain/repositories/IChatRepository';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

export class CacheRepository implements ICacheRepository {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      value,
      expiresAt: now + (ttl * 1000), // Convert seconds to milliseconds
      createdAt: now
    };

    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  // Additional utility methods
  async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.cache.keys());
    
    if (!pattern) {
      return allKeys;
    }

    // Simple pattern matching (supports * wildcard)
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return allKeys.filter(key => regex.test(key));
  }

  async size(): Promise<number> {
    return this.cache.size;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return -2; // Key doesn't exist
    }

    const remaining = entry.expiresAt - Date.now();
    
    if (remaining <= 0) {
      this.cache.delete(key);
      return -2;
    }

    return Math.ceil(remaining / 1000); // Return seconds
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    entry.expiresAt = Date.now() + (ttl * 1000);
    return true;
  }

  async increment(key: string, delta: number = 1): Promise<number> {
    const current = await this.get<number>(key) || 0;
    const newValue = current + delta;
    await this.set(key, newValue);
    return newValue;
  }

  async decrement(key: string, delta: number = 1): Promise<number> {
    return this.increment(key, -delta);
  }

  // Cleanup expired entries
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));

    if (expiredKeys.length > 0) {
      console.log(`Cache cleanup: removed ${expiredKeys.length} expired entries`);
    }
  }

  // Get cache statistics
  async getStats(): Promise<{
    size: number;
    hitRate: number;
    memoryUsage: number;
    oldestEntry: number;
    newestEntry: number;
  }> {
    const entries = Array.from(this.cache.values());
    const now = Date.now();
    
    let oldestEntry = now;
    let newestEntry = 0;
    
    entries.forEach(entry => {
      if (entry.createdAt < oldestEntry) {
        oldestEntry = entry.createdAt;
      }
      if (entry.createdAt > newestEntry) {
        newestEntry = entry.createdAt;
      }
    });

    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses for real implementation
      memoryUsage: JSON.stringify(Array.from(this.cache.entries())).length,
      oldestEntry: oldestEntry === now ? 0 : oldestEntry,
      newestEntry
    };
  }

  // Cleanup on destruction
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}
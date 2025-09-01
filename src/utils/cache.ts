import logger from './logger';
import { performanceMonitor } from './performance';

// Cache configuration interface
interface CacheConfig {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  strategy: 'lru' | 'lfu' | 'fifo';
  persistent: boolean;
  compression: boolean;
}

// Cache entry interface
interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  compressed?: boolean;
}

// Cache statistics interface
interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
  memoryUsage: number;
}

// Default cache configurations
const defaultConfigs: Record<string, CacheConfig> = {
  memory: {
    maxSize: 100,
    ttl: 30 * 60 * 1000, // 30 minutes
    strategy: 'lru',
    persistent: false,
    compression: false
  },
  api: {
    maxSize: 50,
    ttl: 5 * 60 * 1000, // 5 minutes
    strategy: 'lru',
    persistent: true,
    compression: true
  },
  user: {
    maxSize: 20,
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    strategy: 'lfu',
    persistent: true,
    compression: false
  },
  static: {
    maxSize: 200,
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
    strategy: 'fifo',
    persistent: true,
    compression: true
  }
};

// Smart cache implementation
class SmartCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];
  private stats: CacheStats;
  private config: CacheConfig;
  private storageKey: string;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(name: string, config?: Partial<CacheConfig>) {
    this.config = { ...defaultConfigs.memory, ...config };
    this.storageKey = `cache_${name}`;
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      maxSize: this.config.maxSize,
      hitRate: 0,
      memoryUsage: 0
    };

    // Load from persistent storage if enabled
    if (this.config.persistent) {
      this.loadFromStorage();
    }

    // Setup cleanup interval
    this.setupCleanup();

    // Use console.log if logger is not available yet
    if (typeof logger !== 'undefined' && logger.debug) {
      logger.debug(`Cache initialized: ${name}`, {
        config: this.config,
        initialSize: this.cache.size
      });
    } else {
      console.log(`Cache initialized: ${name}`, {
        config: this.config,
        initialSize: this.cache.size
      });
    }
  }

  // Get value from cache
  public get(key: string): T | null {
    const startTime = performance.now();
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      
      performanceMonitor.addMetric({
        name: 'cache_miss',
        value: performance.now() - startTime,
        timestamp: Date.now(),
        type: 'timing',
        tags: { key, cache: this.storageKey }
      });

      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.updateAccessOrder(key);

    this.stats.hits++;
    this.updateHitRate();

    performanceMonitor.addMetric({
      name: 'cache_hit',
      value: performance.now() - startTime,
      timestamp: Date.now(),
      type: 'timing',
      tags: { key, cache: this.storageKey }
    });

    // Decompress if needed
    const value = entry.compressed ? this.decompress(entry.value) : entry.value;
    return value;
  }

  // Set value in cache
  public set(key: string, value: T, customTtl?: number): void {
    const startTime = performance.now();
    
    // Calculate entry size
    const size = this.calculateSize(value);
    
    // Compress if enabled and value is large enough
    const shouldCompress = this.config.compression && size > 1024; // 1KB threshold
    const finalValue = shouldCompress ? this.compress(value) : value;
    
    const entry: CacheEntry<T> = {
      key,
      value: finalValue,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      size: shouldCompress ? this.calculateSize(finalValue) : size,
      compressed: shouldCompress
    };

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Ensure we have space
    this.ensureSpace(entry.size);

    // Add new entry
    this.cache.set(key, entry);
    this.accessOrder.push(key);
    this.stats.size++;
    this.updateMemoryUsage();

    // Persist to storage if enabled
    if (this.config.persistent) {
      this.saveToStorage();
    }

    performanceMonitor.addMetric({
      name: 'cache_set',
      value: performance.now() - startTime,
      timestamp: Date.now(),
      type: 'timing',
      tags: { key, cache: this.storageKey, compressed: shouldCompress }
    });

    // Use console.log if logger is not available yet
    if (typeof logger !== 'undefined' && logger.debug) {
      logger.debug(`Cache entry set: ${key}`, {
        size: entry.size,
        compressed: shouldCompress,
        cacheSize: this.cache.size
      });
    }
  }

  // Delete entry from cache
  public delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    this.cache.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.stats.size--;
    this.updateMemoryUsage();

    if (this.config.persistent) {
      this.saveToStorage();
    }

    return true;
  }

  // Check if key exists in cache
  public has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  // Clear entire cache
  public clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.stats.size = 0;
    this.stats.memoryUsage = 0;

    if (this.config.persistent) {
      localStorage.removeItem(this.storageKey);
    }

    // Use console.log if logger is not available yet
    if (typeof logger !== 'undefined' && logger.debug) {
      logger.debug(`Cache cleared: ${this.storageKey}`);
    }
  }

  // Get cache statistics
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  // Get all keys
  public keys(): string[] {
    return Array.from(this.cache.keys()).filter(key => {
      const entry = this.cache.get(key);
      return entry && !this.isExpired(entry);
    });
  }

  // Get cache size
  public size(): number {
    return this.cache.size;
  }

  // Cleanup expired entries
  public cleanup(): void {
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.delete(key));

    if (expiredKeys.length > 0) {
      logger.debug(`Cache cleanup completed`, {
        cache: this.storageKey,
        expiredEntries: expiredKeys.length,
        remainingEntries: this.cache.size
      });
    }
  }

  // Private methods
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > this.config.ttl;
  }

  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  private ensureSpace(requiredSize: number): void {
    while (this.cache.size >= this.config.maxSize) {
      const keyToEvict = this.selectEvictionKey();
      if (keyToEvict) {
        this.delete(keyToEvict);
      } else {
        break;
      }
    }
  }

  private selectEvictionKey(): string | null {
    if (this.cache.size === 0) {
      return null;
    }

    switch (this.config.strategy) {
      case 'lru': { // Least Recently Used
        return this.accessOrder[0] || null;
      }
      
      case 'lfu': { // Least Frequently Used
        let minAccessCount = Infinity;
        let leastUsedKey: string | null = null;
        
        for (const [key, entry] of this.cache.entries()) {
          if (entry.accessCount < minAccessCount) {
            minAccessCount = entry.accessCount;
            leastUsedKey = key;
          }
        }
        return leastUsedKey;
      }
      
      case 'fifo': { // First In, First Out
        return this.cache.keys().next().value || null;
      }
      
      default: {
        return this.accessOrder[0] || null;
      }
    }
  }

  private calculateSize(value: any): number {
    try {
      return new Blob([JSON.stringify(value)]).size;
    } catch {
      return JSON.stringify(value).length * 2; // Rough estimate
    }
  }

  private compress(value: T): T {
    // Simple compression using JSON stringify with reduced whitespace
    // In a real implementation, you might use a proper compression library
    try {
      const jsonString = JSON.stringify(value);
      return JSON.parse(jsonString) as T;
    } catch {
      return value;
    }
  }

  private decompress(value: T): T {
    // Simple decompression - in this case, just return the value
    // In a real implementation, you would decompress using the same library
    return value;
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  private updateMemoryUsage(): void {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    this.stats.memoryUsage = totalSize;
  }

  private setupCleanup(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.entries && Array.isArray(data.entries)) {
          data.entries.forEach((entry: CacheEntry<T>) => {
            if (!this.isExpired(entry)) {
              this.cache.set(entry.key, entry);
              this.accessOrder.push(entry.key);
            }
          });
          this.stats.size = this.cache.size;
          this.updateMemoryUsage();
        }
      }
    } catch (error) {
      logger.warn('Failed to load cache from storage', {
        cache: this.storageKey,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        entries: Array.from(this.cache.values()),
        timestamp: Date.now()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      logger.warn('Failed to save cache to storage', {
        cache: this.storageKey,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Cleanup on destruction
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Cache manager for multiple cache instances
class CacheManager {
  private caches = new Map<string, SmartCache>();

  // Get or create cache instance
  public getCache<T = any>(name: string, config?: Partial<CacheConfig>): SmartCache<T> {
    if (!this.caches.has(name)) {
      const cache = new SmartCache<T>(name, config);
      this.caches.set(name, cache as SmartCache);
    }
    return this.caches.get(name) as SmartCache<T>;
  }

  // Get all cache statistics
  public getAllStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    for (const [name, cache] of this.caches.entries()) {
      stats[name] = cache.getStats();
    }
    return stats;
  }

  // Cleanup all caches
  public cleanupAll(): void {
    for (const cache of this.caches.values()) {
      cache.cleanup();
    }
  }

  // Clear all caches
  public clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  // Destroy all caches
  public destroyAll(): void {
    for (const cache of this.caches.values()) {
      cache.destroy();
    }
    this.caches.clear();
  }
}

// Global cache manager instance
export const cacheManager = new CacheManager();

// Predefined cache instances
export const apiCache = cacheManager.getCache('api', defaultConfigs.api);
export const userCache = cacheManager.getCache('user', defaultConfigs.user);
export const staticCache = cacheManager.getCache('static', defaultConfigs.static);

// Cache utilities
export const cacheUtils = {
  // Create a memoized function with caching
  memoize: <T extends (...args: any[]) => any>(
    fn: T,
    keyGenerator?: (...args: Parameters<T>) => string,
    cacheName = 'memoized'
  ): T => {
    const cache = cacheManager.getCache(cacheName);
    
    return ((...args: Parameters<T>) => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      
      let result = cache.get(key);
      if (result === null) {
        result = fn(...args);
        cache.set(key, result);
      }
      
      return result;
    }) as T;
  },

  // Cache API responses
  cacheApiResponse: async <T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> => {
    let result = apiCache.get(key);
    
    if (result === null) {
      result = await fetcher();
      apiCache.set(key, result, ttl);
    }
    
    return result;
  },

  // Cache with retry logic
  cacheWithRetry: async <T>(
    key: string,
    fetcher: () => Promise<T>,
    retries = 3,
    cacheName = 'api'
  ): Promise<T> => {
    const cache = cacheManager.getCache(cacheName);
    let result = cache.get(key);
    
    if (result !== null) {
      return result;
    }

    let lastError: Error | null = null;
    
    for (let i = 0; i < retries; i++) {
      try {
        result = await fetcher();
        cache.set(key, result);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }
    
    throw lastError;
  }
};

export { SmartCache, CacheManager, type CacheConfig, type CacheEntry, type CacheStats };
// Advanced Caching Service - Enterprise Level
// Implements multiple caching strategies with TTL, LRU, and persistence

// Types
interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  totalSize: number;
  entryCount: number;
  hitRate: number;
  avgAccessTime: number;
}

interface CacheConfig {
  maxSize: number; // Maximum cache size in bytes
  maxEntries: number; // Maximum number of entries
  defaultTTL: number; // Default TTL in milliseconds
  cleanupInterval: number; // Cleanup interval in milliseconds
  persistToDisk: boolean; // Whether to persist cache to localStorage
  compressionEnabled: boolean; // Enable compression for large values
  encryptionEnabled: boolean; // Enable encryption for sensitive data
}

interface CacheStrategy {
  name: string;
  shouldEvict: (entries: Map<string, CacheEntry>) => string[];
}

// Cache Strategies
class LRUStrategy implements CacheStrategy {
  name = 'LRU';
  
  shouldEvict(entries: Map<string, CacheEntry>): string[] {
    const sortedEntries = Array.from(entries.values())
      .sort((a, b) => a.lastAccessed - b.lastAccessed);
    
    return [sortedEntries[0]?.key].filter(Boolean);
  }
}

class LFUStrategy implements CacheStrategy {
  name = 'LFU';
  
  shouldEvict(entries: Map<string, CacheEntry>): string[] {
    const sortedEntries = Array.from(entries.values())
      .sort((a, b) => a.accessCount - b.accessCount);
    
    return [sortedEntries[0]?.key].filter(Boolean);
  }
}

class TTLStrategy implements CacheStrategy {
  name = 'TTL';
  
  shouldEvict(entries: Map<string, CacheEntry>): string[] {
    const now = Date.now();
    return Array.from(entries.values())
      .filter(entry => now - entry.timestamp > entry.ttl)
      .map(entry => entry.key);
  }
}

class PriorityStrategy implements CacheStrategy {
  name = 'Priority';
  
  shouldEvict(entries: Map<string, CacheEntry>): string[] {
    const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    const sortedEntries = Array.from(entries.values())
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    
    return [sortedEntries[0]?.key].filter(Boolean);
  }
}

// Advanced Cache Service
class AdvancedCacheService {
  private cache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    totalSize: 0,
    entryCount: 0,
    hitRate: 0,
    avgAccessTime: 0
  };
  
  private config: CacheConfig = {
    maxSize: 50 * 1024 * 1024, // 50MB
    maxEntries: 10000,
    defaultTTL: 30 * 60 * 1000, // 30 minutes
    cleanupInterval: 5 * 60 * 1000, // 5 minutes
    persistToDisk: true,
    compressionEnabled: true,
    encryptionEnabled: false
  };
  
  private strategies: CacheStrategy[] = [
    new TTLStrategy(),
    new LRUStrategy(),
    new LFUStrategy(),
    new PriorityStrategy()
  ];
  
  private cleanupTimer?: NodeJS.Timeout;
  private accessTimes: number[] = [];

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.startCleanupTimer();
    this.loadFromPersistence();
  }

  // Core Cache Operations
  set<T>(
    key: string, 
    value: T, 
    options: {
      ttl?: number;
      tags?: string[];
      priority?: CacheEntry['priority'];
    } = {}
  ): boolean {
    const startTime = performance.now();
    
    try {
      const serializedValue = this.serialize(value);
      const size = this.calculateSize(serializedValue);
      
      // Check if we need to make space
      if (this.shouldEvict(size)) {
        this.evictEntries();
      }
      
      const entry: CacheEntry<T> = {
        key,
        value: serializedValue,
        timestamp: Date.now(),
        ttl: options.ttl || this.config.defaultTTL,
        accessCount: 0,
        lastAccessed: Date.now(),
        size,
        tags: options.tags || [],
        priority: options.priority || 'medium'
      };
      
      // Remove existing entry if it exists
      if (this.cache.has(key)) {
        const oldEntry = this.cache.get(key)!;
        this.stats.totalSize -= oldEntry.size;
      } else {
        this.stats.entryCount++;
      }
      
      this.cache.set(key, entry);
      this.stats.totalSize += size;
      this.stats.sets++;
      
      this.updateAccessTime(performance.now() - startTime);
      this.persistToDisk();
      
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  get<T>(key: string): T | null {
    const startTime = performance.now();
    
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
    
    // Check TTL
    if (this.isExpired(entry)) {
      this.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
    
    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    this.stats.hits++;
    this.updateHitRate();
    this.updateAccessTime(performance.now() - startTime);
    
    return this.deserialize<T>(entry.value);
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (entry) {
      this.cache.delete(key);
      this.stats.totalSize -= entry.size;
      this.stats.entryCount--;
      this.stats.deletes++;
      this.persistToDisk();
      return true;
    }
    
    return false;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? !this.isExpired(entry) : false;
  }

  clear(): void {
    this.cache.clear();
    this.stats.totalSize = 0;
    this.stats.entryCount = 0;
    this.persistToDisk();
  }

  // Advanced Operations
  getByTag(tag: string): Array<{ key: string; value: any }> {
    const results: Array<{ key: string; value: any }> = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag) && !this.isExpired(entry)) {
        results.push({
          key,
          value: this.deserialize(entry.value)
        });
      }
    }
    
    return results;
  }

  deleteByTag(tag: string): number {
    let deletedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.delete(key);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    options?: {
      ttl?: number;
      tags?: string[];
      priority?: CacheEntry['priority'];
    }
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      try {
        // Try to get from cache first
        const cached = this.get<T>(key);
        if (cached !== null) {
          resolve(cached);
          return;
        }
        
        // Generate new value
        const value = await factory();
        this.set(key, value, options);
        resolve(value);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Batch Operations
  mget(keys: string[]): Record<string, any> {
    const results: Record<string, any> = {};
    
    for (const key of keys) {
      const value = this.get(key);
      if (value !== null) {
        results[key] = value;
      }
    }
    
    return results;
  }

  mset(entries: Array<{ key: string; value: any; options?: any }>): boolean[] {
    return entries.map(({ key, value, options }) => 
      this.set(key, value, options)
    );
  }

  // Statistics and Monitoring
  getStats(): CacheStats {
    return { ...this.stats };
  }

  getDetailedStats(): {
    stats: CacheStats;
    entries: Array<{
      key: string;
      size: number;
      accessCount: number;
      lastAccessed: Date;
      ttl: number;
      tags: string[];
      priority: string;
    }>;
    topKeys: Array<{ key: string; accessCount: number }>;
    memoryUsage: {
      used: number;
      available: number;
      percentage: number;
    };
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      size: entry.size,
      accessCount: entry.accessCount,
      lastAccessed: new Date(entry.lastAccessed),
      ttl: entry.ttl,
      tags: entry.tags,
      priority: entry.priority
    }));
    
    const topKeys = entries
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10)
      .map(({ key, accessCount }) => ({ key, accessCount }));
    
    return {
      stats: this.getStats(),
      entries,
      topKeys,
      memoryUsage: {
        used: this.stats.totalSize,
        available: this.config.maxSize - this.stats.totalSize,
        percentage: (this.stats.totalSize / this.config.maxSize) * 100
      }
    };
  }

  // Cache Warming
  async warmCache(entries: Array<{ key: string; factory: () => Promise<any> | any; options?: any }>): Promise<void> {
    const promises = entries.map(async ({ key, factory, options }) => {
      try {
        const value = await factory();
        this.set(key, value, options);
      } catch (error) {
        console.error(`Failed to warm cache for key ${key}:`, error);
      }
    });
    
    await Promise.allSettled(promises);
  }

  // Private Methods
  private shouldEvict(newEntrySize: number): boolean {
    return (
      this.stats.totalSize + newEntrySize > this.config.maxSize ||
      this.stats.entryCount >= this.config.maxEntries
    );
  }

  private evictEntries(): void {
    for (const strategy of this.strategies) {
      const keysToEvict = strategy.shouldEvict(this.cache);
      
      for (const key of keysToEvict) {
        if (this.cache.has(key)) {
          const entry = this.cache.get(key)!;
          this.cache.delete(key);
          this.stats.totalSize -= entry.size;
          this.stats.entryCount--;
          this.stats.evictions++;
        }
      }
      
      // Check if we have enough space now
      if (this.stats.totalSize < this.config.maxSize * 0.8) {
        break;
      }
    }
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private serialize<T>(value: T): any {
    if (this.config.compressionEnabled && typeof value === 'string' && value.length > 1000) {
      // Simple compression simulation (in real implementation, use actual compression)
      return { __compressed: true, data: value };
    }
    
    if (this.config.encryptionEnabled) {
      // Simple encryption simulation (in real implementation, use actual encryption)
      return { __encrypted: true, data: value };
    }
    
    return value;
  }

  private deserialize<T>(value: any): T {
    if (value && typeof value === 'object') {
      if (value.__compressed) {
        return value.data;
      }
      
      if (value.__encrypted) {
        return value.data;
      }
    }
    
    return value;
  }

  private calculateSize(value: any): number {
    try {
      return JSON.stringify(value).length * 2; // Rough estimate (UTF-16)
    } catch {
      return 1000; // Default size for non-serializable values
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  private updateAccessTime(time: number): void {
    this.accessTimes.push(time);
    
    // Keep only last 1000 access times
    if (this.accessTimes.length > 1000) {
      this.accessTimes = this.accessTimes.slice(-1000);
    }
    
    this.stats.avgAccessTime = this.accessTimes.reduce((a, b) => a + b, 0) / this.accessTimes.length;
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const ttlStrategy = new TTLStrategy();
    const expiredKeys = ttlStrategy.shouldEvict(this.cache);
    
    for (const key of expiredKeys) {
      this.delete(key);
    }
  }

  private persistToDisk(): void {
    if (!this.config.persistToDisk || typeof localStorage === 'undefined') {
      return;
    }
    
    try {
      const cacheData = {
        entries: Array.from(this.cache.entries()),
        stats: this.stats,
        timestamp: Date.now()
      };
      
      localStorage.setItem('advanced-cache', JSON.stringify(cacheData));
    } catch (error) {
      console.error('Failed to persist cache:', error);
    }
  }

  private loadFromPersistence(): void {
    if (!this.config.persistToDisk || typeof localStorage === 'undefined') {
      return;
    }
    
    try {
      const stored = localStorage.getItem('advanced-cache');
      if (!stored) return;
      
      const cacheData = JSON.parse(stored);
      
      // Check if cache is not too old (24 hours)
      if (Date.now() - cacheData.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('advanced-cache');
        return;
      }
      
      // Restore cache entries
      for (const [key, entry] of cacheData.entries) {
        if (!this.isExpired(entry)) {
          this.cache.set(key, entry);
        }
      }
      
      // Restore stats (but reset counters)
      this.stats = {
        ...cacheData.stats,
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        evictions: 0
      };
    } catch (error) {
      console.error('Failed to load cache from persistence:', error);
      localStorage.removeItem('advanced-cache');
    }
  }

  // Cleanup
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.clear();
  }
}

// Cache Manager - Singleton pattern
class CacheManager {
  private static instance: CacheManager;
  private caches = new Map<string, AdvancedCacheService>();

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  getCache(name: string, config?: Partial<CacheConfig>): AdvancedCacheService {
    if (!this.caches.has(name)) {
      this.caches.set(name, new AdvancedCacheService(config));
    }
    return this.caches.get(name)!;
  }

  removeCache(name: string): boolean {
    const cache = this.caches.get(name);
    if (cache) {
      cache.destroy();
      return this.caches.delete(name);
    }
    return false;
  }

  getAllCaches(): string[] {
    return Array.from(this.caches.keys());
  }

  getGlobalStats(): {
    totalCaches: number;
    totalEntries: number;
    totalSize: number;
    avgHitRate: number;
  } {
    const caches = Array.from(this.caches.values());
    const stats = caches.map(cache => cache.getStats());
    
    return {
      totalCaches: caches.length,
      totalEntries: stats.reduce((sum, stat) => sum + stat.entryCount, 0),
      totalSize: stats.reduce((sum, stat) => sum + stat.totalSize, 0),
      avgHitRate: stats.length > 0 
        ? stats.reduce((sum, stat) => sum + stat.hitRate, 0) / stats.length 
        : 0
    };
  }
}

// Export instances
export const cacheManager = CacheManager.getInstance();

// Default cache instances
export const apiCache = cacheManager.getCache('api', {
  maxSize: 10 * 1024 * 1024, // 10MB
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  persistToDisk: true
});

export const userCache = cacheManager.getCache('user', {
  maxSize: 5 * 1024 * 1024, // 5MB
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  persistToDisk: true
});

export const sessionCache = cacheManager.getCache('session', {
  maxSize: 2 * 1024 * 1024, // 2MB
  defaultTTL: 60 * 60 * 1000, // 1 hour
  persistToDisk: false // Session cache shouldn't persist
});

export { AdvancedCacheService, CacheManager };
export type { CacheEntry, CacheStats, CacheConfig, CacheStrategy };
/**
 * Advanced Caching System
 * Provides comprehensive caching solutions for enterprise performance
 */

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size
  serialize?: boolean; // Whether to serialize data
  compress?: boolean; // Whether to compress data
  persistent?: boolean; // Whether to persist to localStorage
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  size: number;
}

/**
 * Memory Cache with LRU eviction
 */
export class MemoryCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder = new Map<string, number>();
  private currentSize = 0;
  private accessCounter = 0;

  constructor(
    private maxSize: number = 100,
    private defaultTTL: number = 5 * 60 * 1000 // 5 minutes
  ) {}

  set(key: string, value: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.defaultTTL;
    const size = this.calculateSize(value);
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      size
    };

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.currentSize -= this.cache.get(key)!.size;
    }

    // Evict entries if necessary
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
    this.currentSize += size;

    // Persist to localStorage if requested
    if (options.persistent) {
      this.persistToStorage(key, entry);
    }
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      // Try to load from localStorage
      const persistedEntry = this.loadFromStorage(key);
      if (persistedEntry && !this.isExpired(persistedEntry)) {
        this.cache.set(key, persistedEntry);
        this.accessOrder.set(key, ++this.accessCounter);
        persistedEntry.hits++;
        return persistedEntry.data;
      }
      return null;
    }

    if (this.isExpired(entry)) {
      this.delete(key);
      return null;
    }

    // Update access order and hit count
    this.accessOrder.set(key, ++this.accessCounter);
    entry.hits++;
    
    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? !this.isExpired(entry) : false;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSize -= entry.size;
      this.cache.delete(key);
      this.accessOrder.delete(key);
      localStorage.removeItem(`cache_${key}`);
      return true;
    }
    return false;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.currentSize = 0;
    this.accessCounter = 0;
    
    // Clear persisted cache
    const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
    keys.forEach(key => localStorage.removeItem(key));
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): {
    size: number;
    memoryUsage: number;
    hitRate: number;
    entries: Array<{ key: string; hits: number; age: number; size: number }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      hits: entry.hits,
      age: Date.now() - entry.timestamp,
      size: entry.size
    }));

    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    const totalRequests = totalHits + entries.length; // Approximate
    
    return {
      size: this.cache.size,
      memoryUsage: this.currentSize,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      entries: entries.sort((a, b) => b.hits - a.hits)
    };
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestAccess = Infinity;

    for (const [key, accessTime] of this.accessOrder) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  private calculateSize(value: T): number {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 1; // Fallback size
    }
  }

  private persistToStorage(key: string, entry: CacheEntry<T>): void {
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to persist cache entry:', error);
    }
  }

  private loadFromStorage(key: string): CacheEntry<T> | null {
    try {
      const stored = localStorage.getItem(`cache_${key}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
}

/**
 * API Response Cache
 */
export class APICache {
  private cache = new MemoryCache<unknown>(200, 10 * 60 * 1000); // 10 minutes default

  async get<T>(
    url: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cacheKey = this.generateCacheKey(url);
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const data = await fetcher();
    this.cache.set(cacheKey, data, options);
    return data;
  }

  invalidate(url: string): void {
    const cacheKey = this.generateCacheKey(url);
    this.cache.delete(cacheKey);
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    const stats = this.cache.getStats();
    
    stats.entries.forEach(({ key }) => {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    });
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return this.cache.getStats();
  }

  private generateCacheKey(url: string): string {
    return `api_${btoa(url).replace(/[^a-zA-Z0-9]/g, '')}`;
  }
}

/**
 * Image Cache with blob storage
 */
export class ImageCache {
  private cache = new MemoryCache<string>(50, 30 * 60 * 1000); // 30 minutes
  private blobCache = new Map<string, Blob>();

  async get(url: string): Promise<string | null> {
    const cacheKey = this.generateCacheKey(url);
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      this.cache.set(cacheKey, objectUrl);
      this.blobCache.set(cacheKey, blob);
      
      return objectUrl;
    } catch (error) {
      console.warn(`Failed to cache image ${url}:`, error);
      return null;
    }
  }

  preload(urls: string[]): Promise<void[]> {
    return Promise.allSettled(
      urls.map(url => this.get(url))
    ) as Promise<void[]>;
  }

  clear(): void {
    // Revoke all object URLs to prevent memory leaks
    const stats = this.cache.getStats();
    stats.entries.forEach(({ key }) => {
      const objectUrl = this.cache.get(key);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    });
    
    this.cache.clear();
    this.blobCache.clear();
  }

  private generateCacheKey(url: string): string {
    return `img_${btoa(url).replace(/[^a-zA-Z0-9]/g, '')}`;
  }
}

/**
 * State Cache for component state persistence
 */
export class StateCache {
  private cache = new MemoryCache<unknown>(100, 60 * 60 * 1000); // 1 hour

  saveState(key: string, state: unknown, persistent = false): void {
    this.cache.set(key, state, { persistent });
  }

  loadState<T>(key: string, defaultValue?: T): T | null {
    const cached = this.cache.get(key);
    return cached !== null ? cached : (defaultValue || null);
  }

  clearState(key: string): void {
    this.cache.delete(key);
  }

  clearAllStates(): void {
    this.cache.clear();
  }
}

// Global cache instances
export const apiCache = new APICache();
export const imageCache = new ImageCache();
export const stateCache = new StateCache();

/**
 * Cache decorator for functions
 */
export function cached<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: CacheOptions & { keyGenerator?: (...args: Parameters<T>) => string } = {}
): T {
  const cache = new MemoryCache(options.maxSize, options.ttl);
  const keyGenerator = options.keyGenerator || ((...args) => JSON.stringify(args));

  return ((...args: Parameters<T>) => {
    const key = keyGenerator(...args);
    const cached = cache.get(key);
    
    if (cached !== null) {
      return cached;
    }

    const result = fn(...args);
    cache.set(key, result, options);
    return result;
  }) as T;
}

/**
 * React hook for cached API calls
 */
export function useCachedAPI<T>(
  url: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const result = await apiCache.get(url, fetcher, options);
        
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [url, fetcher, options]);

  const invalidate = React.useCallback(() => {
    apiCache.invalidate(url);
  }, [url]);

  return { data, loading, error, invalidate };
}

/**
 * Cache cleanup utility
 */
export const cacheCleanup = {
  cleanExpired: () => {
    // This would be called periodically to clean up expired entries
    // Implementation depends on the specific cache instances
  },
  
  cleanAll: () => {
    apiCache.clear();
    imageCache.clear();
    stateCache.clearAllStates();
  },
  
  getGlobalStats: () => ({
    api: apiCache.getStats(),
    images: imageCache.cache.getStats(),
    state: stateCache.cache.getStats()
  })
};

// Auto cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    imageCache.clear(); // Prevent memory leaks from object URLs
  });
}
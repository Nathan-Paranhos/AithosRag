// Advanced Cache Service - Enterprise Caching System
// Redis-like implementation with TTL, LRU, clustering, persistence

interface CacheEntry<T = any> {
  key: string;
  value: T;
  ttl?: number;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  tags: string[];
  compressed: boolean;
  serialized: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  totalKeys: number;
  memoryUsage: number;
  hitRate: number;
  avgResponseTime: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
  compressionThreshold: number;
  persistToDisk: boolean;
  diskPath?: string;
  enableStats: boolean;
  enableClustering: boolean;
  clusterNodes?: string[];
}

interface CachePattern {
  pattern: string;
  ttl?: number;
  tags?: string[];
  compress?: boolean;
}

interface CacheOperation {
  type: 'get' | 'set' | 'delete' | 'clear' | 'expire';
  key: string;
  value?: any;
  ttl?: number;
  timestamp: number;
  duration: number;
  hit: boolean;
}

interface CacheCluster {
  nodeId: string;
  host: string;
  port: number;
  status: 'active' | 'inactive' | 'syncing';
  lastSync: number;
  keys: number;
  memory: number;
}

type CacheEventType = 'hit' | 'miss' | 'set' | 'delete' | 'expire' | 'evict' | 'clear';

interface CacheEvent {
  type: CacheEventType;
  key: string;
  value?: any;
  timestamp: number;
  nodeId?: string;
}

class AdvancedCacheService {
  private cache = new Map<string, CacheEntry>();
  private accessOrder = new Map<string, number>();
  private stats: CacheStats;
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private operations: CacheOperation[] = [];
  private eventListeners = new Map<CacheEventType, Function[]>();
  private patterns = new Map<string, CachePattern>();
  private clusters: CacheCluster[] = [];
  private currentNodeId: string;
  
  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 10000,
      defaultTTL: 3600000, // 1 hour
      cleanupInterval: 300000, // 5 minutes
      compressionThreshold: 1024, // 1KB
      persistToDisk: false,
      enableStats: true,
      enableClustering: false,
      ...config
    };
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      totalKeys: 0,
      memoryUsage: 0,
      hitRate: 0,
      avgResponseTime: 0
    };
    
    this.currentNodeId = this.generateNodeId();
    this.startCleanupTimer();
    
    if (this.config.persistToDisk) {
      this.loadFromDisk();
    }
    
    if (this.config.enableClustering && this.config.clusterNodes) {
      this.initializeClustering();
    }
  }
  
  // Core Cache Operations
  async get<T = any>(key: string): Promise<T | null> {
    const startTime = performance.now();
    
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.recordOperation('get', key, undefined, undefined, performance.now() - startTime, false);
        this.stats.misses++;
        this.emitEvent('miss', key);
        return null;
      }
      
      // Check TTL
      if (entry.ttl && Date.now() > entry.createdAt + entry.ttl) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        this.stats.totalKeys--;
        this.recordOperation('get', key, undefined, undefined, performance.now() - startTime, false);
        this.stats.misses++;
        this.emitEvent('expire', key);
        return null;
      }
      
      // Update access info
      entry.lastAccessed = Date.now();
      entry.accessCount++;
      this.accessOrder.set(key, Date.now());
      
      let value = entry.value;
      
      // Decompress if needed
      if (entry.compressed) {
        value = this.decompress(value);
      }
      
      // Deserialize if needed
      if (entry.serialized) {
        value = JSON.parse(value);
      }
      
      this.recordOperation('get', key, value, undefined, performance.now() - startTime, true);
      this.stats.hits++;
      this.emitEvent('hit', key, value);
      
      return value;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  async set<T = any>(key: string, value: T, ttl?: number): Promise<boolean> {
    const startTime = performance.now();
    
    try {
      // Check if we need to evict
      if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
        this.evictLRU();
      }
      
      let processedValue = value;
      let compressed = false;
      let serialized = false;
      
      // Serialize complex objects
      if (typeof value === 'object' && value !== null) {
        processedValue = JSON.stringify(value) as any;
        serialized = true;
      }
      
      // Compress large values
      if (typeof processedValue === 'string' && processedValue.length > this.config.compressionThreshold) {
        processedValue = this.compress(processedValue) as any;
        compressed = true;
      }
      
      const entry: CacheEntry<T> = {
        key,
        value: processedValue,
        ttl: ttl || this.config.defaultTTL,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 0,
        tags: this.getTagsForKey(key),
        compressed,
        serialized
      };
      
      const wasNew = !this.cache.has(key);
      this.cache.set(key, entry);
      this.accessOrder.set(key, Date.now());
      
      if (wasNew) {
        this.stats.totalKeys++;
      }
      
      this.stats.sets++;
      this.recordOperation('set', key, value, ttl, performance.now() - startTime, true);
      this.emitEvent('set', key, value);
      
      // Persist to disk if enabled
      if (this.config.persistToDisk) {
        this.persistToDisk();
      }
      
      // Sync to cluster if enabled
      if (this.config.enableClustering) {
        this.syncToCluster('set', key, value, ttl);
      }
      
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }
  
  async delete(key: string): Promise<boolean> {
    const startTime = performance.now();
    
    try {
      const existed = this.cache.has(key);
      
      if (existed) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        this.stats.totalKeys--;
        this.stats.deletes++;
        
        this.recordOperation('delete', key, undefined, undefined, performance.now() - startTime, true);
        this.emitEvent('delete', key);
        
        // Sync to cluster if enabled
        if (this.config.enableClustering) {
          this.syncToCluster('delete', key);
        }
      }
      
      return existed;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }
  
  async clear(): Promise<void> {
    try {
      this.cache.clear();
      this.accessOrder.clear();
      this.stats.totalKeys = 0;
      
      this.emitEvent('clear', '');
      
      // Sync to cluster if enabled
      if (this.config.enableClustering) {
        this.syncToCluster('clear');
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
  
  // Advanced Operations
  async mget(keys: string[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    
    for (const key of keys) {
      const value = await this.get(key);
      if (value !== null) {
        results.set(key, value);
      }
    }
    
    return results;
  }
  
  async mset(entries: Map<string, any>, ttl?: number): Promise<boolean> {
    try {
      for (const [key, value] of entries) {
        await this.set(key, value, ttl);
      }
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }
  
  async expire(key: string, ttl: number): Promise<boolean> {
    const entry = this.cache.get(key);
    if (entry) {
      entry.ttl = ttl;
      entry.createdAt = Date.now();
      return true;
    }
    return false;
  }
  
  async ttl(key: string): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry || !entry.ttl) return -1;
    
    const remaining = (entry.createdAt + entry.ttl) - Date.now();
    return remaining > 0 ? remaining : -2;
  }
  
  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  }
  
  async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.cache.keys());
    
    if (!pattern) return allKeys;
    
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return allKeys.filter(key => regex.test(key));
  }
  
  // Tag-based Operations
  async getByTag(tag: string): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    
    for (const [key, entry] of this.cache) {
      if (entry.tags.includes(tag)) {
        const value = await this.get(key);
        if (value !== null) {
          results.set(key, value);
        }
      }
    }
    
    return results;
  }
  
  async deleteByTag(tag: string): Promise<number> {
    let deleted = 0;
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache) {
      if (entry.tags.includes(tag)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      if (await this.delete(key)) {
        deleted++;
      }
    }
    
    return deleted;
  }
  
  // Pattern Management
  addPattern(pattern: string, config: CachePattern): void {
    this.patterns.set(pattern, config);
  }
  
  removePattern(pattern: string): void {
    this.patterns.delete(pattern);
  }
  
  private getTagsForKey(key: string): string[] {
    const tags: string[] = [];
    
    for (const [pattern, config] of this.patterns) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      if (regex.test(key) && config.tags) {
        tags.push(...config.tags);
      }
    }
    
    return [...new Set(tags)];
  }
  
  // LRU Eviction
  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, time] of this.accessOrder) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
      this.stats.evictions++;
      this.stats.totalKeys--;
      this.emitEvent('evict', oldestKey);
    }
  }
  
  // Compression
  private compress(data: string): string {
    // Simple compression simulation - in real implementation use gzip/deflate
    return btoa(data);
  }
  
  private decompress(data: string): string {
    // Simple decompression simulation
    return atob(data);
  }
  
  // Persistence
  private async persistToDisk(): Promise<void> {
    if (!this.config.diskPath) return;
    
    try {
      const data = {
        cache: Array.from(this.cache.entries()),
        stats: this.stats,
        timestamp: Date.now()
      };
      
      // In browser environment, use IndexedDB
      if (typeof window !== 'undefined') {
        await this.saveToIndexedDB(data);
      }
    } catch (error) {
      console.error('Failed to persist cache:', error);
    }
  }
  
  private async loadFromDisk(): Promise<void> {
    try {
      // In browser environment, load from IndexedDB
      if (typeof window !== 'undefined') {
        const data = await this.loadFromIndexedDB();
        if (data) {
          this.cache = new Map(data.cache);
          this.stats = { ...this.stats, ...data.stats };
        }
      }
    } catch (error) {
      console.error('Failed to load cache from disk:', error);
    }
  }
  
  private async saveToIndexedDB(data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AdvancedCache', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        
        store.put(data, 'cacheData');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('cache');
      };
    });
  }
  
  private async loadFromIndexedDB(): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AdvancedCache', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readonly');
        const store = transaction.objectStore('cache');
        const getRequest = store.get('cacheData');
        
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
      };
    });
  }
  
  // Clustering
  private initializeClustering(): void {
    if (!this.config.clusterNodes) return;
    
    this.clusters = this.config.clusterNodes.map(node => {
      const [host, port] = node.split(':');
      return {
        nodeId: this.generateNodeId(),
        host,
        port: parseInt(port),
        status: 'inactive',
        lastSync: 0,
        keys: 0,
        memory: 0
      };
    });
  }
  
  private async syncToCluster(operation: string, key?: string, value?: any, ttl?: number): Promise<void> {
    // Simulate cluster sync - in real implementation, use WebSockets or HTTP
    for (const cluster of this.clusters) {
      if (cluster.status === 'active') {
        try {
          // Send operation to cluster node
          console.log(`Syncing ${operation} to ${cluster.host}:${cluster.port}`);
          cluster.lastSync = Date.now();
        } catch (error) {
          console.error(`Failed to sync to cluster node ${cluster.nodeId}:`, error);
          cluster.status = 'inactive';
        }
      }
    }
  }
  
  // Event System
  on(event: CacheEventType, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }
  
  off(event: CacheEventType, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  private emitEvent(type: CacheEventType, key: string, value?: any): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const event: CacheEvent = {
        type,
        key,
        value,
        timestamp: Date.now(),
        nodeId: this.currentNodeId
      };
      
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Cache event listener error:', error);
        }
      });
    }
  }
  
  // Statistics and Monitoring
  getStats(): CacheStats {
    const totalOperations = this.stats.hits + this.stats.misses;
    const totalTime = this.operations.reduce((sum, op) => sum + op.duration, 0);
    
    return {
      ...this.stats,
      hitRate: totalOperations > 0 ? (this.stats.hits / totalOperations) * 100 : 0,
      avgResponseTime: this.operations.length > 0 ? totalTime / this.operations.length : 0,
      memoryUsage: this.estimateMemoryUsage()
    };
  }
  
  getOperations(limit: number = 100): CacheOperation[] {
    return this.operations.slice(-limit);
  }
  
  getClusters(): CacheCluster[] {
    return [...this.clusters];
  }
  
  private recordOperation(type: CacheOperation['type'], key: string, value?: any, ttl?: number, duration: number = 0, hit: boolean = false): void {
    if (!this.config.enableStats) return;
    
    const operation: CacheOperation = {
      type,
      key,
      value,
      ttl,
      timestamp: Date.now(),
      duration,
      hit
    };
    
    this.operations.push(operation);
    
    // Keep only last 1000 operations
    if (this.operations.length > 1000) {
      this.operations = this.operations.slice(-1000);
    }
  }
  
  private estimateMemoryUsage(): number {
    let size = 0;
    
    for (const [key, entry] of this.cache) {
      size += key.length * 2; // UTF-16
      size += JSON.stringify(entry).length * 2;
    }
    
    return size;
  }
  
  // Cleanup
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }
  
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache) {
      if (entry.ttl && now > entry.createdAt + entry.ttl) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.stats.totalKeys--;
      this.emitEvent('expire', key);
    }
  }
  
  private generateNodeId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  
  // Utility Methods
  async warmup(keys: string[], loader: (key: string) => Promise<any>): Promise<void> {
    const promises = keys.map(async (key) => {
      try {
        const value = await loader(key);
        await this.set(key, value);
      } catch (error) {
        console.error(`Failed to warmup key ${key}:`, error);
      }
    });
    
    await Promise.all(promises);
  }
  
  async invalidatePattern(pattern: string): Promise<number> {
    const keys = await this.keys(pattern);
    let deleted = 0;
    
    for (const key of keys) {
      if (await this.delete(key)) {
        deleted++;
      }
    }
    
    return deleted;
  }
  
  // Shutdown
  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    if (this.config.persistToDisk) {
      await this.persistToDisk();
    }
    
    this.cache.clear();
    this.accessOrder.clear();
    this.operations.length = 0;
    this.eventListeners.clear();
  }
}

// Singleton instance
const advancedCacheService = new AdvancedCacheService({
  maxSize: 10000,
  defaultTTL: 3600000, // 1 hour
  cleanupInterval: 300000, // 5 minutes
  compressionThreshold: 1024,
  persistToDisk: true,
  enableStats: true,
  enableClustering: false
});

// Utility functions
export const createCacheKey = (...parts: (string | number)[]): string => {
  return parts.join(':');
};

export const createCachePattern = (prefix: string, suffix: string = '*'): CachePattern => {
  return {
    pattern: `${prefix}:${suffix}`,
    ttl: 3600000,
    tags: [prefix]
  };
};

export const withCache = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl?: number
) => {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const key = keyGenerator(...args);
    
    // Try to get from cache first
    let result = await advancedCacheService.get(key);
    
    if (result === null) {
      // Not in cache, execute function
      result = await fn(...args);
      
      // Store in cache
      await advancedCacheService.set(key, result, ttl);
    }
    
    return result;
  };
};

export { AdvancedCacheService, advancedCacheService };
export type { CacheEntry, CacheStats, CacheConfig, CachePattern, CacheOperation, CacheCluster, CacheEvent, CacheEventType };
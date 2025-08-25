/**
 * OTIMIZAÇÕES DE PERFORMANCE NÍVEL STARTUP
 * Implementações críticas para máxima performance em PC e Mobile
 */

// ===== CACHE INTELIGENTE =====
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

class IntelligentCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxSize = 100;
  private defaultTTL = 5 * 60 * 1000; // 5 minutos

  set<T>(key: string, data: T, ttl?: number): void {
    // Limpar cache se exceder tamanho máximo
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      hits: 0
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Verificar se expirou
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Incrementar hits para LRU
    entry.hits++;
    return entry.data;
  }

  private evictLeastUsed(): void {
    let leastUsedKey = '';
    let minHits = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < minHits) {
        minHits = entry.hits;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate()
    };
  }

  private calculateHitRate(): number {
    const totalHits = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.hits, 0);
    return this.cache.size > 0 ? totalHits / this.cache.size : 0;
  }
}

// ===== DEBOUNCE AVANÇADO =====
class AdvancedDebounce {
  private timers = new Map<string, NodeJS.Timeout>();
  private counters = new Map<string, number>();

  debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    delay: number,
    key?: string
  ): (...args: Parameters<T>) => void {
    const debounceKey = key || func.name || 'default';

    return (...args: Parameters<T>) => {
      // Limpar timer anterior
      const existingTimer = this.timers.get(debounceKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Incrementar contador
      const count = (this.counters.get(debounceKey) || 0) + 1;
      this.counters.set(debounceKey, count);

      // Criar novo timer
      const timer = setTimeout(() => {
        func(...args);
        this.timers.delete(debounceKey);
        this.counters.delete(debounceKey);
      }, delay);

      this.timers.set(debounceKey, timer);
    };
  }

  throttle<T extends (...args: unknown[]) => unknown>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    // Throttle key removed as it was not being used
    let lastCall = 0;

    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }

  optimizeForDevice(): void {
    // Device optimization logic can be implemented here
  }

  memoize<T extends (...args: unknown[]) => unknown>(func: T): T {
    const cache = new Map<string, unknown>();
    
    return ((...args: unknown[]) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      
      const result = func(...args);
      cache.set(key, result);
      return result;
    }) as T;
  }

  getStats() {
    return {
      activeTimers: this.timers.size,
      totalCalls: Array.from(this.counters.values()).reduce((sum, count) => sum + count, 0)
    };
  }
}

// ===== REQUEST BATCHING =====
class RequestBatcher {
  private batches = new Map<string, {
    requests: Array<{
      resolve: (value: unknown) => void;
      reject: (error: unknown) => void;
      data: unknown;
    }>;
    timer: NodeJS.Timeout;
  }>();

  private batchDelay = 50; // 50ms
  private maxBatchSize = 10;

  batch<T, R>(
    key: string,
    data: T,
    executor: (batch: T[]) => Promise<R[]>
  ): Promise<R> {
    return new Promise((resolve, reject) => {
      let batch = this.batches.get(key);

      if (!batch) {
        batch = {
          requests: [],
          timer: setTimeout(() => this.executeBatch(key, executor), this.batchDelay)
        };
        this.batches.set(key, batch);
      }

      batch.requests.push({ resolve, reject, data });

      // Executar imediatamente se atingir tamanho máximo
      if (batch.requests.length >= this.maxBatchSize) {
        clearTimeout(batch.timer);
        this.executeBatch(key, executor);
      }
    });
  }

  private async executeBatch<T, R>(
    key: string,
    executor: (batch: T[]) => Promise<R[]>
  ): Promise<void> {
    const batch = this.batches.get(key);
    if (!batch) return;

    this.batches.delete(key);

    try {
      const batchData = batch.requests.map(req => req.data);
      const results = await executor(batchData);

      batch.requests.forEach((req, index) => {
        req.resolve(results[index]);
      });
    } catch (error) {
      batch.requests.forEach(req => {
        req.reject(error);
      });
    }
  }
}

// ===== LAZY LOADING MANAGER =====
class LazyLoadManager {
  private observer: IntersectionObserver;
  private loadedComponents = new Set<string>();

  constructor() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            const componentId = element.dataset.lazyId;
            if (componentId && !this.loadedComponents.has(componentId)) {
              this.loadComponent(componentId, element);
            }
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );
  }

  observe(element: HTMLElement, componentId: string): void {
    element.dataset.lazyId = componentId;
    this.observer.observe(element);
  }

  private async loadComponent(componentId: string, element: HTMLElement): Promise<void> {
    try {
      this.loadedComponents.add(componentId);
      element.classList.add('lazy-loaded');
      
      // Trigger custom event
      element.dispatchEvent(new CustomEvent('lazyLoaded', {
        detail: { componentId }
      }));
    } catch (error) {
      console.error(`Failed to lazy load component ${componentId}:`, error);
    }
  }

  unobserve(element: HTMLElement): void {
    this.observer.unobserve(element);
  }

  disconnect(): void {
    this.observer.disconnect();
  }
}

// ===== MEMORY LEAK PREVENTION =====
class MemoryManager {
  private listeners = new Map<string, (() => void)[]>();
  private intervals = new Set<NodeJS.Timeout>();
  private timeouts = new Set<NodeJS.Timeout>();

  addListener(key: string, cleanup: () => void): void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key)!.push(cleanup);
  }

  addInterval(interval: NodeJS.Timeout): void {
    this.intervals.add(interval);
  }

  addTimeout(timeout: NodeJS.Timeout): void {
    this.timeouts.add(timeout);
  }

  cleanup(key?: string): void {
    if (key) {
      const cleanupFunctions = this.listeners.get(key);
      if (cleanupFunctions) {
        cleanupFunctions.forEach(cleanup => cleanup());
        this.listeners.delete(key);
      }
    } else {
      // Cleanup all
      this.listeners.forEach(cleanupFunctions => {
        cleanupFunctions.forEach(cleanup => cleanup());
      });
      this.listeners.clear();

      this.intervals.forEach(interval => clearInterval(interval));
      this.intervals.clear();

      this.timeouts.forEach(timeout => clearTimeout(timeout));
      this.timeouts.clear();
    }
  }

  getStats() {
    return {
      listeners: this.listeners.size,
      intervals: this.intervals.size,
      timeouts: this.timeouts.size
    };
  }
}

// ===== PERFORMANCE MONITOR =====
class PerformanceMonitor {
  private metrics = {
    renderTimes: [] as number[],
    apiCalls: [] as number[],
    memoryUsage: [] as number[],
    cacheHits: 0,
    cacheMisses: 0
  };

  startRender(): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.metrics.renderTimes.push(duration);
      if (this.metrics.renderTimes.length > 100) {
        this.metrics.renderTimes.shift();
      }
    };
  }

  recordApiCall(responseTime: number): void {
    this.metrics.apiCalls.push(responseTime);
    if (this.metrics.apiCalls.length > 100) {
      this.metrics.apiCalls.shift();
    }
  }

  recordCacheHit(): void {
    this.metrics.cacheHits++;
  }

  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }

  recordError(error: Error | string): void {
    console.error('Performance Monitor Error:', error);
    // Additional error tracking implementation can be added here
  }

  getMetrics(): Record<string, unknown> {
    const avgRenderTime = this.metrics.renderTimes.length > 0 
      ? this.metrics.renderTimes.reduce((a, b) => a + b, 0) / this.metrics.renderTimes.length 
      : 0;

    const avgApiTime = this.metrics.apiCalls.length > 0
      ? this.metrics.apiCalls.reduce((a, b) => a + b, 0) / this.metrics.apiCalls.length
      : 0;

    const cacheHitRate = (this.metrics.cacheHits + this.metrics.cacheMisses) > 0
      ? this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)
      : 0;

    return {
      avgRenderTime,
      avgApiTime,
      cacheHitRate,
      totalCacheHits: this.metrics.cacheHits,
      totalCacheMisses: this.metrics.cacheMisses,
      memoryUsage: (performance as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize || 0
    };
  }
}

// ===== INSTÂNCIAS GLOBAIS =====
export const intelligentCache = new IntelligentCache();
export const advancedDebounce = new AdvancedDebounce();
export const requestBatcher = new RequestBatcher();
export const lazyLoadManager = new LazyLoadManager();
export const memoryManager = new MemoryManager();
export const performanceMonitor = new PerformanceMonitor();

// ===== HOOKS DE PERFORMANCE =====
export const usePerformanceOptimizations = () => {
  return {
    cache: intelligentCache,
    debounce: advancedDebounce,
    batcher: requestBatcher,
    lazyLoad: lazyLoadManager,
    memory: memoryManager,
    monitor: performanceMonitor
  };
};

// ===== UTILITÁRIOS =====
export const optimizeImage = (src: string, width?: number, height?: number): string => {
  // Implementar otimização de imagem baseada no dispositivo
  const devicePixelRatio = window.devicePixelRatio || 1;
  
  if (width && height) {
    const optimizedWidth = Math.round(width * devicePixelRatio);
    const optimizedHeight = Math.round(height * devicePixelRatio);
    // Use optimized dimensions for image processing
    console.log(`Optimizing image: ${optimizedWidth}x${optimizedHeight}`);
  }
  
  // Retornar URL otimizada (implementar conforme necessário)
  return src;
};

export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const getOptimalChunkSize = (): number => {
  return isMobile() ? 1024 : 2048; // Chunks menores para mobile
};

export const preloadCriticalResources = (resources: string[]): void => {
  resources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource;
    link.as = resource.endsWith('.css') ? 'style' : 'script';
    document.head.appendChild(link);
  });
};
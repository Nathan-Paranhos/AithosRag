/**
 * Intelligent API Caching System
 * Sistema de cache inteligente para otimização de API
 */

// Configuração do cache
export const CACHE_CONFIG = {
  // TTL (Time To Live) para diferentes tipos de dados
  ttl: {
    static: 1000 * 60 * 60 * 24, // 24 horas para dados estáticos
    dynamic: 1000 * 60 * 5, // 5 minutos para dados dinâmicos
    realtime: 1000 * 30, // 30 segundos para dados em tempo real
    user: 1000 * 60 * 15 // 15 minutos para dados do usuário
  },
  
  // Tamanhos máximos
  maxSize: {
    memory: 50 * 1024 * 1024, // 50MB em memória
    storage: 100 * 1024 * 1024, // 100MB no localStorage
    entries: 1000 // Máximo de entradas
  },
  
  // Estratégias de cache
  strategies: {
    cacheFirst: 'cache-first',
    networkFirst: 'network-first',
    staleWhileRevalidate: 'stale-while-revalidate',
    networkOnly: 'network-only',
    cacheOnly: 'cache-only'
  } as const
};

// Interface para entrada de cache
interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  etag?: string;
  lastModified?: string;
  size: number;
  accessCount: number;
  lastAccess: number;
}

// Interface para configuração de cache
interface CacheOptions {
  ttl?: number;
  strategy?: keyof typeof CACHE_CONFIG.strategies;
  key?: string;
  tags?: string[];
  compress?: boolean;
  persistent?: boolean;
}

// Sistema de cache inteligente
export class IntelligentCache {
  private static instance: IntelligentCache;
  private memoryCache = new Map<string, CacheEntry>();
  private accessPattern = new Map<string, number[]>();
  private compressionWorker?: Worker;
  
  static getInstance(): IntelligentCache {
    if (!IntelligentCache.instance) {
      IntelligentCache.instance = new IntelligentCache();
    }
    return IntelligentCache.instance;
  }
  
  constructor() {
    this.initializeCompressionWorker();
    this.startCleanupInterval();
  }
  
  // Inicializar worker de compressão
  private initializeCompressionWorker(): void {
    if (typeof Worker !== 'undefined') {
      try {
        const workerCode = `
          self.onmessage = function(e) {
            const { action, data, id } = e.data;
            
            if (action === 'compress') {
              try {
                const compressed = JSON.stringify(data);
                self.postMessage({ id, result: compressed, success: true });
              } catch (error) {
                self.postMessage({ id, error: error.message, success: false });
              }
            }
          };
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.compressionWorker = new Worker(URL.createObjectURL(blob));
      } catch (error) {
        console.warn('Failed to initialize compression worker:', error);
      }
    }
  }
  
  // Obter dados do cache
  async get<T>(key: string): Promise<T | null> {
    // Verificar cache em memória primeiro
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && this.isValid(memoryEntry)) {
      this.updateAccessPattern(key);
      memoryEntry.accessCount++;
      memoryEntry.lastAccess = Date.now();
      return memoryEntry.data;
    }
    
    // Verificar localStorage se não encontrado em memória
    try {
      const stored = localStorage.getItem(`cache_${key}`);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        if (this.isValid(entry)) {
          // Mover para cache em memória
          this.memoryCache.set(key, entry);
          this.updateAccessPattern(key);
          return entry.data;
        } else {
          // Remover entrada expirada
          localStorage.removeItem(`cache_${key}`);
        }
      }
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
    }
    
    return null;
  }
  
  // Armazenar dados no cache
  async set<T>(
    key: string,
    data: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const {
      ttl = CACHE_CONFIG.ttl.dynamic,
      persistent = true
    } = options;
    
    const size = this.calculateSize(data);
    // Compression logic will be implemented later
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      size,
      accessCount: 0,
      lastAccess: Date.now()
    };
    
    // Armazenar em memória
    this.memoryCache.set(key, entry);
    
    // Armazenar persistentemente se solicitado
    if (persistent) {
      try {
        localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
      } catch (error) {
        console.warn('Failed to write to localStorage:', error);
        // Se falhar, tentar limpar cache antigo e tentar novamente
        this.cleanupStorage();
        try {
          localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
        } catch (retryError) {
          console.warn('Failed to write to localStorage after cleanup:', retryError);
        }
      }
    }
    
    // Verificar se precisa fazer limpeza
    this.checkAndCleanup();
  }
  
  // Verificar se entrada é válida
  private isValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }
  
  // Calcular tamanho dos dados
  private calculateSize(data: unknown): number {
    try {
      return JSON.stringify(data).length * 2; // Aproximação em bytes
    } catch {
      return 1024; // Fallback
    }
  }
  
  // Atualizar padrão de acesso
  private updateAccessPattern(key: string): void {
    const now = Date.now();
    const pattern = this.accessPattern.get(key) || [];
    pattern.push(now);
    
    // Manter apenas os últimos 10 acessos
    if (pattern.length > 10) {
      pattern.shift();
    }
    
    this.accessPattern.set(key, pattern);
  }
  
  // Verificar e fazer limpeza se necessário
  private checkAndCleanup(): void {
    const memorySize = this.getMemorySize();
    const entryCount = this.memoryCache.size;
    
    if (
      memorySize > CACHE_CONFIG.maxSize.memory ||
      entryCount > CACHE_CONFIG.maxSize.entries
    ) {
      this.cleanup();
    }
  }
  
  // Obter tamanho total do cache em memória
  private getMemorySize(): number {
    let size = 0;
    this.memoryCache.forEach(entry => {
      size += entry.size;
    });
    return size;
  }
  
  // Limpeza inteligente do cache
  private cleanup(): void {
    const entries = Array.from(this.memoryCache.entries());
    
    // Ordenar por prioridade (menos acessado, mais antigo)
    entries.sort(([keyA, entryA], [keyB, entryB]) => {
      const scoreA = this.calculatePriority(keyA, entryA);
      const scoreB = this.calculatePriority(keyB, entryB);
      return scoreA - scoreB;
    });
    
    // Remover 25% das entradas menos importantes
    const toRemove = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      const [key] = entries[i];
      this.memoryCache.delete(key);
      this.accessPattern.delete(key);
    }
  }
  
  // Calcular prioridade da entrada
  private calculatePriority(key: string, entry: CacheEntry): number {
    const age = Date.now() - entry.timestamp;
    const accessFrequency = entry.accessCount;
    const recentAccess = Date.now() - entry.lastAccess;
    
    // Menor score = menor prioridade (será removido primeiro)
    return accessFrequency * 1000 - age - recentAccess;
  }
  
  // Limpeza do localStorage
  private cleanupStorage(): void {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(key => key.startsWith('cache_'));
    
    // Remover entradas expiradas
    cacheKeys.forEach(key => {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const entry = JSON.parse(stored);
          if (!this.isValid(entry)) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        localStorage.removeItem(key);
      }
    });
  }
  
  // Iniciar intervalo de limpeza
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
      this.cleanupStorage();
    }, 5 * 60 * 1000); // A cada 5 minutos
  }
  
  // Invalidar cache por tag
  invalidateByTag(tag: string): void {
    // Implementação simplificada - em produção, seria mais sofisticada
    const keysToRemove: string[] = [];
    
    this.memoryCache.forEach((entry, key) => {
      if (key.includes(tag)) {
        keysToRemove.push(key);
      }
    });
    
    keysToRemove.forEach(key => {
      this.memoryCache.delete(key);
      localStorage.removeItem(`cache_${key}`);
    });
  }
  
  // Limpar todo o cache
  clear(): void {
    this.memoryCache.clear();
    this.accessPattern.clear();
    
    // Limpar localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    });
  }
  
  // Obter estatísticas do cache
  getStats() {
    return {
      memoryEntries: this.memoryCache.size,
      memorySize: this.getMemorySize(),
      maxMemorySize: CACHE_CONFIG.maxSize.memory,
      hitRate: this.calculateHitRate(),
      accessPatterns: this.accessPattern.size
    };
  }
  
  // Calcular taxa de acerto
  private calculateHitRate(): number {
    let totalAccesses = 0;
    let totalHits = 0;
    
    this.memoryCache.forEach(entry => {
      totalAccesses += entry.accessCount;
      totalHits += entry.accessCount;
    });
    
    return totalAccesses > 0 ? totalHits / totalAccesses : 0;
  }
}

// Hook para usar cache inteligente
export const useIntelligentCache = () => {
  const cache = IntelligentCache.getInstance();
  
  return {
    get: <T>(key: string) => cache.get<T>(key),
    set: <T>(key: string, data: T, options?: CacheOptions) => 
      cache.set(key, data, options),
    invalidate: (tag: string) => cache.invalidateByTag(tag),
    clear: () => cache.clear(),
    stats: () => cache.getStats()
  };
};

// Wrapper para requisições com cache
export const cachedFetch = async <T>(
  url: string,
  options: RequestInit & CacheOptions = {}
): Promise<T> => {
  const cache = IntelligentCache.getInstance();
  const { strategy = 'stale-while-revalidate', ...fetchOptions } = options;
  
  const cacheKey = `fetch_${url}_${JSON.stringify(fetchOptions)}`;
  
  // Estratégia cache-first
  if (strategy === 'cache-first') {
    const cached = await cache.get<T>(cacheKey);
    if (cached) return cached;
  }
  
  // Estratégia stale-while-revalidate
  if (strategy === 'stale-while-revalidate') {
    const cached = await cache.get<T>(cacheKey);
    if (cached) {
      // Retornar cache e atualizar em background
      fetch(url, fetchOptions)
        .then(response => response.json())
        .then(data => cache.set(cacheKey, data, options))
        .catch(console.warn);
      
      return cached;
    }
  }
  
  // Fazer requisição
  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Armazenar no cache
    await cache.set(cacheKey, data, options);
    
    return data;
  } catch (error) {
    // Em caso de erro, tentar retornar cache se disponível
    const cached = await cache.get<T>(cacheKey);
    if (cached) {
      console.warn('Network failed, returning stale cache:', error);
      return cached;
    }
    
    throw error;
  }
};

// Exportar instância singleton
export const apiCache = IntelligentCache.getInstance();
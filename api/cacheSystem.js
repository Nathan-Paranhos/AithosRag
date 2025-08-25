import { EventEmitter } from 'events';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

/**
 * Sistema de Cache Inteligente
 * Implementa cache com TTL, LRU, compressão e persistência
 */
class CacheSystem extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.maxSize = options.maxSize || 1000; // Máximo de entradas
    this.defaultTTL = options.defaultTTL || 3600000; // 1 hora em ms
    this.cleanupInterval = options.cleanupInterval || 300000; // 5 minutos
    this.persistPath = options.persistPath || './cache_data.json';
    this.compressionThreshold = options.compressionThreshold || 1024; // 1KB
    
    this.cache = new Map();
    this.accessOrder = new Map(); // Para LRU
    this.hitCount = 0;
    this.missCount = 0;
    this.totalRequests = 0;
    
    // Configurações por categoria
    this.categoryConfigs = {
      'chat_response': {
        ttl: 1800000, // 30 minutos
        maxSize: 500,
        compress: true
      },
      'model_info': {
        ttl: 7200000, // 2 horas
        maxSize: 100,
        compress: false
      },
      'system_metrics': {
        ttl: 60000, // 1 minuto
        maxSize: 50,
        compress: false
      },
      'user_preferences': {
        ttl: 86400000, // 24 horas
        maxSize: 200,
        compress: false
      }
    };
    
    this.startCleanupTimer();
    this.loadFromDisk();
    
    console.log('🗄️ Cache System initialized');
  }
  
  /**
   * Gera chave de cache baseada em parâmetros
   */
  generateKey(category, identifier, params = {}) {
    const data = {
      category,
      identifier,
      params: this.normalizeParams(params)
    };
    
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 32);
  }
  
  /**
   * Normaliza parâmetros para gerar chaves consistentes
   */
  normalizeParams(params) {
    if (!params || typeof params !== 'object') return {};
    
    const normalized = {};
    const keys = Object.keys(params).sort();
    
    for (const key of keys) {
      if (params[key] !== undefined && params[key] !== null) {
        normalized[key] = params[key];
      }
    }
    
    return normalized;
  }
  
  /**
   * Armazena item no cache
   */
  async set(category, identifier, data, customTTL = null) {
    const key = this.generateKey(category, identifier);
    const config = this.categoryConfigs[category] || {};
    const ttl = customTTL || config.ttl || this.defaultTTL;
    
    const entry = {
      key,
      category,
      identifier,
      data: config.compress ? await this.compress(data) : data,
      compressed: config.compress || false,
      timestamp: Date.now(),
      ttl,
      expiresAt: Date.now() + ttl,
      accessCount: 0,
      lastAccessed: Date.now()
    };
    
    // Verificar limite de tamanho da categoria
    const categorySize = this.getCategorySize(category);
    const maxCategorySize = config.maxSize || Math.floor(this.maxSize / 4);
    
    if (categorySize >= maxCategorySize) {
      this.evictLRUFromCategory(category);
    }
    
    // Verificar limite global
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    this.cache.set(key, entry);
    this.accessOrder.set(key, Date.now());
    
    this.emit('set', { category, identifier, key, size: this.getEntrySize(entry) });
    
    return key;
  }
  
  /**
   * Recupera item do cache
   */
  async get(category, identifier, params = {}) {
    this.totalRequests++;
    
    const key = this.generateKey(category, identifier, params);
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      this.emit('miss', { category, identifier, key });
      return null;
    }
    
    // Verificar expiração
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.missCount++;
      this.emit('expired', { category, identifier, key });
      return null;
    }
    
    // Atualizar estatísticas de acesso
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.accessOrder.set(key, Date.now());
    
    this.hitCount++;
    this.emit('hit', { category, identifier, key, accessCount: entry.accessCount });
    
    // Descomprimir se necessário
    const data = entry.compressed ? await this.decompress(entry.data) : entry.data;
    
    return {
      data,
      metadata: {
        cached: true,
        timestamp: entry.timestamp,
        accessCount: entry.accessCount,
        ttl: entry.ttl,
        remainingTTL: entry.expiresAt - Date.now()
      }
    };
  }
  
  /**
   * Remove item específico do cache
   */
  delete(category, identifier, params = {}) {
    const key = this.generateKey(category, identifier, params);
    const deleted = this.cache.delete(key);
    this.accessOrder.delete(key);
    
    if (deleted) {
      this.emit('delete', { category, identifier, key });
    }
    
    return deleted;
  }
  
  /**
   * Limpa cache por categoria
   */
  clearCategory(category) {
    let count = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.category === category) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        count++;
      }
    }
    
    this.emit('categoryCleared', { category, count });
    return count;
  }
  
  /**
   * Limpa todo o cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.accessOrder.clear();
    this.hitCount = 0;
    this.missCount = 0;
    this.totalRequests = 0;
    
    this.emit('cleared', { size });
    return size;
  }
  
  /**
   * Remove entradas expiradas
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.emit('cleanup', { cleaned, remaining: this.cache.size });
    }
    
    return cleaned;
  }
  
  /**
   * Remove entrada menos recentemente usada
   */
  evictLRU() {
    if (this.accessOrder.size === 0) return null;
    
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, time] of this.accessOrder.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      const entry = this.cache.get(oldestKey);
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
      
      this.emit('evicted', { 
        key: oldestKey, 
        category: entry?.category, 
        reason: 'LRU' 
      });
      
      return oldestKey;
    }
    
    return null;
  }
  
  /**
   * Remove LRU de uma categoria específica
   */
  evictLRUFromCategory(category) {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.category === category) {
        const accessTime = this.accessOrder.get(key) || 0;
        if (accessTime < oldestTime) {
          oldestTime = accessTime;
          oldestKey = key;
        }
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
      
      this.emit('evicted', { 
        key: oldestKey, 
        category, 
        reason: 'Category LRU' 
      });
      
      return oldestKey;
    }
    
    return null;
  }
  
  /**
   * Obtém tamanho de uma categoria
   */
  getCategorySize(category) {
    let count = 0;
    for (const entry of this.cache.values()) {
      if (entry.category === category) {
        count++;
      }
    }
    return count;
  }
  
  /**
   * Calcula tamanho aproximado de uma entrada
   */
  getEntrySize(entry) {
    return JSON.stringify(entry).length;
  }
  
  /**
   * Comprime dados (simulado - em produção usar zlib)
   */
  async compress(data) {
    // Simulação de compressão
    const json = JSON.stringify(data);
    if (json.length < this.compressionThreshold) {
      return data;
    }
    
    // Em produção, usar zlib.gzip
    return {
      compressed: true,
      data: Buffer.from(json).toString('base64')
    };
  }
  
  /**
   * Descomprime dados
   */
  async decompress(data) {
    if (!data || !data.compressed) {
      return data;
    }
    
    // Em produção, usar zlib.gunzip
    const json = Buffer.from(data.data, 'base64').toString();
    return JSON.parse(json);
  }
  
  /**
   * Obtém estatísticas do cache
   */
  getStats() {
    const hitRate = this.totalRequests > 0 ? (this.hitCount / this.totalRequests) * 100 : 0;
    const categoryStats = {};
    
    for (const [key, entry] of this.cache.entries()) {
      if (!categoryStats[entry.category]) {
        categoryStats[entry.category] = {
          count: 0,
          totalAccess: 0,
          avgAccess: 0,
          oldestEntry: Infinity,
          newestEntry: 0
        };
      }
      
      const cat = categoryStats[entry.category];
      cat.count++;
      cat.totalAccess += entry.accessCount;
      cat.oldestEntry = Math.min(cat.oldestEntry, entry.timestamp);
      cat.newestEntry = Math.max(cat.newestEntry, entry.timestamp);
    }
    
    // Calcular médias
    for (const cat of Object.values(categoryStats)) {
      cat.avgAccess = cat.count > 0 ? cat.totalAccess / cat.count : 0;
    }
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      totalRequests: this.totalRequests,
      hitRate: hitRate.toFixed(2) + '%',
      categories: categoryStats,
      memoryUsage: this.getMemoryUsage()
    };
  }
  
  /**
   * Estima uso de memória
   */
  getMemoryUsage() {
    let totalSize = 0;
    
    for (const entry of this.cache.values()) {
      totalSize += this.getEntrySize(entry);
    }
    
    return {
      totalBytes: totalSize,
      totalKB: (totalSize / 1024).toFixed(2),
      totalMB: (totalSize / (1024 * 1024)).toFixed(2),
      avgEntrySize: this.cache.size > 0 ? (totalSize / this.cache.size).toFixed(2) : 0
    };
  }
  
  /**
   * Salva cache em disco
   */
  async saveToDisk() {
    try {
      const data = {
        cache: Array.from(this.cache.entries()),
        accessOrder: Array.from(this.accessOrder.entries()),
        stats: {
          hitCount: this.hitCount,
          missCount: this.missCount,
          totalRequests: this.totalRequests
        },
        timestamp: Date.now()
      };
      
      await fs.writeFile(this.persistPath, JSON.stringify(data, null, 2));
      this.emit('saved', { path: this.persistPath, entries: this.cache.size });
    } catch (error) {
      console.error('❌ Failed to save cache to disk:', error);
      this.emit('saveError', error);
    }
  }
  
  /**
   * Carrega cache do disco
   */
  async loadFromDisk() {
    try {
      const data = await fs.readFile(this.persistPath, 'utf8');
      const parsed = JSON.parse(data);
      
      // Restaurar cache
      this.cache.clear();
      this.accessOrder.clear();
      
      for (const [key, entry] of parsed.cache) {
        // Verificar se não expirou
        if (Date.now() <= entry.expiresAt) {
          this.cache.set(key, entry);
        }
      }
      
      for (const [key, time] of parsed.accessOrder) {
        if (this.cache.has(key)) {
          this.accessOrder.set(key, time);
        }
      }
      
      // Restaurar estatísticas
      if (parsed.stats) {
        this.hitCount = parsed.stats.hitCount || 0;
        this.missCount = parsed.stats.missCount || 0;
        this.totalRequests = parsed.stats.totalRequests || 0;
      }
      
      this.emit('loaded', { 
        path: this.persistPath, 
        entries: this.cache.size,
        timestamp: parsed.timestamp 
      });
      
      console.log(`🗄️ Cache loaded from disk: ${this.cache.size} entries`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('❌ Failed to load cache from disk:', error);
        this.emit('loadError', error);
      }
    }
  }
  
  /**
   * Inicia timer de limpeza automática
   */
  startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }
  
  /**
   * Para timer de limpeza
   */
  stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
  
  /**
   * Desliga o sistema de cache
   */
  async shutdown() {
    this.stopCleanupTimer();
    await this.saveToDisk();
    this.emit('shutdown');
    console.log('🗄️ Cache System shutdown');
  }
}

export default CacheSystem;
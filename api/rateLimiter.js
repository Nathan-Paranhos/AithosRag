import { EventEmitter } from 'events';

/**
 * Sistema de Rate Limiting Inteligente
 * Implementa limitação por modelo, usuário, IP e categoria
 */
class RateLimiter extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.windowSize = options.windowSize || 60000; // 1 minuto em ms
    this.cleanupInterval = options.cleanupInterval || 300000; // 5 minutos
    
    // Configurações padrão por modelo
    this.modelLimits = {
      'meta-llama/llama-4-maverick-17b-128e-instruct': {
        requestsPerMinute: 30,
        tokensPerMinute: 50000,
        concurrentRequests: 5,
        priority: 'high'
      },
      'gemma2-9b-it': {
        requestsPerMinute: 50,
        tokensPerMinute: 30000,
        concurrentRequests: 8,
        priority: 'medium'
      },
      'deepseek-r1-distill-llama-70b': {
        requestsPerMinute: 20,
        tokensPerMinute: 80000,
        concurrentRequests: 3,
        priority: 'high'
      },
      'qwen/qwen3-32b': {
        requestsPerMinute: 40,
        tokensPerMinute: 40000,
        concurrentRequests: 6,
        priority: 'medium'
      }
    };
    
    // Configurações por categoria de usuário
    this.userTiers = {
      'free': {
        multiplier: 1,
        dailyLimit: 100,
        burstAllowed: false
      },
      'premium': {
        multiplier: 3,
        dailyLimit: 1000,
        burstAllowed: true
      },
      'enterprise': {
        multiplier: 10,
        dailyLimit: 10000,
        burstAllowed: true
      }
    };
    
    // Armazenamento de contadores
    this.requestCounts = new Map(); // Por chave (IP/user + model)
    this.tokenCounts = new Map();
    this.concurrentRequests = new Map();
    this.dailyCounts = new Map();
    this.burstTokens = new Map(); // Para burst allowance
    
    // Configurações dinâmicas
    this.adaptiveMode = options.adaptiveMode || true;
    this.loadThreshold = options.loadThreshold || 0.8;
    
    this.startCleanupTimer();
    console.log('🚦 Rate Limiter initialized');
  }
  
  /**
   * Gera chave única para rate limiting
   */
  generateKey(identifier, model, type = 'request') {
    return `${type}:${identifier}:${model}`;
  }
  
  /**
   * Obtém configuração de limite para um modelo
   */
  getModelConfig(modelId) {
    return this.modelLimits[modelId] || {
      requestsPerMinute: 30,
      tokensPerMinute: 30000,
      concurrentRequests: 5,
      priority: 'medium'
    };
  }
  
  /**
   * Obtém tier do usuário
   */
  getUserTier(userInfo) {
    if (!userInfo || !userInfo.tier) return this.userTiers.free;
    return this.userTiers[userInfo.tier] || this.userTiers.free;
  }
  
  /**
   * Verifica se requisição pode ser processada
   */
  async checkLimit(identifier, modelId, options = {}) {
    // MODO DE TESTE: Sempre permitir requisições
    const modelConfig = this.getModelConfig(modelId);
    const userTier = this.getUserTier(options.userInfo);
    const now = Date.now();
    
    // Aplicar multiplicador do tier
    const effectiveLimits = {
      requestsPerMinute: Math.floor(modelConfig.requestsPerMinute * userTier.multiplier),
      tokensPerMinute: Math.floor(modelConfig.tokensPerMinute * userTier.multiplier),
      concurrentRequests: Math.floor(modelConfig.concurrentRequests * userTier.multiplier)
    };
    
    // MODO DE TESTE: Simular checks mas sempre permitir
    const checks = {
      requests: { allowed: true, current: 0, limit: effectiveLimits.requestsPerMinute, resetTime: now + this.windowSize },
      tokens: { allowed: true, current: 0, estimated: options.estimatedTokens || 1000, limit: effectiveLimits.tokensPerMinute, resetTime: now + this.windowSize },
      concurrent: { allowed: true, current: 0, limit: effectiveLimits.concurrentRequests, resetTime: null },
      daily: { allowed: true, current: 0, limit: userTier.dailyLimit, resetTime: now + 86400000 }
    };
    
    const allowed = true; // MODO DE TESTE: Sempre permitir
    
    const result = {
      allowed,
      limits: effectiveLimits,
      current: {
        requests: checks.requests.current,
        tokens: checks.tokens.current,
        concurrent: checks.concurrent.current,
        daily: checks.daily.current
      },
      resetTime: Math.max(
        checks.requests.resetTime,
        checks.tokens.resetTime,
        checks.daily.resetTime
      ),
      retryAfter: 0, // MODO DE TESTE: Sem retry
      reason: null // MODO DE TESTE: Sem bloqueio
    };
    
    // Emitir eventos
    this.emit('allowed', { identifier, modelId, result });
    
    return result;
  }
  
  /**
   * Verifica limite de requisições por minuto
   */
  async checkRequestLimit(identifier, modelId, limit, now) {
    const key = this.generateKey(identifier, modelId, 'request');
    const windowStart = now - this.windowSize;
    
    if (!this.requestCounts.has(key)) {
      this.requestCounts.set(key, []);
    }
    
    const requests = this.requestCounts.get(key);
    
    // Remover requisições antigas
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    this.requestCounts.set(key, validRequests);
    
    return {
      allowed: validRequests.length < limit,
      current: validRequests.length,
      limit,
      resetTime: validRequests.length > 0 ? validRequests[0] + this.windowSize : now + this.windowSize
    };
  }
  
  /**
   * Verifica limite de tokens por minuto
   */
  async checkTokenLimit(identifier, modelId, estimatedTokens, limit, now) {
    const key = this.generateKey(identifier, modelId, 'token');
    const windowStart = now - this.windowSize;
    
    if (!this.tokenCounts.has(key)) {
      this.tokenCounts.set(key, []);
    }
    
    const tokens = this.tokenCounts.get(key);
    
    // Remover tokens antigos e somar os válidos
    const validTokens = tokens.filter(entry => entry.timestamp > windowStart);
    this.tokenCounts.set(key, validTokens);
    
    const currentTokens = validTokens.reduce((sum, entry) => sum + entry.count, 0);
    
    return {
      allowed: currentTokens + estimatedTokens <= limit,
      current: currentTokens,
      estimated: estimatedTokens,
      limit,
      resetTime: validTokens.length > 0 ? validTokens[0].timestamp + this.windowSize : now + this.windowSize
    };
  }
  
  /**
   * Verifica limite de requisições concorrentes
   */
  async checkConcurrentLimit(identifier, modelId, limit) {
    const key = this.generateKey(identifier, modelId, 'concurrent');
    const current = this.concurrentRequests.get(key) || 0;
    
    return {
      allowed: current < limit,
      current,
      limit,
      resetTime: null // Não se aplica para concorrência
    };
  }
  
  /**
   * Verifica limite diário
   */
  async checkDailyLimit(identifier, limit, now) {
    const dayStart = new Date(now).setHours(0, 0, 0, 0);
    const key = `daily:${identifier}:${dayStart}`;
    
    const current = this.dailyCounts.get(key) || 0;
    
    return {
      allowed: current < limit,
      current,
      limit,
      resetTime: dayStart + 86400000 // Próximo dia
    };
  }
  
  /**
   * Registra uso após requisição aprovada
   */
  async recordUsage(identifier, modelId, options = {}) {
    const now = Date.now();
    const actualTokens = options.actualTokens || options.estimatedTokens || 1000;
    
    // Registrar requisição
    const requestKey = this.generateKey(identifier, modelId, 'request');
    if (!this.requestCounts.has(requestKey)) {
      this.requestCounts.set(requestKey, []);
    }
    this.requestCounts.get(requestKey).push(now);
    
    // Registrar tokens
    const tokenKey = this.generateKey(identifier, modelId, 'token');
    if (!this.tokenCounts.has(tokenKey)) {
      this.tokenCounts.set(tokenKey, []);
    }
    this.tokenCounts.get(tokenKey).push({
      timestamp: now,
      count: actualTokens
    });
    
    // Incrementar contador diário
    const dayStart = new Date(now).setHours(0, 0, 0, 0);
    const dailyKey = `daily:${identifier}:${dayStart}`;
    this.dailyCounts.set(dailyKey, (this.dailyCounts.get(dailyKey) || 0) + 1);
    
    // Incrementar requisições concorrentes
    const concurrentKey = this.generateKey(identifier, modelId, 'concurrent');
    this.concurrentRequests.set(concurrentKey, (this.concurrentRequests.get(concurrentKey) || 0) + 1);
    
    this.emit('usage', {
      identifier,
      modelId,
      tokens: actualTokens,
      timestamp: now
    });
  }
  
  /**
   * Libera requisição concorrente
   */
  async releaseRequest(identifier, modelId) {
    const key = this.generateKey(identifier, modelId, 'concurrent');
    const current = this.concurrentRequests.get(key) || 0;
    
    if (current > 0) {
      this.concurrentRequests.set(key, current - 1);
    }
    
    this.emit('released', { identifier, modelId });
  }
  
  /**
   * Calcula tempo de retry
   */
  calculateRetryAfter(checks) {
    const retryTimes = [];
    
    if (!checks.requests.allowed && checks.requests.resetTime) {
      retryTimes.push(checks.requests.resetTime - Date.now());
    }
    
    if (!checks.tokens.allowed && checks.tokens.resetTime) {
      retryTimes.push(checks.tokens.resetTime - Date.now());
    }
    
    if (!checks.daily.allowed && checks.daily.resetTime) {
      retryTimes.push(checks.daily.resetTime - Date.now());
    }
    
    return retryTimes.length > 0 ? Math.min(...retryTimes) : 60000; // 1 minuto padrão
  }
  
  /**
   * Obtém razão do bloqueio
   */
  getBlockReason(checks) {
    if (!checks.daily.allowed) return 'Daily limit exceeded';
    if (!checks.concurrent.allowed) return 'Too many concurrent requests';
    if (!checks.requests.allowed) return 'Request rate limit exceeded';
    if (!checks.tokens.allowed) return 'Token rate limit exceeded';
    return 'Unknown limit exceeded';
  }
  
  /**
   * Ajusta limites dinamicamente baseado na carga
   */
  async adjustLimitsBasedOnLoad(systemLoad) {
    if (!this.adaptiveMode) return;
    
    const adjustmentFactor = systemLoad > this.loadThreshold ? 0.7 : 1.2;
    
    for (const [modelId, config] of Object.entries(this.modelLimits)) {
      if (systemLoad > this.loadThreshold) {
        // Reduzir limites sob alta carga
        config.requestsPerMinute = Math.floor(config.requestsPerMinute * adjustmentFactor);
        config.concurrentRequests = Math.max(1, Math.floor(config.concurrentRequests * adjustmentFactor));
      } else {
        // Aumentar limites sob baixa carga (com limite máximo)
        const originalConfig = this.getOriginalModelConfig(modelId);
        config.requestsPerMinute = Math.min(
          Math.floor(config.requestsPerMinute * adjustmentFactor),
          originalConfig.requestsPerMinute * 1.5
        );
        config.concurrentRequests = Math.min(
          Math.floor(config.concurrentRequests * adjustmentFactor),
          originalConfig.concurrentRequests * 1.5
        );
      }
    }
    
    this.emit('limitsAdjusted', { systemLoad, adjustmentFactor });
  }
  
  /**
   * Obtém configuração original do modelo
   */
  getOriginalModelConfig(modelId) {
    const originalConfigs = {
      'meta-llama/llama-4-maverick-17b-128e-instruct': {
        requestsPerMinute: 30,
        tokensPerMinute: 50000,
        concurrentRequests: 5
      },
      'gemma2-9b-it': {
        requestsPerMinute: 50,
        tokensPerMinute: 30000,
        concurrentRequests: 8
      },
      'deepseek-r1-distill-llama-70b': {
        requestsPerMinute: 20,
        tokensPerMinute: 80000,
        concurrentRequests: 3
      },
      'qwen/qwen3-32b': {
        requestsPerMinute: 40,
        tokensPerMinute: 40000,
        concurrentRequests: 6
      }
    };
    
    return originalConfigs[modelId] || {
      requestsPerMinute: 30,
      tokensPerMinute: 30000,
      concurrentRequests: 5
    };
  }
  
  /**
   * Obtém estatísticas do rate limiter
   */
  getStats() {
    const stats = {
      totalKeys: this.requestCounts.size + this.tokenCounts.size + this.concurrentRequests.size,
      activeRequests: 0,
      modelStats: {},
      userStats: {},
      systemLoad: this.getCurrentSystemLoad()
    };
    
    // Calcular requisições ativas
    for (const count of this.concurrentRequests.values()) {
      stats.activeRequests += count;
    }
    
    // Estatísticas por modelo
    for (const [modelId, config] of Object.entries(this.modelLimits)) {
      stats.modelStats[modelId] = {
        currentLimits: config,
        activeRequests: 0
      };
      
      for (const [key, count] of this.concurrentRequests.entries()) {
        if (key.includes(modelId)) {
          stats.modelStats[modelId].activeRequests += count;
        }
      }
    }
    
    return stats;
  }
  
  /**
   * Simula carga atual do sistema
   */
  getCurrentSystemLoad() {
    const totalActive = Array.from(this.concurrentRequests.values())
      .reduce((sum, count) => sum + count, 0);
    
    const maxConcurrent = Object.values(this.modelLimits)
      .reduce((sum, config) => sum + config.concurrentRequests, 0);
    
    return maxConcurrent > 0 ? totalActive / maxConcurrent : 0;
  }
  
  /**
   * Limpa contadores expirados
   */
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowSize;
    const dayStart = new Date(now).setHours(0, 0, 0, 0);
    
    let cleaned = 0;
    
    // Limpar contadores de requisições
    for (const [key, requests] of this.requestCounts.entries()) {
      const validRequests = requests.filter(timestamp => timestamp > windowStart);
      if (validRequests.length !== requests.length) {
        this.requestCounts.set(key, validRequests);
        cleaned++;
      }
      if (validRequests.length === 0) {
        this.requestCounts.delete(key);
      }
    }
    
    // Limpar contadores de tokens
    for (const [key, tokens] of this.tokenCounts.entries()) {
      const validTokens = tokens.filter(entry => entry.timestamp > windowStart);
      if (validTokens.length !== tokens.length) {
        this.tokenCounts.set(key, validTokens);
        cleaned++;
      }
      if (validTokens.length === 0) {
        this.tokenCounts.delete(key);
      }
    }
    
    // Limpar contadores diários antigos
    for (const [key, count] of this.dailyCounts.entries()) {
      const keyDayStart = parseInt(key.split(':')[2]);
      if (keyDayStart < dayStart - 86400000) { // Mais de 1 dia
        this.dailyCounts.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.emit('cleanup', { cleaned });
    }
    
    return cleaned;
  }
  
  /**
   * Inicia timer de limpeza
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
   * Reseta todos os limites
   */
  reset() {
    this.requestCounts.clear();
    this.tokenCounts.clear();
    this.concurrentRequests.clear();
    this.dailyCounts.clear();
    this.burstTokens.clear();
    
    this.emit('reset');
  }
  
  /**
   * Desliga o rate limiter
   */
  shutdown() {
    this.stopCleanupTimer();
    this.reset();
    this.emit('shutdown');
    console.log('🚦 Rate Limiter shutdown');
  }
}

export default RateLimiter;
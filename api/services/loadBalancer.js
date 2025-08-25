/**
 * Sistema de Balanceamento de Carga Inteligente para Modelos Groq
 * Distribui requisições baseado em performance, disponibilidade e carga atual
 */

class LoadBalancer {
  constructor(groqService) {
    this.groqService = groqService;
    this.activeConnections = new Map(); // Conexões ativas por modelo
    this.requestQueue = new Map(); // Fila de requisições por modelo
    this.circuitBreakers = new Map(); // Circuit breakers por modelo
    this.healthChecks = new Map(); // Status de saúde dos modelos
    
    // Configurações do balanceador
    this.config = {
      maxConcurrentRequests: 10, // Máximo de requisições simultâneas por modelo
      circuitBreakerThreshold: 5, // Número de falhas para abrir o circuit breaker
      circuitBreakerTimeout: 30000, // Tempo para tentar fechar o circuit breaker (30s)
      healthCheckInterval: 60000, // Intervalo de verificação de saúde (1min)
      queueTimeout: 30000, // Timeout para requisições na fila (30s)
      retryAttempts: 3, // Número de tentativas de retry
      retryDelay: 1000 // Delay entre tentativas (1s)
    };
    
    // Inicializar circuit breakers e health checks
    this.initializeCircuitBreakers();
    this.startHealthChecks();
  }
  
  /**
   * Inicializa circuit breakers para todos os modelos
   */
  initializeCircuitBreakers() {
    const models = this.groqService.getAvailableModels();
    
    models.forEach(model => {
      this.circuitBreakers.set(model.id, {
        state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
        failures: 0,
        lastFailure: null,
        nextAttempt: null
      });
      
      this.activeConnections.set(model.id, 0);
      this.requestQueue.set(model.id, []);
      this.healthChecks.set(model.id, {
        status: 'healthy',
        lastCheck: Date.now(),
        responseTime: 0,
        successRate: 100
      });
    });
  }
  
  /**
   * Inicia verificações periódicas de saúde dos modelos
   */
  startHealthChecks() {
    setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }
  
  /**
   * Realiza verificações de saúde em todos os modelos
   */
  async performHealthChecks() {
    const models = this.groqService.getAvailableModels();
    
    for (const model of models) {
      try {
        const startTime = Date.now();
        
        // Teste simples de conectividade
        await this.groqService.chatWithSpecificModel(
          [{ role: 'user', content: 'test' }],
          model.id,
          { max_completion_tokens: 1 }
        );
        
        const responseTime = Date.now() - startTime;
        const metrics = this.groqService.getModelMetrics(model.id);
        
        this.healthChecks.set(model.id, {
          status: 'healthy',
          lastCheck: Date.now(),
          responseTime,
          successRate: metrics.successRate || 100
        });
        
        // Reset circuit breaker se o modelo está saudável
        if (this.circuitBreakers.get(model.id).state === 'OPEN') {
          this.resetCircuitBreaker(model.id);
        }
        
      } catch (error) {
        this.healthChecks.set(model.id, {
          status: 'unhealthy',
          lastCheck: Date.now(),
          responseTime: 0,
          successRate: 0,
          error: error.message
        });
        
        this.recordFailure(model.id);
      }
    }
  }
  
  /**
   * Seleciona o melhor modelo baseado no algoritmo de balanceamento
   */
  selectBestModel(strategy = 'weighted_round_robin', excludeModels = []) {
    const availableModels = this.getHealthyModels().filter(
      model => !excludeModels.includes(model.id)
    );
    
    if (availableModels.length === 0) {
      throw new Error('Nenhum modelo disponível para balanceamento');
    }
    
    switch (strategy) {
      case 'round_robin':
        return this.roundRobinSelection(availableModels);
      case 'weighted_round_robin':
        return this.weightedRoundRobinSelection(availableModels);
      case 'least_connections':
        return this.leastConnectionsSelection(availableModels);
      case 'fastest_response':
        return this.fastestResponseSelection(availableModels);
      case 'resource_based':
        return this.resourceBasedSelection(availableModels);
      default:
        return this.weightedRoundRobinSelection(availableModels);
    }
  }
  
  /**
   * Obtém modelos saudáveis e disponíveis
   */
  getHealthyModels() {
    const models = this.groqService.getAvailableModels();
    
    return models.filter(model => {
      const health = this.healthChecks.get(model.id);
      const circuitBreaker = this.circuitBreakers.get(model.id);
      const activeConns = this.activeConnections.get(model.id);
      
      return (
        health.status === 'healthy' &&
        circuitBreaker.state !== 'OPEN' &&
        activeConns < this.config.maxConcurrentRequests
      );
    });
  }
  
  /**
   * Seleção Round Robin simples
   */
  roundRobinSelection(models) {
    if (!this.roundRobinIndex) {
      this.roundRobinIndex = 0;
    }
    
    const selectedModel = models[this.roundRobinIndex % models.length];
    this.roundRobinIndex++;
    
    return selectedModel;
  }
  
  /**
   * Seleção Round Robin ponderada por performance
   */
  weightedRoundRobinSelection(models) {
    const weights = models.map(model => {
      const metrics = this.groqService.getModelMetrics(model.id);
      const health = this.healthChecks.get(model.id);
      
      // Calcular peso baseado em múltiplos fatores
      const successWeight = (metrics.successRate || 100) / 100;
      const speedWeight = health.responseTime > 0 ? 1000 / health.responseTime : 1;
      const loadWeight = 1 - (this.activeConnections.get(model.id) / this.config.maxConcurrentRequests);
      
      return successWeight * speedWeight * loadWeight;
    });
    
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (let i = 0; i < models.length; i++) {
      currentWeight += weights[i];
      if (random <= currentWeight) {
        return models[i];
      }
    }
    
    return models[0]; // Fallback
  }
  
  /**
   * Seleção baseada em menor número de conexões
   */
  leastConnectionsSelection(models) {
    return models.reduce((best, current) => {
      const bestConns = this.activeConnections.get(best.id);
      const currentConns = this.activeConnections.get(current.id);
      
      return currentConns < bestConns ? current : best;
    });
  }
  
  /**
   * Seleção baseada em tempo de resposta mais rápido
   */
  fastestResponseSelection(models) {
    return models.reduce((fastest, current) => {
      const fastestTime = this.healthChecks.get(fastest.id).responseTime;
      const currentTime = this.healthChecks.get(current.id).responseTime;
      
      return currentTime < fastestTime ? current : fastest;
    });
  }
  
  /**
   * Seleção baseada em recursos disponíveis
   */
  resourceBasedSelection(models) {
    return models.reduce((best, current) => {
      const bestLoad = this.calculateModelLoad(best.id);
      const currentLoad = this.calculateModelLoad(current.id);
      
      return currentLoad < bestLoad ? current : best;
    });
  }
  
  /**
   * Calcula a carga atual de um modelo
   */
  calculateModelLoad(modelId) {
    const activeConns = this.activeConnections.get(modelId);
    const queueSize = this.requestQueue.get(modelId).length;
    const health = this.healthChecks.get(modelId);
    
    // Normalizar valores entre 0 e 1
    const connectionLoad = activeConns / this.config.maxConcurrentRequests;
    const queueLoad = Math.min(queueSize / 10, 1); // Máximo de 10 na fila
    const responseLoad = Math.min(health.responseTime / 5000, 1); // 5s como máximo
    
    return (connectionLoad + queueLoad + responseLoad) / 3;
  }
  
  /**
   * Executa uma requisição com balanceamento de carga
   */
  async executeWithLoadBalancing(requestFn, strategy = 'weighted_round_robin', options = {}) {
    const maxRetries = options.maxRetries || this.config.retryAttempts;
    const excludeModels = [];
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const selectedModel = this.selectBestModel(strategy, excludeModels);
        
        // Verificar se o modelo pode aceitar mais requisições
        if (!this.canAcceptRequest(selectedModel.id)) {
          await this.queueRequest(selectedModel.id);
        }
        
        // Incrementar conexões ativas
        this.incrementActiveConnections(selectedModel.id);
        
        try {
          const result = await requestFn(selectedModel.id);
          this.recordSuccess(selectedModel.id);
          return {
            result,
            modelUsed: selectedModel.id,
            attempt: attempt + 1,
            loadBalancingStrategy: strategy
          };
        } finally {
          // Decrementar conexões ativas
          this.decrementActiveConnections(selectedModel.id);
        }
        
      } catch (error) {
        const lastModel = this.selectBestModel(strategy, excludeModels);
        this.recordFailure(lastModel.id);
        excludeModels.push(lastModel.id);
        
        if (attempt === maxRetries - 1) {
          throw new Error(`Falha após ${maxRetries} tentativas: ${error.message}`);
        }
        
        // Delay antes da próxima tentativa
        await this.delay(this.config.retryDelay * (attempt + 1));
      }
    }
  }
  
  /**
   * Verifica se um modelo pode aceitar mais requisições
   */
  canAcceptRequest(modelId) {
    const activeConns = this.activeConnections.get(modelId);
    const circuitBreaker = this.circuitBreakers.get(modelId);
    
    return (
      activeConns < this.config.maxConcurrentRequests &&
      circuitBreaker.state !== 'OPEN'
    );
  }
  
  /**
   * Adiciona requisição à fila
   */
  async queueRequest(modelId) {
    return new Promise((resolve, reject) => {
      const queue = this.requestQueue.get(modelId);
      const timeout = setTimeout(() => {
        reject(new Error('Timeout na fila de requisições'));
      }, this.config.queueTimeout);
      
      queue.push({ resolve, reject, timeout });
      
      // Processar fila quando possível
      this.processQueue(modelId);
    });
  }
  
  /**
   * Processa a fila de requisições
   */
  processQueue(modelId) {
    const queue = this.requestQueue.get(modelId);
    
    while (queue.length > 0 && this.canAcceptRequest(modelId)) {
      const { resolve, timeout } = queue.shift();
      clearTimeout(timeout);
      resolve();
    }
  }
  
  /**
   * Incrementa conexões ativas
   */
  incrementActiveConnections(modelId) {
    const current = this.activeConnections.get(modelId);
    this.activeConnections.set(modelId, current + 1);
  }
  
  /**
   * Decrementa conexões ativas
   */
  decrementActiveConnections(modelId) {
    const current = this.activeConnections.get(modelId);
    this.activeConnections.set(modelId, Math.max(0, current - 1));
    
    // Processar fila após liberar conexão
    this.processQueue(modelId);
  }
  
  /**
   * Registra sucesso de um modelo
   */
  recordSuccess(modelId) {
    const circuitBreaker = this.circuitBreakers.get(modelId);
    
    if (circuitBreaker.state === 'HALF_OPEN') {
      this.resetCircuitBreaker(modelId);
    }
  }
  
  /**
   * Registra falha de um modelo
   */
  recordFailure(modelId) {
    const circuitBreaker = this.circuitBreakers.get(modelId);
    circuitBreaker.failures++;
    circuitBreaker.lastFailure = Date.now();
    
    if (circuitBreaker.failures >= this.config.circuitBreakerThreshold) {
      this.openCircuitBreaker(modelId);
    }
  }
  
  /**
   * Abre circuit breaker
   */
  openCircuitBreaker(modelId) {
    const circuitBreaker = this.circuitBreakers.get(modelId);
    circuitBreaker.state = 'OPEN';
    circuitBreaker.nextAttempt = Date.now() + this.config.circuitBreakerTimeout;
    
    console.log(`Circuit breaker ABERTO para modelo ${modelId}`);
    
    // Agendar tentativa de fechar o circuit breaker
    setTimeout(() => {
      this.halfOpenCircuitBreaker(modelId);
    }, this.config.circuitBreakerTimeout);
  }
  
  /**
   * Coloca circuit breaker em estado half-open
   */
  halfOpenCircuitBreaker(modelId) {
    const circuitBreaker = this.circuitBreakers.get(modelId);
    circuitBreaker.state = 'HALF_OPEN';
    
    console.log(`Circuit breaker MEIO-ABERTO para modelo ${modelId}`);
  }
  
  /**
   * Reseta circuit breaker
   */
  resetCircuitBreaker(modelId) {
    const circuitBreaker = this.circuitBreakers.get(modelId);
    circuitBreaker.state = 'CLOSED';
    circuitBreaker.failures = 0;
    circuitBreaker.lastFailure = null;
    circuitBreaker.nextAttempt = null;
    
    console.log(`Circuit breaker FECHADO para modelo ${modelId}`);
  }
  
  /**
   * Obtém estatísticas do balanceador
   */
  getLoadBalancerStats() {
    const stats = {
      timestamp: Date.now(),
      totalActiveConnections: 0,
      totalQueuedRequests: 0,
      modelStats: {},
      circuitBreakerStates: {},
      healthStatus: {}
    };
    
    for (const [modelId, connections] of this.activeConnections) {
      stats.totalActiveConnections += connections;
      stats.totalQueuedRequests += this.requestQueue.get(modelId).length;
      
      stats.modelStats[modelId] = {
        activeConnections: connections,
        queuedRequests: this.requestQueue.get(modelId).length,
        load: this.calculateModelLoad(modelId)
      };
      
      stats.circuitBreakerStates[modelId] = this.circuitBreakers.get(modelId);
      stats.healthStatus[modelId] = this.healthChecks.get(modelId);
    }
    
    return stats;
  }
  
  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Limpa recursos e para health checks
   */
  cleanup() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Limpar todas as filas
    for (const queue of this.requestQueue.values()) {
      queue.forEach(({ reject, timeout }) => {
        clearTimeout(timeout);
        reject(new Error('Load balancer foi finalizado'));
      });
      queue.length = 0;
    }
  }
}

export default LoadBalancer;
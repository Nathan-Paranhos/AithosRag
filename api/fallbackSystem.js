import { EventEmitter } from 'events';

class FallbackSystem extends EventEmitter {
  constructor(groqService, loadBalancer) {
    super();
    this.groqService = groqService;
    this.loadBalancer = loadBalancer;
    this.fallbackChains = new Map();
    this.modelFailures = new Map();
    this.serviceFailures = new Map(); // Track microservice failures
    this.maxRetries = 3;
    this.failureThreshold = 5;
    this.recoveryTime = 300000; // 5 minutos
    this.isEnabled = true;
    
    this.initializeFallbackChains();
    this.initializeServiceFallbacks();
    this.startRecoveryMonitor();
  }

  initializeServiceFallbacks() {
    // Initialize microservice fallback tracking
    const services = ['auth', 'chat', 'analytics', 'user', 'notification', 'file'];
    
    services.forEach(service => {
      this.serviceFailures.set(service, {
        count: 0,
        lastFailure: null,
        isDown: false,
        consecutiveFailures: 0,
        lastSuccessfulCall: new Date()
      });
    });
  }

  // Microservice fallback methods
  async executeServiceWithFallback(serviceName, operation, fallbackResponse = null) {
    const serviceStatus = this.serviceFailures.get(serviceName);
    
    if (!serviceStatus) {
      throw new Error(`Unknown service: ${serviceName}`);
    }

    // If service is marked as down, return fallback immediately
    if (serviceStatus.isDown && fallbackResponse) {
      console.log(`[ServiceFallback] Service ${serviceName} is down, using fallback`);
      return this.createFallbackResponse(serviceName, fallbackResponse);
    }

    try {
      const result = await operation();
      
      // Success - reset failure counters
      this.resetServiceFailures(serviceName);
      
      this.emit('service_success', {
        serviceName,
        timestamp: new Date()
      });
      
      return result;
      
    } catch (error) {
      console.error(`[ServiceFallback] Service ${serviceName} failed:`, error.message);
      
      // Record failure
      this.recordServiceFailure(serviceName, error);
      
      // Return fallback if available
      if (fallbackResponse) {
        return this.createFallbackResponse(serviceName, fallbackResponse, error);
      }
      
      throw error;
    }
  }

  recordServiceFailure(serviceName, error) {
    const failure = this.serviceFailures.get(serviceName);
    if (!failure) return;
    
    failure.count++;
    failure.consecutiveFailures++;
    failure.lastFailure = new Date();
    
    // Mark service as down if too many consecutive failures
    if (failure.consecutiveFailures >= this.failureThreshold) {
      failure.isDown = true;
      console.warn(`[ServiceFallback] Service ${serviceName} marked as DOWN after ${failure.consecutiveFailures} consecutive failures`);
      
      this.emit('service_down', {
        serviceName,
        failureCount: failure.count,
        consecutiveFailures: failure.consecutiveFailures,
        error: error.message
      });
    }
    
    this.emit('service_failure', {
      serviceName,
      error: error.message,
      consecutiveFailures: failure.consecutiveFailures
    });
  }

  resetServiceFailures(serviceName) {
    const failure = this.serviceFailures.get(serviceName);
    if (failure) {
      failure.consecutiveFailures = 0;
      failure.isDown = false;
      failure.lastSuccessfulCall = new Date();
    }
  }

  createFallbackResponse(serviceName, fallbackData, error = null) {
    const response = {
      success: true,
      data: fallbackData,
      fallback: true,
      serviceName,
      timestamp: new Date().toISOString(),
      message: `Using fallback response for ${serviceName} service`
    };
    
    if (error) {
      response.originalError = error.message;
    }
    
    this.emit('fallback_used', {
      serviceName,
      fallbackData,
      error: error?.message
    });
    
    return response;
  }

  // Service-specific fallback responses
  getServiceFallbacks() {
    return {
      auth: {
        login: { success: false, message: 'Authentication service temporarily unavailable. Please try again later.' },
        validate: { valid: false, message: 'Unable to validate token. Service unavailable.' },
        register: { success: false, message: 'Registration service temporarily unavailable. Please try again later.' }
      },
      chat: {
        send: { success: false, message: 'Chat service temporarily unavailable. Your message will be processed when service is restored.' },
        history: { messages: [], message: 'Chat history temporarily unavailable.' }
      },
      analytics: {
        track: { success: true, message: 'Event tracked locally. Will sync when analytics service is restored.' },
        report: { data: {}, message: 'Analytics data temporarily unavailable.' }
      },
      user: {
        profile: { user: null, message: 'User profile temporarily unavailable.' },
        update: { success: false, message: 'Profile update service temporarily unavailable. Please try again later.' }
      },
      notification: {
        send: { success: true, message: 'Notification queued. Will be sent when service is restored.' },
        list: { notifications: [], message: 'Notifications temporarily unavailable.' }
      },
      file: {
        upload: { success: false, message: 'File upload service temporarily unavailable. Please try again later.' },
        download: { success: false, message: 'File download service temporarily unavailable.' }
      }
    };
  }

  // Get service status
  getServiceStatus(serviceName = null) {
    if (serviceName) {
      return this.serviceFailures.get(serviceName) || null;
    }
    
    const status = {};
    this.serviceFailures.forEach((failure, service) => {
      status[service] = {
        isDown: failure.isDown,
        consecutiveFailures: failure.consecutiveFailures,
        lastFailure: failure.lastFailure,
        lastSuccessfulCall: failure.lastSuccessfulCall
      };
    });
    
    return status;
  }

  initializeFallbackChains() {
    // Definir cadeias de fallback por categoria
    this.fallbackChains.set('reasoning', [
      'deepseek-r1-distill-llama-70b',
      'meta-llama/llama-4-maverick-17b-128e-instruct',
      'qwen/qwen3-32b',
      'gemma2-9b-it'
    ]);

    this.fallbackChains.set('general', [
      'meta-llama/llama-4-maverick-17b-128e-instruct',
      'qwen/qwen3-32b',
      'gemma2-9b-it',
      'deepseek-r1-distill-llama-70b'
    ]);

    this.fallbackChains.set('fast', [
      'gemma2-9b-it',
      'qwen/qwen3-32b',
      'meta-llama/llama-4-maverick-17b-128e-instruct',
      'deepseek-r1-distill-llama-70b'
    ]);

    this.fallbackChains.set('creative', [
      'qwen/qwen3-32b',
      'meta-llama/llama-4-maverick-17b-128e-instruct',
      'gemma2-9b-it',
      'deepseek-r1-distill-llama-70b'
    ]);

    // Inicializar contadores de falha
    const allModels = new Set();
    this.fallbackChains.forEach(chain => {
      chain.forEach(model => allModels.add(model));
    });

    allModels.forEach(model => {
      this.modelFailures.set(model, {
        count: 0,
        lastFailure: null,
        isBlacklisted: false,
        consecutiveFailures: 0
      });
    });
  }

  async executeWithFallback(originalModel, messages, options = {}) {
    if (!this.isEnabled) {
      return await this.groqService.createChatCompletion(originalModel, messages, options);
    }

    const category = this.determineCategory(originalModel, options.category);
    const fallbackChain = this.getFallbackChain(originalModel, category);
    
    let lastError = null;
    let attemptCount = 0;
    
    for (const modelId of fallbackChain) {
      if (this.isModelBlacklisted(modelId)) {
        console.log(`[Fallback] Modelo ${modelId} está na blacklist, pulando...`);
        continue;
      }

      try {
        attemptCount++;
        console.log(`[Fallback] Tentativa ${attemptCount}: usando modelo ${modelId}`);
        
        const result = await this.attemptModelExecution(modelId, messages, options);
        
        // Sucesso - resetar contador de falhas
        this.resetModelFailures(modelId);
        
        // Emitir evento de sucesso
        this.emit('fallback_success', {
          originalModel,
          usedModel: modelId,
          attemptCount,
          category
        });
        
        return {
          ...result,
          metadata: {
            ...result.metadata,
            fallbackUsed: originalModel !== modelId,
            originalModel,
            usedModel: modelId,
            attemptCount
          }
        };
        
      } catch (error) {
        lastError = error;
        console.error(`[Fallback] Falha no modelo ${modelId}:`, error.message);
        
        // Registrar falha
        this.recordModelFailure(modelId, error);
        
        // Emitir evento de falha
        this.emit('model_failure', {
          modelId,
          error: error.message,
          originalModel,
          attemptCount
        });
        
        // Se for o último modelo da cadeia, não continuar
        if (modelId === fallbackChain[fallbackChain.length - 1]) {
          break;
        }
        
        // Aguardar um pouco antes da próxima tentativa
        await this.delay(1000 * attemptCount);
      }
    }
    
    // Todos os modelos falharam
    this.emit('fallback_exhausted', {
      originalModel,
      category,
      attemptCount,
      lastError: lastError?.message
    });
    
    throw new Error(`Todos os modelos de fallback falharam. Último erro: ${lastError?.message}`);
  }

  async attemptModelExecution(modelId, messages, options) {
    const timeout = options.timeout || 30000;
    
    return Promise.race([
      this.groqService.chatWithExactModel(messages, modelId, {
        ...options,
        skipCache: options.skipCache || false
      }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), timeout);
      })
    ]);
  }

  determineCategory(modelId, explicitCategory) {
    if (explicitCategory) return explicitCategory;
    
    // Determinar categoria baseada no modelo
    if (modelId.includes('deepseek')) return 'reasoning';
    if (modelId.includes('gemma')) return 'fast';
    if (modelId.includes('qwen')) return 'creative';
    return 'general';
  }

  getFallbackChain(originalModel, category) {
    const chain = this.fallbackChains.get(category) || this.fallbackChains.get('general');
    
    // Colocar o modelo original no início se não estiver
    if (!chain.includes(originalModel)) {
      return [originalModel, ...chain.filter(m => m !== originalModel)];
    }
    
    // Reorganizar para começar com o modelo original
    const index = chain.indexOf(originalModel);
    return [...chain.slice(index), ...chain.slice(0, index)];
  }

  recordModelFailure(modelId, error) {
    const failure = this.modelFailures.get(modelId);
    if (!failure) return;
    
    failure.count++;
    failure.consecutiveFailures++;
    failure.lastFailure = new Date();
    
    // Blacklistar modelo se muitas falhas consecutivas
    if (failure.consecutiveFailures >= this.failureThreshold) {
      failure.isBlacklisted = true;
      console.warn(`[Fallback] Modelo ${modelId} foi blacklistado após ${failure.consecutiveFailures} falhas consecutivas`);
      
      this.emit('model_blacklisted', {
        modelId,
        failureCount: failure.count,
        consecutiveFailures: failure.consecutiveFailures
      });
    }
  }

  resetModelFailures(modelId) {
    const failure = this.modelFailures.get(modelId);
    if (failure) {
      failure.consecutiveFailures = 0;
    }
  }

  isModelBlacklisted(modelId) {
    const failure = this.modelFailures.get(modelId);
    return failure?.isBlacklisted || false;
  }

  startRecoveryMonitor() {
    setInterval(() => {
      this.checkModelRecovery();
    }, 60000); // Verificar a cada minuto
  }

  checkModelRecovery() {
    const now = new Date();
    
    this.modelFailures.forEach((failure, modelId) => {
      if (failure.isBlacklisted && failure.lastFailure) {
        const timeSinceFailure = now - failure.lastFailure;
        
        if (timeSinceFailure >= this.recoveryTime) {
          console.log(`[Fallback] Tentando recuperar modelo ${modelId}...`);
          this.attemptModelRecovery(modelId);
        }
      }
    });
  }

  async attemptModelRecovery(modelId) {
    try {
      // Teste simples para verificar se o modelo está funcionando
      await this.groqService.chatWithExactModel([
        { role: 'user', content: 'Test' }
      ], modelId, { maxTokens: 1 });
      
      // Sucesso - remover da blacklist
      const failure = this.modelFailures.get(modelId);
      if (failure) {
        failure.isBlacklisted = false;
        failure.consecutiveFailures = 0;
        console.log(`[Fallback] Modelo ${modelId} foi recuperado com sucesso`);
        
        this.emit('model_recovered', { modelId });
      }
      
    } catch (error) {
      console.log(`[Fallback] Modelo ${modelId} ainda não está disponível`);
    }
  }

  // Métodos de configuração e monitoramento
  setFallbackChain(category, models) {
    this.fallbackChains.set(category, models);
  }

  getFallbackStats() {
    const stats = {
      isEnabled: this.isEnabled,
      totalModels: this.modelFailures.size,
      blacklistedModels: 0,
      modelStats: {}
    };
    
    this.modelFailures.forEach((failure, modelId) => {
      if (failure.isBlacklisted) {
        stats.blacklistedModels++;
      }
      
      stats.modelStats[modelId] = {
        totalFailures: failure.count,
        consecutiveFailures: failure.consecutiveFailures,
        isBlacklisted: failure.isBlacklisted,
        lastFailure: failure.lastFailure
      };
    });
    
    return stats;
  }

  resetModelStats(modelId) {
    if (modelId) {
      const failure = this.modelFailures.get(modelId);
      if (failure) {
        failure.count = 0;
        failure.consecutiveFailures = 0;
        failure.isBlacklisted = false;
        failure.lastFailure = null;
      }
    } else {
      // Reset all models
      this.modelFailures.forEach(failure => {
        failure.count = 0;
        failure.consecutiveFailures = 0;
        failure.isBlacklisted = false;
        failure.lastFailure = null;
      });
    }
  }

  enable() {
    this.isEnabled = true;
    console.log('[Fallback] Sistema de fallback ativado');
  }

  disable() {
    this.isEnabled = false;
    console.log('[Fallback] Sistema de fallback desativado');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Métodos para microsserviços
  getServiceFallbacks() {
    const fallbacks = {};
    this.serviceFallbacks.forEach((config, serviceName) => {
      fallbacks[serviceName] = {
        enabled: config.enabled,
        fallbackResponse: config.fallbackResponse,
        lastUsed: config.lastUsed
      };
    });
    return fallbacks;
  }

  getServiceFailureStats() {
    const stats = {};
    this.serviceFailures.forEach((failure, serviceName) => {
      stats[serviceName] = {
        totalFailures: failure.count,
        consecutiveFailures: failure.consecutiveFailures,
        isDown: failure.isDown,
        lastFailure: failure.lastFailure,
        lastSuccess: failure.lastSuccess
      };
    });
    return stats;
  }

  getAllStats() {
    return {
      models: this.getFallbackStats(),
      services: this.getServiceFailureStats(),
      fallbacks: this.getServiceFallbacks()
    };
  }
}

export default FallbackSystem;
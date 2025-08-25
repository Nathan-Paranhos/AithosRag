import { EventEmitter } from 'events';

class FallbackSystem extends EventEmitter {
  constructor(groqService, loadBalancer) {
    super();
    this.groqService = groqService;
    this.loadBalancer = loadBalancer;
    this.fallbackChains = new Map();
    this.modelFailures = new Map();
    this.maxRetries = 3;
    this.failureThreshold = 5;
    this.recoveryTime = 300000; // 5 minutos
    this.isEnabled = true;
    
    this.initializeFallbackChains();
    this.startRecoveryMonitor();
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
}

export default FallbackSystem;
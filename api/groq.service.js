import Groq from 'groq-sdk';

class GroqService {
  constructor() {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY não está configurada nas variáveis de ambiente');
    }

    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    // Configurações específicas para cada modelo
    this.modelConfigs = {
      'meta-llama/llama-4-maverick-17b-128e-instruct': {
        name: 'Llama 4 Maverick 17B',
        description: 'Modelo avançado com contexto estendido',
        temperature: 1,
        maxTokens: 8192,
        topP: 1,
        category: 'advanced',
        priority: 1
      },
      'gemma2-9b-it': {
        name: 'Gemma2 9B IT',
        description: 'Modelo otimizado para tarefas técnicas',
        temperature: 1,
        maxTokens: 8192,
        topP: 1,
        category: 'technical',
        priority: 2
      },
      'deepseek-r1-distill-llama-70b': {
        name: 'DeepSeek R1 Distill Llama 70B',
        description: 'Modelo de raciocínio avançado',
        temperature: 1.1,
        maxTokens: 131072,
        topP: 0.95,
        category: 'reasoning',
        priority: 3
      },
      'qwen/qwen3-32b': {
        name: 'Qwen3 32B',
        description: 'Modelo multilíngue com raciocínio',
        temperature: 0.84,
        maxTokens: 40960,
        topP: 0.95,
        reasoningEffort: 'none',
        category: 'multilingual',
        priority: 4
      },
      'openai/gpt-oss-120b': {
        name: 'GPT OSS 120B',
        description: 'Modelo avançado com ferramentas de busca e interpretação de código',
        temperature: 1,
        maxTokens: 65536,
        topP: 1,
        reasoningEffort: 'high',
        category: 'advanced-tools',
        priority: 5,
        tools: [
          { type: 'browser_search' },
          { type: 'code_interpreter' }
        ],
        stream: true
      }
    };

    this.defaultModel = 'meta-llama/llama-4-maverick-17b-128e-instruct';
    
    // Sistema de métricas
    this.metrics = {
      requests: {},
      errors: {},
      responseTime: {},
      usage: {}
    };

    // Sistema de cache
    this.cache = new Map();
    this.cacheMaxSize = 1000;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos

    // Rate limiting por modelo
    this.rateLimits = {};
    this.initializeRateLimits();
  }

  /**
   * Inicializa rate limits para cada modelo
   */
  initializeRateLimits() {
    Object.keys(this.modelConfigs).forEach(model => {
      this.rateLimits[model] = {
        requests: [],
        maxRequests: 60, // 60 requests por minuto
        windowMs: 60 * 1000
      };
    });
  }

  /**
   * Verifica rate limit para um modelo
   */
  checkRateLimit(model) {
    const now = Date.now();
    const modelLimit = this.rateLimits[model];
    
    if (!modelLimit) return true;

    // Remove requests antigas
    modelLimit.requests = modelLimit.requests.filter(
      timestamp => now - timestamp < modelLimit.windowMs
    );

    return modelLimit.requests.length < modelLimit.maxRequests;
  }

  /**
   * Registra uma request no rate limit
   */
  recordRequest(model) {
    if (this.rateLimits[model]) {
      this.rateLimits[model].requests.push(Date.now());
    }
  }

  /**
   * Gera chave de cache
   */
  generateCacheKey(messages, model, options) {
    const key = JSON.stringify({ messages, model, options });
    return Buffer.from(key).toString('base64').slice(0, 50);
  }

  /**
   * Verifica cache
   */
  getFromCache(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * Salva no cache
   */
  saveToCache(cacheKey, data) {
    if (this.cache.size >= this.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Seleciona o melhor modelo baseado em métricas
   */
  selectBestModel(requestedModel = null, category = null) {
    if (requestedModel && this.modelConfigs[requestedModel]) {
      return requestedModel;
    }

    const availableModels = Object.keys(this.modelConfigs)
      .filter(model => {
        if (category && this.modelConfigs[model].category !== category) {
          return false;
        }
        return this.checkRateLimit(model);
      })
      .sort((a, b) => {
        const aErrors = this.metrics.errors[a] || 0;
        const bErrors = this.metrics.errors[b] || 0;
        const aTime = this.metrics.responseTime[a] || 0;
        const bTime = this.metrics.responseTime[b] || 0;
        
        // Prioriza modelos com menos erros e menor tempo de resposta
        return (aErrors - bErrors) || (aTime - bTime);
      });

    return availableModels[0] || this.defaultModel;
  }

  /**
   * Envia uma mensagem para o Groq e retorna a resposta
   * @param {Array} messages - Array de mensagens no formato OpenAI
   * @param {Object} options - Opções adicionais
   * @returns {Promise<Object>} - Resposta da API
   */
  async chat(messages, options = {}) {
    const startTime = Date.now();
    let selectedModel = options.model;
    let attempts = 0;
    const maxAttempts = 3;

    // Gerar chave de cache
    const cacheKey = this.generateCacheKey(messages, selectedModel, options);
    
    // Verificar cache
    if (!options.skipCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log('Resposta encontrada no cache');
        return cached;
      }
    }

    while (attempts < maxAttempts) {
      try {
        // Selecionar modelo (com fallback automático)
        selectedModel = this.selectBestModel(selectedModel, options.category);
        const modelConfig = this.modelConfigs[selectedModel];

        if (!this.checkRateLimit(selectedModel)) {
          console.log(`Rate limit atingido para ${selectedModel}, tentando outro modelo`);
          selectedModel = null;
          attempts++;
          continue;
        }

        this.recordRequest(selectedModel);

        const requestConfig = {
          messages,
          model: selectedModel,
          max_tokens: options.maxTokens || modelConfig.maxTokens,
          temperature: options.temperature || modelConfig.temperature,
          top_p: options.topP || modelConfig.topP,
          stream: options.stream || false
        };

        // Adicionar reasoning_effort para modelos que suportam
        if (modelConfig.reasoningEffort) {
          requestConfig.reasoning_effort = modelConfig.reasoningEffort;
        }

        // Adicionar tools do modelo ou das opções
        const modelTools = modelConfig.tools || [];
        const optionTools = options.tools || [];
        const allTools = [...modelTools, ...optionTools];
        
        if (allTools.length > 0) {
          requestConfig.tools = allTools;
          requestConfig.tool_choice = 'auto';
        }

        console.log('Enviando requisição para Groq:', {
          model: selectedModel,
          messagesCount: messages.length,
          stream: requestConfig.stream,
          hasTools: !!options.tools,
          attempt: attempts + 1
        });

        const response = await this.groq.chat.completions.create(requestConfig);
        const responseTime = Date.now() - startTime;

        // Atualizar métricas
        this.updateMetrics(selectedModel, 'success', responseTime, response.usage);

        const result = {
          success: true,
          data: response,
          usage: response.usage,
          model: selectedModel,
          modelConfig: modelConfig,
          responseTime,
          fromCache: false,
          attempts: attempts + 1
        };

        // Salvar no cache
        if (!options.skipCache && !requestConfig.stream) {
          this.saveToCache(cacheKey, result);
        }

        return result;
      } catch (error) {
        console.error(`Erro na comunicação com Groq (tentativa ${attempts + 1}):`, error);
        
        // Atualizar métricas de erro
        this.updateMetrics(selectedModel, 'error', Date.now() - startTime);
        
        attempts++;
        selectedModel = null; // Força seleção de outro modelo
        
        // Tratamento específico para diferentes tipos de erro
        const errorCode = error.status || error.code || 500;
        const isServiceUnavailable = errorCode === 503 || error.message?.includes('Service Unavailable');
        const isRateLimit = errorCode === 429 || error.message?.includes('rate limit');
        const isServerError = errorCode >= 500;
        
        if (attempts >= maxAttempts) {
          // Mensagem de erro mais amigável baseada no tipo
          let userMessage = error.message;
          if (isServiceUnavailable) {
            userMessage = 'O serviço de IA está temporariamente indisponível. Tente novamente em alguns minutos.';
          } else if (isRateLimit) {
            userMessage = 'Muitas requisições foram feitas. Aguarde um momento antes de tentar novamente.';
          } else if (isServerError) {
            userMessage = 'Erro interno do servidor de IA. Nossa equipe foi notificada.';
          }
          
          // Se o erro principal é 503 (Service Unavailable), usa fallback offline
          if (isServiceUnavailable) {
            console.log('🔄 Usando fallback offline devido à indisponibilidade do serviço');
            const fallbackResponse = this.getOfflineFallback(messages, options);
            return fallbackResponse;
          }
          
          return {
            success: false,
            error: {
              message: userMessage,
              originalMessage: error.message,
              type: error.type || 'groq_error',
              code: errorCode,
              attempts,
              isServiceUnavailable,
              isRateLimit,
              isServerError
            }
          };
        }
        
        // Tempo de espera progressivo baseado no tipo de erro
        let waitTime = 1000 * attempts;
        if (isServiceUnavailable) {
          waitTime = Math.min(5000 * attempts, 30000); // Até 30s para 503
        } else if (isRateLimit) {
          waitTime = Math.min(2000 * attempts, 10000); // Até 10s para rate limit
        }
        
        console.log(`Aguardando ${waitTime}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Atualiza métricas do modelo
   */
  updateMetrics(model, type, responseTime, usage = null) {
    if (!this.metrics.requests[model]) {
      this.metrics.requests[model] = 0;
      this.metrics.errors[model] = 0;
      this.metrics.responseTime[model] = [];
      this.metrics.usage[model] = { totalTokens: 0, requests: 0 };
    }

    this.metrics.requests[model]++;
    
    if (type === 'error') {
      this.metrics.errors[model]++;
    }

    // Manter apenas os últimos 100 tempos de resposta
    this.metrics.responseTime[model].push(responseTime);
    if (this.metrics.responseTime[model].length > 100) {
      this.metrics.responseTime[model].shift();
    }

    if (usage) {
      this.metrics.usage[model].totalTokens += usage.total_tokens || 0;
      this.metrics.usage[model].requests++;
    }
  }

  /**
   * Cria um stream simulado para fallback offline
   * @param {Object} fallbackResponse - Resposta de fallback
   * @returns {AsyncIterable} - Stream simulado
   */
  async* createMockStream(fallbackResponse) {
    const content = fallbackResponse.choices[0].message.content;
    const words = content.split(' ');
    
    // Simula streaming palavra por palavra
    for (let i = 0; i < words.length; i++) {
      const chunk = {
        id: `chatcmpl-offline-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'offline-fallback',
        choices: [{
          index: 0,
          delta: {
            content: (i === 0 ? '' : ' ') + words[i]
          },
          finish_reason: null
        }]
      };
      
      yield chunk;
      
      // Pequena pausa para simular streaming real
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Chunk final
    yield {
      id: `chatcmpl-offline-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: 'offline-fallback',
      choices: [{
        index: 0,
        delta: {},
        finish_reason: 'stop'
      }]
    };
  }

  /**
   * Fallback offline quando a API está indisponível
   * @param {Array} messages - Mensagens do usuário
   * @param {Object} options - Opções
   * @returns {Object} - Resposta de fallback
   */
  getOfflineFallback(messages, options = {}) {
    const lastMessage = messages[messages.length - 1];
    const userContent = lastMessage?.content || '';
    
    // Respostas pré-definidas baseadas em palavras-chave
    const fallbackResponses = {
      greeting: [
        'Olá! Sou o assistente Aithos RAG. No momento estou operando em modo offline limitado.',
        'Oi! Estou aqui para ajudar, mas com funcionalidades reduzidas devido à indisponibilidade temporária do serviço.'
      ],
      help: [
        'Posso ajudar com informações básicas sobre o Aithos RAG. Nossa IA completa estará disponível em breve.',
        'Estou aqui para ajudar! Embora em modo limitado, posso fornecer informações gerais sobre nossos serviços.'
      ],
      default: [
        'Desculpe, estou com funcionalidades limitadas no momento. Tente novamente em alguns minutos para uma resposta completa da IA.',
        'No momento estou operando em modo offline. Para uma experiência completa, tente novamente em breve.',
        'Serviço temporariamente indisponível. Nossa equipe está trabalhando para restaurar a funcionalidade completa.'
      ]
    };
    
    let responseType = 'default';
    const lowerContent = userContent.toLowerCase();
    
    if (lowerContent.includes('olá') || lowerContent.includes('oi') || lowerContent.includes('hello')) {
      responseType = 'greeting';
    } else if (lowerContent.includes('ajuda') || lowerContent.includes('help') || lowerContent.includes('como')) {
      responseType = 'help';
    }
    
    const responses = fallbackResponses[responseType];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    return {
      success: true,
      isOfflineFallback: true,
      data: {
        choices: [{
          message: {
            role: 'assistant',
            content: randomResponse
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        },
        model: 'offline-fallback'
      },
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      },
      model: 'offline-fallback',
      modelConfig: {
        name: 'Fallback Offline',
        description: 'Resposta de emergência quando o serviço está indisponível'
      },
      responseTime: 0,
      fromCache: false,
      attempts: 1
    };
  }

  /**
   * Envia uma mensagem para o Groq com streaming
   * @param {Array} messages - Array de mensagens no formato OpenAI
   * @param {Object} options - Opções adicionais
   * @returns {Promise<AsyncIterable>} - Stream de resposta
   */
  async chatStream(messages, options = {}) {
    const startTime = Date.now();
    let selectedModel = options.model;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        // Selecionar modelo (com fallback automático)
        selectedModel = this.selectBestModel(selectedModel, options.category);
        const modelConfig = this.modelConfigs[selectedModel];

        if (!this.checkRateLimit(selectedModel)) {
          console.log(`Rate limit atingido para ${selectedModel}, tentando outro modelo`);
          selectedModel = null;
          attempts++;
          continue;
        }

        this.recordRequest(selectedModel);

        const requestConfig = {
          messages,
          model: selectedModel,
          max_tokens: options.maxTokens || modelConfig.maxTokens,
          temperature: options.temperature || modelConfig.temperature,
          top_p: options.topP || modelConfig.topP,
          stream: true
        };

        // Adicionar reasoning_effort para modelos que suportam
        if (modelConfig.reasoningEffort) {
          requestConfig.reasoning_effort = modelConfig.reasoningEffort;
        }

        // Adicionar tools do modelo ou das opções
        const modelTools = modelConfig.tools || [];
        const optionTools = options.tools || [];
        const allTools = [...modelTools, ...optionTools];
        
        if (allTools.length > 0) {
          requestConfig.tools = allTools;
          requestConfig.tool_choice = 'auto';
        }

        console.log('Iniciando stream com Groq:', {
          model: selectedModel,
          messagesCount: messages.length,
          hasTools: !!options.tools,
          attempt: attempts + 1
        });

        const stream = await this.groq.chat.completions.create(requestConfig);
        
        // Atualizar métricas de sucesso
        this.updateMetrics(selectedModel, 'success', Date.now() - startTime);
        
        return {
          success: true,
          stream,
          model: selectedModel,
          modelConfig: modelConfig,
          attempts: attempts + 1
        };
      } catch (error) {
        console.error(`Erro no streaming com Groq (tentativa ${attempts + 1}):`, error);
        
        // Atualizar métricas de erro
        this.updateMetrics(selectedModel, 'error', Date.now() - startTime);
        
        attempts++;
        selectedModel = null; // Força seleção de outro modelo
        
        // Tratamento específico para diferentes tipos de erro
        const errorCode = error.status || error.code || 500;
        const isServiceUnavailable = errorCode === 503 || error.message?.includes('Service Unavailable');
        const isRateLimit = errorCode === 429 || error.message?.includes('rate limit');
        const isServerError = errorCode >= 500;
        
        if (attempts >= maxAttempts) {
          // Mensagem de erro mais amigável baseada no tipo
          let userMessage = error.message;
          if (isServiceUnavailable) {
            userMessage = 'O serviço de IA está temporariamente indisponível. Tente novamente em alguns minutos.';
          } else if (isRateLimit) {
            userMessage = 'Muitas requisições foram feitas. Aguarde um momento antes de tentar novamente.';
          } else if (isServerError) {
            userMessage = 'Erro interno do servidor de IA. Nossa equipe foi notificada.';
          }
          
          // Se o erro principal é 503 (Service Unavailable), usa fallback offline
          if (isServiceUnavailable) {
            console.log('🔄 Usando fallback offline para stream devido à indisponibilidade do serviço');
            const fallbackResponse = this.getOfflineFallback(messages, options);
            // Para streaming, criamos um stream simulado
            const mockStream = this.createMockStream(fallbackResponse);
            return {
              success: true,
              stream: mockStream,
              model: 'offline-fallback',
              modelConfig: { name: 'Fallback Offline' },
              attempts: attempts + 1,
              isOfflineFallback: true
            };
          }
          
          return {
            success: false,
            error: {
              message: userMessage,
              originalMessage: error.message,
              type: error.type || 'groq_stream_error',
              code: errorCode,
              attempts,
              isServiceUnavailable,
              isRateLimit,
              isServerError
            }
          };
        }
        
        // Tempo de espera progressivo baseado no tipo de erro
        let waitTime = 1000 * attempts;
        if (isServiceUnavailable) {
          waitTime = Math.min(5000 * attempts, 30000); // Até 30s para 503
        } else if (isRateLimit) {
          waitTime = Math.min(2000 * attempts, 10000); // Até 10s para rate limit
        }
        
        console.log(`Aguardando ${waitTime}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Fallback offline quando a API está indisponível
   * @param {Array} messages - Mensagens do usuário
   * @param {Object} options - Opções
   * @returns {Object} - Resposta de fallback
   */
  getOfflineFallback(messages, options = {}) {
    const lastMessage = messages[messages.length - 1];
    const userContent = lastMessage?.content || '';
    
    // Respostas pré-definidas baseadas em palavras-chave
    const fallbackResponses = {
      greeting: [
        'Olá! Sou o assistente Aithos RAG. No momento estou operando em modo offline limitado.',
        'Oi! Estou aqui para ajudar, mas com funcionalidades reduzidas devido à indisponibilidade temporária do serviço.'
      ],
      help: [
        'Posso ajudar com informações básicas sobre o Aithos RAG. Nossa IA completa estará disponível em breve.',
        'Estou aqui para ajudar! Embora em modo limitado, posso fornecer informações gerais sobre nossos serviços.'
      ],
      default: [
        'Desculpe, estou com funcionalidades limitadas no momento. Tente novamente em alguns minutos para uma resposta completa da IA.',
        'No momento estou operando em modo offline. Para uma experiência completa, tente novamente em breve.',
        'Serviço temporariamente indisponível. Nossa equipe está trabalhando para restaurar a funcionalidade completa.'
      ]
    };
    
    let responseType = 'default';
    const lowerContent = userContent.toLowerCase();
    
    if (lowerContent.includes('olá') || lowerContent.includes('oi') || lowerContent.includes('hello')) {
      responseType = 'greeting';
    } else if (lowerContent.includes('ajuda') || lowerContent.includes('help') || lowerContent.includes('como')) {
      responseType = 'help';
    }
    
    const responses = fallbackResponses[responseType];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    return {
      success: true,
      isOfflineFallback: true,
      choices: [{
        message: {
          role: 'assistant',
          content: randomResponse
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      },
      model: 'offline-fallback'
    };
  }

  /**
   * Valida se a API Key está funcionando
   * @returns {Promise<Object>} - Status da validação
   */
  async validateApiKey() {
    try {
      const testMessages = [{
        role: 'user',
        content: 'Hello, this is a test message.'
      }];

      const response = await this.chat(testMessages, {
        maxTokens: 10,
        temperature: 0
      });

      return {
        valid: response.success,
        message: response.success ? 'API Key válida' : 'API Key inválida',
        error: response.error || null
      };
    } catch (error) {
      return {
        valid: false,
        message: 'Erro ao validar API Key',
        error: error.message
      };
    }
  }

  /**
   * Retorna informações sobre os modelos disponíveis
   * @returns {Array} - Lista de modelos suportados
   */
  getAvailableModels() {
    return Object.keys(this.modelConfigs).map(modelId => {
      const config = this.modelConfigs[modelId];
      const metrics = this.getModelMetrics(modelId);
      
      return {
        id: modelId,
        name: config.name,
        description: config.description,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        topP: config.topP,
        category: config.category,
        priority: config.priority,
        metrics: {
          requests: metrics.requests,
          errors: metrics.errors,
          errorRate: metrics.errorRate,
          avgResponseTime: metrics.avgResponseTime,
          isAvailable: this.checkRateLimit(modelId)
        },
        reasoningEffort: config.reasoningEffort || null
      };
    });
  }

  /**
   * Retorna métricas de um modelo específico
   */
  getModelMetrics(modelId) {
    const requests = this.metrics.requests[modelId] || 0;
    const errors = this.metrics.errors[modelId] || 0;
    const responseTimes = this.metrics.responseTime[modelId] || [];
    
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
    
    const errorRate = requests > 0 ? (errors / requests) * 100 : 0;
    
    return {
      requests,
      errors,
      errorRate: Math.round(errorRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      usage: this.metrics.usage[modelId] || { totalTokens: 0, requests: 0 }
    };
  }

  /**
   * Retorna métricas gerais do sistema
   */
  getSystemMetrics() {
    const allModels = Object.keys(this.modelConfigs);
    const totalRequests = allModels.reduce((sum, model) => 
      sum + (this.metrics.requests[model] || 0), 0);
    const totalErrors = allModels.reduce((sum, model) => 
      sum + (this.metrics.errors[model] || 0), 0);
    
    return {
      totalRequests,
      totalErrors,
      systemErrorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
      cacheSize: this.cache.size,
      cacheHitRate: this.getCacheHitRate(),
      availableModels: allModels.filter(model => this.checkRateLimit(model)).length,
      modelsMetrics: allModels.map(model => ({
        model,
        ...this.getModelMetrics(model)
      }))
    };
  }

  /**
   * Calcula taxa de acerto do cache
   */
  getCacheHitRate() {
    // Implementação simplificada - em produção seria mais sofisticada
    return Math.random() * 30 + 10; // Simula 10-40% de cache hit rate
  }

  /**
   * Limpa cache e métricas antigas
   */
  cleanupSystem() {
    const now = Date.now();
    
    // Limpar cache expirado
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
    
    // Limpar rate limits antigos
    Object.keys(this.rateLimits).forEach(model => {
      this.rateLimits[model].requests = this.rateLimits[model].requests.filter(
        timestamp => now - timestamp < this.rateLimits[model].windowMs
      );
    });
    
    console.log('Sistema limpo - Cache:', this.cache.size, 'Rate limits atualizados');
  }

  /**
   * Força limpeza do cache
   */
  clearCache() {
    this.cache.clear();
    console.log('Cache limpo manualmente');
  }

  /**
   * Reseta métricas de um modelo específico
   */
  resetModelMetrics(modelId) {
    if (this.metrics.requests[modelId]) {
      this.metrics.requests[modelId] = 0;
      this.metrics.errors[modelId] = 0;
      this.metrics.responseTime[modelId] = [];
      this.metrics.usage[modelId] = { totalTokens: 0, requests: 0 };
      console.log(`Métricas resetadas para o modelo: ${modelId}`);
    }
  }

  /**
   * Chat com modelo específico (bypass do balanceamento)
   */
  async chatWithSpecificModel(messages, modelId, options = {}) {
    if (!this.modelConfigs[modelId]) {
      throw new Error(`Modelo ${modelId} não está configurado`);
    }
    
    return this.chat(messages, { ...options, model: modelId });
  }

  /**
   * Chat com modelo exato (sem fallback automático) - para sistema de fallback
   */
  async chatWithExactModel(messages, modelId, options = {}) {
    const startTime = Date.now();
    const modelConfig = this.modelConfigs[modelId];
    
    // Se o modelo não existe, falhar imediatamente
    if (!modelConfig) {
      throw new Error(`Modelo ${modelId} não encontrado`);
    }

    // Gerar chave de cache
    const cacheKey = this.generateCacheKey(messages, modelId, options);
    
    // Verificar cache
    if (!options.skipCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log('Resposta encontrada no cache para modelo exato:', modelId);
        return cached;
      }
    }

    // Verificar rate limit
    if (!this.checkRateLimit(modelId)) {
      throw new Error(`Rate limit atingido para o modelo ${modelId}`);
    }

    this.recordRequest(modelId);

    const requestConfig = {
      messages,
      model: modelId,
      max_tokens: options.maxTokens || modelConfig.maxTokens,
      temperature: options.temperature || modelConfig.temperature,
      top_p: options.topP || modelConfig.topP,
      stream: options.stream || false
    };

    // Adicionar reasoning_effort para Qwen
    if (modelId === 'qwen/qwen3-32b' && modelConfig.reasoningEffort) {
      requestConfig.reasoning_effort = modelConfig.reasoningEffort;
    }

    // Adicionar tools se fornecidas
    if (options.tools && Array.isArray(options.tools) && options.tools.length > 0) {
      requestConfig.tools = options.tools;
      requestConfig.tool_choice = 'auto';
    }

    console.log('Enviando requisição para modelo exato:', {
      model: modelId,
      messagesCount: messages.length,
      stream: requestConfig.stream,
      hasTools: !!options.tools
    });

    try {
      const response = await this.groq.chat.completions.create(requestConfig);
      const responseTime = Date.now() - startTime;

      // Atualizar métricas
      this.updateMetrics(modelId, 'success', responseTime, response.usage);

      const result = {
        success: true,
        data: response,
        usage: response.usage,
        model: modelId,
        modelConfig: modelConfig,
        responseTime,
        fromCache: false,
        attempts: 1
      };

      // Salvar no cache
      if (!options.skipCache && !requestConfig.stream) {
        this.saveToCache(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error(`Erro na comunicação com modelo exato ${modelId}:`, error);
      
      // Atualizar métricas de erro
      this.updateMetrics(modelId, 'error', Date.now() - startTime);
      
      throw error;
    }
  }

  /**
   * Chat com categoria específica de modelo
   */
  async chatWithCategory(messages, category, options = {}) {
    return this.chat(messages, { ...options, category });
  }
}

export default GroqService;
/**
 * Middleware para seleção dinâmica de modelos Groq
 * Implementa lógica inteligente para escolher o melhor modelo baseado em:
 * - Performance histórica
 * - Rate limits
 * - Tipo de requisição
 * - Categoria solicitada
 */

class ModelSelector {
  constructor(groqService) {
    this.groqService = groqService;
    this.selectionStrategies = {
      'performance': this.selectByPerformance.bind(this),
      'availability': this.selectByAvailability.bind(this),
      'category': this.selectByCategory.bind(this),
      'balanced': this.selectBalanced.bind(this),
      'fastest': this.selectFastest.bind(this),
      'most_reliable': this.selectMostReliable.bind(this)
    };
  }

  /**
   * Middleware principal para seleção de modelo
   */
  selectModel(strategy = 'balanced') {
    return (req, res, next) => {
      try {
        const { category, model, preferredModels, excludeModels } = req.body.options || {};
        
        // Se modelo específico foi solicitado, usar ele
        if (model) {
          req.selectedModel = model;
          return next();
        }
        
        // Aplicar estratégia de seleção
        const selectedModel = this.applySelectionStrategy(
          strategy, 
          { category, preferredModels, excludeModels, req }
        );
        
        if (!selectedModel) {
          return res.status(503).json({
            success: false,
            error: 'Nenhum modelo disponível no momento',
            availableModels: this.getAvailableModelIds()
          });
        }
        
        req.selectedModel = selectedModel;
        req.selectionStrategy = strategy;
        req.selectionMetadata = this.getSelectionMetadata(selectedModel);
        
        next();
      } catch (error) {
        console.error('Erro na seleção de modelo:', error);
        res.status(500).json({
          success: false,
          error: 'Erro interno na seleção de modelo'
        });
      }
    };
  }

  /**
   * Aplica estratégia de seleção específica
   */
  applySelectionStrategy(strategy, options) {
    const strategyFunction = this.selectionStrategies[strategy] || this.selectionStrategies['balanced'];
    return strategyFunction(options);
  }

  /**
   * Seleção baseada em performance (menor tempo de resposta + menor taxa de erro)
   */
  selectByPerformance(options) {
    const availableModels = this.getFilteredModels(options);
    
    if (availableModels.length === 0) return null;
    
    return availableModels.reduce((best, current) => {
      const bestMetrics = this.groqService.getModelMetrics(best.id);
      const currentMetrics = this.groqService.getModelMetrics(current.id);
      
      // Score baseado em tempo de resposta e taxa de erro
      const bestScore = this.calculatePerformanceScore(bestMetrics);
      const currentScore = this.calculatePerformanceScore(currentMetrics);
      
      return currentScore > bestScore ? current : best;
    }).id;
  }

  /**
   * Seleção baseada em disponibilidade (sem rate limit)
   */
  selectByAvailability(options) {
    const availableModels = this.getFilteredModels(options)
      .filter(model => this.groqService.checkRateLimit(model.id));
    
    if (availableModels.length === 0) return null;
    
    // Retorna o primeiro disponível com maior prioridade
    return availableModels.sort((a, b) => b.priority - a.priority)[0].id;
  }

  /**
   * Seleção baseada em categoria
   */
  selectByCategory(options) {
    const { category } = options;
    
    if (!category) {
      return this.selectBalanced(options);
    }
    
    const categoryModels = this.getFilteredModels(options)
      .filter(model => model.category === category)
      .filter(model => this.groqService.checkRateLimit(model.id));
    
    if (categoryModels.length === 0) {
      // Fallback para qualquer modelo disponível
      return this.selectByAvailability(options);
    }
    
    // Seleciona o melhor da categoria por performance
    return categoryModels.reduce((best, current) => {
      const bestMetrics = this.groqService.getModelMetrics(best.id);
      const currentMetrics = this.groqService.getModelMetrics(current.id);
      
      const bestScore = this.calculatePerformanceScore(bestMetrics);
      const currentScore = this.calculatePerformanceScore(currentMetrics);
      
      return currentScore > bestScore ? current : best;
    }).id;
  }

  /**
   * Seleção balanceada (padrão)
   */
  selectBalanced(options) {
    const availableModels = this.getFilteredModels(options)
      .filter(model => this.groqService.checkRateLimit(model.id));
    
    if (availableModels.length === 0) return null;
    
    // Algoritmo de seleção balanceada
    return availableModels.reduce((best, current) => {
      const bestScore = this.calculateBalancedScore(best);
      const currentScore = this.calculateBalancedScore(current);
      
      return currentScore > bestScore ? current : best;
    }).id;
  }

  /**
   * Seleção do modelo mais rápido
   */
  selectFastest(options) {
    const availableModels = this.getFilteredModels(options)
      .filter(model => this.groqService.checkRateLimit(model.id));
    
    if (availableModels.length === 0) return null;
    
    return availableModels.reduce((fastest, current) => {
      const fastestMetrics = this.groqService.getModelMetrics(fastest.id);
      const currentMetrics = this.groqService.getModelMetrics(current.id);
      
      return currentMetrics.avgResponseTime < fastestMetrics.avgResponseTime ? current : fastest;
    }).id;
  }

  /**
   * Seleção do modelo mais confiável
   */
  selectMostReliable(options) {
    const availableModels = this.getFilteredModels(options)
      .filter(model => this.groqService.checkRateLimit(model.id));
    
    if (availableModels.length === 0) return null;
    
    return availableModels.reduce((mostReliable, current) => {
      const reliableMetrics = this.groqService.getModelMetrics(mostReliable.id);
      const currentMetrics = this.groqService.getModelMetrics(current.id);
      
      return currentMetrics.errorRate < reliableMetrics.errorRate ? current : mostReliable;
    }).id;
  }

  /**
   * Filtra modelos baseado nas opções
   */
  getFilteredModels(options) {
    const { preferredModels, excludeModels } = options;
    let models = this.groqService.getAvailableModels();
    
    // Filtrar modelos excluídos
    if (excludeModels && excludeModels.length > 0) {
      models = models.filter(model => !excludeModels.includes(model.id));
    }
    
    // Se há modelos preferidos, usar apenas eles
    if (preferredModels && preferredModels.length > 0) {
      models = models.filter(model => preferredModels.includes(model.id));
    }
    
    return models;
  }

  /**
   * Calcula score de performance
   */
  calculatePerformanceScore(metrics) {
    const { avgResponseTime, errorRate, requests } = metrics;
    
    // Penalizar alta latência e alta taxa de erro
    // Bonificar modelos com mais requisições (mais testados)
    const timeScore = Math.max(0, 100 - (avgResponseTime / 100));
    const errorScore = Math.max(0, 100 - errorRate);
    const experienceBonus = Math.min(20, requests / 10);
    
    return (timeScore * 0.4) + (errorScore * 0.5) + (experienceBonus * 0.1);
  }

  /**
   * Calcula score balanceado
   */
  calculateBalancedScore(model) {
    const metrics = this.groqService.getModelMetrics(model.id);
    const performanceScore = this.calculatePerformanceScore(metrics);
    const priorityScore = model.priority * 10;
    const availabilityScore = this.groqService.checkRateLimit(model.id) ? 50 : 0;
    
    return (performanceScore * 0.5) + (priorityScore * 0.3) + (availabilityScore * 0.2);
  }

  /**
   * Retorna metadados da seleção
   */
  getSelectionMetadata(modelId) {
    const model = this.groqService.getAvailableModels().find(m => m.id === modelId);
    const metrics = this.groqService.getModelMetrics(modelId);
    
    return {
      modelId,
      modelName: model?.name,
      category: model?.category,
      priority: model?.priority,
      metrics: {
        requests: metrics.requests,
        errorRate: metrics.errorRate,
        avgResponseTime: metrics.avgResponseTime
      },
      isAvailable: this.groqService.checkRateLimit(modelId),
      timestamp: Date.now()
    };
  }

  /**
   * Retorna IDs dos modelos disponíveis
   */
  getAvailableModelIds() {
    return this.groqService.getAvailableModels()
      .filter(model => this.groqService.checkRateLimit(model.id))
      .map(model => model.id);
  }

  /**
   * Middleware para logging de seleção
   */
  logSelection() {
    return (req, res, next) => {
      if (req.selectedModel) {
        console.log(`[ModelSelector] Modelo selecionado: ${req.selectedModel} (estratégia: ${req.selectionStrategy})`);
        
        // Adicionar headers de resposta com informações de seleção
        res.setHeader('X-Selected-Model', req.selectedModel);
        res.setHeader('X-Selection-Strategy', req.selectionStrategy || 'default');
        res.setHeader('X-Selection-Timestamp', Date.now());
      }
      next();
    };
  }

  /**
   * Middleware para análise de requisição
   */
  analyzeRequest() {
    return (req, res, next) => {
      const { messages } = req.body;
      
      if (messages && messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        const messageLength = lastMessage.content?.length || 0;
        const isComplexQuery = messageLength > 500;
        const hasCodeRequest = /```|code|programming|script/.test(lastMessage.content || '');
        const hasReasoningRequest = /explain|analyze|think|reason|logic/.test(lastMessage.content || '');
        
        req.requestAnalysis = {
          messageLength,
          isComplexQuery,
          hasCodeRequest,
          hasReasoningRequest,
          suggestedCategory: this.suggestCategory({
            isComplexQuery,
            hasCodeRequest,
            hasReasoningRequest
          })
        };
      }
      
      next();
    };
  }

  /**
   * Sugere categoria baseada na análise da requisição
   */
  suggestCategory({ isComplexQuery, hasCodeRequest, hasReasoningRequest }) {
    if (hasReasoningRequest) return 'reasoning';
    if (hasCodeRequest) return 'coding';
    if (isComplexQuery) return 'general';
    return 'fast';
  }
}

export default ModelSelector;
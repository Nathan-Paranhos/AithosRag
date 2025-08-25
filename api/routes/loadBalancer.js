/**
 * Rotas para Sistema de Balanceamento de Carga
 * Endpoints para controle e monitoramento do load balancer
 */

import express from 'express';
const router = express.Router();

// Middleware de validação para requisições de chat com balanceamento
const validateLoadBalancedRequest = (req, res, next) => {
  const { messages, strategy, options } = req.body;
  
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Messages são obrigatórias e devem ser um array não vazio'
    });
  }
  
  // Validar estratégias de balanceamento
  const validStrategies = [
    'round_robin',
    'weighted_round_robin', 
    'least_connections',
    'fastest_response',
    'resource_based'
  ];
  
  if (strategy && !validStrategies.includes(strategy)) {
    return res.status(400).json({
      success: false,
      error: `Estratégia inválida. Use uma das: ${validStrategies.join(', ')}`
    });
  }
  
  next();
};

// POST /api/loadbalancer/chat - Chat com balanceamento de carga
router.post('/chat', validateLoadBalancedRequest, async (req, res) => {
  try {
    const { messages, strategy = 'weighted_round_robin', options = {} } = req.body;
    const loadBalancer = req.loadBalancer;
    const groqService = req.groqService;
    
    const result = await loadBalancer.executeWithLoadBalancing(
      async (modelId) => {
        return await groqService.chatWithSpecificModel(messages, modelId, options);
      },
      strategy,
      options
    );
    
    res.json({
      success: true,
      response: result.result?.choices?.[0]?.message?.content || '',
      metadata: {
        modelUsed: result.modelUsed,
        attempt: result.attempt,
        strategy: result.loadBalancingStrategy,
        usage: result.result?.usage
      }
    });
  } catch (error) {
    console.error('Erro no chat com balanceamento:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

// POST /api/loadbalancer/chat/stream - Chat com streaming e balanceamento
router.post('/chat/stream', validateLoadBalancedRequest, async (req, res) => {
  try {
    const { messages, strategy = 'fastest_response', options = {} } = req.body;
    const loadBalancer = req.loadBalancer;
    const groqService = req.groqService;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const result = await loadBalancer.executeWithLoadBalancing(
      async (modelId) => {
        return await groqService.chatWithSpecificModel(messages, modelId, {
          ...options,
          stream: true
        });
      },
      strategy,
      options
    );
    
    // Enviar metadados iniciais
    res.write(`data: ${JSON.stringify({
      type: 'metadata',
      modelUsed: result.modelUsed,
      strategy: result.loadBalancingStrategy,
      attempt: result.attempt
    })}\n\n`);
    
    // Stream do conteúdo
    for await (const chunk of result.result) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({
          type: 'content',
          content,
          model: result.modelUsed
        })}\n\n`);
      }
    }
    
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Erro no streaming com balanceamento:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error.message
    })}\n\n`);
    res.end();
  }
});

// GET /api/loadbalancer/stats - Estatísticas do balanceador
router.get('/stats', (req, res) => {
  try {
    const loadBalancer = req.loadBalancer;
    const stats = loadBalancer.getLoadBalancerStats();
    
    res.json({
      success: true,
      stats,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas do balanceador:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// GET /api/loadbalancer/health - Status de saúde dos modelos
router.get('/health', (req, res) => {
  try {
    const loadBalancer = req.loadBalancer;
    const healthyModels = loadBalancer.getHealthyModels();
    const stats = loadBalancer.getLoadBalancerStats();
    
    res.json({
      success: true,
      healthyModels: healthyModels.map(model => ({
        id: model.id,
        name: model.name,
        category: model.category,
        health: stats.healthStatus[model.id]
      })),
      totalHealthyModels: healthyModels.length,
      circuitBreakers: stats.circuitBreakerStates,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Erro ao verificar saúde dos modelos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// POST /api/loadbalancer/strategy/test - Testar estratégia de balanceamento
router.post('/strategy/test', async (req, res) => {
  try {
    const { strategy = 'weighted_round_robin', iterations = 10 } = req.body;
    const loadBalancer = req.loadBalancer;
    
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      try {
        const selectedModel = loadBalancer.selectBestModel(strategy);
        results.push({
          iteration: i + 1,
          selectedModel: selectedModel.id,
          modelName: selectedModel.name,
          timestamp: Date.now()
        });
      } catch (error) {
        results.push({
          iteration: i + 1,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }
    
    // Análise dos resultados
    const modelDistribution = {};
    results.forEach(result => {
      if (result.selectedModel) {
        modelDistribution[result.selectedModel] = 
          (modelDistribution[result.selectedModel] || 0) + 1;
      }
    });
    
    res.json({
      success: true,
      strategy,
      iterations,
      results,
      distribution: modelDistribution,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Erro ao testar estratégia:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// POST /api/loadbalancer/circuit-breaker/reset - Resetar circuit breakers
router.post('/circuit-breaker/reset', (req, res) => {
  try {
    const { modelId } = req.body;
    const loadBalancer = req.loadBalancer;
    
    if (modelId) {
      // Resetar circuit breaker específico
      loadBalancer.resetCircuitBreaker(modelId);
      res.json({
        success: true,
        message: `Circuit breaker do modelo ${modelId} resetado`
      });
    } else {
      // Resetar todos os circuit breakers
      const models = loadBalancer.groqService.getAvailableModels();
      models.forEach(model => {
        loadBalancer.resetCircuitBreaker(model.id);
      });
      
      res.json({
        success: true,
        message: 'Todos os circuit breakers foram resetados',
        modelsReset: models.length
      });
    }
  } catch (error) {
    console.error('Erro ao resetar circuit breaker:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// GET /api/loadbalancer/strategies - Listar estratégias disponíveis
router.get('/strategies', (req, res) => {
  try {
    const strategies = [
      {
        id: 'round_robin',
        name: 'Round Robin',
        description: 'Distribui requisições sequencialmente entre modelos',
        useCase: 'Distribuição uniforme simples'
      },
      {
        id: 'weighted_round_robin',
        name: 'Weighted Round Robin',
        description: 'Distribui baseado em pesos de performance',
        useCase: 'Balanceamento inteligente (padrão)'
      },
      {
        id: 'least_connections',
        name: 'Least Connections',
        description: 'Seleciona modelo com menos conexões ativas',
        useCase: 'Otimização de carga atual'
      },
      {
        id: 'fastest_response',
        name: 'Fastest Response',
        description: 'Seleciona modelo com menor tempo de resposta',
        useCase: 'Otimização de velocidade'
      },
      {
        id: 'resource_based',
        name: 'Resource Based',
        description: 'Seleciona baseado em recursos disponíveis',
        useCase: 'Otimização de recursos'
      }
    ];
    
    res.json({
      success: true,
      strategies,
      defaultStrategy: 'weighted_round_robin',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Erro ao listar estratégias:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// POST /api/loadbalancer/health-check - Forçar verificação de saúde
router.post('/health-check', async (req, res) => {
  try {
    const loadBalancer = req.loadBalancer;
    
    // Executar verificação de saúde imediata
    await loadBalancer.performHealthChecks();
    
    const stats = loadBalancer.getLoadBalancerStats();
    
    res.json({
      success: true,
      message: 'Verificação de saúde executada',
      healthStatus: stats.healthStatus,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Erro na verificação de saúde:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// GET /api/loadbalancer/config - Configurações do balanceador
router.get('/config', (req, res) => {
  try {
    const loadBalancer = req.loadBalancer;
    
    res.json({
      success: true,
      config: loadBalancer.config,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Erro ao obter configurações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

export default router;
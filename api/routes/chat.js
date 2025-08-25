import express from 'express';

const router = express.Router();

// Middleware para validar requisições de chat
const validateChatRequest = (req, res, next) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: 'Mensagens são obrigatórias',
      details: 'O campo "messages" deve ser um array não vazio'
    });
  }

  // Validar formato das mensagens
  for (const message of messages) {
    if (!message.role || !message.content) {
      return res.status(400).json({
        error: 'Formato de mensagem inválido',
        details: 'Cada mensagem deve ter "role" e "content"'
      });
    }

    if (!['system', 'user', 'assistant'].includes(message.role)) {
      return res.status(400).json({
        error: 'Role inválido',
        details: 'Role deve ser "system", "user" ou "assistant"'
      });
    }
  }

  next();
};

// Chat sem streaming
router.post('/', async (req, res) => {
  const startTime = Date.now();
  let modelUsed = null;
  
  try {
    const { messages, model, category, strategy, cache, disableCache, _nocache } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages são obrigatórias e devem ser um array' });
    }
    
    // Verificar se o cache deve ser desabilitado
    const cacheDisabled = cache === false || disableCache === true || _nocache !== undefined || 
                         req.headers['cache-control']?.includes('no-cache');
    
    let cachedResponse = null;
    let cacheKey = null;
    
    if (!cacheDisabled) {
      // Gerar chave de cache
      cacheKey = req.cacheSystem.generateKey('chat_response', {
        messages: JSON.stringify(messages),
        model: model || 'auto',
        category: category || 'general',
        strategy: strategy || 'round_robin'
      });
      
      // Verificar cache primeiro
      cachedResponse = req.cacheSystem.get(cacheKey);
      if (cachedResponse) {
        console.log('✅ Cache hit para chat response');
        
        // Registrar métricas de cache hit
        req.metricsSystem.recordRequest('cache', {
          success: true,
          responseTime: Date.now() - startTime,
          cached: true,
          streaming: false
        });
        
        return res.json({
          ...cachedResponse,
          cached: true,
          cacheKey
        });
      }
    } else {
      console.log('🚫 Cache desabilitado para esta requisição');
    }
    
    const result = await req.fallbackSystem.executeWithFallback(
      model || 'auto', // modelo original
      messages, // mensagens
      { 
        category, 
        strategy,
        stream: false,
        skipCache: cacheDisabled
      }
    );
    
    modelUsed = result.metadata?.usedModel || model || 'auto';
    
    // Armazenar no cache apenas se não estiver desabilitado
    if (!cacheDisabled && cacheKey) {
      req.cacheSystem.set(cacheKey, result, 'chat_response');
    }
    
    // Registrar métricas de sucesso
    const responseTime = Date.now() - startTime;
    const tokensGenerated = result.usage?.completion_tokens || 0;
    const tokensConsumed = result.usage?.prompt_tokens || 0;
    const contentLength = result.choices?.[0]?.message?.content?.length || 0;
    
    req.metricsSystem.recordRequest(modelUsed, {
      success: true,
      responseTime,
      tokensGenerated,
      tokensConsumed,
      contentLength,
      streaming: false
    });
    
    res.json({
      ...result,
      modelUsed,
      cached: false,
      cacheKey
    });
    
  } catch (error) {
    console.error('Erro no chat:', error);
    
    // Registrar métricas de erro
    const responseTime = Date.now() - startTime;
    req.metricsSystem.recordRequest(modelUsed || 'unknown', {
      success: false,
      responseTime,
      error: error.message,
      streaming: false
    });
    
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  } finally {
    // Liberar rate limit se aplicável
    if (req.releaseRateLimit) {
      req.releaseRateLimit();
    }
  }
});

// POST /api/chat - Chat normal com seleção inteligente
router.post('/chat', 
  validateChatRequest, 
  async (req, res) => {
    try {
      const { messages, options = {} } = req.body;
      const groqService = req.groqService;
      
      // Usar modelo selecionado pelo middleware
      const finalOptions = {
        ...options,
        model: req.selectedModel
      };
      
      const response = await groqService.chat(messages, finalOptions);
      
      res.json({
        success: true,
        response: response.choices[0]?.message?.content || '',
        usage: response.usage,
        model: req.selectedModel,
        selectionMetadata: req.selectionMetadata
      });
    } catch (error) {
      console.error('Erro no chat:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro interno do servidor'
      });
    }
  }
);

// POST /api/chat/stream - Enviar mensagem com streaming
router.post('/stream', async (req, res) => {
  const startTime = Date.now();
  let selectedModel = null;
  let tokensGenerated = 0;
  let contentLength = 0;
  
  try {
    const { messages, model, strategy, category } = req.body;
    const { groqService, loadBalancer, fallbackSystem, metricsSystem } = req;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Mensagens são obrigatórias e devem ser um array não vazio'
      });
    }

    // Configurar SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    try {
      // Usar streaming direto sem fallback system para evitar problemas
       selectedModel = model || 'auto';
       const streamFunction = model ? 
         () => groqService.chatStream(messages, { model }) :
         category ?
           () => loadBalancer.processStreamRequest(messages, { strategy, category }) :
           () => loadBalancer.processStreamRequest(messages, { strategy });

      const stream = await streamFunction();
      
      for await (const chunk of stream) {
        if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content) {
          const content = chunk.choices[0].delta.content;
          tokensGenerated++;
          contentLength += content.length;
          
          res.write(`data: ${JSON.stringify({
            content: content,
            model: selectedModel
          })}\n\n`);
        }
      }
      
      res.write(`data: ${JSON.stringify({ done: true, model: selectedModel })}\n\n`);
      res.end();
      
      // Registrar métricas de sucesso para streaming
      const endTime = Date.now();
      if (metricsSystem) {
        metricsSystem.recordRequest(selectedModel, {
          success: true,
          responseTime: endTime - startTime,
          tokensGenerated,
          tokensConsumed: messages.reduce((acc, msg) => acc + (msg.content?.length || 0), 0) / 4, // Estimativa
          contentLength,
          streaming: true
        });
      }
    } catch (streamError) {
      console.error('Erro no streaming, tentando fallback sem streaming:', streamError);
      
      // Fallback para resposta sem streaming
      try {
        selectedModel = model || 'auto';
         let result;
         if (model) {
           result = await groqService.chat(messages, { model });
         } else if (category) {
           result = await loadBalancer.processRequest(messages, { strategy, category });
         } else {
           result = await loadBalancer.processRequest(messages, { strategy });
         }
        
        res.write(`data: ${JSON.stringify({
          content: result.content,
          model: result.model,
          fallback: true
        })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true, model: result.model })}\n\n`);
        res.end();
        
        // Registrar métricas de sucesso para fallback
        const endTime = Date.now();
        if (req.metricsSystem) {
          req.metricsSystem.recordRequest(selectedModel, startTime, endTime, true, {
            tokensGenerated: result.usage?.completion_tokens || 0,
            tokensConsumed: result.usage?.prompt_tokens || 0,
            contentLength: result.content?.length || 0
          });
        }
      } catch (fallbackError) {
        res.write(`data: ${JSON.stringify({
          error: 'Erro no processamento da mensagem',
          message: fallbackError.message
        })}\n\n`);
        res.end();
        
        // Registrar métricas de erro para fallback
        const endTime = Date.now();
        if (selectedModel && req.metricsSystem) {
          req.metricsSystem.recordRequest(selectedModel, startTime, endTime, false, {
            error: fallbackError
          });
        }
      }
    }
  } catch (error) {
    console.error('Erro no chat stream:', error);
    res.write(`data: ${JSON.stringify({
      error: 'Erro interno do servidor',
      message: error.message
    })}\n\n`);
    res.end();
    
    // Registrar métricas de erro
    const endTime = Date.now();
    if (selectedModel && req.metricsSystem) {
      req.metricsSystem.recordRequest(selectedModel, startTime, endTime, false, {
        error: error
      });
    }
  }
});

// POST /api/chat/stream - Chat com streaming e seleção inteligente
router.post('/chat/stream', 
  validateChatRequest, 
  async (req, res) => {
    try {
      const { messages, options = {} } = req.body;
      const groqService = req.groqService;
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('X-Selected-Model', req.selectedModel);
      
      // Usar modelo selecionado pelo middleware
      const finalOptions = {
        ...options,
        model: req.selectedModel,
        stream: true
      };
      
      const stream = await groqService.chatStream(messages, finalOptions);
      
      // Enviar metadados de seleção primeiro
      res.write(`data: ${JSON.stringify({ 
        type: 'metadata',
        model: req.selectedModel,
        selectionMetadata: req.selectionMetadata 
      })}\n\n`);
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(`data: ${JSON.stringify({ 
            type: 'content',
            content,
            model: req.selectedModel 
          })}\n\n`);
        }
      }
      
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      console.error('Erro no streaming:', error);
      res.write(`data: ${JSON.stringify({ 
        type: 'error',
        error: error.message 
      })}\n\n`);
      res.end();
    }
  }
);

// Rota para listar modelos disponíveis
router.get('/models', (req, res) => {
  try {
    const groqService = req.groqService;
    const models = groqService.getAvailableModels();
    res.json({
      success: true,
      models,
      totalModels: models.length,
      availableModels: models.filter(m => m.metrics.isAvailable).length
    });
  } catch (error) {
    console.error('Erro ao listar modelos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Rota para métricas do sistema
router.get('/metrics', (req, res) => {
  try {
    const groqService = req.groqService;
    const metrics = groqService.getSystemMetrics();
    res.json({
      success: true,
      metrics,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Erro ao obter métricas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Rota para métricas de um modelo específico
router.get('/metrics/:modelId', (req, res) => {
  try {
    const { modelId } = req.params;
    const groqService = req.groqService;
    const metrics = groqService.getModelMetrics(modelId);
    res.json({
      success: true,
      model: modelId,
      metrics,
      timestamp: Date.now()
    });
   } catch (error) {
     console.error('Erro ao obter métricas do modelo:', error);
     res.status(500).json({
       success: false,
       error: 'Erro interno do servidor'
     });
   }
 });

// Rota para chat com modelo específico
router.post('/model/:modelId', validateChatRequest, async (req, res) => {
  try {
    const { modelId } = req.params;
    const { messages, options = {} } = req.body;
    const groqService = req.groqService;
    
    const response = await groqService.chatWithSpecificModel(messages, modelId, options);
    
    res.json({
      success: true,
      model: modelId,
      response: response.choices[0]?.message?.content || '',
      usage: response.usage
    });
  } catch (error) {
    console.error(`Erro no chat com modelo ${req.params.modelId}:`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

// Rota para chat com streaming de modelo específico
router.post('/model/:modelId/stream', validateChatRequest, async (req, res) => {
  try {
    const { modelId } = req.params;
    const { messages, options = {} } = req.body;
    const groqService = req.groqService;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const stream = await groqService.chatWithSpecificModel(messages, modelId, { ...options, stream: true });
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content, model: modelId })}\n\n`);
      }
    }
    
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error(`Erro no streaming com modelo ${req.params.modelId}:`, error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// Rota para chat com categoria específica
router.post('/category/:category', validateChatRequest, async (req, res) => {
  try {
    const { category } = req.params;
    const { messages, options = {} } = req.body;
    const groqService = req.groqService;
    
    const response = await groqService.chatWithCategory(messages, category, options);
    
    res.json({
      success: true,
      category,
      model: response.model,
      response: response.choices[0]?.message?.content || '',
      usage: response.usage
    });
  } catch (error) {
    console.error(`Erro no chat com categoria ${req.params.category}:`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

// Rota para limpar cache
router.post('/cache/clear', (req, res) => {
  try {
    const groqService = req.groqService;
    groqService.clearCache();
    res.json({
      success: true,
      message: 'Cache limpo com sucesso'
    });
  } catch (error) {
    console.error('Erro ao limpar cache:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Rota para resetar métricas de um modelo
router.post('/metrics/:modelId/reset', (req, res) => {
  try {
    const { modelId } = req.params;
    const groqService = req.groqService;
    groqService.resetModelMetrics(modelId);
    res.json({
      success: true,
      message: `Métricas do modelo ${modelId} resetadas com sucesso`
    });
  } catch (error) {
    console.error('Erro ao resetar métricas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
})

// GET /api/chat/validate - Validar API Key
router.get('/validate', async (req, res) => {
  try {
    const groqService = req.groqService;
    const validation = await groqService.validateApiKey();
    
    res.json({
      success: true,
      validation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro no endpoint /validate:', error);
    res.status(500).json({
      error: 'Erro na validação',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
    });
  }
});

export default router;
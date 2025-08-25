import express from 'express';
const router = express.Router();

// GET /api/fallback/stats - Obter estatísticas do sistema de fallback
router.get('/stats', async (req, res) => {
  try {
    const fallbackSystem = req.fallbackSystem;
    const stats = fallbackSystem.getFallbackStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas de fallback:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// POST /api/fallback/test - Testar sistema de fallback com um modelo específico
router.post('/test', async (req, res) => {
  try {
    const { model, messages, options = {} } = req.body;
    const fallbackSystem = req.fallbackSystem;
    
    if (!model || !messages) {
      return res.status(400).json({
        success: false,
        error: 'Modelo e mensagens são obrigatórios'
      });
    }
    
    const startTime = Date.now();
    const result = await fallbackSystem.executeWithFallback(model, messages, {
      ...options,
      timeout: 10000 // 10 segundos para teste
    });
    const duration = Date.now() - startTime;
    
    res.json({
      success: true,
      data: {
        result: result.choices?.[0]?.message?.content || 'Resposta vazia',
        metadata: result.metadata,
        duration,
        fallbackUsed: result.metadata?.fallbackUsed || false,
        originalModel: result.metadata?.originalModel,
        usedModel: result.metadata?.usedModel
      }
    });
  } catch (error) {
    console.error('Erro no teste de fallback:', error);
    res.status(500).json({
      success: false,
      error: 'Falha no teste de fallback',
      details: error.message
    });
  }
});

// POST /api/fallback/reset - Resetar estatísticas de um modelo específico ou todos
router.post('/reset', async (req, res) => {
  try {
    const { modelId } = req.body;
    const fallbackSystem = req.fallbackSystem;
    
    fallbackSystem.resetModelStats(modelId);
    
    res.json({
      success: true,
      message: modelId 
        ? `Estatísticas do modelo ${modelId} resetadas`
        : 'Todas as estatísticas de fallback resetadas'
    });
  } catch (error) {
    console.error('Erro ao resetar estatísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// GET /api/fallback/chains - Obter cadeias de fallback configuradas
router.get('/chains', async (req, res) => {
  try {
    const fallbackSystem = req.fallbackSystem;
    const chains = {};
    
    // Acessar as cadeias de fallback (assumindo que são públicas ou há um getter)
    fallbackSystem.fallbackChains.forEach((chain, category) => {
      chains[category] = chain;
    });
    
    res.json({
      success: true,
      data: chains
    });
  } catch (error) {
    console.error('Erro ao obter cadeias de fallback:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// POST /api/fallback/chains - Configurar cadeia de fallback para uma categoria
router.post('/chains', async (req, res) => {
  try {
    const { category, models } = req.body;
    const fallbackSystem = req.fallbackSystem;
    
    if (!category || !Array.isArray(models) || models.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Categoria e lista de modelos são obrigatórios'
      });
    }
    
    fallbackSystem.setFallbackChain(category, models);
    
    res.json({
      success: true,
      message: `Cadeia de fallback para categoria '${category}' configurada`,
      data: { category, models }
    });
  } catch (error) {
    console.error('Erro ao configurar cadeia de fallback:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// POST /api/fallback/enable - Ativar sistema de fallback
router.post('/enable', async (req, res) => {
  try {
    const fallbackSystem = req.fallbackSystem;
    fallbackSystem.enable();
    
    res.json({
      success: true,
      message: 'Sistema de fallback ativado'
    });
  } catch (error) {
    console.error('Erro ao ativar fallback:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// POST /api/fallback/disable - Desativar sistema de fallback
router.post('/disable', async (req, res) => {
  try {
    const fallbackSystem = req.fallbackSystem;
    fallbackSystem.disable();
    
    res.json({
      success: true,
      message: 'Sistema de fallback desativado'
    });
  } catch (error) {
    console.error('Erro ao desativar fallback:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// POST /api/fallback/recover - Forçar tentativa de recuperação de um modelo
router.post('/recover', async (req, res) => {
  try {
    const { modelId } = req.body;
    const fallbackSystem = req.fallbackSystem;
    
    if (!modelId) {
      return res.status(400).json({
        success: false,
        error: 'ID do modelo é obrigatório'
      });
    }
    
    await fallbackSystem.attemptModelRecovery(modelId);
    
    res.json({
      success: true,
      message: `Tentativa de recuperação iniciada para o modelo ${modelId}`
    });
  } catch (error) {
    console.error('Erro na recuperação do modelo:', error);
    res.status(500).json({
      success: false,
      error: 'Erro na recuperação do modelo',
      details: error.message
    });
  }
});

// GET /api/fallback/events - Stream de eventos do sistema de fallback (SSE)
router.get('/events', (req, res) => {
  try {
    const fallbackSystem = req.fallbackSystem;
    
    // Configurar SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    // Função para enviar eventos
    const sendEvent = (event, data) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    
    // Listeners para eventos do fallback
    const onFallbackSuccess = (data) => sendEvent('fallback_success', data);
    const onModelFailure = (data) => sendEvent('model_failure', data);
    const onModelBlacklisted = (data) => sendEvent('model_blacklisted', data);
    const onModelRecovered = (data) => sendEvent('model_recovered', data);
    const onFallbackExhausted = (data) => sendEvent('fallback_exhausted', data);
    
    fallbackSystem.on('fallback_success', onFallbackSuccess);
    fallbackSystem.on('model_failure', onModelFailure);
    fallbackSystem.on('model_blacklisted', onModelBlacklisted);
    fallbackSystem.on('model_recovered', onModelRecovered);
    fallbackSystem.on('fallback_exhausted', onFallbackExhausted);
    
    // Enviar evento inicial
    sendEvent('connected', { timestamp: new Date().toISOString() });
    
    // Cleanup quando a conexão for fechada
    req.on('close', () => {
      fallbackSystem.off('fallback_success', onFallbackSuccess);
      fallbackSystem.off('model_failure', onModelFailure);
      fallbackSystem.off('model_blacklisted', onModelBlacklisted);
      fallbackSystem.off('model_recovered', onModelRecovered);
      fallbackSystem.off('fallback_exhausted', onFallbackExhausted);
    });
    
  } catch (error) {
    console.error('Erro no stream de eventos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

export default router;
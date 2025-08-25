import express from 'express';

const router = express.Router();

// Obter estatísticas do rate limiter
router.get('/stats', (req, res) => {
  try {
    const stats = req.rateLimiter.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas do rate limiter:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Obter estatísticas por usuário
router.get('/stats/:identifier', (req, res) => {
  try {
    const { identifier } = req.params;
    const stats = req.rateLimiter.getUserStats(identifier);
    
    res.json({
      success: true,
      data: {
        identifier: identifier,
        stats: stats
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas do usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Obter estatísticas por modelo
router.get('/model-stats/:modelId', (req, res) => {
  try {
    const { modelId } = req.params;
    const stats = req.rateLimiter.getModelStats(modelId);
    
    res.json({
      success: true,
      data: {
        modelId: modelId,
        stats: stats
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas do modelo:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Verificar limites para um usuário/modelo
router.post('/check', async (req, res) => {
  try {
    const { identifier, modelId, estimatedTokens, userInfo } = req.body;
    
    if (!identifier || !modelId) {
      return res.status(400).json({
        success: false,
        error: 'Identifier e modelId são obrigatórios'
      });
    }
    
    const result = await req.rateLimiter.checkLimit(identifier, modelId, {
      estimatedTokens: estimatedTokens || 1000,
      userInfo: userInfo || { tier: 'free' }
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Erro ao verificar limites:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Resetar limites para um usuário
router.post('/reset/:identifier', (req, res) => {
  try {
    const { identifier } = req.params;
    const { modelId } = req.body;
    
    req.rateLimiter.resetUser(identifier, modelId);
    
    res.json({
      success: true,
      message: `Limites resetados para ${identifier}${modelId ? ` no modelo ${modelId}` : ''}`
    });
  } catch (error) {
    console.error('Erro ao resetar limites:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Obter configurações do rate limiter
router.get('/config', (req, res) => {
  try {
    const config = req.rateLimiter.getConfig();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Erro ao obter configurações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Atualizar configurações do rate limiter
router.put('/config', (req, res) => {
  try {
    const updates = req.body;
    req.rateLimiter.updateConfig(updates);
    
    res.json({
      success: true,
      message: 'Configurações atualizadas com sucesso',
      data: req.rateLimiter.getConfig()
    });
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Ativar/desativar modo adaptativo
router.post('/adaptive/:action', (req, res) => {
  try {
    const { action } = req.params;
    
    if (action === 'enable') {
      req.rateLimiter.enableAdaptive();
      res.json({
        success: true,
        message: 'Modo adaptativo ativado'
      });
    } else if (action === 'disable') {
      req.rateLimiter.disableAdaptive();
      res.json({
        success: true,
        message: 'Modo adaptativo desativado'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Ação inválida. Use "enable" ou "disable"'
      });
    }
  } catch (error) {
    console.error('Erro ao alterar modo adaptativo:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Obter usuários ativos
router.get('/active-users', (req, res) => {
  try {
    const activeUsers = req.rateLimiter.getActiveUsers();
    res.json({
      success: true,
      data: {
        count: activeUsers.length,
        users: activeUsers
      }
    });
  } catch (error) {
    console.error('Erro ao obter usuários ativos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Obter modelos ativos
router.get('/active-models', (req, res) => {
  try {
    const activeModels = req.rateLimiter.getActiveModels();
    res.json({
      success: true,
      data: {
        count: activeModels.length,
        models: activeModels
      }
    });
  } catch (error) {
    console.error('Erro ao obter modelos ativos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Limpar contadores expirados
router.post('/cleanup', (req, res) => {
  try {
    const cleaned = req.rateLimiter.cleanupExpired();
    res.json({
      success: true,
      data: {
        cleanedEntries: cleaned
      },
      message: `${cleaned} entradas expiradas foram removidas`
    });
  } catch (error) {
    console.error('Erro ao limpar contadores expirados:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Stream de eventos do rate limiter (SSE)
router.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Enviar estatísticas iniciais
  sendEvent({
    type: 'stats',
    data: req.rateLimiter.getStats(),
    timestamp: Date.now()
  });

  // Configurar intervalo para enviar atualizações
  const interval = setInterval(() => {
    try {
      sendEvent({
        type: 'stats',
        data: req.rateLimiter.getStats(),
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Erro ao enviar evento SSE:', error);
      clearInterval(interval);
    }
  }, 5000); // Atualizar a cada 5 segundos

  // Cleanup quando cliente desconectar
  req.on('close', () => {
    clearInterval(interval);
  });

  req.on('end', () => {
    clearInterval(interval);
  });
});

export default router;
import express from 'express';
const router = express.Router();

// GET /api/metrics - Obter todas as métricas
router.get('/', async (req, res) => {
  try {
    const metricsSystem = req.metricsSystem;
    const metrics = metricsSystem.getAllMetrics();
    
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao obter métricas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /api/metrics/models - Obter métricas de todos os modelos
router.get('/models', async (req, res) => {
  try {
    const metricsSystem = req.metricsSystem;
    const allMetrics = metricsSystem.getAllMetrics();
    
    res.json({
      success: true,
      data: allMetrics.models,
      summary: allMetrics.summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao obter métricas dos modelos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /api/metrics/models/:modelId - Obter métricas de um modelo específico
router.get('/models/:modelId', async (req, res) => {
  try {
    const { modelId } = req.params;
    const metricsSystem = req.metricsSystem;
    
    // Decodificar o modelId (pode conter barras)
    const decodedModelId = decodeURIComponent(modelId);
    const metrics = metricsSystem.getModelMetrics(decodedModelId);
    
    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Modelo não encontrado',
        message: `Métricas para o modelo '${decodedModelId}' não foram encontradas`
      });
    }
    
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao obter métricas do modelo:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /api/metrics/system - Obter métricas do sistema
router.get('/system', async (req, res) => {
  try {
    const metricsSystem = req.metricsSystem;
    const allMetrics = metricsSystem.getAllMetrics();
    
    res.json({
      success: true,
      data: allMetrics.system,
      summary: allMetrics.summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao obter métricas do sistema:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /api/metrics/history - Obter dados históricos
router.get('/history', async (req, res) => {
  try {
    const { modelId, timeRange = '1h' } = req.query;
    const metricsSystem = req.metricsSystem;
    
    const decodedModelId = modelId ? decodeURIComponent(modelId) : null;
    const history = metricsSystem.getHistoricalData(decodedModelId, timeRange);
    
    res.json({
      success: true,
      data: history,
      filters: {
        modelId: decodedModelId,
        timeRange
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao obter dados históricos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// POST /api/metrics/reset - Resetar métricas
router.post('/reset', async (req, res) => {
  try {
    const { modelId } = req.body;
    const metricsSystem = req.metricsSystem;
    
    const decodedModelId = modelId ? decodeURIComponent(modelId) : null;
    metricsSystem.resetMetrics(decodedModelId);
    
    res.json({
      success: true,
      message: decodedModelId ? 
        `Métricas do modelo '${decodedModelId}' resetadas com sucesso` :
        'Todas as métricas resetadas com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao resetar métricas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /api/metrics/export - Exportar métricas em diferentes formatos
router.get('/export', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const metricsSystem = req.metricsSystem;
    
    const exportedData = metricsSystem.exportMetrics(format);
    
    // Definir content-type baseado no formato
    let contentType = 'application/json';
    let filename = `metrics_${new Date().toISOString().split('T')[0]}`;
    
    switch (format) {
      case 'csv':
        contentType = 'text/csv';
        filename += '.csv';
        break;
      case 'prometheus':
        contentType = 'text/plain';
        filename += '.txt';
        break;
      default:
        filename += '.json';
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportedData);
  } catch (error) {
    console.error('Erro ao exportar métricas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /api/metrics/health - Verificar saúde dos modelos
router.get('/health', async (req, res) => {
  try {
    const metricsSystem = req.metricsSystem;
    const allMetrics = metricsSystem.getAllMetrics();
    
    const healthStatus = {};
    const unhealthyModels = [];
    
    Object.entries(allMetrics.models).forEach(([modelId, metrics]) => {
      healthStatus[modelId] = {
        isHealthy: metrics.isHealthy,
        consecutiveErrors: metrics.consecutiveErrors,
        successRate: metrics.successRate,
        lastUsed: metrics.lastUsed,
        status: metrics.isHealthy ? 'healthy' : 'unhealthy'
      };
      
      if (!metrics.isHealthy) {
        unhealthyModels.push({
          modelId,
          consecutiveErrors: metrics.consecutiveErrors,
          lastError: metrics.lastError,
          successRate: metrics.successRate
        });
      }
    });
    
    const overallHealth = unhealthyModels.length === 0 ? 'healthy' : 'degraded';
    
    res.json({
      success: true,
      data: {
        overallHealth,
        healthyModels: Object.keys(healthStatus).length - unhealthyModels.length,
        totalModels: Object.keys(healthStatus).length,
        models: healthStatus,
        unhealthyModels,
        summary: allMetrics.summary
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao verificar saúde dos modelos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// GET /api/metrics/performance - Obter métricas de performance
router.get('/performance', async (req, res) => {
  try {
    const metricsSystem = req.metricsSystem;
    const allMetrics = metricsSystem.getAllMetrics();
    
    const performanceData = {};
    
    Object.entries(allMetrics.models).forEach(([modelId, metrics]) => {
      performanceData[modelId] = {
        averageResponseTime: metrics.averageResponseTime,
        minResponseTime: metrics.minResponseTime === Infinity ? 0 : metrics.minResponseTime,
        maxResponseTime: metrics.maxResponseTime,
        tokensPerSecond: metrics.tokensPerSecond,
        throughput: metrics.throughput,
        averageTokensPerRequest: metrics.averageTokensPerRequest,
        successRate: metrics.successRate,
        totalRequests: metrics.totalRequests
      };
    });
    
    // Encontrar o modelo com melhor performance
    let bestModel = null;
    let bestScore = -1;
    
    Object.entries(performanceData).forEach(([modelId, perf]) => {
      if (perf.totalRequests > 0) {
        // Score baseado em: velocidade (inverso do tempo de resposta) + taxa de sucesso + throughput
        const responseTimeScore = perf.averageResponseTime > 0 ? 1000 / perf.averageResponseTime : 0;
        const successScore = perf.successRate;
        const throughputScore = perf.throughput;
        
        const totalScore = (responseTimeScore * 0.4) + (successScore * 0.4) + (throughputScore * 0.2);
        
        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestModel = modelId;
        }
      }
    });
    
    res.json({
      success: true,
      data: {
        models: performanceData,
        bestPerformingModel: bestModel,
        systemAverageResponseTime: allMetrics.system.averageResponseTime,
        totalSystemRequests: allMetrics.system.totalRequests
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao obter métricas de performance:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// Server-Sent Events para métricas em tempo real
router.get('/stream', (req, res) => {
  try {
    const metricsSystem = req.metricsSystem;
    
    // Configurar SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });
    
    // Enviar dados iniciais
    const initialData = metricsSystem.getAllMetrics();
    res.write(`data: ${JSON.stringify({
      type: 'initial',
      data: initialData,
      timestamp: new Date().toISOString()
    })}\n\n`);
    
    // Listener para novos eventos de métricas
    const onMetricsUpdate = (eventData) => {
      res.write(`data: ${JSON.stringify({
        type: 'update',
        data: eventData,
        timestamp: new Date().toISOString()
      })}\n\n`);
    };
    
    const onMetricsReset = (eventData) => {
      res.write(`data: ${JSON.stringify({
        type: 'reset',
        data: eventData,
        timestamp: new Date().toISOString()
      })}\n\n`);
    };
    
    // Registrar listeners
    metricsSystem.on('request_recorded', onMetricsUpdate);
    metricsSystem.on('metrics_reset', onMetricsReset);
    
    // Enviar heartbeat a cada 30 segundos
    const heartbeatInterval = setInterval(() => {
      res.write(`data: ${JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      })}\n\n`);
    }, 30000);
    
    // Cleanup quando a conexão for fechada
    req.on('close', () => {
      clearInterval(heartbeatInterval);
      metricsSystem.removeListener('request_recorded', onMetricsUpdate);
      metricsSystem.removeListener('metrics_reset', onMetricsReset);
    });
    
  } catch (error) {
    console.error('Erro no stream de métricas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

export default router;
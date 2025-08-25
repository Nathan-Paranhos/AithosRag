import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MetricsSystem extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.systemMetrics = {
      totalRequests: 0,
      totalErrors: 0,
      totalTokensGenerated: 0,
      totalTokensConsumed: 0,
      averageResponseTime: 0,
      uptime: Date.now(),
      lastReset: new Date().toISOString()
    };
    this.metricsHistory = [];
    this.maxHistorySize = 1000;
    this.metricsFile = path.join(__dirname, 'data', 'metrics.json');
    
    this.initializeMetrics();
    this.startPeriodicSave();
  }

  initializeMetrics() {
    const models = [
      'meta-llama/llama-4-maverick-17b-128e-instruct',
      'gemma2-9b-it',
      'deepseek-r1-distill-llama-70b',
      'qwen/qwen3-32b'
    ];

    models.forEach(modelId => {
      this.metrics.set(modelId, {
        // Contadores básicos
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        
        // Métricas de tempo
        totalResponseTime: 0,
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        
        // Métricas de tokens
        totalTokensGenerated: 0,
        totalTokensConsumed: 0,
        averageTokensPerRequest: 0,
        
        // Métricas de qualidade
        averageContentLength: 0,
        totalContentLength: 0,
        
        // Métricas de erro
        errorTypes: new Map(),
        lastError: null,
        consecutiveErrors: 0,
        
        // Métricas de uso
        requestsPerHour: new Array(24).fill(0),
        currentHour: new Date().getHours(),
        
        // Métricas de performance
        tokensPerSecond: 0,
        throughput: 0,
        
        // Status
        isHealthy: true,
        lastUsed: null,
        firstUsed: null,
        
        // Histórico recente
        recentRequests: [],
        maxRecentRequests: 100
      });
    });
    
    this.loadMetricsFromFile();
  }

  recordRequest(modelId, startTime, endTime, success, options = {}) {
    const metrics = this.metrics.get(modelId);
    if (!metrics) return;

    const responseTime = endTime - startTime;
    const now = new Date();
    const currentHour = now.getHours();
    
    // Atualizar contadores básicos
    metrics.totalRequests++;
    this.systemMetrics.totalRequests++;
    
    if (success) {
      metrics.successfulRequests++;
      metrics.consecutiveErrors = 0;
    } else {
      metrics.failedRequests++;
      metrics.consecutiveErrors++;
      this.systemMetrics.totalErrors++;
      
      if (options.error) {
        this.recordError(modelId, options.error);
      }
    }
    
    // Atualizar métricas de tempo
    if (success && responseTime > 0) {
      metrics.totalResponseTime += responseTime;
      metrics.averageResponseTime = metrics.totalResponseTime / metrics.successfulRequests;
      metrics.minResponseTime = Math.min(metrics.minResponseTime, responseTime);
      metrics.maxResponseTime = Math.max(metrics.maxResponseTime, responseTime);
      
      // Atualizar média do sistema
      this.updateSystemAverageResponseTime();
    }
    
    // Atualizar métricas de tokens
    if (options.tokensGenerated) {
      metrics.totalTokensGenerated += options.tokensGenerated;
      this.systemMetrics.totalTokensGenerated += options.tokensGenerated;
      
      if (success && responseTime > 0) {
        metrics.tokensPerSecond = options.tokensGenerated / (responseTime / 1000);
      }
    }
    
    if (options.tokensConsumed) {
      metrics.totalTokensConsumed += options.tokensConsumed;
      this.systemMetrics.totalTokensConsumed += options.tokensConsumed;
    }
    
    if (metrics.successfulRequests > 0) {
      metrics.averageTokensPerRequest = metrics.totalTokensGenerated / metrics.successfulRequests;
    }
    
    // Atualizar métricas de conteúdo
    if (options.contentLength && success) {
      metrics.totalContentLength += options.contentLength;
      metrics.averageContentLength = metrics.totalContentLength / metrics.successfulRequests;
    }
    
    // Atualizar métricas de uso por hora
    if (currentHour !== metrics.currentHour) {
      metrics.currentHour = currentHour;
    }
    metrics.requestsPerHour[currentHour]++;
    
    // Atualizar throughput (requests per minute)
    metrics.throughput = this.calculateThroughput(modelId);
    
    // Atualizar status de saúde
    metrics.isHealthy = metrics.consecutiveErrors < 5;
    
    // Atualizar timestamps
    metrics.lastUsed = now.toISOString();
    if (!metrics.firstUsed) {
      metrics.firstUsed = now.toISOString();
    }
    
    // Adicionar ao histórico recente
    const requestData = {
      timestamp: now.toISOString(),
      responseTime,
      success,
      tokensGenerated: options.tokensGenerated || 0,
      tokensConsumed: options.tokensConsumed || 0,
      contentLength: options.contentLength || 0,
      error: options.error || null
    };
    
    metrics.recentRequests.push(requestData);
    if (metrics.recentRequests.length > metrics.maxRecentRequests) {
      metrics.recentRequests.shift();
    }
    
    // Adicionar ao histórico global
    this.addToHistory(modelId, requestData);
    
    // Emitir evento
    this.emit('request_recorded', {
      modelId,
      success,
      responseTime,
      metrics: this.getModelMetrics(modelId)
    });
  }

  recordError(modelId, error) {
    const metrics = this.metrics.get(modelId);
    if (!metrics) return;
    
    const errorType = this.categorizeError(error);
    const currentCount = metrics.errorTypes.get(errorType) || 0;
    metrics.errorTypes.set(errorType, currentCount + 1);
    metrics.lastError = {
      type: errorType,
      message: error.message || error,
      timestamp: new Date().toISOString()
    };
  }

  categorizeError(error) {
    const message = error.message || error.toString();
    
    if (message.includes('timeout') || message.includes('TIMEOUT')) {
      return 'timeout';
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return 'rate_limit';
    }
    if (message.includes('authentication') || message.includes('401')) {
      return 'authentication';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'not_found';
    }
    if (message.includes('server error') || message.includes('500')) {
      return 'server_error';
    }
    if (message.includes('network') || message.includes('connection')) {
      return 'network';
    }
    
    return 'unknown';
  }

  calculateThroughput(modelId) {
    const metrics = this.metrics.get(modelId);
    if (!metrics || metrics.recentRequests.length < 2) return 0;
    
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const recentRequests = metrics.recentRequests.filter(req => {
      return new Date(req.timestamp).getTime() > oneMinuteAgo;
    });
    
    return recentRequests.length; // requests per minute
  }

  updateSystemAverageResponseTime() {
    let totalTime = 0;
    let totalSuccessful = 0;
    
    this.metrics.forEach(metrics => {
      totalTime += metrics.totalResponseTime;
      totalSuccessful += metrics.successfulRequests;
    });
    
    this.systemMetrics.averageResponseTime = totalSuccessful > 0 ? totalTime / totalSuccessful : 0;
  }

  addToHistory(modelId, requestData) {
    this.metricsHistory.push({
      modelId,
      ...requestData
    });
    
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }
  }

  getModelMetrics(modelId) {
    const metrics = this.metrics.get(modelId);
    if (!metrics) return null;
    
    // Converter Map para Object para serialização
    const errorTypes = {};
    metrics.errorTypes.forEach((count, type) => {
      errorTypes[type] = count;
    });
    
    return {
      modelId,
      ...metrics,
      errorTypes,
      successRate: metrics.totalRequests > 0 ? 
        (metrics.successfulRequests / metrics.totalRequests) * 100 : 0,
      errorRate: metrics.totalRequests > 0 ? 
        (metrics.failedRequests / metrics.totalRequests) * 100 : 0
    };
  }

  getAllMetrics() {
    const modelMetrics = {};
    this.metrics.forEach((_, modelId) => {
      modelMetrics[modelId] = this.getModelMetrics(modelId);
    });
    
    return {
      system: {
        ...this.systemMetrics,
        uptime: Date.now() - this.systemMetrics.uptime
      },
      models: modelMetrics,
      summary: this.getMetricsSummary()
    };
  }

  getMetricsSummary() {
    const models = Array.from(this.metrics.keys());
    const healthyModels = models.filter(id => this.metrics.get(id).isHealthy);
    
    let totalRequests = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    let bestPerformingModel = null;
    let worstPerformingModel = null;
    let bestResponseTime = Infinity;
    let worstResponseTime = 0;
    
    this.metrics.forEach((metrics, modelId) => {
      totalRequests += metrics.totalRequests;
      totalSuccessful += metrics.successfulRequests;
      totalFailed += metrics.failedRequests;
      
      if (metrics.averageResponseTime > 0) {
        if (metrics.averageResponseTime < bestResponseTime) {
          bestResponseTime = metrics.averageResponseTime;
          bestPerformingModel = modelId;
        }
        if (metrics.averageResponseTime > worstResponseTime) {
          worstResponseTime = metrics.averageResponseTime;
          worstPerformingModel = modelId;
        }
      }
    });
    
    return {
      totalModels: models.length,
      healthyModels: healthyModels.length,
      totalRequests,
      totalSuccessful,
      totalFailed,
      overallSuccessRate: totalRequests > 0 ? (totalSuccessful / totalRequests) * 100 : 0,
      bestPerformingModel,
      worstPerformingModel,
      bestResponseTime: bestResponseTime === Infinity ? 0 : bestResponseTime,
      worstResponseTime
    };
  }

  resetMetrics(modelId = null) {
    if (modelId) {
      // Reset específico do modelo
      const metrics = this.metrics.get(modelId);
      if (metrics) {
        Object.assign(metrics, {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          totalResponseTime: 0,
          averageResponseTime: 0,
          minResponseTime: Infinity,
          maxResponseTime: 0,
          totalTokensGenerated: 0,
          totalTokensConsumed: 0,
          averageTokensPerRequest: 0,
          averageContentLength: 0,
          totalContentLength: 0,
          errorTypes: new Map(),
          lastError: null,
          consecutiveErrors: 0,
          requestsPerHour: new Array(24).fill(0),
          tokensPerSecond: 0,
          throughput: 0,
          recentRequests: []
        });
      }
    } else {
      // Reset completo
      this.initializeMetrics();
      this.systemMetrics = {
        totalRequests: 0,
        totalErrors: 0,
        totalTokensGenerated: 0,
        totalTokensConsumed: 0,
        averageResponseTime: 0,
        uptime: Date.now(),
        lastReset: new Date().toISOString()
      };
      this.metricsHistory = [];
    }
    
    this.emit('metrics_reset', { modelId });
  }

  getHistoricalData(modelId = null, timeRange = '1h') {
    const now = Date.now();
    let timeLimit;
    
    switch (timeRange) {
      case '1h':
        timeLimit = now - (60 * 60 * 1000);
        break;
      case '24h':
        timeLimit = now - (24 * 60 * 60 * 1000);
        break;
      case '7d':
        timeLimit = now - (7 * 24 * 60 * 60 * 1000);
        break;
      default:
        timeLimit = now - (60 * 60 * 1000);
    }
    
    let filteredHistory = this.metricsHistory.filter(entry => {
      const entryTime = new Date(entry.timestamp).getTime();
      return entryTime > timeLimit;
    });
    
    if (modelId) {
      filteredHistory = filteredHistory.filter(entry => entry.modelId === modelId);
    }
    
    return filteredHistory;
  }

  async saveMetricsToFile() {
    try {
      const dataDir = path.dirname(this.metricsFile);
      await fs.mkdir(dataDir, { recursive: true });
      
      const data = {
        timestamp: new Date().toISOString(),
        metrics: this.getAllMetrics(),
        history: this.metricsHistory.slice(-100) // Salvar apenas os últimos 100
      };
      
      await fs.writeFile(this.metricsFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Erro ao salvar métricas:', error);
    }
  }

  async loadMetricsFromFile() {
    try {
      const data = await fs.readFile(this.metricsFile, 'utf8');
      const parsed = JSON.parse(data);
      
      if (parsed.history) {
        this.metricsHistory = parsed.history;
      }
      
      console.log('Métricas carregadas do arquivo');
    } catch (error) {
      console.log('Nenhum arquivo de métricas encontrado, iniciando com dados limpos');
    }
  }

  startPeriodicSave() {
    // Salvar métricas a cada 5 minutos
    setInterval(() => {
      this.saveMetricsToFile();
    }, 5 * 60 * 1000);
  }

  // Método para exportar métricas em diferentes formatos
  exportMetrics(format = 'json') {
    const data = this.getAllMetrics();
    
    switch (format) {
      case 'csv':
        return this.convertToCSV(data);
      case 'prometheus':
        return this.convertToPrometheus(data);
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  convertToCSV(data) {
    const lines = ['timestamp,model_id,total_requests,successful_requests,failed_requests,avg_response_time,success_rate'];
    
    Object.entries(data.models).forEach(([modelId, metrics]) => {
      lines.push([
        new Date().toISOString(),
        modelId,
        metrics.totalRequests,
        metrics.successfulRequests,
        metrics.failedRequests,
        metrics.averageResponseTime,
        metrics.successRate
      ].join(','));
    });
    
    return lines.join('\n');
  }

  convertToPrometheus(data) {
    const lines = [];
    
    Object.entries(data.models).forEach(([modelId, metrics]) => {
      lines.push(`groq_model_requests_total{model="${modelId}"} ${metrics.totalRequests}`);
      lines.push(`groq_model_requests_successful{model="${modelId}"} ${metrics.successfulRequests}`);
      lines.push(`groq_model_requests_failed{model="${modelId}"} ${metrics.failedRequests}`);
      lines.push(`groq_model_response_time_avg{model="${modelId}"} ${metrics.averageResponseTime}`);
      lines.push(`groq_model_success_rate{model="${modelId}"} ${metrics.successRate}`);
    });
    
    return lines.join('\n');
  }
}

export default MetricsSystem;
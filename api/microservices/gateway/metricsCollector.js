/**
 * Sistema de coleta de métricas para o API Gateway
 */
export class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        error: 0,
        byMethod: {},
        byPath: {},
        byService: {},
        byStatusCode: {}
      },
      response: {
        times: [],
        averageTime: 0,
        minTime: Infinity,
        maxTime: 0
      },
      services: {},
      errors: [],
      uptime: Date.now(),
      lastReset: Date.now()
    };

    this.intervals = {
      cleanup: null,
      aggregation: null
    };

    this.startPeriodicTasks();
  }

  /**
   * Inicia tarefas periódicas
   */
  startPeriodicTasks() {
    // Limpeza de dados antigos a cada hora
    this.intervals.cleanup = setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000);

    // Agregação de métricas a cada minuto
    this.intervals.aggregation = setInterval(() => {
      this.aggregateMetrics();
    }, 60 * 1000);
  }

  /**
   * Para as tarefas periódicas
   */
  stopPeriodicTasks() {
    if (this.intervals.cleanup) {
      clearInterval(this.intervals.cleanup);
      this.intervals.cleanup = null;
    }
    if (this.intervals.aggregation) {
      clearInterval(this.intervals.aggregation);
      this.intervals.aggregation = null;
    }
  }

  /**
   * Middleware para coletar métricas de requisições
   */
  getRequestMetricsMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const originalSend = res.send;
      const self = this;

      // Intercepta a resposta
      res.send = function(data) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        const statusCode = res.statusCode;
        const method = req.method;
        const path = req.path || req.url;
        const service = req.headers['x-service-name'] || 'unknown';

        // Coleta métricas da requisição
        try {
          self.recordRequest({
            method,
            path,
            service,
            statusCode,
            responseTime,
            timestamp: endTime,
            userAgent: req.headers['user-agent'],
            ip: req.ip || req.connection.remoteAddress
          });
        } catch (error) {
          console.error('Error recording request metrics:', error);
        }

        return originalSend.call(res, data);
      };

      next();
    };
  }

  /**
   * Registra uma requisição
   */
  recordRequest(data) {
    const { method, path, service, statusCode, responseTime, timestamp, userAgent, ip } = data;

    // Métricas gerais
    this.metrics.requests.total++;
    
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.error++;
    }

    // Por método
    this.metrics.requests.byMethod[method] = (this.metrics.requests.byMethod[method] || 0) + 1;

    // Por path
    this.metrics.requests.byPath[path] = (this.metrics.requests.byPath[path] || 0) + 1;

    // Por serviço
    this.metrics.requests.byService[service] = (this.metrics.requests.byService[service] || 0) + 1;

    // Por status code
    this.metrics.requests.byStatusCode[statusCode] = (this.metrics.requests.byStatusCode[statusCode] || 0) + 1;

    // Tempo de resposta
    this.metrics.response.times.push({ time: responseTime, timestamp });
    this.updateResponseTimeMetrics(responseTime);

    // Métricas por serviço
    if (!this.metrics.services[service]) {
      this.metrics.services[service] = {
        requests: 0,
        errors: 0,
        totalResponseTime: 0,
        averageResponseTime: 0,
        lastRequest: null
      };
    }

    const serviceMetrics = this.metrics.services[service];
    serviceMetrics.requests++;
    serviceMetrics.totalResponseTime += responseTime;
    serviceMetrics.averageResponseTime = serviceMetrics.totalResponseTime / serviceMetrics.requests;
    serviceMetrics.lastRequest = timestamp;

    if (statusCode >= 400) {
      serviceMetrics.errors++;
    }

    // Log de erro se necessário
    if (statusCode >= 500) {
      this.recordError({
        service,
        path,
        method,
        statusCode,
        timestamp,
        userAgent,
        ip
      });
    }
  }

  /**
   * Atualiza métricas de tempo de resposta
   */
  updateResponseTimeMetrics(responseTime) {
    this.metrics.response.minTime = Math.min(this.metrics.response.minTime, responseTime);
    this.metrics.response.maxTime = Math.max(this.metrics.response.maxTime, responseTime);
    
    // Calcula média dos últimos 1000 tempos de resposta
    const recentTimes = this.metrics.response.times.slice(-1000);
    this.metrics.response.averageTime = recentTimes.reduce((sum, item) => sum + item.time, 0) / recentTimes.length;
  }

  /**
   * Registra um erro
   */
  recordError(errorData) {
    this.metrics.errors.push({
      ...errorData,
      id: this.generateId()
    });

    // Mantém apenas os últimos 1000 erros
    if (this.metrics.errors.length > 1000) {
      this.metrics.errors = this.metrics.errors.slice(-1000);
    }
  }

  /**
   * Registra métricas de um serviço
   */
  recordServiceMetrics(serviceName, metrics) {
    if (!this.metrics.services[serviceName]) {
      this.metrics.services[serviceName] = {
        requests: 0,
        errors: 0,
        totalResponseTime: 0,
        averageResponseTime: 0,
        lastRequest: null
      };
    }

    Object.assign(this.metrics.services[serviceName], metrics);
  }

  /**
   * Obtém todas as métricas
   */
  getMetrics() {
    const now = Date.now();
    const uptimeSeconds = Math.floor((now - this.metrics.uptime) / 1000);

    return {
      ...this.metrics,
      uptime: uptimeSeconds,
      timestamp: now,
      requestsPerSecond: this.calculateRequestsPerSecond(),
      errorRate: this.calculateErrorRate(),
      serviceHealth: this.calculateServiceHealth()
    };
  }

  /**
   * Obtém métricas resumidas
   */
  getSummaryMetrics() {
    const metrics = this.getMetrics();
    
    return {
      totalRequests: metrics.requests.total,
      successRequests: metrics.requests.success,
      errorRequests: metrics.requests.error,
      errorRate: metrics.errorRate,
      averageResponseTime: metrics.response.averageTime,
      requestsPerSecond: metrics.requestsPerSecond,
      uptime: metrics.uptime,
      activeServices: Object.keys(metrics.services).length,
      timestamp: metrics.timestamp
    };
  }

  /**
   * Obtém métricas de um serviço específico
   */
  getServiceMetrics(serviceName) {
    return this.metrics.services[serviceName] || null;
  }

  /**
   * Calcula requisições por segundo
   */
  calculateRequestsPerSecond() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const recentRequests = this.metrics.response.times.filter(
      item => item.timestamp > oneMinuteAgo
    );
    
    return Math.round(recentRequests.length / 60 * 100) / 100;
  }

  /**
   * Calcula taxa de erro
   */
  calculateErrorRate() {
    if (this.metrics.requests.total === 0) return 0;
    return Math.round((this.metrics.requests.error / this.metrics.requests.total) * 10000) / 100;
  }

  /**
   * Calcula saúde dos serviços
   */
  calculateServiceHealth() {
    const health = {};
    
    Object.entries(this.metrics.services).forEach(([serviceName, serviceMetrics]) => {
      const errorRate = serviceMetrics.requests > 0 
        ? (serviceMetrics.errors / serviceMetrics.requests) * 100 
        : 0;
      
      let status = 'healthy';
      if (errorRate > 10) status = 'unhealthy';
      else if (errorRate > 5) status = 'degraded';
      
      health[serviceName] = {
        status,
        errorRate: Math.round(errorRate * 100) / 100,
        averageResponseTime: Math.round(serviceMetrics.averageResponseTime * 100) / 100,
        totalRequests: serviceMetrics.requests,
        lastRequest: serviceMetrics.lastRequest
      };
    });
    
    return health;
  }

  /**
   * Limpa dados antigos
   */
  cleanupOldData() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    // Remove tempos de resposta antigos
    this.metrics.response.times = this.metrics.response.times.filter(
      item => item.timestamp > oneHourAgo
    );
    
    // Remove erros antigos
    this.metrics.errors = this.metrics.errors.filter(
      error => error.timestamp > oneHourAgo
    );
  }

  /**
   * Agrega métricas
   */
  aggregateMetrics() {
    // Recalcula métricas agregadas
    this.updateResponseTimeMetrics(0); // Força recálculo da média
  }

  /**
   * Reseta todas as métricas
   */
  reset() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        error: 0,
        byMethod: {},
        byPath: {},
        byService: {},
        byStatusCode: {}
      },
      response: {
        times: [],
        averageTime: 0,
        minTime: Infinity,
        maxTime: 0
      },
      services: {},
      errors: [],
      uptime: Date.now(),
      lastReset: Date.now()
    };
  }

  /**
   * Gera um ID único
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Para o coletor de métricas
   */
  stop() {
    this.stopPeriodicTasks();
  }
}

export default MetricsCollector;
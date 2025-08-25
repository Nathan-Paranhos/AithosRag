import EventEmitter from 'events';
import os from 'os';
import process from 'process';

/**
 * Advanced Health Monitoring System
 * Monitors system health, service availability, and performance metrics
 */
class HealthMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      // Monitoring intervals
      healthCheckInterval: options.healthCheckInterval || 30000, // 30 seconds
      metricsInterval: options.metricsInterval || 10000, // 10 seconds
      
      // Thresholds
      cpuThreshold: options.cpuThreshold || 80, // 80%
      memoryThreshold: options.memoryThreshold || 85, // 85%
      diskThreshold: options.diskThreshold || 90, // 90%
      responseTimeThreshold: options.responseTimeThreshold || 5000, // 5 seconds
      
      // Service endpoints to monitor
      services: options.services || [],
      
      // Alert configuration
      alertCooldown: options.alertCooldown || 300000, // 5 minutes
      maxAlerts: options.maxAlerts || 10,
      
      // History retention
      maxHistoryEntries: options.maxHistoryEntries || 1000,
      
      // Enable detailed logging
      enableLogging: options.enableLogging !== false,
      
      ...options
    };
    
    // Health status
    this.overallHealth = 'healthy';
    this.services = new Map();
    this.systemMetrics = {
      cpu: { usage: 0, history: [] },
      memory: { usage: 0, free: 0, total: 0, history: [] },
      disk: { usage: 0, free: 0, total: 0, history: [] },
      network: { connections: 0, history: [] },
      uptime: process.uptime()
    };
    
    // Alerts
    this.alerts = [];
    this.alertCooldowns = new Map();
    
    // Performance tracking
    this.performanceMetrics = {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      peakResponseTime: 0,
      throughput: 0,
      history: []
    };
    
    // Health check history
    this.healthHistory = [];
    
    // Timers
    this.healthCheckTimer = null;
    this.metricsTimer = null;
    
    // Start monitoring
    this.start();
    
    this.log('Health monitor initialized');
  }
  
  /**
   * Start health monitoring
   */
  start() {
    // Initialize services
    this.options.services.forEach(service => {
      this.addService(service.name, service);
    });
    
    // Start health checks
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.options.healthCheckInterval);
    
    // Start metrics collection
    this.metricsTimer = setInterval(() => {
      this.collectSystemMetrics();
    }, this.options.metricsInterval);
    
    this.log('Health monitoring started');
  }
  
  /**
   * Stop health monitoring
   */
  stop() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
    
    this.log('Health monitoring stopped');
  }
  
  /**
   * Add a service to monitor
   */
  addService(name, config) {
    const service = {
      name,
      url: config.url,
      method: config.method || 'GET',
      timeout: config.timeout || 5000,
      headers: config.headers || {},
      expectedStatus: config.expectedStatus || [200],
      healthCheck: config.healthCheck || null,
      
      // Status
      status: 'unknown',
      lastCheck: null,
      lastSuccess: null,
      lastFailure: null,
      
      // Metrics
      responseTime: 0,
      successCount: 0,
      failureCount: 0,
      uptime: 0,
      
      // History
      history: [],
      
      ...config
    };
    
    this.services.set(name, service);
    this.log(`Added service to monitor: ${name}`);
  }
  
  /**
   * Remove a service from monitoring
   */
  removeService(name) {
    if (this.services.delete(name)) {
      this.log(`Removed service from monitoring: ${name}`);
    }
  }
  
  /**
   * Perform health check on all services
   */
  async performHealthCheck() {
    const results = [];
    
    for (const [name, service] of this.services) {
      try {
        const result = await this.checkService(service);
        results.push(result);
      } catch (error) {
        this.log(`Health check failed for ${name}: ${error.message}`, 'error');
        results.push({
          service: name,
          status: 'unhealthy',
          error: error.message,
          timestamp: Date.now()
        });
      }
    }
    
    // Update overall health
    this.updateOverallHealth(results);
    
    // Add to history
    this.addHealthHistory({
      timestamp: Date.now(),
      overallHealth: this.overallHealth,
      services: results,
      systemMetrics: { ...this.systemMetrics }
    });
    
    // Emit health check event
    this.emit('healthCheck', {
      overallHealth: this.overallHealth,
      services: results,
      timestamp: Date.now()
    });
    
    return results;
  }
  
  /**
   * Check individual service health
   */
  async checkService(service) {
    const startTime = Date.now();
    
    try {
      let result;
      
      if (service.healthCheck && typeof service.healthCheck === 'function') {
        // Custom health check function
        result = await this.executeWithTimeout(
          service.healthCheck,
          service.timeout
        );
      } else if (service.url) {
        // HTTP health check
        result = await this.httpHealthCheck(service);
      } else {
        throw new Error('No health check method configured');
      }
      
      const responseTime = Date.now() - startTime;
      
      // Update service metrics
      service.status = 'healthy';
      service.lastCheck = Date.now();
      service.lastSuccess = Date.now();
      service.responseTime = responseTime;
      service.successCount++;
      
      // Add to history
      this.addServiceHistory(service, {
        status: 'healthy',
        responseTime,
        timestamp: Date.now()
      });
      
      // Check response time threshold
      if (responseTime > this.options.responseTimeThreshold) {
        this.createAlert('performance', `High response time for ${service.name}: ${responseTime}ms`);
      }
      
      return {
        service: service.name,
        status: 'healthy',
        responseTime,
        timestamp: Date.now(),
        details: result
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Update service metrics
      service.status = 'unhealthy';
      service.lastCheck = Date.now();
      service.lastFailure = Date.now();
      service.responseTime = responseTime;
      service.failureCount++;
      
      // Add to history
      this.addServiceHistory(service, {
        status: 'unhealthy',
        responseTime,
        error: error.message,
        timestamp: Date.now()
      });
      
      // Create alert
      this.createAlert('service', `Service ${service.name} is unhealthy: ${error.message}`);
      
      return {
        service: service.name,
        status: 'unhealthy',
        responseTime,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * HTTP health check
   */
  async httpHealthCheck(service) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), service.timeout);
    
    try {
      const response = await fetch(service.url, {
        method: service.method,
        headers: service.headers,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!service.expectedStatus.includes(response.status)) {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
      
      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      };
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
  
  /**
   * Execute function with timeout
   */
  async executeWithTimeout(fn, timeout) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Health check timeout: ${timeout}ms`));
      }, timeout);
      
      Promise.resolve(fn())
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }
  
  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    try {
      // CPU usage
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;
      
      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });
      
      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      const cpuUsage = 100 - ~~(100 * idle / total);
      
      this.systemMetrics.cpu.usage = cpuUsage;
      this.addMetricHistory(this.systemMetrics.cpu, cpuUsage);
      
      // Memory usage
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memUsage = (usedMem / totalMem) * 100;
      
      this.systemMetrics.memory = {
        usage: memUsage,
        free: freeMem,
        total: totalMem,
        history: this.systemMetrics.memory.history
      };
      this.addMetricHistory(this.systemMetrics.memory, memUsage);
      
      // System uptime
      this.systemMetrics.uptime = process.uptime();
      
      // Check thresholds and create alerts
      if (cpuUsage > this.options.cpuThreshold) {
        this.createAlert('system', `High CPU usage: ${cpuUsage.toFixed(2)}%`);
      }
      
      if (memUsage > this.options.memoryThreshold) {
        this.createAlert('system', `High memory usage: ${memUsage.toFixed(2)}%`);
      }
      
      // Emit metrics event
      this.emit('metrics', {
        cpu: cpuUsage,
        memory: memUsage,
        uptime: this.systemMetrics.uptime,
        timestamp: Date.now()
      });
      
    } catch (error) {
      this.log(`Error collecting system metrics: ${error.message}`, 'error');
    }
  }
  
  /**
   * Add metric to history
   */
  addMetricHistory(metric, value) {
    metric.history.push({
      value,
      timestamp: Date.now()
    });
    
    // Keep only recent history
    if (metric.history.length > this.options.maxHistoryEntries) {
      metric.history = metric.history.slice(-this.options.maxHistoryEntries);
    }
  }
  
  /**
   * Add service history entry
   */
  addServiceHistory(service, entry) {
    service.history.push(entry);
    
    // Keep only recent history
    if (service.history.length > this.options.maxHistoryEntries) {
      service.history = service.history.slice(-this.options.maxHistoryEntries);
    }
  }
  
  /**
   * Add health history entry
   */
  addHealthHistory(entry) {
    this.healthHistory.push(entry);
    
    // Keep only recent history
    if (this.healthHistory.length > this.options.maxHistoryEntries) {
      this.healthHistory = this.healthHistory.slice(-this.options.maxHistoryEntries);
    }
  }
  
  /**
   * Update overall health status
   */
  updateOverallHealth(serviceResults) {
    const unhealthyServices = serviceResults.filter(r => r.status === 'unhealthy');
    const totalServices = serviceResults.length;
    
    // Check system metrics
    const systemIssues = [];
    
    if (this.systemMetrics.cpu.usage > this.options.cpuThreshold) {
      systemIssues.push('high_cpu');
    }
    
    if (this.systemMetrics.memory.usage > this.options.memoryThreshold) {
      systemIssues.push('high_memory');
    }
    
    // Determine overall health
    let newHealth;
    
    if (systemIssues.length > 0 || unhealthyServices.length === totalServices) {
      newHealth = 'critical';
    } else if (unhealthyServices.length > 0) {
      newHealth = 'degraded';
    } else {
      newHealth = 'healthy';
    }
    
    // Emit health change event if status changed
    if (newHealth !== this.overallHealth) {
      this.emit('healthChange', {
        from: this.overallHealth,
        to: newHealth,
        timestamp: Date.now(),
        reasons: {
          systemIssues,
          unhealthyServices: unhealthyServices.map(s => s.service)
        }
      });
      
      this.log(`Overall health changed: ${this.overallHealth} -> ${newHealth}`);
    }
    
    this.overallHealth = newHealth;
  }
  
  /**
   * Create alert
   */
  createAlert(type, message, severity = 'warning') {
    const alertKey = `${type}:${message}`;
    
    // Check cooldown
    if (this.alertCooldowns.has(alertKey)) {
      const lastAlert = this.alertCooldowns.get(alertKey);
      if (Date.now() - lastAlert < this.options.alertCooldown) {
        return; // Skip alert due to cooldown
      }
    }
    
    const alert = {
      id: Date.now().toString(),
      type,
      message,
      severity,
      timestamp: Date.now(),
      acknowledged: false
    };
    
    this.alerts.unshift(alert);
    
    // Keep only recent alerts
    if (this.alerts.length > this.options.maxAlerts) {
      this.alerts = this.alerts.slice(0, this.options.maxAlerts);
    }
    
    // Set cooldown
    this.alertCooldowns.set(alertKey, Date.now());
    
    // Emit alert event
    this.emit('alert', alert);
    
    this.log(`Alert created: [${severity.toUpperCase()}] ${message}`, 'warn');
  }
  
  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = Date.now();
      this.log(`Alert acknowledged: ${alertId}`);
      return true;
    }
    return false;
  }
  
  /**
   * Clear all alerts
   */
  clearAlerts() {
    this.alerts = [];
    this.alertCooldowns.clear();
    this.log('All alerts cleared');
  }
  
  /**
   * Record performance metrics
   */
  recordRequest(responseTime, isError = false) {
    this.performanceMetrics.requestCount++;
    
    if (isError) {
      this.performanceMetrics.errorCount++;
    }
    
    // Update average response time
    const totalRequests = this.performanceMetrics.requestCount;
    if (totalRequests === 1) {
      this.performanceMetrics.averageResponseTime = responseTime;
    } else {
      const alpha = 0.1; // Exponential moving average factor
      this.performanceMetrics.averageResponseTime = 
        (alpha * responseTime) + ((1 - alpha) * this.performanceMetrics.averageResponseTime);
    }
    
    // Update peak response time
    if (responseTime > this.performanceMetrics.peakResponseTime) {
      this.performanceMetrics.peakResponseTime = responseTime;
    }
    
    // Add to history
    this.performanceMetrics.history.push({
      responseTime,
      isError,
      timestamp: Date.now()
    });
    
    // Keep only recent history
    if (this.performanceMetrics.history.length > this.options.maxHistoryEntries) {
      this.performanceMetrics.history = this.performanceMetrics.history.slice(-this.options.maxHistoryEntries);
    }
  }
  
  /**
   * Get current health status
   */
  getHealthStatus() {
    const services = Array.from(this.services.values()).map(service => ({
      name: service.name,
      status: service.status,
      lastCheck: service.lastCheck,
      lastSuccess: service.lastSuccess,
      lastFailure: service.lastFailure,
      responseTime: service.responseTime,
      successCount: service.successCount,
      failureCount: service.failureCount,
      uptime: service.lastSuccess ? Date.now() - service.lastSuccess : 0
    }));
    
    return {
      overall: this.overallHealth,
      timestamp: Date.now(),
      services,
      systemMetrics: {
        cpu: {
          usage: this.systemMetrics.cpu.usage,
          threshold: this.options.cpuThreshold
        },
        memory: {
          usage: this.systemMetrics.memory.usage,
          free: this.systemMetrics.memory.free,
          total: this.systemMetrics.memory.total,
          threshold: this.options.memoryThreshold
        },
        uptime: this.systemMetrics.uptime
      },
      alerts: this.alerts.filter(a => !a.acknowledged),
      performance: {
        requestCount: this.performanceMetrics.requestCount,
        errorCount: this.performanceMetrics.errorCount,
        errorRate: this.performanceMetrics.requestCount > 0 ? 
          (this.performanceMetrics.errorCount / this.performanceMetrics.requestCount * 100).toFixed(2) + '%' : '0%',
        averageResponseTime: Math.round(this.performanceMetrics.averageResponseTime),
        peakResponseTime: this.performanceMetrics.peakResponseTime
      }
    };
  }
  
  /**
   * Get detailed statistics
   */
  getDetailedStats() {
    return {
      ...this.getHealthStatus(),
      history: this.healthHistory.slice(-100), // Last 100 entries
      serviceDetails: Array.from(this.services.values()).map(service => ({
        ...service,
        history: service.history.slice(-50) // Last 50 entries per service
      })),
      allAlerts: this.alerts,
      performanceHistory: this.performanceMetrics.history.slice(-100)
    };
  }
  
  /**
   * Log messages
   */
  log(message, level = 'info') {
    if (!this.options.enableLogging) return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [HealthMonitor] ${message}`;
    
    switch (level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }
  
  /**
   * Cleanup resources
   */
  destroy() {
    this.stop();
    this.removeAllListeners();
    this.log('Health monitor destroyed');
  }
}

// Create global instance
const healthMonitor = new HealthMonitor();

export { HealthMonitor, healthMonitor };
export default healthMonitor;
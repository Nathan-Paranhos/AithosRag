import EventEmitter from 'events';
import os from 'os';
import process from 'process';

class HealthMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      checkInterval: options.checkInterval || 30000, // 30 seconds
      memoryThreshold: options.memoryThreshold || 0.9, // 90%
      cpuThreshold: options.cpuThreshold || 0.8, // 80%
      diskThreshold: options.diskThreshold || 0.9, // 90%
      responseTimeThreshold: options.responseTimeThreshold || 5000, // 5 seconds
      errorRateThreshold: options.errorRateThreshold || 0.1, // 10%
      ...options
    };

    this.services = new Map();
    this.systemMetrics = {
      cpu: { usage: 0, loadAverage: [] },
      memory: { used: 0, total: 0, percentage: 0 },
      disk: { used: 0, total: 0, percentage: 0 },
      network: { bytesIn: 0, bytesOut: 0 },
      uptime: 0,
      timestamp: Date.now()
    };
    
    this.healthHistory = [];
    this.maxHistorySize = 100;
    
    this.startMonitoring();
  }

  registerService(serviceName, serviceConfig) {
    const service = {
      name: serviceName,
      status: 'unknown',
      lastCheck: null,
      responseTime: null,
      errorRate: 0,
      requestCount: 0,
      errorCount: 0,
      consecutiveFailures: 0,
      uptime: 0,
      startTime: Date.now(),
      healthChecks: [],
      ...serviceConfig
    };

    this.services.set(serviceName, service);
    console.log(`🏥 Health monitor registered service: ${serviceName}`);
    
    return service;
  }

  updateServiceHealth(serviceName, healthData) {
    const service = this.services.get(serviceName);
    if (!service) {
      console.warn(`⚠️ Attempted to update health for unknown service: ${serviceName}`);
      return false;
    }

    const now = Date.now();
    const previousStatus = service.status;

    // Update service metrics
    service.lastCheck = now;
    service.responseTime = healthData.responseTime || null;
    service.status = healthData.status || 'unknown';
    service.uptime = now - service.startTime;

    // Update error tracking
    if (healthData.status === 'healthy') {
      service.consecutiveFailures = 0;
    } else if (healthData.status === 'unhealthy') {
      service.consecutiveFailures++;
      service.errorCount++;
    }

    service.requestCount++;
    service.errorRate = service.requestCount > 0 ? service.errorCount / service.requestCount : 0;

    // Store health check history
    const healthCheck = {
      timestamp: now,
      status: service.status,
      responseTime: service.responseTime,
      errorRate: service.errorRate,
      consecutiveFailures: service.consecutiveFailures
    };

    service.healthChecks.push(healthCheck);
    
    // Keep only recent health checks
    if (service.healthChecks.length > 50) {
      service.healthChecks = service.healthChecks.slice(-50);
    }

    // Emit events for status changes
    if (previousStatus !== service.status) {
      this.emit('serviceStatusChanged', {
        serviceName,
        previousStatus,
        currentStatus: service.status,
        service
      });

      if (service.status === 'unhealthy') {
        this.emit('serviceUnhealthy', { serviceName, service });
      } else if (service.status === 'healthy' && previousStatus === 'unhealthy') {
        this.emit('serviceRecovered', { serviceName, service });
      }
    }

    return true;
  }

  getServiceHealth(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      return null;
    }

    return {
      name: service.name,
      status: service.status,
      lastCheck: service.lastCheck,
      responseTime: service.responseTime,
      errorRate: service.errorRate,
      consecutiveFailures: service.consecutiveFailures,
      uptime: service.uptime,
      requestCount: service.requestCount,
      errorCount: service.errorCount,
      healthScore: this.calculateHealthScore(service)
    };
  }

  getAllServicesHealth() {
    const result = {};
    
    for (const [serviceName, service] of this.services) {
      result[serviceName] = this.getServiceHealth(serviceName);
    }
    
    return result;
  }

  getOverallHealth() {
    const services = Array.from(this.services.values());
    const systemHealth = this.getSystemHealth();
    
    if (services.length === 0) {
      return {
        status: 'healthy',
        message: 'No services registered',
        services: {},
        system: systemHealth,
        timestamp: new Date().toISOString()
      };
    }

    const healthyServices = services.filter(s => s.status === 'healthy').length;
    const totalServices = services.length;
    const healthPercentage = healthyServices / totalServices;

    let overallStatus = 'healthy';
    let message = `${healthyServices}/${totalServices} services healthy`;

    if (healthPercentage < 0.5) {
      overallStatus = 'critical';
      message = `Critical: Only ${healthyServices}/${totalServices} services healthy`;
    } else if (healthPercentage < 0.8) {
      overallStatus = 'degraded';
      message = `Degraded: ${healthyServices}/${totalServices} services healthy`;
    }

    // Check system health
    if (systemHealth.status !== 'healthy') {
      if (overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
      message += ` | System: ${systemHealth.status}`;
    }

    const servicesHealth = {};
    for (const [serviceName, service] of this.services) {
      servicesHealth[serviceName] = {
        status: service.status,
        responseTime: service.responseTime,
        errorRate: service.errorRate,
        uptime: service.uptime
      };
    }

    return {
      status: overallStatus,
      message,
      healthPercentage: Math.round(healthPercentage * 100),
      services: servicesHealth,
      system: systemHealth,
      timestamp: new Date().toISOString()
    };
  }

  getSystemHealth() {
    const metrics = this.systemMetrics;
    const issues = [];
    let status = 'healthy';

    // Check memory usage
    if (metrics.memory.percentage > this.options.memoryThreshold) {
      issues.push(`High memory usage: ${Math.round(metrics.memory.percentage * 100)}%`);
      status = 'degraded';
    }

    // Check CPU usage
    if (metrics.cpu.usage > this.options.cpuThreshold) {
      issues.push(`High CPU usage: ${Math.round(metrics.cpu.usage * 100)}%`);
      status = 'degraded';
    }

    // Check disk usage
    if (metrics.disk.percentage > this.options.diskThreshold) {
      issues.push(`High disk usage: ${Math.round(metrics.disk.percentage * 100)}%`);
      if (status !== 'critical') {
        status = 'degraded';
      }
    }

    return {
      status,
      issues,
      metrics: {
        cpu: {
          usage: Math.round(metrics.cpu.usage * 100),
          loadAverage: metrics.cpu.loadAverage
        },
        memory: {
          used: Math.round(metrics.memory.used / 1024 / 1024), // MB
          total: Math.round(metrics.memory.total / 1024 / 1024), // MB
          percentage: Math.round(metrics.memory.percentage * 100)
        },
        uptime: Math.round(metrics.uptime),
        timestamp: new Date(metrics.timestamp).toISOString()
      }
    };
  }

  calculateHealthScore(service) {
    let score = 100;

    // Deduct points for unhealthy status
    if (service.status === 'unhealthy') {
      score -= 50;
    } else if (service.status === 'degraded') {
      score -= 25;
    }

    // Deduct points for high error rate
    score -= Math.min(service.errorRate * 100, 30);

    // Deduct points for slow response time
    if (service.responseTime > this.options.responseTimeThreshold) {
      score -= 20;
    }

    // Deduct points for consecutive failures
    score -= Math.min(service.consecutiveFailures * 5, 20);

    return Math.max(score, 0);
  }

  updateSystemMetrics() {
    const now = Date.now();
    
    // CPU metrics
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
    const usage = 1 - (idle / total);

    // Memory metrics
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    // Update metrics
    this.systemMetrics = {
      cpu: {
        usage: isNaN(usage) ? 0 : usage,
        loadAverage: os.loadavg()
      },
      memory: {
        used: usedMem,
        total: totalMem,
        percentage: usedMem / totalMem
      },
      disk: {
        // Note: Disk usage would require additional libraries like 'diskusage'
        used: 0,
        total: 0,
        percentage: 0
      },
      uptime: process.uptime(),
      timestamp: now
    };
  }

  startMonitoring() {
    // Update system metrics immediately
    this.updateSystemMetrics();
    
    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.updateSystemMetrics();
      this.checkAllServices();
    }, this.options.checkInterval);

    console.log(`🔄 Health monitoring started (interval: ${this.options.checkInterval}ms)`);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 Health monitoring stopped');
    }
  }

  async checkAllServices() {
    const overallHealth = this.getOverallHealth();
    
    // Store health history
    this.healthHistory.push({
      timestamp: Date.now(),
      status: overallHealth.status,
      healthPercentage: overallHealth.healthPercentage,
      serviceCount: Object.keys(overallHealth.services).length
    });

    // Keep history size manageable
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory = this.healthHistory.slice(-this.maxHistorySize);
    }

    this.emit('healthCheckCompleted', overallHealth);
    
    return overallHealth;
  }

  getHealthHistory(limit = 50) {
    return this.healthHistory.slice(-limit);
  }

  getHealthyServices() {
    return Array.from(this.services.entries())
      .filter(([name, service]) => service.status === 'healthy')
      .map(([name, service]) => ({ name, ...service }));
  }

  getUnhealthyServices() {
    return Array.from(this.services.entries())
      .filter(([name, service]) => service.status === 'unhealthy')
      .map(([name, service]) => ({ name, ...service }));
  }

  // Manual health check trigger
  async triggerHealthCheck(serviceName = null) {
    if (serviceName) {
      const service = this.services.get(serviceName);
      if (service) {
        this.emit('manualHealthCheckTriggered', { serviceName, service });
      }
    } else {
      this.emit('manualHealthCheckTriggered', { all: true });
      return await this.checkAllServices();
    }
  }

  destroy() {
    this.stopMonitoring();
    this.services.clear();
    this.healthHistory = [];
    this.removeAllListeners();
  }
}

export default HealthMonitor;
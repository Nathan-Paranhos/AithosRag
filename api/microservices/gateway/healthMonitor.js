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
    try {
      const metrics = this.systemMetrics;
      const issues = [];
      let status = 'healthy';

      // Validate metrics exist
      if (!metrics || !metrics.memory || !metrics.cpu) {
        return {
          status: 'unknown',
          issues: ['System metrics not available'],
          metrics: {
            cpu: { usage: 0, loadAverage: [0, 0, 0] },
            memory: { used: 0, total: 0, percentage: 0 },
            uptime: 0,
            timestamp: new Date().toISOString()
          }
        };
      }

      // Check memory usage with safe defaults
      const memoryPercentage = metrics.memory.percentage || 0;
      if (memoryPercentage > this.options.memoryThreshold) {
        issues.push(`High memory usage: ${Math.round(memoryPercentage * 100)}%`);
        status = 'degraded';
      }

      // Check CPU usage with safe defaults
      const cpuUsage = metrics.cpu.usage || 0;
      if (cpuUsage > this.options.cpuThreshold) {
        issues.push(`High CPU usage: ${Math.round(cpuUsage * 100)}%`);
        status = 'degraded';
      }

      // Check disk usage with safe defaults
      const diskPercentage = metrics.disk?.percentage || 0;
      if (diskPercentage > this.options.diskThreshold) {
        issues.push(`High disk usage: ${Math.round(diskPercentage * 100)}%`);
        if (status !== 'critical') {
          status = 'degraded';
        }
      }

      return {
        status,
        issues,
        metrics: {
          cpu: {
            usage: Math.round((cpuUsage || 0) * 100),
            loadAverage: metrics.cpu.loadAverage || [0, 0, 0]
          },
          memory: {
            used: Math.round((metrics.memory.used || 0) / 1024 / 1024), // MB
            total: Math.round((metrics.memory.total || 0) / 1024 / 1024), // MB
            percentage: Math.round((memoryPercentage || 0) * 100)
          },
          uptime: Math.round(metrics.uptime || 0),
          timestamp: new Date(metrics.timestamp || Date.now()).toISOString()
        }
      };
    } catch (error) {
      console.error('Error in getSystemHealth:', error);
      return {
        status: 'error',
        issues: ['System health check failed'],
        metrics: {
          cpu: { usage: 0, loadAverage: [0, 0, 0] },
          memory: { used: 0, total: 0, percentage: 0 },
          uptime: 0,
          timestamp: new Date().toISOString()
        }
      };
    }
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
    try {
      const now = Date.now();
      
      // CPU metrics with error handling
      let cpuUsage = 0;
      try {
        const cpus = os.cpus();
        if (cpus && cpus.length > 0) {
          let totalIdle = 0;
          let totalTick = 0;
          
          cpus.forEach(cpu => {
            if (cpu && cpu.times) {
              for (const type in cpu.times) {
                totalTick += cpu.times[type] || 0;
              }
              totalIdle += cpu.times.idle || 0;
            }
          });
          
          if (cpus.length > 0 && totalTick > 0) {
            const idle = totalIdle / cpus.length;
            const total = totalTick / cpus.length;
            cpuUsage = total > 0 ? Math.max(0, Math.min(1, 1 - (idle / total))) : 0;
          }
        }
      } catch (cpuError) {
        console.warn('Error calculating CPU usage:', cpuError.message);
        cpuUsage = 0;
      }

      // Memory metrics with error handling
      let memoryMetrics = { used: 0, total: 0, percentage: 0 };
      try {
        const totalMem = os.totalmem() || 0;
        const freeMem = os.freemem() || 0;
        const usedMem = Math.max(0, totalMem - freeMem);
        
        memoryMetrics = {
          used: usedMem,
          total: totalMem,
          percentage: totalMem > 0 ? Math.max(0, Math.min(1, usedMem / totalMem)) : 0
        };
      } catch (memError) {
        console.warn('Error calculating memory usage:', memError.message);
      }
      
      // Load average with error handling
      let loadAverage = [0, 0, 0];
      try {
        const loadAvg = os.loadavg();
        if (Array.isArray(loadAvg) && loadAvg.length >= 3) {
          loadAverage = loadAvg.map(val => isNaN(val) ? 0 : Math.max(0, val));
        }
      } catch (loadError) {
        console.warn('Error getting load average:', loadError.message);
      }
      
      // Update metrics with safe values
      this.systemMetrics = {
        cpu: {
          usage: isNaN(cpuUsage) ? 0 : cpuUsage,
          loadAverage: loadAverage
        },
        memory: memoryMetrics,
        disk: {
          // Note: Disk usage would require additional libraries like 'diskusage'
          used: 0,
          total: 0,
          percentage: 0
        },
        uptime: Math.max(0, process.uptime() || 0),
        timestamp: now
      };
    } catch (error) {
      console.error('Error updating system metrics:', error);
      // Fallback to safe default values
      this.systemMetrics = {
        cpu: { usage: 0, loadAverage: [0, 0, 0] },
        memory: { used: 0, total: 0, percentage: 0 },
        disk: { used: 0, total: 0, percentage: 0 },
        uptime: 0,
        timestamp: Date.now()
      };
    }
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
    const promises = [];
    
    // Check each registered service
    for (const [serviceName, service] of this.services) {
      promises.push(this.checkServiceHealth(serviceName, service));
    }
    
    // Wait for all health checks to complete
    await Promise.allSettled(promises);
    
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

  async checkServiceHealth(serviceName, service) {
    const startTime = Date.now();
    
    try {
      const url = `http://${service.host}:${service.port}${service.healthEndpoint}`;
      
      const response = await fetch(url, {
        method: 'GET',
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'HealthMonitor/1.0'
        }
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        this.updateServiceHealth(serviceName, {
          status: 'healthy',
          responseTime,
          lastCheck: Date.now()
        });
      } else {
        this.updateServiceHealth(serviceName, {
          status: 'unhealthy',
          responseTime,
          lastCheck: Date.now(),
          error: `HTTP ${response.status}: ${response.statusText}`
        });
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.updateServiceHealth(serviceName, {
        status: 'unhealthy',
        responseTime,
        lastCheck: Date.now(),
        error: error.message
      });
      
      console.warn(`Health check failed for ${serviceName}:`, error.message);
    }
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
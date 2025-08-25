import EventEmitter from 'events';
import axios from 'axios';

class ServiceDiscovery extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      healthCheckInterval: options.healthCheckInterval || 30000, // 30 seconds
      healthCheckTimeout: options.healthCheckTimeout || 5000, // 5 seconds
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000, // 1 second
      ...options
    };

    this.services = new Map();
    this.serviceInstances = new Map();
    this.healthCheckInterval = null;
    
    this.startHealthChecks();
  }

  registerService(serviceName, serviceConfig) {
    const service = {
      name: serviceName,
      host: serviceConfig.host || 'localhost',
      port: serviceConfig.port,
      path: serviceConfig.path || '/',
      healthEndpoint: serviceConfig.health || '/health',
      protocol: serviceConfig.protocol || 'http',
      version: serviceConfig.version || '1.0.0',
      metadata: serviceConfig.metadata || {},
      registeredAt: new Date().toISOString(),
      lastHealthCheck: null,
      status: 'unknown',
      consecutiveFailures: 0,
      ...serviceConfig
    };

    const serviceId = this.generateServiceId(serviceName, service.host, service.port);
    service.id = serviceId;

    this.services.set(serviceId, service);
    
    // Group instances by service name
    if (!this.serviceInstances.has(serviceName)) {
      this.serviceInstances.set(serviceName, new Set());
    }
    this.serviceInstances.get(serviceName).add(serviceId);

    console.log(`📋 Service registered: ${serviceName} (${serviceId}) at ${service.protocol}://${service.host}:${service.port}`);
    
    this.emit('serviceRegistered', { serviceName, serviceId, service });
    
    // Perform immediate health check
    this.checkServiceHealth(serviceId);
    
    return serviceId;
  }

  unregisterService(serviceId) {
    const service = this.services.get(serviceId);
    if (!service) {
      return false;
    }

    const serviceName = service.name;
    this.services.delete(serviceId);
    
    const instances = this.serviceInstances.get(serviceName);
    if (instances) {
      instances.delete(serviceId);
      if (instances.size === 0) {
        this.serviceInstances.delete(serviceName);
      }
    }

    console.log(`📋 Service unregistered: ${serviceName} (${serviceId})`);
    
    this.emit('serviceUnregistered', { serviceName, serviceId, service });
    
    return true;
  }

  getService(serviceId) {
    return this.services.get(serviceId);
  }

  getServicesByName(serviceName) {
    const instanceIds = this.serviceInstances.get(serviceName);
    if (!instanceIds) {
      return [];
    }

    return Array.from(instanceIds)
      .map(id => this.services.get(id))
      .filter(service => service !== undefined);
  }

  getHealthyServices(serviceName = null) {
    if (serviceName) {
      return this.getServicesByName(serviceName)
        .filter(service => service.status === 'healthy');
    }

    return Array.from(this.services.values())
      .filter(service => service.status === 'healthy');
  }

  getUnhealthyServices(serviceName = null) {
    if (serviceName) {
      return this.getServicesByName(serviceName)
        .filter(service => service.status === 'unhealthy');
    }

    return Array.from(this.services.values())
      .filter(service => service.status === 'unhealthy');
  }

  getAllServices() {
    const result = {};
    
    for (const [serviceName, instanceIds] of this.serviceInstances) {
      result[serviceName] = {
        instances: Array.from(instanceIds).map(id => {
          const service = this.services.get(id);
          return {
            id: service.id,
            host: service.host,
            port: service.port,
            status: service.status,
            lastHealthCheck: service.lastHealthCheck,
            consecutiveFailures: service.consecutiveFailures,
            version: service.version,
            metadata: service.metadata
          };
        }),
        totalInstances: instanceIds.size,
        healthyInstances: this.getHealthyServices(serviceName).length,
        unhealthyInstances: this.getUnhealthyServices(serviceName).length
      };
    }
    
    return result;
  }

  async checkServiceHealth(serviceId) {
    const service = this.services.get(serviceId);
    if (!service) {
      return null;
    }

    const healthUrl = `${service.protocol}://${service.host}:${service.port}${service.healthEndpoint}`;
    
    try {
      const startTime = Date.now();
      const response = await axios.get(healthUrl, {
        timeout: this.options.healthCheckTimeout,
        validateStatus: (status) => status >= 200 && status < 300
      });
      
      const responseTime = Date.now() - startTime;
      
      service.status = 'healthy';
      service.lastHealthCheck = new Date().toISOString();
      service.consecutiveFailures = 0;
      service.responseTime = responseTime;
      service.healthData = response.data;

      this.emit('serviceHealthy', { serviceId, service, responseTime });
      
      return {
        serviceId,
        status: 'healthy',
        responseTime,
        data: response.data
      };
    } catch (error) {
      service.status = 'unhealthy';
      service.lastHealthCheck = new Date().toISOString();
      service.consecutiveFailures++;
      service.lastError = error.message;

      console.warn(`❌ Health check failed for ${service.name} (${serviceId}): ${error.message}`);
      
      this.emit('serviceUnhealthy', { serviceId, service, error });
      
      // Auto-unregister after too many consecutive failures
      if (service.consecutiveFailures >= this.options.retryAttempts) {
        console.warn(`🚫 Auto-unregistering ${service.name} (${serviceId}) after ${service.consecutiveFailures} consecutive failures`);
        this.emit('serviceAutoUnregistered', { serviceId, service });
        // Don't actually unregister, just mark as failed
        service.status = 'failed';
      }
      
      return {
        serviceId,
        status: 'unhealthy',
        error: error.message,
        consecutiveFailures: service.consecutiveFailures
      };
    }
  }

  async checkAllServices() {
    const results = [];
    const promises = [];

    for (const serviceId of this.services.keys()) {
      promises.push(
        this.checkServiceHealth(serviceId)
          .then(result => results.push(result))
          .catch(error => {
            console.error(`Error checking health for ${serviceId}:`, error);
            results.push({ serviceId, status: 'error', error: error.message });
          })
      );
    }

    await Promise.all(promises);
    
    const summary = {
      total: results.length,
      healthy: results.filter(r => r.status === 'healthy').length,
      unhealthy: results.filter(r => r.status === 'unhealthy').length,
      failed: results.filter(r => r.status === 'failed').length,
      errors: results.filter(r => r.status === 'error').length,
      timestamp: new Date().toISOString()
    };

    this.emit('healthCheckCompleted', { results, summary });
    
    return { results, summary };
  }

  startHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.checkAllServices();
    }, this.options.healthCheckInterval);

    console.log(`🔄 Health checks started (interval: ${this.options.healthCheckInterval}ms)`);
  }

  stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('🛑 Health checks stopped');
    }
  }

  generateServiceId(serviceName, host, port) {
    return `${serviceName}_${host}_${port}_${Date.now()}`;
  }

  // Service discovery patterns
  discoverServiceByName(serviceName, options = {}) {
    const services = this.getHealthyServices(serviceName);
    
    if (services.length === 0) {
      return null;
    }

    // Load balancing strategies
    switch (options.strategy || 'round-robin') {
      case 'random':
        return services[Math.floor(Math.random() * services.length)];
      
      case 'least-connections':
        // For now, just return the first one (would need connection tracking)
        return services[0];
      
      case 'fastest-response':
        return services.reduce((fastest, current) => 
          (current.responseTime || Infinity) < (fastest.responseTime || Infinity) ? current : fastest
        );
      
      case 'round-robin':
      default:
        // Simple round-robin (would need to track state for true round-robin)
        const index = Math.floor(Date.now() / 1000) % services.length;
        return services[index];
    }
  }

  // Get service statistics
  getServiceStats() {
    const stats = {
      totalServices: this.services.size,
      serviceTypes: {},
      healthySummary: {
        healthy: 0,
        unhealthy: 0,
        failed: 0,
        unknown: 0
      },
      averageResponseTime: 0,
      lastHealthCheck: null
    };

    let totalResponseTime = 0;
    let responseTimeCount = 0;
    let latestHealthCheck = 0;

    for (const service of this.services.values()) {
      // Count by service type
      stats.serviceTypes[service.name] = (stats.serviceTypes[service.name] || 0) + 1;
      
      // Count by health status
      stats.healthySummary[service.status] = (stats.healthySummary[service.status] || 0) + 1;
      
      // Calculate average response time
      if (service.responseTime) {
        totalResponseTime += service.responseTime;
        responseTimeCount++;
      }
      
      // Find latest health check
      if (service.lastHealthCheck) {
        const checkTime = new Date(service.lastHealthCheck).getTime();
        if (checkTime > latestHealthCheck) {
          latestHealthCheck = checkTime;
        }
      }
    }

    if (responseTimeCount > 0) {
      stats.averageResponseTime = Math.round(totalResponseTime / responseTimeCount);
    }

    if (latestHealthCheck > 0) {
      stats.lastHealthCheck = new Date(latestHealthCheck).toISOString();
    }

    return stats;
  }

  destroy() {
    this.stopHealthChecks();
    this.services.clear();
    this.serviceInstances.clear();
    this.removeAllListeners();
  }
}

export default ServiceDiscovery;
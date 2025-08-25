import EventEmitter from 'events';
import crypto from 'crypto';

class LoadBalancer extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      strategy: options.strategy || 'round-robin', // round-robin, weighted, least-connections, ip-hash, random
      healthCheckInterval: options.healthCheckInterval || 30000,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      timeout: options.timeout || 5000,
      ...options
    };

    this.services = new Map();
    this.roundRobinIndex = 0;
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      requestsPerSecond: 0,
      lastResetTime: Date.now()
    };
    
    this.requestHistory = [];
    this.maxHistorySize = 1000;
    
    this.startStatsCollection();
  }

  addService(serviceName, serviceConfig) {
    const service = {
      name: serviceName,
      url: serviceConfig.url,
      weight: serviceConfig.weight || 1,
      maxConnections: serviceConfig.maxConnections || 100,
      currentConnections: 0,
      isHealthy: true,
      lastHealthCheck: null,
      responseTime: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      consecutiveFailures: 0,
      lastRequestTime: null,
      metadata: serviceConfig.metadata || {},
      ...serviceConfig
    };

    this.services.set(serviceName, service);
    console.log(`⚖️ Load balancer added service: ${serviceName} (${service.url})`);
    
    this.emit('serviceAdded', { serviceName, service });
    return service;
  }

  removeService(serviceName) {
    const service = this.services.get(serviceName);
    if (service) {
      this.services.delete(serviceName);
      console.log(`⚖️ Load balancer removed service: ${serviceName}`);
      this.emit('serviceRemoved', { serviceName, service });
      return true;
    }
    return false;
  }

  updateServiceHealth(serviceName, isHealthy, responseTime = null) {
    const service = this.services.get(serviceName);
    if (!service) {
      return false;
    }

    const wasHealthy = service.isHealthy;
    service.isHealthy = isHealthy;
    service.lastHealthCheck = Date.now();
    
    if (responseTime !== null) {
      service.responseTime = responseTime;
    }

    if (isHealthy) {
      service.consecutiveFailures = 0;
    } else {
      service.consecutiveFailures++;
    }

    // Emit events for health changes
    if (wasHealthy !== isHealthy) {
      this.emit('serviceHealthChanged', {
        serviceName,
        wasHealthy,
        isHealthy,
        service
      });
    }

    return true;
  }

  getHealthyServices() {
    return Array.from(this.services.values()).filter(service => service.isHealthy);
  }

  selectService(clientIp = null, sessionId = null) {
    const healthyServices = this.getHealthyServices();
    
    if (healthyServices.length === 0) {
      throw new Error('No healthy services available');
    }

    let selectedService;

    switch (this.options.strategy) {
      case 'round-robin':
        selectedService = this.selectRoundRobin(healthyServices);
        break;
      case 'weighted':
        selectedService = this.selectWeighted(healthyServices);
        break;
      case 'least-connections':
        selectedService = this.selectLeastConnections(healthyServices);
        break;
      case 'ip-hash':
        selectedService = this.selectIpHash(healthyServices, clientIp);
        break;
      case 'random':
        selectedService = this.selectRandom(healthyServices);
        break;
      case 'fastest-response':
        selectedService = this.selectFastestResponse(healthyServices);
        break;
      default:
        selectedService = this.selectRoundRobin(healthyServices);
    }

    if (selectedService) {
      selectedService.currentConnections++;
      selectedService.totalRequests++;
      selectedService.lastRequestTime = Date.now();
    }

    return selectedService;
  }

  selectRoundRobin(services) {
    if (services.length === 0) return null;
    
    const service = services[this.roundRobinIndex % services.length];
    this.roundRobinIndex++;
    
    return service;
  }

  selectWeighted(services) {
    const totalWeight = services.reduce((sum, service) => sum + service.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const service of services) {
      random -= service.weight;
      if (random <= 0) {
        return service;
      }
    }
    
    return services[0]; // Fallback
  }

  selectLeastConnections(services) {
    return services.reduce((least, current) => {
      if (current.currentConnections < least.currentConnections) {
        return current;
      }
      return least;
    });
  }

  selectIpHash(services, clientIp) {
    if (!clientIp) {
      return this.selectRoundRobin(services);
    }
    
    const hash = crypto.createHash('md5').update(clientIp).digest('hex');
    const index = parseInt(hash.substring(0, 8), 16) % services.length;
    
    return services[index];
  }

  selectRandom(services) {
    const index = Math.floor(Math.random() * services.length);
    return services[index];
  }

  selectFastestResponse(services) {
    return services.reduce((fastest, current) => {
      if (current.responseTime < fastest.responseTime) {
        return current;
      }
      return fastest;
    });
  }

  async executeRequest(requestOptions, clientIp = null) {
    const startTime = Date.now();
    let selectedService = null;
    let lastError = null;
    
    for (let attempt = 0; attempt < this.options.maxRetries; attempt++) {
      try {
        selectedService = this.selectService(clientIp);
        
        if (!selectedService) {
          throw new Error('No service available');
        }

        const requestStart = Date.now();
        
        // Simulate request execution (in real implementation, this would make HTTP request)
        const result = await this.makeRequest(selectedService, requestOptions);
        
        const responseTime = Date.now() - requestStart;
        
        // Update service stats
        selectedService.responseTime = responseTime;
        selectedService.successfulRequests++;
        selectedService.consecutiveFailures = 0;
        
        // Update global stats
        this.updateStats(true, responseTime);
        
        // Record request history
        this.recordRequest({
          serviceName: selectedService.name,
          success: true,
          responseTime,
          timestamp: Date.now(),
          attempt: attempt + 1
        });
        
        this.emit('requestCompleted', {
          service: selectedService,
          responseTime,
          success: true,
          attempt: attempt + 1
        });
        
        return {
          success: true,
          data: result,
          service: selectedService.name,
          responseTime,
          attempt: attempt + 1
        };
        
      } catch (error) {
        lastError = error;
        
        if (selectedService) {
          selectedService.failedRequests++;
          selectedService.consecutiveFailures++;
          
          // Mark service as unhealthy if too many consecutive failures
          if (selectedService.consecutiveFailures >= 3) {
            this.updateServiceHealth(selectedService.name, false);
          }
        }
        
        this.emit('requestFailed', {
          service: selectedService?.name,
          error: error.message,
          attempt: attempt + 1
        });
        
        // Wait before retry
        if (attempt < this.options.maxRetries - 1) {
          await this.delay(this.options.retryDelay * (attempt + 1));
        }
      } finally {
        if (selectedService) {
          selectedService.currentConnections--;
        }
      }
    }
    
    // All retries failed
    const totalTime = Date.now() - startTime;
    this.updateStats(false, totalTime);
    
    this.recordRequest({
      serviceName: selectedService?.name || 'unknown',
      success: false,
      responseTime: totalTime,
      timestamp: Date.now(),
      error: lastError?.message
    });
    
    throw new Error(`Request failed after ${this.options.maxRetries} attempts: ${lastError?.message}`);
  }

  async makeRequest(service, options) {
    // Simulate HTTP request - in real implementation, use fetch or axios
    return new Promise((resolve, reject) => {
      const delay = Math.random() * 1000 + 100; // 100-1100ms
      
      setTimeout(() => {
        // Simulate occasional failures
        if (Math.random() < 0.05) { // 5% failure rate
          reject(new Error(`Service ${service.name} temporarily unavailable`));
        } else {
          resolve({
            status: 'success',
            service: service.name,
            timestamp: new Date().toISOString(),
            data: options.data || {}
          });
        }
      }, delay);
    });
  }

  updateStats(success, responseTime) {
    this.stats.totalRequests++;
    
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }
    
    // Update average response time
    const totalResponseTime = this.stats.averageResponseTime * (this.stats.totalRequests - 1) + responseTime;
    this.stats.averageResponseTime = totalResponseTime / this.stats.totalRequests;
  }

  recordRequest(requestData) {
    this.requestHistory.push(requestData);
    
    // Keep history size manageable
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory = this.requestHistory.slice(-this.maxHistorySize);
    }
  }

  getStats() {
    const now = Date.now();
    const timeDiff = (now - this.stats.lastResetTime) / 1000; // seconds
    
    return {
      ...this.stats,
      requestsPerSecond: timeDiff > 0 ? this.stats.totalRequests / timeDiff : 0,
      successRate: this.stats.totalRequests > 0 ? 
        (this.stats.successfulRequests / this.stats.totalRequests) * 100 : 0,
      services: this.getServiceStats()
    };
  }

  getServiceStats() {
    const serviceStats = {};
    
    for (const [name, service] of this.services) {
      serviceStats[name] = {
        name: service.name,
        url: service.url,
        isHealthy: service.isHealthy,
        currentConnections: service.currentConnections,
        totalRequests: service.totalRequests,
        successfulRequests: service.successfulRequests,
        failedRequests: service.failedRequests,
        successRate: service.totalRequests > 0 ? 
          (service.successfulRequests / service.totalRequests) * 100 : 0,
        averageResponseTime: service.responseTime,
        consecutiveFailures: service.consecutiveFailures,
        lastRequestTime: service.lastRequestTime,
        weight: service.weight
      };
    }
    
    return serviceStats;
  }

  getRequestHistory(limit = 100) {
    return this.requestHistory.slice(-limit);
  }

  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      requestsPerSecond: 0,
      lastResetTime: Date.now()
    };
    
    // Reset service stats
    for (const service of this.services.values()) {
      service.totalRequests = 0;
      service.successfulRequests = 0;
      service.failedRequests = 0;
      service.consecutiveFailures = 0;
    }
    
    this.requestHistory = [];
    console.log('📊 Load balancer stats reset');
  }

  startStatsCollection() {
    // Update requests per second every 10 seconds
    this.statsInterval = setInterval(() => {
      const now = Date.now();
      const timeDiff = (now - this.stats.lastResetTime) / 1000;
      
      if (timeDiff > 0) {
        this.stats.requestsPerSecond = this.stats.totalRequests / timeDiff;
      }
      
      this.emit('statsUpdated', this.getStats());
    }, 10000);
  }

  stopStatsCollection() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  // Health check all services
  async performHealthChecks() {
    const healthCheckPromises = [];
    
    for (const [serviceName, service] of this.services) {
      const healthCheckPromise = this.checkServiceHealth(service)
        .then(isHealthy => {
          this.updateServiceHealth(serviceName, isHealthy);
          return { serviceName, isHealthy };
        })
        .catch(error => {
          console.error(`Health check failed for ${serviceName}:`, error.message);
          this.updateServiceHealth(serviceName, false);
          return { serviceName, isHealthy: false, error: error.message };
        });
      
      healthCheckPromises.push(healthCheckPromise);
    }
    
    const results = await Promise.all(healthCheckPromises);
    this.emit('healthCheckCompleted', results);
    
    return results;
  }

  async checkServiceHealth(service) {
    // Simulate health check - in real implementation, make HTTP request to health endpoint
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate occasional health check failures
        const isHealthy = Math.random() > 0.1; // 90% healthy
        resolve(isHealthy);
      }, Math.random() * 1000 + 100);
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  destroy() {
    this.stopStatsCollection();
    this.services.clear();
    this.requestHistory = [];
    this.removeAllListeners();
  }
}

export default LoadBalancer;
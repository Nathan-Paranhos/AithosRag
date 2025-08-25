import APIGateway from './gateway/apiGateway.js';
import AuthService from './auth/authService.js';
import ChatService from './chat/chatService.js';
import AnalyticsService from './analytics/analyticsService.js';
import UserService from './users/userService.js';
import NotificationService from './notifications/notificationService.js';
import FileService from './files/fileService.js';
import EventEmitter from 'events';

class MicroservicesOrchestrator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      // Gateway configuration
      gatewayPort: options.gatewayPort || 3000,
      
      // Service ports
      authPort: options.authPort || 3001,
      chatPort: options.chatPort || 3002,
      analyticsPort: options.analyticsPort || 3003,
      userPort: options.userPort || 3004,
      notificationPort: options.notificationPort || 3005,
      filePort: options.filePort || 3008,
      
      // Common configuration
      jwtSecret: options.jwtSecret || 'your-super-secret-jwt-key-change-in-production',
      environment: options.environment || 'development',
      
      // Service discovery configuration
      serviceDiscovery: {
        healthCheckInterval: options.healthCheckInterval || 30000, // 30 seconds
        unhealthyThreshold: options.unhealthyThreshold || 3,
        healthyThreshold: options.healthyThreshold || 2
      },
      
      // Load balancer configuration
      loadBalancer: {
        strategy: options.loadBalancerStrategy || 'round_robin',
        healthCheckEnabled: options.healthCheckEnabled !== false
      },
      
      // Circuit breaker configuration
      circuitBreaker: {
        failureThreshold: options.failureThreshold || 5,
        recoveryTimeout: options.recoveryTimeout || 60000, // 1 minute
        monitoringPeriod: options.monitoringPeriod || 10000 // 10 seconds
      },
      
      ...options
    };
    
    this.services = new Map();
    this.gateway = null;
    this.isStarted = false;
    this.startupOrder = [
      'auth',
      'user',
      'file',
      'notification',
      'analytics',
      'chat',
      'gateway'
    ];
    
    this.shutdownOrder = [...this.startupOrder].reverse();
    
    // Graceful shutdown handling
    this.setupGracefulShutdown();
  }
  
  async start() {
    if (this.isStarted) {
      console.log('🔄 Microservices already started');
      return;
    }
    
    console.log('🚀 Starting Microservices Architecture...');
    
    try {
      // Initialize services in order
      for (const serviceName of this.startupOrder) {
        await this.startService(serviceName);
        
        // Wait a bit between service starts to avoid port conflicts
        await this.delay(1000);
      }
      
      this.isStarted = true;
      
      console.log('✅ All microservices started successfully!');
      console.log('🌐 API Gateway available at:', `http://localhost:${this.options.gatewayPort}`);
      
      this.emit('started', {
        gateway: `http://localhost:${this.options.gatewayPort}`,
        services: this.getServiceStatus()
      });
      
      // Start health monitoring
      this.startHealthMonitoring();
      
    } catch (error) {
      console.error('❌ Failed to start microservices:', error);
      await this.stop();
      throw error;
    }
  }
  
  async startService(serviceName) {
    console.log(`🔧 Starting ${serviceName} service...`);
    
    try {
      let service;
      
      switch (serviceName) {
        case 'auth':
          service = new AuthService({
            port: this.options.authPort,
            jwtSecret: this.options.jwtSecret,
            environment: this.options.environment
          });
          break;
          
        case 'chat':
          service = new ChatService({
            port: this.options.chatPort,
            jwtSecret: this.options.jwtSecret,
            environment: this.options.environment
          });
          break;
          
        case 'analytics':
          service = new AnalyticsService({
            port: this.options.analyticsPort,
            jwtSecret: this.options.jwtSecret,
            environment: this.options.environment
          });
          break;
          
        case 'user':
          service = new UserService({
            port: this.options.userPort,
            jwtSecret: this.options.jwtSecret,
            environment: this.options.environment
          });
          break;
          
        case 'notification':
          service = new NotificationService({
            port: this.options.notificationPort,
            jwtSecret: this.options.jwtSecret,
            environment: this.options.environment
          });
          break;
          
        case 'file':
          service = new FileService({
            port: this.options.filePort,
            jwtSecret: this.options.jwtSecret,
            environment: this.options.environment
          });
          break;
          
        case 'gateway':
          // Gateway needs to know about all services
          const serviceRegistry = this.buildServiceRegistry();
          
          service = new APIGateway({
            port: this.options.gatewayPort,
            jwtSecret: this.options.jwtSecret,
            environment: this.options.environment,
            services: serviceRegistry,
            serviceDiscovery: this.options.serviceDiscovery,
            loadBalancer: this.options.loadBalancer,
            circuitBreaker: this.options.circuitBreaker
          });
          
          this.gateway = service;
          break;
          
        default:
          throw new Error(`Unknown service: ${serviceName}`);
      }
      
      // Start the service
      await service.start();
      
      // Store service reference
      this.services.set(serviceName, {
        instance: service,
        name: serviceName,
        port: service.options?.port || this.options[`${serviceName}Port`],
        status: 'running',
        startedAt: new Date().toISOString(),
        restartCount: 0
      });
      
      console.log(`✅ ${serviceName} service started on port ${service.options?.port || this.options[`${serviceName}Port`]}`);
      
    } catch (error) {
      console.error(`❌ Failed to start ${serviceName} service:`, error);
      throw error;
    }
  }
  
  buildServiceRegistry() {
    const registry = {};
    
    // Build service registry for gateway
    const serviceConfigs = {
      auth: { port: this.options.authPort, path: '/auth' },
      chat: { port: this.options.chatPort, path: '/chat' },
      analytics: { port: this.options.analyticsPort, path: '/analytics' },
      users: { port: this.options.userPort, path: '/users' },
      notifications: { port: this.options.notificationPort, path: '/notifications' },
      files: { port: this.options.filePort, path: '/files' }
    };
    
    for (const [serviceName, config] of Object.entries(serviceConfigs)) {
      registry[serviceName] = {
        name: serviceName,
        url: `http://localhost:${config.port}`,
        path: config.path,
        healthCheck: `http://localhost:${config.port}/health`,
        version: '1.0.0',
        status: 'unknown'
      };
    }
    
    return registry;
  }
  
  async stop() {
    if (!this.isStarted) {
      console.log('🔄 Microservices already stopped');
      return;
    }
    
    console.log('🛑 Stopping microservices...');
    
    // Stop health monitoring
    if (this.healthMonitorInterval) {
      clearInterval(this.healthMonitorInterval);
    }
    
    // Stop services in reverse order
    for (const serviceName of this.shutdownOrder) {
      await this.stopService(serviceName);
    }
    
    this.isStarted = false;
    
    console.log('✅ All microservices stopped');
    this.emit('stopped');
  }
  
  async stopService(serviceName) {
    const serviceData = this.services.get(serviceName);
    
    if (!serviceData) {
      return;
    }
    
    console.log(`🛑 Stopping ${serviceName} service...`);
    
    try {
      if (serviceData.instance && typeof serviceData.instance.stop === 'function') {
        await serviceData.instance.stop();
      }
      
      serviceData.status = 'stopped';
      serviceData.stoppedAt = new Date().toISOString();
      
      console.log(`✅ ${serviceName} service stopped`);
      
    } catch (error) {
      console.error(`❌ Error stopping ${serviceName} service:`, error);
    }
  }
  
  async restartService(serviceName) {
    console.log(`🔄 Restarting ${serviceName} service...`);
    
    const serviceData = this.services.get(serviceName);
    if (serviceData) {
      serviceData.restartCount = (serviceData.restartCount || 0) + 1;
    }
    
    await this.stopService(serviceName);
    await this.delay(2000); // Wait 2 seconds before restart
    await this.startService(serviceName);
    
    console.log(`✅ ${serviceName} service restarted`);
  }
  
  startHealthMonitoring() {
    console.log('🏥 Starting health monitoring...');
    
    this.healthMonitorInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.options.serviceDiscovery.healthCheckInterval);
  }
  
  async performHealthChecks() {
    const healthResults = {};
    
    for (const [serviceName, serviceData] of this.services.entries()) {
      if (serviceName === 'gateway') continue; // Skip gateway
      
      try {
        const healthUrl = `http://localhost:${serviceData.port}/health`;
        const response = await fetch(healthUrl, {
          method: 'GET',
          timeout: 5000
        });
        
        if (response.ok) {
          const healthData = await response.json();
          healthResults[serviceName] = {
            status: 'healthy',
            response: healthData,
            timestamp: new Date().toISOString()
          };
          
          // Update service status
          serviceData.status = 'running';
          serviceData.lastHealthCheck = new Date().toISOString();
          
        } else {
          throw new Error(`Health check failed with status: ${response.status}`);
        }
        
      } catch (error) {
        healthResults[serviceName] = {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        };
        
        // Update service status
        serviceData.status = 'unhealthy';
        serviceData.lastHealthCheck = new Date().toISOString();
        serviceData.healthCheckFailures = (serviceData.healthCheckFailures || 0) + 1;
        
        console.warn(`⚠️ Health check failed for ${serviceName}:`, error.message);
        
        // Auto-restart if too many failures
        if (serviceData.healthCheckFailures >= this.options.serviceDiscovery.unhealthyThreshold) {
          console.log(`🔄 Auto-restarting ${serviceName} due to health check failures`);
          
          try {
            await this.restartService(serviceName);
            serviceData.healthCheckFailures = 0;
          } catch (restartError) {
            console.error(`❌ Failed to restart ${serviceName}:`, restartError);
          }
        }
      }
    }
    
    // Emit health status
    this.emit('healthCheck', healthResults);
  }
  
  getServiceStatus() {
    const status = {};
    
    for (const [serviceName, serviceData] of this.services.entries()) {
      status[serviceName] = {
        name: serviceName,
        port: serviceData.port,
        status: serviceData.status,
        startedAt: serviceData.startedAt,
        stoppedAt: serviceData.stoppedAt,
        restartCount: serviceData.restartCount || 0,
        lastHealthCheck: serviceData.lastHealthCheck,
        healthCheckFailures: serviceData.healthCheckFailures || 0,
        url: `http://localhost:${serviceData.port}`
      };
    }
    
    return status;
  }
  
  getGatewayUrl() {
    return `http://localhost:${this.options.gatewayPort}`;
  }
  
  getServiceUrl(serviceName) {
    const serviceData = this.services.get(serviceName);
    if (!serviceData) {
      return null;
    }
    
    return `http://localhost:${serviceData.port}`;
  }
  
  async getSystemHealth() {
    const services = this.getServiceStatus();
    const healthyServices = Object.values(services).filter(s => s.status === 'running').length;
    const totalServices = Object.keys(services).length;
    
    return {
      status: healthyServices === totalServices ? 'healthy' : 'degraded',
      services,
      summary: {
        total: totalServices,
        healthy: healthyServices,
        unhealthy: totalServices - healthyServices,
        uptime: process.uptime()
      },
      timestamp: new Date().toISOString()
    };
  }
  
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      
      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      shutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // CLI-like methods for external control
  async status() {
    return this.getSystemHealth();
  }
  
  async restart(serviceName = null) {
    if (serviceName) {
      await this.restartService(serviceName);
    } else {
      await this.stop();
      await this.delay(2000);
      await this.start();
    }
  }
  
  async logs(serviceName = null) {
    // In a real implementation, this would return service logs
    // For now, return service status
    if (serviceName) {
      const serviceData = this.services.get(serviceName);
      return serviceData ? { [serviceName]: serviceData } : null;
    }
    
    return this.getServiceStatus();
  }
}

export default MicroservicesOrchestrator;
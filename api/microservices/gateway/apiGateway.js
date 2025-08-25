import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import { createProxyMiddleware } from 'http-proxy-middleware';
import CircuitBreaker from './circuitBreaker.js';
import ServiceDiscovery from './serviceDiscovery.js';
import HealthMonitor from './healthMonitor.js';
import LoadBalancer from './loadBalancer.js';
import AuthMiddleware from './authMiddleware.js';
import { SecurityMiddleware } from '../../middleware/securityMiddleware.js';
import MetricsCollector from './metricsCollector.js';

class APIGateway {
  constructor(config = {}) {
    this.app = express();
    this.config = {
      port: config.port || 3000,
      services: config.services || {},
      rateLimit: config.rateLimit || { windowMs: 15 * 60 * 1000, max: 100 },
      cors: config.cors || { origin: true, credentials: true },
      ...config
    };
    
    this.serviceDiscovery = new ServiceDiscovery();
    this.healthMonitor = new HealthMonitor();
    this.loadBalancer = new LoadBalancer();
    this.authMiddleware = new AuthMiddleware();
    this.securityMiddleware = new SecurityMiddleware(config.securityService);
    this.metricsCollector = new MetricsCollector();
    this.circuitBreakers = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.startHealthChecks();
    this.securityMiddleware.startCleanup();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        },
      },
    }));

    // CORS
    this.app.use(cors({
      ...this.config.cors,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token', 'X-Session-ID']
    }));

    // Security middleware (first line of defense)
    this.app.use(this.securityMiddleware.securityCheck());
    
    // Global rate limiting
    this.app.use(this.securityMiddleware.globalRateLimit);
    
    // Slow down suspicious activity
    this.app.use(this.securityMiddleware.slowDownMiddleware);

    // Compression
    this.app.use(compression());

    // Logging
    this.app.use(morgan('combined'));

    // Rate limiting
    const limiter = rateLimit(this.config.rateLimit);
    this.app.use('/api/', limiter);

    // Body parsing with security validation
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req, res, buf) => {
        // Additional security validation can be added here
        req.rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // CSRF Protection for state-changing operations
    this.app.use(this.securityMiddleware.csrfProtection());

    // Metrics collection
    this.app.use(this.metricsCollector.collectRequestMetrics);

    // Authentication middleware
    this.app.use('/api/', this.authMiddleware.authenticate);
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      const health = this.healthMonitor.getOverallHealth();
      res.status(health.status === 'healthy' ? 200 : 503).json(health);
    });

    // Metrics endpoint
    this.app.get('/metrics', (req, res) => {
      const metrics = this.metricsCollector.getMetrics();
      res.json(metrics);
    });

    // Service discovery endpoint
    this.app.get('/services', (req, res) => {
      const services = this.serviceDiscovery.getAllServices();
      res.json(services);
    });

    // CSRF token endpoint
    this.app.get('/api/csrf-token', (req, res) => {
      const sessionId = req.sessionID || req.headers['x-session-id'] || 'anonymous';
      const token = this.securityMiddleware.generateCSRFToken(sessionId);
      res.json({ csrfToken: token });
    });

    // Dynamic route setup for microservices
    this.setupServiceRoutes();
  }

  setupServiceRoutes() {
    const services = {
      'auth': { path: '/api/auth', port: 3001 },
      'chat': { path: '/api/chat', port: 3002 },
      'analytics': { path: '/api/analytics', port: 3003 },
      'users': { path: '/api/users', port: 3004 },
      'notifications': { path: '/api/notifications', port: 3005 },
      'files': { path: '/api/files', port: 3006 }
    };

    Object.entries(services).forEach(([serviceName, config]) => {
      this.registerService(serviceName, config);
    });
  }

  registerService(serviceName, config) {
    // Register service in discovery
    this.serviceDiscovery.registerService(serviceName, {
      host: 'localhost',
      port: config.port,
      path: config.path,
      health: `http://localhost:${config.port}/health`
    });

    // Register service in load balancer
    this.loadBalancer.addService(serviceName, {
      url: `http://localhost:${config.port}`,
      weight: 1,
      maxConnections: 100
    });

    // Create circuit breaker for service
    const circuitBreaker = new CircuitBreaker({
      timeout: 5000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000
    });
    this.circuitBreakers.set(serviceName, circuitBreaker);

    // Setup proxy middleware with circuit breaker
    const proxyMiddleware = createProxyMiddleware({
      target: `http://localhost:${config.port}`,
      changeOrigin: true,
      pathRewrite: {
        [`^${config.path}`]: ''
      },
      onProxyReq: (proxyReq, req, res) => {
        // Add request ID for tracing
        const requestId = this.generateRequestId();
        proxyReq.setHeader('X-Request-ID', requestId);
        req.requestId = requestId;
      },
      onProxyRes: (proxyRes, req, res) => {
        // Add response headers
        proxyRes.headers['X-Service'] = serviceName;
        proxyRes.headers['X-Request-ID'] = req.requestId;
      },
      onError: (err, req, res) => {
        console.error(`Proxy error for ${serviceName}:`, err.message);
        circuitBreaker.recordFailure();
        
        if (circuitBreaker.isOpen()) {
          res.status(503).json({
            error: 'Service temporarily unavailable',
            service: serviceName,
            message: 'Circuit breaker is open'
          });
        } else {
          res.status(502).json({
            error: 'Bad Gateway',
            service: serviceName,
            message: err.message
          });
        }
      }
    });

    // Wrap proxy with circuit breaker
    this.app.use(config.path, async (req, res, next) => {
      try {
        // Check circuit breaker state
        if (circuitBreaker.isOpen()) {
          return res.status(503).json({
            error: 'Service temporarily unavailable',
            service: serviceName,
            message: 'Circuit breaker is open'
          });
        }

        // Load balancing (if multiple instances)
        const healthyServices = this.loadBalancer.getHealthyServices();
        const serviceInstance = healthyServices.find(s => s.name === serviceName);
        if (!serviceInstance) {
          return res.status(503).json({
            error: 'No healthy service instances available',
            service: serviceName
          });
        }

        // Record success for circuit breaker
        circuitBreaker.recordSuccess();
        
        // Continue to proxy
        proxyMiddleware(req, res, next);
      } catch (error) {
        console.error(`Gateway error for ${serviceName}:`, error);
        circuitBreaker.recordFailure();
        res.status(500).json({
          error: 'Internal gateway error',
          service: serviceName
        });
      }
    });
  }

  startHealthChecks() {
    // Start health monitoring for all registered services
    setInterval(() => {
      this.healthMonitor.checkAllServices();
    }, 30000); // Check every 30 seconds

    // Update load balancer with healthy instances
    setInterval(() => {
      const healthyServices = this.healthMonitor.getHealthyServices();
      // Update service health status in load balancer
      for (const [serviceName, service] of this.loadBalancer.services) {
        const isHealthy = healthyServices.some(hs => hs.name === serviceName);
        this.loadBalancer.updateServiceHealth(serviceName, isHealthy);
      }
    }, 10000); // Update every 10 seconds
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.config.port, () => {
        console.log(`🚀 API Gateway running on port ${this.config.port}`);
        console.log(`📊 Health endpoint: http://localhost:${this.config.port}/health`);
        console.log(`📈 Metrics endpoint: http://localhost:${this.config.port}/metrics`);
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 API Gateway stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // Graceful shutdown
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n🔄 Received ${signal}, starting graceful shutdown...`);
      
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
  }
}

export default APIGateway;
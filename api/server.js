import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import cluster from 'cluster';
import os from 'os';

// Enterprise Security Middleware
import AuditService from './microservices/audit/auditService.js';
import { inputSanitizer } from './middleware/inputSanitization.js';
import { defaultUserRateLimit } from './middleware/userRateLimit.js';
import { circuitBreakerManager } from './middleware/circuitBreaker.js';
import { healthMonitor } from './middleware/healthMonitor.js';

// Import legacy services (for backward compatibility)
import ModelSelector from './middleware/modelSelector.js';
import GroqService from './groq.service.js';
import LoadBalancer from './services/loadBalancer.js';
import FallbackSystem from './fallbackSystem.js';
import MetricsSystem from './metricsSystem.js';
import CacheSystem from './cacheSystem.js';
import RateLimiter from './rateLimiter.js';

// Import microservices orchestrator
import MicroservicesOrchestrator from './microservices/orchestrator.js';

// Import individual microservices
import UserService from './microservices/users/userService.js';
import ChatService from './microservices/chat/chatService.js';
import AnalyticsService from './microservices/analytics/analyticsService.js';
import NotificationService from './microservices/notifications/notificationService.js';
import FileService from './microservices/files/fileService.js';
import AuthService from './microservices/auth/authService.js';
import SecurityService from './microservices/security/securityService.js';

// Configurar dotenv
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT) || 3001;

// Initialize microservices orchestrator
const microservices = new MicroservicesOrchestrator({
  gatewayPort: PORT + 1000, // 4001 for gateway
  authPort: PORT + 1001,    // 4002 for auth
  chatPort: PORT + 1002,    // 4003 for chat
  analyticsPort: PORT + 1003, // 4004 for analytics
  userPort: PORT + 1004,    // 4005 for users
  notificationPort: PORT + 1005, // 4006 for notifications
  filePort: PORT + 1008,    // 4009 for files
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  environment: process.env.NODE_ENV || 'development'
});

// Inicializar serviços
const groqService = new GroqService();
const modelSelector = new ModelSelector(groqService);
const loadBalancer = new LoadBalancer(groqService);
const fallbackSystem = new FallbackSystem(groqService, loadBalancer);
const metricsSystem = new MetricsSystem();
const cacheSystem = new CacheSystem({
  maxSize: 2000,
  defaultTTL: 1800000, // 30 minutos
  persistPath: './cache_data.json'
});
const rateLimiter = new RateLimiter({
  adaptiveMode: true,
  loadThreshold: 0.75
});

// Initialize enterprise services
const auditService = new AuditService({ port: 3007 });

// Configurações de segurança
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Configurar CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://aithos-rag.netlify.app', 'https://your-frontend-domain.com']
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Enterprise Security Middleware
app.use(defaultUserRateLimit.extractUser()); // Extract user from JWT
app.use(inputSanitizer.sanitize()); // Input sanitization
app.use(defaultUserRateLimit.general()); // User-based rate limiting

// Audit logging middleware
app.use((req, res, next) => {
  req.auditLog = (data) => {
    auditService.logEvent({
      ...data,
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  };
  next();
});

// Performance monitoring middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    
    healthMonitor.recordRequest(responseTime, isError);
    
    // Log to audit service
    req.auditLog({
      type: 'HTTP_REQUEST',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      isError
    });
  });
  
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP por janela de tempo
  message: {
    error: 'Muitas requisições deste IP, tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Middleware de análise de requisição e seleção de modelo
app.use('/api/chat', modelSelector.analyzeRequest());
app.use('/api/chat', modelSelector.logSelection());

// Disponibilizar serviços para as rotas
app.use((req, res, next) => {
  req.groqService = groqService;
  req.modelSelector = modelSelector;
  req.loadBalancer = loadBalancer;
  req.fallbackSystem = fallbackSystem;
  req.metricsSystem = metricsSystem;
  req.cacheSystem = cacheSystem;
  req.rateLimiter = rateLimiter;
  next();
});

// Middleware de rate limiting global
app.use(async (req, res, next) => {
  // Pular rate limiting para rotas de saúde e métricas
  if (req.path === '/health' || req.path.startsWith('/api/metrics')) {
    return next();
  }
  
  const identifier = req.ip || 'anonymous';
  const modelId = req.body?.model || req.query?.model || 'default';
  
  try {
    const limitCheck = await rateLimiter.checkLimit(identifier, modelId, {
      estimatedTokens: req.body?.max_completion_tokens || 1000,
      userInfo: req.user || { tier: 'free' }
    });
    
    if (!limitCheck.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        reason: limitCheck.reason,
        retryAfter: limitCheck.retryAfter,
        limits: limitCheck.limits,
        current: limitCheck.current
      });
    }
    
    // Registrar uso
    await rateLimiter.recordUsage(identifier, modelId, {
      estimatedTokens: req.body?.max_completion_tokens || 1000
    });
    
    // Adicionar função de cleanup para liberar requisição concorrente
    req.releaseRateLimit = () => rateLimiter.releaseRequest(identifier, modelId);
    
    next();
  } catch (error) {
    console.error('Rate limiting error:', error);
    next(); // Continuar em caso de erro no rate limiter
  }
});

app.use('/api/loadbalancer', (req, res, next) => {
  req.groqService = groqService;
  req.modelSelector = modelSelector;
  req.loadBalancer = loadBalancer;
  req.fallbackSystem = fallbackSystem;
  req.metricsSystem = metricsSystem;
  next();
});

app.use('/api/fallback', (req, res, next) => {
  req.groqService = groqService;
  req.modelSelector = modelSelector;
  req.loadBalancer = loadBalancer;
  req.fallbackSystem = fallbackSystem;
  req.metricsSystem = metricsSystem;
  next();
});

// Importar rotas
import chatRoutes from './routes/chat.js';
import loadBalancerRoutes from './routes/loadBalancer.js';
import fallbackRoutes from './routes/fallback.js';
import metricsRoutes from './routes/metrics.js';
import cacheRoutes from './routes/cache.js';
import rateLimitRoutes from './routes/rateLimit.js';
import auditRoutes from './routes/audit.js';

// Routes with circuit breaker protection
app.use('/api/chat', (req, res, next) => {
  const breaker = circuitBreakerManager.getBreaker('chat-service', {
    failureThreshold: 5,
    timeout: 30000,
    fallback: () => ({ error: 'Chat service temporarily unavailable' })
  });
  
  breaker.execute(() => {
    return new Promise((resolve, reject) => {
      const originalSend = res.send;
      res.send = function(data) {
        resolve(data);
        return originalSend.call(this, data);
      };
      
      const originalStatus = res.status;
      res.status = function(code) {
        if (code >= 500) {
          reject(new Error(`HTTP ${code}`));
        }
        return originalStatus.call(this, code);
      };
      
      next();
    });
  }).catch(error => {
    if (error.message.includes('Circuit breaker')) {
      res.status(503).json({ error: 'Service temporarily unavailable' });
    } else {
      next(error);
    }
  });
});
app.use('/api/chat', defaultUserRateLimit.action('chat'), chatRoutes);

app.use('/api/loadbalancer', loadBalancerRoutes);
app.use('/api/fallback', fallbackRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/cache', cacheRoutes);
app.use('/api/ratelimit', rateLimitRoutes);
app.use('/api/audit', auditRoutes);

// Health check endpoints
app.get('/api/health', (req, res) => {
  const healthStatus = healthMonitor.getHealthStatus();
  const statusCode = healthStatus.overall === 'healthy' ? 200 : 
                    healthStatus.overall === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json({
    status: healthStatus.overall,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    services: healthStatus.services,
    systemMetrics: healthStatus.systemMetrics,
    alerts: healthStatus.alerts
  });
});

// Detailed health endpoint (admin only)
app.get('/health/detailed', defaultUserRateLimit.action('export'), (req, res) => {
  // Check if user is admin
  if (!req.user || !req.user.roles?.includes('admin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const detailedStats = healthMonitor.getDetailedStats();
  res.json(detailedStats);
});

// Circuit breaker status endpoint
app.get('/health/circuit-breakers', (req, res) => {
  if (!req.user || !req.user.roles?.includes('admin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const breakerStats = circuitBreakerManager.getGlobalStats();
  const allBreakers = circuitBreakerManager.getAllStatus();
  
  res.json({
    global: breakerStats,
    breakers: allBreakers
  });
});

// Rate limiting status endpoint
app.get('/health/rate-limits', (req, res) => {
  if (!req.user || !req.user.roles?.includes('admin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const rateLimitStats = defaultUserRateLimit.getStats();
  res.json(rateLimitStats);
});

// Rota para validar API Key
app.get('/api/validate', (req, res) => {
  try {
    const hasApiKey = !!process.env.GROQ_API_KEY;
    const availableModels = groqService.getAvailableModels();
    
    res.json({
      success: true,
      configured: hasApiKey,
      modelsCount: availableModels.length,
      models: availableModels,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro na validação da API:', error);
    res.status(500).json({
      success: false,
      configured: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'Aithos RAG API está funcionando!',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      chat: '/api/chat'
    }
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro:', err.stack);
  res.status(500).json({
    error: 'Algo deu errado!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno do servidor'
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// Limpeza automática do sistema a cada 30 minutos
setInterval(() => {
  try {
    groqService.cleanupSystem();
    console.log('🧹 Limpeza automática do sistema executada');
  } catch (error) {
    console.error('❌ Erro na limpeza automática:', error);
  }
}, 30 * 60 * 1000);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 Graceful shutdown initiated...');
  
  try {
    // Desabilitar sistemas
    fallbackSystem.disable();
    rateLimiter.shutdown();
    
    // Salvar dados
    await metricsSystem.saveMetrics();
    await cacheSystem.shutdown();
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('🔄 Graceful shutdown initiated (SIGINT)...');
  
  try {
    fallbackSystem.disable();
    rateLimiter.shutdown();
    await metricsSystem.saveMetrics();
    await cacheSystem.shutdown();
    
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Função para inicializar o servidor
async function startServer() {
  try {
    console.log('🚀 Initializing Aithos RAG System...');
    
    // Start enterprise services
    console.log('🔒 Starting enterprise security services...');
    await auditService.start();
    console.log('✅ Audit service started');
    
    // Configure health monitoring for microservices
    healthMonitor.addService('auth-service', {
      url: 'http://localhost:3001/health',
      timeout: 5000
    });
    
    healthMonitor.addService('chat-service', {
      url: 'http://localhost:3002/health',
      timeout: 5000
    });
    
    healthMonitor.addService('analytics-service', {
      url: 'http://localhost:3003/health',
      timeout: 5000
    });
    
    healthMonitor.addService('user-service', {
      url: 'http://localhost:3004/health',
      timeout: 5000
    });
    
    healthMonitor.addService('notification-service', {
      url: 'http://localhost:3005/health',
      timeout: 5000
    });
    
    healthMonitor.addService('file-service', {
      url: 'http://localhost:3006/health',
      timeout: 5000
    });
    
    healthMonitor.addService('audit-service', {
      url: 'http://localhost:3007/health',
      timeout: 5000
    });
    
    // Start microservices with detailed logging
    console.log('📡 Starting microservices orchestrator...');
    await microservices.start();
    console.log('✅ Microservices started successfully');
    
    // Start main server
    console.log('🌐 Starting main server...');
    const server = app.listen(PORT, () => {
      console.log(`🌟 Aithos RAG Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Gateway: http://localhost:3000`);
      console.log(`🎯 Main Server: http://localhost:${PORT}`);
      console.log(`🌐 Microservices Gateway: ${microservices.getGatewayUrl()}`);
      console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔑 Groq API configurada: ${process.env.GROQ_API_KEY ? '✅' : '❌'}`);
      console.log(`🤖 Modelos disponíveis: ${groqService.getAvailableModels().length}`);
      console.log(`⚡ Sistema de seleção inteligente: ✅`);
      console.log('⚖️ Sistema de balanceamento de carga inicializado');
      console.log('🔄 Sistema de fallback automático ativo');
      console.log('🔄 Health checks automáticos configurados');
      console.log(`🔒 Security: Enterprise-grade protection enabled`);
      console.log(`📋 Audit: Comprehensive logging active`);
      console.log(`⚡ Circuit Breakers: Fault tolerance enabled`);
      console.log(`🛡️ Rate Limiting: User-based protection active`);
      
      console.log('\n🏗️ Microservices Architecture:');
      const serviceStatus = microservices.getServiceStatus();
      Object.entries(serviceStatus).forEach(([name, service]) => {
        console.log(`  📦 ${name}: ${service.url} (${service.status})`);
      });
    });
    
    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Start server with timeout
console.log('⏰ Starting server with 60s timeout...');
Promise.race([
  startServer(),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Server startup timeout after 60s')), 60000)
  )
]).catch(error => {
  console.error('❌ Server startup failed:', error);
  process.exit(1);
});

export default app;
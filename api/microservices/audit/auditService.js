import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

class AuditService {
  constructor(options = {}) {
    this.options = {
      port: options.port || 3007,
      jwtSecret: options.jwtSecret || 'your-super-secret-jwt-key',
      environment: options.environment || 'development',
      logRetentionDays: options.logRetentionDays || 90,
      maxLogFileSize: options.maxLogFileSize || 10 * 1024 * 1024, // 10MB
      ...options
    };
    
    this.app = express();
    this.server = null;
    this.auditLogs = new Map();
    this.logBuffer = [];
    this.bufferSize = 100;
    this.flushInterval = 5000; // 5 seconds
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupLogRotation();
  }
  
  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));
    
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true
    }));
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP'
    });
    this.app.use(limiter);
    
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Request logging middleware
    this.app.use((req, res, next) => {
      req.startTime = Date.now();
      req.requestId = crypto.randomUUID();
      
      // Log request
      this.logEvent({
        type: 'REQUEST',
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      
      next();
    });
  }
  
  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'audit',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        logCount: this.auditLogs.size,
        bufferSize: this.logBuffer.length
      });
    });
    
    // Log audit event
    this.app.post('/audit/log', this.authenticateToken.bind(this), (req, res) => {
      try {
        const auditEvent = {
          ...req.body,
          userId: req.user?.id,
          userEmail: req.user?.email,
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        };
        
        this.logEvent(auditEvent);
        
        res.json({
          success: true,
          eventId: auditEvent.id || crypto.randomUUID()
        });
      } catch (error) {
        console.error('Error logging audit event:', error);
        res.status(500).json({ error: 'Failed to log audit event' });
      }
    });
    
    // Get audit logs
    this.app.get('/audit/logs', this.authenticateToken.bind(this), this.requireRole(['admin']).bind(this), (req, res) => {
      try {
        const {
          page = 1,
          limit = 50,
          userId,
          type,
          startDate,
          endDate,
          search
        } = req.query;
        
        const logs = this.getAuditLogs({
          page: parseInt(page),
          limit: parseInt(limit),
          userId,
          type,
          startDate,
          endDate,
          search
        });
        
        res.json(logs);
      } catch (error) {
        console.error('Error retrieving audit logs:', error);
        res.status(500).json({ error: 'Failed to retrieve audit logs' });
      }
    });
    
    // Get user activity
    this.app.get('/audit/user/:userId', this.authenticateToken.bind(this), (req, res) => {
      try {
        const { userId } = req.params;
        const { limit = 20 } = req.query;
        
        // Users can only see their own activity unless they're admin
        if (req.user.id !== userId && !req.user.roles?.includes('admin')) {
          return res.status(403).json({ error: 'Access denied' });
        }
        
        const activity = this.getUserActivity(userId, parseInt(limit));
        
        res.json(activity);
      } catch (error) {
        console.error('Error retrieving user activity:', error);
        res.status(500).json({ error: 'Failed to retrieve user activity' });
      }
    });
    
    // Get audit statistics
    this.app.get('/audit/stats', this.authenticateToken.bind(this), this.requireRole(['admin']).bind(this), (req, res) => {
      try {
        const stats = this.getAuditStats();
        res.json(stats);
      } catch (error) {
        console.error('Error retrieving audit stats:', error);
        res.status(500).json({ error: 'Failed to retrieve audit stats' });
      }
    });
    
    // Export audit logs
    this.app.get('/audit/export', this.authenticateToken.bind(this), this.requireRole(['admin']).bind(this), (req, res) => {
      try {
        const { format = 'json', startDate, endDate } = req.query;
        
        const logs = this.exportAuditLogs({ format, startDate, endDate });
        
        const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
        
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
        
        res.send(logs);
      } catch (error) {
        console.error('Error exporting audit logs:', error);
        res.status(500).json({ error: 'Failed to export audit logs' });
      }
    });
    
    // Error handling
    this.app.use((error, req, res, next) => {
      console.error('Audit Service Error:', error);
      
      // Log the error
      this.logEvent({
        type: 'ERROR',
        requestId: req.requestId,
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        error: 'Internal server error',
        requestId: req.requestId
      });
    });
    
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });
  }
  
  logEvent(event) {
    const auditEvent = {
      id: crypto.randomUUID(),
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
      service: 'audit'
    };
    
    // Add to buffer
    this.logBuffer.push(auditEvent);
    
    // Flush buffer if it's full
    if (this.logBuffer.length >= this.bufferSize) {
      this.flushBuffer();
    }
    
    // Also keep in memory for quick access
    this.auditLogs.set(auditEvent.id, auditEvent);
    
    // Emit event for real-time monitoring
    if (this.eventEmitter) {
      this.eventEmitter.emit('audit-event', auditEvent);
    }
  }
  
  async flushBuffer() {
    if (this.logBuffer.length === 0) return;
    
    try {
      const logsToFlush = [...this.logBuffer];
      this.logBuffer = [];
      
      // Write to file
      await this.writeLogsToFile(logsToFlush);
      
    } catch (error) {
      console.error('Error flushing audit logs:', error);
      // Put logs back in buffer
      this.logBuffer.unshift(...logsToFlush);
    }
  }
  
  async writeLogsToFile(logs) {
    const logDir = path.join(process.cwd(), 'logs', 'audit');
    await fs.mkdir(logDir, { recursive: true });
    
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logDir, `audit-${today}.jsonl`);
    
    const logLines = logs.map(log => JSON.stringify(log)).join('\n') + '\n';
    
    await fs.appendFile(logFile, logLines, 'utf8');
  }
  
  getAuditLogs(options = {}) {
    const {
      page = 1,
      limit = 50,
      userId,
      type,
      startDate,
      endDate,
      search
    } = options;
    
    let logs = Array.from(this.auditLogs.values());
    
    // Apply filters
    if (userId) {
      logs = logs.filter(log => log.userId === userId);
    }
    
    if (type) {
      logs = logs.filter(log => log.type === type);
    }
    
    if (startDate) {
      const start = new Date(startDate);
      logs = logs.filter(log => new Date(log.timestamp) >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      logs = logs.filter(log => new Date(log.timestamp) <= end);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      logs = logs.filter(log => 
        JSON.stringify(log).toLowerCase().includes(searchLower)
      );
    }
    
    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Pagination
    const total = logs.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLogs = logs.slice(startIndex, endIndex);
    
    return {
      logs: paginatedLogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  getUserActivity(userId, limit = 20) {
    const userLogs = Array.from(this.auditLogs.values())
      .filter(log => log.userId === userId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
    
    return {
      userId,
      activity: userLogs,
      summary: {
        totalEvents: userLogs.length,
        lastActivity: userLogs[0]?.timestamp,
        eventTypes: [...new Set(userLogs.map(log => log.type))]
      }
    };
  }
  
  getAuditStats() {
    const logs = Array.from(this.auditLogs.values());
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const stats = {
      total: logs.length,
      last24h: logs.filter(log => new Date(log.timestamp) >= last24h).length,
      last7d: logs.filter(log => new Date(log.timestamp) >= last7d).length,
      byType: {},
      byUser: {},
      topEvents: []
    };
    
    // Count by type
    logs.forEach(log => {
      stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
      if (log.userId) {
        stats.byUser[log.userId] = (stats.byUser[log.userId] || 0) + 1;
      }
    });
    
    // Top events
    stats.topEvents = Object.entries(stats.byType)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));
    
    return stats;
  }
  
  exportAuditLogs(options = {}) {
    const { format = 'json', startDate, endDate } = options;
    
    let logs = Array.from(this.auditLogs.values());
    
    // Apply date filters
    if (startDate) {
      const start = new Date(startDate);
      logs = logs.filter(log => new Date(log.timestamp) >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      logs = logs.filter(log => new Date(log.timestamp) <= end);
    }
    
    // Sort by timestamp
    logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    if (format === 'csv') {
      return this.convertToCSV(logs);
    }
    
    return JSON.stringify(logs, null, 2);
  }
  
  convertToCSV(logs) {
    if (logs.length === 0) return '';
    
    const headers = ['id', 'type', 'timestamp', 'userId', 'userEmail', 'ip', 'requestId', 'details'];
    const csvRows = [headers.join(',')];
    
    logs.forEach(log => {
      const row = headers.map(header => {
        let value = log[header] || '';
        if (typeof value === 'object') {
          value = JSON.stringify(value);
        }
        // Escape quotes and wrap in quotes if contains comma
        value = String(value).replace(/"/g, '""');
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value}"`;
        }
        return value;
      });
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }
  
  setupLogRotation() {
    // Flush buffer periodically
    setInterval(() => {
      this.flushBuffer();
    }, this.flushInterval);
    
    // Clean old logs daily
    setInterval(() => {
      this.cleanOldLogs();
    }, 24 * 60 * 60 * 1000); // 24 hours
  }
  
  async cleanOldLogs() {
    try {
      const logDir = path.join(process.cwd(), 'logs', 'audit');
      const files = await fs.readdir(logDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.options.logRetentionDays);
      
      for (const file of files) {
        if (file.startsWith('audit-') && file.endsWith('.jsonl')) {
          const filePath = path.join(logDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
            console.log(`Deleted old audit log: ${file}`);
          }
        }
      }
      
      // Clean memory logs older than 24 hours
      const memoryLogs = Array.from(this.auditLogs.entries());
      const memoryCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      memoryLogs.forEach(([id, log]) => {
        if (new Date(log.timestamp) < memoryCutoff) {
          this.auditLogs.delete(id);
        }
      });
      
    } catch (error) {
      console.error('Error cleaning old logs:', error);
    }
  }
  
  authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    try {
      const decoded = jwt.verify(token, this.options.jwtSecret);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
  }
  
  requireRole(roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userRoles = req.user.roles || [];
      const hasRequiredRole = roles.some(role => userRoles.includes(role));
      
      if (!hasRequiredRole) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      next();
    };
  }
  
  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.options.port, () => {
          console.log(`🔍 Audit Service running on port ${this.options.port}`);
          resolve();
        });
        
        this.server.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  async stop() {
    if (this.server) {
      // Flush remaining logs
      await this.flushBuffer();
      
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('🔍 Audit Service stopped');
          resolve();
        });
      });
    }
  }
  
  getStats() {
    return {
      service: 'audit',
      status: 'running',
      port: this.options.port,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      logCount: this.auditLogs.size,
      bufferSize: this.logBuffer.length
    };
  }
}

export default AuditService;
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

/**
 * Enterprise Security Service
 * Handles input sanitization, audit trail, security monitoring
 */
export class SecurityService {
  constructor(options = {}) {
    this.app = express();
    this.server = null;
    this.port = options.port || 3009;
    
    // Security configurations
    this.config = {
      maxRequestSize: '10mb',
      rateLimitWindow: 15 * 60 * 1000, // 15 minutes
      rateLimitMax: 100,
      auditLogRetention: 90, // days
      suspiciousActivityThreshold: 10,
      ...options
    };
    
    // In-memory stores (in production, use Redis/Database)
    this.auditLogs = [];
    this.securityEvents = [];
    this.suspiciousActivities = new Map();
    this.blockedIPs = new Set();
    this.userSessions = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.startSecurityMonitoring();
  }

  setupMiddleware() {
    // Enhanced security headers
    this.app.use(helmet({
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
        }
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // Request parsing with size limits
    this.app.use(express.json({ 
      limit: this.config.maxRequestSize,
      verify: (req, res, buf) => {
        // Log large requests for monitoring
        if (buf.length > 1024 * 1024) { // 1MB
          this.logSecurityEvent({
            type: 'large_request',
            ip: req.ip,
            size: buf.length,
            userAgent: req.get('User-Agent'),
            severity: 'medium'
          });
        }
      }
    }));
    
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: this.config.maxRequestSize 
    }));

    // Enhanced rate limiting with IP blocking
    const securityLimiter = rateLimit({
      windowMs: this.config.rateLimitWindow,
      max: this.config.rateLimitMax,
      message: {
        error: 'Too many requests from this IP',
        code: 'RATE_LIMIT_EXCEEDED'
      },
      onLimitReached: (req) => {
        this.handleSuspiciousActivity(req.ip, 'rate_limit_exceeded');
      }
    });
    
    this.app.use('/api/', securityLimiter);

    // Input sanitization middleware
    this.app.use(this.sanitizeInput.bind(this));
    
    // Security monitoring middleware
    this.app.use(this.securityMonitoring.bind(this));
  }

  setupRoutes() {
    // Audit logs endpoints
    this.app.get('/api/audit/logs', this.getAuditLogs.bind(this));
    this.app.get('/api/audit/logs/:id', this.getAuditLog.bind(this));
    this.app.post('/api/audit/logs', this.createAuditLog.bind(this));
    this.app.delete('/api/audit/logs/:id', this.deleteAuditLog.bind(this));
    
    // Security events endpoints
    this.app.get('/api/security/events', this.getSecurityEvents.bind(this));
    this.app.get('/api/security/threats', this.getThreatAnalysis.bind(this));
    this.app.post('/api/security/block-ip', this.blockIP.bind(this));
    this.app.delete('/api/security/unblock-ip/:ip', this.unblockIP.bind(this));
    
    // Security validation endpoints
    this.app.post('/api/security/validate', this.validateInput.bind(this));
    this.app.post('/api/security/sanitize', this.sanitizeData.bind(this));
    
    // Security reports
    this.app.get('/api/security/report', this.getSecurityReport.bind(this));
    this.app.get('/api/security/export', this.exportSecurityData.bind(this));
    
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        service: 'security',
        timestamp: new Date().toISOString(),
        metrics: {
          auditLogs: this.auditLogs.length,
          securityEvents: this.securityEvents.length,
          blockedIPs: this.blockedIPs.size,
          activeSessions: this.userSessions.size
        }
      });
    });
  }

  // Input Sanitization Middleware
  sanitizeInput(req, res, next) {
    try {
      // Skip sanitization for certain content types
      const contentType = req.get('Content-Type') || '';
      if (contentType.includes('multipart/form-data') || 
          contentType.includes('application/octet-stream')) {
        return next();
      }

      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        req.body = this.deepSanitize(req.body);
      }

      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        req.query = this.deepSanitize(req.query);
      }

      // Sanitize URL parameters
      if (req.params && typeof req.params === 'object') {
        req.params = this.deepSanitize(req.params);
      }

      next();
    } catch (error) {
      console.error('Input sanitization error:', error);
      this.logSecurityEvent({
        type: 'sanitization_error',
        ip: req.ip,
        error: error.message,
        severity: 'high'
      });
      
      res.status(400).json({
        error: 'Invalid input data',
        code: 'INVALID_INPUT'
      });
    }
  }

  // Deep sanitization of nested objects
  deepSanitize(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return this.sanitizeValue(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepSanitize(item));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = this.sanitizeValue(key);
      sanitized[sanitizedKey] = this.deepSanitize(value);
    }

    return sanitized;
  }

  // Sanitize individual values
  sanitizeValue(value) {
    if (typeof value !== 'string') {
      return value;
    }

    // Remove potential XSS
    let sanitized = DOMPurify.sanitize(value);
    
    // Remove SQL injection patterns
    sanitized = sanitized.replace(/('|(\-\-)|(;)|(\||\|)|(\*|\*))/g, '');
    
    // Remove script tags and javascript: protocols
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    
    // Normalize whitespace
    sanitized = sanitized.trim();
    
    return sanitized;
  }

  // Security Monitoring Middleware
  securityMonitoring(req, res, next) {
    const startTime = Date.now();
    const ip = req.ip;
    const userAgent = req.get('User-Agent') || '';
    const method = req.method;
    const url = req.originalUrl;

    // Check if IP is blocked
    if (this.blockedIPs.has(ip)) {
      return res.status(403).json({
        error: 'IP address blocked due to suspicious activity',
        code: 'IP_BLOCKED'
      });
    }

    // Detect suspicious patterns
    this.detectSuspiciousActivity(req);

    // Log request for audit
    const auditData = {
      ip,
      userAgent,
      method,
      url,
      timestamp: new Date().toISOString(),
      headers: this.sanitizeHeaders(req.headers)
    };

    // Override res.end to capture response data
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      const responseTime = Date.now() - startTime;
      
      // Log audit event
      this.logAuditEvent({
        ...auditData,
        statusCode: res.statusCode,
        responseTime,
        userId: req.user?.id,
        sessionId: req.sessionID
      });

      // Log security events for failed requests
      if (res.statusCode >= 400) {
        this.logSecurityEvent({
          type: 'failed_request',
          ip,
          statusCode: res.statusCode,
          method,
          url,
          userAgent,
          severity: res.statusCode >= 500 ? 'high' : 'medium'
        });
      }

      originalEnd.call(this, chunk, encoding);
    }.bind(this);

    next();
  }

  // Detect suspicious activity patterns
  detectSuspiciousActivity(req) {
    const ip = req.ip;
    const userAgent = req.get('User-Agent') || '';
    const url = req.originalUrl;

    // Check for common attack patterns
    const suspiciousPatterns = [
      /\.\.\//g, // Directory traversal
      /<script/gi, // XSS attempts
      /union.*select/gi, // SQL injection
      /exec\(/gi, // Code injection
      /eval\(/gi, // Code injection
      /base64_decode/gi, // Potential payload
      /system\(/gi, // System command injection
    ];

    let suspiciousScore = 0;
    const reasons = [];

    // Check URL for suspicious patterns
    suspiciousPatterns.forEach(pattern => {
      if (pattern.test(url)) {
        suspiciousScore += 2;
        reasons.push(`Suspicious URL pattern: ${pattern}`);
      }
    });

    // Check for suspicious user agents
    const suspiciousUserAgents = [
      /sqlmap/gi,
      /nikto/gi,
      /nmap/gi,
      /burp/gi,
      /scanner/gi
    ];

    suspiciousUserAgents.forEach(pattern => {
      if (pattern.test(userAgent)) {
        suspiciousScore += 3;
        reasons.push(`Suspicious user agent: ${userAgent}`);
      }
    });

    // Check request frequency
    const activity = this.suspiciousActivities.get(ip) || { count: 0, lastSeen: Date.now() };
    const timeDiff = Date.now() - activity.lastSeen;
    
    if (timeDiff < 1000) { // Less than 1 second between requests
      suspiciousScore += 1;
      reasons.push('High request frequency');
    }

    activity.count++;
    activity.lastSeen = Date.now();
    this.suspiciousActivities.set(ip, activity);

    // Take action if suspicious score is high
    if (suspiciousScore >= this.config.suspiciousActivityThreshold) {
      this.handleSuspiciousActivity(ip, 'pattern_detection', {
        score: suspiciousScore,
        reasons
      });
    }
  }

  // Handle suspicious activity
  handleSuspiciousActivity(ip, type, details = {}) {
    this.logSecurityEvent({
      type: 'suspicious_activity',
      subType: type,
      ip,
      details,
      severity: 'high',
      action: 'blocked'
    });

    // Block IP temporarily
    this.blockedIPs.add(ip);
    
    // Auto-unblock after 1 hour
    setTimeout(() => {
      this.blockedIPs.delete(ip);
      this.logSecurityEvent({
        type: 'ip_unblocked',
        ip,
        severity: 'low'
      });
    }, 60 * 60 * 1000);
  }

  // Sanitize headers for logging
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    
    // Remove sensitive headers
    delete sanitized.authorization;
    delete sanitized.cookie;
    delete sanitized['x-api-key'];
    
    return sanitized;
  }

  // Log audit events
  logAuditEvent(event) {
    const auditEvent = {
      id: this.generateId(),
      type: 'audit',
      timestamp: new Date().toISOString(),
      ...event
    };
    
    this.auditLogs.push(auditEvent);
    
    // Cleanup old logs
    this.cleanupOldLogs();
    
    // In production, save to database
    this.persistAuditLog(auditEvent);
  }

  // Log security events
  logSecurityEvent(event) {
    const securityEvent = {
      id: this.generateId(),
      type: 'security',
      timestamp: new Date().toISOString(),
      ...event
    };
    
    this.securityEvents.push(securityEvent);
    
    // Cleanup old events
    this.cleanupOldEvents();
    
    // In production, save to database and alert
    this.persistSecurityEvent(securityEvent);
    
    // Send alerts for high severity events
    if (event.severity === 'high') {
      this.sendSecurityAlert(securityEvent);
    }
  }

  // API Endpoints
  async getAuditLogs(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        type, 
        userId, 
        ip, 
        startDate, 
        endDate 
      } = req.query;
      
      let filteredLogs = [...this.auditLogs];
      
      // Apply filters
      if (type) {
        filteredLogs = filteredLogs.filter(log => log.type === type);
      }
      
      if (userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === userId);
      }
      
      if (ip) {
        filteredLogs = filteredLogs.filter(log => log.ip === ip);
      }
      
      if (startDate) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) >= new Date(startDate)
        );
      }
      
      if (endDate) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) <= new Date(endDate)
        );
      }
      
      // Sort by timestamp (newest first)
      filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedLogs = filteredLogs.slice(startIndex, endIndex);
      
      res.json({
        logs: paginatedLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredLogs.length,
          pages: Math.ceil(filteredLogs.length / limit)
        }
      });
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getAuditLog(req, res) {
    try {
      const { id } = req.params;
      const log = this.auditLogs.find(log => log.id === id);
      
      if (!log) {
        return res.status(404).json({ error: 'Audit log not found' });
      }
      
      res.json(log);
    } catch (error) {
      console.error('Get audit log error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createAuditLog(req, res) {
    try {
      const auditData = req.body;
      
      // Validate required fields
      if (!auditData.type || !auditData.action) {
        return res.status(400).json({ 
          error: 'Type and action are required' 
        });
      }
      
      this.logAuditEvent({
        ...auditData,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.status(201).json({ message: 'Audit log created successfully' });
    } catch (error) {
      console.error('Create audit log error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteAuditLog(req, res) {
    try {
      const { id } = req.params;
      const index = this.auditLogs.findIndex(log => log.id === id);
      
      if (index === -1) {
        return res.status(404).json({ error: 'Audit log not found' });
      }
      
      this.auditLogs.splice(index, 1);
      
      // Log the deletion
      this.logAuditEvent({
        type: 'audit_log_deleted',
        action: 'delete',
        resource: 'audit_log',
        resourceId: id,
        userId: req.user?.id,
        ip: req.ip
      });
      
      res.json({ message: 'Audit log deleted successfully' });
    } catch (error) {
      console.error('Delete audit log error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getSecurityEvents(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        severity, 
        type, 
        ip 
      } = req.query;
      
      let filteredEvents = [...this.securityEvents];
      
      // Apply filters
      if (severity) {
        filteredEvents = filteredEvents.filter(event => event.severity === severity);
      }
      
      if (type) {
        filteredEvents = filteredEvents.filter(event => event.type === type);
      }
      
      if (ip) {
        filteredEvents = filteredEvents.filter(event => event.ip === ip);
      }
      
      // Sort by timestamp (newest first)
      filteredEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedEvents = filteredEvents.slice(startIndex, endIndex);
      
      res.json({
        events: paginatedEvents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredEvents.length,
          pages: Math.ceil(filteredEvents.length / limit)
        }
      });
    } catch (error) {
      console.error('Get security events error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getThreatAnalysis(req, res) {
    try {
      const now = Date.now();
      const last24h = now - (24 * 60 * 60 * 1000);
      const last7d = now - (7 * 24 * 60 * 60 * 1000);
      
      const recentEvents = this.securityEvents.filter(event => 
        new Date(event.timestamp).getTime() > last24h
      );
      
      const weeklyEvents = this.securityEvents.filter(event => 
        new Date(event.timestamp).getTime() > last7d
      );
      
      // Analyze threat patterns
      const threatAnalysis = {
        summary: {
          total24h: recentEvents.length,
          total7d: weeklyEvents.length,
          blockedIPs: this.blockedIPs.size,
          activeSessions: this.userSessions.size
        },
        severityBreakdown: {
          high: recentEvents.filter(e => e.severity === 'high').length,
          medium: recentEvents.filter(e => e.severity === 'medium').length,
          low: recentEvents.filter(e => e.severity === 'low').length
        },
        topThreats: this.getTopThreats(recentEvents),
        suspiciousIPs: this.getSuspiciousIPs(),
        recommendations: this.getSecurityRecommendations(recentEvents)
      };
      
      res.json(threatAnalysis);
    } catch (error) {
      console.error('Get threat analysis error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async blockIP(req, res) {
    try {
      const { ip, reason } = req.body;
      
      if (!ip) {
        return res.status(400).json({ error: 'IP address is required' });
      }
      
      if (!validator.isIP(ip)) {
        return res.status(400).json({ error: 'Invalid IP address format' });
      }
      
      this.blockedIPs.add(ip);
      
      this.logSecurityEvent({
        type: 'ip_blocked',
        ip,
        reason: reason || 'Manual block',
        userId: req.user?.id,
        severity: 'medium'
      });
      
      res.json({ message: 'IP address blocked successfully' });
    } catch (error) {
      console.error('Block IP error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async unblockIP(req, res) {
    try {
      const { ip } = req.params;
      
      if (!validator.isIP(ip)) {
        return res.status(400).json({ error: 'Invalid IP address format' });
      }
      
      if (!this.blockedIPs.has(ip)) {
        return res.status(404).json({ error: 'IP address not found in blocked list' });
      }
      
      this.blockedIPs.delete(ip);
      
      this.logSecurityEvent({
        type: 'ip_unblocked',
        ip,
        userId: req.user?.id,
        severity: 'low'
      });
      
      res.json({ message: 'IP address unblocked successfully' });
    } catch (error) {
      console.error('Unblock IP error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async validateInput(req, res) {
    try {
      const { data, rules = {} } = req.body;
      
      const validation = this.performValidation(data, rules);
      
      res.json({
        valid: validation.valid,
        errors: validation.errors,
        sanitized: validation.sanitized
      });
    } catch (error) {
      console.error('Validate input error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async sanitizeData(req, res) {
    try {
      const { data } = req.body;
      
      const sanitized = this.deepSanitize(data);
      
      res.json({ sanitized });
    } catch (error) {
      console.error('Sanitize data error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getSecurityReport(req, res) {
    try {
      const { period = '7d' } = req.query;
      
      const report = this.generateSecurityReport(period);
      
      res.json(report);
    } catch (error) {
      console.error('Get security report error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async exportSecurityData(req, res) {
    try {
      const { format = 'json', type = 'all' } = req.query;
      
      let data = {};
      
      if (type === 'all' || type === 'audit') {
        data.auditLogs = this.auditLogs;
      }
      
      if (type === 'all' || type === 'security') {
        data.securityEvents = this.securityEvents;
      }
      
      if (format === 'csv') {
        const csv = this.convertToCSV(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=security-data.csv');
        res.send(csv);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=security-data.json');
        res.json(data);
      }
    } catch (error) {
      console.error('Export security data error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Helper methods
  performValidation(data, rules) {
    const errors = [];
    const sanitized = this.deepSanitize(data);
    
    // Basic validation rules
    if (rules.required && !data) {
      errors.push('Field is required');
    }
    
    if (rules.email && data && !validator.isEmail(data)) {
      errors.push('Invalid email format');
    }
    
    if (rules.url && data && !validator.isURL(data)) {
      errors.push('Invalid URL format');
    }
    
    if (rules.minLength && data && data.length < rules.minLength) {
      errors.push(`Minimum length is ${rules.minLength}`);
    }
    
    if (rules.maxLength && data && data.length > rules.maxLength) {
      errors.push(`Maximum length is ${rules.maxLength}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      sanitized
    };
  }

  getTopThreats(events) {
    const threatCounts = {};
    
    events.forEach(event => {
      const key = event.subType || event.type;
      threatCounts[key] = (threatCounts[key] || 0) + 1;
    });
    
    return Object.entries(threatCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([threat, count]) => ({ threat, count }));
  }

  getSuspiciousIPs() {
    const ipCounts = {};
    
    this.securityEvents.forEach(event => {
      if (event.ip) {
        ipCounts[event.ip] = (ipCounts[event.ip] || 0) + 1;
      }
    });
    
    return Object.entries(ipCounts)
      .filter(([,count]) => count > 5)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([ip, count]) => ({ 
        ip, 
        count, 
        blocked: this.blockedIPs.has(ip) 
      }));
  }

  getSecurityRecommendations(events) {
    const recommendations = [];
    
    const highSeverityCount = events.filter(e => e.severity === 'high').length;
    if (highSeverityCount > 10) {
      recommendations.push({
        type: 'high_severity_events',
        message: `${highSeverityCount} high severity events detected in the last 24h. Consider reviewing security policies.`,
        priority: 'high'
      });
    }
    
    const rateLimitEvents = events.filter(e => e.subType === 'rate_limit_exceeded').length;
    if (rateLimitEvents > 50) {
      recommendations.push({
        type: 'rate_limiting',
        message: 'High number of rate limit violations. Consider adjusting rate limits or implementing CAPTCHA.',
        priority: 'medium'
      });
    }
    
    if (this.blockedIPs.size > 100) {
      recommendations.push({
        type: 'blocked_ips',
        message: 'Large number of blocked IPs. Consider implementing geographic restrictions.',
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  generateSecurityReport(period) {
    const now = Date.now();
    let startTime;
    
    switch (period) {
      case '24h':
        startTime = now - (24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = now - (30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = now - (7 * 24 * 60 * 60 * 1000);
    }
    
    const periodEvents = this.securityEvents.filter(event => 
      new Date(event.timestamp).getTime() > startTime
    );
    
    const periodAuditLogs = this.auditLogs.filter(log => 
      new Date(log.timestamp).getTime() > startTime
    );
    
    return {
      period,
      generatedAt: new Date().toISOString(),
      summary: {
        totalSecurityEvents: periodEvents.length,
        totalAuditLogs: periodAuditLogs.length,
        blockedIPs: this.blockedIPs.size,
        suspiciousActivities: this.suspiciousActivities.size
      },
      eventsByType: this.groupEventsByType(periodEvents),
      eventsBySeverity: this.groupEventsBySeverity(periodEvents),
      topThreats: this.getTopThreats(periodEvents),
      suspiciousIPs: this.getSuspiciousIPs(),
      recommendations: this.getSecurityRecommendations(periodEvents)
    };
  }

  groupEventsByType(events) {
    const grouped = {};
    events.forEach(event => {
      const type = event.subType || event.type;
      grouped[type] = (grouped[type] || 0) + 1;
    });
    return grouped;
  }

  groupEventsBySeverity(events) {
    const grouped = { high: 0, medium: 0, low: 0 };
    events.forEach(event => {
      grouped[event.severity] = (grouped[event.severity] || 0) + 1;
    });
    return grouped;
  }

  convertToCSV(data) {
    // Simple CSV conversion - in production, use a proper CSV library
    let csv = '';
    
    if (data.auditLogs) {
      csv += 'Audit Logs\n';
      csv += 'ID,Type,Timestamp,IP,User ID,Action,Resource\n';
      data.auditLogs.forEach(log => {
        csv += `${log.id},${log.type},${log.timestamp},${log.ip || ''},${log.userId || ''},${log.action || ''},${log.resource || ''}\n`;
      });
      csv += '\n';
    }
    
    if (data.securityEvents) {
      csv += 'Security Events\n';
      csv += 'ID,Type,Subtype,Timestamp,IP,Severity,Details\n';
      data.securityEvents.forEach(event => {
        csv += `${event.id},${event.type},${event.subType || ''},${event.timestamp},${event.ip || ''},${event.severity},${JSON.stringify(event.details || {})}\n`;
      });
    }
    
    return csv;
  }

  cleanupOldLogs() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.auditLogRetention);
    
    this.auditLogs = this.auditLogs.filter(log => 
      new Date(log.timestamp) > cutoffDate
    );
  }

  cleanupOldEvents() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.auditLogRetention);
    
    this.securityEvents = this.securityEvents.filter(event => 
      new Date(event.timestamp) > cutoffDate
    );
  }

  async persistAuditLog(auditEvent) {
    // In production, save to database
    // await this.database.auditLogs.create(auditEvent);
  }

  async persistSecurityEvent(securityEvent) {
    // In production, save to database
    // await this.database.securityEvents.create(securityEvent);
  }

  sendSecurityAlert(event) {
    // In production, send alerts via email, Slack, etc.
    console.warn('🚨 SECURITY ALERT:', event);
  }

  startSecurityMonitoring() {
    // Cleanup old data every hour
    setInterval(() => {
      this.cleanupOldLogs();
      this.cleanupOldEvents();
    }, 60 * 60 * 1000);
    
    // Clear suspicious activities every 24 hours
    setInterval(() => {
      this.suspiciousActivities.clear();
    }, 24 * 60 * 60 * 1000);
  }

  generateId() {
    return crypto.randomBytes(16).toString('hex');
  }

  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`🔒 Security Service running on port ${this.port}`);
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🔒 Security Service stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export default SecurityService;
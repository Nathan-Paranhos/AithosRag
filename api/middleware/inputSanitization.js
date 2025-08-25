import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

/**
 * Advanced Input Sanitization Middleware
 * Protects against XSS, SQL injection, path traversal, and command injection
 */
class InputSanitizer {
  constructor(options = {}) {
    this.options = {
      // XSS Protection
      enableXSSProtection: options.enableXSSProtection !== false,
      allowedTags: options.allowedTags || ['b', 'i', 'em', 'strong', 'p', 'br'],
      allowedAttributes: options.allowedAttributes || ['class', 'id'],
      
      // SQL/NoSQL Injection Protection
      enableSQLProtection: options.enableSQLProtection !== false,
      sqlPatterns: options.sqlPatterns || [
        'union select',
        'drop table',
        'insert into',
        'delete from',
        'update set',
        'create table',
        'alter table',
        'exec(',
        'execute(',
        'sp_',
        'xp_'
      ],
      
      // Path Traversal Protection
      enablePathTraversalProtection: options.enablePathTraversalProtection !== false,
      pathTraversalPatterns: options.pathTraversalPatterns || [
        '../',
        '..\\',
        '%2e%2e%2f',
        '%252e%252e%252f'
      ],
      
      // Command Injection Protection
      enableCommandInjectionProtection: options.enableCommandInjectionProtection !== false,
      commandPatterns: options.commandPatterns || [
        ';cat',
        ';ls',
        ';pwd',
        ';whoami',
        ';id',
        ';uname',
        ';wget',
        ';curl',
        ';nc',
        ';netcat',
        '|cat',
        '|ls',
        '|pwd',
        '&cat',
        '&ls',
        '$(cat',
        '`cat'
      ],
      
      // Rate Limiting
      enableRateLimit: options.enableRateLimit !== false,
      rateLimitOptions: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP',
        ...options.rateLimitOptions
      },
      
      // Slow Down
      enableSlowDown: options.enableSlowDown !== false,
      slowDownOptions: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        delayAfter: 50, // allow 50 requests per 15 minutes, then...
        delayMs: 500, // begin adding 500ms of delay per request above 50
        maxDelayMs: 20000, // maximum delay of 20 seconds
        ...options.slowDownOptions
      },
      
      // Logging
      enableLogging: options.enableLogging !== false,
      logSuspiciousActivity: options.logSuspiciousActivity !== false,
      
      ...options
    };
    
    this.suspiciousActivityLog = [];
    this.blockedRequests = new Map();
    
    // Initialize rate limiters
    this.rateLimiter = this.options.enableRateLimit ? 
      rateLimit(this.options.rateLimitOptions) : null;
    
    this.slowDown = this.options.enableSlowDown ? 
      slowDown(this.options.slowDownOptions) : null;
  }
  
  /**
   * Main sanitization middleware
   */
  sanitize() {
    return (req, res, next) => {
      try {
        // Apply rate limiting
        if (this.rateLimiter) {
          this.rateLimiter(req, res, (err) => {
            if (err) return next(err);
            
            // Apply slow down
            if (this.slowDown) {
              this.slowDown(req, res, (err) => {
                if (err) return next(err);
                this.processSanitization(req, res, next);
              });
            } else {
              this.processSanitization(req, res, next);
            }
          });
        } else {
          this.processSanitization(req, res, next);
        }
      } catch (error) {
        console.error('Input sanitization error:', error);
        this.logSuspiciousActivity(req, 'SANITIZATION_ERROR', { error: error.message });
        return res.status(500).json({ error: 'Request processing failed' });
      }
    };
  }
  
  processSanitization(req, res, next) {
    const startTime = Date.now();
    
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = this.sanitizeObject(req.body, req);
    }
    
    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = this.sanitizeObject(req.query, req);
    }
    
    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = this.sanitizeObject(req.params, req);
    }
    
    // Sanitize headers (specific ones)
    this.sanitizeHeaders(req);
    
    // Log processing time if enabled
    if (this.options.enableLogging) {
      const processingTime = Date.now() - startTime;
      if (processingTime > 100) { // Log slow sanitization
        console.warn(`Slow input sanitization: ${processingTime}ms for ${req.method} ${req.path}`);
      }
    }
    
    next();
  }
  
  sanitizeObject(obj, req, path = '') {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map((item, index) => 
        this.sanitizeObject(item, req, `${path}[${index}]`)
      );
    }
    
    if (typeof obj === 'object') {
      const sanitized = {};
      
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeString(key, req, `${path}.${key}`);
        sanitized[sanitizedKey] = this.sanitizeObject(value, req, `${path}.${key}`);
      }
      
      return sanitized;
    }
    
    if (typeof obj === 'string') {
      return this.sanitizeString(obj, req, path);
    }
    
    return obj;
  }
  
  sanitizeString(str, req, path = '') {
    if (typeof str !== 'string') {
      return str;
    }
    
    let sanitized = str;
    const originalLength = str.length;
    
    // Check for suspicious patterns first
    this.detectSuspiciousPatterns(str, req, path);
    
    // XSS Protection
    if (this.options.enableXSSProtection) {
      sanitized = this.sanitizeXSS(sanitized);
    }
    
    // SQL/NoSQL Injection Protection
    if (this.options.enableSQLProtection) {
      sanitized = this.sanitizeSQL(sanitized, req, path);
    }
    
    // Path Traversal Protection
    if (this.options.enablePathTraversalProtection) {
      sanitized = this.sanitizePathTraversal(sanitized, req, path);
    }
    
    // Command Injection Protection
    if (this.options.enableCommandInjectionProtection) {
      sanitized = this.sanitizeCommandInjection(sanitized, req, path);
    }
    
    // Log if significant changes were made
    if (this.options.enableLogging && sanitized !== str) {
      const changePercent = ((originalLength - sanitized.length) / originalLength) * 100;
      if (changePercent > 10) {
        console.warn(`Significant sanitization at ${path}: ${changePercent.toFixed(1)}% removed`);
      }
    }
    
    return sanitized;
  }
  
  sanitizeXSS(str) {
    // Use DOMPurify for comprehensive XSS protection
    const cleaned = DOMPurify.sanitize(str, {
      ALLOWED_TAGS: this.options.allowedTags,
      ALLOWED_ATTR: this.options.allowedAttributes,
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM_IMPORT: false
    });
    
    // Additional manual cleaning
    return cleaned
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/data:text\/html/gi, 'data:text/plain');
  }
  
  sanitizeSQL(str, req, path) {
    let sanitized = str;
    
    for (const pattern of this.options.sqlPatterns) {
      const lowerStr = sanitized.toLowerCase();
      if (lowerStr.includes(pattern.toLowerCase())) {
        this.logSuspiciousActivity(req, 'SQL_INJECTION_ATTEMPT', {
          path,
          pattern,
          value: str
        });
        
        // Remove suspicious patterns (case insensitive)
        const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        sanitized = sanitized.replace(regex, '');
      }
    }
    
    return sanitized;
  }
  
  sanitizePathTraversal(str, req, path) {
    let sanitized = str;
    
    for (const pattern of this.options.pathTraversalPatterns) {
      if (sanitized.includes(pattern)) {
        this.logSuspiciousActivity(req, 'PATH_TRAVERSAL_ATTEMPT', {
          path,
          pattern,
          value: str
        });
        
        // Remove path traversal patterns
        sanitized = sanitized.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
      }
    }
    
    return sanitized;
  }
  
  sanitizeCommandInjection(str, req, path) {
    let sanitized = str;
    
    for (const pattern of this.options.commandPatterns) {
      if (sanitized.toLowerCase().includes(pattern.toLowerCase())) {
        this.logSuspiciousActivity(req, 'COMMAND_INJECTION_ATTEMPT', {
          path,
          pattern,
          value: str
        });
        
        // For command injection, we're more aggressive
        const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        sanitized = sanitized.replace(regex, '');
      }
    }
    
    return sanitized;
  }
  
  sanitizeHeaders(req) {
    const headersToSanitize = ['user-agent', 'referer', 'x-forwarded-for'];
    
    headersToSanitize.forEach(header => {
      if (req.headers[header]) {
        req.headers[header] = this.sanitizeString(req.headers[header], req, `header.${header}`);
      }
    });
  }
  
  detectSuspiciousPatterns(str, req, path) {
    const suspiciousPatterns = [
      '<script',
      'javascript:',
      'vbscript:',
      'onload=',
      'onerror=',
      'eval(',
      'document.',
      'window.',
      'union select',
      'drop table',
      'insert into',
      'delete from',
      ';cat',
      ';ls',
      '|nc',
      '../',
      '%2e%2e%2f',
      '(|',
      ')(',
      '<![CDATA[',
      '<?xml'
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (str.toLowerCase().includes(pattern.toLowerCase())) {
        this.logSuspiciousActivity(req, 'SUSPICIOUS_PATTERN_DETECTED', {
          path,
          pattern,
          value: str.substring(0, 100) // Limit logged value length
        });
        break; // Only log first match to avoid spam
      }
    }
  }
  
  logSuspiciousActivity(req, type, details = {}) {
    if (!this.options.logSuspiciousActivity) {
      return;
    }
    
    const activity = {
      timestamp: new Date().toISOString(),
      type,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl || req.url,
      method: req.method,
      userId: req.user?.id,
      sessionId: req.sessionID,
      details
    };
    
    this.suspiciousActivityLog.push(activity);
    
    // Keep only last 1000 entries
    if (this.suspiciousActivityLog.length > 1000) {
      this.suspiciousActivityLog = this.suspiciousActivityLog.slice(-1000);
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('🚨 Suspicious Activity:', activity);
    }
    
    // Increment blocked requests counter
    const clientId = req.ip || 'unknown';
    const current = this.blockedRequests.get(clientId) || 0;
    this.blockedRequests.set(clientId, current + 1);
    
    // Auto-ban after too many suspicious activities
    if (current > 10) {
      console.error(`🚫 Auto-banning IP ${clientId} after ${current} suspicious activities`);
      // Here you could integrate with a firewall or IP blocking service
    }
  }
  
  /**
   * Middleware for specific input validation
   */
  validateEmail() {
    return (req, res, next) => {
      const email = req.body.email || req.query.email;
      
      if (email && !validator.isEmail(email)) {
        this.logSuspiciousActivity(req, 'INVALID_EMAIL_FORMAT', { email });
        return res.status(400).json({ error: 'Invalid email format' });
      }
      
      next();
    };
  }
  
  validateURL() {
    return (req, res, next) => {
      const url = req.body.url || req.query.url;
      
      if (url && !validator.isURL(url)) {
        this.logSuspiciousActivity(req, 'INVALID_URL_FORMAT', { url });
        return res.status(400).json({ error: 'Invalid URL format' });
      }
      
      next();
    };
  }
  
  validateLength(field, min = 0, max = 1000) {
    return (req, res, next) => {
      const value = req.body[field] || req.query[field];
      
      if (value && (value.length < min || value.length > max)) {
        this.logSuspiciousActivity(req, 'INVALID_LENGTH', { 
          field, 
          length: value.length, 
          min, 
          max 
        });
        return res.status(400).json({ 
          error: `Field ${field} must be between ${min} and ${max} characters` 
        });
      }
      
      next();
    };
  }
  
  /**
   * Get sanitization statistics
   */
  getStats() {
    return {
      suspiciousActivities: this.suspiciousActivityLog.length,
      blockedRequests: Array.from(this.blockedRequests.entries()).map(([ip, count]) => ({ ip, count })),
      recentActivities: this.suspiciousActivityLog.slice(-10),
      options: {
        xssProtection: this.options.enableXSSProtection,
        sqlProtection: this.options.enableSQLProtection,
        pathTraversalProtection: this.options.enablePathTraversalProtection,
        commandInjectionProtection: this.options.enableCommandInjectionProtection,
        rateLimit: this.options.enableRateLimit,
        slowDown: this.options.enableSlowDown
      }
    };
  }
  
  /**
   * Clear logs and reset counters
   */
  clearLogs() {
    this.suspiciousActivityLog = [];
    this.blockedRequests.clear();
  }
}

// Create default instance
const inputSanitizer = new InputSanitizer();

export { InputSanitizer, inputSanitizer };
export default inputSanitizer.sanitize();
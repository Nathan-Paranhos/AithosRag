import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';
import crypto from 'crypto';

/**
 * Advanced Security Middleware
 * Provides enterprise-level security features
 */
export class SecurityMiddleware {
  constructor(securityService, options = {}) {
    this.securityService = securityService;
    this.config = {
      enableCSRF: true,
      enableXSS: true,
      enableSQLInjection: true,
      enableRateLimit: true,
      enableSlowDown: true,
      maxRequestSize: '10mb',
      trustedProxies: ['127.0.0.1', '::1'],
      ...options
    };
    
    // CSRF token store (in production, use Redis)
    this.csrfTokens = new Map();
    
    // Rate limiting stores
    this.userRateLimits = new Map();
    this.ipRateLimits = new Map();
    
    this.setupRateLimiters();
  }

  setupRateLimiters() {
    // Global rate limiter
    this.globalRateLimit = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        code: 'GLOBAL_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      onLimitReached: (req) => {
        this.securityService?.logSecurityEvent({
          type: 'rate_limit_exceeded',
          subType: 'global',
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'medium'
        });
      }
    });

    // API rate limiter (stricter)
    this.apiRateLimit = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 API requests per windowMs
      message: {
        error: 'Too many API requests from this IP, please try again later.',
        code: 'API_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      onLimitReached: (req) => {
        this.securityService?.logSecurityEvent({
          type: 'rate_limit_exceeded',
          subType: 'api',
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'high'
        });
      }
    });

    // Authentication rate limiter (very strict)
    this.authRateLimit = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // limit each IP to 5 auth attempts per windowMs
      message: {
        error: 'Too many authentication attempts from this IP, please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true,
      onLimitReached: (req) => {
        this.securityService?.logSecurityEvent({
          type: 'rate_limit_exceeded',
          subType: 'auth',
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'high'
        });
      }
    });

    // Slow down middleware for suspicious activity
    this.slowDownMiddleware = slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 50, // allow 50 requests per windowMs without delay
      delayMs: 500, // add 500ms delay per request after delayAfter
      maxDelayMs: 20000, // max delay of 20 seconds
      onLimitReached: (req) => {
        this.securityService?.logSecurityEvent({
          type: 'slow_down_triggered',
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'medium'
        });
      }
    });
  }

  // Main security middleware
  securityCheck() {
    return async (req, res, next) => {
      try {
        // Check if IP is blocked
        if (this.securityService?.blockedIPs?.has(req.ip)) {
          return res.status(403).json({
            error: 'Access denied due to suspicious activity',
            code: 'IP_BLOCKED'
          });
        }

        // Validate request headers
        const headerValidation = this.validateHeaders(req);
        if (!headerValidation.valid) {
          this.securityService?.logSecurityEvent({
            type: 'invalid_headers',
            ip: req.ip,
            errors: headerValidation.errors,
            severity: 'medium'
          });
          
          return res.status(400).json({
            error: 'Invalid request headers',
            code: 'INVALID_HEADERS'
          });
        }

        // Check for malicious patterns in URL
        const urlValidation = this.validateURL(req.originalUrl);
        if (!urlValidation.valid) {
          this.securityService?.logSecurityEvent({
            type: 'malicious_url',
            ip: req.ip,
            url: req.originalUrl,
            patterns: urlValidation.patterns,
            severity: 'high'
          });
          
          return res.status(400).json({
            error: 'Malicious URL pattern detected',
            code: 'MALICIOUS_URL'
          });
        }

        // Advanced XSS protection
        if (this.config.enableXSS) {
          const xssCheck = this.checkXSS(req);
          if (!xssCheck.safe) {
            this.securityService?.logSecurityEvent({
              type: 'xss_attempt',
              ip: req.ip,
              patterns: xssCheck.patterns,
              severity: 'high'
            });
            
            return res.status(400).json({
              error: 'XSS attempt detected',
              code: 'XSS_DETECTED'
            });
          }
        }

        // SQL Injection protection
        if (this.config.enableSQLInjection) {
          const sqlCheck = this.checkSQLInjection(req);
          if (!sqlCheck.safe) {
            this.securityService?.logSecurityEvent({
              type: 'sql_injection_attempt',
              ip: req.ip,
              patterns: sqlCheck.patterns,
              severity: 'high'
            });
            
            return res.status(400).json({
              error: 'SQL injection attempt detected',
              code: 'SQL_INJECTION_DETECTED'
            });
          }
        }

        // File upload security
        if (req.files || (req.body && req.body.file)) {
          const fileCheck = this.validateFileUpload(req);
          if (!fileCheck.valid) {
            this.securityService?.logSecurityEvent({
              type: 'malicious_file_upload',
              ip: req.ip,
              errors: fileCheck.errors,
              severity: 'high'
            });
            
            return res.status(400).json({
              error: 'Malicious file upload detected',
              code: 'MALICIOUS_FILE'
            });
          }
        }

        next();
      } catch (error) {
        console.error('Security middleware error:', error);
        this.securityService?.logSecurityEvent({
          type: 'security_middleware_error',
          ip: req.ip,
          error: error.message,
          severity: 'high'
        });
        
        res.status(500).json({
          error: 'Security check failed',
          code: 'SECURITY_ERROR'
        });
      }
    };
  }

  // CSRF Protection
  csrfProtection() {
    return (req, res, next) => {
      if (!this.config.enableCSRF) {
        return next();
      }

      // Skip CSRF for GET, HEAD, OPTIONS
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      const token = req.headers['x-csrf-token'] || req.body._csrf;
      const sessionId = req.sessionID || req.headers['x-session-id'];

      if (!token || !sessionId) {
        this.securityService?.logSecurityEvent({
          type: 'csrf_token_missing',
          ip: req.ip,
          severity: 'medium'
        });
        
        return res.status(403).json({
          error: 'CSRF token required',
          code: 'CSRF_TOKEN_REQUIRED'
        });
      }

      const validToken = this.csrfTokens.get(sessionId);
      if (!validToken || !this.verifyCSRFToken(token, validToken)) {
        this.securityService?.logSecurityEvent({
          type: 'csrf_token_invalid',
          ip: req.ip,
          severity: 'high'
        });
        
        return res.status(403).json({
          error: 'Invalid CSRF token',
          code: 'CSRF_TOKEN_INVALID'
        });
      }

      next();
    };
  }

  // Generate CSRF token
  generateCSRFToken(sessionId) {
    const token = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();
    
    this.csrfTokens.set(sessionId, {
      token,
      timestamp,
      used: false
    });
    
    // Clean up old tokens
    setTimeout(() => {
      this.csrfTokens.delete(sessionId);
    }, 60 * 60 * 1000); // 1 hour
    
    return token;
  }

  // Verify CSRF token
  verifyCSRFToken(providedToken, storedTokenData) {
    if (!storedTokenData || storedTokenData.used) {
      return false;
    }
    
    // Check if token is expired (1 hour)
    if (Date.now() - storedTokenData.timestamp > 60 * 60 * 1000) {
      return false;
    }
    
    // Mark token as used (one-time use)
    storedTokenData.used = true;
    
    return crypto.timingSafeEqual(
      Buffer.from(providedToken, 'hex'),
      Buffer.from(storedTokenData.token, 'hex')
    );
  }

  // User-specific rate limiting
  userRateLimit(maxRequests = 1000, windowMs = 15 * 60 * 1000) {
    return (req, res, next) => {
      const userId = req.user?.id;
      if (!userId) {
        return next();
      }

      const now = Date.now();
      const userLimit = this.userRateLimits.get(userId) || {
        requests: [],
        blocked: false,
        blockExpiry: 0
      };

      // Check if user is currently blocked
      if (userLimit.blocked && now < userLimit.blockExpiry) {
        return res.status(429).json({
          error: 'User rate limit exceeded',
          code: 'USER_RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((userLimit.blockExpiry - now) / 1000)
        });
      }

      // Clean old requests
      userLimit.requests = userLimit.requests.filter(time => now - time < windowMs);
      
      // Check rate limit
      if (userLimit.requests.length >= maxRequests) {
        userLimit.blocked = true;
        userLimit.blockExpiry = now + windowMs;
        
        this.securityService?.logSecurityEvent({
          type: 'user_rate_limit_exceeded',
          userId,
          ip: req.ip,
          severity: 'medium'
        });
        
        return res.status(429).json({
          error: 'User rate limit exceeded',
          code: 'USER_RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      // Add current request
      userLimit.requests.push(now);
      userLimit.blocked = false;
      this.userRateLimits.set(userId, userLimit);

      next();
    };
  }

  // Validate request headers
  validateHeaders(req) {
    const errors = [];
    const headers = req.headers;

    // Check Content-Length for potential attacks
    if (headers['content-length']) {
      const contentLength = parseInt(headers['content-length']);
      if (contentLength > 50 * 1024 * 1024) { // 50MB
        errors.push('Content-Length too large');
      }
    }

    // Validate User-Agent
    if (headers['user-agent']) {
      const userAgent = headers['user-agent'];
      
      // Check for suspicious user agents
      const suspiciousPatterns = [
        /sqlmap/i,
        /nikto/i,
        /nmap/i,
        /burp/i,
        /scanner/i,
        /bot.*bot/i,
        /crawler.*crawler/i
      ];
      
      if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
        errors.push('Suspicious User-Agent detected');
      }
    }

    // Check for header injection
    Object.entries(headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        if (value.includes('\r') || value.includes('\n')) {
          errors.push(`Header injection detected in ${key}`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate URL for malicious patterns
  validateURL(url) {
    const maliciousPatterns = [
      /\.\.\//g, // Directory traversal
      /\.\.\\\\/, // Windows directory traversal
      /%2e%2e%2f/gi, // URL encoded directory traversal
      /%2e%2e%5c/gi, // URL encoded Windows directory traversal
      /\/etc\/passwd/i, // Unix password file
      /\/proc\/self\/environ/i, // Process environment
      /\/windows\/system32/i, // Windows system directory
      /\bexec\b/i, // Command execution
      /\beval\b/i, // Code evaluation
      /\bsystem\b/i, // System commands
      /\bshell_exec\b/i, // Shell execution
      /\bpassthru\b/i, // Command passthrough
      /\bfile_get_contents\b/i, // File reading
      /\bfopen\b/i, // File opening
      /\bfwrite\b/i, // File writing
      /\bunlink\b/i, // File deletion
      /\bmkdir\b/i, // Directory creation
      /\brmdir\b/i // Directory removal
    ];

    const detectedPatterns = [];
    
    maliciousPatterns.forEach(pattern => {
      if (pattern.test(url)) {
        detectedPatterns.push(pattern.toString());
      }
    });

    return {
      valid: detectedPatterns.length === 0,
      patterns: detectedPatterns
    };
  }

  // Check for XSS attempts
  checkXSS(req) {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>/gi,
      /<link[^>]*>/gi,
      /<meta[^>]*>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /data:text\/html/gi,
      /on\w+\s*=/gi, // Event handlers
      /expression\s*\(/gi, // CSS expressions
      /url\s*\(/gi, // CSS url()
      /@import/gi, // CSS imports
      /\\x[0-9a-f]{2}/gi, // Hex encoding
      /\\u[0-9a-f]{4}/gi, // Unicode encoding
      /&#x?[0-9a-f]+;/gi // HTML entities
    ];

    const detectedPatterns = [];
    const checkData = [
      JSON.stringify(req.body || {}),
      JSON.stringify(req.query || {}),
      JSON.stringify(req.params || {}),
      req.originalUrl
    ].join(' ');

    xssPatterns.forEach(pattern => {
      if (pattern.test(checkData)) {
        detectedPatterns.push(pattern.toString());
      }
    });

    return {
      safe: detectedPatterns.length === 0,
      patterns: detectedPatterns
    };
  }

  // Check for SQL injection attempts
  checkSQLInjection(req) {
    const sqlPatterns = [
      /('|(\-\-)|(;)|(\||\|)|(\*|\*))/i,
      /\w*(union|select|insert|delete|update|drop|create|alter|exec|execute)\w*/gi,
      /\w*(or|and)\s+\w*\s*[=<>]/gi,
      /\w*(or|and)\s+['"]?\w*['"]?\s*[=<>]/gi,
      /\w*(or|and)\s+\d+\s*[=<>]/gi,
      /1\s*=\s*1/gi,
      /1\s*=\s*0/gi,
      /'\s*(or|and)\s*'/gi,
      /"\s*(or|and)\s*"/gi,
      /\bxp_cmdshell\b/gi,
      /\bsp_executesql\b/gi,
      /\bsp_sqlexec\b/gi,
      /\bopenrowset\b/gi,
      /\bopendatasource\b/gi,
      /\bload_file\b/gi,
      /\binto\s+outfile\b/gi,
      /\binto\s+dumpfile\b/gi
    ];

    const detectedPatterns = [];
    const checkData = [
      JSON.stringify(req.body || {}),
      JSON.stringify(req.query || {}),
      JSON.stringify(req.params || {})
    ].join(' ');

    sqlPatterns.forEach(pattern => {
      if (pattern.test(checkData)) {
        detectedPatterns.push(pattern.toString());
      }
    });

    return {
      safe: detectedPatterns.length === 0,
      patterns: detectedPatterns
    };
  }

  // Validate file uploads
  validateFileUpload(req) {
    const errors = [];
    const files = req.files || [];
    
    // Dangerous file extensions
    const dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
      '.jar', '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl',
      '.sh', '.bash', '.ps1', '.msi', '.deb', '.rpm', '.dmg'
    ];
    
    // Dangerous MIME types
    const dangerousMimeTypes = [
      'application/x-executable',
      'application/x-msdownload',
      'application/x-msdos-program',
      'application/x-msi',
      'application/x-bat',
      'application/x-sh',
      'application/javascript',
      'text/javascript',
      'application/x-php',
      'text/x-php'
    ];

    files.forEach((file, index) => {
      // Check file extension
      const extension = file.originalname ? 
        file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.')) : '';
      
      if (dangerousExtensions.includes(extension)) {
        errors.push(`Dangerous file extension detected: ${extension}`);
      }
      
      // Check MIME type
      if (dangerousMimeTypes.includes(file.mimetype)) {
        errors.push(`Dangerous MIME type detected: ${file.mimetype}`);
      }
      
      // Check file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        errors.push(`File too large: ${file.size} bytes`);
      }
      
      // Check for embedded executables in file content
      if (file.buffer) {
        const content = file.buffer.toString('hex', 0, Math.min(file.buffer.length, 1024));
        
        // Check for PE header (Windows executable)
        if (content.includes('4d5a') && content.includes('504500')) {
          errors.push('Windows executable detected in file content');
        }
        
        // Check for ELF header (Linux executable)
        if (content.startsWith('7f454c46')) {
          errors.push('Linux executable detected in file content');
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Get rate limiter based on endpoint
  getRateLimit(endpoint) {
    if (endpoint.includes('/auth/') || endpoint.includes('/login') || endpoint.includes('/register')) {
      return this.authRateLimit;
    } else if (endpoint.startsWith('/api/')) {
      return this.apiRateLimit;
    } else {
      return this.globalRateLimit;
    }
  }

  // Cleanup expired data
  cleanup() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    // Cleanup CSRF tokens
    for (const [sessionId, tokenData] of this.csrfTokens.entries()) {
      if (now - tokenData.timestamp > oneHour) {
        this.csrfTokens.delete(sessionId);
      }
    }
    
    // Cleanup user rate limits
    for (const [userId, limitData] of this.userRateLimits.entries()) {
      if (limitData.blocked && now > limitData.blockExpiry) {
        limitData.blocked = false;
        limitData.requests = [];
      }
    }
  }

  // Start cleanup interval
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // Every 5 minutes
  }
}

export default SecurityMiddleware;
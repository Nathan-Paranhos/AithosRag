import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';

/**
 * Advanced User-Based Rate Limiting System
 * Provides different rate limits based on user roles, subscription tiers, and action types
 */
class UserRateLimit {
  constructor(options = {}) {
    this.options = {
      // Redis configuration (optional - falls back to memory store)
      redis: options.redis || null,
      
      // JWT configuration
      jwtSecret: options.jwtSecret || 'your-super-secret-jwt-key',
      
      // Default rate limits (requests per window)
      defaultLimits: {
        anonymous: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 50, // 50 requests per 15 minutes
          message: 'Too many requests from this IP. Please try again later.'
        },
        user: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 200, // 200 requests per 15 minutes
          message: 'Rate limit exceeded. Please try again later.'
        },
        premium: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 500, // 500 requests per 15 minutes
          message: 'Rate limit exceeded. Please try again later.'
        },
        admin: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 1000, // 1000 requests per 15 minutes
          message: 'Rate limit exceeded. Please try again later.'
        }
      },
      
      // Action-specific limits
      actionLimits: {
        // Authentication actions
        login: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 5, // 5 login attempts per 15 minutes
          skipSuccessfulRequests: true,
          message: 'Too many login attempts. Please try again later.'
        },
        register: {
          windowMs: 60 * 60 * 1000, // 1 hour
          max: 3, // 3 registration attempts per hour
          message: 'Too many registration attempts. Please try again later.'
        },
        
        // Password reset
        'password-reset': {
          windowMs: 60 * 60 * 1000, // 1 hour
          max: 3, // 3 password reset requests per hour
          message: 'Too many password reset requests. Please try again later.'
        },
        
        // File operations
        upload: {
          windowMs: 60 * 60 * 1000, // 1 hour
          max: {
            anonymous: 5,
            user: 20,
            premium: 100,
            admin: 1000
          },
          message: 'Upload limit exceeded. Please try again later.'
        },
        
        // AI/Chat operations
        chat: {
          windowMs: 60 * 60 * 1000, // 1 hour
          max: {
            anonymous: 10,
            user: 100,
            premium: 500,
            admin: 1000
          },
          message: 'Chat limit exceeded. Please upgrade your plan for more messages.'
        },
        
        // Search operations
        search: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: {
            anonymous: 20,
            user: 100,
            premium: 500,
            admin: 1000
          },
          message: 'Search limit exceeded. Please try again later.'
        },
        
        // Export operations
        export: {
          windowMs: 24 * 60 * 60 * 1000, // 24 hours
          max: {
            anonymous: 1,
            user: 5,
            premium: 20,
            admin: 100
          },
          message: 'Export limit exceeded. Please upgrade your plan for more exports.'
        }
      },
      
      // Custom limits by user ID
      customLimits: new Map(),
      
      // Whitelist/Blacklist
      whitelist: new Set(),
      blacklist: new Set(),
      
      // Logging
      enableLogging: options.enableLogging !== false,
      
      ...options
    };
    
    // Initialize Redis if provided
    this.redis = null;
    if (this.options.redis) {
      this.redis = new Redis(this.options.redis);
    }
    
    // Rate limit stores
    this.stores = new Map();
    this.rateLimiters = new Map();
    
    // Statistics
    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      byUser: new Map(),
      byAction: new Map()
    };
    
    this.initializeRateLimiters();
  }
  
  initializeRateLimiters() {
    // Create rate limiters for each action type
    Object.entries(this.options.actionLimits).forEach(([action, config]) => {
      this.rateLimiters.set(action, this.createRateLimiter(action, config));
    });
    
    // Create default rate limiters for user types
    Object.entries(this.options.defaultLimits).forEach(([userType, config]) => {
      this.rateLimiters.set(`default-${userType}`, this.createRateLimiter(`default-${userType}`, config));
    });
  }
  
  createRateLimiter(name, config) {
    const store = this.redis ? new RedisStore({
      sendCommand: (...args) => this.redis.call(...args),
      prefix: `rate-limit:${name}:`
    }) : undefined;
    
    return rateLimit({
      store,
      windowMs: config.windowMs,
      max: typeof config.max === 'object' ? config.max.user : config.max,
      message: config.message,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => this.generateKey(req, name),
      skip: (req) => this.shouldSkip(req, name),
      handler: (req, res, next, options) => {
        this.onLimitReached(req, res, options, name);
        res.status(options.statusCode).json({
          error: options.message || 'Too many requests, please try again later.',
          retryAfter: Math.round(options.windowMs / 1000)
        });
      },
      ...config
    });
  }
  
  generateKey(req, action) {
    // Check if user is whitelisted
    if (this.isWhitelisted(req)) {
      return `whitelist:${req.ip}`;
    }
    
    // Use user ID if authenticated, otherwise IP
    const userId = req.user?.id;
    const identifier = userId || req.ip;
    
    return `${action}:${identifier}`;
  }
  
  shouldSkip(req, action) {
    // Skip if whitelisted
    if (this.isWhitelisted(req)) {
      return true;
    }
    
    // Block if blacklisted
    if (this.isBlacklisted(req)) {
      return false;
    }
    
    // Check custom limits
    const userId = req.user?.id;
    if (userId && this.options.customLimits.has(userId)) {
      const customLimit = this.options.customLimits.get(userId);
      if (customLimit.unlimited) {
        return true;
      }
    }
    
    return false;
  }
  
  onLimitReached(req, res, options, action) {
    this.stats.blockedRequests++;
    
    const userId = req.user?.id || 'anonymous';
    const userStats = this.stats.byUser.get(userId) || { total: 0, blocked: 0 };
    userStats.blocked++;
    this.stats.byUser.set(userId, userStats);
    
    const actionStats = this.stats.byAction.get(action) || { total: 0, blocked: 0 };
    actionStats.blocked++;
    this.stats.byAction.set(action, actionStats);
    
    if (this.options.enableLogging) {
      console.warn(`Rate limit exceeded for ${action}: ${userId} (${req.ip})`);
    }
    
    // Log to audit service if available
    if (req.auditLog) {
      req.auditLog({
        type: 'RATE_LIMIT_EXCEEDED',
        action,
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
  }
  
  isWhitelisted(req) {
    const userId = req.user?.id;
    const ip = req.ip;
    
    return this.options.whitelist.has(userId) || 
           this.options.whitelist.has(ip) ||
           req.user?.roles?.includes('admin');
  }
  
  isBlacklisted(req) {
    const userId = req.user?.id;
    const ip = req.ip;
    
    return this.options.blacklist.has(userId) || 
           this.options.blacklist.has(ip);
  }
  
  getUserTier(req) {
    if (!req.user) return 'anonymous';
    
    const roles = req.user.roles || [];
    
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('premium')) return 'premium';
    if (req.user.subscription === 'premium') return 'premium';
    
    return 'user';
  }
  
  /**
   * Middleware factory for general rate limiting
   */
  general() {
    return (req, res, next) => {
      this.stats.totalRequests++;
      
      const userId = req.user?.id || 'anonymous';
      const userStats = this.stats.byUser.get(userId) || { total: 0, blocked: 0 };
      userStats.total++;
      this.stats.byUser.set(userId, userStats);
      
      // Check if blacklisted
      if (this.isBlacklisted(req)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Get user tier and apply appropriate rate limit
      const userTier = this.getUserTier(req);
      const rateLimiter = this.rateLimiters.get(`default-${userTier}`);
      
      if (rateLimiter) {
        // Dynamically adjust max based on user tier and custom limits
        const userId = req.user?.id;
        if (userId && this.options.customLimits.has(userId)) {
          const customLimit = this.options.customLimits.get(userId);
          if (customLimit.general && rateLimiter.options) {
            rateLimiter.options.max = customLimit.general;
          }
        }
        
        rateLimiter(req, res, next);
      } else {
        next();
      }
    };
  }
  
  /**
   * Middleware factory for action-specific rate limiting
   */
  action(actionType) {
    return (req, res, next) => {
      const rateLimiter = this.rateLimiters.get(actionType);
      
      if (!rateLimiter) {
        console.warn(`No rate limiter configured for action: ${actionType}`);
        return next();
      }
      
      // Update action statistics
      const actionStats = this.stats.byAction.get(actionType) || { total: 0, blocked: 0 };
      actionStats.total++;
      this.stats.byAction.set(actionType, actionStats);
      
      // Get user tier and adjust limits if needed
      const userTier = this.getUserTier(req);
      const actionConfig = this.options.actionLimits[actionType];
      
      if (actionConfig && typeof actionConfig.max === 'object' && rateLimiter.options) {
        rateLimiter.options.max = actionConfig.max[userTier] || actionConfig.max.user;
      }
      
      // Check custom limits
      const userId = req.user?.id;
      if (userId && this.options.customLimits.has(userId)) {
        const customLimit = this.options.customLimits.get(userId);
        if (customLimit[actionType] && rateLimiter.options) {
          rateLimiter.options.max = customLimit[actionType];
        }
      }
      
      rateLimiter(req, res, next);
    };
  }
  
  /**
   * Add user to whitelist
   */
  addToWhitelist(identifier) {
    this.options.whitelist.add(identifier);
  }
  
  /**
   * Remove user from whitelist
   */
  removeFromWhitelist(identifier) {
    this.options.whitelist.delete(identifier);
  }
  
  /**
   * Add user to blacklist
   */
  addToBlacklist(identifier) {
    this.options.blacklist.add(identifier);
  }
  
  /**
   * Remove user from blacklist
   */
  removeFromBlacklist(identifier) {
    this.options.blacklist.delete(identifier);
  }
  
  /**
   * Set custom limits for a user
   */
  setCustomLimits(userId, limits) {
    this.options.customLimits.set(userId, limits);
  }
  
  /**
   * Remove custom limits for a user
   */
  removeCustomLimits(userId) {
    this.options.customLimits.delete(userId);
  }
  
  /**
   * Get current usage for a user
   */
  async getUserUsage(userId, action = null) {
    if (!this.redis) {
      return { error: 'Redis not configured for usage tracking' };
    }
    
    try {
      const keys = action ? 
        [`rate-limit:${action}:${userId}`] :
        await this.redis.keys(`rate-limit:*:${userId}`);
      
      const usage = {};
      
      for (const key of keys) {
        const count = await this.redis.get(key);
        const ttl = await this.redis.ttl(key);
        
        const actionName = key.split(':')[2];
        usage[actionName] = {
          current: parseInt(count) || 0,
          resetIn: ttl > 0 ? ttl : 0
        };
      }
      
      return usage;
    } catch (error) {
      console.error('Error getting user usage:', error);
      return { error: 'Failed to get usage data' };
    }
  }
  
  /**
   * Reset limits for a user (admin function)
   */
  async resetUserLimits(userId, action = null) {
    if (!this.redis) {
      return { error: 'Redis not configured' };
    }
    
    try {
      const pattern = action ? 
        `rate-limit:${action}:${userId}` :
        `rate-limit:*:${userId}`;
      
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      
      return { success: true, resetKeys: keys.length };
    } catch (error) {
      console.error('Error resetting user limits:', error);
      return { error: 'Failed to reset limits' };
    }
  }
  
  /**
   * Get rate limiting statistics
   */
  getStats() {
    return {
      totalRequests: this.stats.totalRequests,
      blockedRequests: this.stats.blockedRequests,
      blockRate: this.stats.totalRequests > 0 ? 
        (this.stats.blockedRequests / this.stats.totalRequests * 100).toFixed(2) + '%' : '0%',
      
      topUsers: Array.from(this.stats.byUser.entries())
        .sort(([,a], [,b]) => b.total - a.total)
        .slice(0, 10)
        .map(([userId, stats]) => ({ userId, ...stats })),
      
      topActions: Array.from(this.stats.byAction.entries())
        .sort(([,a], [,b]) => b.total - a.total)
        .slice(0, 10)
        .map(([action, stats]) => ({ action, ...stats })),
      
      whitelistSize: this.options.whitelist.size,
      blacklistSize: this.options.blacklist.size,
      customLimitsCount: this.options.customLimits.size
    };
  }
  
  /**
   * Middleware to extract user from JWT token
   */
  extractUser() {
    return (req, res, next) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      if (token) {
        try {
          const decoded = jwt.verify(token, this.options.jwtSecret);
          req.user = decoded;
        } catch (error) {
          // Invalid token, but don't block the request
          // Rate limiting will treat as anonymous
        }
      }
      
      next();
    };
  }
  
  /**
   * Clean up old statistics
   */
  cleanupStats() {
    // Keep only top 1000 users in stats
    if (this.stats.byUser.size > 1000) {
      const sorted = Array.from(this.stats.byUser.entries())
        .sort(([,a], [,b]) => b.total - a.total)
        .slice(0, 1000);
      
      this.stats.byUser = new Map(sorted);
    }
  }
}

// Export class and create default instance
const defaultUserRateLimit = new UserRateLimit();

export { UserRateLimit, defaultUserRateLimit };
export default defaultUserRateLimit;
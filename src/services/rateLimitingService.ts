// Rate Limiting Service - Enterprise API Usage Control
// Professional rate limiting with multiple algorithms and monitoring

// Types
type RateLimitAlgorithm = 'token_bucket' | 'sliding_window' | 'fixed_window' | 'leaky_bucket';
type RateLimitScope = 'global' | 'user' | 'ip' | 'api_key' | 'endpoint';
type RateLimitAction = 'allow' | 'deny' | 'throttle' | 'queue';

interface RateLimitRule {
  id: string;
  name: string;
  algorithm: RateLimitAlgorithm;
  scope: RateLimitScope;
  limit: number;
  window: number; // in milliseconds
  burst?: number; // for token bucket
  refillRate?: number; // tokens per second
  priority: number;
  enabled: boolean;
  conditions?: {
    userRoles?: string[];
    endpoints?: string[];
    methods?: string[];
    ipRanges?: string[];
    timeRanges?: Array<{ start: string; end: string }>;
  };
  actions: {
    onLimit: RateLimitAction;
    onExceed: RateLimitAction;
    customResponse?: {
      status: number;
      message: string;
      headers?: Record<string, string>;
    };
  };
}

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number;
}

interface SlidingWindowEntry {
  timestamp: number;
  count: number;
}

interface RateLimitState {
  key: string;
  algorithm: RateLimitAlgorithm;
  bucket?: RateLimitBucket;
  window?: SlidingWindowEntry[];
  fixedWindow?: {
    count: number;
    windowStart: number;
  };
  leakyBucket?: {
    queue: Array<{ timestamp: number; request: any }>;
    lastLeak: number;
    leakRate: number;
  };
}

interface RateLimitResult {
  allowed: boolean;
  action: RateLimitAction;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  headers: Record<string, string>;
  rule?: RateLimitRule;
  metadata: {
    algorithm: RateLimitAlgorithm;
    scope: RateLimitScope;
    key: string;
    currentUsage: number;
    limit: number;
    window: number;
  };
}

interface RateLimitStats {
  totalRequests: number;
  allowedRequests: number;
  deniedRequests: number;
  throttledRequests: number;
  queuedRequests: number;
  averageResponseTime: number;
  topUsers: Array<{ key: string; requests: number; denied: number }>;
  topEndpoints: Array<{ endpoint: string; requests: number; denied: number }>;
  ruleStats: Record<string, {
    triggered: number;
    allowed: number;
    denied: number;
    throttled: number;
  }>;
  timeSeriesData: Array<{
    timestamp: number;
    requests: number;
    denied: number;
    throttled: number;
  }>;
}

interface RateLimitRequest {
  id: string;
  userId?: string;
  ipAddress: string;
  endpoint: string;
  method: string;
  userAgent: string;
  apiKey?: string;
  userRole?: string;
  timestamp: number;
  headers: Record<string, string>;
  metadata?: Record<string, any>;
}

class RateLimitingService {
  private rules: Map<string, RateLimitRule> = new Map();
  private states: Map<string, RateLimitState> = new Map();
  private stats: RateLimitStats;
  private requestHistory: RateLimitRequest[] = [];
  private maxHistorySize = 10000;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.stats = {
      totalRequests: 0,
      allowedRequests: 0,
      deniedRequests: 0,
      throttledRequests: 0,
      queuedRequests: 0,
      averageResponseTime: 0,
      topUsers: [],
      topEndpoints: [],
      ruleStats: {},
      timeSeriesData: []
    };

    this.initializeDefaultRules();
    this.startCleanupTask();
  }

  private initializeDefaultRules(): void {
    // Global rate limit
    this.addRule({
      id: 'global_limit',
      name: 'Global API Limit',
      algorithm: 'sliding_window',
      scope: 'global',
      limit: 10000,
      window: 60000, // 1 minute
      priority: 1,
      enabled: true,
      actions: {
        onLimit: 'throttle',
        onExceed: 'deny',
        customResponse: {
          status: 429,
          message: 'Global rate limit exceeded',
          headers: { 'Retry-After': '60' }
        }
      }
    });

    // User-based rate limit
    this.addRule({
      id: 'user_limit',
      name: 'Per User Limit',
      algorithm: 'token_bucket',
      scope: 'user',
      limit: 1000,
      window: 60000,
      burst: 100,
      refillRate: 16.67, // ~1000 tokens per minute
      priority: 2,
      enabled: true,
      actions: {
        onLimit: 'throttle',
        onExceed: 'deny'
      }
    });

    // IP-based rate limit
    this.addRule({
      id: 'ip_limit',
      name: 'Per IP Limit',
      algorithm: 'sliding_window',
      scope: 'ip',
      limit: 500,
      window: 60000,
      priority: 3,
      enabled: true,
      actions: {
        onLimit: 'throttle',
        onExceed: 'deny'
      }
    });

    // API endpoint specific limits
    this.addRule({
      id: 'auth_endpoint_limit',
      name: 'Authentication Endpoint Limit',
      algorithm: 'fixed_window',
      scope: 'endpoint',
      limit: 5,
      window: 300000, // 5 minutes
      priority: 4,
      enabled: true,
      conditions: {
        endpoints: ['/api/auth/login', '/api/auth/register'],
        methods: ['POST']
      },
      actions: {
        onLimit: 'deny',
        onExceed: 'deny',
        customResponse: {
          status: 429,
          message: 'Too many authentication attempts',
          headers: { 'Retry-After': '300' }
        }
      }
    });

    // Premium user higher limits
    this.addRule({
      id: 'premium_user_limit',
      name: 'Premium User Limit',
      algorithm: 'token_bucket',
      scope: 'user',
      limit: 5000,
      window: 60000,
      burst: 500,
      refillRate: 83.33, // ~5000 tokens per minute
      priority: 1, // Higher priority than regular user limit
      enabled: true,
      conditions: {
        userRoles: ['premium', 'enterprise']
      },
      actions: {
        onLimit: 'throttle',
        onExceed: 'queue'
      }
    });
  }

  public addRule(rule: RateLimitRule): void {
    this.rules.set(rule.id, rule);
    this.stats.ruleStats[rule.id] = {
      triggered: 0,
      allowed: 0,
      denied: 0,
      throttled: 0
    };
  }

  public removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    delete this.stats.ruleStats[ruleId];
  }

  public updateRule(ruleId: string, updates: Partial<RateLimitRule>): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      this.rules.set(ruleId, { ...rule, ...updates });
    }
  }

  public checkRateLimit(request: RateLimitRequest): RateLimitResult {
    const startTime = Date.now();
    this.stats.totalRequests++;
    this.requestHistory.push(request);

    // Keep history size manageable
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory = this.requestHistory.slice(-this.maxHistorySize);
    }

    // Find applicable rules
    const applicableRules = this.getApplicableRules(request);
    
    // Sort by priority (lower number = higher priority)
    applicableRules.sort((a, b) => a.priority - b.priority);

    let finalResult: RateLimitResult | null = null;

    // Check each rule
    for (const rule of applicableRules) {
      const key = this.generateKey(rule, request);
      const result = this.checkRule(rule, key, request);
      
      // Update rule stats
      this.stats.ruleStats[rule.id].triggered++;
      
      if (result.allowed) {
        this.stats.ruleStats[rule.id].allowed++;
      } else {
        this.stats.ruleStats[rule.id].denied++;
        if (result.action === 'throttle') {
          this.stats.ruleStats[rule.id].throttled++;
        }
      }

      // If any rule denies, use that result
      if (!result.allowed) {
        finalResult = result;
        break;
      }
      
      // Keep the most restrictive result
      if (!finalResult || result.remaining < finalResult.remaining) {
        finalResult = result;
      }
    }

    // Default to allow if no rules apply
    if (!finalResult) {
      finalResult = {
        allowed: true,
        action: 'allow',
        remaining: Infinity,
        resetTime: Date.now() + 60000,
        headers: {},
        metadata: {
          algorithm: 'none' as RateLimitAlgorithm,
          scope: 'global',
          key: 'default',
          currentUsage: 0,
          limit: Infinity,
          window: 60000
        }
      };
    }

    // Update global stats
    if (finalResult.allowed) {
      this.stats.allowedRequests++;
    } else {
      this.stats.deniedRequests++;
      if (finalResult.action === 'throttle') {
        this.stats.throttledRequests++;
      }
    }

    // Update response time
    const responseTime = Date.now() - startTime;
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime * (this.stats.totalRequests - 1) + responseTime) / 
      this.stats.totalRequests;

    return finalResult;
  }

  private getApplicableRules(request: RateLimitRequest): RateLimitRule[] {
    return Array.from(this.rules.values()).filter(rule => {
      if (!rule.enabled) return false;

      // Check conditions
      if (rule.conditions) {
        const { userRoles, endpoints, methods, ipRanges, timeRanges } = rule.conditions;
        
        if (userRoles && request.userRole && !userRoles.includes(request.userRole)) {
          return false;
        }
        
        if (endpoints && !endpoints.some(endpoint => request.endpoint.startsWith(endpoint))) {
          return false;
        }
        
        if (methods && !methods.includes(request.method)) {
          return false;
        }
        
        if (ipRanges && !this.isIpInRanges(request.ipAddress, ipRanges)) {
          return false;
        }
        
        if (timeRanges && !this.isTimeInRanges(new Date(request.timestamp), timeRanges)) {
          return false;
        }
      }

      return true;
    });
  }

  private generateKey(rule: RateLimitRule, request: RateLimitRequest): string {
    const parts = [rule.id];
    
    switch (rule.scope) {
      case 'global':
        parts.push('global');
        break;
      case 'user':
        parts.push('user', request.userId || 'anonymous');
        break;
      case 'ip':
        parts.push('ip', request.ipAddress);
        break;
      case 'api_key':
        parts.push('api_key', request.apiKey || 'none');
        break;
      case 'endpoint':
        parts.push('endpoint', request.endpoint, request.method);
        break;
    }
    
    return parts.join(':');
  }

  private checkRule(rule: RateLimitRule, key: string, request: RateLimitRequest): RateLimitResult {
    let state = this.states.get(key);
    
    if (!state) {
      state = this.initializeState(rule, key);
      this.states.set(key, state);
    }

    switch (rule.algorithm) {
      case 'token_bucket':
        return this.checkTokenBucket(rule, state, request);
      case 'sliding_window':
        return this.checkSlidingWindow(rule, state, request);
      case 'fixed_window':
        return this.checkFixedWindow(rule, state, request);
      case 'leaky_bucket':
        return this.checkLeakyBucket(rule, state, request);
      default:
        throw new Error(`Unknown algorithm: ${rule.algorithm}`);
    }
  }

  private initializeState(rule: RateLimitRule, key: string): RateLimitState {
    const state: RateLimitState = {
      key,
      algorithm: rule.algorithm
    };

    switch (rule.algorithm) {
      case 'token_bucket':
        state.bucket = {
          tokens: rule.burst || rule.limit,
          lastRefill: Date.now(),
          capacity: rule.burst || rule.limit,
          refillRate: rule.refillRate || (rule.limit / (rule.window / 1000))
        };
        break;
      case 'sliding_window':
        state.window = [];
        break;
      case 'fixed_window':
        state.fixedWindow = {
          count: 0,
          windowStart: Date.now()
        };
        break;
      case 'leaky_bucket':
        state.leakyBucket = {
          queue: [],
          lastLeak: Date.now(),
          leakRate: rule.limit / (rule.window / 1000)
        };
        break;
    }

    return state;
  }

  private checkTokenBucket(rule: RateLimitRule, state: RateLimitState, request: RateLimitRequest): RateLimitResult {
    const bucket = state.bucket!;
    const now = Date.now();
    
    // Refill tokens
    const timePassed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = timePassed * bucket.refillRate;
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    const allowed = bucket.tokens >= 1;
    
    if (allowed) {
      bucket.tokens -= 1;
    }

    const resetTime = now + ((bucket.capacity - bucket.tokens) / bucket.refillRate) * 1000;
    
    return {
      allowed,
      action: allowed ? 'allow' : rule.actions.onExceed,
      remaining: Math.floor(bucket.tokens),
      resetTime,
      retryAfter: allowed ? undefined : Math.ceil((1 - bucket.tokens) / bucket.refillRate),
      headers: {
        'X-RateLimit-Limit': rule.limit.toString(),
        'X-RateLimit-Remaining': Math.floor(bucket.tokens).toString(),
        'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
        'X-RateLimit-Algorithm': 'token-bucket'
      },
      rule,
      metadata: {
        algorithm: rule.algorithm,
        scope: rule.scope,
        key: state.key,
        currentUsage: bucket.capacity - bucket.tokens,
        limit: rule.limit,
        window: rule.window
      }
    };
  }

  private checkSlidingWindow(rule: RateLimitRule, state: RateLimitState, request: RateLimitRequest): RateLimitResult {
    const window = state.window!;
    const now = Date.now();
    const windowStart = now - rule.window;
    
    // Remove old entries
    while (window.length > 0 && window[0].timestamp < windowStart) {
      window.shift();
    }
    
    // Count current requests
    const currentCount = window.reduce((sum, entry) => sum + entry.count, 0);
    const allowed = currentCount < rule.limit;
    
    if (allowed) {
      // Add current request
      const lastEntry = window[window.length - 1];
      if (lastEntry && now - lastEntry.timestamp < 1000) {
        // Aggregate requests within the same second
        lastEntry.count++;
      } else {
        window.push({ timestamp: now, count: 1 });
      }
    }
    
    const resetTime = window.length > 0 ? window[0].timestamp + rule.window : now + rule.window;
    
    return {
      allowed,
      action: allowed ? 'allow' : rule.actions.onExceed,
      remaining: rule.limit - currentCount - (allowed ? 1 : 0),
      resetTime,
      retryAfter: allowed ? undefined : Math.ceil((resetTime - now) / 1000),
      headers: {
        'X-RateLimit-Limit': rule.limit.toString(),
        'X-RateLimit-Remaining': (rule.limit - currentCount - (allowed ? 1 : 0)).toString(),
        'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
        'X-RateLimit-Algorithm': 'sliding-window'
      },
      rule,
      metadata: {
        algorithm: rule.algorithm,
        scope: rule.scope,
        key: state.key,
        currentUsage: currentCount + (allowed ? 1 : 0),
        limit: rule.limit,
        window: rule.window
      }
    };
  }

  private checkFixedWindow(rule: RateLimitRule, state: RateLimitState, request: RateLimitRequest): RateLimitResult {
    const fixedWindow = state.fixedWindow!;
    const now = Date.now();
    
    // Check if we need to reset the window
    if (now - fixedWindow.windowStart >= rule.window) {
      fixedWindow.count = 0;
      fixedWindow.windowStart = now;
    }
    
    const allowed = fixedWindow.count < rule.limit;
    
    if (allowed) {
      fixedWindow.count++;
    }
    
    const resetTime = fixedWindow.windowStart + rule.window;
    
    return {
      allowed,
      action: allowed ? 'allow' : rule.actions.onExceed,
      remaining: rule.limit - fixedWindow.count,
      resetTime,
      retryAfter: allowed ? undefined : Math.ceil((resetTime - now) / 1000),
      headers: {
        'X-RateLimit-Limit': rule.limit.toString(),
        'X-RateLimit-Remaining': (rule.limit - fixedWindow.count).toString(),
        'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
        'X-RateLimit-Algorithm': 'fixed-window'
      },
      rule,
      metadata: {
        algorithm: rule.algorithm,
        scope: rule.scope,
        key: state.key,
        currentUsage: fixedWindow.count,
        limit: rule.limit,
        window: rule.window
      }
    };
  }

  private checkLeakyBucket(rule: RateLimitRule, state: RateLimitState, request: RateLimitRequest): RateLimitResult {
    const leakyBucket = state.leakyBucket!;
    const now = Date.now();
    
    // Leak requests
    const timePassed = (now - leakyBucket.lastLeak) / 1000;
    const requestsToLeak = Math.floor(timePassed * leakyBucket.leakRate);
    
    for (let i = 0; i < requestsToLeak && leakyBucket.queue.length > 0; i++) {
      leakyBucket.queue.shift();
    }
    
    leakyBucket.lastLeak = now;
    
    const allowed = leakyBucket.queue.length < rule.limit;
    
    if (allowed) {
      leakyBucket.queue.push({ timestamp: now, request });
    }
    
    const resetTime = leakyBucket.queue.length > 0 ? 
      leakyBucket.queue[0].timestamp + (rule.limit / leakyBucket.leakRate) * 1000 : 
      now;
    
    return {
      allowed,
      action: allowed ? 'allow' : rule.actions.onExceed,
      remaining: rule.limit - leakyBucket.queue.length,
      resetTime,
      retryAfter: allowed ? undefined : Math.ceil((leakyBucket.queue.length / leakyBucket.leakRate)),
      headers: {
        'X-RateLimit-Limit': rule.limit.toString(),
        'X-RateLimit-Remaining': (rule.limit - leakyBucket.queue.length).toString(),
        'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
        'X-RateLimit-Algorithm': 'leaky-bucket'
      },
      rule,
      metadata: {
        algorithm: rule.algorithm,
        scope: rule.scope,
        key: state.key,
        currentUsage: leakyBucket.queue.length,
        limit: rule.limit,
        window: rule.window
      }
    };
  }

  private isIpInRanges(ip: string, ranges: string[]): boolean {
    // Simplified IP range checking - in production, use proper CIDR matching
    return ranges.some(range => {
      if (range.includes('/')) {
        // CIDR notation - simplified check
        const [network] = range.split('/');
        return ip.startsWith(network.split('.').slice(0, -1).join('.'));
      } else {
        return ip === range;
      }
    });
  }

  private isTimeInRanges(time: Date, ranges: Array<{ start: string; end: string }>): boolean {
    const timeStr = time.toTimeString().slice(0, 5); // HH:MM format
    return ranges.some(range => timeStr >= range.start && timeStr <= range.end);
  }

  public getStats(): RateLimitStats {
    this.updateTimeSeriesData();
    this.updateTopUsers();
    this.updateTopEndpoints();
    return { ...this.stats };
  }

  private updateTimeSeriesData(): void {
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;
    
    // Generate last 24 hours of data
    const timeSeriesData: Array<{
      timestamp: number;
      requests: number;
      denied: number;
      throttled: number;
    }> = [];
    
    for (let i = 23; i >= 0; i--) {
      const hourStart = now - (i * hourMs);
      const hourEnd = hourStart + hourMs;
      
      const hourRequests = this.requestHistory.filter(req => 
        req.timestamp >= hourStart && req.timestamp < hourEnd
      );
      
      timeSeriesData.push({
        timestamp: hourStart,
        requests: hourRequests.length,
        denied: 0, // Would need to track this in real implementation
        throttled: 0 // Would need to track this in real implementation
      });
    }
    
    this.stats.timeSeriesData = timeSeriesData;
  }

  private updateTopUsers(): void {
    const userCounts: Record<string, { requests: number; denied: number }> = {};
    
    this.requestHistory.forEach(req => {
      const key = req.userId || req.ipAddress;
      if (!userCounts[key]) {
        userCounts[key] = { requests: 0, denied: 0 };
      }
      userCounts[key].requests++;
    });
    
    this.stats.topUsers = Object.entries(userCounts)
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);
  }

  private updateTopEndpoints(): void {
    const endpointCounts: Record<string, { requests: number; denied: number }> = {};
    
    this.requestHistory.forEach(req => {
      const key = `${req.method} ${req.endpoint}`;
      if (!endpointCounts[key]) {
        endpointCounts[key] = { requests: 0, denied: 0 };
      }
      endpointCounts[key].requests++;
    });
    
    this.stats.topEndpoints = Object.entries(endpointCounts)
      .map(([endpoint, data]) => ({ endpoint, ...data }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);
  }

  public getRules(): RateLimitRule[] {
    return Array.from(this.rules.values());
  }

  public getRule(ruleId: string): RateLimitRule | undefined {
    return this.rules.get(ruleId);
  }

  public clearState(key?: string): void {
    if (key) {
      this.states.delete(key);
    } else {
      this.states.clear();
    }
  }

  public resetStats(): void {
    this.stats = {
      totalRequests: 0,
      allowedRequests: 0,
      deniedRequests: 0,
      throttledRequests: 0,
      queuedRequests: 0,
      averageResponseTime: 0,
      topUsers: [],
      topEndpoints: [],
      ruleStats: {},
      timeSeriesData: []
    };
    
    // Reset rule stats
    this.rules.forEach((rule, id) => {
      this.stats.ruleStats[id] = {
        triggered: 0,
        allowed: 0,
        denied: 0,
        throttled: 0
      };
    });
  }

  private startCleanupTask(): void {
    // Clean up old states and history every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    // Clean up old request history
    this.requestHistory = this.requestHistory.filter(
      req => now - req.timestamp < maxAge
    );
    
    // Clean up old states
    for (const [key, state] of this.states.entries()) {
      let shouldDelete = false;
      
      if (state.window) {
        // Remove if no recent activity in sliding window
        const hasRecentActivity = state.window.some(
          entry => now - entry.timestamp < maxAge
        );
        if (!hasRecentActivity) shouldDelete = true;
      }
      
      if (state.fixedWindow) {
        // Remove if window is very old
        if (now - state.fixedWindow.windowStart > maxAge) {
          shouldDelete = true;
        }
      }
      
      if (state.leakyBucket) {
        // Remove if queue is empty and no recent activity
        if (state.leakyBucket.queue.length === 0 && 
            now - state.leakyBucket.lastLeak > maxAge) {
          shouldDelete = true;
        }
      }
      
      if (shouldDelete) {
        this.states.delete(key);
      }
    }
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.rules.clear();
    this.states.clear();
    this.requestHistory = [];
  }
}

// Singleton instance
const rateLimitingService = new RateLimitingService();

// Utility functions
export const createRateLimitMiddleware = (service: RateLimitingService = rateLimitingService) => {
  return (req: any, res: any, next: any) => {
    const request: RateLimitRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: req.user?.id,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      endpoint: req.path,
      method: req.method,
      userAgent: req.get('User-Agent') || 'unknown',
      apiKey: req.get('X-API-Key'),
      userRole: req.user?.role,
      timestamp: Date.now(),
      headers: req.headers,
      metadata: {
        query: req.query,
        body: req.body
      }
    };
    
    const result = service.checkRateLimit(request);
    
    // Set rate limit headers
    Object.entries(result.headers).forEach(([key, value]) => {
      res.set(key, value);
    });
    
    if (!result.allowed) {
      const status = result.rule?.actions.customResponse?.status || 429;
      const message = result.rule?.actions.customResponse?.message || 'Rate limit exceeded';
      
      if (result.retryAfter) {
        res.set('Retry-After', result.retryAfter.toString());
      }
      
      return res.status(status).json({
        error: message,
        retryAfter: result.retryAfter,
        limit: result.metadata.limit,
        remaining: result.remaining,
        resetTime: result.resetTime
      });
    }
    
    next();
  };
};

export const createRateLimitRule = (config: Partial<RateLimitRule>): RateLimitRule => {
  return {
    id: config.id || `rule_${Date.now()}`,
    name: config.name || 'Custom Rule',
    algorithm: config.algorithm || 'sliding_window',
    scope: config.scope || 'global',
    limit: config.limit || 100,
    window: config.window || 60000,
    priority: config.priority || 10,
    enabled: config.enabled !== false,
    conditions: config.conditions,
    actions: {
      onLimit: 'throttle',
      onExceed: 'deny',
      ...config.actions
    },
    ...config
  };
};

export {
  RateLimitingService,
  type RateLimitRule,
  type RateLimitResult,
  type RateLimitRequest,
  type RateLimitStats,
  type RateLimitAlgorithm,
  type RateLimitScope,
  type RateLimitAction
};

export default rateLimitingService;
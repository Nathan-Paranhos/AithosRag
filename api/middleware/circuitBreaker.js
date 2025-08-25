/**
 * Advanced Circuit Breaker Implementation
 * Protects microservices from cascading failures and provides fallback mechanisms
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.options = {
      // Failure threshold (number of failures before opening circuit)
      failureThreshold: options.failureThreshold || 5,
      
      // Success threshold (number of successes needed to close circuit)
      successThreshold: options.successThreshold || 3,
      
      // Timeout in milliseconds
      timeout: options.timeout || 60000, // 1 minute
      
      // Half-open timeout (time to wait before trying again)
      halfOpenTimeout: options.halfOpenTimeout || 30000, // 30 seconds
      
      // Monitor window (time window for failure counting)
      monitorWindow: options.monitorWindow || 60000, // 1 minute
      
      // Fallback function
      fallback: options.fallback || null,
      
      // Service name for logging
      name: options.name || 'unknown-service',
      
      // Enable detailed logging
      enableLogging: options.enableLogging !== false,
      
      // Health check function
      healthCheck: options.healthCheck || null,
      
      // Health check interval
      healthCheckInterval: options.healthCheckInterval || 30000, // 30 seconds
      
      // Custom error filter (function to determine if error should count as failure)
      errorFilter: options.errorFilter || null,
      
      ...options
    };
    
    // Circuit states
    this.states = {
      CLOSED: 'CLOSED',     // Normal operation
      OPEN: 'OPEN',         // Circuit is open, requests fail fast
      HALF_OPEN: 'HALF_OPEN' // Testing if service is back
    };
    
    // Current state
    this.state = this.states.CLOSED;
    
    // Failure tracking
    this.failures = [];
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
    
    // Statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      circuitOpenCount: 0,
      fallbackCount: 0,
      averageResponseTime: 0,
      lastResponseTime: 0,
      stateChanges: [],
      uptime: Date.now()
    };
    
    // Health check timer
    this.healthCheckTimer = null;
    
    // Start health checking if configured
    if (this.options.healthCheck) {
      this.startHealthCheck();
    }
    
    this.log(`Circuit breaker initialized for ${this.options.name}`);
  }
  
  /**
   * Execute a function with circuit breaker protection
   */
  async execute(fn, ...args) {
    this.stats.totalRequests++;
    
    // Check if circuit is open
    if (this.state === this.states.OPEN) {
      if (Date.now() < this.nextAttempt) {
        // Circuit is still open, use fallback or throw error
        return this.handleOpenCircuit();
      } else {
        // Time to try half-open
        this.setState(this.states.HALF_OPEN);
      }
    }
    
    const startTime = Date.now();
    
    try {
      // Execute the function with timeout
      const result = await this.executeWithTimeout(fn, args);
      
      // Record success
      this.onSuccess(Date.now() - startTime);
      
      return result;
    } catch (error) {
      // Record failure
      this.onFailure(error, Date.now() - startTime);
      
      // Re-throw error or return fallback
      if (this.options.fallback && this.state === this.states.OPEN) {
        return this.executeFallback(error, ...args);
      }
      
      throw error;
    }
  }
  
  /**
   * Execute function with timeout
   */
  async executeWithTimeout(fn, args) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Circuit breaker timeout: ${this.options.name} (${this.options.timeout}ms)`));
      }, this.options.timeout);
      
      Promise.resolve(fn(...args))
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }
  
  /**
   * Handle success response
   */
  onSuccess(responseTime) {
    this.stats.successfulRequests++;
    this.stats.lastResponseTime = responseTime;
    this.updateAverageResponseTime(responseTime);
    
    if (this.state === this.states.HALF_OPEN) {
      this.successCount++;
      
      if (this.successCount >= this.options.successThreshold) {
        this.setState(this.states.CLOSED);
        this.reset();
      }
    } else if (this.state === this.states.CLOSED) {
      // Remove old failures outside the monitor window
      this.cleanupFailures();
    }
  }
  
  /**
   * Handle failure response
   */
  onFailure(error, responseTime) {
    this.stats.failedRequests++;
    this.stats.lastResponseTime = responseTime;
    this.updateAverageResponseTime(responseTime);
    
    // Check if this error should count as a failure
    if (this.options.errorFilter && !this.options.errorFilter(error)) {
      return;
    }
    
    const now = Date.now();
    this.failures.push(now);
    this.lastFailureTime = now;
    
    // Clean up old failures
    this.cleanupFailures();
    
    // Check if we should open the circuit
    if (this.state === this.states.CLOSED || this.state === this.states.HALF_OPEN) {
      if (this.failures.length >= this.options.failureThreshold) {
        this.setState(this.states.OPEN);
        this.nextAttempt = now + this.options.halfOpenTimeout;
        this.stats.circuitOpenCount++;
      }
    }
    
    this.log(`Failure recorded: ${error.message}`, 'warn');
  }
  
  /**
   * Handle open circuit
   */
  handleOpenCircuit() {
    if (this.options.fallback) {
      return this.executeFallback(new Error('Circuit breaker is open'));
    }
    
    throw new Error(`Circuit breaker is open for ${this.options.name}. Service is currently unavailable.`);
  }
  
  /**
   * Execute fallback function
   */
  async executeFallback(error, ...args) {
    this.stats.fallbackCount++;
    
    try {
      const result = await this.options.fallback(error, ...args);
      this.log(`Fallback executed successfully for ${this.options.name}`);
      return result;
    } catch (fallbackError) {
      this.log(`Fallback failed for ${this.options.name}: ${fallbackError.message}`, 'error');
      throw fallbackError;
    }
  }
  
  /**
   * Set circuit breaker state
   */
  setState(newState) {
    const oldState = this.state;
    this.state = newState;
    
    this.stats.stateChanges.push({
      from: oldState,
      to: newState,
      timestamp: Date.now()
    });
    
    // Keep only last 100 state changes
    if (this.stats.stateChanges.length > 100) {
      this.stats.stateChanges = this.stats.stateChanges.slice(-100);
    }
    
    this.log(`Circuit breaker state changed: ${oldState} -> ${newState}`);
    
    // Reset success count when entering half-open
    if (newState === this.states.HALF_OPEN) {
      this.successCount = 0;
    }
  }
  
  /**
   * Reset circuit breaker
   */
  reset() {
    this.failures = [];
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
    
    this.log(`Circuit breaker reset for ${this.options.name}`);
  }
  
  /**
   * Clean up old failures outside the monitor window
   */
  cleanupFailures() {
    const cutoff = Date.now() - this.options.monitorWindow;
    this.failures = this.failures.filter(timestamp => timestamp > cutoff);
  }
  
  /**
   * Update average response time
   */
  updateAverageResponseTime(responseTime) {
    const totalRequests = this.stats.successfulRequests + this.stats.failedRequests;
    
    if (totalRequests === 1) {
      this.stats.averageResponseTime = responseTime;
    } else {
      // Exponential moving average
      const alpha = 0.1;
      this.stats.averageResponseTime = 
        (alpha * responseTime) + ((1 - alpha) * this.stats.averageResponseTime);
    }
  }
  
  /**
   * Start health check monitoring
   */
  startHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.healthCheckTimer = setInterval(async () => {
      if (this.state === this.states.OPEN) {
        try {
          await this.options.healthCheck();
          this.log(`Health check passed for ${this.options.name}, attempting to close circuit`);
          
          // Health check passed, try to close circuit
          this.setState(this.states.HALF_OPEN);
          this.nextAttempt = Date.now();
        } catch (error) {
          this.log(`Health check failed for ${this.options.name}: ${error.message}`, 'warn');
        }
      }
    }, this.options.healthCheckInterval);
  }
  
  /**
   * Stop health check monitoring
   */
  stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }
  
  /**
   * Force open the circuit
   */
  forceOpen() {
    this.setState(this.states.OPEN);
    this.nextAttempt = Date.now() + this.options.halfOpenTimeout;
    this.log(`Circuit breaker forced open for ${this.options.name}`);
  }
  
  /**
   * Force close the circuit
   */
  forceClose() {
    this.setState(this.states.CLOSED);
    this.reset();
    this.log(`Circuit breaker forced closed for ${this.options.name}`);
  }
  
  /**
   * Get current status
   */
  getStatus() {
    return {
      name: this.options.name,
      state: this.state,
      failures: this.failures.length,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt,
      isHealthy: this.state === this.states.CLOSED,
      uptime: Date.now() - this.stats.uptime,
      ...this.stats
    };
  }
  
  /**
   * Get detailed statistics
   */
  getStats() {
    const now = Date.now();
    const uptime = now - this.stats.uptime;
    const totalRequests = this.stats.totalRequests;
    
    return {
      name: this.options.name,
      state: this.state,
      uptime,
      
      // Request statistics
      totalRequests,
      successfulRequests: this.stats.successfulRequests,
      failedRequests: this.stats.failedRequests,
      fallbackCount: this.stats.fallbackCount,
      
      // Success/failure rates
      successRate: totalRequests > 0 ? 
        ((this.stats.successfulRequests / totalRequests) * 100).toFixed(2) + '%' : '0%',
      failureRate: totalRequests > 0 ? 
        ((this.stats.failedRequests / totalRequests) * 100).toFixed(2) + '%' : '0%',
      
      // Performance metrics
      averageResponseTime: Math.round(this.stats.averageResponseTime),
      lastResponseTime: this.stats.lastResponseTime,
      
      // Circuit breaker specific
      currentFailures: this.failures.length,
      circuitOpenCount: this.stats.circuitOpenCount,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt,
      
      // Recent state changes
      recentStateChanges: this.stats.stateChanges.slice(-10),
      
      // Configuration
      configuration: {
        failureThreshold: this.options.failureThreshold,
        successThreshold: this.options.successThreshold,
        timeout: this.options.timeout,
        halfOpenTimeout: this.options.halfOpenTimeout,
        monitorWindow: this.options.monitorWindow
      }
    };
  }
  
  /**
   * Log messages
   */
  log(message, level = 'info') {
    if (!this.options.enableLogging) return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [CircuitBreaker:${this.options.name}] ${message}`;
    
    switch (level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }
  
  /**
   * Cleanup resources
   */
  destroy() {
    this.stopHealthCheck();
    this.log(`Circuit breaker destroyed for ${this.options.name}`);
  }
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers for different services
 */
class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
    this.globalStats = {
      totalBreakers: 0,
      openBreakers: 0,
      totalRequests: 0,
      totalFailures: 0
    };
  }
  
  /**
   * Create or get a circuit breaker
   */
  getBreaker(name, options = {}) {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker({ name, ...options });
      this.breakers.set(name, breaker);
      this.globalStats.totalBreakers++;
    }
    
    return this.breakers.get(name);
  }
  
  /**
   * Remove a circuit breaker
   */
  removeBreaker(name) {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.destroy();
      this.breakers.delete(name);
      this.globalStats.totalBreakers--;
    }
  }
  
  /**
   * Get all circuit breakers status
   */
  getAllStatus() {
    const statuses = [];
    
    for (const [name, breaker] of this.breakers) {
      statuses.push(breaker.getStatus());
    }
    
    return statuses;
  }
  
  /**
   * Get global statistics
   */
  getGlobalStats() {
    let totalRequests = 0;
    let totalFailures = 0;
    let openBreakers = 0;
    
    for (const breaker of this.breakers.values()) {
      const stats = breaker.getStats();
      totalRequests += stats.totalRequests;
      totalFailures += stats.failedRequests;
      
      if (breaker.state === breaker.states.OPEN) {
        openBreakers++;
      }
    }
    
    return {
      totalBreakers: this.breakers.size,
      openBreakers,
      totalRequests,
      totalFailures,
      globalFailureRate: totalRequests > 0 ? 
        ((totalFailures / totalRequests) * 100).toFixed(2) + '%' : '0%',
      
      breakersByState: {
        closed: Array.from(this.breakers.values()).filter(b => b.state === 'CLOSED').length,
        open: Array.from(this.breakers.values()).filter(b => b.state === 'OPEN').length,
        halfOpen: Array.from(this.breakers.values()).filter(b => b.state === 'HALF_OPEN').length
      }
    };
  }
  
  /**
   * Force open all circuit breakers
   */
  forceOpenAll() {
    for (const breaker of this.breakers.values()) {
      breaker.forceOpen();
    }
  }
  
  /**
   * Force close all circuit breakers
   */
  forceCloseAll() {
    for (const breaker of this.breakers.values()) {
      breaker.forceClose();
    }
  }
  
  /**
   * Cleanup all circuit breakers
   */
  destroy() {
    for (const breaker of this.breakers.values()) {
      breaker.destroy();
    }
    this.breakers.clear();
  }
}

// Create global instance
const circuitBreakerManager = new CircuitBreakerManager();

export { CircuitBreaker, CircuitBreakerManager, circuitBreakerManager };
export default circuitBreakerManager;
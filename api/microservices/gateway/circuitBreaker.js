class CircuitBreaker {
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 5000, // 5 seconds
      errorThresholdPercentage: options.errorThresholdPercentage || 50,
      resetTimeout: options.resetTimeout || 30000, // 30 seconds
      monitoringPeriod: options.monitoringPeriod || 60000, // 1 minute
      minimumRequests: options.minimumRequests || 10,
      ...options
    };

    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.requestCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
    this.stats = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      totalTimeouts: 0,
      averageResponseTime: 0,
      lastReset: Date.now()
    };

    // Reset counters periodically
    this.resetInterval = setInterval(() => {
      this.resetCounters();
    }, this.options.monitoringPeriod);
  }

  async execute(operation) {
    this.stats.totalRequests++;
    this.requestCount++;

    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
        console.log('🔄 Circuit breaker transitioning to HALF_OPEN state');
      } else {
        const error = new Error('Circuit breaker is OPEN');
        error.code = 'CIRCUIT_BREAKER_OPEN';
        throw error;
      }
    }

    const startTime = Date.now();
    
    try {
      // Set timeout for the operation
      const result = await Promise.race([
        operation(),
        this.createTimeoutPromise()
      ]);

      const responseTime = Date.now() - startTime;
      this.recordSuccess(responseTime);
      
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      if (error.code === 'TIMEOUT') {
        this.stats.totalTimeouts++;
      }
      
      this.recordFailure(responseTime);
      throw error;
    }
  }

  createTimeoutPromise() {
    return new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error(`Operation timed out after ${this.options.timeout}ms`);
        error.code = 'TIMEOUT';
        reject(error);
      }, this.options.timeout);
    });
  }

  recordSuccess(responseTime = 0) {
    this.successCount++;
    this.stats.totalSuccesses++;
    this.updateAverageResponseTime(responseTime);

    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.failureCount = 0;
      console.log('✅ Circuit breaker reset to CLOSED state');
    }
  }

  recordFailure(responseTime = 0) {
    this.failureCount++;
    this.stats.totalFailures++;
    this.lastFailureTime = Date.now();
    this.updateAverageResponseTime(responseTime);

    if (this.shouldOpenCircuit()) {
      this.openCircuit();
    }
  }

  shouldOpenCircuit() {
    if (this.requestCount < this.options.minimumRequests) {
      return false;
    }

    const errorRate = (this.failureCount / this.requestCount) * 100;
    return errorRate >= this.options.errorThresholdPercentage;
  }

  openCircuit() {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.options.resetTimeout;
    console.log(`🔴 Circuit breaker OPENED - Error rate: ${((this.failureCount / this.requestCount) * 100).toFixed(2)}%`);
  }

  shouldAttemptReset() {
    return Date.now() >= this.nextAttempt;
  }

  resetCounters() {
    const previousStats = { ...this.stats };
    
    this.failureCount = 0;
    this.successCount = 0;
    this.requestCount = 0;
    this.stats.lastReset = Date.now();

    // Log stats before reset
    if (previousStats.totalRequests > 0) {
      const errorRate = (previousStats.totalFailures / previousStats.totalRequests) * 100;
      console.log(`📊 Circuit breaker stats reset - Error rate: ${errorRate.toFixed(2)}%, Avg response: ${previousStats.averageResponseTime.toFixed(2)}ms`);
    }
  }

  updateAverageResponseTime(responseTime) {
    const totalRequests = this.stats.totalRequests;
    this.stats.averageResponseTime = (
      (this.stats.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests
    );
  }

  isOpen() {
    return this.state === 'OPEN';
  }

  isClosed() {
    return this.state === 'CLOSED';
  }

  isHalfOpen() {
    return this.state === 'HALF_OPEN';
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      requestCount: this.requestCount,
      errorRate: this.requestCount > 0 ? (this.failureCount / this.requestCount) * 100 : 0,
      nextAttempt: this.nextAttempt,
      lastFailureTime: this.lastFailureTime,
      stats: { ...this.stats },
      options: { ...this.options }
    };
  }

  getHealthStatus() {
    const state = this.getState();
    const isHealthy = state.state === 'CLOSED' && state.errorRate < this.options.errorThresholdPercentage;
    
    return {
      healthy: isHealthy,
      state: state.state,
      errorRate: state.errorRate,
      averageResponseTime: state.stats.averageResponseTime,
      totalRequests: state.stats.totalRequests,
      totalFailures: state.stats.totalFailures,
      lastReset: new Date(state.stats.lastReset).toISOString()
    };
  }

  // Manual controls
  forceOpen() {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.options.resetTimeout;
    console.log('🔴 Circuit breaker manually OPENED');
  }

  forceClose() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.requestCount = 0;
    console.log('✅ Circuit breaker manually CLOSED');
  }

  forceHalfOpen() {
    this.state = 'HALF_OPEN';
    console.log('🔄 Circuit breaker manually set to HALF_OPEN');
  }

  destroy() {
    if (this.resetInterval) {
      clearInterval(this.resetInterval);
      this.resetInterval = null;
    }
  }
}

// Circuit Breaker Manager for multiple services
class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
  }

  createBreaker(serviceName, options = {}) {
    const breaker = new CircuitBreaker(options);
    this.breakers.set(serviceName, breaker);
    return breaker;
  }

  getBreaker(serviceName) {
    return this.breakers.get(serviceName);
  }

  getAllBreakers() {
    const result = {};
    for (const [serviceName, breaker] of this.breakers) {
      result[serviceName] = breaker.getState();
    }
    return result;
  }

  getHealthStatus() {
    const result = {};
    for (const [serviceName, breaker] of this.breakers) {
      result[serviceName] = breaker.getHealthStatus();
    }
    return result;
  }

  forceOpenAll() {
    for (const [serviceName, breaker] of this.breakers) {
      breaker.forceOpen();
    }
  }

  forceCloseAll() {
    for (const [serviceName, breaker] of this.breakers) {
      breaker.forceClose();
    }
  }

  destroy() {
    for (const [serviceName, breaker] of this.breakers) {
      breaker.destroy();
    }
    this.breakers.clear();
  }
}

export default CircuitBreaker;
export { CircuitBreakerManager };
// Circuit Breaker Service - Enterprise Resilience Pattern
// Implements circuit breaker pattern for fault tolerance and system resilience

// Types
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  recoveryTimeout: number; // Time to wait before attempting recovery (ms)
  monitoringPeriod: number; // Time window for failure counting (ms)
  successThreshold: number; // Successful calls needed to close circuit in HALF_OPEN
  timeout: number; // Request timeout (ms)
  volumeThreshold: number; // Minimum calls before circuit can open
  errorThresholdPercentage: number; // Error percentage threshold (0-100)
}

interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalCalls: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  errorRate: number;
  uptime: number;
  downtimeTotal: number;
  stateChanges: number;
  averageResponseTime: number;
}

interface CallResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  duration: number;
  timestamp: number;
}

interface HealthCheck {
  name: string;
  check: () => Promise<boolean>;
  interval: number;
  timeout: number;
  retries: number;
}

// Circuit Breaker Implementation
class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private totalCalls = 0;
  private lastFailureTime = 0;
  private lastSuccessTime = 0;
  private nextAttempt = 0;
  private stateChanges = 0;
  private responseTimes: number[] = [];
  private callHistory: CallResult<any>[] = [];
  private downtimeStart = 0;
  private downtimeTotal = 0;
  private createdAt = Date.now();
  
  private config: CircuitBreakerConfig;
  private name: string;
  private onStateChange?: (state: CircuitState, stats: CircuitBreakerStats) => void;
  private healthChecks: HealthCheck[] = [];
  private healthCheckTimers: NodeJS.Timeout[] = [];

  constructor(
    name: string,
    config: Partial<CircuitBreakerConfig> = {},
    onStateChange?: (state: CircuitState, stats: CircuitBreakerStats) => void
  ) {
    this.name = name;
    this.onStateChange = onStateChange;
    
    this.config = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 60000, // 1 minute
      successThreshold: 3,
      timeout: 30000, // 30 seconds
      volumeThreshold: 10,
      errorThresholdPercentage: 50,
      ...config
    };
  }

  // Main execution method
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    
    // Check if circuit should allow the call
    if (!this.canExecute()) {
      const error = new Error(`Circuit breaker '${this.name}' is OPEN`);
      this.recordCall({ success: false, error, duration: 0, timestamp: startTime });
      throw error;
    }

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(operation);
      const duration = Date.now() - startTime;
      
      this.recordCall({ success: true, data: result, duration, timestamp: startTime });
      this.onSuccess();
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.recordCall({ 
        success: false, 
        error: error as Error, 
        duration, 
        timestamp: startTime 
      });
      
      this.onFailure();
      throw error;
    }
  }

  // Execute operation with timeout
  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  // Check if circuit can execute
  private canExecute(): boolean {
    const now = Date.now();
    
    switch (this.state) {
      case 'CLOSED':
        return true;
        
      case 'OPEN':
        if (now >= this.nextAttempt) {
          this.setState('HALF_OPEN');
          return true;
        }
        return false;
        
      case 'HALF_OPEN':
        return true;
        
      default:
        return false;
    }
  }

  // Handle successful call
  private onSuccess(): void {
    this.successCount++;
    this.totalCalls++;
    this.lastSuccessTime = Date.now();
    
    if (this.state === 'HALF_OPEN') {
      if (this.successCount >= this.config.successThreshold) {
        this.setState('CLOSED');
        this.reset();
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success in closed state
      this.failureCount = 0;
    }
  }

  // Handle failed call
  private onFailure(): void {
    this.failureCount++;
    this.totalCalls++;
    this.lastFailureTime = Date.now();
    
    if (this.state === 'HALF_OPEN') {
      this.setState('OPEN');
      this.scheduleRecoveryAttempt();
    } else if (this.state === 'CLOSED') {
      if (this.shouldOpenCircuit()) {
        this.setState('OPEN');
        this.scheduleRecoveryAttempt();
      }
    }
  }

  // Check if circuit should open
  private shouldOpenCircuit(): boolean {
    // Need minimum volume of calls
    if (this.totalCalls < this.config.volumeThreshold) {
      return false;
    }
    
    // Check failure threshold
    if (this.failureCount >= this.config.failureThreshold) {
      return true;
    }
    
    // Check error rate threshold
    const errorRate = this.getErrorRate();
    return errorRate >= this.config.errorThresholdPercentage;
  }

  // Calculate current error rate
  private getErrorRate(): number {
    if (this.totalCalls === 0) return 0;
    
    const now = Date.now();
    const recentCalls = this.callHistory.filter(
      call => now - call.timestamp <= this.config.monitoringPeriod
    );
    
    if (recentCalls.length === 0) return 0;
    
    const failures = recentCalls.filter(call => !call.success).length;
    return (failures / recentCalls.length) * 100;
  }

  // Set circuit state
  private setState(newState: CircuitState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.stateChanges++;
      
      // Track downtime
      if (newState === 'OPEN') {
        this.downtimeStart = Date.now();
      } else if (oldState === 'OPEN') {
        this.downtimeTotal += Date.now() - this.downtimeStart;
      }
      
      // Notify state change
      if (this.onStateChange) {
        this.onStateChange(newState, this.getStats());
      }
      
      console.log(`Circuit breaker '${this.name}' state changed: ${oldState} -> ${newState}`);
    }
  }

  // Schedule recovery attempt
  private scheduleRecoveryAttempt(): void {
    this.nextAttempt = Date.now() + this.config.recoveryTimeout;
  }

  // Reset circuit breaker
  private reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
  }

  // Record call result
  private recordCall(result: CallResult<any>): void {
    this.callHistory.push(result);
    
    // Keep only recent calls
    const cutoff = Date.now() - this.config.monitoringPeriod * 2;
    this.callHistory = this.callHistory.filter(call => call.timestamp > cutoff);
    
    // Update response times
    if (result.success) {
      this.responseTimes.push(result.duration);
      if (this.responseTimes.length > 100) {
        this.responseTimes = this.responseTimes.slice(-100);
      }
    }
  }

  // Get circuit breaker statistics
  getStats(): CircuitBreakerStats {
    const now = Date.now();
    const uptime = now - this.createdAt;
    const currentDowntime = this.state === 'OPEN' ? now - this.downtimeStart : 0;
    
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalCalls: this.totalCalls,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      errorRate: this.getErrorRate(),
      uptime,
      downtimeTotal: this.downtimeTotal + currentDowntime,
      stateChanges: this.stateChanges,
      averageResponseTime: this.responseTimes.length > 0
        ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
        : 0
    };
  }

  // Add health check
  addHealthCheck(healthCheck: HealthCheck): void {
    this.healthChecks.push(healthCheck);
    this.startHealthCheck(healthCheck);
  }

  // Start health check
  private startHealthCheck(healthCheck: HealthCheck): void {
    const timer = setInterval(async () => {
      try {
        const isHealthy = await this.executeHealthCheck(healthCheck);
        
        if (isHealthy && this.state === 'OPEN') {
          // Force transition to HALF_OPEN if health check passes
          this.setState('HALF_OPEN');
        }
      } catch (error) {
        console.error(`Health check '${healthCheck.name}' failed:`, error);
      }
    }, healthCheck.interval);
    
    this.healthCheckTimers.push(timer);
  }

  // Execute health check with retries
  private async executeHealthCheck(healthCheck: HealthCheck): Promise<boolean> {
    for (let attempt = 0; attempt <= healthCheck.retries; attempt++) {
      try {
        const result = await Promise.race([
          healthCheck.check(),
          new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), healthCheck.timeout)
          )
        ]);
        
        if (result) {
          return true;
        }
      } catch (error) {
        if (attempt === healthCheck.retries) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return false;
  }

  // Manual control methods
  forceOpen(): void {
    this.setState('OPEN');
    this.scheduleRecoveryAttempt();
  }

  forceClose(): void {
    this.setState('CLOSED');
    this.reset();
  }

  forceHalfOpen(): void {
    this.setState('HALF_OPEN');
  }

  // Get call history
  getCallHistory(limit = 100): CallResult<any>[] {
    return this.callHistory.slice(-limit);
  }

  // Cleanup
  destroy(): void {
    this.healthCheckTimers.forEach(timer => clearInterval(timer));
    this.healthCheckTimers = [];
    this.healthChecks = [];
  }
}

// Circuit Breaker Manager
class CircuitBreakerManager {
  private static instance: CircuitBreakerManager;
  private breakers = new Map<string, CircuitBreaker>();
  private globalStats = {
    totalBreakers: 0,
    openBreakers: 0,
    halfOpenBreakers: 0,
    closedBreakers: 0,
    totalCalls: 0,
    totalFailures: 0,
    averageErrorRate: 0
  };

  private constructor() {}

  static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager();
    }
    return CircuitBreakerManager.instance;
  }

  // Create or get circuit breaker
  getBreaker(
    name: string, 
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker(
        name, 
        config, 
        (state, stats) => this.onBreakerStateChange(name, state, stats)
      );
      
      this.breakers.set(name, breaker);
      this.updateGlobalStats();
    }
    
    return this.breakers.get(name)!;
  }

  // Remove circuit breaker
  removeBreaker(name: string): boolean {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.destroy();
      this.breakers.delete(name);
      this.updateGlobalStats();
      return true;
    }
    return false;
  }

  // Get all breakers
  getAllBreakers(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  // Handle breaker state change
  private onBreakerStateChange(
    name: string, 
    state: CircuitState, 
    stats: CircuitBreakerStats
  ): void {
    console.log(`Circuit breaker '${name}' changed to ${state}`, stats);
    this.updateGlobalStats();
    
    // Emit global event (in real implementation, use event emitter)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('circuitBreakerStateChange', {
        detail: { name, state, stats }
      }));
    }
  }

  // Update global statistics
  private updateGlobalStats(): void {
    const breakers = Array.from(this.breakers.values());
    const stats = breakers.map(b => b.getStats());
    
    this.globalStats = {
      totalBreakers: breakers.length,
      openBreakers: stats.filter(s => s.state === 'OPEN').length,
      halfOpenBreakers: stats.filter(s => s.state === 'HALF_OPEN').length,
      closedBreakers: stats.filter(s => s.state === 'CLOSED').length,
      totalCalls: stats.reduce((sum, s) => sum + s.totalCalls, 0),
      totalFailures: stats.reduce((sum, s) => sum + s.failureCount, 0),
      averageErrorRate: stats.length > 0
        ? stats.reduce((sum, s) => sum + s.errorRate, 0) / stats.length
        : 0
    };
  }

  // Get global statistics
  getGlobalStats(): typeof this.globalStats {
    return { ...this.globalStats };
  }

  // Get detailed report
  getDetailedReport(): {
    globalStats: typeof this.globalStats;
    breakers: Array<{
      name: string;
      stats: CircuitBreakerStats;
      config: CircuitBreakerConfig;
      recentCalls: CallResult<any>[];
    }>;
  } {
    const breakers = Array.from(this.breakers.entries()).map(([name, breaker]) => ({
      name,
      stats: breaker.getStats(),
      config: (breaker as any).config,
      recentCalls: breaker.getCallHistory(10)
    }));
    
    return {
      globalStats: this.getGlobalStats(),
      breakers
    };
  }

  // Bulk operations
  openAllBreakers(): void {
    this.breakers.forEach(breaker => breaker.forceOpen());
  }

  closeAllBreakers(): void {
    this.breakers.forEach(breaker => breaker.forceClose());
  }

  // Health check for all breakers
  async performGlobalHealthCheck(): Promise<{
    healthy: string[];
    unhealthy: string[];
    unknown: string[];
  }> {
    const results = {
      healthy: [] as string[],
      unhealthy: [] as string[],
      unknown: [] as string[]
    };
    
    for (const [name, breaker] of this.breakers.entries()) {
      const stats = breaker.getStats();
      
      if (stats.state === 'CLOSED' && stats.errorRate < 10) {
        results.healthy.push(name);
      } else if (stats.state === 'OPEN') {
        results.unhealthy.push(name);
      } else {
        results.unknown.push(name);
      }
    }
    
    return results;
  }
}

// Utility functions
export const createCircuitBreaker = (
  name: string, 
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker => {
  return CircuitBreakerManager.getInstance().getBreaker(name, config);
};

export const withCircuitBreaker = <T>(
  name: string,
  operation: () => Promise<T>,
  config?: Partial<CircuitBreakerConfig>
): Promise<T> => {
  const breaker = createCircuitBreaker(name, config);
  return breaker.execute(operation);
};

// Pre-configured circuit breakers for common scenarios
export const apiCircuitBreaker = createCircuitBreaker('api', {
  failureThreshold: 5,
  recoveryTimeout: 30000,
  timeout: 10000,
  errorThresholdPercentage: 50
});

export const databaseCircuitBreaker = createCircuitBreaker('database', {
  failureThreshold: 3,
  recoveryTimeout: 60000,
  timeout: 5000,
  errorThresholdPercentage: 30
});

export const externalServiceCircuitBreaker = createCircuitBreaker('external-service', {
  failureThreshold: 10,
  recoveryTimeout: 120000,
  timeout: 15000,
  errorThresholdPercentage: 60
});

// Export manager instance
export const circuitBreakerManager = CircuitBreakerManager.getInstance();

export { CircuitBreaker, CircuitBreakerManager };
export type { 
  CircuitState, 
  CircuitBreakerConfig, 
  CircuitBreakerStats, 
  CallResult, 
  HealthCheck 
};
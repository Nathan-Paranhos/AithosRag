import { logger } from './logger';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  attempts: number;
  totalTime: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error) => {
    // Retry on network errors, timeouts, and 5xx server errors
    if (error?.name === 'NetworkError' || error?.name === 'TimeoutError') {
      return true;
    }
    if (error?.status >= 500 && error?.status < 600) {
      return true;
    }
    // Retry on specific error codes
    if (error?.code === 'NETWORK_ERROR' || error?.code === 'TIMEOUT') {
      return true;
    }
    return false;
  }
};

export class RetryManager {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  private calculateDelay(attempt: number): number {
    const delay = this.config.baseDelay * Math.pow(this.config.backoffFactor, attempt - 1);
    return Math.min(delay, this.config.maxDelay);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async execute<T>(
    operation: () => Promise<T>,
    context?: string,
    customConfig?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const config = customConfig ? { ...this.config, ...customConfig } : this.config;
    const startTime = Date.now();
    let lastError: any;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        logger.debug(
          `Executing operation (attempt ${attempt}/${config.maxAttempts})`,
          context || 'Retry',
          { attempt, maxAttempts: config.maxAttempts }
        );

        const result = await operation();
        
        const totalTime = Date.now() - startTime;
        logger.info(
          `Operation succeeded on attempt ${attempt}`,
          context || 'Retry',
          { attempt, totalTime }
        );

        return {
          success: true,
          data: result,
          attempts: attempt,
          totalTime
        };
      } catch (error) {
        lastError = error;
        
        logger.warn(
          `Operation failed on attempt ${attempt}`,
          context || 'Retry',
          { attempt, error: error.message || error }
        );

        // Check if we should retry
        const shouldRetry = attempt < config.maxAttempts && 
                           (config.retryCondition ? config.retryCondition(error) : true);

        if (!shouldRetry) {
          logger.error(
            `Operation failed permanently after ${attempt} attempts`,
            context || 'Retry',
            { attempt, error: error.message || error },
            error
          );
          break;
        }

        // Call retry callback if provided
        if (config.onRetry) {
          config.onRetry(attempt, error);
        }

        // Wait before next attempt (except for the last attempt)
        if (attempt < config.maxAttempts) {
          const delay = this.calculateDelay(attempt);
          logger.debug(
            `Waiting ${delay}ms before retry`,
            context || 'Retry',
            { attempt, delay }
          );
          await this.sleep(delay);
        }
      }
    }

    const totalTime = Date.now() - startTime;
    return {
      success: false,
      error: lastError,
      attempts: config.maxAttempts,
      totalTime
    };
  }
}

// Default retry manager instance
export const retryManager = new RetryManager();

// Convenience functions for common retry scenarios
export async function retryFetch(
  url: string,
  options?: RequestInit,
  config?: Partial<RetryConfig>
): Promise<Response> {
  const result = await retryManager.execute(
    async () => {
      const response = await fetch(url, options);
      
      // Throw error for non-ok responses to trigger retry logic
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        (error as any).status = response.status;
        (error as any).response = response;
        throw error;
      }
      
      return response;
    },
    'FetchRetry',
    config
  );

  if (!result.success) {
    throw result.error;
  }

  return result.data!;
}

export async function retryApiCall<T>(
  apiCall: () => Promise<T>,
  context?: string,
  config?: Partial<RetryConfig>
): Promise<T> {
  const result = await retryManager.execute(apiCall, context, config);
  
  if (!result.success) {
    throw result.error;
  }
  
  return result.data!;
}

// Network-specific retry configurations
export const NETWORK_RETRY_CONFIG: Partial<RetryConfig> = {
  maxAttempts: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  retryCondition: (error) => {
    // More aggressive retry for network issues
    return error?.name === 'NetworkError' ||
           error?.name === 'TimeoutError' ||
           error?.code === 'NETWORK_ERROR' ||
           error?.code === 'TIMEOUT' ||
           (error?.status >= 500 && error?.status < 600) ||
           error?.status === 429; // Rate limiting
  }
};

export const API_RETRY_CONFIG: Partial<RetryConfig> = {
  maxAttempts: 3,
  baseDelay: 500,
  maxDelay: 5000,
  backoffFactor: 1.5,
  retryCondition: (error) => {
    // Retry on server errors and rate limiting
    return (error?.status >= 500 && error?.status < 600) ||
           error?.status === 429 ||
           error?.status === 408; // Request timeout
  }
};

export const CRITICAL_RETRY_CONFIG: Partial<RetryConfig> = {
  maxAttempts: 10,
  baseDelay: 2000,
  maxDelay: 60000,
  backoffFactor: 2.5,
  retryCondition: () => true // Retry everything for critical operations
};

// Utility function to create a retry wrapper for any async function
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  config?: Partial<RetryConfig>
): T {
  return (async (...args: Parameters<T>) => {
    return retryApiCall(() => fn(...args), fn.name, config);
  }) as T;
}

// Circuit breaker pattern for preventing cascade failures
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,
    private resetTimeout: number = 30000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
        logger.info('Circuit breaker transitioning to half-open', 'CircuitBreaker');
      } else {
        const error = new Error('Circuit breaker is open');
        logger.warn('Circuit breaker rejected request', 'CircuitBreaker');
        throw error;
      }
    }

    try {
      const result = await operation();
      
      if (this.state === 'half-open') {
        this.reset();
        logger.info('Circuit breaker reset to closed', 'CircuitBreaker');
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
      logger.error(
        `Circuit breaker opened after ${this.failures} failures`,
        'CircuitBreaker',
        { failures: this.failures, threshold: this.threshold }
      );
    }
  }

  private reset(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  getState(): { state: string; failures: number } {
    return {
      state: this.state,
      failures: this.failures
    };
  }
}
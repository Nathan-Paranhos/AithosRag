import { Logger } from './logger';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'timing' | 'counter' | 'gauge';
  tags?: Record<string, string>;
}

interface PerformanceConfig {
  enableAutoMetrics: boolean;
  enableUserTiming: boolean;
  enableResourceTiming: boolean;
  enableNavigationTiming: boolean;
  sampleRate: number;
  bufferSize: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private config: PerformanceConfig;
  private logger: Logger;
  private observer?: PerformanceObserver;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enableAutoMetrics: true,
      enableUserTiming: true,
      enableResourceTiming: true,
      enableNavigationTiming: true,
      sampleRate: 1.0,
      bufferSize: 100,
      ...config
    };
    
    this.logger = new Logger({ enableRemoteLogging: false });
    this.init();
  }

  private init(): void {
    if (this.config.enableAutoMetrics && 'PerformanceObserver' in window) {
      this.setupPerformanceObserver();
    }

    if (this.config.enableNavigationTiming) {
      this.measureNavigationTiming();
    }

    // Monitor Core Web Vitals
    this.setupWebVitals();
  }

  private setupPerformanceObserver(): void {
    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPerformanceEntry(entry);
        }
      });

      // Observe different types of performance entries
      const entryTypes = ['measure', 'navigation', 'resource', 'paint'];
      
      entryTypes.forEach(type => {
        try {
          this.observer!.observe({ entryTypes: [type] });
        } catch (error) {
          this.logger.warn(`Failed to observe ${type} entries`, { error });
        }
      });
    } catch (error) {
      this.logger.error('Failed to setup PerformanceObserver', { error });
    }
  }

  private processPerformanceEntry(entry: PerformanceEntry): void {
    if (Math.random() > this.config.sampleRate) return;

    const metric: PerformanceMetric = {
      name: entry.name,
      value: entry.duration || 0,
      timestamp: Date.now(),
      type: 'timing',
      tags: {
        entryType: entry.entryType,
        ...(entry.entryType === 'resource' && {
          resourceType: (entry as PerformanceResourceTiming).initiatorType
        })
      }
    };

    this.addMetric(metric);
  }

  private measureNavigationTiming(): void {
    if (!('performance' in window) || !performance.timing) return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = performance.timing;
        const navigationStart = timing.navigationStart;

        const metrics = [
          {
            name: 'dns_lookup',
            value: timing.domainLookupEnd - timing.domainLookupStart
          },
          {
            name: 'tcp_connect',
            value: timing.connectEnd - timing.connectStart
          },
          {
            name: 'request_response',
            value: timing.responseEnd - timing.requestStart
          },
          {
            name: 'dom_processing',
            value: timing.domComplete - timing.domLoading
          },
          {
            name: 'page_load',
            value: timing.loadEventEnd - navigationStart
          }
        ];

        metrics.forEach(({ name, value }) => {
          if (value > 0) {
            this.addMetric({
              name,
              value,
              timestamp: Date.now(),
              type: 'timing',
              tags: { category: 'navigation' }
            });
          }
        });
      }, 0);
    });
  }

  private setupWebVitals(): void {
    // First Contentful Paint (FCP)
    this.observePaint('first-contentful-paint');
    
    // Largest Contentful Paint (LCP)
    this.observeLCP();
    
    // First Input Delay (FID)
    this.observeFID();
    
    // Cumulative Layout Shift (CLS)
    this.observeCLS();
  }

  private observePaint(paintType: string): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === paintType) {
              this.addMetric({
                name: paintType.replace(/-/g, '_'),
                value: entry.startTime,
                timestamp: Date.now(),
                type: 'timing',
                tags: { category: 'web_vitals' }
              });
            }
          }
        });
        observer.observe({ entryTypes: ['paint'] });
      } catch (error) {
        this.logger.warn(`Failed to observe ${paintType}`, { error });
      }
    }
  }

  private observeLCP(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          
          this.addMetric({
            name: 'largest_contentful_paint',
            value: lastEntry.startTime,
            timestamp: Date.now(),
            type: 'timing',
            tags: { category: 'web_vitals' }
          });
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        this.logger.warn('Failed to observe LCP', { error });
      }
    }
  }

  private observeFID(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.addMetric({
              name: 'first_input_delay',
              value: (entry as any).processingStart - entry.startTime,
              timestamp: Date.now(),
              type: 'timing',
              tags: { category: 'web_vitals' }
            });
          }
        });
        observer.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        this.logger.warn('Failed to observe FID', { error });
      }
    }
  }

  private observeCLS(): void {
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          
          this.addMetric({
            name: 'cumulative_layout_shift',
            value: clsValue,
            timestamp: Date.now(),
            type: 'gauge',
            tags: { category: 'web_vitals' }
          });
        });
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        this.logger.warn('Failed to observe CLS', { error });
      }
    }
  }

  public addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep buffer size manageable
    if (this.metrics.length > this.config.bufferSize) {
      this.metrics = this.metrics.slice(-this.config.bufferSize);
    }

    // Log performance issues
    this.checkPerformanceThresholds(metric);
  }

  private checkPerformanceThresholds(metric: PerformanceMetric): void {
    const thresholds = {
      page_load: 3000,
      first_contentful_paint: 1800,
      largest_contentful_paint: 2500,
      first_input_delay: 100,
      cumulative_layout_shift: 0.1
    };

    const threshold = thresholds[metric.name as keyof typeof thresholds];
    if (threshold && metric.value > threshold) {
      this.logger.warn('Performance threshold exceeded', {
        metric: metric.name,
        value: metric.value,
        threshold,
        tags: metric.tags
      });
    }
  }

  public startTiming(name: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.addMetric({
        name,
        value: duration,
        timestamp: Date.now(),
        type: 'timing',
        tags: { category: 'custom' }
      });
    };
  }

  public measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const endTiming = this.startTiming(name);
    
    return fn().finally(() => {
      endTiming();
    });
  }

  public measureSync<T>(name: string, fn: () => T): T {
    const endTiming = this.startTiming(name);
    
    try {
      return fn();
    } finally {
      endTiming();
    }
  }

  public incrementCounter(name: string, value: number = 1, tags?: Record<string, string>): void {
    this.addMetric({
      name,
      value,
      timestamp: Date.now(),
      type: 'counter',
      tags
    });
  }

  public setGauge(name: string, value: number, tags?: Record<string, string>): void {
    this.addMetric({
      name,
      value,
      timestamp: Date.now(),
      type: 'gauge',
      tags
    });
  }

  public getMetrics(filter?: Partial<PerformanceMetric>): PerformanceMetric[] {
    if (!filter) return [...this.metrics];
    
    return this.metrics.filter(metric => {
      return Object.entries(filter).every(([key, value]) => {
        return metric[key as keyof PerformanceMetric] === value;
      });
    });
  }

  public getAverageMetric(name: string, timeWindow?: number): number {
    const now = Date.now();
    const windowStart = timeWindow ? now - timeWindow : 0;
    
    const relevantMetrics = this.metrics.filter(metric => 
      metric.name === name && metric.timestamp >= windowStart
    );
    
    if (relevantMetrics.length === 0) return 0;
    
    const sum = relevantMetrics.reduce((acc, metric) => acc + metric.value, 0);
    return sum / relevantMetrics.length;
  }

  public clearMetrics(): void {
    this.metrics = [];
  }

  public startSession(): void {
    this.addMetric({
      name: 'session_start',
      value: Date.now(),
      timestamp: Date.now(),
      type: 'counter',
      tags: { category: 'session' }
    });
    this.logger.info('Performance monitoring session started');
  }

  public endSession(): void {
    this.addMetric({
      name: 'session_end',
      value: Date.now(),
      timestamp: Date.now(),
      type: 'counter',
      tags: { category: 'session' }
    });
    this.logger.info('Performance monitoring session ended');
  }

  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.clearMetrics();
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Utility functions
export const measurePerformance = {
  start: (name: string) => performanceMonitor.startTiming(name),
  async: <T>(name: string, fn: () => Promise<T>) => performanceMonitor.measureAsync(name, fn),
  sync: <T>(name: string, fn: () => T) => performanceMonitor.measureSync(name, fn),
  counter: (name: string, value?: number, tags?: Record<string, string>) => 
    performanceMonitor.incrementCounter(name, value, tags),
  gauge: (name: string, value: number, tags?: Record<string, string>) => 
    performanceMonitor.setGauge(name, value, tags)
};

// React Hook for performance monitoring
export const usePerformanceMonitor = () => {
  return {
    startTiming: performanceMonitor.startTiming.bind(performanceMonitor),
    measureAsync: performanceMonitor.measureAsync.bind(performanceMonitor),
    measureSync: performanceMonitor.measureSync.bind(performanceMonitor),
    incrementCounter: performanceMonitor.incrementCounter.bind(performanceMonitor),
    setGauge: performanceMonitor.setGauge.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    getAverageMetric: performanceMonitor.getAverageMetric.bind(performanceMonitor)
  };
};

// Collect all performance metrics
export const collectPerformanceMetrics = () => {
  return performanceMonitor.getMetrics();
};

// Get memory usage information
export const getMemoryUsage = () => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit
    };
  }
  return null;
};

export { PerformanceMonitor, type PerformanceMetric, type PerformanceConfig };
import { useState, useEffect, useCallback } from 'react';

// Performance API type extensions
interface PerformanceEntryWithProcessing extends PerformanceEntry {
  processingStart?: number;
}

interface LayoutShiftEntry extends PerformanceEntry {
  hadRecentInput?: boolean;
  value?: number;
}

interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: PerformanceMemory;
}

// Type definitions for browser APIs
interface NetworkInformation {
  downlink: number;
  rtt: number;
  effectiveType?: string;
  saveData?: boolean;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

/**
 * Performance Monitoring System
 * Provides comprehensive performance tracking and analytics for enterprise applications
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'timing' | 'counter' | 'gauge' | 'histogram';
  tags?: Record<string, string>;
}

export interface PerformanceReport {
  metrics: PerformanceMetric[];
  summary: {
    totalMetrics: number;
    timeRange: { start: number; end: number };
    categories: Record<string, number>;
  };
  recommendations: string[];
}

/**
 * Core Performance Monitor
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private maxMetrics = 1000;
  private isEnabled = true;

  constructor() {
    this.initializeObservers();
    this.startPeriodicCollection();
  }

  /**
   * Record a custom metric
   */
  recordMetric(
    name: string,
    value: number,
    type: PerformanceMetric['type'] = 'gauge',
    tags?: Record<string, string>
  ): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      type,
      tags
    };

    this.metrics.push(metric);
    this.trimMetrics();
  }

  /**
   * Start timing an operation
   */
  startTiming(name: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration, 'timing');
    };
  }

  /**
   * Measure function execution time
   */
  measureFunction<T extends (...args: unknown[]) => unknown>(
    fn: T,
    name?: string
  ): T {
    const metricName = name || fn.name || 'anonymous_function';
    
    return ((...args: Parameters<T>) => {
      const endTiming = this.startTiming(metricName);
      try {
        const result = fn(...args);
        
        // Handle async functions
        if (result instanceof Promise) {
          return result.finally(() => endTiming()) as ReturnType<T>;
        }
        
        endTiming();
        return result;
      } catch (error) {
        endTiming();
        this.recordMetric(`${metricName}_error`, 1, 'counter');
        throw error;
      }
    }) as T;
  }

  /**
   * Get performance report
   */
  getReport(timeRange?: { start: number; end: number }): PerformanceReport {
    const filteredMetrics = timeRange
      ? this.metrics.filter(m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end)
      : this.metrics;

    const categories = filteredMetrics.reduce((acc, metric) => {
      const category = metric.name.split('_')[0] || 'other';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recommendations = this.generateRecommendations(filteredMetrics);

    return {
      metrics: filteredMetrics,
      summary: {
        totalMetrics: filteredMetrics.length,
        timeRange: timeRange || {
          start: Math.min(...filteredMetrics.map(m => m.timestamp)),
          end: Math.max(...filteredMetrics.map(m => m.timestamp))
        },
        categories
      },
      recommendations
    };
  }

  /**
   * Get real-time performance stats
   */
  getRealTimeStats(): {
    memory: MemoryInfo | null;
    timing: {
      navigationStart: number;
      loadEventEnd: number;
      domContentLoaded: number;
      firstPaint: number;
      firstContentfulPaint: number;
      largestContentfulPaint: number;
      firstInputDelay: number;
      cumulativeLayoutShift: number;
    };
    resources: {
      totalResources: number;
      slowResources: number;
      failedResources: number;
    };
  } {
    const memory = (performance as Performance & { memory?: MemoryInfo }).memory || null;
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    const resources = performance.getEntriesByType('resource');

    // Get Core Web Vitals
    const lcp = this.getMetricValue('largest-contentful-paint');
    const fid = this.getMetricValue('first-input-delay');
    const cls = this.getMetricValue('cumulative-layout-shift');

    return {
      memory,
      timing: {
        navigationStart: navigation?.navigationStart || 0,
        loadEventEnd: navigation?.loadEventEnd || 0,
        domContentLoaded: navigation?.domContentLoadedEventEnd || 0,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        largestContentfulPaint: lcp,
        firstInputDelay: fid,
        cumulativeLayoutShift: cls
      },
      resources: {
        totalResources: resources.length,
        slowResources: resources.filter(r => r.duration > 1000).length,
        failedResources: resources.filter(r => (r as PerformanceResourceTiming).transferSize === 0).length
      }
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['name', 'value', 'timestamp', 'type', 'tags'];
      const rows = this.metrics.map(m => [
        m.name,
        m.value.toString(),
        m.timestamp.toString(),
        m.type,
        JSON.stringify(m.tags || {})
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    return JSON.stringify(this.metrics, null, 2);
  }

  private initializeObservers(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    // General performance observer
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric(`${entry.entryType}_${entry.name}`, entry.duration || 0, 'timing');
      }
    });
    
    try {
      observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
    } catch (error) {
      console.warn('Performance observer not supported:', error);
    }
    this.observers.push(observer);

    // Long task observer
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('long_task', entry.duration, 'timing');
      }
    });
    
    try {
      longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      console.warn('Long task observer not supported:', error);
    }
    this.observers.push(longTaskObserver);

    // Observe navigation timing
    try {
      const navObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const nav = entry as PerformanceNavigationTiming;
            this.recordMetric('navigation_duration', nav.loadEventEnd - nav.navigationStart, 'timing');
            this.recordMetric('dom_content_loaded', nav.domContentLoadedEventEnd - nav.navigationStart, 'timing');
          }
        });
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);
    } catch (error) {
      console.warn('Navigation observer not supported:', error);
    }

    // Observe resource timing
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'resource') {
            const resource = entry as PerformanceResourceTiming;
            this.recordMetric(`resource_${this.getResourceType(resource.name)}`, resource.duration, 'timing');
            
            if (resource.duration > 1000) {
              this.recordMetric('slow_resource', 1, 'counter', {
                url: resource.name,
                duration: resource.duration.toString()
              });
            }
          }
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (error) {
      console.warn('Resource observer not supported:', error);
    }

    // Observe Core Web Vitals
    this.observeWebVitals();
  }

  private observeWebVitals(): void {
    // Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('largest_contentful_paint', lastEntry.startTime, 'timing');
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);
    } catch (error) {
      console.warn('LCP observer not supported:', error);
    }

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const entryWithProcessing = entry as PerformanceEntryWithProcessing;
          if (entryWithProcessing.processingStart) {
            this.recordMetric('first_input_delay', entryWithProcessing.processingStart - entry.startTime, 'timing');
          }
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);
    } catch (error) {
      console.warn('FID observer not supported:', error);
    }

    // Cumulative Layout Shift
    try {
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        list.getEntries().forEach((entry) => {
          const layoutEntry = entry as LayoutShiftEntry;
          if (!layoutEntry.hadRecentInput && layoutEntry.value) {
            clsValue += layoutEntry.value;
          }
        });
        this.recordMetric('cumulative_layout_shift', clsValue, 'gauge');
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (error) {
      console.warn('CLS observer not supported:', error);
    }
  }

  private startPeriodicCollection(): void {
    setInterval(() => {
      if (!this.isEnabled) return;

      // Collect memory usage
      const memory = (performance as PerformanceWithMemory).memory;
      if (memory) {
        this.recordMetric('memory_used', memory.usedJSHeapSize, 'gauge');
        this.recordMetric('memory_total', memory.totalJSHeapSize, 'gauge');
        this.recordMetric('memory_limit', memory.jsHeapSizeLimit, 'gauge');
      }

      // Collect connection info
      const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
      if (connection) {
        this.recordMetric('network_downlink', connection.downlink, 'gauge');
        this.recordMetric('network_rtt', connection.rtt, 'gauge');
      }
    }, 30000); // Every 30 seconds
  }

  private trimMetrics(): void {
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  private getResourceType(url: string): string {
    if (url.match(/\.(js|mjs)$/)) return 'script';
    if (url.match(/\.(css)$/)) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
    return 'other';
  }

  private getMetricValue(name: string): number {
    const metric = this.metrics.find(m => m.name === name);
    return metric ? metric.value : 0;
  }

  private generateRecommendations(metrics: PerformanceMetric[]): string[] {
    const recommendations: string[] = [];
    
    // Check for slow resources
    const slowResources = metrics.filter(m => m.name.startsWith('resource_') && m.value > 1000);
    if (slowResources.length > 0) {
      recommendations.push(`Optimize ${slowResources.length} slow-loading resources`);
    }

    // Check memory usage
    const memoryMetrics = metrics.filter(m => m.name === 'memory_used');
    if (memoryMetrics.length > 0) {
      const avgMemory = memoryMetrics.reduce((sum, m) => sum + m.value, 0) / memoryMetrics.length;
      if (avgMemory > 50 * 1024 * 1024) { // 50MB
        recommendations.push('Consider optimizing memory usage - average usage is high');
      }
    }

    // Check Core Web Vitals
    const lcp = this.getMetricValue('largest_contentful_paint');
    if (lcp > 2500) {
      recommendations.push('Improve Largest Contentful Paint (LCP) - currently above 2.5s threshold');
    }

    const fid = this.getMetricValue('first_input_delay');
    if (fid > 100) {
      recommendations.push('Reduce First Input Delay (FID) - currently above 100ms threshold');
    }

    const cls = this.getMetricValue('cumulative_layout_shift');
    if (cls > 0.1) {
      recommendations.push('Minimize Cumulative Layout Shift (CLS) - currently above 0.1 threshold');
    }

    return recommendations;
  }

  /**
   * Cleanup observers
   */
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = [];
  }
}

/**
 * React Hook for Performance Monitoring
 */
export function usePerformanceMonitor() {
  const [monitor] = useState(() => new PerformanceMonitor());
  const [stats, setStats] = useState(monitor.getRealTimeStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(monitor.getRealTimeStats());
    }, 5000); // Update every 5 seconds

    return () => {
      clearInterval(interval);
      monitor.destroy();
    };
  }, [monitor]);

  const recordMetric = useCallback(
    (name: string, value: number, type?: PerformanceMetric['type'], tags?: Record<string, string>) => {
      monitor.recordMetric(name, value, type, tags);
    },
    [monitor]
  );

  const measureFunction = useCallback(
    <T extends (...args: unknown[]) => unknown>(fn: T, name?: string) => {
      return monitor.measureFunction(fn, name);
    },
    [monitor]
  );

  const getReport = useCallback(
    (timeRange?: { start: number; end: number }) => {
      return monitor.getReport(timeRange);
    },
    [monitor]
  );

  return {
    stats,
    recordMetric,
    measureFunction,
    getReport,
    monitor
  };
}

// Global performance monitor instance
export const globalPerformanceMonitor = new PerformanceMonitor();

// Performance decorator
export function performanceTracked<T extends (...args: unknown[]) => unknown>(
  target: unknown,
  propertyName: string,
  descriptor: TypedPropertyDescriptor<T>
): TypedPropertyDescriptor<T> {
  const originalMethod = descriptor.value!;
  
  descriptor.value = globalPerformanceMonitor.measureFunction(
    originalMethod,
    `${target.constructor.name}.${propertyName}`
  ) as T;
  
  return descriptor;
}

// Auto-start monitoring in browser environment
if (typeof window !== 'undefined') {
  // Start global monitoring
  globalPerformanceMonitor.setEnabled(true);
  
  // Export to window for debugging
  (window as Window & { __performanceMonitor?: PerformanceMonitor }).__performanceMonitor = globalPerformanceMonitor;
}
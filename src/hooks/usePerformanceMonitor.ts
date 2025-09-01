import { useState, useEffect, useCallback } from 'react';
import { collectPerformanceMetrics, getMemoryUsage } from '../utils/performance';

interface PerformanceMetrics {
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
  dnsLookup: number;
  tcpConnect: number;
  serverResponse: number;
  memory: {
    used: number;
    total: number;
    limit: number;
  } | null;
}

interface PerformanceMonitorState {
  metrics: PerformanceMetrics | null;
  isLoading: boolean;
  fps: number;
  renderTime: number;
  componentCount: number;
}

export const usePerformanceMonitor = (enabled: boolean = true) => {
  const [state, setState] = useState<PerformanceMonitorState>({
    metrics: null,
    isLoading: true,
    fps: 0,
    renderTime: 0,
    componentCount: 0
  });

  // FPS monitoring
  const [frameCount, setFrameCount] = useState(0);
  const [lastTime, setLastTime] = useState(performance.now());

  const measureFPS = useCallback(() => {
    if (!enabled) return;

    const now = performance.now();
    const delta = now - lastTime;
    
    if (delta >= 1000) {
      const fps = Math.round((frameCount * 1000) / delta);
      setState(prev => ({ ...prev, fps }));
      setFrameCount(0);
      setLastTime(now);
    } else {
      setFrameCount(prev => prev + 1);
    }
    
    requestAnimationFrame(measureFPS);
  }, [enabled, frameCount, lastTime]);

  // Component render measurement is handled internally

  // Memory monitoring
  const monitorMemory = useCallback(() => {
    if (!enabled) return;

    const memory = getMemoryUsage();
    if (memory) {
      setState(prev => ({
        ...prev,
        metrics: prev.metrics ? { ...prev.metrics, memory } : null
      }));

      // Warn about high memory usage (> 80% of limit)
      if (memory.used / memory.limit > 0.8) {
        console.warn(`High memory usage detected: ${memory.used}MB / ${memory.limit}MB`);
      }
    }
  }, [enabled]);

  // Performance observer for long tasks
  useEffect(() => {
    if (!enabled || !('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'longtask') {
          console.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`);
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['longtask'] });
    } catch {
      console.warn('Long task monitoring not supported');
    }

    return () => observer.disconnect();
  }, [enabled]);

  // Initial metrics collection
  useEffect(() => {
    if (!enabled) return;

    const collectInitialMetrics = () => {
      try {
        const metrics = collectPerformanceMetrics();
        setState(prev => ({ ...prev, metrics, isLoading: false }));
      } catch (error) {
        console.error('Failed to collect performance metrics:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    // Wait for page load to complete
    if (document.readyState === 'complete') {
      collectInitialMetrics();
    } else {
      window.addEventListener('load', collectInitialMetrics);
      return () => window.removeEventListener('load', collectInitialMetrics);
    }
  }, [enabled]);

  // Start FPS monitoring
  useEffect(() => {
    if (enabled) {
      requestAnimationFrame(measureFPS);
    }
  }, [enabled, measureFPS]);

  // Memory monitoring interval
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(monitorMemory, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [enabled, monitorMemory]);

  // Performance grade calculation
  const getPerformanceGrade = useCallback(() => {
    if (!state.metrics) return 'N/A';

    const { firstContentfulPaint, domContentLoaded } = state.metrics;
    const { fps } = state;

    let score = 100;

    // FCP scoring (Google's thresholds)
    if (firstContentfulPaint > 2500) score -= 30;
    else if (firstContentfulPaint > 1800) score -= 15;

    // DOM Content Loaded scoring
    if (domContentLoaded > 3000) score -= 20;
    else if (domContentLoaded > 1500) score -= 10;

    // FPS scoring
    if (fps < 30) score -= 25;
    else if (fps < 50) score -= 10;

    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }, [state.metrics, state.fps]);

  // Performance recommendations
  const getRecommendations = useCallback(() => {
    if (!state.metrics) return [];

    const recommendations: string[] = [];
    const { firstContentfulPaint, domContentLoaded, memory } = state.metrics;
    const { fps, renderTime } = state;

    if (firstContentfulPaint > 2500) {
      recommendations.push('Optimize critical rendering path and reduce initial bundle size');
    }

    if (domContentLoaded > 3000) {
      recommendations.push('Reduce JavaScript execution time and optimize resource loading');
    }

    if (fps < 50) {
      recommendations.push('Optimize animations and reduce main thread work');
    }

    if (renderTime > 16) {
      recommendations.push('Optimize component rendering and consider memoization');
    }

    if (memory && memory.used / memory.limit > 0.7) {
      recommendations.push('Optimize memory usage and check for memory leaks');
    }

    return recommendations;
  }, [state]);

  return {
    ...state,
    performanceGrade: getPerformanceGrade(),
    recommendations: getRecommendations(),
    refresh: () => {
      setState(prev => ({ ...prev, isLoading: true }));
      const metrics = collectPerformanceMetrics();
      setState(prev => ({ ...prev, metrics, isLoading: false }));
    }
  };
};

export default usePerformanceMonitor;
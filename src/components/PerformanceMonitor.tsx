import React, { useState, useEffect, useRef } from 'react';
import { Activity, Zap, Clock, Database, Wifi, AlertTriangle } from 'lucide-react';
import { cn } from '../utils/cn';

interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
  
  // Runtime metrics
  memoryUsage: number;
  jsHeapSize: number;
  domNodes: number;
  
  // Network metrics
  connectionType: string;
  effectiveType: string;
  rtt: number;
  downlink: number;
  
  // Custom metrics
  renderTime: number;
  bundleSize: number;
  cacheHitRate: number;
}

interface PerformanceThresholds {
  lcp: { good: number; poor: number };
  fid: { good: number; poor: number };
  cls: { good: number; poor: number };
  fcp: { good: number; poor: number };
  ttfb: { good: number; poor: number };
}

const THRESHOLDS: PerformanceThresholds = {
  lcp: { good: 2500, poor: 4000 },
  fid: { good: 100, poor: 300 },
  cls: { good: 0.1, poor: 0.25 },
  fcp: { good: 1800, poor: 3000 },
  ttfb: { good: 800, poor: 1800 }
};

interface PerformanceMonitorProps {
  className?: string;
  showDetails?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  className,
  showDetails = false,
  autoRefresh = true,
  refreshInterval = 5000,
  onMetricsUpdate
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [performanceScore, setPerformanceScore] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const observerRef = useRef<PerformanceObserver | null>(null);

  // Collect Core Web Vitals
  const collectWebVitals = (): Promise<Partial<PerformanceMetrics>> => {
    return new Promise((resolve) => {
      const vitals: Partial<PerformanceMetrics> = {};
      
      // LCP Observer
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        vitals.lcp = lastEntry.startTime;
      });
      
      // FID Observer
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          vitals.fid = entry.processingStart - entry.startTime;
        });
      });
      
      // CLS Observer
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        vitals.cls = clsValue;
      });
      
      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        fidObserver.observe({ entryTypes: ['first-input'] });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        
        // Get navigation timing
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          vitals.fcp = navigation.responseStart - navigation.fetchStart;
          vitals.ttfb = navigation.responseStart - navigation.requestStart;
        }
        
        setTimeout(() => {
          lcpObserver.disconnect();
          fidObserver.disconnect();
          clsObserver.disconnect();
          resolve(vitals);
        }, 3000);
      } catch (error) {
        console.warn('Performance Observer not supported:', error);
        resolve(vitals);
      }
    });
  };

  // Collect runtime metrics
  const collectRuntimeMetrics = (): Partial<PerformanceMetrics> => {
    const runtime: Partial<PerformanceMetrics> = {};
    
    // Memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      runtime.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      runtime.jsHeapSize = memory.totalJSHeapSize / 1024 / 1024; // MB
    }
    
    // DOM nodes count
    runtime.domNodes = document.querySelectorAll('*').length;
    
    // Network information
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      runtime.connectionType = connection.type || 'unknown';
      runtime.effectiveType = connection.effectiveType || 'unknown';
      runtime.rtt = connection.rtt || 0;
      runtime.downlink = connection.downlink || 0;
    }
    
    return runtime;
  };

  // Calculate performance score
  const calculatePerformanceScore = (metrics: PerformanceMetrics): number => {
    const scores = {
      lcp: metrics.lcp <= THRESHOLDS.lcp.good ? 100 : 
           metrics.lcp <= THRESHOLDS.lcp.poor ? 50 : 0,
      fid: metrics.fid <= THRESHOLDS.fid.good ? 100 : 
           metrics.fid <= THRESHOLDS.fid.poor ? 50 : 0,
      cls: metrics.cls <= THRESHOLDS.cls.good ? 100 : 
           metrics.cls <= THRESHOLDS.cls.poor ? 50 : 0,
      fcp: metrics.fcp <= THRESHOLDS.fcp.good ? 100 : 
           metrics.fcp <= THRESHOLDS.fcp.poor ? 50 : 0,
      ttfb: metrics.ttfb <= THRESHOLDS.ttfb.good ? 100 : 
            metrics.ttfb <= THRESHOLDS.ttfb.poor ? 50 : 0
    };
    
    return Math.round(
      (scores.lcp + scores.fid + scores.cls + scores.fcp + scores.ttfb) / 5
    );
  };

  // Collect all metrics
  const collectMetrics = async (): Promise<void> => {
    setIsCollecting(true);
    
    try {
      const webVitals = await collectWebVitals();
      const runtimeMetrics = collectRuntimeMetrics();
      
      const allMetrics: PerformanceMetrics = {
        lcp: webVitals.lcp || 0,
        fid: webVitals.fid || 0,
        cls: webVitals.cls || 0,
        fcp: webVitals.fcp || 0,
        ttfb: webVitals.ttfb || 0,
        memoryUsage: runtimeMetrics.memoryUsage || 0,
        jsHeapSize: runtimeMetrics.jsHeapSize || 0,
        domNodes: runtimeMetrics.domNodes || 0,
        connectionType: runtimeMetrics.connectionType || 'unknown',
        effectiveType: runtimeMetrics.effectiveType || 'unknown',
        rtt: runtimeMetrics.rtt || 0,
        downlink: runtimeMetrics.downlink || 0,
        renderTime: performance.now(),
        bundleSize: 0, // Would be populated by bundle analyzer
        cacheHitRate: 0 // Would be calculated from cache metrics
      };
      
      setMetrics(allMetrics);
      setPerformanceScore(calculatePerformanceScore(allMetrics));
      onMetricsUpdate?.(allMetrics);
    } catch (error) {
      console.error('Error collecting performance metrics:', error);
    } finally {
      setIsCollecting(false);
    }
  };

  // Get metric status color
  const getMetricStatus = (value: number, thresholds: { good: number; poor: number }, reverse = false): string => {
    if (reverse) {
      return value <= thresholds.good ? 'text-green-500' : 
             value <= thresholds.poor ? 'text-yellow-500' : 'text-red-500';
    }
    return value >= thresholds.poor ? 'text-red-500' : 
           value >= thresholds.good ? 'text-yellow-500' : 'text-green-500';
  };

  // Format metric value
  const formatMetric = (value: number, unit: string): string => {
    if (unit === 'ms') {
      return `${Math.round(value)}ms`;
    }
    if (unit === 'MB') {
      return `${value.toFixed(1)}MB`;
    }
    if (unit === 'score') {
      return value.toFixed(3);
    }
    return value.toString();
  };

  useEffect(() => {
    collectMetrics();
    
    if (autoRefresh) {
      intervalRef.current = setInterval(collectMetrics, refreshInterval);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [autoRefresh, refreshInterval]);

  if (!metrics) {
    return (
      <div className={cn('flex items-center gap-2 p-4 bg-gray-50 rounded-lg', className)}>
        <Activity className="w-4 h-4 animate-spin" />
        <span className="text-sm text-gray-600">Collecting performance metrics...</span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Performance Score */}
      <div className="flex items-center gap-4 p-4 bg-white rounded-lg border shadow-sm">
        <div className="flex items-center gap-2">
          <Zap className={cn(
            'w-5 h-5',
            performanceScore >= 90 ? 'text-green-500' :
            performanceScore >= 50 ? 'text-yellow-500' : 'text-red-500'
          )} />
          <span className="font-medium">Performance Score</span>
        </div>
        <div className={cn(
          'text-2xl font-bold',
          performanceScore >= 90 ? 'text-green-500' :
          performanceScore >= 50 ? 'text-yellow-500' : 'text-red-500'
        )}>
          {performanceScore}
        </div>
        {isCollecting && (
          <Activity className="w-4 h-4 animate-spin text-blue-500" />
        )}
      </div>

      {/* Core Web Vitals */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-3 bg-white rounded-lg border">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-600">LCP</span>
          </div>
          <div className={cn(
            'text-lg font-bold',
            getMetricStatus(metrics.lcp, THRESHOLDS.lcp)
          )}>
            {formatMetric(metrics.lcp, 'ms')}
          </div>
        </div>
        
        <div className="p-3 bg-white rounded-lg border">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-gray-600">FID</span>
          </div>
          <div className={cn(
            'text-lg font-bold',
            getMetricStatus(metrics.fid, THRESHOLDS.fid)
          )}>
            {formatMetric(metrics.fid, 'ms')}
          </div>
        </div>
        
        <div className="p-3 bg-white rounded-lg border">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium text-gray-600">CLS</span>
          </div>
          <div className={cn(
            'text-lg font-bold',
            getMetricStatus(metrics.cls, THRESHOLDS.cls)
          )}>
            {formatMetric(metrics.cls, 'score')}
          </div>
        </div>
        
        <div className="p-3 bg-white rounded-lg border">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-medium text-gray-600">FCP</span>
          </div>
          <div className={cn(
            'text-lg font-bold',
            getMetricStatus(metrics.fcp, THRESHOLDS.fcp)
          )}>
            {formatMetric(metrics.fcp, 'ms')}
          </div>
        </div>
        
        <div className="p-3 bg-white rounded-lg border">
          <div className="flex items-center gap-2 mb-1">
            <Wifi className="w-4 h-4 text-cyan-500" />
            <span className="text-xs font-medium text-gray-600">TTFB</span>
          </div>
          <div className={cn(
            'text-lg font-bold',
            getMetricStatus(metrics.ttfb, THRESHOLDS.ttfb)
          )}>
            {formatMetric(metrics.ttfb, 'ms')}
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      {showDetails && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-lg border">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Memory Usage
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Used Heap:</span>
                <span className="font-medium">{formatMetric(metrics.memoryUsage, 'MB')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Heap:</span>
                <span className="font-medium">{formatMetric(metrics.jsHeapSize, 'MB')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">DOM Nodes:</span>
                <span className="font-medium">{metrics.domNodes}</span>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-white rounded-lg border">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              Network Info
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Connection:</span>
                <span className="font-medium">{metrics.connectionType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Effective Type:</span>
                <span className="font-medium">{metrics.effectiveType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">RTT:</span>
                <span className="font-medium">{metrics.rtt}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Downlink:</span>
                <span className="font-medium">{metrics.downlink} Mbps</span>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-white rounded-lg border">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Runtime Metrics
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Render Time:</span>
                <span className="font-medium">{formatMetric(metrics.renderTime, 'ms')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cache Hit Rate:</span>
                <span className="font-medium">{metrics.cacheHitRate}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Performance Warnings */}
      {performanceScore < 50 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">Performance Issues Detected</span>
          </div>
          <p className="text-sm text-red-700 mt-1">
            Your application is experiencing performance issues. Consider optimizing images, 
            reducing bundle size, or implementing code splitting.
          </p>
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;
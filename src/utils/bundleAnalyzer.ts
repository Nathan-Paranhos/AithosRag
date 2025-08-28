// Bundle Analysis and Performance Monitoring
import React from 'react';

interface WebpackStats {
  chunks?: WebpackChunk[];
  assets?: WebpackAsset[];
  modules?: WebpackModule[];
}

interface WebpackChunk {
  id: string | number;
  names?: string[];
  files?: string[];
  initial?: boolean;
}

interface WebpackAsset {
  name: string;
  size: number;
}

interface WebpackModule {
  name?: string;
  identifier?: string;
  size?: number;
  chunks?: (string | number)[];
  reasons?: { moduleName: string }[];
  depth?: number;
  providedExports?: string[];
  usedExports?: string[];
}

interface BundleMetrics {
  totalSize: number;
  gzippedSize: number;
  chunkCount: number;
  assetCount: number;
  duplicateModules: string[];
  largestChunks: ChunkInfo[];
  unusedExports: string[];
  performanceScore: number;
}

interface ChunkInfo {
  name: string;
  size: number;
  gzippedSize: number;
  modules: ModuleInfo[];
  loadTime?: number;
  isAsync: boolean;
}

interface ModuleInfo {
  name: string;
  size: number;
  reasons: string[];
  isEntry: boolean;
  chunks: string[];
}

interface PerformanceThresholds {
  maxBundleSize: number;
  maxChunkSize: number;
  maxAssetSize: number;
  maxLoadTime: number;
  minCompressionRatio: number;
}

interface OptimizationSuggestion {
  type: 'code-splitting' | 'tree-shaking' | 'compression' | 'lazy-loading' | 'duplicate-removal';
  description: string;
  impact: 'high' | 'medium' | 'low';
  estimatedSavings: number;
  implementation: string;
}

class BundleAnalyzer {
  private metrics: BundleMetrics | null = null;
  private thresholds: PerformanceThresholds;
  private loadTimes: Map<string, number[]> = new Map();
  private observer: PerformanceObserver | null = null;

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = {
      maxBundleSize: 250 * 1024, // 250KB
      maxChunkSize: 100 * 1024,  // 100KB
      maxAssetSize: 50 * 1024,   // 50KB
      maxLoadTime: 3000,         // 3 seconds
      minCompressionRatio: 0.7,  // 70% compression
      ...thresholds
    };

    this.initializePerformanceMonitoring();
  }

  private initializePerformanceMonitoring(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      // Monitor resource loading
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            this.recordResourceLoad(entry as PerformanceResourceTiming);
          } else if (entry.entryType === 'navigation') {
            this.recordNavigationTiming(entry as PerformanceNavigationTiming);
          }
        }
      });

      this.observer.observe({ entryTypes: ['resource', 'navigation'] });
    } catch (error) {
      console.warn('Performance monitoring not available:', error);
    }
  }

  private recordResourceLoad(entry: PerformanceResourceTiming): void {
    const { name, duration } = entry;
    
    // Track JavaScript and CSS files
    if (name.includes('.js') || name.includes('.css')) {
      const loadTimes = this.loadTimes.get(name) || [];
      loadTimes.push(duration);
      this.loadTimes.set(name, loadTimes.slice(-10)); // Keep last 10 measurements
    }
  }

  private recordNavigationTiming(entry: PerformanceNavigationTiming): void {
    const metrics = {
      domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      loadComplete: entry.loadEventEnd - entry.loadEventStart,
      firstPaint: this.getFirstPaint(),
      firstContentfulPaint: this.getFirstContentfulPaint()
    };

    console.log('Navigation metrics:', metrics);
  }

  private getFirstPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint?.startTime || 0;
  }

  private getFirstContentfulPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcp?.startTime || 0;
  }

  // Analyze bundle from webpack stats
  public analyzeBundleStats(stats: WebpackStats): BundleMetrics {
    const chunks = stats.chunks || [];
    const assets = stats.assets || [];
    const modules = stats.modules || [];

    const totalSize = assets.reduce((sum: number, asset: WebpackAsset) => sum + asset.size, 0);
    const gzippedSize = this.estimateGzippedSize(totalSize);
    
    const largestChunks = chunks
      .map((chunk: WebpackChunk) => this.analyzeChunk(chunk, modules))
      .sort((a: ChunkInfo, b: ChunkInfo) => b.size - a.size)
      .slice(0, 10);

    const duplicateModules = this.findDuplicateModules(modules);
    const unusedExports = this.findUnusedExports(modules);
    const performanceScore = this.calculatePerformanceScore({
      totalSize,
      gzippedSize,
      chunkCount: chunks.length,
      assetCount: assets.length,
      duplicateModules,
      largestChunks,
      unusedExports
    });

    this.metrics = {
      totalSize,
      gzippedSize,
      chunkCount: chunks.length,
      assetCount: assets.length,
      duplicateModules,
      largestChunks,
      unusedExports,
      performanceScore
    };

    return this.metrics;
  }

  private analyzeChunk(chunk: WebpackChunk, allModules: WebpackModule[]): ChunkInfo {
    const chunkModules = allModules.filter(module => 
      module.chunks && module.chunks.includes(chunk.id)
    );

    const modules = chunkModules.map(module => ({
      name: module.name || module.identifier,
      size: module.size || 0,
      reasons: module.reasons?.map((r: { moduleName: string }) => r.moduleName) || [],
      isEntry: module.depth === 0,
      chunks: module.chunks || []
    }));

    const size = modules.reduce((sum, module) => sum + module.size, 0);
    const gzippedSize = this.estimateGzippedSize(size);
    const loadTime = this.getAverageLoadTime(chunk.files?.[0]);

    return {
      name: chunk.names?.[0] || `chunk-${chunk.id}`,
      size,
      gzippedSize,
      modules,
      loadTime,
      isAsync: !chunk.initial
    };
  }

  private findDuplicateModules(modules: WebpackModule[]): string[] {
    const moduleNames = new Map<string, number>();
    const duplicates: string[] = [];

    modules.forEach(module => {
      const name = module.name || module.identifier;
      if (name) {
        const count = moduleNames.get(name) || 0;
        moduleNames.set(name, count + 1);
        
        if (count === 1) {
          duplicates.push(name);
        }
      }
    });

    return duplicates;
  }

  private findUnusedExports(modules: WebpackModule[]): string[] {
    // This is a simplified implementation
    // In a real scenario, you'd need more sophisticated analysis
    const unusedExports: string[] = [];
    
    modules.forEach(module => {
      if (module.providedExports && module.usedExports) {
        const unused = module.providedExports.filter(
          (exp: string) => !module.usedExports.includes(exp)
        );
        unusedExports.push(...unused.map((exp: string) => `${module.name}:${exp}`));
      }
    });

    return unusedExports;
  }

  private estimateGzippedSize(size: number): number {
    // Rough estimation: gzip typically achieves 70-80% compression for JS/CSS
    return Math.round(size * 0.25);
  }

  private getAverageLoadTime(filename?: string): number | undefined {
    if (!filename) return undefined;
    
    const loadTimes = this.loadTimes.get(filename);
    if (!loadTimes || loadTimes.length === 0) return undefined;
    
    return loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
  }

  private calculatePerformanceScore(metrics: Omit<BundleMetrics, 'performanceScore'>): number {
    let score = 100;
    
    // Penalize large bundle size
    if (metrics.totalSize > this.thresholds.maxBundleSize) {
      score -= Math.min(30, (metrics.totalSize - this.thresholds.maxBundleSize) / 1024 * 0.1);
    }
    
    // Penalize large chunks
    const oversizedChunks = metrics.largestChunks.filter(chunk => chunk.size > this.thresholds.maxChunkSize);
    score -= oversizedChunks.length * 5;
    
    // Penalize duplicate modules
    score -= Math.min(20, metrics.duplicateModules.length * 2);
    
    // Penalize unused exports
    score -= Math.min(15, metrics.unusedExports.length * 0.5);
    
    // Bonus for good compression ratio
    const compressionRatio = metrics.gzippedSize / metrics.totalSize;
    if (compressionRatio < this.thresholds.minCompressionRatio) {
      score += 10;
    }
    
    return Math.max(0, Math.round(score));
  }

  // Generate optimization suggestions
  public getOptimizationSuggestions(): OptimizationSuggestion[] {
    if (!this.metrics) {
      return [];
    }

    const suggestions: OptimizationSuggestion[] = [];

    // Large bundle size
    if (this.metrics.totalSize > this.thresholds.maxBundleSize) {
      suggestions.push({
        type: 'code-splitting',
        description: 'Bundle size exceeds recommended threshold. Consider implementing code splitting.',
        impact: 'high',
        estimatedSavings: this.metrics.totalSize - this.thresholds.maxBundleSize,
        implementation: 'Use React.lazy() and dynamic imports to split large components into separate chunks.'
      });
    }

    // Large chunks
    const oversizedChunks = this.metrics.largestChunks.filter(chunk => chunk.size > this.thresholds.maxChunkSize);
    if (oversizedChunks.length > 0) {
      suggestions.push({
        type: 'code-splitting',
        description: `${oversizedChunks.length} chunks exceed size threshold.`,
        impact: 'medium',
        estimatedSavings: oversizedChunks.reduce((sum, chunk) => sum + (chunk.size - this.thresholds.maxChunkSize), 0),
        implementation: 'Split large chunks using webpack splitChunks configuration or dynamic imports.'
      });
    }

    // Duplicate modules
    if (this.metrics.duplicateModules.length > 0) {
      suggestions.push({
        type: 'duplicate-removal',
        description: `${this.metrics.duplicateModules.length} duplicate modules found.`,
        impact: 'medium',
        estimatedSavings: this.metrics.duplicateModules.length * 5000, // Rough estimate
        implementation: 'Configure webpack splitChunks to extract common modules into shared chunks.'
      });
    }

    // Unused exports
    if (this.metrics.unusedExports.length > 0) {
      suggestions.push({
        type: 'tree-shaking',
        description: `${this.metrics.unusedExports.length} unused exports detected.`,
        impact: 'low',
        estimatedSavings: this.metrics.unusedExports.length * 1000, // Rough estimate
        implementation: 'Enable tree shaking and remove unused exports to reduce bundle size.'
      });
    }

    // Poor compression
    const compressionRatio = this.metrics.gzippedSize / this.metrics.totalSize;
    if (compressionRatio > this.thresholds.minCompressionRatio) {
      suggestions.push({
        type: 'compression',
        description: 'Bundle compression ratio is below optimal.',
        impact: 'medium',
        estimatedSavings: this.metrics.totalSize * (compressionRatio - this.thresholds.minCompressionRatio),
        implementation: 'Enable gzip/brotli compression and minification in your build process.'
      });
    }

    return suggestions.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
  }

  // Generate detailed report
  public generateReport(): {
    metrics: BundleMetrics | null;
    suggestions: OptimizationSuggestion[];
    performanceData: {
      resourceTimings: {
        name: string;
        duration: number;
        transferSize: number;
        loadTime: number;
      }[];
      navigationTiming: PerformanceEntry | undefined;
      paintTimings: PerformanceEntry[];
      memoryUsage: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      } | null;
    };
    recommendations: string[];
  } {
    const suggestions = this.getOptimizationSuggestions();
    const performanceData = this.getPerformanceData();
    const recommendations = this.generateRecommendations();

    return {
      metrics: this.metrics,
      suggestions,
      performanceData,
      recommendations
    };
  }

  private getPerformanceData(): {
    resourceTimings: {
      name: string;
      duration: number;
      transferSize: number;
      loadTime: number;
    }[];
    navigationTiming: PerformanceEntry | undefined;
    paintTimings: PerformanceEntry[];
    memoryUsage: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    } | null;
  } {
    const resourceTimings = performance.getEntriesByType('resource')
      .filter(entry => entry.name.includes('.js') || entry.name.includes('.css'))
      .map(entry => ({
        name: entry.name,
        duration: entry.duration,
        transferSize: (entry as PerformanceResourceTiming).transferSize,
        loadTime: entry.responseEnd - entry.requestStart
      }));

    return {
      resourceTimings,
      navigationTiming: performance.getEntriesByType('navigation')[0],
      paintTimings: performance.getEntriesByType('paint'),
      memoryUsage: (performance as unknown as { memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      }}).memory ? {
        usedJSHeapSize: (performance as unknown as { memory: {
          usedJSHeapSize: number;
          totalJSHeapSize: number;
          jsHeapSizeLimit: number;
        }}).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as unknown as { memory: {
          usedJSHeapSize: number;
          totalJSHeapSize: number;
          jsHeapSizeLimit: number;
        }}).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as unknown as { memory: {
          usedJSHeapSize: number;
          totalJSHeapSize: number;
          jsHeapSizeLimit: number;
        }}).memory.jsHeapSizeLimit
      } : null
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics) {
      if (this.metrics.performanceScore < 70) {
        recommendations.push('Consider implementing the suggested optimizations to improve performance.');
      }

      if (this.metrics.chunkCount > 20) {
        recommendations.push('High number of chunks detected. Consider consolidating smaller chunks.');
      }

      if (this.metrics.duplicateModules.length > 5) {
        recommendations.push('Multiple duplicate modules found. Review your webpack configuration.');
      }
    }

    recommendations.push('Regularly monitor bundle size and performance metrics.');
    recommendations.push('Consider implementing a performance budget in your CI/CD pipeline.');

    return recommendations;
  }

  // Clean up
  public dispose(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.loadTimes.clear();
  }
}

// React hook for bundle analysis
export const useBundleAnalysis = () => {
  const [analyzer] = React.useState(() => new BundleAnalyzer());
  const [metrics, setMetrics] = React.useState<BundleMetrics | null>(null);
  const [suggestions, setSuggestions] = React.useState<OptimizationSuggestion[]>([]);

  React.useEffect(() => {
    // Load webpack stats if available
    if (process.env.NODE_ENV === 'development') {
      fetch('/webpack-stats.json')
        .then(response => response.json())
        .then(stats => {
          const bundleMetrics = analyzer.analyzeBundleStats(stats);
          setMetrics(bundleMetrics);
          setSuggestions(analyzer.getOptimizationSuggestions());
        })
        .catch(() => {
          // Stats not available, that's okay
        });
    }

    return () => analyzer.dispose();
  }, [analyzer]);

  const generateReport = React.useCallback(() => {
    return analyzer.generateReport();
  }, [analyzer]);

  return {
    metrics,
    suggestions,
    generateReport,
    analyzer
  };
};

// Utility functions for webpack configuration
export const webpackOptimizations = {
  // Split chunks configuration
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all',
        priority: 10
      },
      common: {
        name: 'common',
        minChunks: 2,
        chunks: 'all',
        priority: 5,
        reuseExistingChunk: true
      },
      react: {
        test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
        name: 'react',
        chunks: 'all',
        priority: 20
      }
    }
  },

  // Bundle analyzer plugin configuration
  bundleAnalyzer: {
    analyzerMode: process.env.ANALYZE ? 'server' : 'disabled',
    openAnalyzer: false,
    generateStatsFile: true,
    statsFilename: 'webpack-stats.json'
  },

  // Performance hints
  performance: {
    maxAssetSize: 250000,
    maxEntrypointSize: 250000,
    hints: process.env.NODE_ENV === 'production' ? 'warning' : false
  }
};

export default BundleAnalyzer;
export type { BundleMetrics, ChunkInfo, OptimizationSuggestion, PerformanceThresholds };
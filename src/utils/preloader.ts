import { performanceMonitor } from './performance';
import logger from './logger';

// Preloader configuration
interface PreloadConfig {
  priority: 'high' | 'medium' | 'low';
  timeout: number;
  retries: number;
  cache: boolean;
}

// Resource types for preloading
type ResourceType = 'script' | 'style' | 'image' | 'font' | 'fetch';

// Preload item interface
interface PreloadItem {
  url: string;
  type: ResourceType;
  config?: Partial<PreloadConfig>;
  crossOrigin?: 'anonymous' | 'use-credentials';
  as?: string;
}

// Default configurations for different resource types
const defaultConfigs: Record<ResourceType, PreloadConfig> = {
  script: { priority: 'high', timeout: 10000, retries: 3, cache: true },
  style: { priority: 'high', timeout: 5000, retries: 2, cache: true },
  image: { priority: 'medium', timeout: 8000, retries: 2, cache: true },
  font: { priority: 'high', timeout: 5000, retries: 1, cache: true },
  fetch: { priority: 'medium', timeout: 10000, retries: 3, cache: false }
};

// Preloader class
class ResourcePreloader {
  private cache = new Map<string, Promise<any>>();
  private loadedResources = new Set<string>();
  private failedResources = new Set<string>();
  private preloadQueue: PreloadItem[] = [];
  private isProcessing = false;

  constructor() {
    // Initialize critical resource preloading
    this.initializeCriticalResources();
  }

  private initializeCriticalResources(): void {
    // Preload critical fonts
    this.addToQueue({
      url: '/fonts/inter-var.woff2',
      type: 'font',
      config: { priority: 'high' },
      crossOrigin: 'anonymous',
      as: 'font'
    });

    // Preload critical images
    this.addToQueue({
      url: '/images/logo.svg',
      type: 'image',
      config: { priority: 'high' }
    });

    // Preload service worker
    if ('serviceWorker' in navigator) {
      this.addToQueue({
        url: '/sw.js',
        type: 'script',
        config: { priority: 'high' }
      });
    }
  }

  // Add resource to preload queue
  public addToQueue(item: PreloadItem): void {
    if (this.loadedResources.has(item.url) || this.failedResources.has(item.url)) {
      return;
    }

    this.preloadQueue.push(item);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  // Process preload queue
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.preloadQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    // Sort by priority
    this.preloadQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = a.config?.priority || defaultConfigs[a.type].priority;
      const bPriority = b.config?.priority || defaultConfigs[b.type].priority;
      return priorityOrder[bPriority] - priorityOrder[aPriority];
    });

    // Process items in batches
    const batchSize = 3;
    while (this.preloadQueue.length > 0) {
      const batch = this.preloadQueue.splice(0, batchSize);
      await Promise.allSettled(
        batch.map(item => this.preloadResource(item))
      );
    }

    this.isProcessing = false;
  }

  // Preload individual resource
  private async preloadResource(item: PreloadItem): Promise<void> {
    const config = { ...defaultConfigs[item.type], ...item.config };
    const startTime = performance.now();

    try {
      // Check cache first
      if (config.cache && this.cache.has(item.url)) {
        await this.cache.get(item.url);
        this.loadedResources.add(item.url);
        return;
      }

      let promise: Promise<any>;

      switch (item.type) {
        case 'script':
          promise = this.preloadScript(item.url, config);
          break;
        case 'style':
          promise = this.preloadStyle(item.url, config);
          break;
        case 'image':
          promise = this.preloadImage(item.url, config);
          break;
        case 'font':
          promise = this.preloadFont(item.url, item.crossOrigin, config);
          break;
        case 'fetch':
          promise = this.preloadFetch(item.url, config);
          break;
        default:
          throw new Error(`Unsupported resource type: ${item.type}`);
      }

      // Cache the promise if caching is enabled
      if (config.cache) {
        this.cache.set(item.url, promise);
      }

      await promise;
      this.loadedResources.add(item.url);

      // Track performance
      const loadTime = performance.now() - startTime;
      performanceMonitor.addMetric({
        name: `preload_${item.type}`,
        value: loadTime,
        timestamp: Date.now(),
        type: 'timing',
        tags: { url: item.url, priority: config.priority }
      });

      logger.debug(`Preloaded ${item.type}`, {
        url: item.url,
        loadTime: Math.round(loadTime),
        priority: config.priority
      });

    } catch (error) {
      this.failedResources.add(item.url);
      logger.warn(`Failed to preload ${item.type}`, {
        url: item.url,
        error: error instanceof Error ? error.message : 'Unknown error',
        priority: config.priority
      });

      // Track failed preloads
      performanceMonitor.incrementCounter(`preload_${item.type}_error`, 1, {
        url: item.url,
        priority: config.priority
      });
    }
  }

  // Preload script
  private preloadScript(url: string, config: PreloadConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'script';
      link.href = url;
      
      const timeout = setTimeout(() => {
        reject(new Error(`Script preload timeout: ${url}`));
      }, config.timeout);

      link.onload = () => {
        clearTimeout(timeout);
        resolve();
      };

      link.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Failed to preload script: ${url}`));
      };

      document.head.appendChild(link);
    });
  }

  // Preload stylesheet
  private preloadStyle(url: string, config: PreloadConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = url;
      
      const timeout = setTimeout(() => {
        reject(new Error(`Style preload timeout: ${url}`));
      }, config.timeout);

      link.onload = () => {
        clearTimeout(timeout);
        resolve();
      };

      link.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Failed to preload style: ${url}`));
      };

      document.head.appendChild(link);
    });
  }

  // Preload image
  private preloadImage(url: string, config: PreloadConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      const timeout = setTimeout(() => {
        reject(new Error(`Image preload timeout: ${url}`));
      }, config.timeout);

      img.onload = () => {
        clearTimeout(timeout);
        resolve();
      };

      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Failed to preload image: ${url}`));
      };

      img.src = url;
    });
  }

  // Preload font
  private preloadFont(url: string, crossOrigin?: string, config?: PreloadConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = 'font/woff2';
      link.href = url;
      
      if (crossOrigin) {
        link.crossOrigin = crossOrigin;
      }
      
      const timeout = setTimeout(() => {
        reject(new Error(`Font preload timeout: ${url}`));
      }, config?.timeout || 5000);

      link.onload = () => {
        clearTimeout(timeout);
        resolve();
      };

      link.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Failed to preload font: ${url}`));
      };

      document.head.appendChild(link);
    });
  }

  // Preload via fetch
  private async preloadFetch(url: string, config: PreloadConfig): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, config.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        mode: 'cors',
        credentials: 'same-origin'
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Consume the response to cache it
      await response.blob();
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  // Preload route components
  public preloadRoute(routePath: string): void {
    const routeMap: Record<string, string> = {
      '/chat': '/src/pages/ChatPage.tsx',
      '/analytics': '/src/pages/AnalyticsPage.tsx',
      '/documents': '/src/pages/DocumentsPage.tsx',
      '/settings': '/src/pages/SettingsPage.tsx'
    };

    const componentPath = routeMap[routePath];
    if (componentPath) {
      this.addToQueue({
        url: componentPath,
        type: 'script',
        config: { priority: 'medium' }
      });
    }
  }

  // Preload based on user behavior
  public preloadOnHover(element: HTMLElement, items: PreloadItem[]): void {
    let timeoutId: NodeJS.Timeout;

    const handleMouseEnter = () => {
      timeoutId = setTimeout(() => {
        items.forEach(item => this.addToQueue(item));
      }, 100); // Small delay to avoid unnecessary preloads
    };

    const handleMouseLeave = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);

    // Cleanup function
    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }

  // Get preload statistics
  public getStats(): {
    loaded: number;
    failed: number;
    cached: number;
    queued: number;
  } {
    return {
      loaded: this.loadedResources.size,
      failed: this.failedResources.size,
      cached: this.cache.size,
      queued: this.preloadQueue.length
    };
  }

  // Clear cache and reset
  public clear(): void {
    this.cache.clear();
    this.loadedResources.clear();
    this.failedResources.clear();
    this.preloadQueue = [];
  }
}

// Global preloader instance
export const preloader = new ResourcePreloader();

// Utility functions
export const preloadUtils = {
  // Preload critical resources for initial page load
  preloadCritical: () => {
    preloader.addToQueue({
      url: '/manifest.json',
      type: 'fetch',
      config: { priority: 'high' }
    });
  },

  // Preload route on navigation intent
  preloadRoute: (path: string) => {
    preloader.preloadRoute(path);
  },

  // Preload images in viewport
  preloadImagesInViewport: () => {
    const images = document.querySelectorAll('img[data-src]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;
          if (src) {
            preloader.addToQueue({
              url: src,
              type: 'image',
              config: { priority: 'low' }
            });
          }
          observer.unobserve(img);
        }
      });
    });

    images.forEach(img => observer.observe(img));
  }
};

export { ResourcePreloader, type PreloadItem, type PreloadConfig };
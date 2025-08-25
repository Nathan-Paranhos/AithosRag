// CDN Manager for optimized asset delivery

// Asset optimization configuration
const getOptimizationConfig = () => ({
  images: {
    webp: true,
    avif: false,
    quality: 85,
    progressive: true
  },
  compression: {
    gzip: true,
    brotli: true,
    level: 6
  },
  minification: {
    css: true,
    js: true,
    html: true
  }
});

interface CDNConfig {
  provider: 'cloudflare' | 'aws' | 'vercel' | 'custom';
  baseUrl: string;
  apiKey?: string;
  zoneId?: string;
  distributionId?: string;
  customHeaders?: Record<string, string>;
  cacheRules?: CacheRule[];
}

interface CacheRule {
  pattern: string;
  ttl: number;
  browserTtl?: number;
  edgeTtl?: number;
  bypassCache?: boolean;
}

interface AssetOptimization {
  images?: {
    quality?: number;
    format?: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png';
    resize?: {
      width?: number;
      height?: number;
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    };
  };
  compression?: {
    gzip?: boolean;
    brotli?: boolean;
    level?: number;
  };
  minification?: {
    css?: boolean;
    js?: boolean;
    html?: boolean;
  };
}

class CDNManager {
  private config: CDNConfig;
  private cache: Map<string, { url: string; timestamp: number; ttl: number }> = new Map();
  private performanceMetrics: Map<string, { loadTime: number; size: number; hitRate: number }> = new Map();

  constructor(config: CDNConfig) {
    this.config = config;
    this.initializeCDN();
  }

  private initializeCDN(): void {
    // Set up CDN-specific configurations
    switch (this.config.provider) {
      case 'cloudflare':
        this.setupCloudflare();
        break;
      case 'aws':
        this.setupAWS();
        break;
      case 'vercel':
        this.setupVercel();
        break;
      default:
        this.setupCustom();
    }
  }

  private setupCloudflare(): void {
    // Cloudflare-specific setup
    if (typeof window !== 'undefined') {
      // Add Cloudflare analytics
      const script = document.createElement('script');
      script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
      script.defer = true;
      script.setAttribute('data-cf-beacon', JSON.stringify({
        token: this.config.apiKey,
        spa: true
      }));
      document.head.appendChild(script);
    }
  }

  private setupAWS(): void {
    // AWS CloudFront setup
    // Configure AWS SDK if needed
  }

  private setupVercel(): void {
    // Vercel Edge Network setup
    // Configure Vercel-specific optimizations
  }

  private setupCustom(): void {
    // Custom CDN setup
  }

  // Generate optimized asset URLs
  public getAssetUrl(
    path: string,
    optimization?: AssetOptimization
  ): string {
    const cacheKey = `${path}-${JSON.stringify(optimization)}`;
    const cached = this.cache.get(cacheKey);
    
    // Check cache validity
    if (cached && Date.now() - cached.timestamp < cached.ttl * 1000) {
      return cached.url;
    }

    let url = new URL(path, this.config.baseUrl);

    // Apply optimizations based on CDN provider
    if (optimization) {
      url = this.applyOptimizations(url, optimization);
    }

    // Add cache busting if needed
    if (this.shouldCacheBust(path)) {
      url.searchParams.set('v', this.getCacheVersion());
    }

    const finalUrl = url.toString();
    
    // Cache the result
    this.cache.set(cacheKey, {
      url: finalUrl,
      timestamp: Date.now(),
      ttl: this.getCacheTTL(path)
    });

    return finalUrl;
  }

  private applyOptimizations(
    url: URL,
    optimization: AssetOptimization
  ): URL {
    switch (this.config.provider) {
      case 'cloudflare':
        return this.applyCloudflareOptimizations(url, optimization);
      case 'aws':
        return this.applyAWSOptimizations(url, optimization);
      case 'vercel':
        return this.applyVercelOptimizations(url, optimization);
      default:
        return this.applyCustomOptimizations(url, optimization);
    }
  }

  private applyCloudflareOptimizations(
    url: URL,
    optimization: AssetOptimization
  ): URL {
    // Cloudflare Image Resizing
    if (optimization.images) {
      const { quality, format, resize } = optimization.images;
      
      if (quality) url.searchParams.set('quality', quality.toString());
      if (format && format !== 'auto') url.searchParams.set('format', format);
      if (resize?.width) url.searchParams.set('width', resize.width.toString());
      if (resize?.height) url.searchParams.set('height', resize.height.toString());
      if (resize?.fit) url.searchParams.set('fit', resize.fit);
    }

    // Cloudflare compression
    if (optimization.compression) {
      if (optimization.compression.brotli) {
        url.searchParams.set('compression', 'brotli');
      } else if (optimization.compression.gzip) {
        url.searchParams.set('compression', 'gzip');
      }
    }

    return url;
  }

  private applyAWSOptimizations(
    url: URL,
    optimization: AssetOptimization
  ): URL {
    // AWS CloudFront optimizations
    if (optimization.images) {
      const { quality, format, resize } = optimization.images;
      
      // Use AWS Lambda@Edge for image processing
      if (quality) url.searchParams.set('q', quality.toString());
      if (format && format !== 'auto') url.searchParams.set('f', format);
      if (resize?.width) url.searchParams.set('w', resize.width.toString());
      if (resize?.height) url.searchParams.set('h', resize.height.toString());
    }

    return url;
  }

  private applyVercelOptimizations(
    url: URL,
    optimization: AssetOptimization
  ): URL {
    // Vercel Image Optimization
    if (optimization.images) {
      const { quality, format, resize } = optimization.images;
      
      if (quality) url.searchParams.set('q', quality.toString());
      if (format && format !== 'auto') url.searchParams.set('f', format);
      if (resize?.width) url.searchParams.set('w', resize.width.toString());
      if (resize?.height) url.searchParams.set('h', resize.height.toString());
    }

    return url;
  }

  private applyCustomOptimizations(
    url: URL,
    optimization: AssetOptimization
  ): URL {
    // Custom optimization logic
    return url;
  }

  private shouldCacheBust(path: string): boolean {
    // Determine if cache busting is needed
    const noCachePaths = ['/api/', '/auth/', '/dynamic/'];
    return noCachePaths.some(noCachePath => path.includes(noCachePath));
  }

  private getCacheVersion(): string {
    // Generate cache version (could be build hash, timestamp, etc.)
    return process.env.REACT_APP_BUILD_HASH || Date.now().toString();
  }

  private getCacheTTL(path: string): number {
    // Get cache TTL based on path and rules
    if (this.config.cacheRules) {
      for (const rule of this.config.cacheRules) {
        if (new RegExp(rule.pattern).test(path)) {
          return rule.ttl;
        }
      }
    }

    // Default TTL based on file type
    if (path.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i)) return 86400; // 24 hours for images
    if (path.match(/\.(css|js)$/i)) return 3600; // 1 hour for CSS/JS
    if (path.match(/\.(woff|woff2|ttf|eot)$/i)) return 604800; // 1 week for fonts
    
    return 300; // 5 minutes default
  }

  // Preload critical assets
  public preloadAssets(assetPaths: string[], optimization?: AssetOptimization): Promise<void[]> {
    const preloadPromises = assetPaths.map(asset => {
      return new Promise<void>((resolve, reject) => {
        const url = this.getAssetUrl(asset, optimization);
        
        if (asset.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i)) {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = url;
        } else if (asset.match(/\.(css)$/i)) {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'style';
          link.href = url;
          link.onload = () => resolve();
          link.onerror = reject;
          document.head.appendChild(link);
        } else if (asset.match(/\.(js)$/i)) {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'script';
          link.href = url;
          link.onload = () => resolve();
          link.onerror = reject;
          document.head.appendChild(link);
        } else {
          // Generic fetch for other assets
          fetch(url)
            .then(() => resolve())
            .catch(reject);
        }
      });
    });

    return Promise.all(preloadPromises);
  }

  // Purge cache
  public async purgeCache(cachePaths?: string[]): Promise<boolean> {
    try {
      switch (this.config.provider) {
        case 'cloudflare':
          return await this.purgeCloudflareCache(cachePaths);
        case 'aws':
          return await this.purgeAWSCache(cachePaths);
        case 'vercel':
          return await this.purgeVercelCache(cachePaths);
        default:
          return await this.purgeCustomCache(cachePaths);
      }
    } catch (error) {
      console.error('Failed to purge cache:', error);
      return false;
    }
  }

  private async purgeCloudflareCache(paths?: string[]): Promise<boolean> {
    if (!this.config.apiKey || !this.config.zoneId) {
      throw new Error('Cloudflare API key and zone ID required');
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${this.config.zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: paths || ['*']
        })
      }
    );

    return response.ok;
  }

  private async purgeAWSCache(paths?: string[]): Promise<boolean> {
    // AWS CloudFront invalidation
    // This would typically use AWS SDK
    console.log('AWS cache purge not implemented in browser environment');
    return true;
  }

  private async purgeVercelCache(paths?: string[]): Promise<boolean> {
    // Vercel cache purge
    console.log('Vercel cache purge not implemented in browser environment');
    return true;
  }

  private async purgeCustomCache(paths?: string[]): Promise<boolean> {
    // Custom cache purge logic
    return true;
  }

  // Performance monitoring
  public recordPerformance(asset: string, loadTime: number, size: number): void {
    const existing = this.performanceMetrics.get(asset);
    const hitRate = existing ? (existing.hitRate + 1) : 1;
    
    this.performanceMetrics.set(asset, {
      loadTime,
      size,
      hitRate
    });
  }

  public getPerformanceMetrics(): {
    averageLoadTime: number;
    totalSize: number;
    cacheHitRate: number;
    assetCount: number;
  } {
    const metrics = Array.from(this.performanceMetrics.values());
    
    return {
      averageLoadTime: metrics.reduce((sum, m) => sum + m.loadTime, 0) / metrics.length,
      totalSize: metrics.reduce((sum, m) => sum + m.size, 0),
      cacheHitRate: metrics.reduce((sum, m) => sum + m.hitRate, 0) / metrics.length,
      assetCount: metrics.length
    };
  }

  // Clear local cache
  public clearCache(): void {
    this.cache.clear();
  }

  // Update configuration
  public updateConfig(newConfig: Partial<CDNConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.initializeCDN();
  }
}

// Default CDN configurations
export const defaultCDNConfigs: Record<string, CDNConfig> = {
  development: {
    provider: 'custom',
    baseUrl: 'http://localhost:3000',
    cacheRules: [
      { pattern: '\\.(jpg|jpeg|png|gif|webp|avif)$', ttl: 300 },
      { pattern: '\\.(css|js)$', ttl: 60 },
      { pattern: '/api/', ttl: 0, bypassCache: true }
    ]
  },
  
  production: {
    provider: 'vercel',
    baseUrl: process.env.REACT_APP_CDN_URL || 'https://your-app.vercel.app',
    cacheRules: [
      { pattern: '\\.(jpg|jpeg|png|gif|webp|avif)$', ttl: 86400, browserTtl: 86400 },
      { pattern: '\\.(css|js)$', ttl: 3600, browserTtl: 3600 },
      { pattern: '\\.(woff|woff2|ttf|eot)$', ttl: 604800, browserTtl: 604800 },
      { pattern: '/api/', ttl: 0, bypassCache: true }
    ]
  },
  
  cloudflare: {
    provider: 'cloudflare',
    baseUrl: process.env.REACT_APP_CDN_URL || 'https://your-domain.com',
    apiKey: process.env.REACT_APP_CLOUDFLARE_API_KEY,
    zoneId: process.env.REACT_APP_CLOUDFLARE_ZONE_ID,
    cacheRules: [
      { pattern: '\\.(jpg|jpeg|png|gif|webp|avif)$', ttl: 86400, edgeTtl: 86400 },
      { pattern: '\\.(css|js)$', ttl: 3600, edgeTtl: 7200 },
      { pattern: '\\.(woff|woff2|ttf|eot)$', ttl: 604800, edgeTtl: 604800 },
      { pattern: '/api/', ttl: 0, bypassCache: true }
    ]
  }
};

// Create CDN manager instance
const environment = process.env.NODE_ENV || 'development';
const cdnConfig = defaultCDNConfigs[environment] || defaultCDNConfigs.development;

export const cdnManager = new CDNManager(cdnConfig);

// React hook for CDN integration
export const useCDN = () => {
  const getOptimizedUrl = (path: string, optimization?: AssetOptimization) => {
    return cdnManager.getAssetUrl(path, optimization);
  };

  const preloadAssets = (assetPaths: string[], optimization?: AssetOptimization) => {
    return cdnManager.preloadAssets(assetPaths, optimization);
  };

  const purgeCache = (cachePaths?: string[]) => {
    return cdnManager.purgeCache(cachePaths);
  };

  const prefetchAssets = async (assetPaths: string[]) => {
    const promises = assetPaths.map(async (path) => {
      try {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = cdnManager.getAssetUrl(path);
        document.head.appendChild(link);
      } catch (error) {
        console.error(`Failed to prefetch asset: ${path}`, error);
      }
    });
    
    return Promise.allSettled(promises);
  };

  const getMetrics = () => {
    return cdnManager.getPerformanceMetrics();
  };

  return {
    getOptimizedUrl,
    preloadAssets,
    purgeCache,
    getMetrics,
    recordPerformance: cdnManager.recordPerformance.bind(cdnManager)
  };
};

export default CDNManager;
export type { CDNConfig, AssetOptimization, CacheRule };
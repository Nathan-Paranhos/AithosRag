import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '../utils/cn';

interface ImageOptimizerProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto';
  sizes?: string;
  priority?: boolean;
  lazy?: boolean;
  placeholder?: 'blur' | 'empty' | string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  responsive?: boolean;
  breakpoints?: { [key: string]: number };
}

interface ImageState {
  isLoaded: boolean;
  isLoading: boolean;
  hasError: boolean;
  currentSrc: string;
}

// Image format detection and conversion utilities
const imageFormats = {
  webp: 'image/webp',
  avif: 'image/avif',
  jpeg: 'image/jpeg',
  png: 'image/png'
};

const supportsFormat = (format: keyof typeof imageFormats): boolean => {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  try {
    return canvas.toDataURL(imageFormats[format]).indexOf(`data:${imageFormats[format]}`) === 0;
  } catch {
    return false;
  }
};

// Detect best supported format
const getBestFormat = (requestedFormat: string): string => {
  if (requestedFormat !== 'auto') return requestedFormat;
  
  if (supportsFormat('avif')) return 'avif';
  if (supportsFormat('webp')) return 'webp';
  return 'jpeg';
};

// Generate responsive image URLs
const generateResponsiveUrls = (
  src: string,
  breakpoints: { [key: string]: number },
  format: string,
  quality: number
): string => {
  const baseUrl = src.split('?')[0];
  const params = new URLSearchParams(src.split('?')[1] || '');
  
  const srcSet = Object.entries(breakpoints)
    .map(([size, width]) => {
      const url = new URL(baseUrl, window.location.origin);
      url.searchParams.set('w', width.toString());
      url.searchParams.set('q', quality.toString());
      url.searchParams.set('f', format);
      
      // Add original params
      params.forEach((value, key) => {
        if (!['w', 'q', 'f'].includes(key)) {
          url.searchParams.set(key, value);
        }
      });
      
      return `${url.toString()} ${width}w`;
    })
    .join(', ');
    
  return srcSet;
};

// Intersection Observer for lazy loading
const useIntersectionObserver = (callback: () => void, options?: IntersectionObserverInit) => {
  const targetRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        callback();
        observer.unobserve(target);
      }
    }, {
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    });
    
    observer.observe(target);
    
    return () => observer.disconnect();
  }, [callback]);
  
  return targetRef;
};

// Image loading hook
const useImageLoader = (src: string, priority: boolean = false) => {
  const [state, setState] = useState<ImageState>({
    isLoaded: false,
    isLoading: false,
    hasError: false,
    currentSrc: ''
  });
  
  const loadImage = useCallback((imageSrc: string) => {
    setState(prev => ({ ...prev, isLoading: true, hasError: false }));
    
    const img = new Image();
    
    img.onload = () => {
      setState({
        isLoaded: true,
        isLoading: false,
        hasError: false,
        currentSrc: imageSrc
      });
    };
    
    img.onerror = () => {
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasError: true
      }));
    };
    
    img.src = imageSrc;
  }, []);
  
  useEffect(() => {
    if (priority && src) {
      loadImage(src);
    }
  }, [src, priority, loadImage]);
  
  return { ...state, loadImage };
};

// Placeholder component
const ImagePlaceholder: React.FC<{
  width?: number;
  height?: number;
  className?: string;
  type: 'blur' | 'empty' | 'custom';
  customPlaceholder?: string;
}> = ({ width, height, className, type, customPlaceholder }) => {
  const style = {
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : 'auto',
    aspectRatio: width && height ? `${width}/${height}` : undefined
  };
  
  if (type === 'custom' && customPlaceholder) {
    return (
      <div className={cn('bg-cover bg-center', className)} style={{
        ...style,
        backgroundImage: `url(${customPlaceholder})`
      }} />
    );
  }
  
  if (type === 'blur') {
    return (
      <div 
        className={cn(
          'bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse',
          'dark:from-gray-700 dark:to-gray-800',
          className
        )}
        style={style}
      />
    );
  }
  
  return (
    <div 
      className={cn('bg-gray-200 dark:bg-gray-700', className)}
      style={style}
    />
  );
};

// Error fallback component
const ImageError: React.FC<{
  width?: number;
  height?: number;
  className?: string;
  onRetry?: () => void;
}> = ({ width, height, className, onRetry }) => {
  return (
    <div 
      className={cn(
        'flex items-center justify-center bg-gray-100 dark:bg-gray-800',
        'border-2 border-dashed border-gray-300 dark:border-gray-600',
        className
      )}
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : 'auto',
        aspectRatio: width && height ? `${width}/${height}` : undefined
      }}
    >
      <div className="text-center p-4">
        <div className="text-gray-400 dark:text-gray-500 mb-2">
          <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Failed to load image</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-blue-500 hover:text-blue-600 underline"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

// Main ImageOptimizer component
export const ImageOptimizer: React.FC<ImageOptimizerProps> = ({
  src,
  alt,
  className,
  width,
  height,
  quality = 80,
  format = 'auto',
  sizes,
  priority = false,
  lazy = true,
  placeholder = 'blur',
  onLoad,
  onError,
  responsive = true,
  breakpoints = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536
  }
}) => {
  const [shouldLoad, setShouldLoad] = useState(priority || !lazy);
  const { isLoaded, isLoading, hasError, currentSrc, loadImage } = useImageLoader(src, priority);
  
  // Intersection observer for lazy loading
  const observerRef = useIntersectionObserver(() => {
    if (!shouldLoad) {
      setShouldLoad(true);
    }
  });
  
  // Determine optimal format
  const optimalFormat = getBestFormat(format);
  
  // Generate optimized URL
  const generateOptimizedUrl = useCallback((imageSrc: string) => {
    if (!imageSrc.startsWith('http') && !imageSrc.startsWith('/')) {
      return imageSrc; // Return as-is for data URLs or external URLs
    }
    
    const url = new URL(imageSrc, window.location.origin);
    url.searchParams.set('f', optimalFormat);
    url.searchParams.set('q', quality.toString());
    
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    
    return url.toString();
  }, [optimalFormat, quality, width, height]);
  
  // Load image when shouldLoad changes
  useEffect(() => {
    if (shouldLoad && src && !isLoaded && !isLoading) {
      const optimizedSrc = generateOptimizedUrl(src);
      loadImage(optimizedSrc);
    }
  }, [shouldLoad, src, isLoaded, isLoading, generateOptimizedUrl, loadImage]);
  
  // Handle load and error events
  useEffect(() => {
    if (isLoaded && onLoad) {
      onLoad();
    }
  }, [isLoaded, onLoad]);
  
  useEffect(() => {
    if (hasError && onError) {
      onError(new Error('Failed to load image'));
    }
  }, [hasError, onError]);
  
  // Retry function
  const handleRetry = useCallback(() => {
    if (src) {
      const optimizedSrc = generateOptimizedUrl(src);
      loadImage(optimizedSrc);
    }
  }, [src, generateOptimizedUrl, loadImage]);
  
  // Container style
  const containerStyle = {
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : 'auto',
    aspectRatio: width && height ? `${width}/${height}` : undefined
  };
  
  // Show error state
  if (hasError) {
    return (
      <ImageError
        width={width}
        height={height}
        className={className}
        onRetry={handleRetry}
      />
    );
  }
  
  // Show placeholder while loading or not yet loaded
  if (!isLoaded) {
    return (
      <div ref={lazy ? observerRef : undefined} style={containerStyle}>
        <ImagePlaceholder
          width={width}
          height={height}
          className={className}
          type={typeof placeholder === 'string' && placeholder !== 'blur' && placeholder !== 'empty' ? 'custom' : placeholder as 'blur' | 'empty'}
          customPlaceholder={typeof placeholder === 'string' && placeholder !== 'blur' && placeholder !== 'empty' ? placeholder : undefined}
        />
      </div>
    );
  }
  
  // Generate responsive image attributes
  const imageProps: React.ImgHTMLAttributes<HTMLImageElement> = {
    src: currentSrc,
    alt,
    className: cn(
      'transition-opacity duration-300',
      isLoaded ? 'opacity-100' : 'opacity-0',
      className
    ),
    width,
    height,
    loading: priority ? 'eager' : 'lazy',
    decoding: 'async'
  };
  
  // Add responsive attributes
  if (responsive && breakpoints) {
    imageProps.srcSet = generateResponsiveUrls(src, breakpoints, optimalFormat, quality);
    imageProps.sizes = sizes || '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
  }
  
  return (
    <div style={containerStyle}>
      <img {...imageProps} />
    </div>
  );
};

// Hook for programmatic image optimization
export const useImageOptimization = () => {
  const optimizeImage = useCallback((
    src: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: string;
    } = {}
  ) => {
    const { width, height, quality = 80, format = 'auto' } = options;
    const optimalFormat = getBestFormat(format);
    
    if (!src.startsWith('http') && !src.startsWith('/')) {
      return src;
    }
    
    const url = new URL(src, window.location.origin);
    url.searchParams.set('f', optimalFormat);
    url.searchParams.set('q', quality.toString());
    
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    
    return url.toString();
  }, []);
  
  const preloadImage = useCallback((src: string, options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  }) => {
    const optimizedSrc = optimizeImage(src, options);
    
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = optimizedSrc;
    });
  }, [optimizeImage]);
  
  return {
    optimizeImage,
    preloadImage,
    supportsWebP: supportsFormat('webp'),
    supportsAVIF: supportsFormat('avif')
  };
};

// Performance monitoring
export const imagePerformanceMetrics = {
  loadTimes: new Map<string, number>(),
  errors: new Map<string, number>(),
  formatUsage: new Map<string, number>(),
  
  recordLoadTime: (src: string, loadTime: number) => {
    imagePerformanceMetrics.loadTimes.set(src, loadTime);
  },
  
  recordError: (src: string) => {
    const currentErrors = imagePerformanceMetrics.errors.get(src) || 0;
    imagePerformanceMetrics.errors.set(src, currentErrors + 1);
  },
  
  recordFormatUsage: (format: string) => {
    const currentUsage = imagePerformanceMetrics.formatUsage.get(format) || 0;
    imagePerformanceMetrics.formatUsage.set(format, currentUsage + 1);
  },
  
  getMetrics: () => ({
    averageLoadTime: Array.from(imagePerformanceMetrics.loadTimes.values())
      .reduce((sum, time) => sum + time, 0) / imagePerformanceMetrics.loadTimes.size,
    totalErrors: Array.from(imagePerformanceMetrics.errors.values())
      .reduce((sum, errors) => sum + errors, 0),
    formatDistribution: Object.fromEntries(imagePerformanceMetrics.formatUsage),
    totalImages: imagePerformanceMetrics.loadTimes.size
  })
};

export default ImageOptimizer;
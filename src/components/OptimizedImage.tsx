import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  OptimizedImageProps,
  generateImageSrcSet,
  optimizeImageUrl,
  createBlurPlaceholder,
  lazyImageObserver,
  getOptimalImageFormat
} from '@/utils/imageOptimization';

/**
 * OptimizedImage Component
 * Provides advanced image optimization with lazy loading, format detection,
 * and responsive sizing for enterprise performance
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  options = {},
  onLoad,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const [blurPlaceholder, setBlurPlaceholder] = useState<string>('');

  const {
    lazy = true,
    placeholder = 'blur',
    priority = false,
    quality = 80,
    format,
    width,
    height,
    sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
  } = options;

  // Generate optimized image URLs
  const optimizedSrc = useCallback(() => {
    const optimalFormat = format || getOptimalImageFormat();
    return optimizeImageUrl(src, {
      ...options,
      format: optimalFormat,
      quality
    });
  }, [src, options, format, quality]);

  const srcSet = useCallback(() => {
    const optimalFormat = format || getOptimalImageFormat();
    return generateImageSrcSet(src, {
      ...options,
      format: optimalFormat,
      quality
    });
  }, [src, options, format, quality]);

  // Create blur placeholder
  useEffect(() => {
    if (placeholder === 'blur' && width && height) {
      const placeholder = createBlurPlaceholder(width, height);
      setBlurPlaceholder(placeholder);
    }
  }, [placeholder, width, height]);

  // Handle image loading
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setIsError(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsError(true);
    setIsLoaded(false);
    onError?.();
  }, [onError]);

  // Setup lazy loading or immediate loading
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    if (priority || !lazy) {
      // Load immediately for priority images
      setCurrentSrc(optimizedSrc());
    } else {
      // Setup lazy loading
      img.dataset.src = optimizedSrc();
      img.dataset.srcset = srcSet();
      img.classList.add('lazy-loading');
      lazyImageObserver.observe(img);

      return () => {
        lazyImageObserver.unobserve(img);
      };
    }
  }, [lazy, priority, optimizedSrc, srcSet]);

  // Preload critical images
  useEffect(() => {
    if (priority) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = optimizedSrc();
      if (srcSet()) {
        link.setAttribute('imagesrcset', srcSet());
        link.setAttribute('imagesizes', sizes);
      }
      document.head.appendChild(link);

      return () => {
        document.head.removeChild(link);
      };
    }
  }, [priority, optimizedSrc, srcSet, sizes]);

  // Render placeholder based on type
  const renderPlaceholder = () => {
    if (placeholder === 'empty') return null;
    
    if (placeholder === 'skeleton') {
      return (
        <div 
          className={`animate-pulse bg-gray-200 dark:bg-gray-700 ${className}`}
          style={{ width, height }}
          aria-label="Loading image..."
        />
      );
    }

    if (placeholder === 'blur' && blurPlaceholder) {
      return (
        <img
          src={blurPlaceholder}
          alt=""
          className={`transition-opacity duration-300 ${className} ${isLoaded ? 'opacity-0' : 'opacity-100'}`}
          style={{ width, height }}
          aria-hidden="true"
        />
      );
    }

    return (
      <div 
        className={`bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${className}`}
        style={{ width, height }}
        aria-label="Loading image..."
      >
        <svg 
          className="w-8 h-8 text-gray-400 animate-spin" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  };

  // Error state
  if (isError) {
    return (
      <div 
        className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-center ${className}`}
        style={{ width, height }}
        role="img"
        aria-label={`Failed to load image: ${alt}`}
      >
        <div className="text-center p-4">
          <svg 
            className="w-8 h-8 text-red-400 mx-auto mb-2" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
            />
          </svg>
          <p className="text-sm text-red-600 dark:text-red-400">Failed to load image</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      {/* Placeholder */}
      {!isLoaded && renderPlaceholder()}
      
      {/* Main Image */}
      <img
        ref={imgRef}
        src={priority || !lazy ? currentSrc : undefined}
        srcSet={priority || !lazy ? srcSet() : undefined}
        sizes={sizes}
        alt={alt}
        className={`transition-opacity duration-300 ${className} ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${lazy && !priority ? 'lazy-loading' : ''}`}
        style={{ width, height }}
        onLoad={handleLoad}
        onError={handleError}
        loading={lazy && !priority ? 'lazy' : 'eager'}
        decoding="async"
      />
    </div>
  );
};

/**
 * BackgroundImage Component
 * Optimized background image with lazy loading support
 */
export interface BackgroundImageProps {
  src: string;
  className?: string;
  children?: React.ReactNode;
  options?: {
    quality?: number;
    format?: 'webp' | 'avif' | 'jpeg' | 'png';
    lazy?: boolean;
    priority?: boolean;
  };
}

export const BackgroundImage: React.FC<BackgroundImageProps> = ({
  src,
  className = '',
  children,
  options = {}
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [optimizedSrc, setOptimizedSrc] = useState<string>('');
  const elementRef = useRef<HTMLDivElement>(null);

  const { lazy = true, priority = false, quality = 80, format } = options;

  useEffect(() => {
    const optimalFormat = format || getOptimalImageFormat();
    const optimized = optimizeImageUrl(src, {
      quality,
      format: optimalFormat
    });
    
    if (priority || !lazy) {
      setOptimizedSrc(optimized);
    } else {
      // Lazy load background image
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setOptimizedSrc(optimized);
              observer.unobserve(entry.target);
            }
          });
        },
        { rootMargin: '50px 0px' }
      );

      if (elementRef.current) {
        observer.observe(elementRef.current);
      }

      return () => observer.disconnect();
    }
  }, [src, lazy, priority, quality, format]);

  useEffect(() => {
    if (optimizedSrc) {
      const img = new Image();
      img.onload = () => setIsLoaded(true);
      img.src = optimizedSrc;
    }
  }, [optimizedSrc]);

  return (
    <div
      ref={elementRef}
      className={`transition-opacity duration-500 ${className} ${
        isLoaded ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        backgroundImage: optimizedSrc ? `url(${optimizedSrc})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {children}
    </div>
  );
};

export default OptimizedImage;
/**
 * Advanced Image Optimization Utilities
 * Provides comprehensive image optimization for enterprise performance
 */

export interface ImageOptimizationOptions {
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  width?: number;
  height?: number;
  lazy?: boolean;
  placeholder?: 'blur' | 'empty' | 'skeleton';
  priority?: boolean;
  sizes?: string;
}

export interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  options?: ImageOptimizationOptions;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Generate optimized image URLs with different formats and sizes
 */
export const generateImageSrcSet = (
  src: string,
  options: ImageOptimizationOptions = {}
): string => {
  const { quality = 80, format = 'webp' } = options;
  const sizes = [320, 640, 768, 1024, 1280, 1920];
  
  return sizes
    .map(size => {
      const optimizedSrc = optimizeImageUrl(src, {
        ...options,
        width: size,
        quality,
        format
      });
      return `${optimizedSrc} ${size}w`;
    })
    .join(', ');
};

/**
 * Optimize image URL with parameters
 */
export const optimizeImageUrl = (
  src: string,
  options: ImageOptimizationOptions = {}
): string => {
  // If it's already an optimized URL or external URL, return as is
  if (src.startsWith('http') || src.includes('?')) {
    return src;
  }

  const params = new URLSearchParams();
  
  if (options.width) params.set('w', options.width.toString());
  if (options.height) params.set('h', options.height.toString());
  if (options.quality) params.set('q', options.quality.toString());
  if (options.format) params.set('f', options.format);
  
  const queryString = params.toString();
  return queryString ? `${src}?${queryString}` : src;
};

/**
 * Create blur placeholder for images
 */
export const createBlurPlaceholder = (width: number, height: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // Create gradient blur effect
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f3f4f6');
  gradient.addColorStop(0.5, '#e5e7eb');
  gradient.addColorStop(1, '#d1d5db');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL('image/jpeg', 0.1);
};

/**
 * Preload critical images
 */
export const preloadImage = (src: string, options: ImageOptimizationOptions = {}): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
    
    // Set srcset for responsive images
    if (options.width || options.height) {
      img.srcset = generateImageSrcSet(src, options);
    }
    
    img.src = optimizeImageUrl(src, options);
  });
};

/**
 * Batch preload multiple images
 */
export const preloadImages = async (
  images: Array<{ src: string; options?: ImageOptimizationOptions }>
): Promise<void> => {
  const preloadPromises = images.map(({ src, options }) => 
    preloadImage(src, options).catch(error => {
      console.warn(`Failed to preload image ${src}:`, error);
      return null;
    })
  );
  
  await Promise.allSettled(preloadPromises);
};

/**
 * Intersection Observer for lazy loading
 */
class LazyImageObserver {
  private observer: IntersectionObserver;
  private images = new Set<HTMLImageElement>();
  
  constructor() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            this.loadImage(img);
            this.observer.unobserve(img);
            this.images.delete(img);
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.01
      }
    );
  }
  
  observe(img: HTMLImageElement): void {
    this.images.add(img);
    this.observer.observe(img);
  }
  
  unobserve(img: HTMLImageElement): void {
    this.images.delete(img);
    this.observer.unobserve(img);
  }
  
  private loadImage(img: HTMLImageElement): void {
    const src = img.dataset.src;
    const srcset = img.dataset.srcset;
    
    if (src) {
      img.src = src;
      img.removeAttribute('data-src');
    }
    
    if (srcset) {
      img.srcset = srcset;
      img.removeAttribute('data-srcset');
    }
    
    img.classList.remove('lazy-loading');
    img.classList.add('lazy-loaded');
  }
  
  disconnect(): void {
    this.observer.disconnect();
    this.images.clear();
  }
}

// Global lazy image observer instance
export const lazyImageObserver = new LazyImageObserver();

/**
 * Image format detection and fallback
 */
export const detectImageFormat = (): {
  webp: boolean;
  avif: boolean;
  jpeg: boolean;
  png: boolean;
} => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  return {
    webp: canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0,
    avif: canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0,
    jpeg: true, // Always supported
    png: true   // Always supported
  };
};

/**
 * Get optimal image format based on browser support
 */
export const getOptimalImageFormat = (): 'avif' | 'webp' | 'jpeg' => {
  const support = detectImageFormat();
  
  if (support.avif) return 'avif';
  if (support.webp) return 'webp';
  return 'jpeg';
};

/**
 * Calculate image dimensions maintaining aspect ratio
 */
export const calculateImageDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth?: number,
  maxHeight?: number
): { width: number; height: number } => {
  let { width, height } = { width: originalWidth, height: originalHeight };
  
  if (maxWidth && width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }
  
  if (maxHeight && height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }
  
  return { width: Math.round(width), height: Math.round(height) };
};

/**
 * Image compression utility
 */
export const compressImage = (
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: string;
  } = {}
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }
    
    img.onload = () => {
      const { width, height } = calculateImageDimensions(
        img.width,
        img.height,
        options.maxWidth,
        options.maxHeight
      );
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        options.format || 'image/jpeg',
        options.quality || 0.8
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};
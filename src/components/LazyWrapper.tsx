import React, { Suspense, lazy, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';
import { PageErrorBoundary } from './ErrorBoundary';

// Loading component with skeleton
const LoadingFallback: React.FC<{ 
  type?: 'page' | 'component' | 'modal';
  height?: string;
}> = ({ type = 'component', height = 'auto' }) => {
  const getLoadingContent = () => {
    switch (type) {
      case 'page':
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">Loading page...</p>
            </div>
          </div>
        );
      case 'modal':
        return (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-300">Loading...</p>
            </div>
          </div>
        );
      default:
        return (
          <div 
            className="flex items-center justify-center p-4"
            style={{ height: height !== 'auto' ? height : '200px' }}
          >
            <div className="text-center">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Loading component...</p>
            </div>
          </div>
        );
    }
  };

  return getLoadingContent();
};

// Skeleton components for different layouts
export const PageSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
    <div className="max-w-7xl mx-auto">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4 animate-pulse" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
      </div>
      
      {/* Content skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3 animate-pulse" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2 animate-pulse" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const ComponentSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="p-4 space-y-3">
    {[...Array(lines)].map((_, i) => (
      <div 
        key={i} 
        className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
        style={{ width: `${Math.random() * 40 + 60}%` }}
      />
    ))}
  </div>
);

// Lazy wrapper with error boundary and loading states
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  type?: 'page' | 'component' | 'modal';
  height?: string;
}

export const LazyWrapper: React.FC<LazyWrapperProps> = ({
  children,
  fallback,
  errorFallback,
  type = 'component',
  height = 'auto'
}) => {
  const defaultFallback = fallback || <LoadingFallback type={type} height={height} />;
  
  return (
    <PageErrorBoundary fallback={errorFallback}>
      <Suspense fallback={defaultFallback}>
        {children}
      </Suspense>
    </PageErrorBoundary>
  );
};

// Higher-order component for lazy loading
export const withLazyLoading = <P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    fallback?: React.ReactNode;
    errorFallback?: React.ReactNode;
    type?: 'page' | 'component' | 'modal';
    height?: string;
  }
) => {
  const LazyComponent = lazy(importFunc);
  
  const WrappedComponent: React.FC<P> = (props) => (
    <LazyWrapper
      fallback={options?.fallback}
      errorFallback={options?.errorFallback}
      type={options?.type}
      height={options?.height}
    >
      <LazyComponent {...props} />
    </LazyWrapper>
  );
  
  WrappedComponent.displayName = `LazyLoaded(${LazyComponent.displayName || 'Component'})`;
  return WrappedComponent;
};

// Preload function for critical components
export const preloadComponent = (importFunc: () => Promise<any>) => {
  const componentImport = importFunc();
  return componentImport;
};

// Intersection Observer based lazy loading for images and components
export const useIntersectionObserver = (
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [hasIntersected, setHasIntersected] = React.useState(false);

  React.useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref, options, hasIntersected]);

  return { isIntersecting, hasIntersected };
};

// Lazy Image component
interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder,
  className = '',
  ...props
}) => {
  const imgRef = React.useRef<HTMLImageElement>(null);
  const { hasIntersected } = useIntersectionObserver(imgRef);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  const handleLoad = () => setIsLoaded(true);
  const handleError = () => setHasError(true);

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {/* Placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
          {placeholder ? (
            <img src={placeholder} alt="" className="opacity-50" />
          ) : (
            <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded" />
          )}
        </div>
      )}
      
      {/* Actual image */}
      {hasIntersected && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${hasError ? 'hidden' : ''}`}
          {...props}
        />
      )}
      
      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded mx-auto mb-2" />
            <p className="text-xs">Failed to load</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LazyWrapper;
import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Loader2, Route as RouteIcon, AlertTriangle } from 'lucide-react';
import { cn } from '../utils/cn';
import { createLazyComponent } from './CodeSplittingManager';

interface RouteConfig {
  path: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  chunkName: string;
  estimatedSize?: number;
  preload?: boolean;
  fallback?: React.ReactNode;
  errorBoundary?: boolean;
  metadata?: {
    title?: string;
    description?: string;
    requiresAuth?: boolean;
    roles?: string[];
  };
}

interface LazyRouteManagerProps {
  routes: RouteConfig[];
  fallback?: React.ReactNode;
  onRouteLoad?: (path: string, loadTime: number) => void;
  onRouteError?: (path: string, error: Error) => void;
  showLoadingIndicator?: boolean;
  preloadStrategy?: 'none' | 'hover' | 'visible' | 'immediate';
  className?: string;
}

// Route loading statistics
interface RouteStats {
  path: string;
  chunkName: string;
  loadTime?: number;
  error?: string;
  preloaded: boolean;
  visited: boolean;
  lastVisited?: Date;
}

class RouteManager {
  private static instance: RouteManager;
  private routeStats = new Map<string, RouteStats>();
  private preloadedRoutes = new Set<string>();
  private observers = new Set<(stats: Map<string, RouteStats>) => void>();

  static getInstance(): RouteManager {
    if (!RouteManager.instance) {
      RouteManager.instance = new RouteManager();
    }
    return RouteManager.instance;
  }

  // Register a route
  registerRoute(config: RouteConfig): void {
    if (!this.routeStats.has(config.path)) {
      this.routeStats.set(config.path, {
        path: config.path,
        chunkName: config.chunkName,
        preloaded: false,
        visited: false
      });
      this.notifyObservers();
    }
  }

  // Mark route as visited
  markRouteVisited(path: string, loadTime?: number): void {
    const stats = this.routeStats.get(path);
    if (stats) {
      stats.visited = true;
      stats.lastVisited = new Date();
      if (loadTime) {
        stats.loadTime = loadTime;
      }
      this.notifyObservers();
    }
  }

  // Mark route as preloaded
  markRoutePreloaded(path: string): void {
    const stats = this.routeStats.get(path);
    if (stats) {
      stats.preloaded = true;
      this.preloadedRoutes.add(path);
      this.notifyObservers();
    }
  }

  // Mark route error
  markRouteError(path: string, error: string): void {
    const stats = this.routeStats.get(path);
    if (stats) {
      stats.error = error;
      this.notifyObservers();
    }
  }

  // Get route statistics
  getRouteStats(): Map<string, RouteStats> {
    return new Map(this.routeStats);
  }

  // Get overall statistics
  getOverallStats(): {
    totalRoutes: number;
    visitedRoutes: number;
    preloadedRoutes: number;
    errorRoutes: number;
    averageLoadTime: number;
  } {
    const routes = Array.from(this.routeStats.values());
    const visitedRoutes = routes.filter(r => r.visited);
    const loadTimes = visitedRoutes.filter(r => r.loadTime).map(r => r.loadTime!);
    
    return {
      totalRoutes: routes.length,
      visitedRoutes: visitedRoutes.length,
      preloadedRoutes: routes.filter(r => r.preloaded).length,
      errorRoutes: routes.filter(r => r.error).length,
      averageLoadTime: loadTimes.length > 0 ? loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length : 0
    };
  }

  // Subscribe to updates
  subscribe(observer: (stats: Map<string, RouteStats>) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  private notifyObservers(): void {
    this.observers.forEach(observer => observer(new Map(this.routeStats)));
  }
}

// Route loading fallback
const RouteFallback: React.FC<{ 
  routePath?: string;
  chunkName?: string;
  showDetails?: boolean;
}> = ({ routePath, chunkName, showDetails = false }) => (
  <div className="flex items-center justify-center min-h-[400px] p-8">
    <div className="text-center space-y-4">
      <div className="flex items-center justify-center">
        <div className="relative">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <RouteIcon className="w-4 h-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-600" />
        </div>
      </div>
      
      <div>
        <p className="text-lg font-medium text-gray-900 mb-1">Loading page...</p>
        {showDetails && (
          <div className="text-sm text-gray-500 space-y-1">
            {routePath && <p>Route: {routePath}</p>}
            {chunkName && <p>Chunk: {chunkName}</p>}
          </div>
        )}
      </div>
      
      <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }} />
      </div>
    </div>
  </div>
);

// Route error boundary
class RouteErrorBoundary extends React.Component<
  { 
    children: React.ReactNode;
    routePath?: string;
    onError?: (error: Error) => void;
  },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; routePath?: string; onError?: (error: Error) => void; }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Route loading error:', error, errorInfo);
    this.props.onError?.(error);
    
    // Mark route as error in RouteManager
    if (this.props.routePath) {
      RouteManager.getInstance().markRouteError(this.props.routePath, error.message);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>
            
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load page</h2>
              <p className="text-gray-600 mb-4">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              {this.props.routePath && (
                <p className="text-sm text-gray-500 mb-4">Route: {this.props.routePath}</p>
              )}
            </div>
            
            <div className="space-x-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Reload Page
              </button>
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Route statistics component
const RouteStats: React.FC<{ className?: string }> = ({ className }) => {
  const [routeStats, setRouteStats] = useState<Map<string, RouteStats>>(new Map());
  const routeManager = RouteManager.getInstance();

  useEffect(() => {
    const unsubscribe = routeManager.subscribe(setRouteStats);
    setRouteStats(routeManager.getRouteStats());
    return unsubscribe;
  }, []);

  const overallStats = routeManager.getOverallStats();
  const routes = Array.from(routeStats.values());

  if (routes.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overview */}
      <div className="flex items-center gap-4 p-4 bg-white rounded-lg border shadow-sm">
        <div className="flex items-center gap-2">
          <RouteIcon className="w-5 h-5 text-purple-500" />
          <span className="font-medium">Route Loading</span>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          <div className="text-gray-600">
            {overallStats.visitedRoutes}/{overallStats.totalRoutes} visited
          </div>
          
          <div className="text-blue-600">
            {overallStats.preloadedRoutes} preloaded
          </div>
          
          {overallStats.errorRoutes > 0 && (
            <div className="text-red-600">
              {overallStats.errorRoutes} errors
            </div>
          )}
          
          {overallStats.averageLoadTime > 0 && (
            <div className="flex items-center gap-1 text-green-600">
              <Clock className="w-4 h-4" />
              <span>{Math.round(overallStats.averageLoadTime)}ms avg</span>
            </div>
          )}
        </div>
      </div>

      {/* Route details */}
      <div className="grid gap-2">
        {routes.map((route) => (
          <div key={route.path} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              {route.error ? (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              ) : route.visited ? (
                <div className="w-4 h-4 rounded-full bg-green-500" />
              ) : route.preloaded ? (
                <div className="w-4 h-4 rounded-full bg-blue-500" />
              ) : (
                <div className="w-4 h-4 rounded-full bg-gray-300" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {route.path}
                </span>
                <span className="text-xs text-gray-500">
                  {route.chunkName}
                </span>
                {route.loadTime && (
                  <span className="text-xs text-green-600">
                    {Math.round(route.loadTime)}ms
                  </span>
                )}
              </div>
              
              {route.error && (
                <p className="text-xs text-red-600 mt-1">{route.error}</p>
              )}
              
              {route.lastVisited && (
                <p className="text-xs text-gray-500 mt-1">
                  Last visited: {route.lastVisited.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main LazyRouteManager component
export const LazyRouteManager: React.FC<LazyRouteManagerProps> = ({
  routes,
  fallback,
  onRouteLoad,
  onRouteError,
  showLoadingIndicator = false,
  preloadStrategy = 'none',
  className
}) => {
  const location = useLocation();
  const routeManager = RouteManager.getInstance();
  const [routeStats, setRouteStats] = useState<Map<string, RouteStats>>(new Map());

  // Register routes on mount
  useEffect(() => {
    routes.forEach(route => {
      routeManager.registerRoute(route);
    });
  }, [routes]);

  // Subscribe to route statistics
  useEffect(() => {
    const unsubscribe = routeManager.subscribe((stats) => {
      setRouteStats(new Map(stats));
      
      // Notify about route loads and errors
      stats.forEach((routeStat) => {
        if (routeStat.visited && routeStat.loadTime && onRouteLoad) {
          onRouteLoad(routeStat.path, routeStat.loadTime);
        }
        if (routeStat.error && onRouteError) {
          onRouteError(routeStat.path, new Error(routeStat.error));
        }
      });
    });
    
    return unsubscribe;
  }, [onRouteLoad, onRouteError]);

  // Track route visits
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const loadTime = performance.now() - startTime;
      routeManager.markRouteVisited(location.pathname, loadTime);
    };
  }, [location.pathname]);

  // Preload routes based on strategy
  useEffect(() => {
    if (preloadStrategy === 'immediate') {
      routes.forEach(route => {
        if (route.preload !== false) {
          // Preload the component
          route.component.preload?.();
          routeManager.markRoutePreloaded(route.path);
        }
      });
    }
  }, [routes, preloadStrategy]);



  // Create route elements
  const routeElements = routes.map((route) => {
    const RouteComponent = route.component;
    const routeFallback = route.fallback || fallback || (
      <RouteFallback 
        routePath={route.path}
        chunkName={route.chunkName}
        showDetails={showLoadingIndicator}
      />
    );

    const routeElement = (
      <Suspense fallback={routeFallback}>
        <RouteComponent />
      </Suspense>
    );

    return (
      <Route
        key={route.path}
        path={route.path}
        element={
          route.errorBoundary !== false ? (
            <RouteErrorBoundary 
              routePath={route.path}
              onError={onRouteError}
            >
              {routeElement}
            </RouteErrorBoundary>
          ) : (
            routeElement
          )
        }
      />
    );
  });

  return (
    <div className={cn('space-y-4', className)}>
      {showLoadingIndicator && <RouteStats />}
      
      <Routes>
        {routeElements}
      </Routes>
    </div>
  );
};

// Hook for accessing route information
export const useRouteInfo = () => {
  const [routeStats, setRouteStats] = useState<Map<string, RouteStats>>(new Map());
  const routeManager = RouteManager.getInstance();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = routeManager.subscribe(setRouteStats);
    setRouteStats(routeManager.getRouteStats());
    return unsubscribe;
  }, []);

  return {
    currentRoute: location.pathname,
    routeStats: Array.from(routeStats.values()),
    overallStats: routeManager.getOverallStats(),
    currentRouteStats: routeStats.get(location.pathname)
  };
};

// Utility function to create route configs
export const createRouteConfig = (
  path: string,
  importFn: () => Promise<{ default: React.ComponentType<any> }>,
  options: Partial<Omit<RouteConfig, 'path' | 'component'>> = {}
): RouteConfig => {
  const chunkName = options.chunkName || path.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+|_+$/g, '');
  
  return {
    path,
    component: createLazyComponent(importFn, chunkName, options.estimatedSize),
    chunkName,
    ...options
  };
};

export default LazyRouteManager;
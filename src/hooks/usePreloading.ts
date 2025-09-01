import { useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { preloader, preloadUtils } from '../utils/preloader';
import logger from '../utils/logger';
import { performanceMonitor } from '../utils/performance';

// Route preloading configuration
interface RoutePreloadConfig {
  path: string;
  priority: 'high' | 'medium' | 'low';
  preloadOnHover?: boolean;
  preloadOnIntent?: boolean;
  dependencies?: string[];
}

// Default route configurations
const routeConfigs: RoutePreloadConfig[] = [
  {
    path: '/chat',
    priority: 'high',
    preloadOnHover: true,
    preloadOnIntent: true,
    dependencies: ['/api/chat/history', '/api/user/preferences']
  },
  {
    path: '/analytics',
    priority: 'medium',
    preloadOnHover: true,
    preloadOnIntent: false,
    dependencies: ['/api/analytics/dashboard', '/api/analytics/metrics']
  },
  {
    path: '/documents',
    priority: 'medium',
    preloadOnHover: true,
    preloadOnIntent: true,
    dependencies: ['/api/documents/list', '/api/documents/recent']
  },
  {
    path: '/settings',
    priority: 'low',
    preloadOnHover: false,
    preloadOnIntent: false,
    dependencies: ['/api/user/settings', '/api/system/config']
  }
];

// Hook for intelligent preloading
export const usePreloading = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const preloadedRoutes = useRef(new Set<string>());
  const hoverTimeouts = useRef(new Map<string, NodeJS.Timeout>());

  // Preload route and its dependencies
  const preloadRoute = useCallback((path: string, priority: 'high' | 'medium' | 'low' = 'medium') => {
    if (preloadedRoutes.current.has(path)) {
      return;
    }

    const startTime = performance.now();
    
    try {
      // Preload the route component
      preloadUtils.preloadRoute(path);
      
      // Find route configuration
      const config = routeConfigs.find(r => r.path === path);
      
      if (config?.dependencies) {
        // Preload API dependencies
        config.dependencies.forEach(dep => {
          preloader.addToQueue({
            url: dep,
            type: 'fetch',
            config: { priority: config.priority }
          });
        });
      }

      preloadedRoutes.current.add(path);
      
      const loadTime = performance.now() - startTime;
      performanceMonitor.addMetric({
        name: 'route_preload',
        value: loadTime,
        timestamp: Date.now(),
        type: 'timing',
        tags: { path, priority }
      });

      logger.debug('Route preloaded', {
        path,
        priority,
        loadTime: Math.round(loadTime),
        dependencies: config?.dependencies?.length || 0
      });

    } catch (error) {
      logger.warn('Failed to preload route', {
        path,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, []);

  // Preload on hover with delay
  const preloadOnHover = useCallback((path: string, delay = 200) => {
    const config = routeConfigs.find(r => r.path === path);
    if (!config?.preloadOnHover) {
      return () => {}; // Return empty cleanup function
    }

    return (element: HTMLElement) => {
      const handleMouseEnter = () => {
        const timeoutId = setTimeout(() => {
          preloadRoute(path, config.priority);
        }, delay);
        hoverTimeouts.current.set(path, timeoutId);
      };

      const handleMouseLeave = () => {
        const timeoutId = hoverTimeouts.current.get(path);
        if (timeoutId) {
          clearTimeout(timeoutId);
          hoverTimeouts.current.delete(path);
        }
      };

      element.addEventListener('mouseenter', handleMouseEnter);
      element.addEventListener('mouseleave', handleMouseLeave);

      // Return cleanup function
      return () => {
        element.removeEventListener('mouseenter', handleMouseEnter);
        element.removeEventListener('mouseleave', handleMouseLeave);
        const timeoutId = hoverTimeouts.current.get(path);
        if (timeoutId) {
          clearTimeout(timeoutId);
          hoverTimeouts.current.delete(path);
        }
      };
    };
  }, [preloadRoute]);

  // Preload on navigation intent (e.g., when user starts typing in search)
  const preloadOnIntent = useCallback((path: string) => {
    const config = routeConfigs.find(r => r.path === path);
    if (config?.preloadOnIntent) {
      preloadRoute(path, config.priority);
    }
  }, [preloadRoute]);

  // Preload adjacent routes based on current location
  const preloadAdjacentRoutes = useCallback(() => {
    const currentPath = location.pathname;
    const routeOrder = ['/home', '/chat', '/analytics', '/documents', '/settings'];
    const currentIndex = routeOrder.indexOf(currentPath);

    if (currentIndex !== -1) {
      // Preload next route
      if (currentIndex < routeOrder.length - 1) {
        const nextRoute = routeOrder[currentIndex + 1];
        preloadRoute(nextRoute, 'low');
      }
      
      // Preload previous route
      if (currentIndex > 0) {
        const prevRoute = routeOrder[currentIndex - 1];
        preloadRoute(prevRoute, 'low');
      }
    }
  }, [location.pathname, preloadRoute]);

  // Preload based on user behavior patterns
  const preloadByPattern = useCallback(() => {
    const currentPath = location.pathname;
    const hour = new Date().getHours();
    
    // Business hours logic
    if (hour >= 9 && hour <= 17) {
      if (currentPath === '/home') {
        preloadRoute('/chat', 'high');
        preloadRoute('/documents', 'medium');
      } else if (currentPath === '/chat') {
        preloadRoute('/documents', 'medium');
        preloadRoute('/analytics', 'low');
      }
    }
    
    // Evening/weekend logic
    else {
      if (currentPath === '/home') {
        preloadRoute('/settings', 'medium');
      }
    }
  }, [location.pathname, preloadRoute]);

  // Initialize preloading on route change
  useEffect(() => {
    const timer = setTimeout(() => {
      preloadAdjacentRoutes();
      preloadByPattern();
    }, 500); // Small delay to avoid blocking initial render

    return () => clearTimeout(timer);
  }, [location.pathname, preloadAdjacentRoutes, preloadByPattern]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all hover timeouts
      hoverTimeouts.current.forEach(timeout => clearTimeout(timeout));
      hoverTimeouts.current.clear();
    };
  }, []);

  // Get preloading statistics
  const getStats = useCallback(() => {
    return {
      preloadedRoutes: Array.from(preloadedRoutes.current),
      pendingHovers: hoverTimeouts.current.size,
      preloaderStats: preloader.getStats()
    };
  }, []);

  return {
    preloadRoute,
    preloadOnHover,
    preloadOnIntent,
    preloadAdjacentRoutes,
    getStats
  };
};

// Hook for preloading images
export const useImagePreloading = () => {
  const preloadedImages = useRef(new Set<string>());

  const preloadImage = useCallback((src: string, priority: 'high' | 'medium' | 'low' = 'medium') => {
    if (preloadedImages.current.has(src)) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      preloader.addToQueue({
        url: src,
        type: 'image',
        config: { priority }
      });

      preloadedImages.current.add(src);
      
      // Simple resolution - in a real implementation, you'd wait for the actual load
      setTimeout(resolve, 100);
    });
  }, []);

  const preloadImagesInViewport = useCallback(() => {
    preloadUtils.preloadImagesInViewport();
  }, []);

  return {
    preloadImage,
    preloadImagesInViewport
  };
};

// Hook for API preloading
export const useApiPreloading = () => {
  const preloadedApis = useRef(new Set<string>());

  const preloadApi = useCallback((endpoint: string, priority: 'high' | 'medium' | 'low' = 'medium') => {
    if (preloadedApis.current.has(endpoint)) {
      return;
    }

    preloader.addToQueue({
      url: endpoint,
      type: 'fetch',
      config: { priority }
    });

    preloadedApis.current.add(endpoint);
    
    logger.debug('API endpoint preloaded', { endpoint, priority });
  }, []);

  const preloadUserData = useCallback(() => {
    preloadApi('/api/user/profile', 'high');
    preloadApi('/api/user/preferences', 'medium');
    preloadApi('/api/user/settings', 'low');
  }, [preloadApi]);

  const preloadDashboardData = useCallback(() => {
    preloadApi('/api/analytics/dashboard', 'high');
    preloadApi('/api/analytics/metrics', 'medium');
    preloadApi('/api/documents/recent', 'medium');
  }, [preloadApi]);

  return {
    preloadApi,
    preloadUserData,
    preloadDashboardData
  };
};

export default usePreloading;
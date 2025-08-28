import React, { ComponentType } from 'react';

// Enhanced lazy loading with error boundaries and retry logic
export interface LazyComponentOptions {
  fallback?: React.ComponentType;
  retries?: number;
  retryDelay?: number;
  onError?: (error: Error) => void;
  onLoad?: (componentName: string, loadTime: number) => void;
  preload?: boolean;
  chunkName?: string;
}

type ImportFunction<T = Record<string, unknown>> = () => Promise<{ default: ComponentType<T> }>;
type LazyLoadOptions = LazyComponentOptions;
type LazyExoticComponent<T> = ComponentType<T>;

// Cache for preloaded components
const preloadCache = new Map<string, Promise<{ default: ComponentType<Record<string, unknown>> }>>();

// Retry mechanism for failed imports
const retryImport = async <T>(
  importFn: ImportFunction<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<{ default: ComponentType<T> }> => {
  try {
    return await importFn();
  } catch (error) {
    if (retries > 0) {
      console.warn(`Import failed, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryImport(importFn, retries - 1, delay * 1.5); // Exponential backoff
    }
    throw error;
  }
};

// Enhanced lazy loader with options
export const createLazyComponent = <T = Record<string, unknown>>(
  importFn: ImportFunction<T>,
  options: LazyLoadOptions = {}
): LazyExoticComponent<ComponentType<T>> => {
  const {
    retries = 3,
    retryDelay = 1000,
    preload = false,
    chunkName
  } = options;

  const enhancedImportFn = () => retryImport(importFn, retries, retryDelay);

  // Preload if requested
  if (preload && chunkName) {
    if (!preloadCache.has(chunkName)) {
      preloadCache.set(chunkName, enhancedImportFn());
    }
  }

  return enhancedImportFn as LazyExoticComponent<ComponentType<T>>;
};

// Preload function for manual preloading
export const preloadComponent = <T = Record<string, unknown>>(
  importFn: ImportFunction<T>,
  chunkName: string
): Promise<{ default: ComponentType<T> }> => {
  if (!preloadCache.has(chunkName)) {
    preloadCache.set(chunkName, importFn());
  }
  return preloadCache.get(chunkName)!;
};

// Route-based lazy loading
export const createLazyRoute = <T = Record<string, unknown>>(
  importFn: ImportFunction<T>,
  routeName: string,
  options: LazyLoadOptions = {}
) => {
  return createLazyComponent(importFn, {
    ...options,
    chunkName: `route-${routeName}`,
    preload: false // Routes should not be preloaded by default
  });
};

// Component-based lazy loading with intelligent preloading
export const createLazyComponentWithPreload = <T = Record<string, unknown>>(
  importFn: ImportFunction<T>,
  componentName: string,
  preloadTrigger?: 'hover' | 'viewport' | 'immediate'
) => {
  const LazyComponent = createLazyComponent(importFn, {
    chunkName: `component-${componentName}`,
    preload: preloadTrigger === 'immediate'
  });

  // Add preload methods
  (LazyComponent as ComponentType<T> & { preload?: () => Promise<{ default: ComponentType<T> }> }).preload = () => preloadComponent(importFn, `component-${componentName}`);
  
  return LazyComponent;
};

// Bundle splitting utilities
export const bundleSplitPoints = {
  // Core app components (always loaded)
  core: [
    'App',
    'Router',
    'ErrorBoundary',
    'LoadingSpinner'
  ],
  
  // Feature-based chunks
  chat: [
    'OptimizedChat',
    'ConversationHistory',
    'VoiceInterface',
    'RealTimeCollaboration'
  ],
  
  // Admin/Dashboard chunks
  admin: [
    'Dashboard',
    'Analytics',
    'UserManagement',
    'SystemSettings'
  ],
  
  // PWA chunks
  pwa: [
    'PWAManager',
    'PWASettings',
    'PushNotificationManager',
    'OfflineSync'
  ],
  
  // Utility chunks
  utils: [
    'Charts',
    'FileUpload',
    'ImageOptimizer',
    'DataExport'
  ]
};

// Lazy load definitions for major components
export const LazyComponents = {
  // Chat components
  OptimizedChat: createLazyComponentWithPreload(
    () => import('../components/OptimizedChat'),
    'OptimizedChat',
    'immediate'
  ),
  
  ConversationHistory: createLazyComponentWithPreload(
    () => import('../components/ConversationHistory'),
    'ConversationHistory',
    'hover'
  ),
  
  VoiceInterface: createLazyComponentWithPreload(
    () => import('../components/VoiceInterface'),
    'VoiceInterface'
  ),
  
  RealTimeCollaboration: createLazyComponentWithPreload(
    () => import('../components/RealTimeCollaboration'),
    'RealTimeCollaboration'
  ),
  
  // Dashboard components
  Dashboard: createLazyRoute(
    () => import('../components/Dashboard'),
    'dashboard'
  ),
  
  Analytics: createLazyRoute(
    () => import('../components/Analytics'),
    'analytics'
  ),
  
  UserManagement: createLazyRoute(
    () => import('../components/UserManagement'),
    'user-management'
  ),
  
  // PWA components
  PWAManager: createLazyComponentWithPreload(
    () => import('../components/PWAManager'),
    'PWAManager'
  ),
  
  PWASettings: createLazyComponentWithPreload(
    () => import('../components/PWASettings'),
    'PWASettings'
  ),
  
  PushNotificationManager: createLazyComponentWithPreload(
    () => import('../components/PushNotificationManager'),
    'PushNotificationManager'
  ),
  
  GestureNavigation: createLazyComponentWithPreload(
    () => import('../components/GestureNavigation'),
    'GestureNavigation'
  ),
  
  AppShell: createLazyComponentWithPreload(
    () => import('../components/AppShell'),
    'AppShell',
    'immediate'
  ),
  
  OfflineSync: createLazyComponentWithPreload(
    () => import('../components/OfflineSync'),
    'OfflineSync'
  )
};

// Preload strategies
export const preloadStrategies = {
  // Preload critical components on app start
  critical: () => {
    LazyComponents.OptimizedChat.preload?.();
    LazyComponents.AppShell.preload?.();
  },
  
  // Preload on user interaction
  onInteraction: () => {
    LazyComponents.ConversationHistory.preload?.();
    LazyComponents.PWAManager.preload?.();
  },
  
  // Preload on idle
  onIdle: () => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        LazyComponents.VoiceInterface.preload?.();
        LazyComponents.RealTimeCollaboration.preload?.();
        LazyComponents.GestureNavigation.preload?.();
      });
    }
  },
  
  // Preload based on route prediction
  predictive: (currentRoute: string) => {
    const routePreloadMap: Record<string, string[]> = {
      '/': ['OptimizedChat', 'ConversationHistory'],
      '/chat': ['VoiceInterface', 'RealTimeCollaboration'],
      '/dashboard': ['Analytics', 'UserManagement'],
      '/settings': ['PWASettings']
    };
    
    const componentsToPreload = routePreloadMap[currentRoute] || [];
    componentsToPreload.forEach(componentName => {
      const component = LazyComponents[componentName as keyof typeof LazyComponents];
      component?.preload?.();
    });
  }
};

// Performance monitoring for lazy loading
export const lazyLoadingMetrics = {
  loadTimes: new Map<string, number>(),
  errors: new Map<string, number>(),
  
  recordLoadTime: (componentName: string, loadTime: number) => {
    lazyLoadingMetrics.loadTimes.set(componentName, loadTime);
  },
  
  recordError: (componentName: string) => {
    const currentErrors = lazyLoadingMetrics.errors.get(componentName) || 0;
    lazyLoadingMetrics.errors.set(componentName, currentErrors + 1);
  },
  
  getMetrics: () => ({
    loadTimes: Object.fromEntries(lazyLoadingMetrics.loadTimes),
    errors: Object.fromEntries(lazyLoadingMetrics.errors),
    averageLoadTime: Array.from(lazyLoadingMetrics.loadTimes.values())
      .reduce((sum, time) => sum + time, 0) / lazyLoadingMetrics.loadTimes.size
  })
};

// Initialize preloading strategies
export const initializeLazyLoading = () => {
  // Preload critical components immediately
  preloadStrategies.critical();
  
  // Preload on first user interaction
  const handleFirstInteraction = () => {
    preloadStrategies.onInteraction();
    document.removeEventListener('click', handleFirstInteraction);
    document.removeEventListener('keydown', handleFirstInteraction);
    document.removeEventListener('touchstart', handleFirstInteraction);
  };
  
  document.addEventListener('click', handleFirstInteraction);
  document.addEventListener('keydown', handleFirstInteraction);
  document.addEventListener('touchstart', handleFirstInteraction);
  
  // Preload on idle
  setTimeout(() => {
    preloadStrategies.onIdle();
  }, 2000);
};

export default {
  createLazyComponent,
  createLazyRoute,
  createLazyComponentWithPreload,
  preloadComponent,
  LazyComponents,
  preloadStrategies,
  lazyLoadingMetrics,
  initializeLazyLoading
};
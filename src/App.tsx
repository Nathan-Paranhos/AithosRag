import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from './contexts/ThemeContext';
import { ThemeToggle } from './components/ui/ThemeToggle';
import usePWA from './hooks/usePWA';
// import { useGestures } from './hooks/useGestures';
import MobileNavigation from './components/MobileNavigation';
import PushNotifications from './components/PushNotifications';
import PullToRefresh from './components/PullToRefresh';
import AppRouter from './components/AppRouter';
import PerformanceMonitor from './components/PerformanceMonitor';
import { ConnectivityIndicator, ConnectivityStatusBar } from './components/ConnectivityIndicator';
import { useConnectivity } from './hooks/useConnectivity';
import { CriticalErrorBoundary, useErrorHandler } from './components/ErrorBoundary';
import { performanceMonitor } from './utils/performance';
import { logger } from './utils/logger';
import { preloader, preloadUtils } from './utils/preloader';
import { cacheManager } from './utils/cache';

// PWA App Content Component
const AppContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const pwaHook = usePWA();
  const {
    isInstalled,
    canInstall,
    installPWA
  } = pwaHook;
  
  // Use new connectivity system
  const connectivity = useConnectivity();
  const { captureError } = useErrorHandler();

  // Initialize performance monitoring and optimization systems
  useEffect(() => {
    performanceMonitor.startSession();
    
    // Initialize preloading system
    preloadUtils.preloadCritical();
    
    // Preload images in viewport
    const timer = setTimeout(() => {
      preloadUtils.preloadImagesInViewport();
    }, 1000);
    
    return () => {
      performanceMonitor.endSession();
      clearTimeout(timer);
      // Cleanup cache manager
      cacheManager.cleanupAll();
    };
  }, []);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize PWA features
  useEffect(() => {
    const initPWA = async () => {
      try {
        // PWA features are handled by the usePWA hook
        logger.info('PWA initialized', { isMobile, isInstalled });
        performanceMonitor.incrementCounter('pwa_initialization_success');
      } catch (error) {
        logger.error('PWA initialization failed', { error });
        captureError(error as Error, 'PWA initialization');
        performanceMonitor.incrementCounter('pwa_initialization_error');
      }
    };
    
    initPWA();
  }, [isMobile, pwaHook, isInstalled, captureError]);

  // Global gesture handlers (temporarily disabled to fix hook error)
  // const gestureHandlers = useGestures({
  //   onSwipeLeft: () => {
  //     // Navigate to next page or show side menu
  //     console.log('Global swipe left detected');
  //   },
  //   onSwipeRight: () => {
  //     // Navigate to previous page or go back
  //     if (window.history.length > 1) {
  //       navigate(-1);
  //     }
  //   },
  //   enabled: isMobile
  // });

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    const endTiming = performanceMonitor.startTiming('pull_to_refresh');
    
    try {
      logger.info('Pull to refresh initiated');
      
      // Simulate refresh delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Refresh current page data
      window.location.reload();
      
      performanceMonitor.incrementCounter('pull_to_refresh_success');
    } catch (error) {
      logger.error('Refresh failed', { error });
      captureError(error as Error, 'Pull to refresh');
      performanceMonitor.incrementCounter('pull_to_refresh_error');
    } finally {
      setRefreshing(false);
      endTiming();
    }
  };

  // Handle navigation
  const handleNavigation = (path: string) => {
    navigate(path);
  };

  // Handle notification click
  const handleNotificationClick = (notification: { data?: { path?: string } }) => {
    console.log('Notification clicked:', notification);
    
    // Navigate based on notification data
    if (notification.data?.path) {
      navigate(notification.data.path);
    }
  };

  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-900">
      {/* PWA Install Banner */}
      {canInstall && !isInstalled && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white p-3 text-center">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <span className="text-sm font-medium">
              Install Aithos RAG for better experience
            </span>
            <button
              onClick={installPWA}
              className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              Install
            </button>
          </div>
        </div>
      )}

      {/* Connectivity Status Bar */}
      <ConnectivityStatusBar className="z-40" />

      {/* Header with PWA Controls */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            {isInstalled && (
              <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs px-2 py-1 rounded-full">
                PWA
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Push Notifications */}
            <PushNotifications onNotificationClick={handleNotificationClick} />
            
            {/* Theme Toggle */}
            <ThemeToggle variant="button" size="sm" />
          </div>
        </div>
      </header>

      {/* Main Content with Pull-to-Refresh */}
      <main className="pt-16 pb-20">
        {isMobile ? (
          <PullToRefresh
            onRefresh={handleRefresh}
            disabled={refreshing}
            className="min-h-screen"
          >
            <AppRouter />
          </PullToRefresh>
        ) : (
          <AppRouter />
        )}
      </main>

      {/* Mobile Navigation */}
      {isMobile && (
        <MobileNavigation
          currentPath={location.pathname}
          onNavigate={handleNavigation}
        />
      )}

      {/* Connectivity Indicator */}
      <ConnectivityIndicator 
        position="top-right"
        showDetails={true}
        className="z-50"
      />
      
      {/* Toast Notifications */}
      <Toaster
        position={isMobile ? 'top-center' : 'bottom-right'}
        toastOptions={{
          style: {
            background: 'var(--background)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)'
          }
        }}
      />
      
      {/* Performance Monitor (Development Only) */}
      <PerformanceMonitor 
        enabled={process.env.NODE_ENV === 'development'}
        position="bottom-left"
        compact={isMobile}
      />
    </div>
  );
};

function App() {
  useEffect(() => {
    // Initialize global error handling
    const handleUnhandledError = (event: ErrorEvent) => {
      logger.critical(
        'Unhandled error',
        'Global',
        {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        },
        event.error
      );
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.critical(
        'Unhandled promise rejection',
        'Global',
        { reason: event.reason }
      );
    };

    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <CriticalErrorBoundary>
      <ThemeProvider defaultTheme="light" storageKey="aithos-theme">
        <Router>
          <AppContent />
        </Router>
      </ThemeProvider>
    </CriticalErrorBoundary>
  );
}

export default App;
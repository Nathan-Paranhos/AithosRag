import React, { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Home, Menu, X } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';
import { PageLoader } from './LoadingSpinner';
import ErrorBoundary from './ErrorBoundary';
import { LazyRouteManager, createRouteConfig } from './LazyRouteManager';
import { CodeSplittingManager } from './CodeSplittingManager';

// Configurações de rotas simplificadas
const routeConfigs = [
  createRouteConfig('/', () => import('./HomePage.tsx').then(module => ({ default: module.default })), {
    chunkName: 'home',
    estimatedSize: 15000,
    preload: true,
    metadata: { title: 'Home', description: 'Página inicial' }
  })
];

const Navigation: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navigationItems: Array<{ path: string; label: string; icon: React.ComponentType<any> }> = [
  ];

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-primary hover:bg-accent"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-border">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-primary hover:bg-accent"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

const AppRouter: React.FC = () => {
  const handleRouteLoad = (path: string, loadTime: number) => {
    console.log(`Route ${path} loaded in ${Math.round(loadTime)}ms`);
    
    // Track route performance
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(`route-${path}-loaded`);
    }
  };

  const handleRouteError = (path: string, error: Error) => {
    console.error(`Route ${path} failed to load:`, error);
    
    // Track route errors for analytics
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as { gtag: (...args: unknown[]) => void }).gtag('event', 'route_error', {
        route_path: path,
        error_message: error.message
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Navigation />

      {/* Main Content with Advanced Code Splitting */}
      <main className="flex-1">
        <ErrorBoundary
          autoRecover={true}
          maxRetries={3}
          showDetails={process.env.NODE_ENV === 'development'}
        >
          <CodeSplittingManager
            fallback={<PageLoader message="Carregando componentes..." />}
            onChunkLoad={() => {
              // Silent chunk loading - no debug output
            }}
            onChunkError={() => {
              // Silent error handling - no debug output
            }}
            showLoadingStats={false}
            preloadChunks={['home']} // Preload home chunk
          >
            <LazyRouteManager
              routes={[
                ...routeConfigs,
                {
                  path: '*',
                  component: () => Promise.resolve({ default: () => <Navigate to="/" replace /> }),
                  chunkName: 'fallback'
                }
              ]}
              fallback={<PageLoader message="Carregando página..." />}
              onRouteLoad={handleRouteLoad}
              onRouteError={handleRouteError}
              showLoadingIndicator={false} // Always disabled to prevent architecture exposure
              preloadStrategy="hover" // Preload routes on hover
            />
          </CodeSplittingManager>
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default AppRouter;
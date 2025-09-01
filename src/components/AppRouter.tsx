import React, { useState, Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Home, Menu, X, Bot, BarChart3, Settings, FileText, Layers } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';
import { CriticalErrorBoundary, PageErrorBoundary, ComponentErrorBoundary } from './ErrorBoundary';
import { LazyWrapper, PageSkeleton, withLazyLoading } from './LazyWrapper';
import { usePreloading } from '../hooks/usePreloading';
import { PageTransition, FadeIn, HoverAnimation } from './Animations';
import { AnimatePresence } from 'framer-motion';

// Lazy loaded components
const HomePage = withLazyLoading(
  () => import('../pages/HomePage'),
  { type: 'page', fallback: <PageSkeleton /> }
);

const ChatPage = withLazyLoading(
  () => import('../pages/ChatPage'),
  { type: 'page', fallback: <PageSkeleton /> }
);

const AnalyticsPage = withLazyLoading(
  () => import('../pages/AnalyticsPage'),
  { type: 'page', fallback: <PageSkeleton /> }
);

const SettingsPage = withLazyLoading(
  () => import('../pages/SettingsPage'),
  { type: 'page', fallback: <PageSkeleton /> }
);

const DocumentsPage = withLazyLoading(
  () => import('../pages/DocumentsPage'),
  { type: 'page', fallback: <PageSkeleton /> }
);

const CleanArchitectureDemo = withLazyLoading(
  () => import('./CleanArchitectureDemo'),
  { type: 'page', fallback: <PageSkeleton /> }
);

const Navigation: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { preloadOnHover, preloadRoute } = usePreloading();

  const navigationItems: Array<{ path: string; label: string; icon: React.ComponentType<any> }> = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/chat', label: 'AI Chat', icon: Bot },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/documents', label: 'Documents', icon: FileText },
    { path: '/architecture', label: 'Architecture', icon: Layers },
    { path: '/settings', label: 'Settings', icon: Settings }
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
                <HoverAnimation key={item.path} scale={1.02}>
                  <Link
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
                </HoverAnimation>
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
                  <HoverAnimation key={item.path} scale={1.02}>
                    <Link
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-primary hover:bg-accent"
                      )}
                      onMouseEnter={(e) => {
                        const cleanup = preloadOnHover(item.path);
                        if (cleanup && typeof cleanup === 'function') {
                          cleanup(e.currentTarget);
                        }
                      }}
                      onTouchStart={() => {
                        // Preload on touch for mobile
                        preloadRoute(item.path, 'medium');
                      }}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  </HoverAnimation>
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
    <CriticalErrorBoundary>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <ComponentErrorBoundary>
          <Navigation />
        </ComponentErrorBoundary>

        {/* Main Content with Lazy Loading */}
        <main className="flex-1">
          <Suspense fallback={<PageSkeleton />}>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route 
                  path="/" 
                  element={
                    <PageErrorBoundary>
                      <PageTransition><HomePage /></PageTransition>
                    </PageErrorBoundary>
                  } 
                />
                <Route 
                  path="/chat" 
                  element={
                    <PageErrorBoundary>
                      <PageTransition><ChatPage /></PageTransition>
                    </PageErrorBoundary>
                  } 
                />
                <Route 
                  path="/analytics" 
                  element={
                    <PageErrorBoundary>
                      <PageTransition><AnalyticsPage /></PageTransition>
                    </PageErrorBoundary>
                  } 
                />
                <Route 
                  path="/documents" 
                  element={
                    <PageErrorBoundary>
                      <PageTransition><DocumentsPage /></PageTransition>
                    </PageErrorBoundary>
                  } 
                />
                <Route 
                  path="/settings" 
                  element={
                    <PageErrorBoundary>
                      <PageTransition><SettingsPage /></PageTransition>
                    </PageErrorBoundary>
                  } 
                />
                <Route 
                  path="/architecture" 
                  element={
                    <PageErrorBoundary>
                      <PageTransition><CleanArchitectureDemo /></PageTransition>
                    </PageErrorBoundary>
                  } 
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AnimatePresence>
          </Suspense>
        </main>
      </div>
    </CriticalErrorBoundary>
  );
};

export default AppRouter;
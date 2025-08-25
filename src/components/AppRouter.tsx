import React, { useState, Suspense, lazy } from 'react';
import { Link, Navigate, useLocation, Routes, Route } from 'react-router-dom';
import { Home, Palette, Users, Shield, Building, BarChart3, Brain, History, Search, MessageSquare, Mic, Download, Menu, X } from '../utils/icons.tsx';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';
import { PageLoader } from './LoadingSpinner';
import ErrorBoundary from './ErrorBoundary';
import { LazyRouteManager, createRouteConfig } from './LazyRouteManager';
import { CodeSplittingManager } from './CodeSplittingManager';

// Route configurations with advanced lazy loading
const routeConfigs = [
  createRouteConfig('/', () => import('./HomePage'), {
    chunkName: 'home',
    estimatedSize: 15000,
    preload: true,
    metadata: { title: 'Home', description: 'Página inicial' }
  }),
  createRouteConfig('/design-system', () => import('./DesignSystemDemo'), {
    chunkName: 'design-system',
    estimatedSize: 25000,
    metadata: { title: 'Design System', description: 'Sistema de design' }
  }),
  createRouteConfig('/auth', () => import('./JWTAuthSystem'), {
    chunkName: 'auth',
    estimatedSize: 20000,
    metadata: { title: 'Autenticação', description: 'Sistema de autenticação JWT' }
  }),
  createRouteConfig('/users', () => import('./UserManagement'), {
    chunkName: 'users',
    estimatedSize: 30000,
    metadata: { title: 'Usuários', description: 'Gerenciamento de usuários' }
  }),
  createRouteConfig('/rbac', () => import('./RBACSystem'), {
    chunkName: 'rbac',
    estimatedSize: 22000,
    metadata: { title: 'RBAC', description: 'Sistema de controle de acesso' }
  }),
  createRouteConfig('/multi-tenant', () => import('./MultiTenantDashboard'), {
    chunkName: 'multi-tenant',
    estimatedSize: 35000,
    metadata: { title: 'Multi-Tenant', description: 'Dashboard multi-tenant' }
  }),
  createRouteConfig('/analytics', () => import('./DashboardAnalytics'), {
    chunkName: 'analytics',
    estimatedSize: 40000,
    preload: true,
    metadata: { title: 'Analytics', description: 'Dashboard de analytics' }
  }),
  createRouteConfig('/ai-history', () => import('./AIHistoryManager'), {
    chunkName: 'ai-history',
    estimatedSize: 28000,
    metadata: { title: 'Histórico IA', description: 'Gerenciador de histórico IA' }
  }),
  createRouteConfig('/advanced-search', () => import('./AdvancedSearch'), {
    chunkName: 'advanced-search',
    estimatedSize: 25000,
    metadata: { title: 'Busca Avançada', description: 'Sistema de busca avançada' }
  }),
  createRouteConfig('/collaboration', () => import('./RealTimeCollaboration'), {
    chunkName: 'collaboration',
    estimatedSize: 32000,
    metadata: { title: 'Colaboração', description: 'Colaboração em tempo real' }
  }),
  createRouteConfig('/voice-io', () => import('./VoiceIO'), {
    chunkName: 'voice-io',
    estimatedSize: 18000,
    metadata: { title: 'Voz I/O', description: 'Interface de voz' }
  }),
  createRouteConfig('/data-export', () => import('./DataExportImport'), {
    chunkName: 'data-export',
    estimatedSize: 24000,
    metadata: { title: 'Export/Import', description: 'Exportação e importação de dados' }
  })
];

const Navigation: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navigationItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/design-system', label: 'Design System', icon: Palette },
    { path: '/auth', label: 'Autenticação', icon: Shield },
    { path: '/users', label: 'Usuários', icon: Users },
    { path: '/rbac', label: 'RBAC', icon: Shield },
    { path: '/multi-tenant', label: 'Multi-Tenant', icon: Building },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/ai-history', label: 'Histórico IA', icon: History },
    { path: '/advanced-search', label: 'Busca Avançada', icon: Search },
    { path: '/collaboration', label: 'Colaboração', icon: MessageSquare },
    { path: '/voice-io', label: 'Voz I/O', icon: Mic },
    { path: '/data-export', label: 'Export/Import', icon: Download }
  ];

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link to="/" className="flex items-center space-x-2">
                <Brain className="h-8 w-8 text-primary" />
                <h1 className="text-xl font-bold text-primary">Aithos RAG</h1>
              </Link>
            </div>
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
      (window as any).gtag('event', 'route_error', {
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
            onChunkLoad={(chunkName, loadTime) => {
              console.log(`Chunk ${chunkName} loaded in ${Math.round(loadTime)}ms`);
            }}
            onChunkError={(chunkName, error) => {
              console.error(`Chunk ${chunkName} failed to load:`, error);
            }}
            showLoadingStats={process.env.NODE_ENV === 'development'}
            preloadChunks={['home', 'analytics']} // Preload critical chunks
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
              showLoadingIndicator={process.env.NODE_ENV === 'development'}
              preloadStrategy="hover" // Preload routes on hover
            />
          </CodeSplittingManager>
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default AppRouter;
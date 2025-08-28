/**
 * Bundle Optimization Utilities
 * Sistema de otimização de bundle para carregamento ultra-rápido
 */

import React, { lazy, ComponentType, LazyExoticComponent } from 'react';

// Configuração de otimização de bundle
export const BUNDLE_CONFIG = {
  // Configurações de chunk splitting
  chunks: {
    vendor: ['react', 'react-dom', 'react-router-dom'],
    ui: ['lucide-react', 'sonner'],
    utils: ['zustand', 'date-fns'],
    animations: ['framer-motion']
  },
  
  // Configurações de preload
  preload: {
    critical: ['Navbar', 'Hero'], // Componentes críticos
    important: ['About', 'Product'], // Componentes importantes
    lazy: ['Challenges', 'Footer'] // Componentes que podem ser lazy
  },
  
  // Configurações de cache
  cache: {
    maxAge: 1000 * 60 * 60 * 24, // 24 horas
    maxSize: 50 * 1024 * 1024, // 50MB
    strategy: 'stale-while-revalidate' as const
  }
};

// Interface para componentes lazy
interface LazyComponentOptions {
  fallback?: ComponentType;
  preload?: boolean;
  priority?: 'high' | 'normal' | 'low';
  chunkName?: string;
}

// Cache para componentes lazy
const componentCache = new Map<string, LazyExoticComponent<ComponentType<unknown>>>();
const preloadPromises = new Map<string, Promise<unknown>>();

// Função para criar componentes lazy otimizados
export const createLazyComponent = <T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyComponentOptions = {}
): LazyExoticComponent<T> => {
  const { preload = false, priority = 'normal', chunkName } = options;
  
  // Usar cache se disponível
  const cacheKey = chunkName || importFn.toString();
  if (componentCache.has(cacheKey)) {
    return componentCache.get(cacheKey)!;
  }
  
  // Criar componente lazy com otimizações
  const LazyComponent = lazy(() => {
    // Adicionar prioridade de carregamento
    if (priority === 'high') {
      return Promise.resolve().then(importFn);
    }
    
    // Delay para componentes de baixa prioridade
    if (priority === 'low') {
      return new Promise(resolve => {
        setTimeout(() => resolve(importFn()), 100);
      });
    }
    
    return importFn();
  });
  
  // Armazenar no cache
  componentCache.set(cacheKey, LazyComponent);
  
  // Preload se necessário
  if (preload) {
    preloadComponent(importFn, cacheKey);
  }
  
  return LazyComponent;
};

// Função para preload de componentes
export const preloadComponent = (
  importFn: () => Promise<{ default: ComponentType<unknown> }>,
  key: string
): Promise<{ default: ComponentType<unknown> }> => {
  if (preloadPromises.has(key)) {
    return preloadPromises.get(key)!;
  }
  
  const promise = importFn().catch(error => {
    console.warn(`Failed to preload component ${key}:`, error);
    return null;
  });
  
  preloadPromises.set(key, promise);
  return promise;
};

// Sistema de preload inteligente
export class IntelligentPreloader {
  private static instance: IntelligentPreloader;
  private preloadQueue: Array<{ fn: () => Promise<{ default: ComponentType<unknown> }>; priority: number }> = [];
  private isProcessing = false;
  private observer?: IntersectionObserver;
  
  static getInstance(): IntelligentPreloader {
    if (!IntelligentPreloader.instance) {
      IntelligentPreloader.instance = new IntelligentPreloader();
    }
    return IntelligentPreloader.instance;
  }
  
  // Adicionar à fila de preload
  addToQueue(
    importFn: () => Promise<{ default: ComponentType<unknown> }>,
    priority: number = 1,
    condition?: () => boolean
  ): void {
    if (condition && !condition()) return;
    
    this.preloadQueue.push({ fn: importFn, priority });
    this.preloadQueue.sort((a, b) => b.priority - a.priority);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }
  
  // Processar fila de preload
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.preloadQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.preloadQueue.length > 0) {
      const item = this.preloadQueue.shift()!;
      
      try {
        // Aguardar idle time para não bloquear UI
        await this.waitForIdleTime();
        await item.fn();
      } catch (error) {
        console.warn('Preload failed:', error);
      }
    }
    
    this.isProcessing = false;
  }
  
  // Aguardar tempo idle
  private waitForIdleTime(): Promise<void> {
    return new Promise(resolve => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => resolve());
      } else {
        setTimeout(resolve, 0);
      }
    });
  }
  
  // Preload baseado em viewport
  preloadOnViewport(element: Element, importFn: () => Promise<{ default: ComponentType<unknown> }>): void {
    if (!this.observer) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const fn = (entry.target as Element & { __preloadFn?: () => Promise<{ default: ComponentType<unknown> }> }).__preloadFn;
              if (fn) {
                this.addToQueue(fn, 2);
                this.observer!.unobserve(entry.target);
              }
            }
          });
        },
        { rootMargin: '50px' }
      );
    }
    
    (element as Element & { __preloadFn?: () => Promise<{ default: ComponentType<unknown> }> }).__preloadFn = importFn;
    this.observer.observe(element);
  }
}

// Hook para otimização de bundle
export const useBundleOptimization = () => {
  const preloader = IntelligentPreloader.getInstance();
  
  // Preload crítico na inicialização
  React.useEffect(() => {
    // Preload componentes críticos
    BUNDLE_CONFIG.preload.critical.forEach(componentName => {
      const importFn = getComponentImport(componentName);
      if (importFn) {
        preloader.addToQueue(importFn, 10); // Alta prioridade
      }
    });
    
    // Preload componentes importantes após delay
    setTimeout(() => {
      BUNDLE_CONFIG.preload.important.forEach(componentName => {
        const importFn = getComponentImport(componentName);
        if (importFn) {
          preloader.addToQueue(importFn, 5); // Prioridade média
        }
      });
    }, 1000);
    
    // Preload componentes lazy após mais delay
    setTimeout(() => {
      BUNDLE_CONFIG.preload.lazy.forEach(componentName => {
        const importFn = getComponentImport(componentName);
        if (importFn) {
          preloader.addToQueue(importFn, 1); // Baixa prioridade
        }
      });
    }, 3000);
  }, [preloader]);
  
  return {
    preloadComponent: (importFn: () => Promise<{ default: ComponentType<unknown> }>, priority = 1) => {
      preloader.addToQueue(importFn, priority);
    },
    preloadOnViewport: (element: Element, importFn: () => Promise<{ default: ComponentType<unknown> }>) => {
      preloader.preloadOnViewport(element, importFn);
    }
  };
};

// Mapeamento de componentes para imports
const getComponentImport = (componentName: string): (() => Promise<{ default: ComponentType<unknown> }>) | null => {
  const imports: Record<string, () => Promise<{ default: ComponentType<unknown> }>> = {
    Navbar: () => import('../components/Navbar'),
    Hero: () => import('../components/Hero'),
    About: () => import('../components/About'),
    Product: () => import('../components/Product'),
    Challenges: () => import('../components/Challenges'),
    Footer: () => import('../components/Footer')
  };
  
  return imports[componentName] || null;
};

// Utilitários de performance de bundle
export const bundleUtils = {
  // Verificar tamanho do cache
  getCacheSize(): number {
    let size = 0;
    componentCache.forEach((_, key) => {
      size += key.length * 2; // Aproximação
    });
    return size;
  },
  
  // Limpar cache se necessário
  clearCacheIfNeeded(): void {
    const currentSize = this.getCacheSize();
    if (currentSize > BUNDLE_CONFIG.cache.maxSize) {
      componentCache.clear();
      preloadPromises.clear();
    }
  },
  
  // Obter estatísticas de bundle
  getStats() {
    return {
      cachedComponents: componentCache.size,
      preloadPromises: preloadPromises.size,
      cacheSize: this.getCacheSize(),
      maxCacheSize: BUNDLE_CONFIG.cache.maxSize
    };
  }
};
import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { Loader2, Package, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '../utils/cn';

interface ChunkInfo {
  name: string;
  size: number;
  loaded: boolean;
  loading: boolean;
  error?: string;
  loadTime?: number;
}

interface CodeSplittingManagerProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onChunkLoad?: (chunkName: string, loadTime: number) => void;
  onChunkError?: (chunkName: string, error: Error) => void;
  showLoadingStats?: boolean;
  preloadChunks?: string[];
  className?: string;
}

// Global chunk registry
const chunkRegistry = new Map<string, ChunkInfo>();
const chunkObservers = new Set<(chunks: Map<string, ChunkInfo>) => void>();

// Chunk loading utilities
class ChunkManager {
  private static instance: ChunkManager;
  private loadingChunks = new Set<string>();
  private preloadedChunks = new Set<string>();

  static getInstance(): ChunkManager {
    if (!ChunkManager.instance) {
      ChunkManager.instance = new ChunkManager();
    }
    return ChunkManager.instance;
  }

  // Register a chunk
  registerChunk(name: string, size: number = 0): void {
    if (!chunkRegistry.has(name)) {
      chunkRegistry.set(name, {
        name,
        size,
        loaded: false,
        loading: false
      });
      this.notifyObservers();
    }
  }

  // Mark chunk as loading
  markChunkLoading(name: string): void {
    const chunk = chunkRegistry.get(name);
    if (chunk) {
      chunk.loading = true;
      chunk.error = undefined;
      this.loadingChunks.add(name);
      this.notifyObservers();
    }
  }

  // Mark chunk as loaded
  markChunkLoaded(name: string, loadTime: number): void {
    const chunk = chunkRegistry.get(name);
    if (chunk) {
      chunk.loaded = true;
      chunk.loading = false;
      chunk.loadTime = loadTime;
      this.loadingChunks.delete(name);
      this.notifyObservers();
    }
  }

  // Mark chunk as error
  markChunkError(name: string, error: string): void {
    const chunk = chunkRegistry.get(name);
    if (chunk) {
      chunk.loading = false;
      chunk.error = error;
      this.loadingChunks.delete(name);
      this.notifyObservers();
    }
  }

  // Preload chunks
  async preloadChunks(chunkNames: string[]): Promise<void> {
    const preloadPromises = chunkNames.map(async (chunkName) => {
      if (this.preloadedChunks.has(chunkName)) {
        return;
      }

      try {
        // Create a link element for preloading
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = 'script';
        
        // Try to find the chunk URL from webpack's chunk map
        const chunkUrl = this.getChunkUrl(chunkName);
        if (chunkUrl) {
          link.href = chunkUrl;
          document.head.appendChild(link);
          this.preloadedChunks.add(chunkName);
        }
      } catch (error) {
        console.warn(`Failed to preload chunk ${chunkName}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  // Get chunk URL (this would need to be implemented based on your build setup)
  private getChunkUrl(chunkName: string): string | null {
    // In a real implementation, this would use webpack's __webpack_require__.p
    // and chunk manifest to resolve the actual chunk URL
    if (typeof __webpack_require__ !== 'undefined' && __webpack_require__.p) {
      return `${__webpack_require__.p}${chunkName}.js`;
    }
    return null;
  }

  // Get chunk statistics
  getStats(): {
    total: number;
    loaded: number;
    loading: number;
    errors: number;
    totalSize: number;
    loadedSize: number;
  } {
    const chunks = Array.from(chunkRegistry.values());
    return {
      total: chunks.length,
      loaded: chunks.filter(c => c.loaded).length,
      loading: chunks.filter(c => c.loading).length,
      errors: chunks.filter(c => c.error).length,
      totalSize: chunks.reduce((sum, c) => sum + c.size, 0),
      loadedSize: chunks.filter(c => c.loaded).reduce((sum, c) => sum + c.size, 0)
    };
  }

  // Subscribe to chunk updates
  subscribe(observer: (chunks: Map<string, ChunkInfo>) => void): () => void {
    chunkObservers.add(observer);
    return () => chunkObservers.delete(observer);
  }

  private notifyObservers(): void {
    chunkObservers.forEach(observer => observer(new Map(chunkRegistry)));
  }
}

// Enhanced lazy loading with chunk tracking
export const createLazyComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  chunkName: string,
  estimatedSize: number = 0
) => {
  const chunkManager = ChunkManager.getInstance();
  chunkManager.registerChunk(chunkName, estimatedSize);

  return lazy(async () => {
    const startTime = performance.now();
    chunkManager.markChunkLoading(chunkName);

    try {
      const module = await importFn();
      const loadTime = performance.now() - startTime;
      chunkManager.markChunkLoaded(chunkName, loadTime);
      return module;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      chunkManager.markChunkError(chunkName, errorMessage);
      throw error;
    }
  });
};

// Loading fallback component
const DefaultFallback: React.FC<{ chunkName?: string }> = ({ chunkName }) => (
  <div className="flex items-center justify-center p-8">
    <div className="flex items-center gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      <div>
        <p className="text-sm font-medium text-gray-900">Loading component...</p>
        {chunkName && (
          <p className="text-xs text-gray-500">Chunk: {chunkName}</p>
        )}
      </div>
    </div>
  </div>
);

// Error boundary for chunk loading errors
class ChunkErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chunk loading error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="w-6 h-6" />
            <div>
              <p className="text-sm font-medium">Failed to load component</p>
              <p className="text-xs text-red-500">
                {this.state.error?.message || 'Unknown error'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="text-xs text-red-600 underline mt-1"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Chunk loading statistics component
const ChunkStats: React.FC<{ className?: string }> = ({ className }) => {
  const [chunks, setChunks] = useState<Map<string, ChunkInfo>>(new Map());
  const chunkManager = ChunkManager.getInstance();

  useEffect(() => {
    const unsubscribe = chunkManager.subscribe(setChunks);
    setChunks(new Map(chunkRegistry));
    return unsubscribe;
  }, [chunkManager]);

  const stats = chunkManager.getStats();
  const chunkArray = Array.from(chunks.values());

  if (chunkArray.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overview */}
      <div className="flex items-center gap-4 p-4 bg-white rounded-lg border shadow-sm">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-500" />
          <span className="font-medium">Code Splitting</span>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span>{stats.loaded} loaded</span>
          </div>
          
          {stats.loading > 0 && (
            <div className="flex items-center gap-1 text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{stats.loading} loading</span>
            </div>
          )}
          
          {stats.errors > 0 && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span>{stats.errors} errors</span>
            </div>
          )}
        </div>
        
        <div className="text-sm text-gray-600">
          {(stats.loadedSize / 1024).toFixed(1)}KB / {(stats.totalSize / 1024).toFixed(1)}KB
        </div>
      </div>

      {/* Detailed chunk list */}
      <div className="space-y-2">
        {chunkArray.map((chunk) => (
          <div key={chunk.name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0">
              {chunk.loading && (
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              )}
              {chunk.loaded && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              {chunk.error && (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              {!chunk.loading && !chunk.loaded && !chunk.error && (
                <div className="w-4 h-4 rounded-full bg-gray-300" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {chunk.name}
                </span>
                {chunk.size > 0 && (
                  <span className="text-xs text-gray-500">
                    {(chunk.size / 1024).toFixed(1)}KB
                  </span>
                )}
                {chunk.loadTime && (
                  <span className="text-xs text-gray-500">
                    {Math.round(chunk.loadTime)}ms
                  </span>
                )}
              </div>
              
              {chunk.error && (
                <p className="text-xs text-red-600 mt-1">{chunk.error}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main CodeSplittingManager component
export const CodeSplittingManager: React.FC<CodeSplittingManagerProps> = ({
  children,
  fallback,
  onChunkLoad,
  onChunkError,
  showLoadingStats = false,
  preloadChunks = [],
  className
}) => {
  const chunkManager = ChunkManager.getInstance();
  const [chunks, setChunks] = useState<Map<string, ChunkInfo>>(new Map());

  // Subscribe to chunk updates
  useEffect(() => {
    const unsubscribe = chunkManager.subscribe((updatedChunks) => {
      setChunks(new Map(updatedChunks));
      
      // Notify about chunk loads and errors
      updatedChunks.forEach((chunk) => {
        if (chunk.loaded && chunk.loadTime && onChunkLoad) {
          onChunkLoad(chunk.name, chunk.loadTime);
        }
        if (chunk.error && onChunkError) {
          onChunkError(chunk.name, new Error(chunk.error));
        }
      });
    });
    
    return unsubscribe;
  }, [onChunkLoad, onChunkError]);

  // Preload chunks on mount
  useEffect(() => {
    if (preloadChunks.length > 0) {
      chunkManager.preloadChunks(preloadChunks);
    }
  }, [preloadChunks]);

  return (
    <div className={cn('space-y-4', className)}>
      {showLoadingStats && <ChunkStats />}
      
      <ChunkErrorBoundary onError={onChunkError}>
        <Suspense fallback={fallback || <DefaultFallback />}>
          {children}
        </Suspense>
      </ChunkErrorBoundary>
    </div>
  );
};

// Hook for accessing chunk information
export const useChunkInfo = () => {
  const [chunks, setChunks] = useState<Map<string, ChunkInfo>>(new Map());
  const chunkManager = ChunkManager.getInstance();

  useEffect(() => {
    const unsubscribe = chunkManager.subscribe(setChunks);
    setChunks(new Map(chunkRegistry));
    return unsubscribe;
  }, []);

  return {
    chunks: Array.from(chunks.values()),
    stats: chunkManager.getStats(),
    preloadChunks: (chunkNames: string[]) => chunkManager.preloadChunks(chunkNames)
  };
};

export default CodeSplittingManager;
import React, { useEffect, useRef, useState } from 'react';
import { Download, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { cn } from '../utils/cn';

interface PreloadResource {
  url: string;
  type: 'script' | 'style' | 'image' | 'font' | 'fetch';
  priority: 'high' | 'medium' | 'low';
  crossOrigin?: 'anonymous' | 'use-credentials';
  integrity?: string;
  media?: string;
  as?: string;
}

interface PreloadStatus {
  url: string;
  status: 'pending' | 'loading' | 'loaded' | 'error';
  loadTime?: number;
  size?: number;
  error?: string;
}

interface ResourcePreloaderProps {
  resources: PreloadResource[];
  onComplete?: (results: PreloadStatus[]) => void;
  onProgress?: (loaded: number, total: number) => void;
  showProgress?: boolean;
  className?: string;
  autoStart?: boolean;
  concurrent?: number;
}

export const ResourcePreloader: React.FC<ResourcePreloaderProps> = ({
  resources,
  onComplete,
  onProgress,
  showProgress = false,
  className,
  autoStart = true,
  concurrent = 6
}) => {
  const [statuses, setStatuses] = useState<PreloadStatus[]>([]);
  const [isPreloading, setIsPreloading] = useState(false);
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);
  const preloadQueueRef = useRef<PreloadResource[]>([]);
  const activePreloadsRef = useRef<Set<string>>(new Set());

  // Initialize statuses
  useEffect(() => {
    const initialStatuses = resources.map(resource => ({
      url: resource.url,
      status: 'pending' as const
    }));
    setStatuses(initialStatuses);
    setProgress({ loaded: 0, total: resources.length });
  }, [resources]);

  // Preload a single resource
  const preloadResource = async (resource: PreloadResource, signal: AbortSignal): Promise<PreloadStatus> => {
    const startTime = performance.now();
    
    try {
      activePreloadsRef.current.add(resource.url);
      
      // Update status to loading
      setStatuses(prev => prev.map(status => 
        status.url === resource.url 
          ? { ...status, status: 'loading' }
          : status
      ));

      let result: PreloadStatus;

      switch (resource.type) {
        case 'script':
          result = await preloadScript(resource, signal);
          break;
        case 'style':
          result = await preloadStyle(resource, signal);
          break;
        case 'image':
          result = await preloadImage(resource, signal);
          break;
        case 'font':
          result = await preloadFont(resource, signal);
          break;
        case 'fetch':
          result = await preloadFetch(resource, signal);
          break;
        default:
          throw new Error(`Unsupported resource type: ${resource.type}`);
      }

      result.loadTime = performance.now() - startTime;
      return result;
    } catch (error) {
      return {
        url: resource.url,
        status: 'error',
        loadTime: performance.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      activePreloadsRef.current.delete(resource.url);
    }
  };

  // Preload script
  const preloadScript = (resource: PreloadResource, signal: AbortSignal): Promise<PreloadStatus> => {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'script';
      link.href = resource.url;
      
      if (resource.crossOrigin) {
        link.crossOrigin = resource.crossOrigin;
      }
      
      if (resource.integrity) {
        link.integrity = resource.integrity;
      }

      const cleanup = () => {
        document.head.removeChild(link);
      };

      link.onload = () => {
        cleanup();
        resolve({
          url: resource.url,
          status: 'loaded'
        });
      };

      link.onerror = () => {
        cleanup();
        reject(new Error(`Failed to preload script: ${resource.url}`));
      };

      signal.addEventListener('abort', () => {
        cleanup();
        reject(new Error('Preload aborted'));
      });

      document.head.appendChild(link);
    });
  };

  // Preload stylesheet
  const preloadStyle = (resource: PreloadResource, signal: AbortSignal): Promise<PreloadStatus> => {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = resource.url;
      
      if (resource.media) {
        link.media = resource.media;
      }

      const cleanup = () => {
        document.head.removeChild(link);
      };

      link.onload = () => {
        cleanup();
        resolve({
          url: resource.url,
          status: 'loaded'
        });
      };

      link.onerror = () => {
        cleanup();
        reject(new Error(`Failed to preload stylesheet: ${resource.url}`));
      };

      signal.addEventListener('abort', () => {
        cleanup();
        reject(new Error('Preload aborted'));
      });

      document.head.appendChild(link);
    });
  };

  // Preload image
  const preloadImage = (resource: PreloadResource, signal: AbortSignal): Promise<PreloadStatus> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      if (resource.crossOrigin) {
        img.crossOrigin = resource.crossOrigin;
      }

      img.onload = () => {
        resolve({
          url: resource.url,
          status: 'loaded',
          size: img.naturalWidth * img.naturalHeight
        });
      };

      img.onerror = () => {
        reject(new Error(`Failed to preload image: ${resource.url}`));
      };

      signal.addEventListener('abort', () => {
        img.src = '';
        reject(new Error('Preload aborted'));
      });

      img.src = resource.url;
    });
  };

  // Preload font
  const preloadFont = (resource: PreloadResource, signal: AbortSignal): Promise<PreloadStatus> => {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.href = resource.url;
      link.crossOrigin = 'anonymous'; // Fonts require CORS

      const cleanup = () => {
        document.head.removeChild(link);
      };

      link.onload = () => {
        cleanup();
        resolve({
          url: resource.url,
          status: 'loaded'
        });
      };

      link.onerror = () => {
        cleanup();
        reject(new Error(`Failed to preload font: ${resource.url}`));
      };

      signal.addEventListener('abort', () => {
        cleanup();
        reject(new Error('Preload aborted'));
      });

      document.head.appendChild(link);
    });
  };

  // Preload via fetch
  const preloadFetch = async (resource: PreloadResource, signal: AbortSignal): Promise<PreloadStatus> => {
    const response = await fetch(resource.url, {
      signal,
      mode: resource.crossOrigin ? 'cors' : 'same-origin'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const size = parseInt(response.headers.get('content-length') || '0', 10);
    
    // Read the response to ensure it's cached
    await response.arrayBuffer();

    return {
      url: resource.url,
      status: 'loaded',
      size
    };
  };

  // Process preload queue with concurrency control
  const processQueue = async () => {
    const queue = [...preloadQueueRef.current];
    const results: PreloadStatus[] = [];
    
    // Sort by priority
    queue.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    const executePreload = async (resource: PreloadResource) => {
      try {
        const result = await preloadResource(resource, abortControllerRef.current!.signal);
        results.push(result);
        
        // Update status
        setStatuses(prev => prev.map(status => 
          status.url === resource.url ? result : status
        ));
        
        // Update progress
        setProgress(prev => {
          const newLoaded = prev.loaded + 1;
          onProgress?.(newLoaded, prev.total);
          return { ...prev, loaded: newLoaded };
        });
      } catch (error) {
        const errorResult: PreloadStatus = {
          url: resource.url,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        results.push(errorResult);
        
        setStatuses(prev => prev.map(status => 
          status.url === resource.url ? errorResult : status
        ));
      }
    };

    // Process with concurrency limit
    const chunks = [];
    for (let i = 0; i < queue.length; i += concurrent) {
      chunks.push(queue.slice(i, i + concurrent));
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map(executePreload));
    }

    return results;
  };

  // Start preloading
  const startPreloading = async () => {
    if (isPreloading || resources.length === 0) return;
    
    setIsPreloading(true);
    abortControllerRef.current = new AbortController();
    preloadQueueRef.current = [...resources];
    
    try {
      const results = await processQueue();
      onComplete?.(results);
    } catch (error) {
      console.error('Preloading failed:', error);
    } finally {
      setIsPreloading(false);
    }
  };

  // Stop preloading
  const stopPreloading = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsPreloading(false);
  };

  // Auto-start preloading
  useEffect(() => {
    if (autoStart && resources.length > 0) {
      startPreloading();
    }
    
    return () => {
      stopPreloading();
    };
  }, [autoStart, resources]);

  // Calculate statistics
  const stats = {
    total: statuses.length,
    loaded: statuses.filter(s => s.status === 'loaded').length,
    loading: statuses.filter(s => s.status === 'loading').length,
    errors: statuses.filter(s => s.status === 'error').length,
    pending: statuses.filter(s => s.status === 'pending').length
  };

  const progressPercentage = stats.total > 0 ? (stats.loaded / stats.total) * 100 : 0;

  if (!showProgress && !isPreloading) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Progress Overview */}
      <div className="flex items-center gap-4 p-4 bg-white rounded-lg border shadow-sm">
        <div className="flex items-center gap-2">
          <Download className={cn(
            'w-5 h-5',
            isPreloading ? 'animate-bounce text-blue-500' : 'text-gray-400'
          )} />
          <span className="font-medium">Resource Preloader</span>
        </div>
        
        <div className="flex-1">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>{stats.loaded} / {stats.total} loaded</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          {stats.loading > 0 && (
            <div className="flex items-center gap-1 text-blue-600">
              <Clock className="w-4 h-4" />
              <span>{stats.loading}</span>
            </div>
          )}
          {stats.loaded > 0 && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span>{stats.loaded}</span>
            </div>
          )}
          {stats.errors > 0 && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span>{stats.errors}</span>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Status */}
      {showProgress && (
        <div className="space-y-2">
          {statuses.map((status, index) => {
            const resource = resources.find(r => r.url === status.url);
            if (!resource) return null;
            
            return (
              <div key={status.url} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  {status.status === 'pending' && (
                    <div className="w-4 h-4 rounded-full bg-gray-300" />
                  )}
                  {status.status === 'loading' && (
                    <Clock className="w-4 h-4 text-blue-500 animate-spin" />
                  )}
                  {status.status === 'loaded' && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {status.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {status.url.split('/').pop()}
                    </span>
                    <span className={cn(
                      'px-2 py-1 text-xs rounded-full',
                      resource.priority === 'high' ? 'bg-red-100 text-red-700' :
                      resource.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    )}>
                      {resource.priority}
                    </span>
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                      {resource.type}
                    </span>
                  </div>
                  
                  {status.error && (
                    <p className="text-xs text-red-600 mt-1">{status.error}</p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                    <span className="truncate">{status.url}</span>
                    {status.loadTime && (
                      <span>{Math.round(status.loadTime)}ms</span>
                    )}
                    {status.size && (
                      <span>{(status.size / 1024).toFixed(1)}KB</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Control Buttons */}
      <div className="flex gap-2">
        {!isPreloading && stats.pending > 0 && (
          <button
            onClick={startPreloading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Start Preloading
          </button>
        )}
        
        {isPreloading && (
          <button
            onClick={stopPreloading}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Stop Preloading
          </button>
        )}
      </div>
    </div>
  );
};

export default ResourcePreloader;
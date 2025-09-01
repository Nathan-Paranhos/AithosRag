import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';
import { retryManager, NETWORK_RETRY_CONFIG } from '../utils/retry';

export interface ConnectivityState {
  isOnline: boolean;
  isApiAvailable: boolean;
  isBackendAvailable: boolean;
  lastChecked: Date;
  error?: string;
  latency?: number;
}

const CONNECTIVITY_CHECK_INTERVAL = 15000; // 15 seconds
const API_TIMEOUT = 8000; // 8 seconds
const BACKEND_URL = 'http://localhost:3005';
const FALLBACK_URLS = [
  'https://www.google.com/favicon.ico',
  'https://httpbin.org/status/200',
  'https://jsonplaceholder.typicode.com/posts/1'
];

export function useConnectivity() {
  const [state, setState] = useState<ConnectivityState>({
    isOnline: navigator.onLine,
    isApiAvailable: false,
    isBackendAvailable: false,
    lastChecked: new Date(),
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkBackendHealth = useCallback(async (signal: AbortSignal): Promise<{ available: boolean; latency?: number }> => {
    try {
      const startTime = Date.now();
      
      const response = await fetch(`${BACKEND_URL}/health`, {
        method: 'GET',
        signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      });
      
      const latency = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        return { 
          available: data.status === 'ok' || response.status === 200, 
          latency 
        };
      }
      
      return { available: false };
    } catch (error) {
      logger.debug('Backend health check failed', 'Connectivity', { error: error.message });
      return { available: false };
    }
  }, []);

  const checkInternetConnectivity = useCallback(async (signal: AbortSignal): Promise<boolean> => {
    // Try multiple fallback URLs to ensure we can reach the internet
    for (const url of FALLBACK_URLS) {
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          signal,
          mode: 'no-cors',
          cache: 'no-store'
        });
        
        // For no-cors requests, we just check if the request completed
        return true;
      } catch (error) {
        logger.debug(`Fallback URL ${url} failed`, 'Connectivity', { error: error.message });
        continue;
      }
    }
    
    return false;
  }, []);

  const checkConnection = useCallback(async (force = false) => {
    // Cancel any ongoing check
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    try {
      const startTime = Date.now();
      
      // Check basic browser online status
      const browserOnline = navigator.onLine;
      
      if (!browserOnline && !force) {
        setState(prev => ({
          ...prev,
          isOnline: false,
          isApiAvailable: false,
          isBackendAvailable: false,
          lastChecked: new Date(),
          error: 'Browser is offline'
        }));
        return;
      }
      
      // Use retry manager for robust connectivity checks
      const result = await retryManager.execute(async () => {
        const [internetCheck, backendCheck] = await Promise.allSettled([
          Promise.race([
            checkInternetConnectivity(signal),
            new Promise<boolean>((_, reject) => 
              setTimeout(() => reject(new Error('Internet check timeout')), API_TIMEOUT)
            )
          ]),
          Promise.race([
            checkBackendHealth(signal),
            new Promise<{ available: boolean; latency?: number }>((_, reject) => 
              setTimeout(() => reject(new Error('Backend check timeout')), API_TIMEOUT)
            )
          ])
        ]);
        
        const isOnline = internetCheck.status === 'fulfilled' ? internetCheck.value : false;
        const backendResult = backendCheck.status === 'fulfilled' ? backendCheck.value : { available: false };
        
        return {
          isOnline,
          isBackendAvailable: backendResult.available,
          latency: backendResult.latency
        };
      }, 'ConnectivityCheck', {
        ...NETWORK_RETRY_CONFIG,
        maxAttempts: 2, // Reduce attempts for faster feedback
        baseDelay: 1000
      });
      
      if (signal.aborted) return;
      
      const totalTime = Date.now() - startTime;
      
      if (result.success && result.data) {
        const { isOnline, isBackendAvailable, latency } = result.data;
        
        const newState: ConnectivityState = {
          isOnline,
          isApiAvailable: isOnline, // API available if internet is available
          isBackendAvailable,
          lastChecked: new Date(),
          latency,
          error: undefined
        };
        
        setState(newState);
        
        logger.debug('Connectivity check completed', 'Connectivity', {
          isOnline,
          isApiAvailable: isOnline,
          isBackendAvailable,
          latency,
          totalTime
        });
        
        // Schedule reconnection attempt if offline
        if (!isOnline || !isBackendAvailable) {
          scheduleReconnect();
        } else {
          // Clear any existing reconnect timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        }
      } else {
        throw result.error || new Error('Connectivity check failed');
      }
      
    } catch (err) {
      if (signal.aborted) return;
      
      const error = err instanceof Error ? err.message : 'Connectivity check failed';
      logger.error('Connectivity check error', 'Connectivity', { error }, err);
      
      setState(prev => ({
        ...prev,
        isOnline: false,
        isApiAvailable: false,
        isBackendAvailable: false,
        error,
        lastChecked: new Date()
      }));
      
      scheduleReconnect();
    }
  }, [checkInternetConnectivity, checkBackendHealth]);
  
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    // Exponential backoff for reconnection attempts
    const delay = Math.min(30000, 5000 * Math.pow(1.5, Math.floor(Date.now() / 60000)));
    
    reconnectTimeoutRef.current = setTimeout(() => {
      logger.info('Attempting automatic reconnection', 'Connectivity');
      checkConnection(true);
    }, delay);
  }, [checkConnection]);

  useEffect(() => {
    // Initial check
    checkConnection();
    
    // Set up periodic checks
    const interval = setInterval(() => checkConnection(), CONNECTIVITY_CHECK_INTERVAL);
    
    // Listen to online/offline events
    const handleOnline = () => {
      logger.info('Browser detected online status', 'Connectivity');
      setTimeout(() => checkConnection(true), 1000); // Delay to allow network to stabilize
    };
    
    const handleOffline = () => {
      logger.info('Browser detected offline status', 'Connectivity');
      setState(prev => ({
        ...prev,
        isOnline: false,
        isApiAvailable: false,
        isBackendAvailable: false,
        lastChecked: new Date(),
        error: 'Network connection lost'
      }));
    };
    
    // Listen to visibility change for reconnection when tab becomes active
    const handleVisibilityChange = () => {
      if (!document.hidden && (!state.isOnline || !state.isBackendAvailable)) {
        logger.info('Tab became active, checking connectivity', 'Connectivity');
        setTimeout(() => checkConnection(true), 500);
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [checkConnection, state.isOnline, state.isBackendAvailable]);

  return {
    ...state,
    checkConnection: () => checkConnection(true),
    isConnected: state.isOnline && state.isApiAvailable,
    isFullyConnected: state.isOnline && state.isApiAvailable && state.isBackendAvailable
  };
}
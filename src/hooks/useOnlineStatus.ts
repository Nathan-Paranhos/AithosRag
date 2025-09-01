import { useState, useEffect, useCallback } from 'react';

interface OnlineStatusConfig {
  checkInterval?: number;
  pingUrl?: string;
  timeout?: number;
}

interface OnlineStatusReturn {
  isOnline: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  checkConnection: () => Promise<boolean>;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  latency: number | null;
}

const useOnlineStatus = (config: OnlineStatusConfig = {}): OnlineStatusReturn => {
  const {
    checkInterval = 30000, // 30 segundos
    pingUrl = 'http://localhost:3005/api/health',
    timeout = 5000 // 5 segundos
  } = config;

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'offline'>('excellent');
  const [latency, setLatency] = useState<number | null>(null);

  // Função para verificar conectividade real com retry logic
  const checkConnection = useCallback(async (retries = 3): Promise<boolean> => {
    setIsChecking(true);
    const startTime = performance.now();
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Primeiro, verificar se o navegador reporta como online
        if (!navigator.onLine) {
          setIsOnline(false);
          setConnectionQuality('offline');
          setLatency(null);
          return false;
        }

        // Fazer ping para verificar conectividade real
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(pingUrl, {
          method: 'HEAD',
          cache: 'no-cache',
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        clearTimeout(timeoutId);
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        setLatency(responseTime);
        setLastChecked(new Date());
        
        if (response.ok) {
          setIsOnline(true);
          
          // Determinar qualidade da conexão baseada na latência
          if (responseTime < 100) {
            setConnectionQuality('excellent');
          } else if (responseTime < 300) {
            setConnectionQuality('good');
          } else {
            setConnectionQuality('poor');
          }
          
          return true;
        } else if (attempt === retries - 1) {
          setIsOnline(false);
          setConnectionQuality('offline');
          return false;
        }
      } catch (error) {
        if (attempt === retries - 1) {
          console.warn('Connection check failed after all retries:', error);
          setIsOnline(false);
          setConnectionQuality('offline');
          setLatency(null);
          setLastChecked(new Date());
          return false;
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    setIsChecking(false);
    return false;
  }, [pingUrl, timeout]);

  // Event listeners para mudanças de conectividade do navegador
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkConnection(); // Verificar conectividade real
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionQuality('offline');
      setLatency(null);
    };

    // Listeners para eventos do navegador
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificação inicial
    checkConnection();

    // Verificação periódica
    const intervalId = setInterval(checkConnection, checkInterval);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [checkInterval, pingUrl, timeout, checkConnection]);

  // Verificar quando a página ganha foco novamente
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkConnection();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkConnection]);

  return {
    isOnline,
    isChecking,
    lastChecked,
    checkConnection,
    connectionQuality,
    latency
  };
};

export { useOnlineStatus };
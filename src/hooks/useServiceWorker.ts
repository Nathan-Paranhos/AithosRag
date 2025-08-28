import { useState, useEffect, useCallback } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  updateAvailable: boolean;
  installing: boolean;
  cacheStatus: Record<string, number>;
}

interface ServiceWorkerActions {
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  update: () => Promise<void>;
  clearCache: () => Promise<void>;
  prefetchResources: (urls: string[]) => Promise<void>;
  getCacheStatus: () => Promise<Record<string, number>>;
}

export const useServiceWorker = (): ServiceWorkerState & ServiceWorkerActions => {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isOnline: navigator.onLine,
    updateAvailable: false,
    installing: false,
    cacheStatus: {}
  });

  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Registrar Service Worker
  const register = useCallback(async () => {
    if (!state.isSupported) {
      console.warn('Service Worker não é suportado neste navegador');
      return;
    }

    try {
      setState(prev => ({ ...prev, installing: true }));
      
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      setRegistration(reg);
      setState(prev => ({ 
        ...prev, 
        isRegistered: true, 
        installing: false 
      }));

      console.log('Service Worker registrado com sucesso:', reg);

      // Configurar listeners
      setupServiceWorkerListeners(reg);

    } catch (error) {
      console.error('Erro ao registrar Service Worker:', error);
      setState(prev => ({ ...prev, installing: false }));
    }
  }, [state.isSupported, setupServiceWorkerListeners]);

  // Desregistrar Service Worker
  const unregister = useCallback(async () => {
    if (!registration) return;

    try {
      const result = await registration.unregister();
      if (result) {
        setRegistration(null);
        setState(prev => ({ ...prev, isRegistered: false }));
        console.log('Service Worker desregistrado com sucesso');
      }
    } catch (error) {
      console.error('Erro ao desregistrar Service Worker:', error);
    }
  }, [registration]);

  // Atualizar Service Worker
  const update = useCallback(async () => {
    if (!registration) return;

    try {
      await registration.update();
      console.log('Verificação de atualização do Service Worker iniciada');
    } catch (error) {
      console.error('Erro ao atualizar Service Worker:', error);
    }
  }, [registration]);

  // Limpar cache
  const clearCache = useCallback(async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!registration || !registration.active) {
        reject(new Error('Service Worker não está ativo'));
        return;
      }

      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          setState(prev => ({ ...prev, cacheStatus: {} }));
          resolve();
        } else {
          reject(new Error('Falha ao limpar cache'));
        }
      };

      registration.active.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      );
    });
  }, [registration]);

  // Pré-carregar recursos
  const prefetchResources = useCallback(async (urls: string[]): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!registration || !registration.active) {
        reject(new Error('Service Worker não está ativo'));
        return;
      }

      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          resolve();
        } else {
          reject(new Error('Falha ao pré-carregar recursos'));
        }
      };

      registration.active.postMessage(
        { type: 'PREFETCH_RESOURCES', payload: { urls } },
        [messageChannel.port2]
      );
    });
  }, [registration]);

  // Obter status do cache
  const getCacheStatus = useCallback(async (): Promise<Record<string, number>> => {
    return new Promise((resolve, reject) => {
      if (!registration || !registration.active) {
        reject(new Error('Service Worker não está ativo'));
        return;
      }

      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        setState(prev => ({ ...prev, cacheStatus: event.data }));
        resolve(event.data);
      };

      registration.active.postMessage(
        { type: 'GET_CACHE_STATUS' },
        [messageChannel.port2]
      );
    });
  }, [registration]);

  // Configurar listeners do Service Worker
  const setupServiceWorkerListeners = useCallback((reg: ServiceWorkerRegistration) => {
    // Listener para atualizações
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;

      setState(prev => ({ ...prev, installing: true }));

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          setState(prev => ({ 
            ...prev, 
            installing: false,
            updateAvailable: navigator.serviceWorker.controller !== null
          }));
        }
      });
    });

    // Listener para mensagens do Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type } = event.data;
      
      switch (type) {
        case 'CACHE_UPDATED':
          getCacheStatus();
          break;
          
        case 'OFFLINE_READY':
          console.log('Aplicação pronta para uso offline');
          break;
      }
    });

    // Listener para controle do Service Worker
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Service Worker controller mudou');
      window.location.reload();
    });
  }, [getCacheStatus, setState]);

  // Efeito para monitorar status online/offline
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      console.log('Aplicação online');
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
      console.log('Aplicação offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Efeito para verificar Service Worker existente
  useEffect(() => {
    if (!state.isSupported) return;

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) {
        setRegistration(reg);
        setState(prev => ({ ...prev, isRegistered: true }));
        setupServiceWorkerListeners(reg);
        getCacheStatus();
      }
    });
  }, [state.isSupported, setupServiceWorkerListeners, getCacheStatus]);

  // Auto-registrar Service Worker
  useEffect(() => {
    if (state.isSupported && !state.isRegistered && !state.installing) {
      register();
    }
  }, [state.isSupported, state.isRegistered, state.installing, register]);

  return {
    ...state,
    register,
    unregister,
    update,
    clearCache,
    prefetchResources,
    getCacheStatus
  };
};

// Hook para notificações de atualização
export const useUpdateNotification = () => {
  const { updateAvailable, update } = useServiceWorker();
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (updateAvailable) {
      setShowNotification(true);
    }
  }, [updateAvailable]);

  const applyUpdate = useCallback(async () => {
    try {
      await update();
      setShowNotification(false);
      
      // Recarregar página após um pequeno delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Erro ao aplicar atualização:', error);
    }
  }, [update]);

  const dismissNotification = useCallback(() => {
    setShowNotification(false);
  }, []);

  return {
    showNotification,
    applyUpdate,
    dismissNotification
  };
};

// Hook para status de conectividade
export const useConnectivity = () => {
  const { isOnline } = useServiceWorker();
  const [connectionType, setConnectionType] = useState<string>('unknown');
  const [effectiveType, setEffectiveType] = useState<string>('unknown');

  useEffect(() => {
    // @ts-expect-error - Navigator connection não está tipado
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      const updateConnectionInfo = () => {
        setConnectionType(connection.type || 'unknown');
        setEffectiveType(connection.effectiveType || 'unknown');
      };

      updateConnectionInfo();
      connection.addEventListener('change', updateConnectionInfo);

      return () => {
        connection.removeEventListener('change', updateConnectionInfo);
      };
    }
  }, []);

  const isSlowConnection = effectiveType === 'slow-2g' || effectiveType === '2g';
  const isFastConnection = effectiveType === '4g';

  return {
    isOnline,
    connectionType,
    effectiveType,
    isSlowConnection,
    isFastConnection
  };
};
// Sistema robusto de verificação de conectividade
export interface ConnectivityStatus {
  isOnline: boolean;
  apiAvailable: boolean;
  latency: number;
  lastCheck: Date;
  error?: string;
}

export class ConnectivityManager {
  private static instance: ConnectivityManager;
  private status: ConnectivityStatus = {
    isOnline: navigator.onLine,
    apiAvailable: false,
    latency: 0,
    lastCheck: new Date()
  };
  private listeners: ((status: ConnectivityStatus) => void)[] = [];
  private checkInterval: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private maxRetries = 3;
  private baseDelay = 1000;

  private constructor() {
    this.setupEventListeners();
    this.startPeriodicCheck();
  }

  public static getInstance(): ConnectivityManager {
    if (!ConnectivityManager.instance) {
      ConnectivityManager.instance = new ConnectivityManager();
    }
    return ConnectivityManager.instance;
  }

  private setupEventListeners(): void {
    // Listener para mudanças de conectividade do navegador
    window.addEventListener('online', () => {
      console.log('[Connectivity] Browser online event');
      this.updateStatus({ isOnline: true });
      this.checkApiAvailability();
    });

    window.addEventListener('offline', () => {
      console.log('[Connectivity] Browser offline event');
      this.updateStatus({ 
        isOnline: false, 
        apiAvailable: false,
        error: 'Sem conexão com a internet'
      });
    });

    // Listener para mudanças de visibilidade da página
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('[Connectivity] Page became visible, checking connection');
        this.checkConnection();
      }
    });
  }

  private startPeriodicCheck(): void {
    // Verificação inicial
    this.checkConnection();
    
    // Verificação periódica a cada 30 segundos
    this.checkInterval = setInterval(() => {
      this.checkConnection();
    }, 30000);
  }

  public async checkConnection(): Promise<ConnectivityStatus> {
    const startTime = performance.now();
    
    try {
      // Verificação básica de conectividade
      const isOnline = navigator.onLine;
      
      if (!isOnline) {
        this.updateStatus({
          isOnline: false,
          apiAvailable: false,
          latency: 0,
          error: 'Sem conexão com a internet'
        });
        return this.status;
      }

      // Verificação da API com timeout
      const apiAvailable = await this.checkApiAvailability();
      const latency = performance.now() - startTime;

      this.updateStatus({
        isOnline: true,
        apiAvailable,
        latency: Math.round(latency),
        error: apiAvailable ? undefined : 'API indisponível'
      });

      this.retryCount = 0; // Reset retry count on success
      
    } catch (error) {
      console.error('[Connectivity] Check failed:', error);
      
      this.updateStatus({
        isOnline: navigator.onLine,
        apiAvailable: false,
        latency: 0,
        error: error instanceof Error ? error.message : 'Erro de conectividade'
      });

      // Implementar retry com backoff exponencial
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        const delay = this.baseDelay * Math.pow(2, this.retryCount - 1);
        console.log(`[Connectivity] Retrying in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`);
        
        setTimeout(() => {
          this.checkConnection();
        }, delay);
      }
    }

    return this.status;
  }

  private async checkApiAvailability(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch('http://localhost:3005/api/health', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log('[Connectivity] API health check successful:', data);
        return true;
      } else {
        console.warn('[Connectivity] API health check failed:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.warn('[Connectivity] API health check timeout');
        } else {
          console.warn('[Connectivity] API health check error:', error.message);
        }
      }
      return false;
    }
  }

  private updateStatus(updates: Partial<ConnectivityStatus>): void {
    this.status = {
      ...this.status,
      ...updates,
      lastCheck: new Date()
    };

    console.log('[Connectivity] Status updated:', this.status);
    
    // Notificar todos os listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.status);
      } catch (error) {
        console.error('[Connectivity] Listener error:', error);
      }
    });
  }

  public getStatus(): ConnectivityStatus {
    return { ...this.status };
  }

  public subscribe(listener: (status: ConnectivityStatus) => void): () => void {
    this.listeners.push(listener);
    
    // Retornar função de unsubscribe
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public async forceCheck(): Promise<ConnectivityStatus> {
    console.log('[Connectivity] Force checking connection...');
    return await this.checkConnection();
  }

  public destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    this.listeners = [];
    
    window.removeEventListener('online', this.checkConnection);
    window.removeEventListener('offline', this.checkConnection);
    document.removeEventListener('visibilitychange', this.checkConnection);
  }
}

// Hook React para usar o ConnectivityManager
import { useState, useEffect } from 'react';

export function useConnectivity(): ConnectivityStatus & { forceCheck: () => Promise<void> } {
  const [status, setStatus] = useState<ConnectivityStatus>(() => 
    ConnectivityManager.getInstance().getStatus()
  );

  useEffect(() => {
    const manager = ConnectivityManager.getInstance();
    
    // Obter status inicial
    setStatus(manager.getStatus());
    
    // Subscrever para atualizações
    const unsubscribe = manager.subscribe(setStatus);
    
    return unsubscribe;
  }, []);

  const forceCheck = async () => {
    const manager = ConnectivityManager.getInstance();
    await manager.forceCheck();
  };

  return {
    ...status,
    forceCheck
  };
}

// Função utilitária para verificação rápida
export async function quickConnectivityCheck(): Promise<boolean> {
  const manager = ConnectivityManager.getInstance();
  const status = await manager.checkConnection();
  return status.isOnline && status.apiAvailable;
}

// Função para aguardar conectividade
export function waitForConnectivity(timeout = 30000): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const manager = ConnectivityManager.getInstance();
    const timeoutId = setTimeout(() => {
      unsubscribe();
      reject(new Error('Timeout waiting for connectivity'));
    }, timeout);

    const unsubscribe = manager.subscribe((status) => {
      if (status.isOnline && status.apiAvailable) {
        clearTimeout(timeoutId);
        unsubscribe();
        resolve(true);
      }
    });

    // Verificar status atual
    const currentStatus = manager.getStatus();
    if (currentStatus.isOnline && currentStatus.apiAvailable) {
      clearTimeout(timeoutId);
      unsubscribe();
      resolve(true);
    }
  });
}
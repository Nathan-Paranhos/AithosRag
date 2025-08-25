/**
 * Request Batching System
 * Sistema de agrupamento de requisições para otimização de performance
 */

import { apiCache } from './apiCache';

// Configuração do batching
export const BATCH_CONFIG = {
  // Tamanhos de batch
  maxBatchSize: 10,
  maxWaitTime: 50, // ms
  
  // Configurações por tipo de requisição
  endpoints: {
    '/api/chat/models': {
      batchable: true,
      maxBatchSize: 5,
      maxWaitTime: 30
    },
    '/api/validate': {
      batchable: true,
      maxBatchSize: 3,
      maxWaitTime: 20
    },
    '/api/health': {
      batchable: false // Health checks não devem ser agrupados
    }
  },
  
  // Configurações de retry
  retry: {
    maxAttempts: 3,
    backoffMultiplier: 1.5,
    initialDelay: 100
  }
};

// Interface para requisição em batch
interface BatchRequest {
  id: string;
  url: string;
  options: RequestInit;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  timestamp: number;
  priority: number;
}

// BatchResponse interface removed as it was not being used

// Sistema de batching inteligente
export class RequestBatcher {
  private static instance: RequestBatcher;
  private batches = new Map<string, BatchRequest[]>();
  private timers = new Map<string, NodeJS.Timeout>();
  private processing = new Set<string>();
  
  static getInstance(): RequestBatcher {
    if (!RequestBatcher.instance) {
      RequestBatcher.instance = new RequestBatcher();
    }
    return RequestBatcher.instance;
  }
  
  // Adicionar requisição ao batch
  async addRequest<T>(
    url: string,
    options: RequestInit = {},
    priority: number = 1
  ): Promise<T> {
    const batchKey = this.getBatchKey(url, options);
    const config = this.getEndpointConfig(url);
    
    // Se não é batchable, executar diretamente
    if (!config.batchable) {
      return this.executeSingle<T>(url, options);
    }
    
    return new Promise<T>((resolve, reject) => {
      const request: BatchRequest = {
        id: this.generateId(),
        url,
        options,
        resolve,
        reject,
        timestamp: Date.now(),
        priority
      };
      
      // Adicionar ao batch
      if (!this.batches.has(batchKey)) {
        this.batches.set(batchKey, []);
      }
      
      const batch = this.batches.get(batchKey)!;
      batch.push(request);
      
      // Ordenar por prioridade
      batch.sort((a, b) => b.priority - a.priority);
      
      // Verificar se deve processar imediatamente
      if (batch.length >= config.maxBatchSize) {
        this.processBatch(batchKey);
      } else {
        // Configurar timer se não existe
        if (!this.timers.has(batchKey)) {
          const timer = setTimeout(() => {
            this.processBatch(batchKey);
          }, config.maxWaitTime);
          
          this.timers.set(batchKey, timer);
        }
      }
    });
  }
  
  // Processar batch de requisições
  private async processBatch(batchKey: string): Promise<void> {
    if (this.processing.has(batchKey)) return;
    
    const batch = this.batches.get(batchKey);
    if (!batch || batch.length === 0) return;
    
    this.processing.add(batchKey);
    
    // Limpar timer
    const timer = this.timers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(batchKey);
    }
    
    // Remover batch da fila
    this.batches.delete(batchKey);
    
    try {
      // Verificar se pode usar cache para algumas requisições
      const cachedResults = await this.checkCache(batch);
      const uncachedRequests = batch.filter(req => !cachedResults.has(req.id));
      
      // Resolver requisições em cache
      cachedResults.forEach((data, id) => {
        const request = batch.find(req => req.id === id);
        if (request) {
          request.resolve(data);
        }
      });
      
      // Processar requisições não cacheadas
      if (uncachedRequests.length > 0) {
        await this.executeBatch(uncachedRequests);
      }
    } catch (error) {
      // Em caso de erro, rejeitar todas as requisições
      batch.forEach(request => {
        request.reject(error);
      });
    } finally {
      this.processing.delete(batchKey);
    }
  }
  
  // Verificar cache para requisições
  private async checkCache(batch: BatchRequest[]): Promise<Map<string, unknown>> {
    const cachedResults = new Map<string, unknown>();
    
    for (const request of batch) {
      const cacheKey = `batch_${request.url}_${JSON.stringify(request.options)}`;
      const cached = await apiCache.get(cacheKey);
      
      if (cached) {
        cachedResults.set(request.id, cached);
      }
    }
    
    return cachedResults;
  }
  
  // Executar batch de requisições
  private async executeBatch(requests: BatchRequest[]): Promise<void> {
    // Agrupar requisições similares
    const groups = this.groupSimilarRequests(requests);
    
    // Executar grupos em paralelo
    const promises = groups.map(group => this.executeGroup(group));
    
    try {
      await Promise.all(promises);
    } catch (error) {
      console.error('Batch execution failed:', error);
      throw error;
    }
  }
  
  // Agrupar requisições similares
  private groupSimilarRequests(requests: BatchRequest[]): BatchRequest[][] {
    const groups = new Map<string, BatchRequest[]>();
    
    requests.forEach(request => {
      const groupKey = `${request.url}_${request.options.method || 'GET'}`;
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      
      groups.get(groupKey)!.push(request);
    });
    
    return Array.from(groups.values());
  }
  
  // Executar grupo de requisições
  private async executeGroup(group: BatchRequest[]): Promise<void> {
    // Para requisições GET idênticas, fazer apenas uma requisição
    if (this.areIdenticalGETRequests(group)) {
      await this.executeIdenticalRequests(group);
    } else {
      // Executar requisições em paralelo com limite
      await this.executeParallel(group);
    }
  }
  
  // Verificar se são requisições GET idênticas
  private areIdenticalGETRequests(group: BatchRequest[]): boolean {
    if (group.length <= 1) return false;
    
    const first = group[0];
    const method = first.options.method || 'GET';
    
    if (method !== 'GET') return false;
    
    return group.every(req => 
      req.url === first.url &&
      JSON.stringify(req.options) === JSON.stringify(first.options)
    );
  }
  
  // Executar requisições idênticas
  private async executeIdenticalRequests(group: BatchRequest[]): Promise<void> {
    const request = group[0];
    
    try {
      const response = await fetch(request.url, request.options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Armazenar no cache
      const cacheKey = `batch_${request.url}_${JSON.stringify(request.options)}`;
      await apiCache.set(cacheKey, data, { ttl: 30000 }); // 30 segundos
      
      // Resolver todas as requisições com o mesmo resultado
      group.forEach(req => req.resolve(data));
      
    } catch (error) {
      group.forEach(req => req.reject(error));
    }
  }
  
  // Executar requisições em paralelo
  private async executeParallel(group: BatchRequest[]): Promise<void> {
    const concurrencyLimit = 5; // Limite de requisições simultâneas
    
    for (let i = 0; i < group.length; i += concurrencyLimit) {
      const chunk = group.slice(i, i + concurrencyLimit);
      
      const promises = chunk.map(async (request) => {
        try {
          const data = await this.executeSingle(request.url, request.options);
          request.resolve(data);
        } catch (error) {
          request.reject(error);
        }
      });
      
      await Promise.all(promises);
    }
  }
  
  // Executar requisição única
  private async executeSingle<T>(url: string, options: RequestInit): Promise<T> {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  // Obter chave do batch
  private getBatchKey(url: string, options: RequestInit): string {
    const method = options.method || 'GET';
    const hasBody = !!options.body;
    return `${method}_${url}_${hasBody}`;
  }
  
  // Obter configuração do endpoint
  private getEndpointConfig(url: string) {
    const path = new URL(url, 'http://localhost').pathname;
    const config = BATCH_CONFIG.endpoints[path as keyof typeof BATCH_CONFIG.endpoints];
    
    return {
      batchable: config?.batchable ?? true,
      maxBatchSize: config?.maxBatchSize ?? BATCH_CONFIG.maxBatchSize,
      maxWaitTime: config?.maxWaitTime ?? BATCH_CONFIG.maxWaitTime
    };
  }
  
  // Gerar ID único
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Obter estatísticas
  getStats() {
    return {
      activeBatches: this.batches.size,
      processingBatches: this.processing.size,
      pendingRequests: Array.from(this.batches.values())
        .reduce((total, batch) => total + batch.length, 0),
      activeTimers: this.timers.size
    };
  }
  
  // Limpar batches pendentes
  clear(): void {
    // Limpar timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    
    // Rejeitar requisições pendentes
    this.batches.forEach(batch => {
      batch.forEach(request => {
        request.reject(new Error('Batch cleared'));
      });
    });
    
    this.batches.clear();
    this.processing.clear();
  }
}

// Hook para usar request batching
export const useRequestBatching = () => {
  const batcher = RequestBatcher.getInstance();
  
  return {
    request: <T>(url: string, options?: RequestInit, priority?: number) => 
      batcher.addRequest<T>(url, options, priority),
    stats: () => batcher.getStats(),
    clear: () => batcher.clear()
  };
};

// Wrapper para fetch com batching
export const batchedFetch = async <T>(
  url: string,
  options: RequestInit = {},
  priority: number = 1
): Promise<T> => {
  const batcher = RequestBatcher.getInstance();
  return batcher.addRequest<T>(url, options, priority);
};

// Exportar instância singleton
export const requestBatcher = RequestBatcher.getInstance();
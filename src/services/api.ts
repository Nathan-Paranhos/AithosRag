/**
 * Serviço para comunicação com a API backend
 * Substitui a comunicação direta com Groq SDK
 */

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  strategy?: string;
  category?: string;
}

export interface ModelMetrics {
  requests: number;
  errors: number;
  errorRate: number;
  avgResponseTime: number;
  rateLimitAvailable: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  reasoningEffort?: string;
  metrics?: ModelMetrics;
}

export interface SystemMetrics {
  totalRequests: number;
  totalErrors: number;
  avgSystemResponseTime: number;
  cacheHitRate: number;
  availableModels: number;
  timestamp: string;
}

export interface LoadBalancerStats {
  totalRequests: number;
  activeConnections: number;
  queueSize: number;
  strategies: string[];
  modelHealth: Record<string, {
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    errorRate: number;
    lastCheck: string;
  }>;
}

export interface ChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string;
    };
    finish_reason?: string;
  }>;
}

class ApiService {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    // URL da API backend - será configurada para produção no Render
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    this.timeout = 30000; // 30 segundos
  }

  /**
   * Verifica se a API está funcionando
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5 segundos para health check
      });

      return response.ok;
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return false;
    }
  }

  /**
   * Valida se a API Key está configurada no backend
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/validate`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.valid === true;
    } catch (error) {
      console.error('❌ API Key validation failed:', error);
      return false;
    }
  }

  /**
   * Obtém modelos disponíveis
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.models?.map((m: { id: string }) => m.id) || [];
    } catch (error) {
      console.error('❌ Failed to get models:', error);
      return ['llama-3.1-70b-versatile']; // fallback
    }
  }

  /**
   * Obtém informações detalhadas dos modelos com métricas
   */
  async getModelsWithMetrics(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('❌ Failed to get models with metrics:', error);
      return [];
    }
  }

  /**
   * Obtém métricas do sistema
   */
  async getSystemMetrics(): Promise<SystemMetrics | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/metrics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get system metrics:', error);
      return null;
    }
  }

  /**
   * Obtém métricas de um modelo específico
   */
  async getModelMetrics(modelId: string): Promise<ModelMetrics | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/metrics/${encodeURIComponent(modelId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get model metrics:', error);
      return null;
    }
  }

  /**
   * Envia mensagem para chat (sem streaming)
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || 
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Chat request failed:', error);
      throw error;
    }
  }

  /**
   * Envia mensagem para chat com streaming
   */
  async *sendMessageStream(request: ChatRequest): AsyncGenerator<StreamChunk, void, unknown> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || 
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const data = trimmed.slice(6); // Remove 'data: '
            if (data === '[DONE]') return;

            try {
              const chunk: StreamChunk = JSON.parse(data);
              yield chunk;
            } catch (parseError) {
              console.warn('⚠️ Failed to parse chunk:', data, parseError);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('❌ Stream chat request failed:', error);
      throw error;
    }
  }

  /**
   * Chat com modelo específico
   */
  async sendMessageWithModel(request: ChatRequest, modelId: string): Promise<ChatResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/model/${encodeURIComponent(modelId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || 
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Chat with specific model failed:', error);
      throw error;
    }
  }

  /**
   * Chat com streaming usando modelo específico
   */
  async *sendMessageStreamWithModel(request: ChatRequest, modelId: string): AsyncGenerator<StreamChunk, void, unknown> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/model/${encodeURIComponent(modelId)}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || 
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const data = trimmed.slice(6);
            if (data === '[DONE]') return;

            try {
              const chunk: StreamChunk = JSON.parse(data);
              yield chunk;
            } catch (parseError) {
              console.warn('⚠️ Failed to parse chunk:', data, parseError);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('❌ Stream chat with specific model failed:', error);
      throw error;
    }
  }

  /**
   * Chat com categoria específica
   */
  async sendMessageWithCategory(request: ChatRequest, category: string): Promise<ChatResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/category/${encodeURIComponent(category)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || 
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Chat with category failed:', error);
      throw error;
    }
  }

  /**
   * Chat com balanceamento de carga
   */
  async sendMessageWithLoadBalancer(request: ChatRequest, strategy?: string): Promise<ChatResponse> {
    try {
      const url = strategy 
        ? `${this.baseUrl}/api/loadbalancer/chat?strategy=${encodeURIComponent(strategy)}`
        : `${this.baseUrl}/api/loadbalancer/chat`;
        
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || 
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Chat with load balancer failed:', error);
      throw error;
    }
  }

  /**
   * Chat com streaming usando balanceamento de carga
   */
  async *sendMessageStreamWithLoadBalancer(request: ChatRequest, strategy?: string): AsyncGenerator<StreamChunk, void, unknown> {
    try {
      const url = strategy 
        ? `${this.baseUrl}/api/loadbalancer/stream?strategy=${encodeURIComponent(strategy)}`
        : `${this.baseUrl}/api/loadbalancer/stream`;
        
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || 
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const data = trimmed.slice(6);
            if (data === '[DONE]') return;

            try {
              const chunk: StreamChunk = JSON.parse(data);
              yield chunk;
            } catch (parseError) {
              console.warn('⚠️ Failed to parse chunk:', data, parseError);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('❌ Stream chat with load balancer failed:', error);
      throw error;
    }
  }

  /**
   * Obtém estatísticas do balanceador de carga
   */
  async getLoadBalancerStats(): Promise<LoadBalancerStats | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/loadbalancer/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get load balancer stats:', error);
      return null;
    }
  }



  /**
   * Reset métricas de um modelo
   */
  async resetModelMetrics(modelId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/metrics/${encodeURIComponent(modelId)}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      return response.ok;
    } catch (error) {
      console.error('❌ Failed to reset model metrics:', error);
      return false;
    }
  }

  /**
   * Métodos do sistema de métricas avançado
   */
  async getAllMetrics(): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/metrics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get all metrics:', error);
      throw error;
    }
  }

  async getModelMetricsAdvanced(modelId: string): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/metrics/models/${encodeURIComponent(modelId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get advanced model metrics:', error);
      throw error;
    }
  }

  async getSystemMetricsAdvanced(): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/metrics/system`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get advanced system metrics:', error);
      throw error;
    }
  }

  async getMetricsHistory(modelId?: string, timeRange: string = '1h'): Promise<Record<string, unknown>> {
    try {
      const params = new URLSearchParams({ timeRange });
      if (modelId) {
        params.append('modelId', modelId);
      }

      const response = await fetch(`${this.baseUrl}/api/metrics/history?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get metrics history:', error);
      throw error;
    }
  }

  async resetMetricsAdvanced(modelId?: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/metrics/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ modelId }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to reset advanced metrics:', error);
      throw error;
    }
  }

  async exportMetrics(format: 'json' | 'csv' | 'prometheus' = 'json'): Promise<{ data: string; filename: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/metrics/export?format=${format}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      console.error('❌ Failed to export metrics:', error);
      throw error;
    }
  }

  async getModelsHealth(): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/metrics/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get models health:', error);
      throw error;
    }
  }

  async getPerformanceMetrics(): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/metrics/performance`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get performance metrics:', error);
      throw error;
    }
  }

  /**
   * Stream de métricas em tempo real
   */
  createMetricsStream(): EventSource {
    return new EventSource(`${this.baseUrl}/api/metrics/stream`);
  }

  // === CACHE METHODS ===
  
  // Obter estatísticas do cache
  async getCacheStats(): Promise<{ totalEntries: number; hitRate: number; size: number; memoryUsage: number }> {
    const response = await fetch(`${this.baseUrl}/api/cache/stats`);
    return response.json();
  }
  
  // Limpar cache por categoria
  async clearCache(category?: string): Promise<{ message: string }> {
    const url = category ? `/api/cache/clear/${category}` : '/api/cache/clear';
    const response = await fetch(`${this.baseUrl}${url}`, {
      method: 'DELETE'
    });
    return response.json();
  }
  
  // Obter configurações do cache
  async getCacheConfig(): Promise<{ maxSize: number; defaultTTL: number; persistenceFile: string }> {
    const response = await fetch(`${this.baseUrl}/api/cache/config`);
    return response.json();
  }
  
  // Atualizar configurações do cache
  async updateCacheConfig(config: { maxSize?: number; defaultTTL?: number }): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/api/cache/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    return response.json();
  }
  
  // Obter chaves do cache
  async getCacheKeys(category?: string) {
    const url = category ? `/api/cache/keys/${category}` : '/api/cache/keys';
    const response = await fetch(`${this.baseUrl}${url}`);
    return response.json();
  }
  
  // Verificar se chave existe no cache
  async checkCacheKey(key: string) {
    const response = await fetch(`${this.baseUrl}/api/cache/exists/${key}`);
    return response.json();
  }
  
  // Remover chave do cache
  async removeCacheKey(key: string) {
    const response = await fetch(`${this.baseUrl}/api/cache/key/${key}`, {
      method: 'DELETE'
    });
    return response.json();
  }
  
  // Limpar entradas expiradas do cache
  async cleanupCache() {
    const response = await fetch(`${this.baseUrl}/api/cache/cleanup`, {
      method: 'POST'
    });
    return response.json();
  }
  
  // Salvar cache em disco
  async saveCache(): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/api/cache/save`, {
      method: 'POST'
    });
    return response.json();
  }
  
  // Carregar cache do disco
  async loadCache(): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/api/cache/load`, {
      method: 'POST'
    });
    return response.json();
  }

  // === RATE LIMITING METHODS ===
  
  // Obter estatísticas do rate limiter
  async getRateLimitStats(): Promise<{ totalRequests: number; activeUsers: number; activeModels: number; systemLoad: number }> {
    const response = await fetch(`${this.baseUrl}/api/ratelimit/stats`);
    return response.json();
  }
  
  // Obter estatísticas por usuário
  async getUserRateLimitStats(identifier: string) {
    const response = await fetch(`${this.baseUrl}/api/ratelimit/stats/${identifier}`);
    return response.json();
  }
  
  // Obter estatísticas por modelo
  async getModelRateLimitStats(modelId: string) {
    const response = await fetch(`${this.baseUrl}/api/ratelimit/model-stats/${modelId}`);
    return response.json();
  }
  
  // Verificar limites
  async checkRateLimit(data: {
    identifier: string;
    modelId: string;
    estimatedTokens?: number;
    userInfo?: Record<string, unknown>;
  }) {
    const response = await fetch(`${this.baseUrl}/api/ratelimit/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }
  
  // Resetar limites para usuário
  async resetUserRateLimit(identifier: string, modelId?: string) {
    const response = await fetch(`${this.baseUrl}/api/ratelimit/reset/${identifier}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ modelId })
    });
    return response.json();
  }
  
  // Obter configurações do rate limiter
  async getRateLimitConfig() {
    const response = await fetch(`${this.baseUrl}/api/ratelimit/config`);
    return response.json();
  }
  
  // Atualizar configurações do rate limiter
  async updateRateLimitConfig(config: Record<string, unknown>) {
    const response = await fetch(`${this.baseUrl}/api/ratelimit/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    return response.json();
  }
  
  // Ativar/desativar modo adaptativo
  async toggleAdaptiveMode(enable: boolean) {
    const action = enable ? 'enable' : 'disable';
    const response = await fetch(`${this.baseUrl}/api/ratelimit/adaptive/${action}`, {
      method: 'POST'
    });
    return response.json();
  }
  
  // Obter usuários ativos
  async getActiveUsers() {
    const response = await fetch(`${this.baseUrl}/api/ratelimit/active-users`);
    return response.json();
  }
  
  // Obter modelos ativos
  async getActiveModels() {
    const response = await fetch(`${this.baseUrl}/api/ratelimit/active-models`);
    return response.json();
  }
  
  // Limpar contadores expirados
  async cleanupRateLimit() {
    const response = await fetch(`${this.baseUrl}/api/ratelimit/cleanup`, {
      method: 'POST'
    });
    return response.json();
  }
  
  // Criar stream de eventos do rate limiter
  createRateLimitStream(): EventSource {
    return new EventSource(`${this.baseUrl}/api/ratelimit/events`);
  }

  /**
   * Obtém informações sobre a conexão
   */
  getConnectionInfo() {
    return {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      environment: import.meta.env.MODE,
    };
  }
}

// Instância singleton
export const apiService = new ApiService();
export default apiService;
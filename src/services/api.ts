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
  lastError?: number;
  lastErrorTime?: number;
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
  isOffline?: boolean;
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
  isOffline?: boolean;
}

class ApiService {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    // URL da API backend - será configurada para produção no Render
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
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
    // Primeiro, verificar se a API está funcionando
    const isHealthy = await this.healthCheck();
    if (!isHealthy) {
      console.warn('🔄 API não está respondendo, usando modelos offline');
      return this.getFallbackModelsWithStatus(0);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Reduzir timeout para 8s

      const response = await fetch(`${this.baseUrl}/api/chat/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorMessage = this.getErrorMessage(response.status, response.statusText);
        console.warn(`⚠️ ${errorMessage}, using fallback models`);
        return this.getFallbackModelsWithStatus(response.status);
      }

      const data = await response.json();
      return data.models || this.getFallbackModels();
    } catch (error) {
      console.error('❌ Failed to get models with metrics:', error);
      const isNetworkError = this.isNetworkError(error);
      const errorType = isNetworkError ? 'Network connection failed' : 'API request failed';
      console.warn(`🔄 ${errorType}, using offline fallback models`);
      return this.getFallbackModelsWithStatus(isNetworkError ? 0 : 500);
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
        
        // Se for erro 503, usar fallback offline
        if (response.status === 503) {
          console.warn('🔄 API indisponível, usando resposta offline');
          return this.getOfflineChatResponse(request);
        }
        
        throw new Error(
          errorData.error || 
          this.getErrorMessage(response.status, response.statusText)
        );
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Chat request failed:', error);
      
      // Se for erro de rede, usar fallback offline
      if (this.isNetworkError(error)) {
        console.warn('🔄 Erro de conexão, usando resposta offline');
        return this.getOfflineChatResponse(request);
      }
      
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
        
        // Se for erro 503, usar fallback offline
        if (response.status === 503) {
          console.warn('🔄 API indisponível, usando stream offline');
          yield* this.getOfflineStreamResponse(request);
          return;
        }
        
        throw new Error(
          errorData.error || 
          this.getErrorMessage(response.status, response.statusText)
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
      
      // Se for erro de rede, usar fallback offline
      if (this.isNetworkError(error)) {
        console.warn('🔄 Erro de conexão, usando stream offline');
        yield* this.getOfflineStreamResponse(request);
        return;
      }
      
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
   * Verifica se o erro é de rede/conectividade
   */
  private isNetworkError(error: Error | TypeError | unknown): boolean {
    return error instanceof TypeError ||
           error.message?.includes('fetch') ||
           error.message?.includes('network') ||
           error.message?.includes('connection') ||
           error.name === 'AbortError' ||
           error.code === 'NETWORK_ERROR';
  }

  /**
   * Obtém mensagem de erro amigável baseada no status HTTP
   */
  private getErrorMessage(status: number, statusText: string): string {
    switch (status) {
      case 503:
        return 'Serviço temporariamente indisponível';
      case 429:
        return 'Limite de requisições excedido';
      case 500:
      case 502:
      case 504:
        return 'Erro interno do servidor';
      case 401:
        return 'Chave de API inválida';
      case 403:
        return 'Acesso negado';
      case 404:
        return 'Endpoint não encontrado';
      default:
        return `API indisponível (${status}: ${statusText})`;
    }
  }

  /**
   * Retorna modelos de fallback com status específico
   */
  private getFallbackModelsWithStatus(status: number): ModelInfo[] {
    const statusMessage = status === 0 ? 'sem conexão' : 
                         status === 503 ? 'serviço indisponível' :
                         status === 429 ? 'limite excedido' : 'erro do servidor';
    
    return this.getFallbackModels().map(model => ({
      ...model,
      description: `${model.description} - ${statusMessage}`,
      metrics: {
        ...model.metrics,
        lastError: status,
        lastErrorTime: Date.now()
      }
    }));
  }

  /**
   * Retorna modelos de fallback quando a API não está disponível
   */
  private getFallbackModels(): ModelInfo[] {
    return [
      {
        id: 'llama-3.1-70b-versatile',
        name: 'Llama 3.1 70B Versatile',
        category: 'general',
        description: 'Modelo versátil para tarefas gerais (modo offline)',
        maxTokens: 8192,
        temperature: 0.7,
        topP: 0.9,
        metrics: {
          requests: 0,
          errors: 0,
          errorRate: 0,
          avgResponseTime: 0,
          rateLimitAvailable: false
        }
      },
      {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B Instant',
        category: 'fast',
        description: 'Modelo rápido para respostas instantâneas (modo offline)',
        maxTokens: 8192,
        temperature: 0.7,
        topP: 0.9,
        metrics: {
          requests: 0,
          errors: 0,
          errorRate: 0,
          avgResponseTime: 0,
          rateLimitAvailable: false
        }
      },
      {
        id: 'mixtral-8x7b-32768',
        name: 'Mixtral 8x7B',
        category: 'reasoning',
        description: 'Modelo para raciocínio complexo (modo offline)',
        maxTokens: 32768,
        temperature: 0.7,
        topP: 0.9,
        metrics: {
          requests: 0,
          errors: 0,
          errorRate: 0,
          avgResponseTime: 0,
          rateLimitAvailable: false
        }
      }
    ];
  }

  /**
   * Gera resposta offline quando a API não está disponível
   */
  private getOfflineChatResponse(request: ChatRequest): ChatResponse {
    const lastMessage = request.messages[request.messages.length - 1];
    const userMessage = lastMessage?.content?.toLowerCase() || '';
    
    let offlineResponse = '';
    
    if (userMessage.includes('olá') || userMessage.includes('oi') || userMessage.includes('hello')) {
      offlineResponse = 'Olá! Atualmente estou operando em modo offline devido à indisponibilidade temporária do serviço. Posso ajudá-lo com informações básicas sobre o AITHOS RAG.';
    } else if (userMessage.includes('ajuda') || userMessage.includes('help')) {
      offlineResponse = 'Estou em modo offline no momento. O AITHOS RAG é uma plataforma de IA avançada que utiliza tecnologia Groq para processamento rápido e eficiente. Quando o serviço estiver disponível novamente, poderei oferecer assistência completa.';
    } else if (userMessage.includes('aithos') || userMessage.includes('groq')) {
      offlineResponse = 'O AITHOS RAG combina a velocidade da tecnologia Groq com capacidades avançadas de recuperação de informações. Atualmente em modo offline, mas em breve estarei totalmente operacional para demonstrar todo o potencial da plataforma.';
    } else {
      offlineResponse = 'Desculpe, estou temporariamente em modo offline devido à indisponibilidade do serviço. O AITHOS RAG normalmente oferece respostas rápidas e precisas usando tecnologia Groq. Tente novamente em alguns instantes.';
    }
    
    return {
      id: `offline-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'offline-fallback',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: offlineResponse
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 0,
        completion_tokens: offlineResponse.split(' ').length,
        total_tokens: offlineResponse.split(' ').length
      },
      isOffline: true
    };
  }

  /**
   * Gera stream offline simulado
   */
  private async *getOfflineStreamResponse(request: ChatRequest): AsyncGenerator<StreamChunk, void, unknown> {
    const response = this.getOfflineChatResponse(request);
    const content = response.choices[0].message.content;
    const words = content.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      const chunk: StreamChunk = {
        id: response.id,
        object: 'chat.completion.chunk',
        created: response.created,
        model: response.model,
        choices: [{
          index: 0,
          delta: {
            content: (i === 0 ? '' : ' ') + words[i]
          },
          finish_reason: i === words.length - 1 ? 'stop' : null
        }],
        isOffline: true
      };
      
      yield chunk;
      
      // Simular delay de streaming
      await new Promise(resolve => setTimeout(resolve, 50));
    }
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
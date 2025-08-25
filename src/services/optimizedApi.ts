/**
 * Serviço de API Otimizado - Nível Startup
 * Integra cache inteligente, request batching, e otimizações de performance
 */

import { apiService, type ChatRequest, type ChatResponse, type StreamChunk } from './api';
import { IntelligentCache, useIntelligentCache } from '../utils/apiCache';
import { RequestBatcher, useRequestBatching } from '../utils/requestBatching';
import { debounce } from 'lodash-es';

// Tipos otimizados
export interface OptimizedChatRequest extends ChatRequest {
  priority?: 'high' | 'medium' | 'low';
  cacheStrategy?: 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'network-only' | 'cache-only';
  enableBatching?: boolean;
  enableStreaming?: boolean;
  enablePreload?: boolean;
  contextId?: string; // Para agrupamento de conversas
}

export interface OptimizedResponse<T = unknown> {
  data: T;
  cached: boolean;
  timestamp: number;
  source: 'cache' | 'network' | 'batch';
  performance: {
    responseTime: number;
    cacheHit: boolean;
    batchSize?: number;
  };
}

export interface AIFeatures {
  autoComplete: boolean;
  sentimentAnalysis: boolean;
  contextualSuggestions: boolean;
  smartPreload: boolean;
  adaptiveCache: boolean;
}

export interface PerformanceMetrics {
  totalRequests: number;
  cacheHitRate: number;
  averageResponseTime: number;
  batchEfficiency: number;
  memoryUsage: number;
  networkSavings: number;
}

class OptimizedApiService {
  private cache: IntelligentCache;
  private batcher: RequestBatcher;
  private performanceMetrics: PerformanceMetrics;
  private aiFeatures: AIFeatures;
  private preloadQueue: Map<string, Promise<unknown>>;
  private contextCache: Map<string, unknown[]>;
  private sentimentCache: Map<string, number>;
  
  // Debounced functions para otimização
  private debouncedSearch: (query: string) => Promise<unknown>;
  private debouncedSuggestions: (context: string) => Promise<string[]>;
  
  constructor() {
    this.cache = new IntelligentCache();
    this.batcher = new RequestBatcher();
    this.preloadQueue = new Map();
    this.contextCache = new Map();
    this.sentimentCache = new Map();
    
    this.performanceMetrics = {
      totalRequests: 0,
      cacheHitRate: 0,
      averageResponseTime: 0,
      batchEfficiency: 0,
      memoryUsage: 0,
      networkSavings: 0
    };
    
    this.aiFeatures = {
      autoComplete: true,
      sentimentAnalysis: true,
      contextualSuggestions: true,
      smartPreload: true,
      adaptiveCache: true
    };
    
    // Configurar debounced functions
    this.debouncedSearch = debounce(this.performSearch.bind(this), 300);
    this.debouncedSuggestions = debounce(this.generateSuggestions.bind(this), 500);
    
    // Inicializar preload inteligente
    this.initializeSmartPreload();
  }
  
  /**
   * Chat otimizado com todas as funcionalidades
   */
  async sendOptimizedMessage(request: OptimizedChatRequest): Promise<OptimizedResponse<ChatResponse>> {
    const startTime = performance.now();
    this.performanceMetrics.totalRequests++;
    
    try {
      // Análise de sentimento se habilitada
      if (this.aiFeatures.sentimentAnalysis && request.messages.length > 0) {
        const lastMessage = request.messages[request.messages.length - 1];
        if (lastMessage.role === 'user') {
          await this.analyzeSentiment(lastMessage.content);
        }
      }
      
      // Sugestões contextuais
      if (this.aiFeatures.contextualSuggestions && request.contextId) {
        this.updateContext(request.contextId, request.messages);
      }
      
      // Estratégia de cache
      const cacheKey = this.generateCacheKey(request);
      const cacheStrategy = request.cacheStrategy || 'stale-while-revalidate';
      
      // Verificar cache primeiro se aplicável
      if (cacheStrategy !== 'network-only') {
        const cached = await this.cache.get(cacheKey, 'dynamic');
        if (cached && (cacheStrategy === 'cache-first' || cacheStrategy === 'cache-only')) {
          this.updatePerformanceMetrics(startTime, true);
          return {
            data: cached,
            cached: true,
            timestamp: Date.now(),
            source: 'cache',
            performance: {
              responseTime: performance.now() - startTime,
              cacheHit: true
            }
          };
        }
      }
      
      // Request com batching se habilitado
      let response: ChatResponse;
      let source: 'network' | 'batch' = 'network';
      
      if (request.enableBatching && request.priority !== 'high') {
        response = await this.batcher.addRequest(
          () => apiService.sendMessage(request),
          cacheKey,
          request.priority || 'medium'
        );
        source = 'batch';
      } else {
        response = await apiService.sendMessage(request);
      }
      
      // Salvar no cache
      if (cacheStrategy !== 'network-only') {
        await this.cache.set(cacheKey, response, 'dynamic');
      }
      
      // Preload inteligente
      if (this.aiFeatures.smartPreload && request.enablePreload) {
        this.scheduleSmartPreload(request, response);
      }
      
      this.updatePerformanceMetrics(startTime, false);
      
      return {
        data: response,
        cached: false,
        timestamp: Date.now(),
        source,
        performance: {
          responseTime: performance.now() - startTime,
          cacheHit: false,
          batchSize: source === 'batch' ? this.batcher.getCurrentBatchSize() : undefined
        }
      };
      
    } catch (error) {
      console.error('❌ Optimized chat request failed:', error);
      throw error;
    }
  }
  
  /**
   * Chat com streaming otimizado
   */
  async *sendOptimizedMessageStream(request: OptimizedChatRequest): AsyncGenerator<StreamChunk & { performance?: PerformanceMetrics }, void, unknown> {
    const startTime = performance.now();
    this.performanceMetrics.totalRequests++;
    
    try {
      // Análise de contexto para streaming
      if (request.contextId) {
        this.updateContext(request.contextId, request.messages);
      }
      
      const generator = apiService.sendMessageStream(request);
      let chunkCount = 0;
      
      for await (const chunk of generator) {
        chunkCount++;
        
        // Adicionar métricas de performance ao chunk
        yield {
          ...chunk,
          performance: {
            chunkIndex: chunkCount,
            streamTime: performance.now() - startTime,
            contextId: request.contextId
          }
        };
      }
      
      this.updatePerformanceMetrics(startTime, false);
      
    } catch (error) {
      console.error('❌ Optimized stream request failed:', error);
      throw error;
    }
  }
  
  /**
   * Auto-complete inteligente
   */
  async getAutoComplete(input: string, context?: string): Promise<string[]> {
    if (!this.aiFeatures.autoComplete) return [];
    
    const cacheKey = `autocomplete:${input}:${context || 'default'}`;
    
    // Verificar cache primeiro
    const cached = await this.cache.get(cacheKey, 'static');
    if (cached) return cached;
    
    try {
      const suggestions = await this.debouncedSuggestions(`${context || ''} ${input}`);
      await this.cache.set(cacheKey, suggestions, 'static');
      return suggestions;
    } catch (error) {
      console.error('❌ Auto-complete failed:', error);
      return [];
    }
  }
  
  /**
   * Análise de sentimento
   */
  async analyzeSentiment(text: string): Promise<number> {
    if (!this.aiFeatures.sentimentAnalysis) return 0;
    
    // Verificar cache de sentimento
    const cached = this.sentimentCache.get(text);
    if (cached !== undefined) return cached;
    
    try {
      // Análise simples de sentimento (pode ser substituída por IA mais avançada)
      const positiveWords = ['bom', 'ótimo', 'excelente', 'perfeito', 'incrível', 'fantástico'];
      const negativeWords = ['ruim', 'péssimo', 'terrível', 'horrível', 'odioso', 'detesto'];
      
      const words = text.toLowerCase().split(/\s+/);
      let score = 0;
      
      words.forEach(word => {
        if (positiveWords.includes(word)) score += 1;
        if (negativeWords.includes(word)) score -= 1;
      });
      
      // Normalizar entre -1 e 1
      const normalizedScore = Math.max(-1, Math.min(1, score / words.length * 10));
      
      this.sentimentCache.set(text, normalizedScore);
      return normalizedScore;
      
    } catch (error) {
      console.error('❌ Sentiment analysis failed:', error);
      return 0;
    }
  }
  
  /**
   * Sugestões contextuais
   */
  async getContextualSuggestions(contextId: string): Promise<string[]> {
    if (!this.aiFeatures.contextualSuggestions) return [];
    
    const context = this.contextCache.get(contextId);
    if (!context || context.length === 0) return [];
    
    try {
      // Analisar contexto e gerar sugestões
      const recentMessages = context.slice(-5); // Últimas 5 mensagens
      const topics = this.extractTopics(recentMessages);
      
      return this.generateContextualSuggestions(topics);
      
    } catch (error) {
      console.error('❌ Contextual suggestions failed:', error);
      return [];
    }
  }
  
  /**
   * Preload inteligente de modelos
   */
  async preloadModels(priority: 'high' | 'medium' | 'low' = 'medium'): Promise<void> {
    if (!this.aiFeatures.smartPreload) return;
    
    try {
      const models = await apiService.getModelsWithMetrics();
      const sortedModels = models
        .filter(m => m.metrics?.rateLimitAvailable)
        .sort((a, b) => (b.metrics?.avgResponseTime || 0) - (a.metrics?.avgResponseTime || 0));
      
      // Preload top 3 modelos baseado na prioridade
      const modelCount = priority === 'high' ? 5 : priority === 'medium' ? 3 : 1;
      const topModels = sortedModels.slice(0, modelCount);
      
      for (const model of topModels) {
        const preloadKey = `preload:${model.id}`;
        if (!this.preloadQueue.has(preloadKey)) {
          const preloadPromise = this.preloadModel(model.id);
          this.preloadQueue.set(preloadKey, preloadPromise);
        }
      }
      
    } catch (error) {
      console.error('❌ Model preload failed:', error);
    }
  }
  
  /**
   * Obter métricas de performance
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return {
      ...this.performanceMetrics,
      memoryUsage: this.calculateMemoryUsage(),
      networkSavings: this.calculateNetworkSavings()
    };
  }
  
  /**
   * Configurar funcionalidades de IA
   */
  configureAIFeatures(features: Partial<AIFeatures>): void {
    this.aiFeatures = { ...this.aiFeatures, ...features };
  }
  
  /**
   * Limpar caches e otimizar memória
   */
  async optimizeMemory(): Promise<void> {
    try {
      // Limpar caches antigos
      await this.cache.cleanup();
      
      // Limpar contextos antigos (manter apenas últimos 10)
      if (this.contextCache.size > 10) {
        const entries = Array.from(this.contextCache.entries());
        const toKeep = entries.slice(-10);
        this.contextCache.clear();
        toKeep.forEach(([key, value]) => this.contextCache.set(key, value));
      }
      
      // Limpar cache de sentimento (manter apenas últimos 100)
      if (this.sentimentCache.size > 100) {
        const entries = Array.from(this.sentimentCache.entries());
        const toKeep = entries.slice(-100);
        this.sentimentCache.clear();
        toKeep.forEach(([key, value]) => this.sentimentCache.set(key, value));
      }
      
      // Limpar preload queue
      this.preloadQueue.clear();
      
    } catch (error) {
      console.error('❌ Memory optimization failed:', error);
    }
  }
  
  // Métodos privados
  private generateCacheKey(request: OptimizedChatRequest): string {
    const key = {
      messages: request.messages.map(m => ({ role: m.role, content: m.content.slice(0, 100) })),
      model: request.model,
      temperature: request.temperature,
      contextId: request.contextId
    };
    return `chat:${JSON.stringify(key)}`;
  }
  
  private updateContext(contextId: string, messages: unknown[]): void {
    const existing = this.contextCache.get(contextId) || [];
    const updated = [...existing, ...messages].slice(-20); // Manter últimas 20 mensagens
    this.contextCache.set(contextId, updated);
  }
  
  private extractTopics(messages: unknown[]): string[] {
    const text = messages.map(m => m.content).join(' ');
    const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const frequency = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }
  
  private generateContextualSuggestions(topics: string[]): string[] {
    const suggestions = [
      `Pode me explicar mais sobre ${topics[0]}?`,
      `Como isso se relaciona com ${topics[1] || 'o tópico anterior'}?`,
      'Pode dar um exemplo prático?',
      'Quais são as vantagens e desvantagens?',
      'Existe alguma alternativa?'
    ];
    
    return suggestions.slice(0, 3);
  }
  
  private async performSearch(): Promise<unknown> {
    // Implementação de busca (placeholder)
    return [];
  }
  
  private async generateSuggestions(): Promise<string[]> {
    // Implementação de geração de sugestões (placeholder)
    const commonSuggestions = [
      'Como posso ajudar?',
      'Precisa de mais informações?',
      'Quer que eu explique melhor?',
      'Tem alguma dúvida específica?',
      'Posso dar um exemplo?'
    ];
    
    return commonSuggestions.slice(0, 3);
  }
  
  private initializeSmartPreload(): void {
    // Preload inicial de modelos populares
    setTimeout(() => {
      this.preloadModels('low');
    }, 2000);
  }
  
  private scheduleSmartPreload(request: OptimizedChatRequest, response: ChatResponse): void {
    // Agendar preload baseado na resposta
    setTimeout(() => {
      if (response.choices[0]?.message?.content) {
        // Preload baseado no conteúdo da resposta
        this.preloadModels('low');
      }
    }, 1000);
  }
  
  private async preloadModel(modelId: string): Promise<void> {
    try {
      // Fazer uma requisição simples para "aquecer" o modelo
      await apiService.sendMessageWithModel({
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1
      }, modelId);
    } catch (error) {
      console.warn(`⚠️ Preload failed for model ${modelId}:`, error);
    }
  }
  
  private updatePerformanceMetrics(startTime: number, cacheHit: boolean): void {
    const responseTime = performance.now() - startTime;
    
    this.performanceMetrics.averageResponseTime = 
      (this.performanceMetrics.averageResponseTime * (this.performanceMetrics.totalRequests - 1) + responseTime) / 
      this.performanceMetrics.totalRequests;
    
    if (cacheHit) {
      this.performanceMetrics.cacheHitRate = 
        (this.performanceMetrics.cacheHitRate * (this.performanceMetrics.totalRequests - 1) + 1) / 
        this.performanceMetrics.totalRequests;
    } else {
      this.performanceMetrics.cacheHitRate = 
        (this.performanceMetrics.cacheHitRate * (this.performanceMetrics.totalRequests - 1)) / 
        this.performanceMetrics.totalRequests;
    }
  }
  
  private calculateMemoryUsage(): number {
    return (
      this.contextCache.size * 1000 + // Estimativa
      this.sentimentCache.size * 100 +
      this.preloadQueue.size * 500
    );
  }
  
  private calculateNetworkSavings(): number {
    return this.performanceMetrics.cacheHitRate * this.performanceMetrics.totalRequests * 0.5; // Estimativa
  }
}

// Hook para usar o serviço otimizado
export function useOptimizedApi() {
  const cache = useIntelligentCache();
  const batching = useRequestBatching();
  
  return {
    cache,
    batching,
    service: optimizedApiService
  };
}

// Instância singleton
export const optimizedApiService = new OptimizedApiService();
export default optimizedApiService;
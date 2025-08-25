/**
 * Hook React Otimizado para Chat com IA - Nível Startup
 * Integra streaming, cache, batching, análise de sentimento e sugestões contextuais
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { optimizedApiService, type OptimizedChatRequest, type OptimizedResponse } from '../services/optimizedApi';
import { type Message, type ChatResponse, type StreamChunk } from '../services/api';
import { useViewport } from '../utils/viewport';
import { debounce } from 'lodash-es';

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  suggestions: string[];
  autoComplete: string[];
  sentiment: number;
  performance: {
    responseTime: number;
    cacheHitRate: number;
    networkSavings: number;
  };
}

export interface ChatActions {
  sendMessage: (content: string, options?: Partial<OptimizedChatRequest>) => Promise<void>;
  sendMessageStream: (content: string, options?: Partial<OptimizedChatRequest>) => Promise<void>;
  clearMessages: () => void;
  retryLastMessage: () => Promise<void>;
  getAutoComplete: (input: string) => Promise<string[]>;
  getSuggestions: () => Promise<string[]>;
  optimizePerformance: () => Promise<void>;
}

export interface ChatOptions {
  contextId?: string;
  enableStreaming?: boolean;
  enableCache?: boolean;
  enableBatching?: boolean;
  enableAI?: boolean;
  cacheStrategy?: 'cache-first' | 'network-first' | 'stale-while-revalidate';
  priority?: 'high' | 'medium' | 'low';
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

const DEFAULT_OPTIONS: ChatOptions = {
  enableStreaming: true,
  enableCache: true,
  enableBatching: true,
  enableAI: true,
  cacheStrategy: 'stale-while-revalidate',
  priority: 'medium',
  temperature: 0.7,
  maxTokens: 2000
};

export function useOptimizedChat(options: ChatOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const { isMobile, isSlowConnection } = useViewport();
  
  // Estado do chat
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    isStreaming: false,
    error: null,
    suggestions: [],
    autoComplete: [],
    sentiment: 0,
    performance: {
      responseTime: 0,
      cacheHitRate: 0,
      networkSavings: 0
    }
  });
  
  // Refs para controle
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastMessageRef = useRef<string>('');
  const streamingRef = useRef<boolean>(false);
  const contextIdRef = useRef<string>(config.contextId || `chat-${Date.now()}`);
  
  // Otimizações baseadas no dispositivo
  const optimizedConfig = useMemo(() => {
    const baseConfig = { ...config };
    
    if (isMobile) {
      baseConfig.enableBatching = true;
      baseConfig.priority = 'medium';
      baseConfig.maxTokens = Math.min(baseConfig.maxTokens || 2000, 1500);
    }
    
    if (isSlowConnection) {
      baseConfig.enableCache = true;
      baseConfig.cacheStrategy = 'cache-first';
      baseConfig.enableBatching = true;
      baseConfig.priority = 'low';
    }
    
    return baseConfig;
  }, [config, isMobile, isSlowConnection]);
  
  // Debounced functions
  const debouncedAutoComplete = useCallback(
    debounce(async (input: string) => {
      if (!optimizedConfig.enableAI || input.length < 2) return;
      
      try {
        const suggestions = await optimizedApiService.getAutoComplete(
          input,
          contextIdRef.current
        );
        
        setState(prev => ({
          ...prev,
          autoComplete: suggestions
        }));
      } catch (error) {
        console.warn('⚠️ Auto-complete failed:', error);
      }
    }, 300),
    [optimizedConfig.enableAI]
  );
  
  const debouncedSentimentAnalysis = useCallback(
    debounce(async (text: string) => {
      if (!optimizedConfig.enableAI) return;
      
      try {
        const sentiment = await optimizedApiService.analyzeSentiment(text);
        setState(prev => ({
          ...prev,
          sentiment
        }));
      } catch (error) {
        console.warn('⚠️ Sentiment analysis failed:', error);
      }
    }, 500),
    [optimizedConfig.enableAI]
  );
  
  // Função para enviar mensagem (sem streaming)
  const sendMessage = useCallback(async (
    content: string,
    messageOptions: Partial<OptimizedChatRequest> = {}
  ) => {
    if (!content.trim() || state.isLoading) return;
    
    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    lastMessageRef.current = content;
    
    // Adicionar mensagem do usuário
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date()
    };
    
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null
    }));
    
    // Análise de sentimento da mensagem do usuário
    if (optimizedConfig.enableAI) {
      debouncedSentimentAnalysis(content);
    }
    
    try {
      const request: OptimizedChatRequest = {
        messages: [...state.messages, userMessage].map(m => ({
          role: m.role,
          content: m.content
        })),
        model: optimizedConfig.model,
        temperature: optimizedConfig.temperature,
        max_tokens: optimizedConfig.maxTokens,
        contextId: contextIdRef.current,
        priority: optimizedConfig.priority,
        cacheStrategy: optimizedConfig.cacheStrategy,
        enableBatching: optimizedConfig.enableBatching,
        enablePreload: optimizedConfig.enableAI,
        ...messageOptions
      };
      
      const response: OptimizedResponse<ChatResponse> = await optimizedApiService.sendOptimizedMessage(request);
      
      // Adicionar resposta da IA
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.data.choices[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.',
        timestamp: new Date()
      };
      
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
        performance: {
          responseTime: response.performance.responseTime,
          cacheHitRate: prev.performance.cacheHitRate * 0.9 + (response.cached ? 1 : 0) * 0.1,
          networkSavings: prev.performance.networkSavings + (response.cached ? 1 : 0)
        }
      }));
      
      // Gerar sugestões contextuais
      if (optimizedConfig.enableAI) {
        setTimeout(async () => {
          try {
            const suggestions = await optimizedApiService.getContextualSuggestions(contextIdRef.current);
            setState(prev => ({ ...prev, suggestions }));
          } catch (error) {
            console.warn('⚠️ Contextual suggestions failed:', error);
          }
        }, 500);
      }
      
    } catch (error: unknown) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Erro ao enviar mensagem'
      }));
    }
  }, [state.messages, optimizedConfig, debouncedSentimentAnalysis]);
  
  // Função para enviar mensagem com streaming
  const sendMessageStream = useCallback(async (
    content: string,
    messageOptions: Partial<OptimizedChatRequest> = {}
  ) => {
    if (!content.trim() || state.isStreaming) return;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    lastMessageRef.current = content;
    streamingRef.current = true;
    
    // Adicionar mensagem do usuário
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date()
    };
    
    // Preparar mensagem da IA (vazia inicialmente)
    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage, assistantMessage],
      isStreaming: true,
      error: null
    }));
    
    // Análise de sentimento
    if (optimizedConfig.enableAI) {
      debouncedSentimentAnalysis(content);
    }
    
    try {
      const request: OptimizedChatRequest = {
        messages: [...state.messages, userMessage].map(m => ({
          role: m.role,
          content: m.content
        })),
        model: optimizedConfig.model,
        temperature: optimizedConfig.temperature,
        max_tokens: optimizedConfig.maxTokens,
        contextId: contextIdRef.current,
        priority: optimizedConfig.priority,
        cacheStrategy: 'network-first', // Streaming sempre usa network-first
        enableBatching: false, // Streaming não usa batching
        enablePreload: optimizedConfig.enableAI,
        enableStreaming: true,
        ...messageOptions
      };
      
      const stream = optimizedApiService.sendOptimizedMessageStream(request);
      let fullContent = '';
      
      for await (const chunk of stream) {
        if (!streamingRef.current) break; // Parar se cancelado
        
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          
          setState(prev => ({
            ...prev,
            messages: prev.messages.map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, content: fullContent }
                : msg
            )
          }));
        }
      }
      
      setState(prev => ({
        ...prev,
        isStreaming: false
      }));
      
      // Gerar sugestões após streaming
      if (optimizedConfig.enableAI) {
        setTimeout(async () => {
          try {
            const suggestions = await optimizedApiService.getContextualSuggestions(contextIdRef.current);
            setState(prev => ({ ...prev, suggestions }));
          } catch (error) {
            console.warn('⚠️ Contextual suggestions failed:', error);
          }
        }, 500);
      }
      
    } catch (error: unknown) {
      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: error.message || 'Erro no streaming'
      }));
    } finally {
      streamingRef.current = false;
    }
  }, [state.messages, optimizedConfig, debouncedSentimentAnalysis]);
  
  // Limpar mensagens
  const clearMessages = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setState({
      messages: [],
      isLoading: false,
      isStreaming: false,
      error: null,
      suggestions: [],
      autoComplete: [],
      sentiment: 0,
      performance: {
        responseTime: 0,
        cacheHitRate: 0,
        networkSavings: 0
      }
    });
    
    // Gerar novo contextId
    contextIdRef.current = `chat-${Date.now()}`;
  }, []);
  
  // Repetir última mensagem
  const retryLastMessage = useCallback(async () => {
    if (!lastMessageRef.current) return;
    
    if (optimizedConfig.enableStreaming) {
      await sendMessageStream(lastMessageRef.current);
    } else {
      await sendMessage(lastMessageRef.current);
    }
  }, [sendMessage, sendMessageStream, optimizedConfig.enableStreaming]);
  
  // Auto-complete
  const getAutoComplete = useCallback(async (input: string): Promise<string[]> => {
    if (!optimizedConfig.enableAI) return [];
    
    debouncedAutoComplete(input);
    return state.autoComplete;
  }, [optimizedConfig.enableAI, debouncedAutoComplete, state.autoComplete]);
  
  // Obter sugestões
  const getSuggestions = useCallback(async (): Promise<string[]> => {
    if (!optimizedConfig.enableAI) return [];
    
    try {
      const suggestions = await optimizedApiService.getContextualSuggestions(contextIdRef.current);
      setState(prev => ({ ...prev, suggestions }));
      return suggestions;
    } catch (error) {
      console.warn('⚠️ Get suggestions failed:', error);
      return [];
    }
  }, [optimizedConfig.enableAI]);
  
  // Otimizar performance
  const optimizePerformance = useCallback(async () => {
    try {
      await optimizedApiService.optimizeMemory();
      await optimizedApiService.preloadModels(optimizedConfig.priority);
      
      const metrics = optimizedApiService.getPerformanceMetrics();
      setState(prev => ({
        ...prev,
        performance: {
          responseTime: metrics.averageResponseTime,
          cacheHitRate: metrics.cacheHitRate,
          networkSavings: metrics.networkSavings
        }
      }));
    } catch (error) {
      console.warn('⚠️ Performance optimization failed:', error);
    }
  }, [optimizedConfig.priority]);
  
  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      streamingRef.current = false;
    };
  }, []);
  
  // Preload inicial
  useEffect(() => {
    if (optimizedConfig.enableAI) {
      optimizedApiService.preloadModels('low');
    }
  }, [optimizedConfig.enableAI]);
  
  // Otimização automática de memória
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.messages.length > 50) {
        optimizedApiService.optimizeMemory();
      }
    }, 60000); // A cada minuto
    
    return () => clearInterval(interval);
  }, [state.messages.length]);
  
  const actions: ChatActions = {
    sendMessage,
    sendMessageStream,
    clearMessages,
    retryLastMessage,
    getAutoComplete,
    getSuggestions,
    optimizePerformance
  };
  
  return {
    ...state,
    ...actions,
    config: optimizedConfig,
    contextId: contextIdRef.current,
    isOptimized: true
  };
}

export default useOptimizedChat;
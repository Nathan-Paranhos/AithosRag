/**
 * HOOK DE INTEGRAÇÃO IA DIRETA - NÍVEL STARTUP
 * Implementação completa de IA no frontend com funcionalidades avançadas
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { intelligentCache, advancedDebounce, performanceMonitor } from '../utils/performanceOptimizations';

// ===== INTERFACES =====
interface AIMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
  confidence?: number;
  suggestions?: string[];
  metadata?: Record<string, unknown>;
}

interface AIContext {
  topic: string;
  keywords: string[];
  sentiment: string;
  userIntent: string;
  conversationHistory: AIMessage[];
}

interface AutoCompleteResult {
  suggestions: string[];
  confidence: number;
  context: string;
}

interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  emotions: Record<string, number>;
}

// ===== ANÁLISE DE SENTIMENTO LOCAL =====
class LocalSentimentAnalyzer {
  private positiveWords = [
    'bom', 'ótimo', 'excelente', 'perfeito', 'incrível', 'fantástico',
    'good', 'great', 'excellent', 'perfect', 'amazing', 'fantastic',
    'love', 'like', 'enjoy', 'happy', 'pleased', 'satisfied'
  ];

  private negativeWords = [
    'ruim', 'péssimo', 'terrível', 'horrível', 'problema', 'erro',
    'bad', 'terrible', 'awful', 'horrible', 'problem', 'error',
    'hate', 'dislike', 'angry', 'frustrated', 'disappointed', 'upset'
  ];

  private emotionPatterns = {
    joy: ['feliz', 'alegre', 'happy', 'joyful', '😊', '😄', '🎉'],
    anger: ['raiva', 'irritado', 'angry', 'mad', '😠', '😡', '🤬'],
    sadness: ['triste', 'deprimido', 'sad', 'depressed', '😢', '😭', '💔'],
    surprise: ['surpreso', 'chocado', 'surprised', 'shocked', '😮', '😲', '🤯'],
    fear: ['medo', 'assustado', 'afraid', 'scared', '😨', '😰', '😱']
  };

  analyze(text: string): SentimentAnalysis {
    const words = text.toLowerCase().split(/\s+/);
    let positiveScore = 0;
    let negativeScore = 0;
    const emotions: Record<string, number> = {};

    // Análise de sentimento
    words.forEach(word => {
      if (this.positiveWords.includes(word)) positiveScore++;
      if (this.negativeWords.includes(word)) negativeScore++;
    });

    // Análise de emoções
    Object.entries(this.emotionPatterns).forEach(([emotion, patterns]) => {
      const matches = patterns.filter(pattern => text.includes(pattern)).length;
      if (matches > 0) {
        emotions[emotion] = matches / patterns.length;
      }
    });

    // Determinar sentimento geral
    let sentiment: 'positive' | 'negative' | 'neutral';
    let confidence: number;

    if (positiveScore > negativeScore) {
      sentiment = 'positive';
      confidence = Math.min(positiveScore / (positiveScore + negativeScore + 1), 0.95);
    } else if (negativeScore > positiveScore) {
      sentiment = 'negative';
      confidence = Math.min(negativeScore / (positiveScore + negativeScore + 1), 0.95);
    } else {
      sentiment = 'neutral';
      confidence = 0.5;
    }

    return { sentiment, confidence, emotions };
  }
}

// ===== AUTO-COMPLETE INTELIGENTE =====
class IntelligentAutoComplete {
  private commonQueries = [
    'Como posso ajudar você hoje?',
    'Qual é a sua dúvida?',
    'Precisa de ajuda com alguma coisa?',
    'O que você gostaria de saber?',
    'Como funciona o sistema?',
    'Quais são as funcionalidades disponíveis?',
    'Como posso melhorar minha experiência?',
    'Há algum problema que posso resolver?'
  ];

  private contextualSuggestions = new Map<string, string[]>([
    ['problema', ['Como posso resolver este problema?', 'Qual é o erro específico?', 'Quando isso começou a acontecer?']],
    ['ajuda', ['Em que posso ajudar?', 'Qual tipo de ajuda você precisa?', 'Posso explicar melhor?']],
    ['como', ['Como funciona?', 'Como posso fazer isso?', 'Como resolver?']],
    ['erro', ['Qual é o erro?', 'Quando o erro acontece?', 'Como reproduzir o erro?']],
    ['funciona', ['Como funciona?', 'Por que não funciona?', 'Está funcionando corretamente?']]
  ]);

  getSuggestions(input: string, context: AIContext): AutoCompleteResult {
    const cacheKey = `autocomplete_${input}_${context.topic}`;
    const cached = intelligentCache.get<AutoCompleteResult>(cacheKey);
    if (cached) return cached;

    const inputLower = input.toLowerCase();
    const suggestions: string[] = [];
    let confidence = 0;

    // Sugestões baseadas em contexto
    for (const [keyword, contextSuggestions] of this.contextualSuggestions.entries()) {
      if (inputLower.includes(keyword)) {
        suggestions.push(...contextSuggestions);
        confidence += 0.3;
      }
    }

    // Sugestões baseadas no histórico
    const historyKeywords = context.keywords.filter(keyword => 
      inputLower.includes(keyword.toLowerCase())
    );
    if (historyKeywords.length > 0) {
      suggestions.push(
        `Você mencionou ${historyKeywords[0]} antes. Quer continuar falando sobre isso?`,
        `Posso dar mais detalhes sobre ${historyKeywords[0]}.`
      );
      confidence += 0.2;
    }

    // Sugestões comuns se não houver contexto específico
    if (suggestions.length === 0) {
      suggestions.push(...this.commonQueries.slice(0, 3));
      confidence = 0.1;
    }

    // Remover duplicatas e limitar
    const uniqueSuggestions = [...new Set(suggestions)].slice(0, 5);
    
    const result: AutoCompleteResult = {
      suggestions: uniqueSuggestions,
      confidence: Math.min(confidence, 1),
      context: context.topic
    };

    // Cache por 2 minutos
    intelligentCache.set(cacheKey, result, 2 * 60 * 1000);
    return result;
  }
}

// ===== GERADOR DE RESPOSTAS PRÉ-CARREGADAS =====
class PreloadedResponseGenerator {
  private responses = new Map<string, string[]>([
    ['saudação', [
      'Olá! Como posso ajudar você hoje?',
      'Oi! Em que posso ser útil?',
      'Bem-vindo! Qual é a sua dúvida?'
    ]],
    ['despedida', [
      'Foi um prazer ajudar! Até logo!',
      'Espero ter sido útil. Volte sempre!',
      'Obrigado pela conversa. Tenha um ótimo dia!'
    ]],
    ['agradecimento', [
      'De nada! Fico feliz em ajudar.',
      'Por nada! Estou aqui para isso.',
      'Sempre às ordens! Precisa de mais alguma coisa?'
    ]],
    ['dúvida', [
      'Claro! Posso esclarecer isso para você.',
      'Boa pergunta! Vou explicar detalhadamente.',
      'Sem problemas! Vamos resolver essa dúvida juntos.'
    ]]
  ]);

  private intentPatterns = new Map<string, RegExp[]>([
    ['saudação', [/^(oi|olá|hey|hello|hi)/i, /bom dia|boa tarde|boa noite/i]],
    ['despedida', [/^(tchau|bye|adeus|até)/i, /obrigad[oa]|thanks/i]],
    ['agradecimento', [/obrigad[oa]|thanks|valeu/i]],
    ['dúvida', [/como|what|how|por que|why|quando|when/i]]
  ]);

  detectIntent(message: string): string {
    for (const [intent, patterns] of this.intentPatterns.entries()) {
      if (patterns.some(pattern => pattern.test(message))) {
        return intent;
      }
    }
    return 'geral';
  }

  getPreloadedResponse(message: string): string | null {
    const intent = this.detectIntent(message);
    const responses = this.responses.get(intent);
    
    if (responses && responses.length > 0) {
      const randomIndex = Math.floor(Math.random() * responses.length);
      return responses[randomIndex];
    }
    
    return null;
  }
}

// ===== HOOK PRINCIPAL =====
export const useAIIntegration = () => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [context, setContext] = useState<AIContext>({
    topic: '',
    keywords: [],
    sentiment: 'neutral',
    userIntent: '',
    conversationHistory: []
  });
  const [autoComplete, setAutoComplete] = useState<AutoCompleteResult | null>(null);
  const [currentSentiment, setCurrentSentiment] = useState<SentimentAnalysis | null>(null);

  // Instâncias dos analisadores
  const sentimentAnalyzer = useRef(new LocalSentimentAnalyzer());
  const autoCompleteEngine = useRef(new IntelligentAutoComplete());
  const responseGenerator = useRef(new PreloadedResponseGenerator());

  // Debounced functions
  const debouncedAnalyzeSentiment = useCallback(
    advancedDebounce.debounce((text: string) => {
      const analysis = sentimentAnalyzer.current.analyze(text);
      setCurrentSentiment(analysis);
    }, 300, 'sentiment'),
    []
  );

  const debouncedAutoComplete = useCallback(
    advancedDebounce.debounce((input: string) => {
      if (input.length > 2) {
        const suggestions = autoCompleteEngine.current.getSuggestions(input, context);
        setAutoComplete(suggestions);
      } else {
        setAutoComplete(null);
      }
    }, 200, 'autocomplete'),
    [context]
  );

  // Função para adicionar mensagem
  const addMessage = useCallback((content: string, role: 'user' | 'assistant') => {
    const endRender = performanceMonitor.startRender();
    
    const newMessage: AIMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      role,
      timestamp: Date.now(),
      sentiment: role === 'user' ? currentSentiment?.sentiment : undefined,
      confidence: role === 'user' ? currentSentiment?.confidence : undefined
    };

    setMessages(prev => {
      const updated = [...prev, newMessage];
      
      // Atualizar contexto
      setContext(prevContext => ({
        ...prevContext,
        conversationHistory: updated,
        keywords: extractKeywords(content, prevContext.keywords),
        sentiment: currentSentiment?.sentiment || prevContext.sentiment
      }));
      
      return updated;
    });

    endRender();
  }, [currentSentiment]);

  // Função para enviar mensagem com IA integrada
  const sendMessage = useCallback(async (content: string) => {
    const startTime = performance.now();
    
    // Adicionar mensagem do usuário
    addMessage(content, 'user');
    
    // Verificar se há resposta pré-carregada
    const preloadedResponse = responseGenerator.current.getPreloadedResponse(content);
    
    if (preloadedResponse) {
      // Simular typing para resposta pré-carregada
      setIsTyping(true);
      setTimeout(() => {
        addMessage(preloadedResponse, 'assistant');
        setIsTyping(false);
        performanceMonitor.recordCacheHit();
      }, 500 + Math.random() * 1000);
      
      const duration = performance.now() - startTime;
      performanceMonitor.recordApiCall(duration);
      return;
    }

    // Enviar para API se não houver resposta pré-carregada
    setIsTyping(true);
    
    try {
      // Aqui você integraria com sua API existente
      // Por enquanto, simular resposta
      setTimeout(() => {
        const mockResponse = `Entendi sua mensagem sobre "${content}". Como posso ajudar mais?`;
        addMessage(mockResponse, 'assistant');
        setIsTyping(false);
        performanceMonitor.recordCacheMiss();
      }, 1000 + Math.random() * 2000);
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      addMessage('Desculpe, ocorreu um erro. Tente novamente.', 'assistant');
      setIsTyping(false);
    }
    
    const duration = performance.now() - startTime;
    performanceMonitor.recordApiCall(duration);
  }, [addMessage]);

  // Função para analisar input em tempo real
  const analyzeInput = useCallback((input: string) => {
    debouncedAnalyzeSentiment(input);
    debouncedAutoComplete(input);
  }, [debouncedAnalyzeSentiment, debouncedAutoComplete]);

  // Função para extrair palavras-chave
  const extractKeywords = (text: string, existingKeywords: string[]): string[] => {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const newKeywords = [...new Set([...existingKeywords, ...words])].slice(-20);
    return newKeywords;
  };

  // Função para limpar conversa
  const clearConversation = useCallback(() => {
    setMessages([]);
    setContext({
      topic: '',
      keywords: [],
      sentiment: 'neutral',
      userIntent: '',
      conversationHistory: []
    });
    setAutoComplete(null);
    setCurrentSentiment(null);
  }, []);

  // Função para obter sugestões contextuais
  const getContextualSuggestions = useCallback((): string[] => {
    if (messages.length === 0) {
      return [
        'Como posso ajudar você hoje?',
        'Qual é a sua dúvida?',
        'Em que posso ser útil?'
      ];
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'assistant') {
      return [
        'Posso esclarecer mais alguma coisa?',
        'Tem outras dúvidas?',
        'Precisa de mais informações?'
      ];
    }

    return autoComplete?.suggestions || [];
  }, [messages, autoComplete]);

  // Função para obter métricas de performance
  const getPerformanceMetrics = useCallback(() => {
    return {
      ...performanceMonitor.getMetrics(),
      totalMessages: messages.length,
      averageSentiment: currentSentiment?.confidence || 0,
      contextKeywords: context.keywords.length,
      autoCompleteAccuracy: autoComplete?.confidence || 0
    };
  }, [messages.length, currentSentiment, context.keywords.length, autoComplete]);

  return {
    // Estado
    messages,
    isTyping,
    context,
    autoComplete,
    currentSentiment,
    
    // Ações
    sendMessage,
    addMessage,
    analyzeInput,
    clearConversation,
    
    // Utilitários
    getContextualSuggestions,
    getPerformanceMetrics,
    
    // Análises
    sentimentAnalysis: currentSentiment,
    suggestions: autoComplete?.suggestions || [],
    confidence: autoComplete?.confidence || 0
  };
};

export default useAIIntegration;
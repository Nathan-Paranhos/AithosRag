/**
 * Componente de Chat Otimizado - Nível Startup Profissional
 * Integra IA, streaming, cache, animações fluidas e responsividade perfeita
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, MicOff, Loader2, Zap, Brain, TrendingUp, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { debounce } from 'lodash-es';
import { useOptimizedChat, type ChatOptions } from '../hooks/useOptimizedChat';
import { useOfflineStorage, type ConversationData, type MessageData } from '../hooks/useOfflineStorage';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useAutoSync } from '../hooks/useAutoSync';
import { OfflineSync } from './OfflineSync';
import { useViewport } from "../utils/viewport";
import usePWA from '../hooks/usePWA';
import ModelSelector from './ModelSelector';

export interface OptimizedChatProps {
  className?: string;
  placeholder?: string;
  options?: ChatOptions;
  onMessageSent?: (message: string) => void;
  onResponse?: (response: string) => void;
  showMetrics?: boolean;
  enableVoice?: boolean;
  enableOffline?: boolean;
  conversationId?: string;
  theme?: 'light' | 'dark' | 'auto';
}

const OptimizedChat: React.FC<OptimizedChatProps> = ({
  className = '',
  placeholder = 'Digite sua mensagem...',
  options = {},
  onMessageSent,
  showMetrics = true,
  enableVoice = true,
  enableOffline = true,
  conversationId
}) => {
  const { isMobile, isSlowConnection } = useViewport();
  const {
    messages,
    isLoading,
    isStreaming,
    error,
    suggestions,
    autoComplete,
    sentiment,
    performance,
    sendMessage,
    sendMessageStream,
    clearMessages,
    retryLastMessage,
    getAutoComplete,
    getSuggestions,
    optimizePerformance,
    config
  } = useOptimizedChat({
    enableStreaming: !isSlowConnection,
    enableCache: true,
    enableBatching: isMobile,
    enableAI: true,
    priority: isMobile ? 'medium' : 'high',
    ...options
  });

  // Offline functionality
  const {
    isInitialized: isOfflineInitialized,
    saveMessageOffline,
    getMessagesOffline,
    saveConversationOffline,
    getConversationsOffline,
    getPendingSyncItems,
    markSyncCompleted
  } = useOfflineStorage();
  const { isOnline } = usePWA();
  const [offlineMessages, setOfflineMessages] = useState<MessageData[]>([]);
  
  const { isSyncing, syncProgress, addToSyncQueue } = useAutoSync({
    onSyncStart: () => {
      console.log('Iniciando sincronização automática...');
    },
    onSyncComplete: (synced, failed) => {
      console.log(`Sincronização concluída: ${synced} itens sincronizados, ${failed} falharam`);
      if (synced > 0) {
        // Refresh messages after successful sync
        const loadOfflineMessages = async () => {
          if (enableOffline && conversationId && isOfflineInitialized) {
            try {
              const messages = await getMessagesOffline(conversationId);
              setOfflineMessages(messages);
            } catch (error) {
              console.error('Failed to load offline messages:', error);
            }
          }
        };
        loadOfflineMessages();
      }
    },
    onSyncError: (error) => {
      console.error('Erro na sincronização:', error);
    }
  });
  
  // Estados locais
  const [inputValue, setInputValue] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAutoComplete, setShowAutoComplete] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama-3.1-70b-versatile'); // Modelo padrão Groq
  
  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Load offline messages on mount
  useEffect(() => {
    if (enableOffline && conversationId && isOfflineInitialized) {
      const loadOfflineMessages = async () => {
        try {
          const messages = await getMessagesOffline(conversationId);
          setOfflineMessages(messages);
        } catch (error) {
          console.error('Failed to load offline messages:', error);
        }
      };
      loadOfflineMessages();
    }
  }, [enableOffline, conversationId, isOfflineInitialized, getMessagesOffline]);
  
  // Auto-scroll para última mensagem
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end'
    });
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);
  
  // Debounced auto-complete
  const debouncedAutoComplete = useCallback(
    debounce(async (value: string) => {
      if (value.length >= 2) {
        await getAutoComplete(value);
        setShowAutoComplete(true);
      } else {
        setShowAutoComplete(false);
      }
    }, 300),
    [getAutoComplete]
  );
  
  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
    debouncedAutoComplete(value);
  }, [debouncedAutoComplete]);
  
  // Handle send message
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading || isStreaming) return;
    
    const message = inputValue.trim();
    setInputValue('');
    setShowAutoComplete(false);
    setShowSuggestions(false);
    
    onMessageSent?.(message);
    
    try {
      // Save message offline if enabled
      if (enableOffline && conversationId && isOfflineInitialized) {
        const messageData = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          conversationId,
          content: message,
          role: 'user' as const,
          timestamp: Date.now()
        };
        
        await saveMessageOffline(messageData);
        setOfflineMessages(prev => [...prev, { ...messageData, synced: false }]);
      }
      
      if (!isOnline && enableOffline) {
        // Save message offline
        const messageData: MessageData = {
          id: Date.now().toString(),
          conversationId: conversationId || 'default',
          content: message,
          role: 'user',
          timestamp: new Date().toISOString(),
          isOffline: true
        };
        
        await saveMessageOffline(messageData);
        setOfflineMessages(prev => [...prev, messageData]);
        
        // Add to sync queue for automatic synchronization
        await addToSyncQueue('message', messageData);
        
        return;
      }
      
      // Send message if online
      if (isOnline) {
        if (config.enableStreaming) {
          await sendMessageStream(message);
        } else {
          await sendMessage(message);
        }
      }
      
      // Gerar sugestões após envio
      setTimeout(async () => {
        await getSuggestions();
        setShowSuggestions(true);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
    }
  }, [inputValue, isLoading, isStreaming, config.enableStreaming, sendMessage, sendMessageStream, onMessageSent, getSuggestions, enableOffline, conversationId, isOnline, saveMessageOffline, isOfflineInitialized, addToSyncQueue]);
  
  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);
  
  // Voice recognition setup
  useEffect(() => {
    if (!enableVoice || !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'pt-BR';
    
    recognition.onstart = () => {
      setIsVoiceActive(true);
    };
    
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      
      setInputValue(transcript);
    };
    
    recognition.onend = () => {
      setIsVoiceActive(false);
    };
    
    recognition.onerror = (event) => {
      console.error('❌ Erro no reconhecimento de voz:', event.error);
      setIsVoiceActive(false);
    };
    
    recognitionRef.current = recognition;
    
    return () => {
      recognition.stop();
    };
  }, [enableVoice]);
  
  // Toggle voice recognition
  const toggleVoice = useCallback(() => {
    if (!recognitionRef.current) return;
    
    try {
      if (isVoiceActive) {
        recognitionRef.current.stop();
      } else {
        // Verificar se já está ativo antes de iniciar
        if (recognitionRef.current.state !== 'started') {
          recognitionRef.current.start();
        }
      }
    } catch (error) {
      console.error('❌ Erro ao controlar reconhecimento de voz:', error);
      setIsVoiceActive(false);
    }
  }, [isVoiceActive]);
  
  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, []);
  
  // Handle auto-complete click
  const handleAutoCompleteClick = useCallback((completion: string) => {
    setInputValue(completion);
    setShowAutoComplete(false);
    inputRef.current?.focus();
  }, []);
  
  // Sentiment color
  const getSentimentColor = useCallback((sentiment: number) => {
    if (sentiment > 0.3) return 'text-green-500';
    if (sentiment < -0.3) return 'text-red-500';
    return 'text-yellow-500';
  }, []);
  
  // Performance indicator
  const getPerformanceColor = useCallback((responseTime: number) => {
    if (responseTime < 1000) return 'text-green-500';
    if (responseTime < 3000) return 'text-yellow-500';
    return 'text-red-500';
  }, []);
  
  return (
    <div className={`flex flex-col h-full relative bg-gradient-to-br from-slate-900/95 via-gray-800/95 to-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden ${className}`}>
      {/* Model Selector */}
      <div className="p-4 border-b border-white/20 bg-gradient-to-r from-blue-600/10 via-gray-700/10 to-blue-500/10">
        <ModelSelector 
          selectedModel={selectedModel} 
          onModelChange={setSelectedModel}
        />
      </div>

      {/* Header com métricas */}
      {showMetrics && (
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600/20 via-gray-700/20 to-blue-500/20 backdrop-blur-sm border-b border-white/20">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-blue-400" />
              <div>
                <span className="text-sm font-medium text-white">IA Otimizada</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-300 bg-blue-500/20 px-2 py-1 rounded-full">{selectedModel}</span>
                  {isSyncing && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-100/20 rounded-full">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-blue-300 font-medium">
                        Sincronizando {syncProgress.synced}/{syncProgress.total}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Status de conexão */}
            {enableOffline && (
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <div className="flex items-center space-x-1 text-xs text-green-400">
                    <Wifi className="w-4 h-4" />
                    <span>Online</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-xs text-orange-400">
                    <WifiOff className="w-4 h-4" />
                    <span>Offline</span>
                  </div>
                )}
              </div>
            )}
            
            {config.enableStreaming && (
              <div className="flex items-center space-x-1 text-xs bg-blue-500/20 backdrop-blur-sm text-blue-300 px-3 py-1 rounded-full border border-blue-400/30">
                <Zap className="w-3 h-3" />
                <span>Streaming</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Componente de sincronização offline */}
            {enableOffline && <OfflineSync />}
            
            <div className="flex items-center space-x-4 text-xs text-gray-300">
              {/* Performance */}
              <div className="flex items-center space-x-1">
                <TrendingUp className={`w-3 h-3 ${getPerformanceColor(performance.responseTime)}`} />
                <span>{performance.responseTime}ms</span>
              </div>
              
              {/* Cache Hit Rate */}
              <div className="flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-yellow-500" />
                <span>{Math.round(performance.cacheHitRate * 100)}%</span>
              </div>
              
              {/* Sentiment */}
              {sentiment !== 0 && (
                <div className={`flex items-center space-x-1 ${getSentimentColor(sentiment)}`}>
                  <span>😊</span>
                  <span>{Math.round(sentiment * 100)}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {(messages.length === 0 && offlineMessages.length === 0) && (
          <div className="text-center text-gray-300 py-8">
            <div className="bg-gradient-to-r from-blue-500 to-gray-700 p-4 rounded-2xl w-fit mx-auto mb-4">
              <Brain className="w-12 h-12 text-white" />
            </div>
            <p className="text-lg font-medium mb-2 text-white">Chat IA Otimizado</p>
            <p className="text-sm">Comece uma conversa inteligente com IA avançada</p>
            <p className="text-sm mt-2 text-blue-300">
              Modelo selecionado: <span className="font-medium text-blue-400">{selectedModel}</span>
            </p>
            {enableOffline && !isOnline && (
              <p className="text-sm mt-2 text-orange-400">
                Modo offline ativo - suas mensagens serão sincronizadas quando voltar online
              </p>
            )}
          </div>
        )}
        
        {/* Combinar mensagens online e offline, ordenadas por timestamp */}
        {[...messages, ...offlineMessages]
          .sort((a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime())
          .map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-messageSlideIn`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-2xl shadow-lg relative backdrop-blur-sm border ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-gray-700 text-white ml-4 border-blue-400/30'
                    : 'bg-white/10 text-white mr-4 border-white/20'
                } ${
                  message.metadata?.isOffline ? 'border-l-4 border-orange-400' : ''
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs opacity-70">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                  {message.metadata?.isOffline && (
                    <div className="flex items-center space-x-1 text-xs opacity-70">
                      <WifiOff className="w-3 h-3" />
                      <span>Offline</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        
        {/* Loading indicator */}
        {(isLoading || isStreaming) && (
          <div className="flex justify-start animate-fadeIn">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-4 rounded-2xl mr-4">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span className="text-sm text-gray-300">
                  {isStreaming ? `Gerando resposta com ${selectedModel}...` : 'Processando...'}
                </span>
              </div>
              <div className="flex space-x-1 mt-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-dotPulse"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-dotPulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-dotPulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="flex justify-center animate-fadeIn">
            <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-red-300 p-4 rounded-2xl max-w-md">
              <p className="text-sm">{error}</p>
              <button
                onClick={retryLastMessage}
                className="text-xs underline mt-1 hover:no-underline text-red-400 hover:text-red-300"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Suggestions */}
      {showSuggestions && suggestions && suggestions.length > 0 && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-xs bg-blue-500/20 backdrop-blur-sm text-blue-300 px-3 py-1 rounded-full hover:bg-blue-500/30 transition-colors animate-fadeIn border border-blue-400/30"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Auto-complete */}
      {showAutoComplete && autoComplete && autoComplete.length > 0 && (
        <div className="px-4 pb-2">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 space-y-1">
            {autoComplete.slice(0, 3).map((completion, index) => (
              <button
                key={index}
                onClick={() => handleAutoCompleteClick(completion)}
                className="w-full text-left text-sm p-2 hover:bg-white/10 rounded-lg transition-colors animate-fadeIn text-gray-300 hover:text-white"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {completion}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Input Area */}
      <div className="p-4 border-t border-white/20">
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              rows={1}
              className="w-full p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400/50 text-white placeholder-gray-400 transition-all duration-200"
              style={{
                minHeight: '48px',
                maxHeight: isMobile ? '120px' : '200px'
              }}
              disabled={isLoading || isStreaming}
            />
            
            {/* Voice button */}
            {enableVoice && recognitionRef.current && (
              <button
                onClick={toggleVoice}
                className={`absolute right-3 top-3 p-1 rounded-full transition-all duration-200 ${
                  isVoiceActive
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
                disabled={isLoading || isStreaming}
              >
                {isVoiceActive ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading || isStreaming}
            className="p-3 bg-gradient-to-r from-blue-600 to-gray-700 hover:from-blue-700 hover:to-gray-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover-lift"
          >
            {isLoading || isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {/* Quick actions */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
          <div className="flex items-center space-x-4">
            <button
              onClick={clearMessages}
              className="hover:text-blue-400 transition-colors"
            >
              Limpar chat
            </button>
            <button
              onClick={optimizePerformance}
              className="hover:text-blue-400 transition-colors"
            >
              Otimizar
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            {config.enableCache && (
              <span className="text-green-500">Cache ativo</span>
            )}
            {config.enableBatching && (
              <span className="text-blue-500">Batching ativo</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizedChat;
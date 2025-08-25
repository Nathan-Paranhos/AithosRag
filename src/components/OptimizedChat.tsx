/**
 * Componente de Chat Otimizado - Nível Startup Profissional
 * Integra IA, streaming, cache, animações fluidas e responsividade perfeita
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, MicOff, Loader2, Zap, Brain, TrendingUp, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { useOptimizedChat, type ChatOptions } from '../hooks/useOptimizedChat';
import { useOfflineStorage, type ConversationData, type MessageData } from '../hooks/useOfflineStorage';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { OfflineSync } from './OfflineSync';
import { useViewport } from '../utils/viewport';
import { debounce } from 'lodash-es';

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
  onResponse,
  showMetrics = true,
  enableVoice = true,
  enableOffline = true,
  conversationId,
  theme = 'auto'
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
  const offlineStorage = useOfflineStorage();
  const { isOnline, syncStatus, lastSync, sync } = useOfflineSync();
  const [offlineMessages, setOfflineMessages] = useState<MessageData[]>([]);
  
  // Estados locais
  const [inputValue, setInputValue] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAutoComplete, setShowAutoComplete] = useState(false);
  
  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Load offline messages on mount
  useEffect(() => {
    if (enableOffline && conversationId) {
      const loadOfflineMessages = async () => {
        try {
          const conversation = await offlineStorage.getConversation(conversationId);
          if (conversation) {
            const messages = await offlineStorage.getMessages(conversationId);
            setOfflineMessages(messages);
          }
        } catch (error) {
          console.error('Failed to load offline messages:', error);
        }
      };
      loadOfflineMessages();
    }
  }, [enableOffline, conversationId, offlineStorage]);
  
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
      if (enableOffline && conversationId) {
        const messageData: MessageData = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          conversationId,
          content: message,
          role: 'user',
          timestamp: new Date().toISOString(),
          metadata: {
            isOffline: !isOnline,
            needsSync: !isOnline
          }
        };
        
        await offlineStorage.saveMessage(messageData);
        setOfflineMessages(prev => [...prev, messageData]);
        
        // Add to sync queue if offline
        if (!isOnline) {
          await offlineStorage.addSyncItem({
            id: `sync_${Date.now()}`,
            type: 'message',
            data: messageData,
            timestamp: new Date().toISOString(),
            retryCount: 0
          });
        }
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
  }, [inputValue, isLoading, isStreaming, config.enableStreaming, sendMessage, sendMessageStream, onMessageSent, getSuggestions, enableOffline, conversationId, isOnline, offlineStorage]);
  
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
    
    if (isVoiceActive) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
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
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header com métricas */}
      {showMetrics && (
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">IA Otimizada</span>
            </div>
            
            {/* Status de conexão */}
            {enableOffline && (
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <div className="flex items-center space-x-1 text-xs text-green-600 dark:text-green-400">
                    <Wifi className="w-4 h-4" />
                    <span>Online</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-xs text-orange-600 dark:text-orange-400">
                    <WifiOff className="w-4 h-4" />
                    <span>Offline</span>
                  </div>
                )}
              </div>
            )}
            
            {config.enableStreaming && (
              <div className="flex items-center space-x-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                <Zap className="w-3 h-3" />
                <span>Streaming</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Componente de sincronização offline */}
            {enableOffline && <OfflineSync />}
            
            <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
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
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Chat IA Otimizado</p>
            <p className="text-sm">Comece uma conversa inteligente com IA avançada</p>
            {enableOffline && !isOnline && (
              <p className="text-sm mt-2 text-orange-600 dark:text-orange-400">
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
                className={`max-w-[80%] p-3 rounded-lg shadow-sm relative ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white ml-4'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 mr-4'
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
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mr-4">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {isStreaming ? 'Gerando resposta...' : 'Processando...'}
                </span>
              </div>
              <div className="flex space-x-1 mt-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-dotPulse"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-dotPulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-dotPulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="flex justify-center animate-fadeIn">
            <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-lg max-w-md">
              <p className="text-sm">{error}</p>
              <button
                onClick={retryLastMessage}
                className="text-xs underline mt-1 hover:no-underline"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors animate-fadeIn"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Auto-complete */}
      {showAutoComplete && autoComplete.length > 0 && (
        <div className="px-4 pb-2">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 space-y-1">
            {autoComplete.slice(0, 3).map((completion, index) => (
              <button
                key={index}
                onClick={() => handleAutoCompleteClick(completion)}
                className="w-full text-left text-sm p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors animate-fadeIn"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {completion}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              rows={1}
              className="w-full p-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
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
            className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover-lift"
          >
            {isLoading || isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {/* Quick actions */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-4">
            <button
              onClick={clearMessages}
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Limpar chat
            </button>
            <button
              onClick={optimizePerformance}
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
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
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Zap, Brain, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { TooltipProvider } from './ui/Tooltip';
import ChatHeader from './chat/ChatHeader';
import ChatSettings from './chat/ChatSettings';
import ChatMessages from './chat/ChatMessages';
import ChatInput from './chat/ChatInput';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
  reasoning?: string;
  toolCalls?: Array<{
    type: string;
    result?: any;
  }>;
  usedFallback?: boolean;
}

interface ChatConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  reasoningEffort?: string;
  useTools?: boolean;
}

const AVAILABLE_MODELS = [
  {
    id: 'gpt-oss-120b',
    name: 'GPT-OSS-120B',
    description: 'Modelo avançado com reasoning e tools',
    icon: Brain,
    features: ['reasoning', 'tools', 'streaming'],
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B',
    description: 'Modelo rápido e eficiente',
    icon: Zap,
    features: ['streaming', 'fast'],
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'llama-3.1-70b-versatile',
    name: 'Llama 3.1 70B',
    description: 'Modelo versátil e poderoso',
    icon: Bot,
    features: ['streaming', 'versatile'],
    color: 'from-green-500 to-emerald-500'
  }
];

const REASONING_LEVELS = [
  { value: 'low', label: 'Baixo', description: 'Respostas rápidas' },
  { value: 'medium', label: 'Médio', description: 'Balanceado' },
  { value: 'high', label: 'Alto', description: 'Análise profunda' }
];

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<ChatConfig>({
    model: 'gpt-oss-120b',
    temperature: 0.7,
    maxTokens: 4000,
    reasoningEffort: 'medium',
    useTools: true
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Voice recognition hook
  const { isListening, isSupported: hasVoiceSupport, toggleListening } = useVoiceRecognition({
    onResult: (transcript) => setInputValue(transcript),
    language: 'pt-BR'
  });

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Send message
  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/groq-advanced/chat-with-model', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
          model: config.model,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          reasoningEffort: config.reasoningEffort,
          useTools: config.useTools,
          conversationHistory: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.content || data.message || 'Desculpe, não consegui processar sua solicitação.',
        role: 'assistant',
        timestamp: new Date(),
        model: data.model || config.model,
        fallbackUsed: data.fallbackUsed || false,
        toolCalls: data.toolCalls || [],
        reasoning: data.reasoning
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem. Tente novamente.');
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        role: 'assistant',
        timestamp: new Date(),
        model: config.model
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear chat
  const clearChat = () => {
    setMessages([]);
    toast.success('Chat limpo!');
  };

  // Get selected model info
  const selectedModel = AVAILABLE_MODELS.find(m => m.id === config.model);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Header */}
        <ChatHeader
          selectedModel={AVAILABLE_MODELS.find(m => m.id === config.model)?.name || config.model}
          onClearChat={clearChat}
          onToggleSettings={() => setShowSettings(!showSettings)}
          canClearChat={messages.length > 0}
        />

        {/* Settings Panel */}
        {showSettings && (
          <ChatSettings
            config={config}
            onConfigChange={setConfig}
            availableModels={AVAILABLE_MODELS}
            reasoningLevels={REASONING_LEVELS}
          />
        )}

        {/* Messages */}
        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          onQuickAction={setInputValue}
        />
        
        <div ref={messagesEndRef} />

        {/* Input */}
        <ChatInput
          inputValue={inputValue}
          isLoading={isLoading}
          isListening={isListening}
          onInputChange={setInputValue}
          onSendMessage={sendMessage}
          onToggleVoiceInput={toggleListening}
          hasVoiceSupport={hasVoiceSupport}
        />
      </div>
    </TooltipProvider>
  );
};

export default ChatInterface;
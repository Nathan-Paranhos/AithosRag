import React from 'react';
import { Bot, Brain, Code, Search } from 'lucide-react';
import { Card } from '../ui/Card';
import { FadeIn, StaggerContainer, StaggerItem } from '../Animations';
import { LoadingDots } from '../LoadingStates';
import ChatMessage from './ChatMessage';

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

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  availableModels: Array<{
    id: string;
    name: string;
  }>;
  onQuickAction: (text: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isLoading,
  availableModels,
  onQuickAction,
  messagesEndRef
}) => {
  const EmptyState = () => (
    <FadeIn>
      <div className="text-center py-12">
        <div className="p-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <Bot className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Olá! Como posso ajudar?
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Faça uma pergunta ou inicie uma conversa. Estou aqui para ajudar com qualquer coisa!
        </p>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 max-w-2xl mx-auto">
          <Card 
            className="p-4 cursor-pointer hover:shadow-md transition-shadow" 
            onClick={() => onQuickAction('Explique como funciona a inteligência artificial')}
          >
            <Brain className="h-6 w-6 text-purple-500 mb-2" />
            <h4 className="font-medium text-gray-900 dark:text-white mb-1">Explicar IA</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Como funciona a inteligência artificial</p>
          </Card>
          
          <Card 
            className="p-4 cursor-pointer hover:shadow-md transition-shadow" 
            onClick={() => onQuickAction('Escreva um código Python para análise de dados')}
          >
            <Code className="h-6 w-6 text-blue-500 mb-2" />
            <h4 className="font-medium text-gray-900 dark:text-white mb-1">Gerar Código</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Criar código Python para análise</p>
          </Card>
          
          <Card 
            className="p-4 cursor-pointer hover:shadow-md transition-shadow" 
            onClick={() => onQuickAction('Pesquise as últimas notícias sobre tecnologia')}
          >
            <Search className="h-6 w-6 text-green-500 mb-2" />
            <h4 className="font-medium text-gray-900 dark:text-white mb-1">Pesquisar</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Buscar informações atuais</p>
          </Card>
        </div>
      </div>
    </FadeIn>
  );

  const LoadingIndicator = () => (
    <FadeIn>
      <div className="flex justify-start mb-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center justify-center">
            <Bot className="h-4 w-4" />
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg">
            <LoadingDots />
          </div>
        </div>
      </div>
    </FadeIn>
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="messages-container">
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        <StaggerContainer>
          {messages.map((message, index) => (
            <StaggerItem key={message.id}>
              <ChatMessage 
                message={message} 
                availableModels={availableModels}
              />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
      
      {/* Loading indicator */}
      {isLoading && <LoadingIndicator />}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;
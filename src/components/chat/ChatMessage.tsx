import React from 'react';
import { Bot, User, Copy, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import { toast } from 'sonner';

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

interface ChatMessageProps {
  message: Message;
  availableModels: Array<{
    id: string;
    name: string;
  }>;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, availableModels }) => {
  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Mensagem copiada!');
  };

  const getModelName = (modelId?: string) => {
    if (!modelId) return null;
    return availableModels.find(m => m.id === modelId)?.name || modelId;
  };

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`} data-testid={`message-${message.id}`}>
      <div className={`flex max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          message.role === 'user' 
            ? 'bg-blue-500 text-white' 
            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
        }`}>
          {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>
        
        {/* Message Content */}
        <div className={`flex-1 ${
          message.role === 'user' ? 'mr-3' : 'ml-3'
        }`}>
          <div className={`p-3 rounded-lg ${
            message.role === 'user'
              ? 'bg-blue-500 text-white'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
          }`}>
            <div className="whitespace-pre-wrap">{message.content}</div>
            
            {/* Message Metadata */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-2">
                {message.model && (
                  <Badge variant="secondary" className="text-xs">
                    {getModelName(message.model)}
                  </Badge>
                )}
                {message.usedFallback && (
                  <Badge variant="outline" className="text-xs text-yellow-600">
                    Fallback
                  </Badge>
                )}
                {message.toolCalls && message.toolCalls.length > 0 && (
                  <Badge variant="outline" className="text-xs text-green-600">
                    Tools: {message.toolCalls.length}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-1">
                <Tooltip content="Copiar">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyMessage(message.content)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </Tooltip>
                
                {message.role === 'assistant' && (
                  <>
                    <Tooltip content="Útil">
                      <Button variant="ghost" size="sm">
                        <ThumbsUp className="h-3 w-3" />
                      </Button>
                    </Tooltip>
                    
                    <Tooltip content="Não útil">
                      <Button variant="ghost" size="sm">
                        <ThumbsDown className="h-3 w-3" />
                      </Button>
                    </Tooltip>
                  </>
                )}
              </div>
            </div>
            
            {/* Reasoning (GPT-OSS only) */}
            {message.reasoning && (
              <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Raciocínio:</div>
                <div className="text-gray-600 dark:text-gray-400">{message.reasoning}</div>
              </div>
            )}
          </div>
          
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
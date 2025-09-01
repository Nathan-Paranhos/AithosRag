import React from 'react';
import { Settings, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/Tooltip';

interface ChatHeaderProps {
  selectedModel: {
    id: string;
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  } | undefined;
  messagesCount: number;
  showSettings: boolean;
  onToggleSettings: () => void;
  onClearChat: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  selectedModel,
  messagesCount,
  showSettings,
  onToggleSettings,
  onClearChat
}) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-3">
        {selectedModel && (
          <div className={`p-2 rounded-lg bg-gradient-to-r ${selectedModel.color} text-white`}>
            <selectedModel.icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {selectedModel?.name || 'Chat AI'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {selectedModel?.description}
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearChat}
              disabled={messagesCount === 0}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Limpar chat</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSettings}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Configurações</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

export default ChatHeader;
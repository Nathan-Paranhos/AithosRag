import React, { useRef, useEffect } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/Tooltip';
import { LoadingSpinner } from '../LoadingStates';
import { toast } from 'sonner';

interface ChatInputProps {
  inputValue: string;
  isLoading: boolean;
  isListening: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onToggleVoiceInput: () => void;
  hasVoiceSupport: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  inputValue,
  isLoading,
  isListening,
  onInputChange,
  onSendMessage,
  onToggleVoiceInput,
  hasVoiceSupport
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-end space-x-2">
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="min-h-[60px] max-h-[120px] resize-none"
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
        </div>
        
        <div className="flex flex-col space-y-2">
          {/* Voice Input */}
          {hasVoiceSupport && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isListening ? "default" : "outline"}
                  size="sm"
                  onClick={onToggleVoiceInput}
                  disabled={isLoading}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isListening ? 'Parar gravação' : 'Gravar áudio'}
              </TooltipContent>
            </Tooltip>
          )}
          
          {/* Send Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onSendMessage}
                disabled={!inputValue.trim() || isLoading}
                size="sm"
              >
                {isLoading ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Enviar mensagem</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
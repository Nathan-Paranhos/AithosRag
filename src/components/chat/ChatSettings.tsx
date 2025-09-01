import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { SlideIn } from '../Animations';

interface ChatConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  reasoningEffort?: string;
  useTools?: boolean;
}

interface ChatSettingsProps {
  config: ChatConfig;
  onConfigChange: (config: ChatConfig) => void;
  availableModels: Array<{
    id: string;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
  reasoningLevels: Array<{
    value: string;
    label: string;
    description: string;
  }>;
}

export const ChatSettings: React.FC<ChatSettingsProps> = ({
  config,
  onConfigChange,
  availableModels,
  reasoningLevels
}) => {
  const updateConfig = (updates: Partial<ChatConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  return (
    <SlideIn direction="down">
      <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Modelo
            </label>
            <Select 
              value={config.model} 
              onValueChange={(value) => updateConfig({ model: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center space-x-2">
                      <model.icon className="h-4 w-4" />
                      <span>{model.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Temperatura: {config.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={config.temperature}
              onChange={(e) => updateConfig({ temperature: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Reasoning Effort (GPT-OSS only) */}
          {config.model === 'gpt-oss-120b' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reasoning
              </label>
              <Select 
                value={config.reasoningEffort} 
                onValueChange={(value) => updateConfig({ reasoningEffort: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reasoningLevels.map(level => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tools Toggle (GPT-OSS only) */}
          {config.model === 'gpt-oss-120b' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ferramentas
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.useTools}
                  onChange={(e) => updateConfig({ useTools: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Busca e código
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </SlideIn>
  );
};

export default ChatSettings;
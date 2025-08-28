import React, { useState, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface GroqModel {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'high' | 'medium' | 'standard';
  icon: React.ReactNode;
  recommended?: boolean;
}

const GROQ_MODELS: GroqModel[] = [
  {
    id: 'llama-3.1-70b-versatile',
    name: 'Llama 3.1 70B',
    description: 'Modelo mais poderoso para tarefas complexas',
    maxTokens: 8192,
    speed: 'medium',
    quality: 'high',
    icon: null,
    recommended: true
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B',
    description: 'Rápido e eficiente para uso geral',
    maxTokens: 8192,
    speed: 'fast',
    quality: 'medium',
    icon: null
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B',
    description: 'Excelente para análise e raciocínio',
    maxTokens: 32768,
    speed: 'medium',
    quality: 'high',
    icon: null
  },
  {
    id: 'gemma-7b-it',
    name: 'Gemma 7B',
    description: 'Modelo compacto e versátil',
    maxTokens: 8192,
    speed: 'fast',
    quality: 'standard',
    icon: null
  }
];

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  className?: string;
  compact?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  className = '',
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState<GroqModel | null>(null);

  useEffect(() => {
    const model = GROQ_MODELS.find(m => m.id === selectedModel) || GROQ_MODELS[0];
    setCurrentModel(model);
  }, [selectedModel]);

  const handleModelSelect = (modelId: string) => {
    onModelChange(modelId);
    setIsOpen(false);
  };

  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case 'fast': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'slow': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'high': return 'text-blue-500';
      case 'medium': return 'text-purple-500';
      case 'standard': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="text-sm font-medium text-white">{currentModel?.name}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
            {GROQ_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => handleModelSelect(model.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
              >
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{model.name}</span>
                    {model.recommended && (
                      <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded">
                        Recomendado
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white">{model.description}</p>
                </div>
                {selectedModel === model.id && (
                  <Check className="w-4 h-4 text-blue-500" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold text-white">Selecionar Modelo IA</h3>
      </div>

      <div className="grid gap-3">
        {GROQ_MODELS.map((model) => (
          <div
            key={model.id}
            onClick={() => handleModelSelect(model.id)}
            className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
              selectedModel === model.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-white">{model.name}</h4>
                    {model.recommended && (
                      <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded">
                        Recomendado
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white mt-1">
                    {model.description}
                  </p>
                </div>
              </div>
              {selectedModel === model.id && (
                <Check className="w-5 h-5 text-blue-500" />
              )}
            </div>

            <div className="flex items-center gap-4 mt-3 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-white">Velocidade:</span>
                <span className={getSpeedColor(model.speed)}>
                  {model.speed === 'fast' ? 'Rápida' : model.speed === 'medium' ? 'Média' : 'Lenta'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-white">Qualidade:</span>
                <span className={getQualityColor(model.quality)}>
                  {model.quality === 'high' ? 'Alta' : model.quality === 'medium' ? 'Média' : 'Padrão'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-white">Tokens:</span>
                <span className="text-white">
                  {model.maxTokens.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModelSelector;
export { GROQ_MODELS, type GroqModel };
import React, { useState, useEffect } from 'react';
import { Bot, Activity, Settings, Zap, TrendingUp, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface ModelInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  reasoningEffort?: string;
  metrics?: {
    requests: number;
    errors: number;
    errorRate: number;
    avgResponseTime: number;
    rateLimitAvailable: boolean;
  };
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  selectedStrategy: string;
  onStrategyChange: (strategy: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  selectedStrategy,
  onStrategyChange,
  isLoading = false,
  disabled = false
}) => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<Record<string, unknown> | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const strategies = [
    { id: 'balanced', name: 'Balanceado', description: 'Equilibra performance e disponibilidade', icon: <Activity className="h-4 w-4" /> },
    { id: 'fastest', name: 'Mais Rápido', description: 'Prioriza velocidade de resposta', icon: <Zap className="h-4 w-4" /> },
    { id: 'performance', name: 'Performance', description: 'Melhor histórico de performance', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'availability', name: 'Disponibilidade', description: 'Modelos com menor rate limit', icon: <CheckCircle className="h-4 w-4" /> },
    { id: 'most_reliable', name: 'Mais Confiável', description: 'Menor taxa de erro', icon: <AlertCircle className="h-4 w-4" /> }
  ];

  const modelConfigs: ModelInfo[] = [
    {
      id: 'meta-llama/llama-4-maverick-17b-128e-instruct',
      name: 'Llama 4 Maverick',
      category: 'general',
      description: 'Modelo versátil para tarefas gerais com boa performance',
      maxTokens: 8192,
      temperature: 1.0,
      topP: 1.0
    },
    {
      id: 'gemma2-9b-it',
      name: 'Gemma 2 9B',
      category: 'efficient',
      description: 'Modelo eficiente e rápido para respostas diretas',
      maxTokens: 8192,
      temperature: 1.0,
      topP: 1.0
    },
    {
      id: 'deepseek-r1-distill-llama-70b',
      name: 'DeepSeek R1 Distill',
      category: 'reasoning',
      description: 'Especializado em raciocínio e análise complexa',
      maxTokens: 131072,
      temperature: 1.1,
      topP: 0.95
    },
    {
      id: 'qwen/qwen3-32b',
      name: 'Qwen 3 32B',
      category: 'advanced',
      description: 'Modelo avançado com capacidades de raciocínio',
      maxTokens: 40960,
      temperature: 0.84,
      topP: 0.95,
      reasoningEffort: 'none'
    },
    {
      id: 'openai/gpt-oss-120b',
      name: 'GPT OSS 120B',
      category: 'premium',
      description: 'Modelo premium com raciocínio avançado e ferramentas integradas',
      maxTokens: 65536,
      temperature: 1.0,
      topP: 1.0,
      reasoningEffort: 'high'
    }
  ];

  useEffect(() => {
    loadModelsWithMetrics();
  }, []);

  const loadModelsWithMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      // Carregar métricas dos modelos
      const metricsResponse = await fetch(`${baseUrl}/api/chat/models`);
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        
        // Combinar configurações com métricas
        const modelsWithMetrics = modelConfigs.map(config => {
          const modelMetrics = metricsData.models?.find((m: { id: string }) => m.id === config.id);
          return {
            ...config,
            metrics: modelMetrics?.metrics
          };
        });
        
        setModels(modelsWithMetrics);
      } else {
        setModels(modelConfigs);
      }

      // Carregar métricas do sistema
      const systemResponse = await fetch(`${baseUrl}/api/chat/metrics`);
      if (systemResponse.ok) {
        const systemData = await systemResponse.json();
        setSystemMetrics(systemData);
      }
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
      setModels(modelConfigs);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      general: 'bg-blue-100 text-blue-800',
      efficient: 'bg-green-100 text-green-800',
      reasoning: 'bg-purple-100 text-purple-800',
      advanced: 'bg-orange-100 text-orange-800',
      premium: 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getHealthStatus = (metrics?: ModelInfo['metrics']) => {
    if (!metrics) return { status: 'unknown', color: 'text-gray-400' };
    
    if (metrics.errorRate > 0.1) return { status: 'poor', color: 'text-red-500' };
    if (metrics.errorRate > 0.05) return { status: 'fair', color: 'text-yellow-500' };
    return { status: 'good', color: 'text-green-500' };
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bot className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Seleção de Modelo IA</h3>
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center space-x-2 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Settings className="h-4 w-4" />
          <span>{showAdvanced ? 'Ocultar' : 'Avançado'}</span>
        </button>
      </div>

      {/* Strategy Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Estratégia de Seleção
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {strategies.map((strategy) => (
            <button
              key={strategy.id}
              onClick={() => onStrategyChange(strategy.id)}
              disabled={disabled}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                selectedStrategy === strategy.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center space-x-2 mb-1">
                {strategy.icon}
                <span className="font-medium text-sm">{strategy.name}</span>
              </div>
              <p className="text-xs text-gray-600">{strategy.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Model Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Modelo Específico (Opcional)
          </label>
          {loadingMetrics && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Carregando métricas...</span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {models.map((model) => {
            const health = getHealthStatus(model.metrics);
            return (
              <div
                key={model.id}
                onClick={() => !disabled && onModelChange(model.id)}
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  selectedModel === model.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{model.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{model.description}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(model.category)}`}>
                    {model.category}
                  </span>
                </div>
                
                {model.metrics && (
                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100">
                    <div className="text-center">
                      <div className={`text-lg font-semibold ${health.color}`}>
                        {model.metrics.avgResponseTime.toFixed(0)}ms
                      </div>
                      <div className="text-xs text-gray-500">Tempo Médio</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-semibold ${
                        model.metrics.errorRate < 0.05 ? 'text-green-500' : 
                        model.metrics.errorRate < 0.1 ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {(model.metrics.errorRate * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">Taxa de Erro</div>
                    </div>
                  </div>
                )}
                
                {showAdvanced && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-gray-500">Max Tokens:</span> {model.maxTokens.toLocaleString()}</div>
                      <div><span className="text-gray-500">Temperature:</span> {model.temperature}</div>
                      <div><span className="text-gray-500">Top P:</span> {model.topP}</div>
                      {model.reasoningEffort && (
                        <div><span className="text-gray-500">Reasoning:</span> {model.reasoningEffort}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* System Metrics */}
      {showAdvanced && systemMetrics && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Métricas do Sistema</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-lg font-semibold text-gray-900">
                {systemMetrics.totalRequests || 0}
              </div>
              <div className="text-xs text-gray-500">Total Requisições</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-lg font-semibold text-gray-900">
                {systemMetrics.availableModels || 0}
              </div>
              <div className="text-xs text-gray-500">Modelos Ativos</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-lg font-semibold text-gray-900">
                {systemMetrics.cacheHitRate ? `${(systemMetrics.cacheHitRate * 100).toFixed(1)}%` : '0%'}
              </div>
              <div className="text-xs text-gray-500">Cache Hit Rate</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-lg font-semibold text-gray-900">
                {systemMetrics.avgSystemResponseTime ? `${systemMetrics.avgSystemResponseTime.toFixed(0)}ms` : '0ms'}
              </div>
              <div className="text-xs text-gray-500">Tempo Médio Sistema</div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-sm text-gray-600">Processando...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
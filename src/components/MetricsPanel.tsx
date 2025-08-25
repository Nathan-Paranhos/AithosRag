import React, { useState, useEffect } from 'react';
import { BarChart3, Activity, Clock, Zap, AlertTriangle, CheckCircle, RefreshCw, X, RotateCcw, Trash2 } from 'lucide-react';
import { apiService } from '../services/api';
import type { SystemMetrics, ModelMetrics, LoadBalancerStats } from '../services/api';

interface MetricsPanelProps {
  onClose: () => void;
}

const MetricsPanel: React.FC<MetricsPanelProps> = ({ onClose }) => {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [loadBalancerStats, setLoadBalancerStats] = useState<LoadBalancerStats | null>(null);
  const [selectedModelMetrics, setSelectedModelMetrics] = useState<ModelMetrics | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Carregar métricas iniciais
  useEffect(() => {
    loadAllMetrics();
    
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(loadAllMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAllMetrics = async () => {
    setIsLoading(true);
    try {
      const [systemData, allMetricsData, healthData, performanceData] = await Promise.all([
        apiService.getSystemMetricsAdvanced(),
        apiService.getAllMetrics(),
        apiService.getModelsHealth(),
        apiService.getPerformanceMetrics()
      ]);
      
      setSystemMetrics({
        ...systemData,
        health: healthData,
        performance: performanceData
      });
      
      // Extrair métricas do load balancer dos dados completos
      if (allMetricsData.loadBalancer) {
        setLoadBalancerStats(allMetricsData.loadBalancer);
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('❌ Failed to load metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadModelMetrics = async (modelId: string) => {
    if (!modelId) return;
    
    try {
      const metrics = await apiService.getModelMetrics(modelId);
      setSelectedModelMetrics(metrics);
      setSelectedModelId(modelId);
    } catch (error) {
      console.error(`❌ Failed to load metrics for model ${modelId}:`, error);
    }
  };

  const resetModelMetrics = async (modelId: string) => {
    if (!modelId) return;
    
    try {
      const success = await apiService.resetMetricsAdvanced(modelId);
      if (success) {
        await loadModelMetrics(modelId);
        console.log(`✅ Metrics reset for model: ${modelId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to reset metrics for model ${modelId}:`, error);
    }
  };

  const clearCache = async () => {
    try {
      const success = await apiService.clearCache();
      if (success) {
        await loadAllMetrics();
        console.log('✅ Cache cleared successfully');
      }
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  };

  const exportMetrics = async (format: 'json' | 'csv' | 'prometheus') => {
    try {
      const data = await apiService.exportMetrics(format);
      const blob = new Blob([data], { 
        type: format === 'json' ? 'application/json' : 
              format === 'csv' ? 'text/csv' : 'text/plain'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `metrics.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar métricas:', error);
    }
  };

  const resetAllMetrics = async () => {
    try {
      await apiService.resetMetricsAdvanced();
      await loadAllMetrics();
    } catch (error) {
      console.error('Erro ao resetar todas as métricas:', error);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Métricas do Sistema</h2>
            {lastUpdated && (
              <span className="text-sm text-gray-500">
                Atualizado: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadAllMetrics}
              disabled={isLoading}
              className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              title="Atualizar métricas"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex gap-1">
              <button
                onClick={() => exportMetrics('json')}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                title="Exportar como JSON"
              >
                JSON
              </button>
              <button
                onClick={() => exportMetrics('csv')}
                className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                title="Exportar como CSV"
              >
                CSV
              </button>
              <button
                onClick={() => exportMetrics('prometheus')}
                className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
                title="Exportar para Prometheus"
              >
                PROM
              </button>
            </div>
            <button
              onClick={resetAllMetrics}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              title="Resetar todas as métricas"
            >
              <RotateCcw className="w-4 h-4 inline mr-2" />
              Reset
            </button>
            <button
              onClick={clearCache}
              className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
              title="Limpar cache"
            >
              <Trash2 className="w-4 h-4 inline mr-2" />
              Limpar Cache
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Métricas do Sistema */}
          {systemMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <h3 className="font-medium text-blue-900">Requisições Totais</h3>
                </div>
                <p className="text-2xl font-bold text-blue-700 mt-2">
                  {systemMetrics.totalRequests}
                </p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="font-medium text-green-900">Taxa de Sucesso</h3>
                </div>
                <p className="text-2xl font-bold text-green-700 mt-2">
                  {formatPercentage(systemMetrics.successRate)}
                </p>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <h3 className="font-medium text-yellow-900">Tempo Médio</h3>
                </div>
                <p className="text-2xl font-bold text-yellow-700 mt-2">
                  {formatDuration(systemMetrics.averageResponseTime)}
                </p>
              </div>
            </div>
          )}

          {/* Estatísticas do Load Balancer */}
          {loadBalancerStats && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Balanceador de Carga</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Estratégia Atual</p>
                  <p className="font-semibold">{loadBalancerStats.currentStrategy}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Conexões Ativas</p>
                  <p className="font-semibold">{loadBalancerStats.activeConnections}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Fila de Requisições</p>
                  <p className="font-semibold">{loadBalancerStats.queueSize}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Modelos Saudáveis</p>
                  <p className="font-semibold text-green-600">
                    {loadBalancerStats.healthyModels}/{loadBalancerStats.totalModels}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Seletor de Modelo para Métricas Detalhadas */}
          <div className="bg-white border border-gray-200 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-4">Métricas por Modelo</h3>
            
            <div className="flex items-center space-x-4 mb-4">
              <select
                value={selectedModelId}
                onChange={(e) => loadModelMetrics(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um modelo</option>
                <option value="meta-llama/llama-4-maverick-17b-128e-instruct">Llama 4 Maverick</option>
                <option value="gemma2-9b-it">Gemma2 9B</option>
                <option value="deepseek-r1-distill-llama-70b">DeepSeek R1</option>
                <option value="qwen/qwen3-32b">Qwen3 32B</option>
              </select>
              
              {selectedModelId && (
                <button
                  onClick={() => resetModelMetrics(selectedModelId)}
                  className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Reset Métricas
                </button>
              )}
            </div>

            {/* Métricas do Modelo Selecionado */}
            {selectedModelMetrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-sm text-blue-600">Requisições</p>
                  <p className="text-lg font-semibold text-blue-700">
                    {selectedModelMetrics.totalRequests}
                  </p>
                </div>
                
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-sm text-green-600">Sucessos</p>
                  <p className="text-lg font-semibold text-green-700">
                    {selectedModelMetrics.successfulRequests}
                  </p>
                </div>
                
                <div className="bg-red-50 p-3 rounded">
                  <p className="text-sm text-red-600">Erros</p>
                  <p className="text-lg font-semibold text-red-700">
                    {selectedModelMetrics.failedRequests}
                  </p>
                </div>
                
                <div className="bg-yellow-50 p-3 rounded">
                  <p className="text-sm text-yellow-600">Tempo Médio</p>
                  <p className="text-lg font-semibold text-yellow-700">
                    {formatDuration(selectedModelMetrics.averageResponseTime)}
                  </p>
                </div>
                
                <div className="bg-purple-50 p-3 rounded">
                  <p className="text-sm text-purple-600">Taxa de Sucesso</p>
                  <p className="text-lg font-semibold text-purple-700">
                    {formatPercentage(selectedModelMetrics.successRate)}
                  </p>
                </div>
                
                <div className="bg-indigo-50 p-3 rounded">
                  <p className="text-sm text-indigo-600">Último Uso</p>
                  <p className="text-lg font-semibold text-indigo-700">
                    {selectedModelMetrics.lastUsed 
                      ? new Date(selectedModelMetrics.lastUsed).toLocaleString()
                      : 'Nunca'
                    }
                  </p>
                </div>
                
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">Status</p>
                  <div className="flex items-center space-x-2">
                    {selectedModelMetrics.isHealthy ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-sm font-semibold ${
                      selectedModelMetrics.isHealthy ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {selectedModelMetrics.isHealthy ? 'Saudável' : 'Com Problemas'}
                    </span>
                  </div>
                </div>
                
                <div className="bg-orange-50 p-3 rounded">
                  <p className="text-sm text-orange-600">Rate Limit</p>
                  <p className="text-lg font-semibold text-orange-700">
                    {selectedModelMetrics.rateLimitHits}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsPanel;
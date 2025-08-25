import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { 
  Database, 
  Shield, 
  Settings, 
  Trash2, 
  RefreshCw, 
  Users, 
  Activity,
  HardDrive,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  categories: Record<string, { entries?: number; size?: number; hitRate?: number }>;
  memoryUsage: number;
}

interface RateLimitStats {
  totalRequests: number;
  activeUsers: number;
  activeModels: number;
  adaptiveMode: boolean;
  systemLoad: number;
}

interface SystemPanelProps {
  onClose: () => void;
}

const SystemPanel: React.FC<SystemPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'cache' | 'rateLimit'>('cache');
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [rateLimitStats, setRateLimitStats] = useState<RateLimitStats | null>(null);
  const [rateLimitConfig, setRateLimitConfig] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Atualizar a cada 10 segundos
    return () => clearInterval(interval);
  }, [activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'cache') {
        const statsRes = await apiService.getCacheStats();
        setCacheStats(statsRes.data);
      } else {
        const [statsRes, configRes] = await Promise.all([
          apiService.getRateLimitStats(),
          apiService.getRateLimitConfig()
        ]);
        setRateLimitStats(statsRes.data);
        setRateLimitConfig(configRes.data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showMessage('error', 'Erro ao carregar dados do sistema');
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleClearCache = async (category?: string) => {
    setLoading(true);
    try {
      const result = await apiService.clearCache(category);
      showMessage('success', result.message);
      loadData();
    } catch {
      showMessage('error', 'Erro ao limpar cache');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupCache = async () => {
    setLoading(true);
    try {
      const result = await apiService.cleanupCache();
      showMessage('success', result.message);
      loadData();
    } catch {
      showMessage('error', 'Erro ao limpar entradas expiradas');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCache = async () => {
    setLoading(true);
    try {
      const result = await apiService.saveCache();
      showMessage('success', result.message);
    } catch {
      showMessage('error', 'Erro ao salvar cache');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdaptive = async () => {
    setLoading(true);
    try {
      const result = await apiService.toggleAdaptiveMode(!rateLimitStats?.adaptiveMode);
      showMessage('success', result.message);
      loadData();
    } catch {
      showMessage('error', 'Erro ao alterar modo adaptativo');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupRateLimit = async () => {
    setLoading(true);
    try {
      const result = await apiService.cleanupRateLimit();
      showMessage('success', result.message);
      loadData();
    } catch {
      showMessage('error', 'Erro ao limpar contadores expirados');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Painel do Sistema
        </h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          title="Fechar painel"
        >
          <XCircle className="w-5 h-5" />
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('cache')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'cache'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Database className="w-4 h-4 inline mr-2" />
            Cache
          </button>
          <button
            onClick={() => setActiveTab('rateLimit')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'rateLimit'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            Rate Limiting
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          {message.text}
        </div>
      )}

      {/* Cache Tab */}
      {activeTab === 'cache' && (
        <div className="space-y-6">
          {/* Cache Stats */}
          {cacheStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Total de Entradas</p>
                    <p className="text-2xl font-bold text-blue-800">{cacheStats.totalEntries}</p>
                  </div>
                  <Database className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-medium">Taxa de Acerto</p>
                    <p className="text-2xl font-bold text-green-800">{formatPercentage(cacheStats.hitRate)}</p>
                  </div>
                  <Activity className="w-8 h-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Tamanho Total</p>
                    <p className="text-2xl font-bold text-purple-800">{formatBytes(cacheStats.totalSize)}</p>
                  </div>
                  <HardDrive className="w-8 h-8 text-purple-500" />
                </div>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600 font-medium">Uso de Memória</p>
                    <p className="text-2xl font-bold text-orange-800">{formatPercentage(cacheStats.memoryUsage)}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                </div>
              </div>
            </div>
          )}

          {/* Cache Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleClearCache()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Limpar Todo Cache
            </button>
            
            <button
              onClick={handleCleanupCache}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
            >
              <Clock className="w-4 h-4" />
              Limpar Expirados
            </button>
            
            <button
              onClick={handleSaveCache}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              <HardDrive className="w-4 h-4" />
              Salvar em Disco
            </button>
            
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>

          {/* Cache Categories */}
          {cacheStats?.categories && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Categorias do Cache</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(cacheStats.categories).map(([category, stats]: [string, { entries?: number; size?: number; hitRate?: number }]) => (
                  <div key={category} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-800">{category}</h4>
                      <button
                        onClick={() => handleClearCache(category)}
                        className="text-red-500 hover:text-red-700"
                        title={`Limpar categoria ${category}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Entradas: {stats.entries || 0}</p>
                      <p>Tamanho: {formatBytes(stats.size || 0)}</p>
                      <p>Taxa de Acerto: {formatPercentage(stats.hitRate || 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rate Limit Tab */}
      {activeTab === 'rateLimit' && (
        <div className="space-y-6">
          {/* Rate Limit Stats */}
          {rateLimitStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Total de Requisições</p>
                    <p className="text-2xl font-bold text-blue-800">{rateLimitStats.totalRequests}</p>
                  </div>
                  <Activity className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-medium">Usuários Ativos</p>
                    <p className="text-2xl font-bold text-green-800">{rateLimitStats.activeUsers}</p>
                  </div>
                  <Users className="w-8 h-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Modelos Ativos</p>
                    <p className="text-2xl font-bold text-purple-800">{rateLimitStats.activeModels}</p>
                  </div>
                  <Database className="w-8 h-8 text-purple-500" />
                </div>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600 font-medium">Carga do Sistema</p>
                    <p className="text-2xl font-bold text-orange-800">{formatPercentage(rateLimitStats.systemLoad)}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                </div>
              </div>
            </div>
          )}

          {/* Rate Limit Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleToggleAdaptive}
              disabled={loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white disabled:opacity-50 ${
                rateLimitStats?.adaptiveMode 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-gray-500 hover:bg-gray-600'
              }`}
            >
              <Shield className="w-4 h-4" />
              {rateLimitStats?.adaptiveMode ? 'Desativar' : 'Ativar'} Modo Adaptativo
            </button>
            
            <button
              onClick={handleCleanupRateLimit}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
            >
              <Clock className="w-4 h-4" />
              Limpar Contadores Expirados
            </button>
            
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>

          {/* Rate Limit Config */}
          {rateLimitConfig && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Configurações do Rate Limiter</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-700">Modo Adaptativo:</p>
                    <p className={rateLimitConfig.adaptiveMode ? 'text-green-600' : 'text-red-600'}>
                      {rateLimitConfig.adaptiveMode ? 'Ativado' : 'Desativado'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Limite de Carga:</p>
                    <p className="text-gray-600">{formatPercentage(rateLimitConfig.loadThreshold)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Janela de Tempo:</p>
                    <p className="text-gray-600">{rateLimitConfig.windowMs / 1000}s</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Limite Padrão:</p>
                    <p className="text-gray-600">{rateLimitConfig.defaultLimits?.requests || 'N/A'} req/min</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SystemPanel;
import React from 'react';
import {
  BarChart3,
  RefreshCw,
  Download,
  Wifi
} from 'lucide-react';
import { ConnectionStatus } from '../ConnectionStatus';

interface AnalyticsHeaderProps {
  isRealTime: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onExport: () => void;
  onToggleRealTime: () => void;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
  isRealTime,
  isRefreshing,
  onRefresh,
  onExport,
  onToggleRealTime
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 sm:mb-8 gap-4 lg:gap-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
            <BarChart3 className="w-6 sm:w-8 h-6 sm:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Monitoramento em tempo real do sistema</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionStatus size="sm" showText={false} />
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full">
            <div className={`w-2 h-2 rounded-full ${isRealTime ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-xs font-medium text-green-700">
              {isRealTime ? 'Tempo Real' : 'Pausado'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Atualizar dados"
          aria-disabled={isRefreshing}
          className="group flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/80 backdrop-blur-sm text-gray-700 rounded-xl shadow-lg border border-white/20 hover:bg-white hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-300'}`} />
          <span className="text-sm font-medium hidden sm:inline">Atualizar</span>
        </button>
        
        <button
          onClick={onExport}
          aria-label="Exportar dados"
          className="group flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/80 backdrop-blur-sm text-gray-700 rounded-xl shadow-lg border border-white/20 hover:bg-white hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-500/20 focus:ring-offset-2"
        >
          <Download className="w-4 h-4 group-hover:translate-y-1 transition-transform duration-200" />
          <span className="text-sm font-medium hidden sm:inline">Exportar</span>
        </button>
        
        <button
          onClick={onToggleRealTime}
          aria-label={`${isRealTime ? 'Pausar' : 'Ativar'} tempo real`}
          aria-pressed={isRealTime}
          className={`group flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl shadow-lg border transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-offset-2 ${
            isRealTime 
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white border-green-400 hover:from-green-600 hover:to-green-700 focus:ring-green-500/20' 
              : 'bg-white/80 backdrop-blur-sm text-gray-700 border-white/20 hover:bg-white hover:shadow-xl focus:ring-gray-500/20'
          } ${isRealTime ? 'animate-pulse' : ''}`}
        >
          <Wifi className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">
            {isRealTime ? 'Pausar' : 'Ativar'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default AnalyticsHeader;
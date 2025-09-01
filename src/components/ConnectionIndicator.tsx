import React from 'react';
import { Wifi, WifiOff, Signal, AlertTriangle } from 'lucide-react';
import { cn } from '../utils/cn';
import useOnlineStatus from '../hooks/useOnlineStatus';

interface ConnectionIndicatorProps {
  variant?: 'compact' | 'detailed' | 'minimal';
  className?: string;
  showLatency?: boolean;
  showLastChecked?: boolean;
}

const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({
  variant = 'compact',
  className,
  showLatency = false,
  showLastChecked = false
}) => {
  const { isOnline, isChecking, connectionQuality, latency, lastChecked } = useOnlineStatus();

  const getStatusColor = () => {
    if (isChecking) return 'text-yellow-500';
    if (!isOnline) return 'text-red-500';
    
    switch (connectionQuality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-green-400';
      case 'poor': return 'text-orange-500';
      default: return 'text-red-500';
    }
  };

  const getStatusText = () => {
    if (isChecking) return 'Verificando...';
    if (!isOnline) return 'Offline';
    return 'Online';
  };

  const getQualityText = () => {
    switch (connectionQuality) {
      case 'excellent': return 'Excelente';
      case 'good': return 'Boa';
      case 'poor': return 'Ruim';
      default: return 'Offline';
    }
  };

  const getIcon = () => {
    if (isChecking) {
      return <Signal className={cn('animate-pulse', getStatusColor())} />;
    }
    if (!isOnline) {
      return <WifiOff className={getStatusColor()} />;
    }
    return <Wifi className={getStatusColor()} />;
  };

  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center', className)}>
        <div className="w-3 h-3">
          {React.cloneElement(getIcon(), { className: cn('w-3 h-3', getStatusColor()) })}
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-colors',
        isChecking ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
        isOnline 
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        className
      )}>
        <div className="w-3 h-3">
          {React.cloneElement(getIcon(), { className: 'w-3 h-3' })}
        </div>
        <span>{getStatusText()}</span>
        {isOnline && connectionQuality && (
          <span className="opacity-75">({getQualityText()})</span>
        )}
      </div>
    );
  }

  // Detailed variant
  return (
    <div className={cn(
      'p-4 rounded-lg border bg-card transition-colors',
      isOnline ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800',
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4">
            {React.cloneElement(getIcon(), { className: 'w-4 h-4' })}
          </div>
          <span className={cn(
            'text-sm font-medium',
            isChecking ? 'text-yellow-700 dark:text-yellow-400' :
            isOnline ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
          )}>
            {getStatusText()}
          </span>
          {isOnline && connectionQuality && (
            <span className={cn(
              'text-xs px-2 py-1 rounded-full',
              connectionQuality === 'excellent' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
              connectionQuality === 'good' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
              connectionQuality === 'poor' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
              'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            )}>
              {getQualityText()}
            </span>
          )}
        </div>
        {!isOnline && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <AlertTriangle className="w-3 h-3" />
            <span>Funcionalidades limitadas</span>
          </div>
        )}
      </div>
      
      {(showLatency || showLastChecked) && isOnline && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {showLatency && latency && (
            <span>Latência: {Math.round(latency)}ms</span>
          )}
          {showLastChecked && lastChecked && (
            <span>Última verificação: {lastChecked.toLocaleTimeString()}</span>
          )}
        </div>
      )}
      
      {!isOnline && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-300">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium mb-1">Sem conexão com a internet</div>
              <div className="text-red-600 dark:text-red-400">
                As funcionalidades de IA requerem conexão online para funcionar corretamente.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionIndicator;
import React, { useState } from 'react';
import { Wifi, WifiOff, Server, ServerOff, AlertTriangle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { useConnectivity } from '../hooks/useConnectivity';
import { cn } from "../utils/cn";
import { ConnectionStatus, LoadingSpinner } from './LoadingStates';
import { SlideIn, FadeIn, HoverAnimation } from './Animations';

interface ConnectivityIndicatorProps {
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export function ConnectivityIndicator({ 
  className, 
  showDetails = false, 
  compact = false 
}: ConnectivityIndicatorProps) {
  const { 
    isOnline, 
    isApiAvailable, 
    isBackendAvailable, 
    lastChecked, 
    error, 
    latency,
    checkConnection 
  } = useConnectivity();

  const getStatusColor = () => {
    if (!isOnline) return 'text-red-500';
    if (!isApiAvailable) return 'text-orange-500';
    if (!isBackendAvailable) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4" />;
    if (!isApiAvailable) return <AlertTriangle className="h-4 w-4" />;
    if (!isBackendAvailable) return <ServerOff className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (!isApiAvailable) return 'Limited Connection';
    if (!isBackendAvailable) return 'Backend Unavailable';
    return 'Connected';
  };

  const getDetailedStatus = () => {
    const statuses = [];
    
    if (isOnline) {
      statuses.push({
        icon: <Wifi className="h-3 w-3" />,
        text: 'Internet',
        status: 'connected',
        color: 'text-green-500'
      });
    } else {
      statuses.push({
        icon: <WifiOff className="h-3 w-3" />,
        text: 'Internet',
        status: 'disconnected',
        color: 'text-red-500'
      });
    }

    if (isApiAvailable) {
      statuses.push({
        icon: <CheckCircle className="h-3 w-3" />,
        text: 'API',
        status: 'available',
        color: 'text-green-500'
      });
    } else {
      statuses.push({
        icon: <AlertTriangle className="h-3 w-3" />,
        text: 'API',
        status: 'unavailable',
        color: 'text-orange-500'
      });
    }

    if (isBackendAvailable) {
      statuses.push({
        icon: <Server className="h-3 w-3" />,
        text: 'Backend',
        status: 'available',
        color: 'text-green-500'
      });
    } else {
      statuses.push({
        icon: <ServerOff className="h-3 w-3" />,
        text: 'Backend',
        status: 'unavailable',
        color: 'text-yellow-500'
      });
    }

    return statuses;
  };

  const formatLatency = (ms?: number) => {
    if (!ms) return '';
    if (ms < 100) return `${ms}ms`;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getLatencyColor = (ms?: number) => {
    if (!ms) return 'text-gray-500';
    if (ms < 100) return 'text-green-500';
    if (ms < 500) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (compact) {
    return (
      <div 
        className={cn(
          'flex items-center gap-1 text-xs',
          getStatusColor(),
          className
        )}
        title={`${getStatusText()}${latency ? ` (${formatLatency(latency)})` : ''}`}
      >
        {getStatusIcon()}
        {latency && (
          <span className={cn('text-xs', getLatencyColor(latency))}>
            {formatLatency(latency)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex items-center gap-1', getStatusColor())}>
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
      </div>
      
      {showDetails && (
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {getDetailedStatus().map((status, index) => (
            <div key={index} className={cn('flex items-center gap-1', status.color)}>
              {status.icon}
              <span>{status.text}</span>
            </div>
          ))}
          
          {latency && (
            <div className={cn('flex items-center gap-1', getLatencyColor(latency))}>
              <Clock className="h-3 w-3" />
              <span>{formatLatency(latency)}</span>
            </div>
          )}
          
          <div className="flex items-center gap-1 text-gray-400">
            <span>Last: {lastChecked.toLocaleTimeString()}</span>
          </div>
        </div>
      )}
      
      {error && (
        <div className="flex items-center gap-1 text-red-500 text-xs">
          <AlertTriangle className="h-3 w-3" />
          <span title={error}>Error</span>
        </div>
      )}
      
      <button
        onClick={() => checkConnection()}
        className="text-xs text-blue-500 hover:text-blue-700 underline"
        title="Check connection now"
      >
        Refresh
      </button>
    </div>
  );
}

// Status badge component for use in headers/navigation
export function ConnectivityBadge({ className }: { className?: string }) {
  const { isOnline, isApiAvailable, isBackendAvailable } = useConnectivity();
  
  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        color: 'bg-red-500',
        text: 'Offline',
        pulse: false
      };
    }
    if (!isApiAvailable) {
      return {
        color: 'bg-orange-500',
        text: 'Limited',
        pulse: true
      };
    }
    if (!isBackendAvailable) {
      return {
        color: 'bg-yellow-500',
        text: 'Partial',
        pulse: true
      };
    }
    return {
      color: 'bg-green-500',
      text: 'Online',
      pulse: false
    };
  };

  const status = getStatusInfo();

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        <div 
          className={cn(
            'h-2 w-2 rounded-full',
            status.color,
            status.pulse && 'animate-pulse'
          )}
        />
        {status.pulse && (
          <div 
            className={cn(
              'absolute inset-0 h-2 w-2 rounded-full animate-ping',
              status.color,
              'opacity-75'
            )}
          />
        )}
      </div>
      <span className="text-xs font-medium text-gray-600">
        {status.text}
      </span>
    </div>
  );
}

// Componente simplificado para barra de status
export const ConnectivityStatusBar: React.FC<{ className?: string }> = ({ className = '' }) => {
  const connectivity = useConnectivity();
  
  if (connectivity.isOnline && connectivity.apiAvailable) {
    return null; // Não mostrar quando tudo está funcionando
  }
  
  return (
    <SlideIn direction="down">
      <div className={`
        w-full py-2 px-4 text-center text-sm font-medium
        ${!connectivity.isOnline 
          ? 'bg-red-100 text-red-800 border-red-200' 
          : 'bg-yellow-100 text-yellow-800 border-yellow-200'
        }
        border-b ${className}
      `}>
        <div className="flex items-center justify-center gap-2">
          {!connectivity.isOnline ? (
            <ConnectionStatus 
              isOnline={false} 
              isConnecting={false}
              className="text-red-800"
            />
          ) : (
            <>
              <AlertTriangle className="w-4 h-4" />
              <span>API indisponível</span>
            </>
          )}
        </div>
      </div>
    </SlideIn>
  );
};

// Toast notification component for connectivity changes
export function ConnectivityToast() {
  const { isOnline, isBackendAvailable, error } = useConnectivity();
  const [lastStatus, setLastStatus] = React.useState({ isOnline, isBackendAvailable });
  const [showToast, setShowToast] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [toastType, setToastType] = React.useState<'success' | 'warning' | 'error'>('success');

  React.useEffect(() => {
    // Check for connectivity changes
    if (lastStatus.isOnline !== isOnline || lastStatus.isBackendAvailable !== isBackendAvailable) {
      let message = '';
      let type: 'success' | 'warning' | 'error' = 'success';

      if (!isOnline && lastStatus.isOnline) {
        message = 'Connection lost - You are now offline';
        type = 'error';
      } else if (isOnline && !lastStatus.isOnline) {
        message = 'Connection restored - You are back online';
        type = 'success';
      } else if (!isBackendAvailable && lastStatus.isBackendAvailable) {
        message = 'Backend connection lost - Some features may be unavailable';
        type = 'warning';
      } else if (isBackendAvailable && !lastStatus.isBackendAvailable) {
        message = 'Backend connection restored - All features are available';
        type = 'success';
      }

      if (message) {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);
        
        // Auto-hide toast after 5 seconds
        setTimeout(() => setShowToast(false), 5000);
      }

      setLastStatus({ isOnline, isBackendAvailable });
    }
  }, [isOnline, isBackendAvailable, lastStatus]);

  React.useEffect(() => {
    if (error && error !== 'Browser is offline') {
      setToastMessage(`Connection error: ${error}`);
      setToastType('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 7000);
    }
  }, [error]);

  if (!showToast) return null;

  const getToastStyles = () => {
    switch (toastType) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getIcon = () => {
    switch (toastType) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      default:
        return <Wifi className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
      <div className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg max-w-sm',
        getToastStyles()
      )}>
        {getIcon()}
        <span className="text-sm font-medium flex-1">{toastMessage}</span>
        <button
          onClick={() => setShowToast(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>
    </div>
  );
}
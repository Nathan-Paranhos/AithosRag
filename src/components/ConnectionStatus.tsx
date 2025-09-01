import React from 'react';
import { Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface ConnectionStatusProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  className = '', 
  showText = true, 
  size = 'md' 
}) => {
  const { isOnline, isChecking, lastChecked, retryCount } = useOnlineStatus();

  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-5 h-5 text-sm',
    lg: 'w-6 h-6 text-base'
  };

  const getStatusConfig = () => {
    if (isChecking) {
      return {
        icon: AlertTriangle,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-300',
        text: 'Verificando...',
        pulse: true
      };
    }

    if (isOnline) {
      return {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-300',
        text: 'Online',
        pulse: false
      };
    }

    return {
      icon: WifiOff,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-300',
      text: retryCount > 0 ? `Offline (${retryCount} tentativas)` : 'Offline',
      pulse: true
    };
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  const formatLastChecked = () => {
    if (!lastChecked) return '';
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastChecked.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s atrás`;
    if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
    return `${Math.floor(diff / 3600)}h atrás`;
  };

  return (
    <div 
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300 ${
        config.bgColor
      } ${config.borderColor} ${className}`}
      title={`Status: ${config.text}${lastChecked ? ` - Última verificação: ${formatLastChecked()}` : ''}`}
    >
      <div className="relative">
        <IconComponent 
          className={`${sizeClasses[size]} ${config.color} transition-colors duration-300`} 
        />
        {config.pulse && (
          <div className={`absolute inset-0 ${config.color} opacity-30 animate-ping rounded-full`} />
        )}
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <span className={`font-medium ${config.color} ${sizeClasses[size]}`}>
            {config.text}
          </span>
          {lastChecked && size !== 'sm' && (
            <span className="text-xs text-gray-500">
              {formatLastChecked()}
            </span>
          )}
        </div>
      )}
      
      {/* Status indicator dot */}
      <div className="relative">
        <div 
          className={`w-2 h-2 rounded-full transition-colors duration-300 ${
            isOnline ? 'bg-green-500' : 'bg-red-500'
          }`} 
        />
        {(isChecking || (!isOnline && retryCount > 0)) && (
          <div className={`absolute inset-0 w-2 h-2 rounded-full animate-pulse ${
            isChecking ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;
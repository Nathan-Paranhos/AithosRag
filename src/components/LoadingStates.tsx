import React from 'react';
import { Loader2, Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';

// Loading spinner with different sizes and variants
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'primary',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const variantClasses = {
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600'
  };

  return (
    <Loader2 
      className={`animate-spin ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    />
  );
};

// Loading button with spinner
interface LoadingButtonProps {
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  disabled = false,
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = ''
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 disabled:bg-gray-300',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400'
  };

  const isDisabled = disabled || loading;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className} ${
        isDisabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
      }`}
    >
      {loading && (
        <LoadingSpinner 
          size={size === 'lg' ? 'md' : 'sm'} 
          variant="secondary" 
          className="mr-2" 
        />
      )}
      {children}
    </button>
  );
};

// Connection status indicator
interface ConnectionStatusProps {
  isOnline: boolean;
  isConnecting?: boolean;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isOnline,
  isConnecting = false,
  className = ''
}) => {
  if (isConnecting) {
    return (
      <div className={`flex items-center space-x-2 text-yellow-600 ${className}`}>
        <LoadingSpinner size="sm" variant="warning" />
        <span className="text-sm font-medium">Conectando...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${isOnline ? 'text-green-600' : 'text-red-600'} ${className}`}>
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          <span className="text-sm font-medium">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Offline</span>
        </>
      )}
    </div>
  );
};

// Progress bar component
interface ProgressBarProps {
  progress: number; // 0-100
  variant?: 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  variant = 'primary',
  size = 'md',
  showLabel = false,
  animated = true,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const variantClasses = {
    primary: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600'
  };

  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">Progresso</span>
          <span className="text-sm text-gray-500">{Math.round(clampedProgress)}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${sizeClasses[size]} rounded-full transition-all duration-300 ease-out ${
            variantClasses[variant]
          } ${animated ? 'animate-pulse' : ''}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

// Loading overlay
interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  variant?: 'light' | 'dark';
  blur?: boolean;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = 'Carregando...',
  variant = 'light',
  blur = true,
  className = ''
}) => {
  if (!isVisible) return null;

  const variantClasses = {
    light: 'bg-white/80 text-gray-900',
    dark: 'bg-gray-900/80 text-white'
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        variantClasses[variant]
      } ${blur ? 'backdrop-blur-sm' : ''} ${className}`}
    >
      <div className="flex flex-col items-center space-y-4 p-6 rounded-lg bg-white/90 shadow-lg">
        <LoadingSpinner size="lg" variant="primary" />
        <p className="text-lg font-medium text-gray-900">{message}</p>
      </div>
    </div>
  );
};

// Status badge
interface StatusBadgeProps {
  status: 'loading' | 'success' | 'error' | 'warning' | 'info';
  message: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  message,
  className = ''
}) => {
  const statusConfig = {
    loading: {
      icon: LoadingSpinner,
      classes: 'bg-blue-50 text-blue-700 border-blue-200',
      iconProps: { size: 'sm' as const, variant: 'primary' as const }
    },
    success: {
      icon: CheckCircle,
      classes: 'bg-green-50 text-green-700 border-green-200',
      iconProps: { className: 'h-4 w-4' }
    },
    error: {
      icon: AlertCircle,
      classes: 'bg-red-50 text-red-700 border-red-200',
      iconProps: { className: 'h-4 w-4' }
    },
    warning: {
      icon: AlertCircle,
      classes: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      iconProps: { className: 'h-4 w-4' }
    },
    info: {
      icon: AlertCircle,
      classes: 'bg-blue-50 text-blue-700 border-blue-200',
      iconProps: { className: 'h-4 w-4' }
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium ${config.classes} ${className}`}>
      <Icon {...config.iconProps} />
      <span>{message}</span>
    </div>
  );
};

// Skeleton loader for text
interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 1,
  className = ''
}) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`bg-gray-200 rounded h-4 mb-2 ${
            index === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
};

// Skeleton loader for cards
interface SkeletonCardProps {
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  className = ''
}) => {
  return (
    <div className={`animate-pulse p-4 border border-gray-200 rounded-lg ${className}`}>
      <div className="flex items-center space-x-4">
        <div className="bg-gray-200 rounded-full h-12 w-12" />
        <div className="flex-1 space-y-2">
          <div className="bg-gray-200 rounded h-4 w-3/4" />
          <div className="bg-gray-200 rounded h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="bg-gray-200 rounded h-3 w-full" />
        <div className="bg-gray-200 rounded h-3 w-5/6" />
        <div className="bg-gray-200 rounded h-3 w-4/6" />
      </div>
    </div>
  );
};

// Loading dots animation
interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
  className?: string;
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  size = 'md',
  variant = 'primary',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-1 w-1',
    md: 'h-2 w-2',
    lg: 'h-3 w-3'
  };

  const variantClasses = {
    primary: 'bg-blue-600',
    secondary: 'bg-gray-600'
  };

  return (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={`${sizeClasses[size]} ${variantClasses[variant]} rounded-full animate-bounce`}
          style={{
            animationDelay: `${index * 0.1}s`,
            animationDuration: '0.6s'
          }}
        />
      ))}
    </div>
  );
};

export default {
  LoadingSpinner,
  LoadingButton,
  ConnectionStatus,
  ProgressBar,
  LoadingOverlay,
  StatusBadge,
  SkeletonText,
  SkeletonCard,
  LoadingDots
};
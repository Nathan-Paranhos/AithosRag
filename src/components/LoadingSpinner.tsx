import React, { memo } from 'react';
import { Brain, Cpu } from '../utils/icons.tsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ai' | 'processing' | 'minimal';
  message?: string;
  progress?: number;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = memo(({
  size = 'md',
  variant = 'default',
  message,
  progress,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const containerSizeClasses = {
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6'
  };

  if (variant === 'minimal') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <div className={`${sizeClasses[size]} border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin`} />
      </div>
    );
  }

  if (variant === 'ai') {
    return (
      <div className={`flex flex-col items-center justify-center ${containerSizeClasses[size]} ${className}`}>
        <div className="relative">
          {/* Círculo externo */}
          <div className={`${sizeClasses[size]} border-4 border-purple-200 rounded-full animate-spin`} />
          
          {/* Círculo interno com ícone */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Brain className={`${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-4 h-4' : 'w-6 h-6'} text-purple-600 animate-pulse`} />
          </div>
          
          {/* Partículas flutuantes */}
          <div className="absolute -inset-2">
            <div className="absolute top-0 left-1/2 w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="absolute top-1/2 right-0 w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="absolute bottom-0 left-1/2 w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
            <div className="absolute top-1/2 left-0 w-1 h-1 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.6s' }} />
          </div>
        </div>
        
        {message && (
          <div className="mt-3 text-center">
            <p className="text-sm text-gray-600 animate-pulse">{message}</p>
            {progress !== undefined && (
              <div className="mt-2 w-32 bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-purple-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'processing') {
    return (
      <div className={`flex flex-col items-center justify-center ${containerSizeClasses[size]} ${className}`}>
        <div className="relative">
          {/* Múltiplos círculos concêntricos */}
          <div className={`${sizeClasses[size]} border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin`} />
          <div className={`absolute inset-1 ${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-6 h-6' : 'w-8 h-8'} border-2 border-green-200 border-b-green-500 rounded-full animate-spin`} style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
          
          {/* Ícone central */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Cpu className={`${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'} text-blue-600 animate-pulse`} />
          </div>
        </div>
        
        {message && (
          <div className="mt-3 text-center">
            <p className="text-sm text-gray-600">{message}</p>
            <div className="flex items-center justify-center mt-1 space-x-1">
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Variant padrão
  return (
    <div className={`flex flex-col items-center justify-center ${containerSizeClasses[size]} ${className}`}>
      <div className="relative">
        <div className={`${sizeClasses[size]} border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin`} />
        
        {/* Efeito de brilho */}
        <div className={`absolute inset-0 ${sizeClasses[size]} border-4 border-transparent border-t-blue-400 rounded-full animate-spin opacity-50`} style={{ animationDuration: '1.5s' }} />
      </div>
      
      {message && (
        <p className="mt-3 text-sm text-gray-600 text-center animate-pulse">{message}</p>
      )}
      
      {progress !== undefined && (
        <div className="mt-2 w-32 bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

export default LoadingSpinner;

// Hook para loading states
export const useLoadingState = (initialState = false) => {
  const [isLoading, setIsLoading] = React.useState(initialState);
  const [progress, setProgress] = React.useState(0);
  const [message, setMessage] = React.useState('');

  const startLoading = React.useCallback((msg?: string) => {
    setIsLoading(true);
    setProgress(0);
    if (msg) setMessage(msg);
  }, []);

  const updateProgress = React.useCallback((value: number, msg?: string) => {
    setProgress(value);
    if (msg) setMessage(msg);
  }, []);

  const stopLoading = React.useCallback(() => {
    setIsLoading(false);
    setProgress(0);
    setMessage('');
  }, []);

  return {
    isLoading,
    progress,
    message,
    startLoading,
    updateProgress,
    stopLoading
  };
};

// Componente de Loading para páginas inteiras
export const PageLoader: React.FC<{ message?: string }> = memo(({ message = 'Carregando...' }) => {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full mx-4">
        <LoadingSpinner 
          size="lg" 
          variant="ai" 
          message={message}
          className="w-full"
        />
      </div>
    </div>
  );
});

PageLoader.displayName = 'PageLoader';

// Componente de Loading inline
export const InlineLoader: React.FC<{ message?: string; className?: string }> = memo(({ message, className }) => {
  return (
    <div className={`flex items-center justify-center py-4 ${className || ''}`}>
      <LoadingSpinner 
        size="sm" 
        variant="minimal" 
        className="mr-2"
      />
      {message && <span className="text-sm text-gray-600">{message}</span>}
    </div>
  );
});

InlineLoader.displayName = 'InlineLoader';
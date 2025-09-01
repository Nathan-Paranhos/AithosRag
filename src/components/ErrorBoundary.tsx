import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Wifi, WifiOff } from 'lucide-react';
import Logger, { logger } from '../utils/logger';
import { useConnectivity } from '../hooks/useConnectivity';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'critical';
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
}

class ErrorBoundaryClass extends Component<Props, State> {
  private logger: Logger;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0
    };
    this.logger = logger;
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component' } = this.props;
    
    // Log do erro
    this.logger.componentError(
      this.constructor.name,
      error,
      {
        errorInfo,
        level,
        props: this.props,
        timestamp: new Date().toISOString()
      }
    );

    // Callback personalizado
    if (onError) {
      onError(error, errorInfo);
    }

    // Atualiza estado com informações do erro
    this.setState({
      errorInfo,
      error
    });

    // Reporta erro crítico
    if (level === 'critical') {
      this.logger.critical('Critical component error', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  handleRetry = () => {
    const { retryCount } = this.state;
    
    if (retryCount < this.maxRetries) {
      this.logger.info('Retrying component render', {
        errorId: this.state.errorId,
        retryCount: retryCount + 1
      });
      
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1
      });
    }
  };

  handleReload = () => {
    this.logger.info('Reloading page due to error', {
      errorId: this.state.errorId
    });
    window.location.reload();
  };

  handleGoHome = () => {
    this.logger.info('Navigating to home due to error', {
      errorId: this.state.errorId
    });
    window.location.href = '/';
  };

  render() {
    const { hasError, error, errorInfo, errorId, retryCount } = this.state;
    const { children, fallback, level = 'component', showDetails = false } = this.props;

    if (hasError && error) {
      // Fallback customizado
      if (fallback) {
        return fallback;
      }

      // Fallback baseado no nível
      return (
        <ErrorFallback
          error={error}
          errorInfo={errorInfo}
          errorId={errorId}
          level={level}
          retryCount={retryCount}
          maxRetries={this.maxRetries}
          showDetails={showDetails}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          onGoHome={this.handleGoHome}
        />
      );
    }

    return children;
  }
}

// Componente de fallback com conectividade
interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  errorId: string;
  level: 'page' | 'component' | 'critical';
  retryCount: number;
  maxRetries: number;
  showDetails: boolean;
  onRetry: () => void;
  onReload: () => void;
  onGoHome: () => void;
}

function ErrorFallback({
  error,
  errorInfo,
  errorId,
  level,
  retryCount,
  maxRetries,
  showDetails,
  onRetry,
  onReload,
  onGoHome
}: ErrorFallbackProps) {
  const { isOnline, isApiAvailable } = useConnectivity();
  const [detailsVisible, setDetailsVisible] = React.useState(showDetails);

  const getErrorSeverity = () => {
    switch (level) {
      case 'critical':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: AlertTriangle,
          title: 'Critical Error'
        };
      case 'page':
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          icon: AlertTriangle,
          title: 'Page Error'
        };
      default:
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          icon: Bug,
          title: 'Component Error'
        };
    }
  };

  const severity = getErrorSeverity();
  const Icon = severity.icon;
  const canRetry = retryCount < maxRetries;

  return (
    <div className={`min-h-[200px] flex items-center justify-center p-4 ${level === 'critical' ? 'min-h-screen' : ''}`}>
      <div className={`max-w-2xl w-full ${severity.bgColor} ${severity.borderColor} border rounded-lg p-6 shadow-lg`}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Icon className={`h-6 w-6 ${severity.color}`} />
          <h2 className={`text-xl font-semibold ${severity.color}`}>
            {severity.title}
          </h2>
          <div className="ml-auto flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" title="Online" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" title="Offline" />
            )}
            <span className={`text-xs px-2 py-1 rounded ${
              isApiAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              API {isApiAvailable ? 'Available' : 'Unavailable'}
            </span>
          </div>
        </div>

        {/* Error Message */}
        <div className="mb-4">
          <p className="text-gray-700 mb-2">
            Something went wrong while rendering this {level}.
          </p>
          <p className="text-sm text-gray-600">
            Error ID: <code className="bg-gray-100 px-1 rounded">{errorId}</code>
          </p>
          {retryCount > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              Retry attempts: {retryCount}/{maxRetries}
            </p>
          )}
        </div>

        {/* Connection Status */}
        {!isOnline && (
          <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded">
            <p className="text-red-700 text-sm">
              ⚠️ You're currently offline. This error might be related to connectivity issues.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-4">
          {canRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Retry ({maxRetries - retryCount} left)
            </button>
          )}
          
          {level !== 'critical' && (
            <button
              onClick={onGoHome}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              <Home className="h-4 w-4" />
              Go Home
            </button>
          )}
          
          <button
            onClick={onReload}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Reload Page
          </button>
        </div>

        {/* Error Details Toggle */}
        <div className="border-t pt-4">
          <button
            onClick={() => setDetailsVisible(!detailsVisible)}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            {detailsVisible ? 'Hide' : 'Show'} Technical Details
          </button>
          
          {detailsVisible && (
            <div className="mt-3 space-y-3">
              <div>
                <h4 className="font-medium text-gray-700 mb-1">Error Message:</h4>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto text-red-600">
                  {error.message}
                </pre>
              </div>
              
              {error.stack && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">Stack Trace:</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                    {error.stack}
                  </pre>
                </div>
              )}
              
              {errorInfo?.componentStack && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">Component Stack:</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook para usar Error Boundary programaticamente
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);
  
  const resetError = React.useCallback(() => {
    setError(null);
  }, []);
  
  const captureError = React.useCallback((error: Error, context?: any) => {
    logger.error(
      'Manual error capture',
      'ErrorHandler',
      {
        error: error.message,
        stack: error.stack,
        context
      },
      error
    );
    setError(error);
  }, []);
  
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);
  
  return { captureError, resetError };
}

// Componentes especializados
export function PageErrorBoundary({ children, ...props }: Omit<Props, 'level'>) {
  return (
    <ErrorBoundaryClass level="page" {...props}>
      {children}
    </ErrorBoundaryClass>
  );
}

export function ComponentErrorBoundary({ children, ...props }: Omit<Props, 'level'>) {
  return (
    <ErrorBoundaryClass level="component" {...props}>
      {children}
    </ErrorBoundaryClass>
  );
}

export function CriticalErrorBoundary({ children, ...props }: Omit<Props, 'level'>) {
  return (
    <ErrorBoundaryClass level="critical" {...props}>
      {children}
    </ErrorBoundaryClass>
  );
}

// HOC para adicionar Error Boundary automaticamente
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundaryClass {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundaryClass>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

export default ErrorBoundaryClass;
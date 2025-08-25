import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Send } from 'lucide-react';
import { performanceMonitor, memoryManager } from '../utils/performanceOptimizations';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  autoRecover?: boolean;
  maxRetries?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRecovering: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private errorReportSent = false;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log do erro
    this.logError(error, errorInfo);

    // Callback personalizado
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-recuperação
    if (this.props.autoRecover && this.state.retryCount < (this.props.maxRetries || 3)) {
      this.scheduleRetry();
    }

    // Limpeza de memória
    memoryManager.cleanup();
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.state.retryCount
    };

    // Log local
    console.error('ErrorBoundary caught an error:', errorData);

    // Registrar no performance monitor
    performanceMonitor.recordApiCall(performance.now(), false);

    // Enviar relatório de erro (apenas uma vez por erro)
    if (!this.errorReportSent) {
      this.sendErrorReport(errorData);
      this.errorReportSent = true;
    }
  };

  private sendErrorReport = async (errorData: { error: Error; errorInfo: React.ErrorInfo; timestamp: string; url: string; userAgent: string }) => {
    try {
      // Em produção, enviar para serviço de monitoramento
      // await fetch('/api/error-report', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorData)
      // });
      
      console.log('Error report would be sent:', errorData);
    } catch (reportError) {
      console.error('Failed to send error report:', reportError);
    }
  };

  private scheduleRetry = () => {
    this.setState({ isRecovering: true });
    
    this.retryTimeoutId = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
        isRecovering: false
      }));
      this.errorReportSent = false;
    }, 2000 + (this.state.retryCount * 1000)); // Backoff exponencial
  };

  private handleRetry = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
    this.scheduleRetry();
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError) {
      // Fallback customizado
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI de erro padrão
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full">
            {/* Ícone e título */}
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Oops! Algo deu errado
              </h1>
              <p className="text-gray-600">
                Encontramos um erro inesperado. Não se preocupe, estamos trabalhando para resolver.
              </p>
            </div>

            {/* Status de recuperação */}
            {this.state.isRecovering && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin mr-3" />
                  <div>
                    <p className="text-blue-800 font-medium">Tentando recuperar...</p>
                    <p className="text-blue-600 text-sm">Tentativa {this.state.retryCount + 1} de {this.props.maxRetries || 3}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Detalhes do erro (se habilitado) */}
            {this.props.showDetails && this.state.error && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <details className="cursor-pointer">
                  <summary className="flex items-center text-gray-700 font-medium mb-2">
                    <Bug className="w-4 h-4 mr-2" />
                    Detalhes técnicos
                  </summary>
                  <div className="text-sm text-gray-600 space-y-2">
                    <div>
                      <strong>Erro:</strong> {this.state.error.message}
                    </div>
                    {this.state.error.stack && (
                      <div>
                        <strong>Stack:</strong>
                        <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            )}

            {/* Ações */}
            <div className="space-y-3">
              <div className="flex space-x-3">
                <button
                  onClick={this.handleRetry}
                  disabled={this.state.isRecovering}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${this.state.isRecovering ? 'animate-spin' : ''}`} />
                  {this.state.isRecovering ? 'Recuperando...' : 'Tentar Novamente'}
                </button>
                
                <button
                  onClick={this.handleReload}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recarregar
                </button>
              </div>
              
              <button
                onClick={this.handleGoHome}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                <Home className="w-4 h-4 mr-2" />
                Voltar ao Início
              </button>
            </div>

            {/* Informações adicionais */}
            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500 mb-3">
                Se o problema persistir, entre em contato conosco.
              </p>
              <button
                onClick={() => {
                  const subject = encodeURIComponent('Erro na aplicação Aithos RAG');
                  const body = encodeURIComponent(
                    `Detalhes do erro:\n\n` +
                    `Mensagem: ${this.state.error?.message || 'N/A'}\n` +
                    `Timestamp: ${new Date().toISOString()}\n` +
                    `URL: ${window.location.href}\n` +
                    `User Agent: ${navigator.userAgent}`
                  );
                  window.open(`mailto:support@aithos.com?subject=${subject}&body=${body}`);
                }}
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center justify-center transition-colors"
              >
                <Send className="w-4 h-4 mr-1" />
                Reportar Erro
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// Hook para capturar erros em componentes funcionais
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);
    
    // Registrar no performance monitor
    performanceMonitor.recordApiCall(performance.now(), false);
    
    // Em produção, enviar para serviço de monitoramento
    // sendErrorReport({ error, errorInfo });
  }, []);

  return { handleError };
};

// Componente de erro simples para casos específicos
export const SimpleErrorFallback: React.FC<{ 
  error?: Error; 
  resetError?: () => void;
  message?: string;
}> = ({ error, resetError, message }) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
      <div className="flex items-center">
        <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
        <div className="flex-1">
          <h3 className="text-red-800 font-medium">
            {message || 'Erro no componente'}
          </h3>
          {error && (
            <p className="text-red-600 text-sm mt-1">
              {error.message}
            </p>
          )}
        </div>
        {resetError && (
          <button
            onClick={resetError}
            className="ml-3 text-red-600 hover:text-red-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { Bot, MessageSquare, Zap } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { ChatInterface } from '../components/ChatInterface';
import { useConnectivity } from '../utils/connectivity';
import { ConnectivityIndicator } from '../components/ConnectivityIndicator';
import { LoadingSpinner, LoadingButton, SkeletonText, LoadingDots } from '../components/LoadingStates';
import { FadeIn, SlideIn, StaggerContainer, StaggerItem } from '../components/Animations';

const ChatPage: React.FC = () => {
  const { isOnline, isApiAvailable } = useConnectivity();
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                <LoadingSpinner size="sm" />
              </div>
              <div>
                <SkeletonText width="150px" height="20px" />
                <SkeletonText width="120px" height="16px" className="mt-1" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-100px)]">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-gray-300">Inicializando chat...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FadeIn>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Header */}
        <SlideIn direction="down">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  AI Chat
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Converse com nossa IA inteligente
                </p>
              </div>
            </div>
            <ConnectivityIndicator position="static" showDetails={true} />
          </div>
            </div>
          </div>
        </SlideIn>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isOnline || !isApiAvailable ? (
          <Card className="p-8 text-center bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <div className="flex flex-col items-center space-y-4">
              <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/50">
                <MessageSquare className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h2 className="text-xl font-semibold text-yellow-800 dark:text-yellow-200">
                {!isOnline ? 'Sem Conexão com a Internet' : 'API Indisponível'}
              </h2>
              <p className="text-yellow-700 dark:text-yellow-300 max-w-md">
                {!isOnline 
                  ? 'Verifique sua conexão com a internet para usar o chat com IA.'
                  : 'O serviço de IA está temporariamente indisponível. Tente novamente em alguns instantes.'
                }
              </p>
            </div>
          </Card>
        ) : (
          <SlideIn direction="up">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Chat Interface */}
            <div className="lg:col-span-3">
              <Card className="h-[calc(100vh-12rem)] bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                <ChatInterface />
              </Card>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Quick Tips */}
              <Card className="p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center space-x-2 mb-4">
                  <Zap className="h-5 w-5 text-blue-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Dicas Rápidas
                  </h3>
                </div>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                      Seja específico
                    </p>
                    <p className="text-blue-700 dark:text-blue-300">
                      Forneça contexto detalhado para respostas mais precisas.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                    <p className="font-medium text-purple-800 dark:text-purple-200 mb-1">
                      Use documentos
                    </p>
                    <p className="text-purple-700 dark:text-purple-300">
                      Referencie documentos carregados para análises mais profundas.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <p className="font-medium text-green-800 dark:text-green-200 mb-1">
                      Perguntas seguidas
                    </p>
                    <p className="text-green-700 dark:text-green-300">
                      Faça perguntas de acompanhamento para aprofundar tópicos.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Status */}
              <Card className="p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Status do Sistema
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Conexão
                    </span>
                    <div className={`flex items-center space-x-2 ${
                      isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        isOnline ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="text-xs font-medium">
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      API
                    </span>
                    <div className={`flex items-center space-x-2 ${
                      isApiAvailable ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        isApiAvailable ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="text-xs font-medium">
                        {isApiAvailable ? 'Disponível' : 'Indisponível'}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            </div>
          </SlideIn>
        )}
        </div>
      </div>
    </FadeIn>
  );
};

export default ChatPage;
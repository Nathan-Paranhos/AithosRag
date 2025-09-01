import React, { useState, useEffect } from 'react';
import { AlertCircle, Wifi, WifiOff, Signal } from 'lucide-react';
import AISubmenu from './AISubmenu';
import OptimizedChat from './OptimizedChat';
import ModelSelector from './ModelSelector';
import ConversationHistory from './ConversationHistory';
import DashboardAnalytics from './DashboardAnalytics';
import { cn } from '../utils/cn';
import useOnlineStatus from '../hooks/useOnlineStatus';

interface AIInterfaceProps {
  className?: string;
  defaultSection?: string;
}

const AIInterface: React.FC<AIInterfaceProps> = ({ 
  className = '',
  defaultSection = 'chat'
}) => {
  const [currentSection, setCurrentSection] = useState(defaultSection);
  const [showOfflineWarning, setShowOfflineWarning] = useState(false);
  const { isOnline, isChecking, connectionQuality, latency, lastChecked } = useOnlineStatus();

  // Verificar conexão e mostrar aviso quando necessário
  useEffect(() => {
    if (!isOnline && ['chat', 'models', 'analytics'].includes(currentSection)) {
      setShowOfflineWarning(true);
      // Auto-hide warning after 5 seconds
      const timer = setTimeout(() => {
        setShowOfflineWarning(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowOfflineWarning(false);
    }
  }, [isOnline, currentSection]);

  const handleNavigate = (section: string) => {
    // Verificar se a seção requer conexão online
    const onlineRequiredSections = ['chat', 'models', 'analytics'];
    
    if (onlineRequiredSections.includes(section) && !isOnline) {
      setShowOfflineWarning(true);
      return;
    }
    
    setCurrentSection(section);
  };

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 'chat':
        return (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Chat com IA
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Converse com modelos de IA avançados em tempo real
              </p>
              {isOnline ? (
                <OptimizedChat 
                  className="w-full"
                  showMetrics={true}
                  enableVoice={true}
                  enableOffline={true}
                  conversationId={`conv_${Date.now()}`}
                />
              ) : (
                <div className="text-center py-8">
                  <WifiOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Conexão com a internet necessária para usar o chat
                  </p>
                </div>
              )}
            </div>
          </div>
        );
        
      case 'models':
        return (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Seleção de Modelos
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Escolha entre diferentes modelos de IA para suas necessidades
              </p>
              {isOnline ? (
                <ModelSelector />
              ) : (
                <div className="text-center py-8">
                  <WifiOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Conexão necessária para carregar modelos disponíveis
                  </p>
                </div>
              )}
            </div>
          </div>
        );
        
      case 'history':
        return (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Histórico de Conversas
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Visualize e gerencie suas conversas anteriores
              </p>
              <ConversationHistory />
            </div>
          </div>
        );
        
      case 'analytics':
        return (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Analytics e Métricas
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Acompanhe performance e estatísticas do sistema
              </p>
              {isOnline ? (
                <DashboardAnalytics />
              ) : (
                <div className="text-center py-8">
                  <WifiOff className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Conexão necessária para carregar métricas em tempo real
                  </p>
                </div>
              )}
            </div>
          </div>
        );
        
      case 'settings':
        return (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Configurações
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Personalize sua experiência com a IA
              </p>
              
              <div className="space-y-6">
                {/* Configurações de Chat */}
                <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Configurações de Chat
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Streaming habilitado
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Receba respostas em tempo real
                        </p>
                      </div>
                      <input 
                        type="checkbox" 
                        defaultChecked 
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Entrada por voz
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Use comandos de voz para interagir
                        </p>
                      </div>
                      <input 
                        type="checkbox" 
                        defaultChecked 
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Configurações de Performance */}
                <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Performance
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Cache habilitado
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Melhora velocidade de resposta
                        </p>
                      </div>
                      <input 
                        type="checkbox" 
                        defaultChecked 
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Modo offline
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Salva conversas localmente
                        </p>
                      </div>
                      <input 
                        type="checkbox" 
                        defaultChecked 
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Branding */}
                <div>
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">Developer by Aithos Tech</span>
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Versão 1.0.0 - Sistema de IA Avançado
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              Seção não encontrada
            </p>
          </div>
        );
    }
  };

  return (
    <div className={cn('w-full max-w-7xl mx-auto p-4 space-y-6', className)}>
      {/* Warning de conexão offline */}
      {showOfflineWarning && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Conexão necessária
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Esta funcionalidade requer conexão com a internet para funcionar corretamente.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Submenu de IA */}
      <div className="w-full max-w-md">
        <AISubmenu 
          currentSection={currentSection}
          onNavigate={handleNavigate}
          className="w-full"
        />
      </div>
      
      {/* Conteúdo da seção atual */}
      <div className="flex-1">
        {renderCurrentSection()}
      </div>
    </div>
  );
};

export default AIInterface;
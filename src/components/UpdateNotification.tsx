import React from 'react';
import { Download, X, Wifi, WifiOff, Signal } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

interface UpdateNotificationProps {
  className?: string;
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({ className = '' }) => {
  const { isOnline } = usePWA();
  const [showNotification, setShowNotification] = React.useState(false);
  
  const applyUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration && registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      });
    }
  };
  
  const dismissNotification = () => setShowNotification(false);

  if (!showNotification) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm animate-slide-in-right">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Download className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900">
              Atualização Disponível
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Uma nova versão do Aithos RAG está disponível.
            </p>
            
            {/* Status de conectividade */}
            <div className="flex items-center mt-2 text-xs text-gray-500">
              {isOnline ? (
                <>
                  <Wifi className="w-3 h-3 mr-1" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 mr-1" />
                  <span>Offline</span>
                </>
              )}
            </div>
          </div>
          
          <button
            onClick={dismissNotification}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fechar notificação"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="mt-4 flex space-x-2">
          <button
            onClick={applyUpdate}
            disabled={!isOnline}
            className="flex-1 bg-blue-600 text-white text-sm px-3 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            <Download className="w-3 h-3 mr-1" />
            {isOnline ? 'Atualizar Agora' : 'Sem Conexão'}
          </button>
          
          <button
            onClick={dismissNotification}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Depois
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente de status de conectividade
export const ConnectivityStatus: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isOnline } = usePWA();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {isOnline ? (
        <div className="flex items-center text-green-600">
          <Wifi className="w-4 h-4 mr-1" />
          <span className="text-sm font-medium">Online</span>
        </div>
      ) : (
        <div className="flex items-center text-red-600">
          <WifiOff className="w-4 h-4 mr-1" />
          <span className="text-sm font-medium">Offline</span>
        </div>
      )}
    </div>
  );
};

// Componente de banner offline
export const OfflineBanner: React.FC = () => {
  const { isOnline } = usePWA();

  if (isOnline) return null;

  return (
    <div className="bg-red-600 text-white px-4 py-2 text-center text-sm">
      <div className="flex items-center justify-center space-x-2">
        <WifiOff className="w-4 h-4" />
        <span>Você está offline. Algumas funcionalidades podem estar limitadas.</span>
      </div>
    </div>
  );
};

export default UpdateNotification;
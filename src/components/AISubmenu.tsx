import React, { useState, useRef, useEffect } from 'react';
import { 
  Brain, 
  MessageSquare, 
  History, 
  Settings, 
  ChevronDown, 
  ChevronUp,
  Cpu,
  Zap,
  Activity,
  Wifi,
  WifiOff,
  Signal
} from 'lucide-react';
import { cn } from '../utils/cn';
import useOnlineStatus from '../hooks/useOnlineStatus';

interface AISubmenuProps {
  className?: string;
  onNavigate?: (section: string) => void;
  currentSection?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  requiresOnline?: boolean;
}

const AISubmenu: React.FC<AISubmenuProps> = ({ 
  className = '', 
  onNavigate,
  currentSection = 'chat'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isOnline, isChecking, connectionQuality } = useOnlineStatus();

  const menuItems: MenuItem[] = [
    {
      id: 'chat',
      label: 'Chat com IA',
      icon: <MessageSquare className="w-4 h-4" />,
      description: 'Converse com modelos de IA avançados',
      requiresOnline: true
    },
    {
      id: 'models',
      label: 'Seleção de Modelos',
      icon: <Cpu className="w-4 h-4" />,
      description: 'Escolha entre diferentes modelos de IA',
      requiresOnline: true
    },
    {
      id: 'history',
      label: 'Histórico',
      icon: <History className="w-4 h-4" />,
      description: 'Visualize conversas anteriores',
      requiresOnline: false
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <Activity className="w-4 h-4" />,
      description: 'Métricas e performance do sistema',
      requiresOnline: true
    },
    {
      id: 'settings',
      label: 'Configurações',
      icon: <Settings className="w-4 h-4" />,
      description: 'Personalize sua experiência',
      requiresOnline: false
    }
  ];

  // Detectar se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = (itemId: string, requiresOnline: boolean = false) => {
    if (requiresOnline && !isOnline) {
      // Mostrar aviso de conexão necessária
      return;
    }
    
    onNavigate?.(itemId);
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const getCurrentItem = () => {
    return menuItems.find(item => item.id === currentSection) || menuItems[0];
  };

  const currentItem = getCurrentItem();

  return (
    <div className={cn('relative', className)} ref={menuRef}>
      {/* Status de Conexão Avançado */}
      <div className="flex items-center gap-2 mb-2">
        <div className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
          isChecking ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
          isOnline 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        )}>
          {isChecking ? (
            <>
              <Signal className="w-3 h-3 animate-pulse" />
              <span>Verificando...</span>
            </>
          ) : isOnline ? (
            <>
              <Wifi className="w-3 h-3" />
              <span>Online</span>
              {connectionQuality && (
                <span className={cn(
                  "ml-1 text-xs",
                  connectionQuality === 'excellent' ? "text-green-600" :
                  connectionQuality === 'good' ? "text-yellow-600" :
                  connectionQuality === 'poor' ? "text-orange-600" :
                  "text-red-600"
                )}>
                  ({connectionQuality === 'excellent' ? 'Excelente' :
                   connectionQuality === 'good' ? 'Boa' :
                   connectionQuality === 'poor' ? 'Ruim' : 'Offline'})
                </span>
              )}
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Offline</span>
            </>
          )}
        </div>
      </div>

      {/* Botão Principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between w-full px-4 py-3 rounded-lg',
          'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700',
          'text-white font-medium transition-all duration-200',
          'shadow-lg hover:shadow-xl transform hover:scale-[1.02]',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          isMobile ? 'text-sm' : 'text-base'
        )}
      >
        <div className="flex items-center gap-3">
          <Brain className={cn('text-white', isMobile ? 'w-5 h-5' : 'w-6 h-6')} />
          <div className="text-left">
            <div className="font-semibold">{currentItem.label}</div>
            {!isMobile && (
              <div className="text-xs text-blue-100 opacity-90">
                {currentItem.description}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-300" />
          {isOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Menu Dropdown */}
      {isOpen && (
        <div className={cn(
          'absolute top-full left-0 right-0 mt-2 z-50',
          'bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700',
          'animate-in slide-in-from-top-2 duration-200'
        )}>
          <div className="p-2">
            {menuItems.map((item) => {
              const isDisabled = item.requiresOnline && !isOnline;
              const isActive = item.id === currentSection;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id, item.requiresOnline)}
                  disabled={isDisabled}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-150',
                    'hover:bg-gray-50 dark:hover:bg-gray-700',
                    isActive && 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800',
                    isDisabled && 'opacity-50 cursor-not-allowed',
                    !isDisabled && 'cursor-pointer'
                  )}
                >
                  <div className={cn(
                    'flex-shrink-0 p-2 rounded-lg',
                    isActive 
                      ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  )}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      'font-medium text-sm',
                      isActive 
                        ? 'text-blue-900 dark:text-blue-100'
                        : 'text-gray-900 dark:text-gray-100'
                    )}>
                      {item.label}
                      {item.requiresOnline && !isOnline && (
                        <span className="ml-2 text-xs text-red-500">(Requer conexão)</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {item.description}
                    </div>
                  </div>
                  {isActive && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Footer com branding */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              <span className="font-medium">Developer by Aithos Tech</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AISubmenu;
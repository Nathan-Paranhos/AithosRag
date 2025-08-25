import React, { useState, useEffect } from 'react';
import { Menu, X, Home, MessageSquare, Settings, User, Bell, Search, Plus, Smartphone } from 'lucide-react';
import { cn } from '../utils/cn';
import PWASettings from './PWASettings';

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
  showSplash?: boolean;
  splashDuration?: number;
  enableBottomNav?: boolean;
  enableTopBar?: boolean;
  enableSidebar?: boolean;
  onNavigate?: (route: string) => void;
  currentRoute?: string;
  user?: {
    name: string;
    avatar?: string;
    email?: string;
  };
  notifications?: number;
  showPWASettings?: boolean;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  route: string;
  badge?: number;
}

const defaultNavItems: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: <Home className="w-5 h-5" />,
    route: '/'
  },
  {
    id: 'chat',
    label: 'Chat',
    icon: <MessageSquare className="w-5 h-5" />,
    route: '/chat'
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: <Bell className="w-5 h-5" />,
    route: '/notifications'
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: <User className="w-5 h-5" />,
    route: '/profile'
  }
];

const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 flex items-center justify-center z-50">
      <div className="text-center">
        {/* App Logo */}
        <div className="w-24 h-24 mx-auto mb-6 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-sm">
          <MessageSquare className="w-12 h-12 text-white" />
        </div>
        
        {/* App Name */}
        <h1 className="text-3xl font-bold text-white mb-2">Aithos RAG</h1>
        <p className="text-white/80 text-lg mb-8">AI-Powered Conversations</p>
        
        {/* Loading Animation */}
        <div className="flex justify-center space-x-2">
          <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

const TopBar: React.FC<{
  onMenuToggle: () => void;
  user?: AppShellProps['user'];
  notifications?: number;
  onSearch?: () => void;
}> = ({ onMenuToggle, user, notifications, onSearch }) => {
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors md:hidden"
        >
          <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        
        <div className="flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 hidden sm:block">
            Aithos RAG
          </h1>
        </div>
      </div>
      
      {/* Center Section - Search */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <button
          onClick={onSearch}
          className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-left text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          <span>Search conversations...</span>
        </button>
      </div>
      
      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Search Button (Mobile) */}
        <button
          onClick={onSearch}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors md:hidden"
        >
          <Search className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        
        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          {notifications && notifications > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {notifications > 99 ? '99+' : notifications}
            </span>
          )}
        </button>
        
        {/* User Avatar */}
        {user && (
          <div className="flex items-center gap-2 ml-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
              {user.name}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};

const Sidebar: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
  currentRoute?: string;
  onNavigate?: (route: string) => void;
}> = ({ isOpen, onClose, navItems, currentRoute, onNavigate }) => {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-50 transform transition-transform duration-300 ease-in-out",
        "md:translate-x-0 md:static md:z-auto",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Aithos RAG
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors md:hidden"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate?.(item.route);
                onClose();
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                currentRoute === item.route
                  ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
          
          <button
            onClick={() => {
              handleNavigate('pwa-settings');
              onClose();
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
              showSettings
                ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            <Smartphone className="w-5 h-5" />
            <span className="font-medium">PWA Settings</span>
          </button>
          
          {isInstallable && (
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleInstallApp}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Smartphone className="w-5 h-5" />
                <span className="font-medium">Install App</span>
              </button>
            </div>
          )}
        </nav>
        
        {/* Quick Actions */}
        <div className="absolute bottom-4 left-4 right-4">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
            <span className="font-medium">New Chat</span>
          </button>
        </div>
      </aside>
    </>
  );
};

const BottomNavigation: React.FC<{
  navItems: NavItem[];
  currentRoute?: string;
  onNavigate?: (route: string) => void;
}> = ({ navItems, currentRoute, onNavigate }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-2 z-40 md:hidden">
      <div className="flex items-center justify-around">
        {navItems.slice(0, 4).map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate?.(item.route)}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-0",
              currentRoute === item.route
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 dark:text-gray-400"
            )}
          >
            <div className="relative">
              {item.icon}
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>
            <span className="text-xs font-medium truncate">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export const AppShell: React.FC<AppShellProps> = ({
  children,
  className,
  showSplash = true,
  splashDuration = 2000,
  enableBottomNav = true,
  enableTopBar = true,
  enableSidebar = true,
  onNavigate,
  currentRoute = '/',
  user,
  notifications = 0,
  showPWASettings = false
}) => {
  const [showSplashScreen, setShowSplashScreen] = useState(showSplash);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navItems, setNavItems] = useState(defaultNavItems);
  const [showSettings, setShowSettings] = useState(showPWASettings);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Update nav items with notification badges
  useEffect(() => {
    setNavItems(prev => prev.map(item => 
      item.id === 'notifications' 
        ? { ...item, badge: notifications }
        : item
    ));
  }, [notifications]);

  // Check if app is installable
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleSplashComplete = () => {
    setShowSplashScreen(false);
  };

  const handleMenuToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  const handleNavigate = (route: string) => {
    if (route === 'pwa-settings') {
      setShowSettings(true);
    } else {
      setShowSettings(false);
      onNavigate?.(route);
    }
  };

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    }
  };

  const handleSearch = () => {
    // Implement search functionality
    console.log('Search triggered');
  };

  if (showSplashScreen) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <div className={cn("min-h-screen bg-gray-50 dark:bg-gray-950 flex", className)}>
      {/* Sidebar */}
      {enableSidebar && (
        <Sidebar
          isOpen={sidebarOpen}
          onClose={handleSidebarClose}
          navItems={navItems}
          currentRoute={currentRoute}
          onNavigate={handleNavigate}
        />
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        {enableTopBar && (
          <TopBar
            onMenuToggle={handleMenuToggle}
            user={user}
            notifications={notifications}
            onSearch={handleSearch}
          />
        )}
        
        {/* Content Area */}
        <main className={cn(
          "flex-1 overflow-auto",
          enableBottomNav && "pb-16 md:pb-0"
        )}>
          {showSettings ? (
            <div className="p-6">
              <PWASettings />
            </div>
          ) : (
            children
          )}
        </main>
        
        {/* Bottom Navigation */}
        {enableBottomNav && (
          <BottomNavigation
            navItems={navItems}
            currentRoute={currentRoute}
            onNavigate={handleNavigate}
          />
        )}
      </div>
    </div>
  );
};

export default AppShell;
import React, { useState, useEffect } from 'react';
import { Settings, Bell, Wifi, WifiOff, Download, Trash2, RefreshCw, Shield, Zap } from 'lucide-react';
import { cn } from '../utils/cn';

interface PWASettingsProps {
  className?: string;
}

interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  showPreview: boolean;
}

interface CacheSettings {
  maxSize: number; // MB
  autoCleanup: boolean;
  offlineFirst: boolean;
}

interface SyncSettings {
  backgroundSync: boolean;
  periodicSync: boolean;
  syncInterval: number; // minutes
}

export const PWASettings: React.FC<PWASettingsProps> = ({ className }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enabled: false,
    sound: true,
    vibration: true,
    showPreview: true
  });
  const [cacheSettings, setCacheSettings] = useState<CacheSettings>({
    maxSize: 100,
    autoCleanup: true,
    offlineFirst: true
  });
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    backgroundSync: true,
    periodicSync: true,
    syncInterval: 30
  });
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [isClearing, setIsClearing] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    // Monitor online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Load settings from localStorage
    loadSettings();
    
    // Get current notification permission
    setNotificationPermission(Notification.permission);
    
    // Calculate cache size
    calculateCacheSize();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadSettings = () => {
    try {
      const savedNotificationSettings = localStorage.getItem('pwa-notification-settings');
      if (savedNotificationSettings) {
        setNotificationSettings(JSON.parse(savedNotificationSettings));
      }
      
      const savedCacheSettings = localStorage.getItem('pwa-cache-settings');
      if (savedCacheSettings) {
        setCacheSettings(JSON.parse(savedCacheSettings));
      }
      
      const savedSyncSettings = localStorage.getItem('pwa-sync-settings');
      if (savedSyncSettings) {
        setSyncSettings(JSON.parse(savedSyncSettings));
      }
    } catch (error) {
      console.error('Failed to load PWA settings:', error);
    }
  };

  const saveSettings = (type: string, settings: any) => {
    try {
      localStorage.setItem(`pwa-${type}-settings`, JSON.stringify(settings));
    } catch (error) {
      console.error(`Failed to save ${type} settings:`, error);
    }
  };

  const calculateCacheSize = async () => {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const usedMB = (estimate.usage || 0) / (1024 * 1024);
        setCacheSize(Math.round(usedMB * 100) / 100);
      }
    } catch (error) {
      console.error('Failed to calculate cache size:', error);
    }
  };

  const requestNotificationPermission = async () => {
    setIsRegistering(true);
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        // Register for push notifications
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.REACT_APP_VAPID_PUBLIC_KEY
        });
        
        // Send subscription to server
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });
        
        setNotificationSettings(prev => ({ ...prev, enabled: true }));
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    } finally {
      setIsRegistering(false);
    }
  };

  const clearCache = async () => {
    setIsClearing(true);
    try {
      // Clear all caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      
      // Clear IndexedDB
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        registration.active?.postMessage({ type: 'CLEAR_STORAGE' });
      }
      
      // Recalculate cache size
      await calculateCacheSize();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const registerPeriodicSync = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      if ('periodicSync' in registration) {
        await (registration as any).periodicSync.register('content-sync', {
          minInterval: syncSettings.syncInterval * 60 * 1000
        });
        
        await (registration as any).periodicSync.register('health-check', {
          minInterval: 5 * 60 * 1000 // 5 minutes
        });
      }
    } catch (error) {
      console.error('Failed to register periodic sync:', error);
    }
  };

  const updateNotificationSettings = (updates: Partial<NotificationSettings>) => {
    const newSettings = { ...notificationSettings, ...updates };
    setNotificationSettings(newSettings);
    saveSettings('notification', newSettings);
  };

  const updateCacheSettings = (updates: Partial<CacheSettings>) => {
    const newSettings = { ...cacheSettings, ...updates };
    setCacheSettings(newSettings);
    saveSettings('cache', newSettings);
  };

  const updateSyncSettings = async (updates: Partial<SyncSettings>) => {
    const newSettings = { ...syncSettings, ...updates };
    setSyncSettings(newSettings);
    saveSettings('sync', newSettings);
    
    if (newSettings.periodicSync) {
      await registerPeriodicSync();
    }
  };

  return (
    <div className={cn('space-y-6 p-6 bg-white dark:bg-gray-900 rounded-lg shadow-lg', className)}>
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">PWA Settings</h2>
        <div className={cn(
          'flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium',
          isOnline 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        )}>
          {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>

      {/* Notification Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
        </div>
        
        <div className="space-y-3 pl-8">
          <div className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Enable Notifications</span>
            <div className="flex items-center gap-2">
              {notificationPermission === 'default' && (
                <button
                  onClick={requestNotificationPermission}
                  disabled={isRegistering}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {isRegistering ? 'Requesting...' : 'Request Permission'}
                </button>
              )}
              <input
                type="checkbox"
                checked={notificationSettings.enabled && notificationPermission === 'granted'}
                onChange={(e) => updateNotificationSettings({ enabled: e.target.checked })}
                disabled={notificationPermission !== 'granted'}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
            </div>
          </div>
          
          {notificationSettings.enabled && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Sound</span>
                <input
                  type="checkbox"
                  checked={notificationSettings.sound}
                  onChange={(e) => updateNotificationSettings({ sound: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Vibration</span>
                <input
                  type="checkbox"
                  checked={notificationSettings.vibration}
                  onChange={(e) => updateNotificationSettings({ vibration: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Show Preview</span>
                <input
                  type="checkbox"
                  checked={notificationSettings.showPreview}
                  onChange={(e) => updateNotificationSettings({ showPreview: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cache Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cache & Storage</h3>
        </div>
        
        <div className="space-y-3 pl-8">
          <div className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Current Cache Size</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{cacheSize} MB</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Max Cache Size</span>
            <select
              value={cacheSettings.maxSize}
              onChange={(e) => updateCacheSettings({ maxSize: parseInt(e.target.value) })}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value={50}>50 MB</option>
              <option value={100}>100 MB</option>
              <option value={200}>200 MB</option>
              <option value={500}>500 MB</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Auto Cleanup</span>
            <input
              type="checkbox"
              checked={cacheSettings.autoCleanup}
              onChange={(e) => updateCacheSettings({ autoCleanup: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Offline First</span>
            <input
              type="checkbox"
              checked={cacheSettings.offlineFirst}
              onChange={(e) => updateCacheSettings({ offlineFirst: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </div>
          
          <button
            onClick={clearCache}
            disabled={isClearing}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {isClearing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {isClearing ? 'Clearing...' : 'Clear Cache'}
          </button>
        </div>
      </div>

      {/* Sync Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Synchronization</h3>
        </div>
        
        <div className="space-y-3 pl-8">
          <div className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Background Sync</span>
            <input
              type="checkbox"
              checked={syncSettings.backgroundSync}
              onChange={(e) => updateSyncSettings({ backgroundSync: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Periodic Sync</span>
            <input
              type="checkbox"
              checked={syncSettings.periodicSync}
              onChange={(e) => updateSyncSettings({ periodicSync: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </div>
          
          {syncSettings.periodicSync && (
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">Sync Interval</span>
              <select
                value={syncSettings.syncInterval}
                onChange={(e) => updateSyncSettings({ syncInterval: parseInt(e.target.value) })}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Security Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <h4 className="font-semibold text-blue-900 dark:text-blue-200">Security & Privacy</h4>
        </div>
        <p className="text-sm text-blue-800 dark:text-blue-300">
          All data is stored locally on your device. Notifications and sync features require internet connection but respect your privacy settings.
        </p>
      </div>
    </div>
  );
};

export default PWASettings;
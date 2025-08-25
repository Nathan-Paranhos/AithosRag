// PWA Manager Component - Complete PWA Control Interface
// Manages installation, updates, offline mode, notifications, sync queue

import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  RefreshCw,
  Wifi,
  WifiOff,
  Bell,
  BellOff,
  Database,
  Trash2,
  Settings,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Zap,
  Cloud,
  CloudOff,
  Sync,
  HardDrive,
  Globe,
  Shield,
  Battery,
  Signal,
  Eye,
  EyeOff,
  Play,
  Pause,
  RotateCcw,
  FileText,
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  Calendar,
  MapPin,
  Camera,
  Mic,
  Video
} from 'lucide-react';
import pwaService, { type PWAStats, type SyncTask, type NotificationPayload } from '../services/pwaService';

interface PWAManagerProps {
  className?: string;
}

interface InstallStats {
  canInstall: boolean;
  isInstalled: boolean;
  installPromptShown: boolean;
  installDate?: number;
  platform: string;
  userAgent: string;
}

interface NetworkStats {
  isOnline: boolean;
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface CacheStats {
  totalSize: number;
  usedSize: number;
  availableSize: number;
  cacheHitRate: number;
  lastCleared?: number;
}

interface NotificationStats {
  permission: NotificationPermission;
  supported: boolean;
  totalSent: number;
  totalClicked: number;
  clickRate: number;
  lastSent?: number;
}

const PWAManager: React.FC<PWAManagerProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'install' | 'offline' | 'notifications' | 'sync' | 'settings'>('overview');
  const [pwaStats, setPwaStats] = useState<PWAStats | null>(null);
  const [syncQueue, setSyncQueue] = useState<SyncTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Extended stats
  const [installStats, setInstallStats] = useState<InstallStats>({
    canInstall: false,
    isInstalled: false,
    installPromptShown: false,
    platform: navigator.platform,
    userAgent: navigator.userAgent
  });
  
  const [networkStats, setNetworkStats] = useState<NetworkStats>({
    isOnline: navigator.onLine,
    connectionType: 'unknown',
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
    saveData: false
  });
  
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    totalSize: 0,
    usedSize: 0,
    availableSize: 0,
    cacheHitRate: 0
  });
  
  const [notificationStats, setNotificationStats] = useState<NotificationStats>({
    permission: 'default',
    supported: 'Notification' in window,
    totalSent: 0,
    totalClicked: 0,
    clickRate: 0
  });

  // Mock data for demonstration
  const [mockData] = useState({
    recentActivities: [
      { id: '1', type: 'install', message: 'App installed successfully', timestamp: Date.now() - 3600000, status: 'success' },
      { id: '2', type: 'sync', message: 'Background sync completed', timestamp: Date.now() - 7200000, status: 'success' },
      { id: '3', type: 'notification', message: 'Push notification sent', timestamp: Date.now() - 10800000, status: 'success' },
      { id: '4', type: 'cache', message: 'Cache updated', timestamp: Date.now() - 14400000, status: 'success' },
      { id: '5', type: 'offline', message: 'Offline mode activated', timestamp: Date.now() - 18000000, status: 'warning' }
    ],
    performanceMetrics: {
      loadTime: 1.2,
      cacheHitRate: 85.6,
      offlineCapability: 95.2,
      syncSuccess: 98.7,
      notificationDelivery: 92.3
    },
    usageStats: {
      dailyActiveUsers: 1250,
      sessionDuration: 18.5,
      offlineUsage: 23.4,
      installRate: 12.8,
      retentionRate: 78.9
    }
  });

  useEffect(() => {
    loadPWAData();
    setupEventListeners();
    updateNetworkInfo();
    updateCacheInfo();
    updateNotificationInfo();

    return () => {
      // Cleanup event listeners
    };
  }, []);

  const loadPWAData = async () => {
    try {
      setIsLoading(true);
      const stats = pwaService.getStats();
      const queue = pwaService.getSyncQueue();
      
      setPwaStats(stats);
      setSyncQueue(queue);
      
      setInstallStats(prev => ({
        ...prev,
        canInstall: stats.installPromptAvailable,
        isInstalled: stats.isInstalled
      }));
    } catch (error) {
      setError('Failed to load PWA data');
    } finally {
      setIsLoading(false);
    }
  };

  const setupEventListeners = () => {
    pwaService.on('pwa:installed', () => {
      setSuccess('App installed successfully!');
      loadPWAData();
    });

    pwaService.on('pwa:update-available', () => {
      setSuccess('App update available!');
      loadPWAData();
    });

    pwaService.on('pwa:online', () => {
      setNetworkStats(prev => ({ ...prev, isOnline: true }));
      setSuccess('Back online!');
    });

    pwaService.on('pwa:offline', () => {
      setNetworkStats(prev => ({ ...prev, isOnline: false }));
      setError('Gone offline');
    });

    pwaService.on('pwa:sync-success', () => {
      loadPWAData();
    });
  };

  const updateNetworkInfo = () => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setNetworkStats(prev => ({
        ...prev,
        connectionType: connection.type || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false
      }));
    }
  };

  const updateCacheInfo = async () => {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        setCacheStats({
          totalSize: estimate.quota || 0,
          usedSize: estimate.usage || 0,
          availableSize: (estimate.quota || 0) - (estimate.usage || 0),
          cacheHitRate: mockData.performanceMetrics.cacheHitRate
        });
      }
    } catch (error) {
      console.error('Failed to update cache info:', error);
    }
  };

  const updateNotificationInfo = () => {
    setNotificationStats(prev => ({
      ...prev,
      permission: Notification.permission,
      totalSent: 45,
      totalClicked: 32,
      clickRate: 71.1
    }));
  };

  const handleInstallApp = async () => {
    try {
      setIsLoading(true);
      const installed = await pwaService.installApp();
      if (installed) {
        setSuccess('App installed successfully!');
      }
    } catch (error) {
      setError('Failed to install app');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateApp = async () => {
    try {
      setIsLoading(true);
      await pwaService.updateApp();
      setSuccess('App updated successfully!');
    } catch (error) {
      setError('Failed to update app');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = async () => {
    try {
      setIsLoading(true);
      await pwaService.clearCache();
      setSuccess('Cache cleared successfully!');
      await updateCacheInfo();
    } catch (error) {
      setError('Failed to clear cache');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTestNotification = async () => {
    try {
      const notification: NotificationPayload = {
        title: 'Test Notification',
        body: 'This is a test notification from PWA Manager',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        data: { test: true },
        actions: [
          { action: 'view', title: 'View' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      };
      
      await pwaService.sendNotification(notification);
      setSuccess('Test notification sent!');
      updateNotificationInfo();
    } catch (error) {
      setError('Failed to send notification');
    }
  };

  const handleClearSyncQueue = () => {
    pwaService.clearSyncQueue();
    setSyncQueue([]);
    setSuccess('Sync queue cleared!');
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'install': return <Download className="w-4 h-4" />;
      case 'sync': return <Sync className="w-4 h-4" />;
      case 'notification': return <Bell className="w-4 h-4" />;
      case 'cache': return <Database className="w-4 h-4" />;
      case 'offline': return <WifiOff className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color?: string; subtitle?: string }> = ({ 
    title, value, icon, color = 'text-blue-600', subtitle 
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`${color} opacity-80`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Installation Status"
          value={installStats.isInstalled ? 'Installed' : 'Not Installed'}
          icon={<Smartphone className="w-6 h-6" />}
          color={installStats.isInstalled ? 'text-green-600' : 'text-gray-600'}
        />
        <StatCard
          title="Network Status"
          value={networkStats.isOnline ? 'Online' : 'Offline'}
          icon={networkStats.isOnline ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
          color={networkStats.isOnline ? 'text-green-600' : 'text-red-600'}
        />
        <StatCard
          title="Cache Size"
          value={formatBytes(cacheStats.usedSize)}
          icon={<Database className="w-6 h-6" />}
          subtitle={`${cacheStats.cacheHitRate}% hit rate`}
        />
        <StatCard
          title="Sync Queue"
          value={syncQueue.length}
          icon={<Sync className="w-6 h-6" />}
          color={syncQueue.length > 0 ? 'text-yellow-600' : 'text-green-600'}
          subtitle={syncQueue.length > 0 ? 'items pending' : 'all synced'}
        />
      </div>

      {/* Performance Metrics */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          Performance Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{mockData.performanceMetrics.loadTime}s</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Load Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{mockData.performanceMetrics.cacheHitRate}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Cache Hit Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{mockData.performanceMetrics.offlineCapability}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Offline Ready</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{mockData.performanceMetrics.syncSuccess}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Sync Success</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">{mockData.performanceMetrics.notificationDelivery}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Notifications</div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2" />
          Recent Activities
        </h3>
        <div className="space-y-3">
          {mockData.recentActivities.map(activity => (
            <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={getStatusColor(activity.status)}>
                  {getActivityIcon(activity.type)}
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{activity.message}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDuration(Date.now() - activity.timestamp)} ago
                  </div>
                </div>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                activity.status === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                activity.status === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
              }`}>
                {activity.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const InstallTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Download className="w-5 h-5 mr-2" />
          App Installation
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Installation Status</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {installStats.isInstalled ? 'App is installed and ready to use' : 'App is not installed'}
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              installStats.isInstalled 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
            }`}>
              {installStats.isInstalled ? 'Installed' : 'Not Installed'}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Install Prompt</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {installStats.canInstall ? 'Ready to install' : 'Not available'}
              </div>
            </div>
            <button
              onClick={handleInstallApp}
              disabled={!installStats.canInstall || isLoading}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                installStats.canInstall && !isLoading
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
              }`}
            >
              {isLoading ? 'Installing...' : 'Install App'}
            </button>
          </div>

          {pwaStats?.updateAvailable && (
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div>
                <div className="font-medium text-blue-900 dark:text-blue-100">Update Available</div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  A new version of the app is ready to install
                </div>
              </div>
              <button
                onClick={handleUpdateApp}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Updating...' : 'Update Now'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Platform Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Info className="w-5 h-5 mr-2" />
          Platform Information
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Platform:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{installStats.platform}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">PWA Support:</span>
            <span className="font-medium text-green-600 dark:text-green-400">Yes</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Service Worker:</span>
            <span className="font-medium text-green-600 dark:text-green-400">Active</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Manifest:</span>
            <span className="font-medium text-green-600 dark:text-green-400">Valid</span>
          </div>
        </div>
      </div>
    </div>
  );

  const OfflineTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          {networkStats.isOnline ? <Wifi className="w-5 h-5 mr-2" /> : <WifiOff className="w-5 h-5 mr-2" />}
          Offline Capabilities
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Network Status</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {networkStats.isOnline ? 'Connected' : 'Disconnected'}
                </div>
              </div>
              <div className={`w-3 h-3 rounded-full ${
                networkStats.isOnline ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Connection Type</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {networkStats.connectionType || 'Unknown'}
                </div>
              </div>
              <Signal className="w-5 h-5 text-gray-400" />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Effective Type</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {networkStats.effectiveType || 'Unknown'}
                </div>
              </div>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Cache Storage</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {formatBytes(cacheStats.usedSize)} used
                </div>
              </div>
              <button
                onClick={handleClearCache}
                disabled={isLoading}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Clear
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Available Space</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {formatBytes(cacheStats.availableSize)} free
                </div>
              </div>
              <HardDrive className="w-5 h-5 text-gray-400" />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Cache Hit Rate</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {cacheStats.cacheHitRate}% efficiency
                </div>
              </div>
              <div className="text-green-600 dark:text-green-400 font-bold">
                {cacheStats.cacheHitRate}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Offline Features */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Offline Features
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-gray-900 dark:text-gray-100">Core App Functions</span>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-gray-900 dark:text-gray-100">Local Data Storage</span>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-gray-900 dark:text-gray-100">Background Sync</span>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-gray-900 dark:text-gray-100">Offline Analytics</span>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-gray-900 dark:text-gray-100">Cached Resources</span>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <span className="text-gray-900 dark:text-gray-100">Limited API Access</span>
          </div>
        </div>
      </div>
    </div>
  );

  const NotificationsTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Bell className="w-5 h-5 mr-2" />
          Push Notifications
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Permission Status</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {notificationStats.permission === 'granted' ? 'Notifications enabled' :
                 notificationStats.permission === 'denied' ? 'Notifications blocked' :
                 'Permission not requested'}
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              notificationStats.permission === 'granted' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : notificationStats.permission === 'denied'
                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
            }`}>
              {notificationStats.permission}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Test Notification</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Send a test notification to verify functionality
              </div>
            </div>
            <button
              onClick={handleSendTestNotification}
              disabled={notificationStats.permission !== 'granted' || isLoading}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                notificationStats.permission === 'granted' && !isLoading
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
              }`}
            >
              {isLoading ? 'Sending...' : 'Send Test'}
            </button>
          </div>
        </div>
      </div>

      {/* Notification Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          Notification Statistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{notificationStats.totalSent}</div>
            <div className="text-gray-600 dark:text-gray-400">Total Sent</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{notificationStats.totalClicked}</div>
            <div className="text-gray-600 dark:text-gray-400">Clicked</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{notificationStats.clickRate}%</div>
            <div className="text-gray-600 dark:text-gray-400">Click Rate</div>
          </div>
        </div>
      </div>
    </div>
  );

  const SyncTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <Sync className="w-5 h-5 mr-2" />
            Background Sync Queue
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {syncQueue.length} items
            </span>
            {syncQueue.length > 0 && (
              <button
                onClick={handleClearSyncQueue}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
        
        {syncQueue.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <div className="text-gray-900 dark:text-gray-100 font-medium">All synced up!</div>
            <div className="text-gray-600 dark:text-gray-400 text-sm">No pending sync tasks</div>
          </div>
        ) : (
          <div className="space-y-3">
            {syncQueue.map(task => (
              <div key={task.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    task.priority === 'high' ? 'bg-red-500' :
                    task.priority === 'medium' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}></div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {task.type.charAt(0).toUpperCase() + task.type.slice(1)} Task
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Priority: {task.priority} • Retries: {task.retries}/{task.maxRetries}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDuration(Date.now() - task.createdAt)} ago
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sync Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2" />
          Sync Statistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">98.7%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Success Rate</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">1.2s</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Sync Time</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">247</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Syncs</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {pwaStats?.lastSync ? formatDuration(Date.now() - pwaStats.lastSync) : 'Never'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Last Sync</div>
          </div>
        </div>
      </div>
    </div>
  );

  const SettingsTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          PWA Settings
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Auto-sync</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Automatically sync data when online
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Background notifications</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Receive notifications when app is closed
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Offline analytics</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Track usage when offline
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Data saver mode</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Reduce data usage when possible
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2" />
          Advanced Settings
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Cache Strategy</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                How to handle cached resources
              </div>
            </div>
            <select className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm">
              <option>Cache First</option>
              <option>Network First</option>
              <option>Stale While Revalidate</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Sync Frequency</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                How often to sync in background
              </div>
            </div>
            <select className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm">
              <option>Every 5 minutes</option>
              <option>Every 15 minutes</option>
              <option>Every 30 minutes</option>
              <option>Every hour</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Max Cache Size</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Maximum storage for cached data
              </div>
            </div>
            <select className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm">
              <option>50 MB</option>
              <option>100 MB</option>
              <option>200 MB</option>
              <option>500 MB</option>
            </select>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-800">
        <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-4 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Danger Zone
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-red-900 dark:text-red-100">Reset PWA Data</div>
              <div className="text-sm text-red-700 dark:text-red-300">
                Clear all cached data and reset settings
              </div>
            </div>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors">
              Reset
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-red-900 dark:text-red-100">Uninstall App</div>
              <div className="text-sm text-red-700 dark:text-red-300">
                Remove app from device (if supported)
              </div>
            </div>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors">
              Uninstall
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <Smartphone className="w-8 h-8 text-blue-600 mr-3" />
              PWA Manager
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Complete Progressive Web App management and monitoring
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              networkStats.isOnline ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {networkStats.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-3" />
            <span className="text-red-800 dark:text-red-200">{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-3" />
            <span className="text-green-800 dark:text-green-200">{success}</span>
            <button 
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'install', label: 'Installation', icon: Download },
            { id: 'offline', label: 'Offline', icon: WifiOff },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'sync', label: 'Sync', icon: Sync },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'install' && <InstallTab />}
          {activeTab === 'offline' && <OfflineTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'sync' && <SyncTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
};

export default PWAManager;
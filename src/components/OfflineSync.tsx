import React from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { cn } from '../utils/cn';

interface OfflineSyncProps {
  className?: string;
  showDetails?: boolean;
}

export const OfflineSync: React.FC<OfflineSyncProps> = ({ 
  className,
  showDetails = false 
}) => {
  const { syncStatus, triggerSync } = useOfflineSync();

  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const getStatusColor = () => {
    if (!syncStatus.isOnline) return 'text-red-500';
    if (syncStatus.isSyncing) return 'text-blue-500';
    if (syncStatus.pendingItems > 0) return 'text-yellow-500';
    if (syncStatus.syncErrors.length > 0) return 'text-orange-500';
    return 'text-green-500';
  };

  const getStatusIcon = () => {
    if (!syncStatus.isOnline) return <WifiOff className="w-4 h-4" />;
    if (syncStatus.isSyncing) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (syncStatus.pendingItems > 0) return <Clock className="w-4 h-4" />;
    if (syncStatus.syncErrors.length > 0) return <AlertCircle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (!syncStatus.isOnline) return 'Offline';
    if (syncStatus.isSyncing) return 'Syncing...';
    if (syncStatus.pendingItems > 0) return `${syncStatus.pendingItems} pending`;
    if (syncStatus.syncErrors.length > 0) return 'Sync errors';
    return 'Synced';
  };

  const handleManualSync = () => {
    if (syncStatus.isOnline && !syncStatus.isSyncing) {
      triggerSync();
    }
  };

  if (!showDetails) {
    // Compact view - just icon and status
    return (
      <div 
        className={cn(
          "flex items-center gap-2 px-2 py-1 rounded-md text-sm transition-colors",
          "hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer",
          getStatusColor(),
          className
        )}
        onClick={handleManualSync}
        title={`${getStatusText()} - Click to sync`}
      >
        {getStatusIcon()}
        <span className="hidden sm:inline">{getStatusText()}</span>
      </div>
    );
  }

  // Detailed view
  return (
    <div className={cn("bg-white dark:bg-gray-900 border rounded-lg p-4 space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi className={cn("w-5 h-5", syncStatus.isOnline ? "text-green-500" : "text-red-500")} />
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            Sync Status
          </h3>
        </div>
        
        <button
          onClick={handleManualSync}
          disabled={!syncStatus.isOnline || syncStatus.isSyncing}
          className={cn(
            "p-2 rounded-md transition-colors",
            "hover:bg-gray-100 dark:hover:bg-gray-800",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          title="Manual sync"
        >
          <RefreshCw className={cn(
            "w-4 h-4",
            syncStatus.isSyncing && "animate-spin"
          )} />
        </button>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-1">
          <div className="text-gray-500 dark:text-gray-400">Connection</div>
          <div className={cn(
            "flex items-center gap-1 font-medium",
            syncStatus.isOnline ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {syncStatus.isOnline ? (
              <><Wifi className="w-3 h-3" /> Online</>
            ) : (
              <><WifiOff className="w-3 h-3" /> Offline</>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-gray-500 dark:text-gray-400">Pending Items</div>
          <div className={cn(
            "flex items-center gap-1 font-medium",
            syncStatus.pendingItems > 0 ? "text-yellow-600 dark:text-yellow-400" : "text-gray-600 dark:text-gray-400"
          )}>
            <Clock className="w-3 h-3" />
            {syncStatus.pendingItems}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-gray-500 dark:text-gray-400">Last Sync</div>
          <div className="text-gray-600 dark:text-gray-400 font-medium">
            {formatLastSync(syncStatus.lastSyncTime)}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-gray-500 dark:text-gray-400">Status</div>
          <div className={cn(
            "flex items-center gap-1 font-medium",
            getStatusColor()
          )}>
            {getStatusIcon()}
            {getStatusText()}
          </div>
        </div>
      </div>

      {/* Sync Progress */}
      {syncStatus.isSyncing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Syncing data...</span>
            <span className="text-blue-600 dark:text-blue-400">In progress</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {/* Sync Errors */}
      {syncStatus.syncErrors.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">Sync Issues</span>
          </div>
          <div className="space-y-1">
            {syncStatus.syncErrors.slice(0, 3).map((error, index) => (
              <div 
                key={index}
                className="text-xs text-gray-600 dark:text-gray-400 bg-orange-50 dark:bg-orange-900/20 p-2 rounded border-l-2 border-orange-200 dark:border-orange-800"
              >
                {error}
              </div>
            ))}
            {syncStatus.syncErrors.length > 3 && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                +{syncStatus.syncErrors.length - 3} more errors
              </div>
            )}
          </div>
        </div>
      )}

      {/* Offline Notice */}
      {!syncStatus.isOnline && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
          <div className="flex items-start gap-2">
            <WifiOff className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-yellow-800 dark:text-yellow-200">
                You're offline
              </div>
              <div className="text-yellow-700 dark:text-yellow-300 mt-1">
                Your changes are being saved locally and will sync when you're back online.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success State */}
      {syncStatus.isOnline && syncStatus.pendingItems === 0 && syncStatus.syncErrors.length === 0 && !syncStatus.isSyncing && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="font-medium text-green-800 dark:text-green-200">
              All data is synced
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineSync;
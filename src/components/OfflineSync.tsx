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
    return (
      <div 
        className={cn(
          "flex items-center gap-2 px-2 py-1 rounded-md text-sm transition-colors",
          "hover:bg-gray-100 cursor-pointer",
          getStatusColor(),
          className
        )}
        onClick={() => showDetails && handleManualSync()}
      >
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </div>
    );
  }

  return (
    <div className={cn("bg-white border rounded-lg p-4 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("flex items-center gap-2", getStatusColor())}>
            {getStatusIcon()}
            <span className="font-medium">{getStatusText()}</span>
          </div>
        </div>
        <button
          onClick={handleManualSync}
          disabled={!syncStatus.isOnline || syncStatus.isSyncing}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
        >
          <RefreshCw className={cn(
            "w-4 h-4",
            syncStatus.isSyncing && "animate-spin"
          )} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-1">
          <div className="text-gray-500">Connection</div>
          <div className={cn(
            "flex items-center gap-1",
            syncStatus.isOnline ? "text-green-600" : "text-red-600"
          )}>
            {syncStatus.isOnline ? (
              <><Wifi className="w-3 h-3" /> Online</>
            ) : (
              <><WifiOff className="w-3 h-3" /> Offline</>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-gray-500">Pending</div>
          <div className="text-blue-600">
            {syncStatus.pendingItems} items
          </div>
        </div>
      </div>

      {syncStatus.isSyncing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Syncing data...</span>
            <span className="text-blue-600">In progress</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {syncStatus.syncErrors.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-orange-600">Sync Errors</div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {syncStatus.syncErrors.slice(0, 3).map((error, index) => (
              <div
                key={index}
                className="text-xs text-gray-600 bg-orange-50 p-2 rounded border-l-2 border-orange-200"
              >
                {error}
              </div>
            ))}
            {syncStatus.syncErrors.length > 3 && (
              <div className="text-xs text-gray-500">
                +{syncStatus.syncErrors.length - 3} more errors
              </div>
            )}
          </div>
        </div>
      )}

      {!syncStatus.isOnline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <div className="flex items-center gap-2 text-sm">
            <WifiOff className="w-4 h-4 text-yellow-600" />
            <span className="font-medium text-yellow-800">
              Working offline - changes will sync when connected
            </span>
          </div>
        </div>
      )}

      {syncStatus.isOnline && !syncStatus.isSyncing && syncStatus.pendingItems === 0 && syncStatus.syncErrors.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="font-medium text-green-800">
              All data is synced
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineSync;
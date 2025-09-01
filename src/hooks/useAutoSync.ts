import { useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { useOfflineStorage } from './useOfflineStorage';

interface SyncItem {
  id: string;
  type: 'message' | 'conversation' | 'analytics';
  data: any;
  timestamp: number;
  retryCount: number;
}

interface AutoSyncOptions {
  maxRetries?: number;
  retryDelay?: number;
  batchSize?: number;
  onSyncStart?: () => void;
  onSyncComplete?: (synced: number, failed: number) => void;
  onSyncError?: (error: Error) => void;
}

export const useAutoSync = (options: AutoSyncOptions = {}) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    batchSize = 5,
    onSyncStart,
    onSyncComplete,
    onSyncError
  } = options;

  const { isOnline } = useOnlineStatus();
  const { getSyncQueue, removeSyncItem, addSyncItem } = useOfflineStorage();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ synced: 0, total: 0 });
  const wasOfflineRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track online/offline transitions
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
    } else if (wasOfflineRef.current && isOnline) {
      // Connection restored - trigger sync
      wasOfflineRef.current = false;
      scheduleSyncWithDelay();
    }
  }, [isOnline]);

  const scheduleSyncWithDelay = () => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(() => {
      syncPendingItems();
    }, 2000); // Wait 2 seconds after connection is restored
  };

  const syncPendingItems = async () => {
    if (!isOnline || isSyncing) return;

    try {
      const syncQueue = await getSyncQueue();
      if (syncQueue.length === 0) return;

      setIsSyncing(true);
      setSyncProgress({ synced: 0, total: syncQueue.length });
      onSyncStart?.();

      let syncedCount = 0;
      let failedCount = 0;

      // Process items in batches
      for (let i = 0; i < syncQueue.length; i += batchSize) {
        const batch = syncQueue.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (item) => {
            try {
              await syncItem(item);
              await removeSyncItem(item.id);
              syncedCount++;
              setSyncProgress(prev => ({ ...prev, synced: prev.synced + 1 }));
            } catch (error) {
              console.error(`Failed to sync item ${item.id}:`, error);
              
              if (item.retryCount < maxRetries) {
                // Increment retry count and keep in queue
                await addSyncItem({
                  ...item,
                  retryCount: item.retryCount + 1
                });
              } else {
                // Max retries reached, remove from queue
                await removeSyncItem(item.id);
                failedCount++;
              }
            }
          })
        );

        // Small delay between batches to avoid overwhelming the server
        if (i + batchSize < syncQueue.length) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }

      onSyncComplete?.(syncedCount, failedCount);
    } catch (error) {
      console.error('Sync process failed:', error);
      onSyncError?.(error as Error);
    } finally {
      setIsSyncing(false);
      setSyncProgress({ synced: 0, total: 0 });
    }
  };

  const syncItem = async (item: SyncItem): Promise<void> => {
    switch (item.type) {
      case 'message':
        return syncMessage(item.data);
      case 'conversation':
        return syncConversation(item.data);
      case 'analytics':
        return syncAnalytics(item.data);
      default:
        throw new Error(`Unknown sync item type: ${item.type}`);
    }
  };

  const syncMessage = async (messageData: any): Promise<void> => {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData),
    });

    if (!response.ok) {
      throw new Error(`Failed to sync message: ${response.statusText}`);
    }
  };

  const syncConversation = async (conversationData: any): Promise<void> => {
    const response = await fetch('/api/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(conversationData),
    });

    if (!response.ok) {
      throw new Error(`Failed to sync conversation: ${response.statusText}`);
    }
  };

  const syncAnalytics = async (analyticsData: any): Promise<void> => {
    const response = await fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analyticsData),
    });

    if (!response.ok) {
      throw new Error(`Failed to sync analytics: ${response.statusText}`);
    }
  };

  const forceSyncNow = () => {
    if (isOnline) {
      syncPendingItems();
    }
  };

  const addToSyncQueue = async (type: SyncItem['type'], data: any) => {
    const syncItem: SyncItem = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0
    };

    await addSyncItem(syncItem);

    // If online, try to sync immediately
    if (isOnline && !isSyncing) {
      setTimeout(() => syncPendingItems(), 100);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    isSyncing,
    syncProgress,
    forceSyncNow,
    addToSyncQueue,
    isOnline
  };
};
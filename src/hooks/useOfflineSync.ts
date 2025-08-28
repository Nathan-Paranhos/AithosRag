import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useOfflineStorage } from './useOfflineStorage';
import type { PendingSyncItem } from './useOfflineStorage';

interface SyncConfig {
  syncInterval: number;
  retryDelay: number;
  maxRetries: number;
  batchSize: number;
}

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingItems: number;
  lastSyncTime: number | null;
  syncErrors: string[];
}

const DEFAULT_CONFIG: SyncConfig = {
  syncInterval: 30000, // 30 seconds
  retryDelay: 5000,    // 5 seconds
  maxRetries: 3,
  batchSize: 10
};

export const useOfflineSync = (config: Partial<SyncConfig> = {}) => {
  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  const {
    getPendingSyncItems,
    markSyncCompleted,
    isInitialized: storageInitialized
  } = useOfflineStorage();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingItems: 0,
    lastSyncTime: null,
    syncErrors: []
  });

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);

  // API endpoints for syncing
  const API_BASE = '/api';

  const syncConversation = useCallback(async (item: PendingSyncItem): Promise<boolean> => {
    try {
      const endpoint = `${API_BASE}/conversations`;
      const method = item.action === 'create' ? 'POST' : 
                    item.action === 'update' ? 'PUT' : 'DELETE';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: item.action !== 'delete' ? JSON.stringify(item.data) : undefined
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to sync conversation:', error);
      return false;
    }
  }, []);

  const syncMessage = useCallback(async (item: PendingSyncItem): Promise<boolean> => {
    try {
      const endpoint = `${API_BASE}/messages`;
      const method = item.action === 'create' ? 'POST' : 
                    item.action === 'update' ? 'PUT' : 'DELETE';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: item.action !== 'delete' ? JSON.stringify(item.data) : undefined
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to sync message:', error);
      return false;
    }
  }, []);

  const syncUserData = useCallback(async (item: PendingSyncItem): Promise<boolean> => {
    try {
      const endpoint = `${API_BASE}/user-data`;
      const method = item.action === 'create' ? 'POST' : 
                    item.action === 'update' ? 'PUT' : 'DELETE';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: item.action !== 'delete' ? JSON.stringify(item.data) : undefined
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to sync user data:', error);
      return false;
    }
  }, []);

  const syncItem = useCallback(async (item: PendingSyncItem): Promise<boolean> => {
    switch (item.type) {
      case 'conversation':
        return await syncConversation(item);
      case 'message':
        return await syncMessage(item);
      case 'user_data':
        return await syncUserData(item);
      default:
        console.warn('Unknown sync item type:', item.type);
        return false;
    }
  }, [syncConversation, syncMessage, syncUserData]);

  const performSync = useCallback(async (): Promise<void> => {
    if (!storageInitialized || !syncStatus.isOnline || isSyncingRef.current) {
      return;
    }

    isSyncingRef.current = true;
    setSyncStatus(prev => ({ ...prev, isSyncing: true, syncErrors: [] }));

    try {
      const pendingItems = await getPendingSyncItems();
      
      if (pendingItems.length === 0) {
        setSyncStatus(prev => ({
          ...prev,
          isSyncing: false,
          pendingItems: 0,
          lastSyncTime: Date.now()
        }));
        return;
      }

      setSyncStatus(prev => ({ ...prev, pendingItems: pendingItems.length }));

      const errors: string[] = [];

      // Process items in batches
      for (let i = 0; i < pendingItems.length; i += finalConfig.batchSize) {
        const batch = pendingItems.slice(i, i + finalConfig.batchSize);
        
        const batchPromises = batch.map(async (item) => {
          try {
            const success = await syncItem(item);
            if (success) {
              await markSyncCompleted(item.id);
            } else {
              // Increment retry count
              item.retries++;
              if (item.retries >= finalConfig.maxRetries) {
                errors.push(`Failed to sync ${item.type} after ${finalConfig.maxRetries} retries`);
                await markSyncCompleted(item.id); // Remove from queue after max retries
              }
            }
          } catch (error) {
            errors.push(`Sync error for ${item.type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });

        await Promise.allSettled(batchPromises);
        
        // Small delay between batches to avoid overwhelming the server
        if (i + finalConfig.batchSize < pendingItems.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const remainingItems = await getPendingSyncItems();
      
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        pendingItems: remainingItems.length,
        lastSyncTime: Date.now(),
        syncErrors: errors
      }));

      // Schedule retry if there are still pending items
      if (remainingItems.length > 0 && errors.length === 0) {
        retryTimeoutRef.current = setTimeout(() => {
          performSync();
        }, finalConfig.retryDelay);
      }

    } catch (error) {
      console.error('Sync operation failed:', error);
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        syncErrors: [error instanceof Error ? error.message : 'Sync operation failed']
      }));
    } finally {
      isSyncingRef.current = false;
    }
  }, [storageInitialized, syncStatus.isOnline, getPendingSyncItems, markSyncCompleted, finalConfig, syncItem]);

  // Manual sync trigger
  const triggerSync = useCallback(async (): Promise<void> => {
    if (syncStatus.isOnline) {
      await performSync();
    }
  }, [performSync, syncStatus.isOnline]);

  // Update pending items count
  const updatePendingCount = useCallback(async () => {
    if (storageInitialized) {
      try {
        const items = await getPendingSyncItems();
        setSyncStatus(prev => ({ ...prev, pendingItems: items.length }));
      } catch (error) {
        console.error('Failed to update pending count:', error);
      }
    }
  }, [storageInitialized, getPendingSyncItems]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }));
      // Trigger sync when coming back online
      setTimeout(() => {
        performSync();
      }, 1000); // Small delay to ensure connection is stable
    };

    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
      // Clear any pending sync operations
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [performSync]);

  // Set up periodic sync when online
  useEffect(() => {
    if (syncStatus.isOnline && storageInitialized) {
      // Initial sync
      performSync();
      
      // Set up periodic sync
      syncIntervalRef.current = setInterval(() => {
        performSync();
      }, finalConfig.syncInterval);

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
          syncIntervalRef.current = null;
        }
      };
    }
  }, [syncStatus.isOnline, storageInitialized, performSync, finalConfig.syncInterval]);

  // Update pending count on storage initialization
  useEffect(() => {
    if (storageInitialized) {
      updatePendingCount();
    }
  }, [storageInitialized, updatePendingCount]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    syncStatus,
    triggerSync,
    updatePendingCount,
    config: finalConfig
  };
};

export type { SyncStatus, SyncConfig };
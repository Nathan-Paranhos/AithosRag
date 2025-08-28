import { useState, useEffect, useCallback } from 'react';

// IndexedDB configuration
const DB_NAME = 'AithosRAGOffline';
const DB_VERSION = 1;
const STORES = {
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  USER_DATA: 'userData',
  PENDING_SYNC: 'pendingSync'
};

interface ConversationData {
  id: string;
  title: string;
  messages: MessageData[];
  createdAt: number;
  updatedAt: number;
  synced: boolean;
}

interface MessageData {
  id: string;
  conversationId: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  synced: boolean;
}

interface UserData {
  id: string;
  preferences: Record<string, unknown>;
  settings: Record<string, unknown>;
  lastSync: number;
}

interface PendingSyncItem {
  id: string;
  type: 'conversation' | 'message' | 'user_data';
  action: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
}

class OfflineStorageManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create conversations store
        if (!db.objectStoreNames.contains(STORES.CONVERSATIONS)) {
          const conversationsStore = db.createObjectStore(STORES.CONVERSATIONS, { keyPath: 'id' });
          conversationsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          conversationsStore.createIndex('synced', 'synced', { unique: false });
        }

        // Create messages store
        if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
          const messagesStore = db.createObjectStore(STORES.MESSAGES, { keyPath: 'id' });
          messagesStore.createIndex('conversationId', 'conversationId', { unique: false });
          messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
          messagesStore.createIndex('synced', 'synced', { unique: false });
        }

        // Create user data store
        if (!db.objectStoreNames.contains(STORES.USER_DATA)) {
          db.createObjectStore(STORES.USER_DATA, { keyPath: 'id' });
        }

        // Create pending sync store
        if (!db.objectStoreNames.contains(STORES.PENDING_SYNC)) {
          const pendingSyncStore = db.createObjectStore(STORES.PENDING_SYNC, { keyPath: 'id' });
          pendingSyncStore.createIndex('timestamp', 'timestamp', { unique: false });
          pendingSyncStore.createIndex('type', 'type', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    await this.init();
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const transaction = this.db.transaction([storeName], mode);
    return transaction.objectStore(storeName);
  }

  // Conversation methods
  async saveConversation(conversation: ConversationData): Promise<void> {
    const store = await this.getStore(STORES.CONVERSATIONS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(conversation);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getConversation(id: string): Promise<ConversationData | null> {
    const store = await this.getStore(STORES.CONVERSATIONS);
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllConversations(): Promise<ConversationData[]> {
    const store = await this.getStore(STORES.CONVERSATIONS);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const conversations = request.result || [];
        // Sort by updatedAt descending
        conversations.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(conversations);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteConversation(id: string): Promise<void> {
    const store = await this.getStore(STORES.CONVERSATIONS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Message methods
  async saveMessage(message: MessageData): Promise<void> {
    const store = await this.getStore(STORES.MESSAGES, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(message);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getConversationMessages(conversationId: string): Promise<MessageData[]> {
    const store = await this.getStore(STORES.MESSAGES);
    const index = store.index('conversationId');
    return new Promise((resolve, reject) => {
      const request = index.getAll(conversationId);
      request.onsuccess = () => {
        const messages = request.result || [];
        // Sort by timestamp ascending
        messages.sort((a, b) => a.timestamp - b.timestamp);
        resolve(messages);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Pending sync methods
  async addPendingSync(item: PendingSyncItem): Promise<void> {
    const store = await this.getStore(STORES.PENDING_SYNC, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingSyncItems(): Promise<PendingSyncItem[]> {
    const store = await this.getStore(STORES.PENDING_SYNC);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const items = request.result || [];
        // Sort by timestamp ascending (oldest first)
        items.sort((a, b) => a.timestamp - b.timestamp);
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async removePendingSync(id: string): Promise<void> {
    const store = await this.getStore(STORES.PENDING_SYNC, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // User data methods
  async saveUserData(userData: UserData): Promise<void> {
    const store = await this.getStore(STORES.USER_DATA, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(userData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUserData(id: string): Promise<UserData | null> {
    const store = await this.getStore(STORES.USER_DATA);
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    await this.init();
    if (!this.db) return;

    const storeNames = Object.values(STORES);
    const transaction = this.db.transaction(storeNames, 'readwrite');

    return new Promise((resolve, reject) => {
      let completed = 0;
      const total = storeNames.length;

      storeNames.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    });
  }
}

// Singleton instance
const storageManager = new OfflineStorageManager();

export const useOfflineStorage = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initStorage = async () => {
      try {
        await storageManager.init();
        setIsInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize storage');
      }
    };

    initStorage();
  }, []);

  // Conversation operations
  const saveConversationOffline = useCallback(async (conversation: Omit<ConversationData, 'synced'>) => {
    try {
      const conversationData: ConversationData = {
        ...conversation,
        synced: false
      };
      await storageManager.saveConversation(conversationData);
      
      // Add to pending sync
      await storageManager.addPendingSync({
        id: `conv_${conversation.id}_${Date.now()}`,
        type: 'conversation',
        action: 'create',
        data: conversationData,
        timestamp: Date.now(),
        retries: 0
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save conversation');
      throw err;
    }
  }, []);

  const getConversationsOffline = useCallback(async (): Promise<ConversationData[]> => {
    try {
      return await storageManager.getAllConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get conversations');
      return [];
    }
  }, []);

  // Message operations
  const saveMessageOffline = useCallback(async (message: Omit<MessageData, 'synced'>) => {
    try {
      const messageData: MessageData = {
        ...message,
        synced: false
      };
      await storageManager.saveMessage(messageData);
      
      // Add to pending sync
      await storageManager.addPendingSync({
        id: `msg_${message.id}_${Date.now()}`,
        type: 'message',
        action: 'create',
        data: messageData,
        timestamp: Date.now(),
        retries: 0
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save message');
      throw err;
    }
  }, []);

  const getMessagesOffline = useCallback(async (conversationId: string): Promise<MessageData[]> => {
    try {
      return await storageManager.getConversationMessages(conversationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get messages');
      return [];
    }
  }, []);

  // Sync operations
  const getPendingSyncItems = useCallback(async (): Promise<PendingSyncItem[]> => {
    try {
      return await storageManager.getPendingSyncItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get pending sync items');
      return [];
    }
  }, []);

  const markSyncCompleted = useCallback(async (syncId: string) => {
    try {
      await storageManager.removePendingSync(syncId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark sync completed');
      throw err;
    }
  }, []);

  // Clear all offline data
  const clearOfflineData = useCallback(async () => {
    try {
      await storageManager.clearAllData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear offline data');
      throw err;
    }
  }, []);

  return {
    isInitialized,
    error,
    saveConversationOffline,
    getConversationsOffline,
    saveMessageOffline,
    getMessagesOffline,
    getPendingSyncItems,
    markSyncCompleted,
    clearOfflineData
  };
};

export type {
  ConversationData,
  MessageData,
  UserData,
  PendingSyncItem
};
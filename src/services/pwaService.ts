// PWA Service - Progressive Web App Enterprise Implementation
// Complete PWA with offline mode, push notifications, app-like experience

// Types
interface PWAConfig {
  name: string;
  shortName: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  orientation: 'portrait' | 'landscape' | 'any';
  startUrl: string;
  scope: string;
  icons: PWAIcon[];
  categories: string[];
  screenshots: PWAScreenshot[];
}

interface PWAIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: 'any' | 'maskable' | 'monochrome';
}

interface PWAScreenshot {
  src: string;
  sizes: string;
  type: string;
  label?: string;
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: unknown;
  actions?: NotificationAction[];
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface OfflineResource {
  url: string;
  type: 'essential' | 'important' | 'optional';
  strategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
  maxAge?: number;
}

interface SyncTask {
  id: string;
  type: 'upload' | 'download' | 'sync';
  data: unknown;
  priority: 'high' | 'medium' | 'low';
  retries: number;
  maxRetries: number;
  createdAt: number;
  scheduledAt?: number;
}

interface PWAStats {
  isInstalled: boolean;
  isOnline: boolean;
  cacheSize: number;
  syncQueueSize: number;
  notificationsEnabled: boolean;
  lastSync: number;
  installPromptAvailable: boolean;
  updateAvailable: boolean;
}

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// PWA Service Class
class PWAService {
  private config: PWAConfig;
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private registration: ServiceWorkerRegistration | null = null;
  private installPrompt: InstallPromptEvent | null = null;
  private syncQueue: SyncTask[] = [];
  private offlineResources: OfflineResource[] = [];
  private stats: PWAStats;
  private listeners: Map<string, ((data?: unknown) => void)[]> = new Map();

  constructor(config: PWAConfig) {
    this.config = config;
    this.stats = {
      isInstalled: false,
      isOnline: navigator.onLine,
      cacheSize: 0,
      syncQueueSize: 0,
      notificationsEnabled: false,
      lastSync: 0,
      installPromptAvailable: false,
      updateAvailable: false
    };

    this.initializePWA();
  }

  // Initialize PWA
  private async initializePWA(): Promise<void> {
    try {
      // Register service worker
      await this.registerServiceWorker();
      
      // Setup offline resources
      this.setupOfflineResources();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Check installation status
      this.checkInstallationStatus();
      
      // Initialize notifications
      await this.initializeNotifications();
      
      // Load sync queue
      this.loadSyncQueue();
      
      // Update stats
      await this.updateStats();
      
      this.emit('pwa:initialized', this.stats);
    } catch (error) {
      console.error('PWA initialization failed:', error);
      this.emit('pwa:error', error);
    }
  }

  // Register Service Worker
  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js', {
          scope: this.config.scope
        });

        // Handle updates
        this.registration.addEventListener('updatefound', () => {
          const newWorker = this.registration!.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.stats.updateAvailable = true;
                this.emit('pwa:update-available');
              }
            });
          }
        });

        console.log('Service Worker registered successfully');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        throw error;
      }
    } else {
      throw new Error('Service Workers not supported');
    }
  }

  // Setup Offline Resources
  private setupOfflineResources(): void {
    this.offlineResources = [
      // Essential resources
      { url: '/', type: 'essential', strategy: 'cache-first' },
      { url: '/manifest.json', type: 'essential', strategy: 'cache-first' },
      { url: '/offline.html', type: 'essential', strategy: 'cache-first' },
      
      // Important resources
      { url: '/static/css/', type: 'important', strategy: 'cache-first', maxAge: 86400000 },
      { url: '/static/js/', type: 'important', strategy: 'cache-first', maxAge: 86400000 },
      { url: '/api/user/profile', type: 'important', strategy: 'network-first', maxAge: 300000 },
      
      // Optional resources
      { url: '/api/analytics', type: 'optional', strategy: 'stale-while-revalidate', maxAge: 600000 },
      { url: '/images/', type: 'optional', strategy: 'cache-first', maxAge: 604800000 }
    ];
  }

  // Setup Event Listeners
  private setupEventListeners(): void {
    // Online/Offline events
    window.addEventListener('online', () => {
      this.stats.isOnline = true;
      this.emit('pwa:online');
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.stats.isOnline = false;
      this.emit('pwa:offline');
    });

    // Install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e as InstallPromptEvent;
      this.stats.installPromptAvailable = true;
      this.emit('pwa:install-available');
    });

    // App installed
    window.addEventListener('appinstalled', () => {
      this.stats.isInstalled = true;
      this.installPrompt = null;
      this.stats.installPromptAvailable = false;
      this.emit('pwa:installed');
    });

    // Visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.processSyncQueue();
      }
    });
  }

  // Check Installation Status
  private checkInstallationStatus(): void {
    // Check if running in standalone mode
    this.stats.isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                             (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  }

  // Initialize Notifications
  private async initializeNotifications(): Promise<void> {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      const permission = await Notification.requestPermission();
      this.stats.notificationsEnabled = permission === 'granted';
      
      if (this.stats.notificationsEnabled && this.registration) {
        // Setup push subscription
        await this.setupPushSubscription();
      }
    }
  }

  // Setup Push Subscription
  private async setupPushSubscription(): Promise<void> {
    try {
      if (!this.registration) return;

      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(process.env.REACT_APP_VAPID_PUBLIC_KEY || '')
      });

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);
      
      console.log('Push subscription setup successfully');
    } catch (error) {
      console.error('Push subscription setup failed:', error);
    }
  }

  // Send Subscription to Server
  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription,
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
    }
  }

  // Convert VAPID key
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Load Sync Queue
  private loadSyncQueue(): void {
    try {
      const stored = localStorage.getItem('pwa_sync_queue');
      if (stored) {
        this.syncQueue = JSON.parse(stored);
        this.stats.syncQueueSize = this.syncQueue.length;
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    }
  }

  // Save Sync Queue
  private saveSyncQueue(): void {
    try {
      localStorage.setItem('pwa_sync_queue', JSON.stringify(this.syncQueue));
      this.stats.syncQueueSize = this.syncQueue.length;
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  // Update Stats
  private async updateStats(): Promise<void> {
    try {
      // Calculate cache size
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        this.stats.cacheSize = estimate.usage || 0;
      }

      // Update last sync
      const lastSync = localStorage.getItem('pwa_last_sync');
      this.stats.lastSync = lastSync ? parseInt(lastSync) : 0;
    } catch (error) {
      console.error('Failed to update stats:', error);
    }
  }

  // Public Methods

  // Install App
  public async installApp(): Promise<boolean> {
    if (!this.installPrompt) {
      throw new Error('Install prompt not available');
    }

    try {
      await this.installPrompt.prompt();
      const choice = await this.installPrompt.userChoice;
      
      if (choice.outcome === 'accepted') {
        this.stats.isInstalled = true;
        this.installPrompt = null;
        this.stats.installPromptAvailable = false;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('App installation failed:', error);
      throw error;
    }
  }

  // Update App
  public async updateApp(): Promise<void> {
    if (!this.registration || !this.stats.updateAvailable) {
      throw new Error('No update available');
    }

    try {
      const newWorker = this.registration.waiting;
      if (newWorker) {
        newWorker.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    } catch (error) {
      console.error('App update failed:', error);
      throw error;
    }
  }

  // Send Notification
  public async sendNotification(payload: NotificationPayload): Promise<void> {
    if (!this.stats.notificationsEnabled || !this.registration) {
      throw new Error('Notifications not enabled');
    }

    try {
      await this.registration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/badge-72x72.png',
        image: payload.image,
        data: payload.data,
        actions: payload.actions,
        tag: payload.tag,
        requireInteraction: payload.requireInteraction,
        silent: payload.silent,
        timestamp: payload.timestamp || Date.now()
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  // Add to Sync Queue
  public addToSyncQueue(task: Omit<SyncTask, 'id' | 'createdAt' | 'retries'>): string {
    const syncTask: SyncTask = {
      ...task,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      retries: 0
    };

    this.syncQueue.push(syncTask);
    this.saveSyncQueue();
    
    // Process immediately if online
    if (this.stats.isOnline) {
      this.processSyncQueue();
    }

    return syncTask.id;
  }

  // Process Sync Queue
  private async processSyncQueue(): Promise<void> {
    if (!this.stats.isOnline || this.syncQueue.length === 0) {
      return;
    }

    const tasksToProcess = this.syncQueue
      .filter(task => !task.scheduledAt || task.scheduledAt <= Date.now())
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

    for (const task of tasksToProcess) {
      try {
        await this.processTask(task);
        
        // Remove successful task
        this.syncQueue = this.syncQueue.filter(t => t.id !== task.id);
        this.emit('pwa:sync-success', task);
      } catch (error) {
        console.error(`Sync task ${task.id} failed:`, error);
        
        // Increment retries
        task.retries++;
        
        if (task.retries >= task.maxRetries) {
          // Remove failed task
          this.syncQueue = this.syncQueue.filter(t => t.id !== task.id);
          this.emit('pwa:sync-failed', { task, error });
        } else {
          // Schedule retry
          task.scheduledAt = Date.now() + (task.retries * 30000); // Exponential backoff
        }
      }
    }

    this.saveSyncQueue();
    this.stats.lastSync = Date.now();
    localStorage.setItem('pwa_last_sync', this.stats.lastSync.toString());
  }

  // Process Individual Task
  private async processTask(task: SyncTask): Promise<void> {
    switch (task.type) {
      case 'upload':
        await this.processUploadTask(task);
        break;
      case 'download':
        await this.processDownloadTask(task);
        break;
      case 'sync':
        await this.processSyncTask(task);
        break;
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  // Process Upload Task
  private async processUploadTask(task: SyncTask): Promise<void> {
    const response = await fetch(task.data.url, {
      method: task.data.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...task.data.headers
      },
      body: JSON.stringify(task.data.body)
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
  }

  // Process Download Task
  private async processDownloadTask(task: SyncTask): Promise<void> {
    const response = await fetch(task.data.url, {
      method: 'GET',
      headers: task.data.headers
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Store in local storage or IndexedDB
    if (task.data.storage === 'localStorage') {
      localStorage.setItem(task.data.key, JSON.stringify(data));
    } else if (task.data.storage === 'indexedDB') {
      // Implement IndexedDB storage
      await this.storeInIndexedDB(task.data.key, data);
    }
  }

  // Process Sync Task
  private async processSyncTask(task: SyncTask): Promise<void> {
    // Custom sync logic based on task data
    if (task.data.handler && typeof task.data.handler === 'function') {
      await task.data.handler(task.data.payload);
    }
  }

  // Store in IndexedDB
  private async storeInIndexedDB(key: string, data: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PWACache', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        
        const putRequest = store.put({ key, data, timestamp: Date.now() });
        
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
    });
  }

  // Clear Cache
  public async clearCache(): Promise<void> {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      // Clear IndexedDB
      const deleteRequest = indexedDB.deleteDatabase('PWACache');
      await new Promise((resolve, reject) => {
        deleteRequest.onsuccess = () => resolve(undefined);
        deleteRequest.onerror = () => reject(deleteRequest.error);
      });

      await this.updateStats();
      this.emit('pwa:cache-cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }

  // Get Stats
  public getStats(): PWAStats {
    return { ...this.stats };
  }

  // Get Sync Queue
  public getSyncQueue(): SyncTask[] {
    return [...this.syncQueue];
  }

  // Clear Sync Queue
  public clearSyncQueue(): void {
    this.syncQueue = [];
    this.saveSyncQueue();
    this.emit('pwa:sync-queue-cleared');
  }

  // Event Management
  public on(event: string, callback: (data?: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback: (data?: unknown) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in PWA event callback for ${event}:`, error);
        }
      });
    }
  }

  // Cleanup
  public destroy(): void {
    this.listeners.clear();
    
    // Remove event listeners
    window.removeEventListener('online', () => {});
    window.removeEventListener('offline', () => {});
    window.removeEventListener('beforeinstallprompt', () => {});
    window.removeEventListener('appinstalled', () => {});
    document.removeEventListener('visibilitychange', () => {});
  }
}

// Default PWA Configuration
const defaultPWAConfig: PWAConfig = {
  name: 'Aithos RAG Enterprise',
  shortName: 'Aithos RAG',
  description: 'Enterprise AI-powered RAG application with advanced analytics and collaboration features',
  themeColor: '#3b82f6',
  backgroundColor: '#ffffff',
  display: 'standalone',
  orientation: 'portrait',
  startUrl: '/',
  scope: '/',
  categories: ['productivity', 'business', 'ai'],
  icons: [
    {
      src: '/icons/icon-72x72.png',
      sizes: '72x72',
      type: 'image/png',
      purpose: 'any'
    },
    {
      src: '/icons/icon-96x96.png',
      sizes: '96x96',
      type: 'image/png',
      purpose: 'any'
    },
    {
      src: '/icons/icon-128x128.png',
      sizes: '128x128',
      type: 'image/png',
      purpose: 'any'
    },
    {
      src: '/icons/icon-144x144.png',
      sizes: '144x144',
      type: 'image/png',
      purpose: 'any'
    },
    {
      src: '/icons/icon-152x152.png',
      sizes: '152x152',
      type: 'image/png',
      purpose: 'any'
    },
    {
      src: '/icons/icon-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any'
    },
    {
      src: '/icons/icon-384x384.png',
      sizes: '384x384',
      type: 'image/png',
      purpose: 'any'
    },
    {
      src: '/icons/icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any'
    },
    {
      src: '/icons/maskable-icon-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'maskable'
    },
    {
      src: '/icons/maskable-icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable'
    }
  ],
  screenshots: [
    {
      src: '/screenshots/desktop-1.png',
      sizes: '1280x720',
      type: 'image/png',
      label: 'Desktop Dashboard'
    },
    {
      src: '/screenshots/mobile-1.png',
      sizes: '390x844',
      type: 'image/png',
      label: 'Mobile Interface'
    }
  ]
};

// Create singleton instance
const pwaService = new PWAService(defaultPWAConfig);

export default pwaService;
export { PWAService, type PWAConfig, type NotificationPayload, type SyncTask, type PWAStats };
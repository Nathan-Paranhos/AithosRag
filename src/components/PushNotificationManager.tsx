import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Settings, X, Check } from 'lucide-react';
import { cn } from '../utils/cn';

interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationConfig {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  actions?: NotificationAction[];
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface PushNotificationManagerProps {
  className?: string;
  onPermissionChange?: (permission: NotificationPermission) => void;
  onSubscriptionChange?: (subscription: PushSubscription | null) => void;
}

export const PushNotificationManager: React.FC<PushNotificationManagerProps> = ({
  className,
  onPermissionChange,
  onSubscriptionChange
}) => {
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    denied: false,
    default: true
  });
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [testNotification, setTestNotification] = useState('');

  // Check initial permission status
  useEffect(() => {
    if ('Notification' in window) {
      const currentPermission = Notification.permission;
      const permissionState = {
        granted: currentPermission === 'granted',
        denied: currentPermission === 'denied',
        default: currentPermission === 'default'
      };
      setPermission(permissionState);
      onPermissionChange?.(permissionState);
    }
  }, [onPermissionChange]);

  // Check for existing subscription
  useEffect(() => {
    const checkSubscription = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const existingSubscription = await registration.pushManager.getSubscription();
          
          if (existingSubscription) {
            const subscriptionData = {
              endpoint: existingSubscription.endpoint,
              keys: {
                p256dh: arrayBufferToBase64(existingSubscription.getKey('p256dh')!),
                auth: arrayBufferToBase64(existingSubscription.getKey('auth')!)
              }
            };
            setSubscription(subscriptionData);
            onSubscriptionChange?.(subscriptionData);
          }
        } catch (error) {
          console.error('Error checking push subscription:', error);
        }
      }
    };

    checkSubscription();
  }, [onSubscriptionChange]);

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications');
      return;
    }

    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      const permissionState = {
        granted: result === 'granted',
        denied: result === 'denied',
        default: result === 'default'
      };
      setPermission(permissionState);
      onPermissionChange?.(permissionState);

      if (result === 'granted') {
        await subscribeToPush();
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.error('Push messaging is not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // VAPID public key (you should replace this with your actual VAPID key)
      const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa40HI0DLLuxazjqAKHSr3txbueJHHieurqeqvyYONpsRwltkMd50aeYTLhuiM';
      
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      const subscriptionData = {
        endpoint: pushSubscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(pushSubscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(pushSubscription.getKey('auth')!)
        }
      };

      setSubscription(subscriptionData);
      onSubscriptionChange?.(subscriptionData);

      // Send subscription to server
      await sendSubscriptionToServer(subscriptionData);
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const sendSubscriptionToServer = async (subscriptionData: PushSubscription) => {
    try {
      // Replace with your actual server endpoint
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionData)
      });
    } catch (error) {
      console.error('Error sending subscription to server:', error);
    }
  };

  const unsubscribeFromPush = async () => {
    if (!subscription) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.getSubscription();
      
      if (pushSubscription) {
        await pushSubscription.unsubscribe();
        setSubscription(null);
        onSubscriptionChange?.(null);

        // Notify server about unsubscription
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
      }
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
    }
  };

  const sendTestNotification = async () => {
    if (!permission.granted || !testNotification.trim()) return;

    try {
      // Send test notification via service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification('Test Notification', {
          body: testNotification,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: 'test-notification',
          requireInteraction: false,
          vibrate: [200, 100, 200],
          actions: [
            {
              action: 'view',
              title: 'View',
              icon: '/icon-view.png'
            },
            {
              action: 'dismiss',
              title: 'Dismiss',
              icon: '/icon-dismiss.png'
            }
          ]
        });
      }
      setTestNotification('');
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  };

  return (
    <div className={cn("bg-white dark:bg-gray-900 border rounded-lg p-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {permission.granted ? (
            <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : (
            <BellOff className="w-5 h-5 text-gray-400" />
          )}
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            Push Notifications
          </h3>
        </div>
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Settings className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Status */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
          <div className={cn(
            "px-2 py-1 rounded-full text-xs font-medium",
            permission.granted
              ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
              : permission.denied
              ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
          )}>
            {permission.granted ? 'Enabled' : permission.denied ? 'Blocked' : 'Not Set'}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Subscription:</span>
          <div className={cn(
            "px-2 py-1 rounded-full text-xs font-medium",
            subscription
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
          )}>
            {subscription ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 space-y-2">
        {!permission.granted && !permission.denied && (
          <button
            onClick={requestPermission}
            disabled={isLoading}
            className={cn(
              "w-full px-4 py-2 bg-blue-600 text-white rounded-md transition-colors",
              "hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center justify-center gap-2"
            )}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
            Enable Notifications
          </button>
        )}

        {permission.granted && !subscription && (
          <button
            onClick={subscribeToPush}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Subscribe to Push
          </button>
        )}

        {subscription && (
          <button
            onClick={unsubscribeFromPush}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Unsubscribe
          </button>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">Test Notifications</h4>
          
          <div className="space-y-2">
            <input
              type="text"
              value={testNotification}
              onChange={(e) => setTestNotification(e.target.value)}
              placeholder="Enter test message..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              disabled={!permission.granted}
            />
            
            <button
              onClick={sendTestNotification}
              disabled={!permission.granted || !testNotification.trim()}
              className={cn(
                "w-full px-4 py-2 bg-purple-600 text-white rounded-md transition-colors",
                "hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-2"
              )}
            >
              <Bell className="w-4 h-4" />
              Send Test Notification
            </button>
          </div>

          {permission.denied && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
              <div className="flex items-start gap-2">
                <X className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-yellow-800 dark:text-yellow-200">
                    Notifications Blocked
                  </div>
                  <div className="text-yellow-700 dark:text-yellow-300 mt-1">
                    To enable notifications, please allow them in your browser settings and refresh the page.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PushNotificationManager;
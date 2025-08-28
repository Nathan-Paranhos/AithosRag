import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  BellOff, 
  Check, 
  X, 
  Info, 
  AlertTriangle, 
  AlertCircle,
  MessageSquare,
  Settings
} from 'lucide-react';
import usePWA from '../hooks/usePWA';
import { toast } from 'sonner';

interface NotificationData {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'message';
  timestamp: number;
  read: boolean;
  actions?: {
    label: string;
    action: string;
  }[];
  data?: Record<string, unknown>;
}

interface PushNotificationsProps {
  className?: string;
  onNotificationClick?: (notification: NotificationData) => void;
  maxNotifications?: number;
}

export const PushNotifications: React.FC<PushNotificationsProps> = ({
  className = '',
  onNotificationClick,
  maxNotifications = 50
}) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  
  const { 
    notificationPermission, 
    requestNotificationPermission, 
    sendNotification,
    subscribeToNotifications
  } = usePWA();

  // Update permission status
  useEffect(() => {
    setPermissionStatus(notificationPermission);
  }, [notificationPermission]);

  // Listen for push notifications
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      };
    }
  }, []);

  // Handle service worker messages
  const handleServiceWorkerMessage = (event: MessageEvent) => {
    if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
      const notificationData: NotificationData = {
        id: Date.now().toString(),
        title: event.data.title,
        body: event.data.body,
        type: event.data.notificationType || 'info',
        timestamp: Date.now(),
        read: false,
        data: event.data.data
      };
      
      addNotification(notificationData);
    }
  };

  // Add notification to list
  const addNotification = (notification: NotificationData) => {
    setNotifications(prev => {
      const updated = [notification, ...prev].slice(0, maxNotifications);
      return updated;
    });
    
    // Show toast for new notifications
    toast(notification.title, {
      description: notification.body,
      duration: 5000,
      action: {
        label: 'View',
        onClick: () => handleNotificationClick(notification)
      }
    });
  };

  // Handle notification click
  const handleNotificationClick = (notification: NotificationData) => {
    // Mark as read
    setNotifications(prev => 
      prev.map(n => 
        n.id === notification.id ? { ...n, read: true } : n
      )
    );
    
    onNotificationClick?.(notification);
  };

  // Request notification permission
  const handleRequestPermission = async () => {
    try {
      const permission = await requestNotificationPermission();
      if (permission === 'granted') {
        await subscribeToNotifications();
        toast.success('Notifications enabled successfully!');
      } else {
        toast.error('Notification permission denied');
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      toast.error('Failed to enable notifications');
    }
  };

  // Send test notification
  const sendTestNotification = () => {
    const testNotification: NotificationData = {
      id: Date.now().toString(),
      title: 'Test Notification',
      body: 'This is a test notification to verify PWA notifications are working.',
      type: 'info',
      timestamp: Date.now(),
      read: false
    };
    
    addNotification(testNotification);
    sendNotification(testNotification.title, {
      body: testNotification.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'test-notification',
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });
  };

  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
    toast.success('All notifications cleared');
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Get notification icon
  const getNotificationIcon = (type: NotificationData['type']) => {
    switch (type) {
      case 'success':
        return <Check className="text-green-500" size={16} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={16} />;
      case 'error':
        return <AlertCircle className="text-red-500" size={16} />;
      case 'message':
        return <MessageSquare className="text-blue-500" size={16} />;
      default:
        return <Info className="text-blue-500" size={16} />;
    }
  };

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.05 }}
      >
        {permissionStatus === 'granted' ? (
          <Bell size={20} />
        ) : (
          <BellOff size={20} />
        )}
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <motion.div
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.div>
        )}
      </motion.button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute top-full right-0 mt-2 w-80 max-w-[90vw] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden z-50"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Notifications
                </h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              
              {/* Permission Status */}
              {permissionStatus !== 'granted' && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                    <AlertTriangle size={16} />
                    <span className="text-sm font-medium">
                      Notifications disabled
                    </span>
                  </div>
                  <button
                    onClick={handleRequestPermission}
                    className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 hover:underline"
                  >
                    Enable notifications
                  </button>
                </div>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Bell size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                  {permissionStatus === 'granted' && (
                    <button
                      onClick={sendTestNotification}
                      className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Send test notification
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
                  {notifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      className={`p-4 cursor-pointer transition-colors ${
                        notification.read
                          ? 'bg-transparent'
                          : 'bg-blue-50/50 dark:bg-blue-900/10'
                      } hover:bg-gray-50 dark:hover:bg-gray-800/50`}
                      onClick={() => handleNotificationClick(notification)}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-sm font-medium truncate ${
                              notification.read
                                ? 'text-gray-700 dark:text-gray-300'
                                : 'text-gray-900 dark:text-white'
                            }`}>
                              {notification.title}
                            </h4>
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                              {new Date(notification.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          
                          <p className={`text-sm mt-1 line-clamp-2 ${
                            notification.read
                              ? 'text-gray-500 dark:text-gray-400'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {notification.body}
                          </p>
                          
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between">
                  <button
                    onClick={clearAllNotifications}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    Clear all
                  </button>
                  
                  <div className="flex items-center gap-4">
                    {permissionStatus === 'granted' && (
                      <button
                        onClick={sendTestNotification}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Test notification
                      </button>
                    )}
                    
                    <button
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <Settings size={12} />
                      Settings
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PushNotifications;
// Notification Service Implementation
import { INotificationService } from '../../application/interfaces/IGroqService';

export class NotificationService implements INotificationService {
  private notifications: Map<string, Array<{
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
    timestamp: Date;
    read: boolean;
  }>> = new Map();

  async notifySuccess(userId: string, message: string): Promise<void> {
    await this.addNotification(userId, 'success', message);
    
    // In a real implementation, this would send to the user's active sessions
    console.log(`✅ Success notification for ${userId}: ${message}`);
    
    // Trigger browser notification if supported
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.sendBrowserNotification('Success', message, 'success');
    }
  }

  async notifyError(userId: string, message: string): Promise<void> {
    await this.addNotification(userId, 'error', message);
    
    console.error(`❌ Error notification for ${userId}: ${message}`);
    
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.sendBrowserNotification('Error', message, 'error');
    }
  }

  async notifyInfo(userId: string, message: string): Promise<void> {
    await this.addNotification(userId, 'info', message);
    
    console.info(`ℹ️ Info notification for ${userId}: ${message}`);
    
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.sendBrowserNotification('Info', message, 'info');
    }
  }

  async sendPushNotification(userId: string, title: string, body: string): Promise<void> {
    // Store the notification
    await this.addNotification(userId, 'info', `${title}: ${body}`);
    
    // Send browser push notification
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: `notification-${userId}-${Date.now()}`,
          requireInteraction: false,
          silent: false
        });
      } else if (Notification.permission !== 'denied') {
        // Request permission
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/favicon.ico'
          });
        }
      }
    }
    
    console.log(`🔔 Push notification for ${userId}: ${title} - ${body}`);
  }

  // Additional utility methods
  async getNotifications(userId: string, limit: number = 50): Promise<Array<{
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
    timestamp: Date;
    read: boolean;
  }>> {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const userNotifications = this.notifications.get(userId) || [];
    const notification = userNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    const userNotifications = this.notifications.get(userId) || [];
    userNotifications.forEach(notification => {
      notification.read = true;
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.filter(n => !n.read).length;
  }

  async clearNotifications(userId: string): Promise<void> {
    this.notifications.delete(userId);
  }

  private async addNotification(
    userId: string,
    type: 'success' | 'error' | 'info',
    message: string
  ): Promise<void> {
    const userNotifications = this.notifications.get(userId) || [];
    
    const notification = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: new Date(),
      read: false
    };
    
    userNotifications.push(notification);
    
    // Keep only the last 100 notifications per user
    if (userNotifications.length > 100) {
      userNotifications.splice(0, userNotifications.length - 100);
    }
    
    this.notifications.set(userId, userNotifications);
  }

  private sendBrowserNotification(
    title: string,
    message: string,
    type: 'success' | 'error' | 'info'
  ): void {
    if (Notification.permission === 'granted') {
      const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
      
      new Notification(`${icon} ${title}`, {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `${type}-${Date.now()}`,
        requireInteraction: type === 'error',
        silent: false
      });
    }
  }

  // Real-time notification methods (would integrate with WebSocket in real implementation)
  async subscribeToNotifications(userId: string, callback: (notification: any) => void): Promise<void> {
    // In a real implementation, this would set up WebSocket or SSE connection
    console.log(`Subscribed to notifications for user ${userId}`);
  }

  async unsubscribeFromNotifications(userId: string): Promise<void> {
    console.log(`Unsubscribed from notifications for user ${userId}`);
  }
}
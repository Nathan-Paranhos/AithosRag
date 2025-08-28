import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { body, query, param, validationResult } from 'express-validator';
import EventEmitter from 'events';
import WebSocket, { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import webpush from 'web-push';

class NotificationService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      port: options.port || 3005,
      wsPort: options.wsPort || 3009,
      jwtSecret: options.jwtSecret || 'your-super-secret-jwt-key-change-in-production',
      rateLimitWindow: options.rateLimitWindow || 15 * 60 * 1000, // 15 minutes
      rateLimitMax: options.rateLimitMax || 100,
      emailConfig: options.emailConfig || {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER || 'your-email@gmail.com',
          pass: process.env.EMAIL_PASS || 'your-app-password'
        }
      },
      vapidKeys: options.vapidKeys || {
        publicKey: process.env.VAPID_PUBLIC_KEY || 'your-vapid-public-key',
        privateKey: process.env.VAPID_PRIVATE_KEY || 'your-vapid-private-key',
        subject: process.env.VAPID_SUBJECT || 'mailto:admin@aithos.com'
      },
      ...options
    };

    this.app = express();
    this.server = null;
    this.wsServer = null;
    this.wss = null;
    
    // In-memory storage (in production, use a proper database)
    this.notifications = new Map();
    this.userNotifications = new Map(); // userId -> [notificationIds]
    this.notificationTemplates = new Map();
    this.userPreferences = new Map();
    this.pushSubscriptions = new Map();
    this.emailQueue = [];
    this.pushQueue = [];
    this.wsConnections = new Map(); // userId -> WebSocket connection
    this.deliveryAttempts = new Map();
    
    // Initialize default data
    this.initializeDefaultData();
    
    // Setup email transporter
    this.setupEmailTransporter();
    
    // Setup push notifications
    this.setupPushNotifications();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    
    // Start background processors
    this.startBackgroundProcessors();
  }

  initializeDefaultData() {
    // Create default notification templates
    const templates = [
      {
        id: 'welcome',
        name: 'Welcome Email',
        type: 'email',
        subject: 'Welcome to Aithos RAG!',
        content: `
          <h1>Welcome to Aithos RAG!</h1>
          <p>Hi {{firstName}},</p>
          <p>Thank you for joining Aithos RAG. We're excited to have you on board!</p>
          <p>Get started by exploring our AI-powered features and creating your first conversation.</p>
          <p>Best regards,<br>The Aithos Team</p>
        `,
        variables: ['firstName']
      },
      {
        id: 'password_reset',
        name: 'Password Reset',
        type: 'email',
        subject: 'Reset Your Password',
        content: `
          <h1>Password Reset Request</h1>
          <p>Hi {{firstName}},</p>
          <p>You requested to reset your password. Click the link below to reset it:</p>
          <p><a href="{{resetLink}}">Reset Password</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Best regards,<br>The Aithos Team</p>
        `,
        variables: ['firstName', 'resetLink']
      },
      {
        id: 'new_message',
        name: 'New Message Notification',
        type: 'push',
        title: 'New Message',
        content: 'You have a new message from {{senderName}}',
        variables: ['senderName']
      },
      {
        id: 'system_alert',
        name: 'System Alert',
        type: 'both',
        title: 'System Alert',
        subject: 'System Alert - {{alertType}}',
        content: 'System alert: {{message}}',
        variables: ['alertType', 'message']
      }
    ];

    templates.forEach(template => {
      this.notificationTemplates.set(template.id, {
        ...template,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    console.log('✅ Default notification templates created');
  }

  setupEmailTransporter() {
    try {
      this.emailTransporter = nodemailer.createTransporter(this.options.emailConfig);
      console.log('✅ Email transporter configured');
    } catch (error) {
      console.warn('⚠️ Email transporter setup failed:', error.message);
      this.emailTransporter = null;
    }
  }

  setupPushNotifications() {
    try {
      webpush.setVapidDetails(
        this.options.vapidKeys.subject,
        this.options.vapidKeys.publicKey,
        this.options.vapidKeys.privateKey
      );
      console.log('✅ Push notifications configured');
    } catch (error) {
      console.warn('⚠️ Push notifications setup failed:', error.message);
    }
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true
    }));
    
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Rate limiting
    const notificationLimiter = rateLimit({
      windowMs: this.options.rateLimitWindow,
      max: this.options.rateLimitMax,
      message: {
        error: 'Too many requests from this IP, please try again later'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    this.app.use('/notifications', notificationLimiter);

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`🔔 Notification Service: ${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'notification-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        stats: {
          totalNotifications: this.notifications.size,
          activeConnections: this.wsConnections.size,
          emailQueue: this.emailQueue.length,
          pushQueue: this.pushQueue.length,
          templates: this.notificationTemplates.size
        }
      });
    });

    // Send notification
    this.app.post('/notifications/send', [
      this.authenticateToken.bind(this),
      body('userId').optional().isString(),
      body('userIds').optional().isArray(),
      body('type').isIn(['email', 'push', 'realtime', 'all']),
      body('title').optional().isString(),
      body('message').isString(),
      body('data').optional().isObject(),
      body('templateId').optional().isString(),
      body('templateData').optional().isObject(),
      body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
      body('scheduledFor').optional().isISO8601()
    ], this.sendNotification.bind(this));

    // Get user notifications
    this.app.get('/notifications/user/:userId', [
      this.authenticateToken.bind(this),
      param('userId').isString(),
      query('status').optional().isIn(['unread', 'read', 'all']),
      query('type').optional().isString(),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 })
    ], this.getUserNotifications.bind(this));

    // Mark notification as read
    this.app.put('/notifications/:notificationId/read', [
      this.authenticateToken.bind(this),
      param('notificationId').isString()
    ], this.markAsRead.bind(this));

    // Mark all notifications as read
    this.app.put('/notifications/user/:userId/read-all', [
      this.authenticateToken.bind(this),
      param('userId').isString()
    ], this.markAllAsRead.bind(this));

    // Delete notification
    this.app.delete('/notifications/:notificationId', [
      this.authenticateToken.bind(this),
      param('notificationId').isString()
    ], this.deleteNotification.bind(this));

    // Get notification preferences
    this.app.get('/notifications/preferences/:userId', [
      this.authenticateToken.bind(this),
      param('userId').isString()
    ], this.getNotificationPreferences.bind(this));

    // Update notification preferences
    this.app.put('/notifications/preferences/:userId', [
      this.authenticateToken.bind(this),
      param('userId').isString(),
      body('email').optional().isBoolean(),
      body('push').optional().isBoolean(),
      body('realtime').optional().isBoolean(),
      body('categories').optional().isObject()
    ], this.updateNotificationPreferences.bind(this));

    // Push subscription management
    this.app.post('/notifications/push/subscribe', [
      this.authenticateToken.bind(this),
      body('userId').isString(),
      body('subscription').isObject()
    ], this.subscribeToPush.bind(this));

    this.app.delete('/notifications/push/unsubscribe/:userId', [
      this.authenticateToken.bind(this),
      param('userId').isString()
    ], this.unsubscribeFromPush.bind(this));

    // Template management (admin only)
    this.app.get('/notifications/templates', [
      this.authenticateToken.bind(this),
      this.requireRole(['admin', 'super_admin'])
    ], this.getTemplates.bind(this));

    this.app.post('/notifications/templates', [
      this.authenticateToken.bind(this),
      this.requireRole(['admin', 'super_admin']),
      body('id').isString(),
      body('name').isString(),
      body('type').isIn(['email', 'push', 'both']),
      body('subject').optional().isString(),
      body('title').optional().isString(),
      body('content').isString(),
      body('variables').optional().isArray()
    ], this.createTemplate.bind(this));

    this.app.put('/notifications/templates/:templateId', [
      this.authenticateToken.bind(this),
      this.requireRole(['admin', 'super_admin']),
      param('templateId').isString()
    ], this.updateTemplate.bind(this));

    this.app.delete('/notifications/templates/:templateId', [
      this.authenticateToken.bind(this),
      this.requireRole(['admin', 'super_admin']),
      param('templateId').isString()
    ], this.deleteTemplate.bind(this));

    // Analytics
    this.app.get('/notifications/analytics', [
      this.authenticateToken.bind(this),
      this.requireRole(['admin', 'super_admin']),
      query('startDate').optional().isISO8601(),
      query('endDate').optional().isISO8601(),
      query('type').optional().isString()
    ], this.getAnalytics.bind(this));

    // Bulk operations
    this.app.post('/notifications/bulk/send', [
      this.authenticateToken.bind(this),
      this.requireRole(['admin', 'super_admin']),
      body('userIds').isArray(),
      body('templateId').isString(),
      body('templateData').optional().isObject(),
      body('type').isIn(['email', 'push', 'realtime', 'all'])
    ], this.bulkSendNotifications.bind(this));
  }

  setupWebSocket() {
    this.wss = new WebSocketServer({ port: this.options.wsPort });
    
    this.wss.on('connection', (ws, req) => {
      console.log('🔗 New WebSocket connection');
      
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          switch (data.type) {
            case 'auth':
              await this.handleWebSocketAuth(ws, data);
              break;
            case 'ping':
              ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
              break;
            default:
              ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
      });
      
      ws.on('close', () => {
        // Remove connection from active connections
        for (const [userId, connection] of this.wsConnections.entries()) {
          if (connection === ws) {
            this.wsConnections.delete(userId);
            console.log(`🔌 User ${userId} disconnected`);
            break;
          }
        }
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
    
    console.log(`🔗 WebSocket server running on port ${this.options.wsPort}`);
  }

  async handleWebSocketAuth(ws, data) {
    try {
      const { token, userId } = data;
      
      if (!token || !userId) {
        ws.send(JSON.stringify({ type: 'auth_error', message: 'Token and userId required' }));
        return;
      }
      
      // Verify JWT token
      const decoded = jwt.verify(token, this.options.jwtSecret);
      
      if (decoded.userId !== userId) {
        ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid token' }));
        return;
      }
      
      // Store connection
      this.wsConnections.set(userId, ws);
      
      ws.send(JSON.stringify({ 
        type: 'auth_success', 
        message: 'Authenticated successfully',
        userId 
      }));
      
      console.log(`✅ User ${userId} authenticated via WebSocket`);
      
    } catch (error) {
      console.error('WebSocket auth error:', error);
      ws.send(JSON.stringify({ type: 'auth_error', message: 'Authentication failed' }));
    }
  }

  startBackgroundProcessors() {
    // Email processor
    setInterval(() => {
      this.processEmailQueue();
    }, 5000); // Process every 5 seconds
    
    // Push notification processor
    setInterval(() => {
      this.processPushQueue();
    }, 3000); // Process every 3 seconds
    
    // Cleanup old notifications
    setInterval(() => {
      this.cleanupOldNotifications();
    }, 60 * 60 * 1000); // Cleanup every hour
  }

  async processEmailQueue() {
    if (!this.emailTransporter || this.emailQueue.length === 0) {
      return;
    }
    
    const batch = this.emailQueue.splice(0, 10); // Process 10 emails at a time
    
    for (const emailData of batch) {
      try {
        await this.emailTransporter.sendMail(emailData.mailOptions);
        
        // Update notification status
        const notification = this.notifications.get(emailData.notificationId);
        if (notification) {
          notification.status = 'delivered';
          notification.deliveredAt = new Date().toISOString();
          this.notifications.set(emailData.notificationId, notification);
        }
        
        console.log(`📧 Email sent to ${emailData.mailOptions.to}`);
        
      } catch (error) {
        console.error('Email send error:', error);
        
        // Update notification status
        const notification = this.notifications.get(emailData.notificationId);
        if (notification) {
          notification.status = 'failed';
          notification.error = error.message;
          this.notifications.set(emailData.notificationId, notification);
        }
        
        // Retry logic
        const attempts = this.deliveryAttempts.get(emailData.notificationId) || 0;
        if (attempts < 3) {
          this.deliveryAttempts.set(emailData.notificationId, attempts + 1);
          this.emailQueue.push(emailData); // Re-queue for retry
        }
      }
    }
  }

  async processPushQueue() {
    if (this.pushQueue.length === 0) {
      return;
    }
    
    const batch = this.pushQueue.splice(0, 20); // Process 20 push notifications at a time
    
    for (const pushData of batch) {
      try {
        await webpush.sendNotification(pushData.subscription, JSON.stringify(pushData.payload));
        
        // Update notification status
        const notification = this.notifications.get(pushData.notificationId);
        if (notification) {
          notification.status = 'delivered';
          notification.deliveredAt = new Date().toISOString();
          this.notifications.set(pushData.notificationId, notification);
        }
        
        console.log(`📱 Push notification sent to user ${pushData.userId}`);
        
      } catch (error) {
        console.error('Push notification error:', error);
        
        // Update notification status
        const notification = this.notifications.get(pushData.notificationId);
        if (notification) {
          notification.status = 'failed';
          notification.error = error.message;
          this.notifications.set(pushData.notificationId, notification);
        }
        
        // Remove invalid subscriptions
        if (error.statusCode === 410) {
          this.pushSubscriptions.delete(pushData.userId);
        }
      }
    }
  }

  cleanupOldNotifications() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    for (const [id, notification] of this.notifications.entries()) {
      if (new Date(notification.createdAt) < thirtyDaysAgo) {
        this.notifications.delete(id);
        
        // Remove from user notifications
        for (const [userId, notificationIds] of this.userNotifications.entries()) {
          const index = notificationIds.indexOf(id);
          if (index > -1) {
            notificationIds.splice(index, 1);
            if (notificationIds.length === 0) {
              this.userNotifications.delete(userId);
            } else {
              this.userNotifications.set(userId, notificationIds);
            }
          }
        }
      }
    }
    
    console.log('🧹 Cleaned up old notifications');
  }

  // Route handlers
  async sendNotification(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const {
        userId,
        userIds,
        type,
        title,
        message,
        data,
        templateId,
        templateData,
        priority = 'normal',
        scheduledFor
      } = req.body;

      const recipients = userIds || (userId ? [userId] : []);
      
      if (recipients.length === 0) {
        return res.status(400).json({
          error: 'At least one recipient is required'
        });
      }

      const results = [];
      
      for (const recipientId of recipients) {
        const result = await this.createAndSendNotification({
          userId: recipientId,
          type,
          title,
          message,
          data,
          templateId,
          templateData,
          priority,
          scheduledFor,
          senderId: req.user.id
        });
        
        results.push(result);
      }

      res.json({
        message: 'Notifications sent successfully',
        results
      });

    } catch (error) {
      console.error('Send notification error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async createAndSendNotification(options) {
    const {
      userId,
      type,
      title,
      message,
      data = {},
      templateId,
      templateData = {},
      priority = 'normal',
      scheduledFor,
      senderId
    } = options;

    // Create notification record
    const notificationId = this.generateId();
    const notification = {
      id: notificationId,
      userId,
      senderId,
      type,
      title: title || '',
      message,
      data,
      templateId,
      templateData,
      priority,
      status: 'pending',
      read: false,
      createdAt: new Date().toISOString(),
      scheduledFor: scheduledFor || null,
      deliveredAt: null,
      readAt: null,
      error: null
    };

    this.notifications.set(notificationId, notification);

    // Add to user notifications
    const userNotifications = this.userNotifications.get(userId) || [];
    userNotifications.push(notificationId);
    this.userNotifications.set(userId, userNotifications);

    // Get user preferences
    const preferences = this.userPreferences.get(userId) || {
      email: true,
      push: true,
      realtime: true,
      categories: {}
    };

    // Send based on type and preferences
    if (type === 'realtime' || type === 'all') {
      if (preferences.realtime) {
        await this.sendRealtimeNotification(userId, notification);
      }
    }

    if (type === 'email' || type === 'all') {
      if (preferences.email) {
        await this.queueEmailNotification(notification);
      }
    }

    if (type === 'push' || type === 'all') {
      if (preferences.push) {
        await this.queuePushNotification(notification);
      }
    }

    return {
      notificationId,
      userId,
      status: 'queued'
    };
  }

  async sendRealtimeNotification(userId, notification) {
    const connection = this.wsConnections.get(userId);
    
    if (connection && connection.readyState === WebSocket.OPEN) {
      connection.send(JSON.stringify({
        type: 'notification',
        notification: {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          priority: notification.priority,
          createdAt: notification.createdAt
        }
      }));
      
      // Update status
      notification.status = 'delivered';
      notification.deliveredAt = new Date().toISOString();
      this.notifications.set(notification.id, notification);
      
      console.log(`⚡ Realtime notification sent to user ${userId}`);
    }
  }

  async queueEmailNotification(notification) {
    let template = null;
    let subject = notification.title;
    let content = notification.message;
    
    if (notification.templateId) {
      template = this.notificationTemplates.get(notification.templateId);
      if (template && (template.type === 'email' || template.type === 'both')) {
        subject = this.processTemplate(template.subject || template.title, notification.templateData);
        content = this.processTemplate(template.content, notification.templateData);
      }
    }
    
    // In a real implementation, get user email from user service
    const userEmail = `user-${notification.userId}@example.com`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@aithos.com',
      to: userEmail,
      subject,
      html: content
    };
    
    this.emailQueue.push({
      notificationId: notification.id,
      mailOptions
    });
  }

  async queuePushNotification(notification) {
    const subscription = this.pushSubscriptions.get(notification.userId);
    
    if (!subscription) {
      return; // User not subscribed to push notifications
    }
    
    let title = notification.title;
    let body = notification.message;
    
    if (notification.templateId) {
      const template = this.notificationTemplates.get(notification.templateId);
      if (template && (template.type === 'push' || template.type === 'both')) {
        title = this.processTemplate(template.title, notification.templateData);
        body = this.processTemplate(template.content, notification.templateData);
      }
    }
    
    const payload = {
      title,
      body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: {
        notificationId: notification.id,
        ...notification.data
      }
    };
    
    this.pushQueue.push({
      notificationId: notification.id,
      userId: notification.userId,
      subscription,
      payload
    });
  }

  processTemplate(template, data) {
    let processed = template;
    
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, value);
    }
    
    return processed;
  }

  async getUserNotifications(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { userId } = req.params;
      const { status = 'all', type, page = 1, limit = 20 } = req.query;

      // Check if user can access these notifications
      if (req.user.id !== userId && !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }

      const userNotificationIds = this.userNotifications.get(userId) || [];
      let notifications = userNotificationIds
        .map(id => this.notifications.get(id))
        .filter(n => n); // Remove any null/undefined notifications

      // Filter by status
      if (status !== 'all') {
        notifications = notifications.filter(n => {
          if (status === 'read') return n.read;
          if (status === 'unread') return !n.read;
          return true;
        });
      }

      // Filter by type
      if (type) {
        notifications = notifications.filter(n => n.type === type);
      }

      // Sort by creation date (newest first)
      notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedNotifications = notifications.slice(startIndex, endIndex);

      // Remove sensitive data
      const sanitizedNotifications = paginatedNotifications.map(n => {
        const { templateData, ...sanitized } = n;
        return sanitized;
      });

      res.json({
        notifications: sanitizedNotifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: notifications.length,
          pages: Math.ceil(notifications.length / limit)
        },
        stats: {
          total: userNotificationIds.length,
          unread: notifications.filter(n => !n.read).length,
          read: notifications.filter(n => n.read).length
        }
      });

    } catch (error) {
      console.error('Get user notifications error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      
      const notification = this.notifications.get(notificationId);
      
      if (!notification) {
        return res.status(404).json({
          error: 'Notification not found'
        });
      }

      // Check if user can access this notification
      if (req.user.id !== notification.userId && !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }

      notification.read = true;
      notification.readAt = new Date().toISOString();
      this.notifications.set(notificationId, notification);

      res.json({
        message: 'Notification marked as read'
      });

    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async markAllAsRead(req, res) {
    try {
      const { userId } = req.params;

      // Check if user can access these notifications
      if (req.user.id !== userId && !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }

      const userNotificationIds = this.userNotifications.get(userId) || [];
      let updatedCount = 0;

      for (const notificationId of userNotificationIds) {
        const notification = this.notifications.get(notificationId);
        if (notification && !notification.read) {
          notification.read = true;
          notification.readAt = new Date().toISOString();
          this.notifications.set(notificationId, notification);
          updatedCount++;
        }
      }

      res.json({
        message: 'All notifications marked as read',
        updatedCount
      });

    } catch (error) {
      console.error('Mark all as read error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async deleteNotification(req, res) {
    try {
      const { notificationId } = req.params;
      
      const notification = this.notifications.get(notificationId);
      
      if (!notification) {
        return res.status(404).json({
          error: 'Notification not found'
        });
      }

      // Check if user can delete this notification
      if (req.user.id !== notification.userId && !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }

      // Remove from notifications
      this.notifications.delete(notificationId);

      // Remove from user notifications
      const userNotifications = this.userNotifications.get(notification.userId) || [];
      const index = userNotifications.indexOf(notificationId);
      if (index > -1) {
        userNotifications.splice(index, 1);
        this.userNotifications.set(notification.userId, userNotifications);
      }

      res.json({
        message: 'Notification deleted successfully'
      });

    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  // Helper methods
  authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Access token is required'
      });
    }

    try {
      const decoded = jwt.verify(token, this.options.jwtSecret);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid or expired token'
      });
    }
  }

  requireRole(roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          error: 'Insufficient permissions'
        });
      }

      next();
    };
  }

  // Notification preferences methods
  async getNotificationPreferences(req, res) {
    try {
      const { userId } = req.params;
      
      // Check if user can access these preferences
      if (req.user.id !== userId && !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }
      
      const preferences = this.userPreferences.get(userId) || {
        email: true,
        push: true,
        realtime: true,
        categories: {
          system: true,
          security: true,
          updates: true,
          marketing: false
        }
      };
      
      res.json({ preferences });
      
    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async updateNotificationPreferences(req, res) {
    try {
      const { userId } = req.params;
      const updates = req.body;
      
      // Check if user can update these preferences
      if (req.user.id !== userId && !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }
      
      const currentPreferences = this.userPreferences.get(userId) || {};
      const updatedPreferences = { ...currentPreferences, ...updates };
      
      this.userPreferences.set(userId, updatedPreferences);
      
      res.json({
        message: 'Preferences updated successfully',
        preferences: updatedPreferences
      });
      
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  // Push subscription methods
  async subscribeToPush(req, res) {
    try {
      const { userId, subscription } = req.body;
      
      // Check if user can manage this subscription
      if (req.user.id !== userId && !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }
      
      this.pushSubscriptions.set(userId, subscription);
      
      res.json({
        message: 'Push subscription registered successfully'
      });
      
    } catch (error) {
      console.error('Subscribe to push error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async unsubscribeFromPush(req, res) {
    try {
      const { userId } = req.params;
      
      // Check if user can manage this subscription
      if (req.user.id !== userId && !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }
      
      this.pushSubscriptions.delete(userId);
      
      res.json({
        message: 'Push subscription removed successfully'
      });
      
    } catch (error) {
      console.error('Unsubscribe from push error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  // Template management methods
  async getTemplates(req, res) {
    try {
      const templates = Array.from(this.notificationTemplates.values());
      res.json({ templates });
      
    } catch (error) {
      console.error('Get templates error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async createTemplate(req, res) {
    try {
      const templateData = req.body;
      
      if (this.notificationTemplates.has(templateData.id)) {
        return res.status(409).json({
          error: 'Template with this ID already exists'
        });
      }
      
      const template = {
        ...templateData,
        createdAt: new Date().toISOString(),
        createdBy: req.user.id
      };
      
      this.notificationTemplates.set(templateData.id, template);
      
      res.status(201).json({
        message: 'Template created successfully',
        template
      });
      
    } catch (error) {
      console.error('Create template error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async updateTemplate(req, res) {
    try {
      const { templateId } = req.params;
      const updates = req.body;
      
      const template = this.notificationTemplates.get(templateId);
      
      if (!template) {
        return res.status(404).json({
          error: 'Template not found'
        });
      }
      
      const updatedTemplate = {
        ...template,
        ...updates,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.id
      };
      
      this.notificationTemplates.set(templateId, updatedTemplate);
      
      res.json({
        message: 'Template updated successfully',
        template: updatedTemplate
      });
      
    } catch (error) {
      console.error('Update template error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async deleteTemplate(req, res) {
    try {
      const { templateId } = req.params;
      
      if (!this.notificationTemplates.has(templateId)) {
        return res.status(404).json({
          error: 'Template not found'
        });
      }
      
      this.notificationTemplates.delete(templateId);
      
      res.json({
        message: 'Template deleted successfully'
      });
      
    } catch (error) {
      console.error('Delete template error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  // Analytics methods
  async getAnalytics(req, res) {
    try {
      const { startDate, endDate, type } = req.query;
      
      const analytics = {
        totalNotifications: this.notifications.size,
        deliveredNotifications: 0,
        failedNotifications: 0,
        readNotifications: 0,
        unreadNotifications: 0,
        byType: {
          email: 0,
          push: 0,
          realtime: 0
        },
        byStatus: {
          pending: 0,
          delivered: 0,
          failed: 0
        }
      };
      
      // Calculate analytics from notifications
      for (const notification of this.notifications.values()) {
        // Filter by date range if provided
        if (startDate && new Date(notification.createdAt) < new Date(startDate)) continue;
        if (endDate && new Date(notification.createdAt) > new Date(endDate)) continue;
        
        // Filter by type if provided
        if (type && notification.type !== type) continue;
        
        // Count by status
        analytics.byStatus[notification.status] = (analytics.byStatus[notification.status] || 0) + 1;
        
        // Count by type
        analytics.byType[notification.type] = (analytics.byType[notification.type] || 0) + 1;
        
        // Count read/unread
        if (notification.read) {
          analytics.readNotifications++;
        } else {
          analytics.unreadNotifications++;
        }
        
        // Count delivered/failed
        if (notification.status === 'delivered') {
          analytics.deliveredNotifications++;
        } else if (notification.status === 'failed') {
          analytics.failedNotifications++;
        }
      }
      
      res.json({ analytics });
      
    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  // Bulk operations
  async bulkSendNotifications(req, res) {
    try {
      const { userIds, templateId, templateData = {}, type } = req.body;
      
      const template = this.notificationTemplates.get(templateId);
      
      if (!template) {
        return res.status(404).json({
          error: 'Template not found'
        });
      }
      
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };
      
      for (const userId of userIds) {
        try {
          const notificationData = {
            userId,
            type: type === 'all' ? template.type : type,
            title: this.processTemplate(template.title || template.subject, templateData),
            content: this.processTemplate(template.content, templateData),
            templateId,
            priority: 'normal'
          };
          
          await this.sendNotificationInternal(notificationData);
          results.success++;
          
        } catch (error) {
          results.failed++;
          results.errors.push({
            userId,
            error: error.message
          });
        }
      }
      
      res.json({
        message: 'Bulk notification sending completed',
        results
      });
      
    } catch (error) {
      console.error('Bulk send notifications error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  processTemplate(template, data) {
    if (!template) return '';
    
    let processed = template;
    for (const [key, value] of Object.entries(data)) {
      processed = processed.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return processed;
  }

  async sendNotificationInternal(notificationData) {
    const notificationId = this.generateId();
    
    const notification = {
      id: notificationId,
      ...notificationData,
      status: 'pending',
      read: false,
      createdAt: new Date().toISOString(),
      attempts: 0
    };
    
    // Store notification
    this.notifications.set(notificationId, notification);
    
    // Add to user's notifications
    const userNotifications = this.userNotifications.get(notificationData.userId) || [];
    userNotifications.push(notificationId);
    this.userNotifications.set(notificationData.userId, userNotifications);
    
    // Send based on type
    switch (notificationData.type) {
      case 'email':
        await this.sendEmailNotification(notification);
        break;
      case 'push':
        await this.sendPushNotification(notification);
        break;
      case 'realtime':
        await this.sendRealtimeNotification(notification);
        break;
      case 'all':
        await this.sendEmailNotification(notification);
        await this.sendPushNotification(notification);
        await this.sendRealtimeNotification(notification);
        break;
    }
    
    return notification;
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.options.port, (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`🔔 Notification Service running on port ${this.options.port}`);
          this.emit('started', { port: this.options.port, wsPort: this.options.wsPort });
          resolve();
        }
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      const promises = [];
      
      if (this.server) {
        promises.push(new Promise(res => this.server.close(res)));
      }
      
      if (this.wss) {
        promises.push(new Promise(res => this.wss.close(res)));
      }
      
      Promise.all(promises).then(() => {
        console.log('🔔 Notification Service stopped');
        this.emit('stopped');
        resolve();
      });
    });
  }

  getStats() {
    return {
      notifications: this.notifications.size,
      activeConnections: this.wsConnections.size,
      emailQueue: this.emailQueue.length,
      pushQueue: this.pushQueue.length,
      templates: this.notificationTemplates.size,
      subscriptions: this.pushSubscriptions.size,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }
}

export default NotificationService;
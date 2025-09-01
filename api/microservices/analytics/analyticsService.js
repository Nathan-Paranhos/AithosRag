import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { body, query, validationResult } from 'express-validator';
import EventEmitter from 'events';
import fs from 'fs/promises';
import path from 'path';

class AnalyticsService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      port: options.port || 3004,
      dataRetentionDays: options.dataRetentionDays || 90,
      rateLimitWindow: options.rateLimitWindow || 60 * 1000,
      rateLimitMax: options.rateLimitMax || 100,
      metricsInterval: options.metricsInterval || 60000, 
      ...options
    };

    this.app = express();
    this.server = null;
    
    this.metrics = new Map();
    this.events = [];
    this.userSessions = new Map();
    this.systemMetrics = [];
    this.apiMetrics = new Map();
    this.errorLogs = [];
    
    this.realtimeMetrics = {
      activeUsers: 0,
      requestsPerMinute: 0,
      averageResponseTime: 0,
      errorRate: 0,
      systemLoad: 0,
      memoryUsage: 0
    };
    
    this.setupMiddleware();
    this.setupRoutes();
    this.startMetricsCollection();
  }

  setupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true
    }));
    
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Rate limiting
    const analyticsLimiter = rateLimit({
      windowMs: this.options.rateLimitWindow,
      max: this.options.rateLimitMax,
      message: {
        error: 'Too many analytics requests, please slow down'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    this.app.use('/analytics', analyticsLimiter);

    this.app.use((req, res, next) => {
      const startTime = Date.now();
      
      console.log(`Analytics Service: ${req.method} ${req.path} - ${req.ip}`);
      
      const endpoint = `${req.method} ${req.path}`;
      if (!this.apiMetrics.has(endpoint)) {
        this.apiMetrics.set(endpoint, {
          requests: 0,
          totalResponseTime: 0,
          errors: 0,
          lastAccessed: null
        });
      }
      
      const metric = this.apiMetrics.get(endpoint);
      metric.requests++;
      metric.lastAccessed = new Date().toISOString();
      
      const originalEnd = res.end;
      res.end = function(...args) {
        const responseTime = Date.now() - startTime;
        metric.totalResponseTime += responseTime;
        
        if (res.statusCode >= 400) {
          metric.errors++;
        }
        
        originalEnd.apply(this, args);
      };
      
      next();
    });

    this.app.use((req, res, next) => {
      const authHeader = req.headers['authorization'];
      if (authHeader) {
        req.user = {
          id: 'user-123',
          email: 'user@example.com',
          name: 'Test User',
          role: 'admin'
        };
      }
      next();
    });
  }

  setupRoutes() {
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'analytics-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        metrics: {
          totalEvents: this.events.length,
          activeMetrics: this.metrics.size,
          activeSessions: this.userSessions.size
        }
      });
    });

    this.app.post('/analytics/events', [
      body('event').isString().isLength({ min: 1, max: 100 }),
      body('category').optional().isString().isLength({ max: 50 }),
      body('properties').optional().isObject(),
      body('userId').optional().isString(),
      body('sessionId').optional().isString()
    ], this.trackEvent.bind(this));

    this.app.get('/analytics/dashboard', this.getDashboardMetrics.bind(this));

    this.app.get('/analytics/realtime', this.getRealtimeMetrics.bind(this));

    this.app.get('/analytics/users', [
      query('startDate').optional().isISO8601(),
      query('endDate').optional().isISO8601(),
      query('groupBy').optional().isIn(['day', 'week', 'month'])
    ], this.getUserAnalytics.bind(this));

    // Get conversation analytics
    this.app.get('/analytics/conversations', [
      query('startDate').optional().isISO8601(),
      query('endDate').optional().isISO8601(),
      query('groupBy').optional().isIn(['day', 'week', 'month'])
    ], this.getConversationAnalytics.bind(this));

    // Get system performance
    this.app.get('/analytics/performance', [
      query('startDate').optional().isISO8601(),
      query('endDate').optional().isISO8601(),
      query('metric').optional().isIn(['cpu', 'memory', 'disk', 'network', 'response_time'])
    ], this.getPerformanceMetrics.bind(this));

    // Get API metrics
    this.app.get('/analytics/api', this.getApiMetrics.bind(this));

    // Get error analytics
    this.app.get('/analytics/errors', [
      query('startDate').optional().isISO8601(),
      query('endDate').optional().isISO8601(),
      query('severity').optional().isIn(['low', 'medium', 'high', 'critical'])
    ], this.getErrorAnalytics.bind(this));

    // Get custom reports
    this.app.post('/analytics/reports', [
      body('name').isString().isLength({ min: 1, max: 100 }),
      body('type').isIn(['user_engagement', 'system_performance', 'business_metrics', 'custom']),
      body('filters').optional().isObject(),
      body('dateRange').isObject(),
      body('groupBy').optional().isString(),
      body('metrics').isArray()
    ], this.generateCustomReport.bind(this));

    // Export analytics data
    this.app.get('/analytics/export', [
      query('format').optional().isIn(['json', 'csv', 'xlsx']),
      query('startDate').optional().isISO8601(),
      query('endDate').optional().isISO8601(),
      query('type').optional().isIn(['events', 'metrics', 'users', 'conversations'])
    ], this.exportAnalytics.bind(this));

    // Get funnel analysis
    this.app.post('/analytics/funnel', [
      body('steps').isArray().notEmpty(),
      body('startDate').optional().isISO8601(),
      body('endDate').optional().isISO8601(),
      body('filters').optional().isObject()
    ], this.getFunnelAnalysis.bind(this));

    // Get cohort analysis
    this.app.get('/analytics/cohort', [
      query('startDate').optional().isISO8601(),
      query('endDate').optional().isISO8601(),
      query('period').optional().isIn(['day', 'week', 'month'])
    ], this.getCohortAnalysis.bind(this));
  }

  startMetricsCollection() {
    // Collect system metrics every minute
    setInterval(() => {
      this.collectSystemMetrics();
    }, this.options.metricsInterval);

    // Update real-time metrics every 10 seconds
    setInterval(() => {
      this.updateRealtimeMetrics();
    }, 10000);

    // Clean old data every hour
    setInterval(() => {
      this.cleanOldData();
    }, 60 * 60 * 1000);
  }

  async collectSystemMetrics() {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        cpu: {
          usage: Math.random() * 100, // Simulate CPU usage
          loadAverage: [Math.random() * 2, Math.random() * 2, Math.random() * 2]
        },
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        activeConnections: this.userSessions.size,
        requestsPerMinute: this.calculateRequestsPerMinute(),
        averageResponseTime: this.calculateAverageResponseTime(),
        errorRate: this.calculateErrorRate()
      };

      this.systemMetrics.push(metrics);
      
      // Keep only last 24 hours of system metrics
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      this.systemMetrics = this.systemMetrics.filter(m => 
        new Date(m.timestamp).getTime() > oneDayAgo
      );

      this.emit('systemMetricsCollected', metrics);
    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }
  }

  updateRealtimeMetrics() {
    this.realtimeMetrics = {
      activeUsers: this.userSessions.size,
      requestsPerMinute: this.calculateRequestsPerMinute(),
      averageResponseTime: this.calculateAverageResponseTime(),
      errorRate: this.calculateErrorRate(),
      systemLoad: Math.random() * 100, // Simulate system load
      memoryUsage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
    };
  }

  calculateRequestsPerMinute() {
    const oneMinuteAgo = Date.now() - 60000;
    return this.events.filter(event => 
      new Date(event.timestamp).getTime() > oneMinuteAgo
    ).length;
  }

  calculateAverageResponseTime() {
    let totalTime = 0;
    let totalRequests = 0;
    
    for (const metric of this.apiMetrics.values()) {
      if (metric.requests > 0) {
        totalTime += metric.totalResponseTime;
        totalRequests += metric.requests;
      }
    }
    
    return totalRequests > 0 ? Math.round(totalTime / totalRequests) : 0;
  }

  calculateErrorRate() {
    let totalErrors = 0;
    let totalRequests = 0;
    
    for (const metric of this.apiMetrics.values()) {
      totalErrors += metric.errors;
      totalRequests += metric.requests;
    }
    
    return totalRequests > 0 ? Math.round((totalErrors / totalRequests) * 100 * 100) / 100 : 0;
  }

  cleanOldData() {
    const cutoffDate = Date.now() - (this.options.dataRetentionDays * 24 * 60 * 60 * 1000);
    
    // Clean old events
    this.events = this.events.filter(event => 
      new Date(event.timestamp).getTime() > cutoffDate
    );
    
    // Clean old error logs
    this.errorLogs = this.errorLogs.filter(error => 
      new Date(error.timestamp).getTime() > cutoffDate
    );
    
    console.log(`🧹 Cleaned old analytics data (retention: ${this.options.dataRetentionDays} days)`);
  }

  async trackEvent(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { event, category, properties = {}, userId, sessionId } = req.body;
      
      const eventData = {
        id: this.generateId(),
        event,
        category: category || 'general',
        properties,
        userId: userId || req.user?.id,
        sessionId: sessionId || req.sessionID,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        referer: req.headers['referer']
      };

      this.events.push(eventData);
      
      // Update user session
      if (eventData.userId) {
        if (!this.userSessions.has(eventData.userId)) {
          this.userSessions.set(eventData.userId, {
            userId: eventData.userId,
            sessionId: eventData.sessionId,
            startTime: eventData.timestamp,
            lastActivity: eventData.timestamp,
            events: [],
            pageViews: 0,
            interactions: 0
          });
        }
        
        const session = this.userSessions.get(eventData.userId);
        session.lastActivity = eventData.timestamp;
        session.events.push(eventData);
        
        if (event === 'page_view') session.pageViews++;
        if (event === 'click' || event === 'interaction') session.interactions++;
      }

      this.emit('eventTracked', eventData);

      res.status(201).json({
        message: 'Event tracked successfully',
        eventId: eventData.id
      });

    } catch (error) {
      console.error('Track event error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async getDashboardMetrics(req, res) {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Calculate metrics
      const todayEvents = this.events.filter(e => new Date(e.timestamp) >= today);
      const yesterdayEvents = this.events.filter(e => 
        new Date(e.timestamp) >= yesterday && new Date(e.timestamp) < today
      );
      const weekEvents = this.events.filter(e => new Date(e.timestamp) >= thisWeek);
      const monthEvents = this.events.filter(e => new Date(e.timestamp) >= thisMonth);

      const uniqueUsersToday = new Set(todayEvents.map(e => e.userId)).size;
      const uniqueUsersYesterday = new Set(yesterdayEvents.map(e => e.userId)).size;
      const uniqueUsersWeek = new Set(weekEvents.map(e => e.userId)).size;
      const uniqueUsersMonth = new Set(monthEvents.map(e => e.userId)).size;

      const dashboard = {
        overview: {
          totalUsers: this.userSessions.size,
          activeUsers: this.realtimeMetrics.activeUsers,
          totalEvents: this.events.length,
          totalSessions: this.userSessions.size
        },
        today: {
          users: uniqueUsersToday,
          events: todayEvents.length,
          sessions: todayEvents.filter(e => e.event === 'session_start').length,
          pageViews: todayEvents.filter(e => e.event === 'page_view').length
        },
        comparisons: {
          usersVsYesterday: this.calculatePercentageChange(uniqueUsersToday, uniqueUsersYesterday),
          eventsVsYesterday: this.calculatePercentageChange(todayEvents.length, yesterdayEvents.length)
        },
        trends: {
          week: {
            users: uniqueUsersWeek,
            events: weekEvents.length
          },
          month: {
            users: uniqueUsersMonth,
            events: monthEvents.length
          }
        },
        topEvents: this.getTopEvents(monthEvents),
        topPages: this.getTopPages(monthEvents),
        deviceTypes: this.getDeviceTypes(monthEvents),
        realtime: this.realtimeMetrics
      };

      res.json({ dashboard });

    } catch (error) {
      console.error('Get dashboard metrics error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async getRealtimeMetrics(req, res) {
    try {
      const recentEvents = this.events.filter(e => 
        new Date(e.timestamp).getTime() > Date.now() - 5 * 60 * 1000 // Last 5 minutes
      );

      const realtime = {
        ...this.realtimeMetrics,
        recentEvents: recentEvents.slice(-10), // Last 10 events
        eventsPerMinute: this.getEventsPerMinute(),
        topActivePages: this.getTopActivePages(),
        activeUserLocations: this.getActiveUserLocations(),
        systemHealth: {
          cpu: Math.random() * 100,
          memory: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
          uptime: process.uptime(),
          responseTime: this.realtimeMetrics.averageResponseTime
        }
      };

      res.json({ realtime });

    } catch (error) {
      console.error('Get realtime metrics error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async getUserAnalytics(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { startDate, endDate, groupBy = 'day' } = req.query;
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const filteredEvents = this.events.filter(e => {
        const eventDate = new Date(e.timestamp);
        return eventDate >= start && eventDate <= end;
      });

      const analytics = {
        summary: {
          totalUsers: new Set(filteredEvents.map(e => e.userId)).size,
          totalSessions: new Set(filteredEvents.map(e => e.sessionId)).size,
          totalEvents: filteredEvents.length,
          averageSessionDuration: this.calculateAverageSessionDuration(filteredEvents),
          bounceRate: this.calculateBounceRate(filteredEvents)
        },
        timeline: this.groupEventsByTime(filteredEvents, groupBy),
        userSegments: this.getUserSegments(filteredEvents),
        topUsers: this.getTopUsers(filteredEvents),
        userJourney: this.getUserJourney(filteredEvents)
      };

      res.json({ analytics });

    } catch (error) {
      console.error('Get user analytics error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async getConversationAnalytics(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { startDate, endDate, groupBy = 'day' } = req.query;
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const conversationEvents = this.events.filter(e => {
        const eventDate = new Date(e.timestamp);
        return eventDate >= start && eventDate <= end && 
               (e.event.includes('conversation') || e.event.includes('message'));
      });

      const analytics = {
        summary: {
          totalConversations: conversationEvents.filter(e => e.event === 'conversation_created').length,
          totalMessages: conversationEvents.filter(e => e.event === 'message_sent').length,
          averageMessagesPerConversation: this.calculateAverageMessagesPerConversation(conversationEvents),
          averageConversationDuration: this.calculateAverageConversationDuration(conversationEvents),
          completionRate: this.calculateConversationCompletionRate(conversationEvents)
        },
        timeline: this.groupEventsByTime(conversationEvents, groupBy),
        modelUsage: this.getModelUsage(conversationEvents),
        topicAnalysis: this.getTopicAnalysis(conversationEvents),
        userSatisfaction: this.getUserSatisfaction(conversationEvents)
      };

      res.json({ analytics });

    } catch (error) {
      console.error('Get conversation analytics error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async getPerformanceMetrics(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { startDate, endDate, metric } = req.query;
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const filteredMetrics = this.systemMetrics.filter(m => {
        const metricDate = new Date(m.timestamp);
        return metricDate >= start && metricDate <= end;
      });

      const performance = {
        summary: {
          averageResponseTime: this.realtimeMetrics.averageResponseTime,
          errorRate: this.realtimeMetrics.errorRate,
          uptime: process.uptime(),
          memoryUsage: this.realtimeMetrics.memoryUsage,
          systemLoad: this.realtimeMetrics.systemLoad
        },
        timeline: filteredMetrics.map(m => ({
          timestamp: m.timestamp,
          cpu: m.cpu.usage,
          memory: (m.memory.heapUsed / m.memory.heapTotal) * 100,
          responseTime: m.averageResponseTime,
          errorRate: m.errorRate,
          activeConnections: m.activeConnections
        })),
        apiPerformance: Array.from(this.apiMetrics.entries()).map(([endpoint, data]) => ({
          endpoint,
          requests: data.requests,
          averageResponseTime: data.requests > 0 ? Math.round(data.totalResponseTime / data.requests) : 0,
          errorRate: data.requests > 0 ? Math.round((data.errors / data.requests) * 100 * 100) / 100 : 0,
          lastAccessed: data.lastAccessed
        })),
        alerts: this.generatePerformanceAlerts(filteredMetrics)
      };

      res.json({ performance });

    } catch (error) {
      console.error('Get performance metrics error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async getApiMetrics(req, res) {
    try {
      const apiStats = Array.from(this.apiMetrics.entries()).map(([endpoint, data]) => ({
        endpoint,
        requests: data.requests,
        averageResponseTime: data.requests > 0 ? Math.round(data.totalResponseTime / data.requests) : 0,
        errorRate: data.requests > 0 ? Math.round((data.errors / data.requests) * 100 * 100) / 100 : 0,
        errors: data.errors,
        lastAccessed: data.lastAccessed
      }));

      // Sort by request count
      apiStats.sort((a, b) => b.requests - a.requests);

      res.json({
        apiMetrics: {
          endpoints: apiStats,
          summary: {
            totalRequests: apiStats.reduce((sum, api) => sum + api.requests, 0),
            totalErrors: apiStats.reduce((sum, api) => sum + api.errors, 0),
            averageResponseTime: this.realtimeMetrics.averageResponseTime,
            overallErrorRate: this.realtimeMetrics.errorRate
          }
        }
      });

    } catch (error) {
      console.error('Get API metrics error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async getErrorAnalytics(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { startDate, endDate, severity } = req.query;
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      let filteredErrors = this.errorLogs.filter(error => {
        const errorDate = new Date(error.timestamp);
        return errorDate >= start && errorDate <= end;
      });

      if (severity) {
        filteredErrors = filteredErrors.filter(error => error.severity === severity);
      }

      const errorAnalytics = {
        summary: {
          totalErrors: filteredErrors.length,
          criticalErrors: filteredErrors.filter(e => e.severity === 'critical').length,
          highErrors: filteredErrors.filter(e => e.severity === 'high').length,
          mediumErrors: filteredErrors.filter(e => e.severity === 'medium').length,
          lowErrors: filteredErrors.filter(e => e.severity === 'low').length
        },
        timeline: this.groupErrorsByTime(filteredErrors),
        topErrors: this.getTopErrors(filteredErrors),
        errorsByEndpoint: this.getErrorsByEndpoint(filteredErrors),
        errorTrends: this.getErrorTrends(filteredErrors)
      };

      res.json({ errorAnalytics });

    } catch (error) {
      console.error('Get error analytics error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async generateCustomReport(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { name, type, filters = {}, dateRange, groupBy, metrics } = req.body;
      
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);

      const filteredEvents = this.events.filter(e => {
        const eventDate = new Date(e.timestamp);
        let matches = eventDate >= start && eventDate <= end;
        
        // Apply filters
        if (filters.userId && e.userId !== filters.userId) matches = false;
        if (filters.event && e.event !== filters.event) matches = false;
        if (filters.category && e.category !== filters.category) matches = false;
        
        return matches;
      });

      const report = {
        id: this.generateId(),
        name,
        type,
        generatedAt: new Date().toISOString(),
        dateRange,
        filters,
        data: this.calculateCustomMetrics(filteredEvents, metrics, groupBy),
        summary: this.generateReportSummary(filteredEvents, type)
      };

      res.json({
        message: 'Custom report generated successfully',
        report
      });

    } catch (error) {
      console.error('Generate custom report error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async exportAnalytics(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { format = 'json', startDate, endDate, type = 'events' } = req.query;
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      let data;
      let filename;

      switch (type) {
        case 'events':
          data = this.events.filter(e => {
            const eventDate = new Date(e.timestamp);
            return eventDate >= start && eventDate <= end;
          });
          filename = `events-${start.toISOString().split('T')[0]}-${end.toISOString().split('T')[0]}`;
          break;
        
        case 'metrics':
          data = this.systemMetrics.filter(m => {
            const metricDate = new Date(m.timestamp);
            return metricDate >= start && metricDate <= end;
          });
          filename = `metrics-${start.toISOString().split('T')[0]}-${end.toISOString().split('T')[0]}`;
          break;
        
        default:
          return res.status(400).json({
            error: 'Invalid export type'
          });
      }

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
        res.json(data);
      } else if (format === 'csv') {
        const csv = this.convertToCSV(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(csv);
      } else {
        res.status(400).json({
          error: 'Unsupported export format'
        });
      }

    } catch (error) {
      console.error('Export analytics error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async getFunnelAnalysis(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { steps, startDate, endDate, filters = {} } = req.body;
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const funnelAnalysis = this.calculateFunnelAnalysis(steps, start, end, filters);

      res.json({ funnelAnalysis });

    } catch (error) {
      console.error('Get funnel analysis error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  async getCohortAnalysis(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { startDate, endDate, period = 'week' } = req.query;
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const cohortAnalysis = this.calculateCohortAnalysis(start, end, period);

      res.json({ cohortAnalysis });

    } catch (error) {
      console.error('Get cohort analysis error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  // Helper methods
  calculatePercentageChange(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 100) / 100;
  }

  getTopEvents(events) {
    const eventCounts = {};
    events.forEach(e => {
      eventCounts[e.event] = (eventCounts[e.event] || 0) + 1;
    });
    
    return Object.entries(eventCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([event, count]) => ({ event, count }));
  }

  getTopPages(events) {
    const pageCounts = {};
    events.filter(e => e.event === 'page_view').forEach(e => {
      const page = e.properties?.page || 'unknown';
      pageCounts[page] = (pageCounts[page] || 0) + 1;
    });
    
    return Object.entries(pageCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([page, views]) => ({ page, views }));
  }

  getDeviceTypes(events) {
    const deviceCounts = {};
    events.forEach(e => {
      const device = this.parseDeviceType(e.userAgent);
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    });
    
    return Object.entries(deviceCounts)
      .map(([device, count]) => ({ device, count }));
  }

  parseDeviceType(userAgent) {
    if (!userAgent) return 'unknown';
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) return 'mobile';
    if (/Tablet/.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  getEventsPerMinute() {
    const now = Date.now();
    const minutes = [];
    
    for (let i = 0; i < 10; i++) {
      const minuteStart = now - (i + 1) * 60000;
      const minuteEnd = now - i * 60000;
      const count = this.events.filter(e => {
        const eventTime = new Date(e.timestamp).getTime();
        return eventTime >= minuteStart && eventTime < minuteEnd;
      }).length;
      
      minutes.unshift({ minute: i, count });
    }
    
    return minutes;
  }

  getTopActivePages() {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentPageViews = this.events.filter(e => 
      e.event === 'page_view' && new Date(e.timestamp).getTime() > fiveMinutesAgo
    );
    
    const pageCounts = {};
    recentPageViews.forEach(e => {
      const page = e.properties?.page || 'unknown';
      pageCounts[page] = (pageCounts[page] || 0) + 1;
    });
    
    return Object.entries(pageCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([page, views]) => ({ page, views }));
  }

  getActiveUserLocations() {
    // Simulate user locations (in production, use GeoIP)
    const locations = ['US', 'UK', 'CA', 'DE', 'FR', 'JP', 'AU', 'BR'];
    return locations.map(country => ({
      country,
      users: Math.floor(Math.random() * 50) + 1
    }));
  }

  convertToCSV(data) {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
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
          console.log(`📊 Analytics Service running on port ${this.options.port}`);
          this.emit('started', { port: this.options.port });
          resolve();
        }
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('📊 Analytics Service stopped');
          this.emit('stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getStats() {
    return {
      events: this.events.length,
      metrics: this.metrics.size,
      sessions: this.userSessions.size,
      systemMetrics: this.systemMetrics.length,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }
}

export default AnalyticsService;
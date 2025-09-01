// Analytics Service Implementation
import { IAnalyticsService } from '../../application/interfaces/IGroqService';

interface AnalyticsEvent {
  id: string;
  event: string;
  properties: Record<string, any>;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

interface PerformanceMetric {
  id: string;
  metric: string;
  value: number;
  tags: Record<string, string>;
  timestamp: Date;
}

export class AnalyticsService implements IAnalyticsService {
  private events: AnalyticsEvent[] = [];
  private metrics: PerformanceMetric[] = [];
  private userActions: Map<string, AnalyticsEvent[]> = new Map();

  async trackEvent(event: string, properties: Record<string, any>): Promise<void> {
    const analyticsEvent: AnalyticsEvent = {
      id: this.generateId(),
      event,
      properties: {
        ...properties,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
        url: typeof window !== 'undefined' ? window.location.href : 'server',
        referrer: typeof document !== 'undefined' ? document.referrer : 'direct'
      },
      timestamp: new Date(),
      sessionId: this.getSessionId()
    };

    this.events.push(analyticsEvent);
    
    // Keep only last 10000 events to prevent memory issues
    if (this.events.length > 10000) {
      this.events = this.events.slice(-5000);
    }

    console.log(`📊 Analytics Event: ${event}`, properties);
    
    // In a real implementation, send to analytics service
    this.sendToAnalyticsProvider(analyticsEvent);
  }

  async trackUserAction(
    userId: string,
    action: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const event: AnalyticsEvent = {
      id: this.generateId(),
      event: `user_action:${action}`,
      properties: {
        action,
        userId,
        ...metadata
      },
      timestamp: new Date(),
      userId,
      sessionId: this.getSessionId()
    };

    // Store in user-specific actions
    const userEvents = this.userActions.get(userId) || [];
    userEvents.push(event);
    
    // Keep only last 1000 actions per user
    if (userEvents.length > 1000) {
      userEvents.splice(0, userEvents.length - 1000);
    }
    
    this.userActions.set(userId, userEvents);
    
    // Also store in general events
    this.events.push(event);

    console.log(`👤 User Action: ${userId} - ${action}`, metadata);
  }

  async trackPerformance(
    metric: string,
    value: number,
    tags?: Record<string, string>
  ): Promise<void> {
    const performanceMetric: PerformanceMetric = {
      id: this.generateId(),
      metric,
      value,
      tags: tags || {},
      timestamp: new Date()
    };

    this.metrics.push(performanceMetric);
    
    // Keep only last 5000 metrics
    if (this.metrics.length > 5000) {
      this.metrics = this.metrics.slice(-2500);
    }

    console.log(`⚡ Performance Metric: ${metric} = ${value}`, tags);
    
    // Send to performance monitoring service
    this.sendToPerformanceMonitoring(performanceMetric);
  }

  async getMetrics(timeRange: string): Promise<Record<string, any>> {
    const now = new Date();
    let startTime: Date;

    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const filteredEvents = this.events.filter(
      event => event.timestamp >= startTime
    );
    
    const filteredMetrics = this.metrics.filter(
      metric => metric.timestamp >= startTime
    );

    return {
      timeRange,
      period: {
        start: startTime,
        end: now
      },
      events: {
        total: filteredEvents.length,
        byType: this.groupBy(filteredEvents, 'event'),
        timeline: this.createTimeline(filteredEvents, timeRange)
      },
      performance: {
        metrics: this.aggregateMetrics(filteredMetrics),
        averages: this.calculateAverages(filteredMetrics),
        trends: this.calculateTrends(filteredMetrics)
      },
      users: {
        active: this.getActiveUsers(filteredEvents),
        actions: this.getUserActionSummary(filteredEvents)
      }
    };
  }

  // Utility methods
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSessionId(): string {
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('analytics_session_id');
      if (!sessionId) {
        sessionId = this.generateId();
        sessionStorage.setItem('analytics_session_id', sessionId);
      }
      return sessionId;
    }
    return 'server-session';
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = String(item[key]);
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private createTimeline(events: AnalyticsEvent[], timeRange: string): Record<string, number> {
    const bucketSize = this.getBucketSize(timeRange);
    const timeline: Record<string, number> = {};

    events.forEach(event => {
      const bucket = this.getBucket(event.timestamp, bucketSize);
      timeline[bucket] = (timeline[bucket] || 0) + 1;
    });

    return timeline;
  }

  private getBucketSize(timeRange: string): number {
    switch (timeRange) {
      case '1h': return 5 * 60 * 1000; // 5 minutes
      case '24h': return 60 * 60 * 1000; // 1 hour
      case '7d': return 24 * 60 * 60 * 1000; // 1 day
      case '30d': return 24 * 60 * 60 * 1000; // 1 day
      default: return 60 * 60 * 1000;
    }
  }

  private getBucket(timestamp: Date, bucketSize: number): string {
    const bucketTime = Math.floor(timestamp.getTime() / bucketSize) * bucketSize;
    return new Date(bucketTime).toISOString();
  }

  private aggregateMetrics(metrics: PerformanceMetric[]): Record<string, any> {
    const aggregated: Record<string, any> = {};

    metrics.forEach(metric => {
      if (!aggregated[metric.metric]) {
        aggregated[metric.metric] = {
          count: 0,
          sum: 0,
          min: Infinity,
          max: -Infinity,
          values: []
        };
      }

      const agg = aggregated[metric.metric];
      agg.count++;
      agg.sum += metric.value;
      agg.min = Math.min(agg.min, metric.value);
      agg.max = Math.max(agg.max, metric.value);
      agg.values.push(metric.value);
    });

    // Calculate averages and percentiles
    Object.keys(aggregated).forEach(key => {
      const agg = aggregated[key];
      agg.average = agg.sum / agg.count;
      agg.values.sort((a, b) => a - b);
      agg.p50 = this.percentile(agg.values, 0.5);
      agg.p95 = this.percentile(agg.values, 0.95);
      agg.p99 = this.percentile(agg.values, 0.99);
      delete agg.values; // Remove raw values to save memory
    });

    return aggregated;
  }

  private calculateAverages(metrics: PerformanceMetric[]): Record<string, number> {
    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};

    metrics.forEach(metric => {
      sums[metric.metric] = (sums[metric.metric] || 0) + metric.value;
      counts[metric.metric] = (counts[metric.metric] || 0) + 1;
    });

    const averages: Record<string, number> = {};
    Object.keys(sums).forEach(key => {
      averages[key] = sums[key] / counts[key];
    });

    return averages;
  }

  private calculateTrends(metrics: PerformanceMetric[]): Record<string, string> {
    // Simple trend calculation - would be more sophisticated in real implementation
    const trends: Record<string, string> = {};
    const metricGroups = this.groupMetricsByName(metrics);

    Object.keys(metricGroups).forEach(metricName => {
      const values = metricGroups[metricName]
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        .map(m => m.value);

      if (values.length >= 2) {
        const first = values[0];
        const last = values[values.length - 1];
        const change = ((last - first) / first) * 100;
        
        if (change > 5) trends[metricName] = 'increasing';
        else if (change < -5) trends[metricName] = 'decreasing';
        else trends[metricName] = 'stable';
      } else {
        trends[metricName] = 'insufficient_data';
      }
    });

    return trends;
  }

  private groupMetricsByName(metrics: PerformanceMetric[]): Record<string, PerformanceMetric[]> {
    return metrics.reduce((acc, metric) => {
      if (!acc[metric.metric]) acc[metric.metric] = [];
      acc[metric.metric].push(metric);
      return acc;
    }, {} as Record<string, PerformanceMetric[]>);
  }

  private getActiveUsers(events: AnalyticsEvent[]): number {
    const uniqueUsers = new Set(
      events
        .filter(event => event.userId)
        .map(event => event.userId)
    );
    return uniqueUsers.size;
  }

  private getUserActionSummary(events: AnalyticsEvent[]): Record<string, number> {
    return events
      .filter(event => event.event.startsWith('user_action:'))
      .reduce((acc, event) => {
        const action = event.properties.action;
        acc[action] = (acc[action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
  }

  private percentile(values: number[], p: number): number {
    const index = Math.ceil(values.length * p) - 1;
    return values[Math.max(0, index)];
  }

  private sendToAnalyticsProvider(event: AnalyticsEvent): void {
    // In a real implementation, send to external analytics service
    // e.g., Google Analytics, Mixpanel, Amplitude, etc.
  }

  private sendToPerformanceMonitoring(metric: PerformanceMetric): void {
    // In a real implementation, send to performance monitoring service
    // e.g., New Relic, DataDog, Grafana, etc.
  }
}
import { authService } from './authService';

// Types
export interface Metric {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  changePercent: number;
  timestamp: Date;
  category: MetricCategory;
}

export interface KPI {
  id: string;
  name: string;
  description: string;
  value: number;
  target: number;
  unit: string;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  change: number;
  changePercent: number;
  history: DataPoint[];
  updatedAt: Date;
}

export interface DataPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
    fill?: boolean;
  }[];
}

export interface AnalyticsEvent {
  id: string;
  type: EventType;
  category: string;
  action: string;
  label?: string;
  value?: number;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  properties: Record<string, any>;
  tenantId: string;
}

export interface UserBehavior {
  userId: string;
  sessionId: string;
  pageViews: number;
  timeOnSite: number;
  bounceRate: number;
  conversions: number;
  lastActivity: Date;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  location: {
    country: string;
    city: string;
    timezone: string;
  };
}

export interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  timeToInteractive: number;
  totalBlockingTime: number;
  lighthouse: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
}

export interface ErrorTracking {
  id: string;
  message: string;
  stack: string;
  url: string;
  lineNumber: number;
  columnNumber: number;
  userAgent: string;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  count: number;
}

export type MetricCategory = 
  | 'users'
  | 'engagement'
  | 'performance'
  | 'business'
  | 'technical'
  | 'security';

export type EventType = 
  | 'page_view'
  | 'click'
  | 'form_submit'
  | 'api_call'
  | 'error'
  | 'conversion'
  | 'custom';

export interface AnalyticsFilter {
  dateRange: {
    start: Date;
    end: Date;
  };
  tenantId?: string;
  userId?: string;
  category?: MetricCategory;
  eventType?: EventType;
}

export interface DashboardConfig {
  id: string;
  name: string;
  description: string;
  widgets: Widget[];
  layout: LayoutConfig;
  filters: AnalyticsFilter;
  refreshInterval: number;
  isPublic: boolean;
  createdBy: string;
  updatedAt: Date;
}

export interface Widget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'heatmap' | 'funnel';
  title: string;
  description?: string;
  config: WidgetConfig;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface WidgetConfig {
  metricId?: string;
  chartType?: 'line' | 'bar' | 'pie' | 'doughnut' | 'area';
  timeRange?: string;
  groupBy?: string;
  filters?: Record<string, any>;
}

export interface LayoutConfig {
  columns: number;
  rowHeight: number;
  margin: [number, number];
  containerPadding: [number, number];
}

// Analytics Service Class
class AnalyticsService {
  private readonly API_BASE = '/api/analytics';
  private eventQueue: AnalyticsEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private sessionId: string;
  private performanceObserver: PerformanceObserver | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeTracking();
    this.startEventFlush();
  }

  // Initialize tracking
  private initializeTracking(): void {
    // Track page views
    this.trackPageView();
    
    // Track performance metrics
    this.initializePerformanceTracking();
    
    // Track errors
    this.initializeErrorTracking();
    
    // Track user interactions
    this.initializeInteractionTracking();
  }

  // Track custom event
  track(type: EventType, category: string, action: string, properties: Record<string, any> = {}): void {
    const event: AnalyticsEvent = {
      id: this.generateId(),
      type,
      category,
      action,
      userId: authService.getCurrentUser()?.id,
      sessionId: this.sessionId,
      timestamp: new Date(),
      properties,
      tenantId: authService.getTenant() || 'default'
    };

    this.queueEvent(event);
  }

  // Track page view
  trackPageView(path?: string): void {
    const currentPath = path || window.location.pathname;
    
    this.track('page_view', 'navigation', 'page_view', {
      path: currentPath,
      referrer: document.referrer,
      title: document.title,
      url: window.location.href
    });
  }

  // Track click event
  trackClick(element: string, properties: Record<string, any> = {}): void {
    this.track('click', 'interaction', 'click', {
      element,
      ...properties
    });
  }

  // Track form submission
  trackFormSubmit(formId: string, properties: Record<string, any> = {}): void {
    this.track('form_submit', 'interaction', 'form_submit', {
      formId,
      ...properties
    });
  }

  // Track API call
  trackApiCall(endpoint: string, method: string, status: number, duration: number): void {
    this.track('api_call', 'technical', 'api_request', {
      endpoint,
      method,
      status,
      duration,
      success: status >= 200 && status < 300
    });
  }

  // Track conversion
  trackConversion(type: string, value?: number, properties: Record<string, any> = {}): void {
    this.track('conversion', 'business', type, {
      value,
      ...properties
    });
  }

  // Get real-time metrics
  async getRealTimeMetrics(): Promise<Metric[]> {
    try {
      const response = await authService.authenticatedRequest('/metrics/realtime');
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch real-time metrics:', error);
      return this.getMockMetrics();
    }
  }

  // Get KPIs
  async getKPIs(filter?: AnalyticsFilter): Promise<KPI[]> {
    try {
      const params = filter ? `?${new URLSearchParams(filter as any)}` : '';
      const response = await authService.authenticatedRequest(`/kpis${params}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch KPIs:', error);
      return this.getMockKPIs();
    }
  }

  // Get chart data
  async getChartData(metricId: string, timeRange: string): Promise<ChartData> {
    try {
      const response = await authService.authenticatedRequest(
        `/charts/${metricId}?timeRange=${timeRange}`
      );
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
      return this.getMockChartData();
    }
  }

  // Get user behavior analytics
  async getUserBehavior(filter?: AnalyticsFilter): Promise<UserBehavior[]> {
    try {
      const params = filter ? `?${new URLSearchParams(filter as any)}` : '';
      const response = await authService.authenticatedRequest(`/behavior${params}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch user behavior:', error);
      return [];
    }
  }

  // Get performance metrics
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      const response = await authService.authenticatedRequest('/performance');
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
      return this.getMockPerformanceMetrics();
    }
  }

  // Get error tracking data
  async getErrorTracking(filter?: AnalyticsFilter): Promise<ErrorTracking[]> {
    try {
      const params = filter ? `?${new URLSearchParams(filter as any)}` : '';
      const response = await authService.authenticatedRequest(`/errors${params}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch error tracking:', error);
      return [];
    }
  }

  // Create dashboard
  async createDashboard(config: Omit<DashboardConfig, 'id' | 'createdBy' | 'updatedAt'>): Promise<DashboardConfig> {
    try {
      const response = await authService.authenticatedRequest('/dashboards', {
        method: 'POST',
        body: JSON.stringify(config)
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to create dashboard:', error);
      throw error;
    }
  }

  // Get dashboards
  async getDashboards(): Promise<DashboardConfig[]> {
    try {
      const response = await authService.authenticatedRequest('/dashboards');
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch dashboards:', error);
      return [];
    }
  }

  // Export analytics data
  async exportData(format: 'csv' | 'json' | 'xlsx', filter?: AnalyticsFilter): Promise<Blob> {
    try {
      const params = new URLSearchParams({ format });
      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          if (value) params.append(key, String(value));
        });
      }
      
      const response = await authService.authenticatedRequest(`/export?${params}`);
      return await response.blob();
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }

  // Private methods
  private queueEvent(event: AnalyticsEvent): void {
    this.eventQueue.push(event);
    
    // Flush immediately for critical events
    if (event.type === 'error' || event.category === 'security') {
      this.flushEvents();
    }
  }

  private startEventFlush(): void {
    // Flush events every 30 seconds
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, 30000);
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flushEvents();
    });
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    
    const events = [...this.eventQueue];
    this.eventQueue = [];
    
    try {
      await fetch(`${this.API_BASE}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getAccessToken()}`
        },
        body: JSON.stringify({ events }),
        keepalive: true
      });
    } catch (error) {
      console.error('Failed to flush events:', error);
      // Re-queue events on failure
      this.eventQueue.unshift(...events);
    }
  }

  private initializePerformanceTracking(): void {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.track('custom', 'performance', entry.entryType, {
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime
          });
        }
      });
      
      this.performanceObserver.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
    }
  }

  private initializeErrorTracking(): void {
    window.addEventListener('error', (event) => {
      this.track('error', 'technical', 'javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.track('error', 'technical', 'promise_rejection', {
        reason: event.reason,
        stack: event.reason?.stack
      });
    });
  }

  private initializeInteractionTracking(): void {
    // Track clicks on buttons and links
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.tagName === 'A') {
        this.trackClick(target.tagName.toLowerCase(), {
          text: target.textContent?.trim(),
          href: (target as HTMLAnchorElement).href,
          className: target.className
        });
      }
    });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Mock data for development
  private getMockMetrics(): Metric[] {
    return [
      {
        id: '1',
        name: 'Active Users',
        value: 1247,
        previousValue: 1156,
        unit: 'users',
        trend: 'up',
        change: 91,
        changePercent: 7.9,
        timestamp: new Date(),
        category: 'users'
      },
      {
        id: '2',
        name: 'API Calls',
        value: 45678,
        previousValue: 42341,
        unit: 'requests',
        trend: 'up',
        change: 3337,
        changePercent: 7.9,
        timestamp: new Date(),
        category: 'technical'
      },
      {
        id: '3',
        name: 'Response Time',
        value: 245,
        previousValue: 289,
        unit: 'ms',
        trend: 'down',
        change: -44,
        changePercent: -15.2,
        timestamp: new Date(),
        category: 'performance'
      }
    ];
  }

  private getMockKPIs(): KPI[] {
    return [
      {
        id: '1',
        name: 'User Satisfaction',
        description: 'Overall user satisfaction score',
        value: 4.7,
        target: 4.5,
        unit: '/5',
        status: 'excellent',
        trend: 'up',
        change: 0.2,
        changePercent: 4.4,
        history: [],
        updatedAt: new Date()
      }
    ];
  }

  private getMockChartData(): ChartData {
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Users',
          data: [1200, 1350, 1100, 1400, 1250, 1500],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true
        }
      ]
    };
  }

  private getMockPerformanceMetrics(): PerformanceMetrics {
    return {
      pageLoadTime: 1.2,
      firstContentfulPaint: 0.8,
      largestContentfulPaint: 1.5,
      cumulativeLayoutShift: 0.05,
      firstInputDelay: 12,
      timeToInteractive: 2.1,
      totalBlockingTime: 45,
      lighthouse: {
        performance: 95,
        accessibility: 98,
        bestPractices: 92,
        seo: 89
      }
    };
  }
}

// Create singleton instance
export const analyticsService = new AnalyticsService();

export default analyticsService;
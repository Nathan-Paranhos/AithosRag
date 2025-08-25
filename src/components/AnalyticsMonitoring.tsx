// Analytics & Monitoring Component - Enterprise Performance Tracking
// Real-time analytics, user behavior tracking, performance monitoring, A/B testing

import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Clock,
  Zap,
  AlertTriangle,
  Activity,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Download,
  RefreshCw,
  Play,
  Pause,
  RotateCcw,
  Target,
  LineChart,
  MousePointer,
  Navigation,
  Timer,
  Cpu,
  MemoryStick,
  Network,
  Bug,
  Star,
  Share2,
  Bookmark,
  Search,
  FileText
} from 'lucide-react';

interface AnalyticsMonitoringProps {
  className?: string;
}

interface PerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  timeToInteractive: number;
  totalBlockingTime: number;
  speedIndex: number;
}

interface UserBehaviorMetrics {
  pageViews: number;
  uniqueVisitors: number;
  sessionDuration: number;
  bounceRate: number;
  clickThroughRate: number;
  conversionRate: number;
  retentionRate: number;
  engagementScore: number;
}

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  errorRate: number;
  uptime: number;
  throughput: number;
  responseTime: number;
}

interface HeatmapData {
  x: number;
  y: number;
  intensity: number;
  element?: string;
  timestamp: number;
}

interface ABTestVariant {
  id: string;
  name: string;
  traffic: number;
  conversions: number;
  conversionRate: number;
  confidence: number;
  isWinner?: boolean;
}

interface ABTest {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'completed' | 'paused';
  startDate: number;
  endDate?: number;
  variants: ABTestVariant[];
  metric: string;
  description: string;
}

interface ErrorEvent {
  id: string;
  message: string;
  stack: string;
  url: string;
  line: number;
  column: number;
  timestamp: number;
  userAgent: string;
  userId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

interface UserJourney {
  id: string;
  userId: string;
  sessionId: string;
  steps: {
    page: string;
    timestamp: number;
    duration: number;
    actions: string[];
  }[];
  outcome: 'conversion' | 'bounce' | 'ongoing';
  value: number;
}

const AnalyticsMonitoring: React.FC<AnalyticsMonitoringProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'behavior' | 'heatmaps' | 'abtests' | 'errors' | 'realtime'>('overview');
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d' | '90d'>('24h');
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Mock data for demonstration
  const [performanceMetrics] = useState<PerformanceMetrics>({
    loadTime: 1.2,
    firstContentfulPaint: 0.8,
    largestContentfulPaint: 1.5,
    cumulativeLayoutShift: 0.05,
    firstInputDelay: 12,
    timeToInteractive: 2.1,
    totalBlockingTime: 45,
    speedIndex: 1.8
  });

  const [userBehaviorMetrics] = useState<UserBehaviorMetrics>({
    pageViews: 15420,
    uniqueVisitors: 8750,
    sessionDuration: 4.2,
    bounceRate: 32.5,
    clickThroughRate: 12.8,
    conversionRate: 3.4,
    retentionRate: 68.9,
    engagementScore: 7.8
  });

  const [systemMetrics] = useState<SystemMetrics>({
    cpuUsage: 45.2,
    memoryUsage: 67.8,
    diskUsage: 23.4,
    networkLatency: 85,
    errorRate: 0.12,
    uptime: 99.97,
    throughput: 1250,
    responseTime: 120
  });

  const [heatmapData] = useState<HeatmapData[]>([
    { x: 150, y: 200, intensity: 0.8, element: 'header-logo', timestamp: Date.now() - 3600000 },
    { x: 300, y: 400, intensity: 0.6, element: 'main-cta', timestamp: Date.now() - 3000000 },
    { x: 450, y: 600, intensity: 0.9, element: 'footer-link', timestamp: Date.now() - 1800000 },
    { x: 200, y: 350, intensity: 0.7, element: 'sidebar-menu', timestamp: Date.now() - 2400000 },
    { x: 500, y: 250, intensity: 0.5, element: 'search-box', timestamp: Date.now() - 4200000 }
  ]);

  const [abTests] = useState<ABTest[]>([
    {
      id: '1',
      name: 'Homepage CTA Button Color',
      status: 'running',
      startDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
      variants: [
        { id: 'control', name: 'Blue Button', traffic: 50, conversions: 145, conversionRate: 2.9, confidence: 95 },
        { id: 'variant', name: 'Green Button', traffic: 50, conversions: 167, conversionRate: 3.34, confidence: 98, isWinner: true }
      ],
      metric: 'Click-through Rate',
      description: 'Testing different CTA button colors to improve conversion'
    },
    {
      id: '2',
      name: 'Pricing Page Layout',
      status: 'completed',
      startDate: Date.now() - 14 * 24 * 60 * 60 * 1000,
      endDate: Date.now() - 2 * 24 * 60 * 60 * 1000,
      variants: [
        { id: 'control', name: 'Original Layout', traffic: 33, conversions: 89, conversionRate: 2.7, confidence: 92 },
        { id: 'variant1', name: 'Simplified Layout', traffic: 33, conversions: 112, conversionRate: 3.39, confidence: 96, isWinner: true },
        { id: 'variant2', name: 'Feature-focused', traffic: 34, conversions: 95, conversionRate: 2.79, confidence: 88 }
      ],
      metric: 'Conversion Rate',
      description: 'Testing different pricing page layouts for better conversions'
    }
  ]);

  const [errorEvents] = useState<ErrorEvent[]>([
    {
      id: '1',
      message: 'TypeError: Cannot read property of undefined',
      stack: 'at Component.render (app.js:123:45)',
      url: '/dashboard',
      line: 123,
      column: 45,
      timestamp: Date.now() - 1800000,
      userAgent: 'Chrome/91.0.4472.124',
      userId: 'user123',
      severity: 'high',
      resolved: false
    },
    {
      id: '2',
      message: 'Network request failed',
      stack: 'at fetch (api.js:67:12)',
      url: '/api/data',
      line: 67,
      column: 12,
      timestamp: Date.now() - 3600000,
      userAgent: 'Firefox/89.0',
      severity: 'medium',
      resolved: true
    }
  ]);

  const [realTimeData, setRealTimeData] = useState({
    activeUsers: 1247,
    pageViews: 3456,
    events: 8923,
    conversions: 89,
    errors: 3,
    avgResponseTime: 145
  });

  useEffect(() => {
    if (isRealTimeEnabled) {
      intervalRef.current = setInterval(() => {
        setRealTimeData(prev => ({
          activeUsers: prev.activeUsers + Math.floor(Math.random() * 20) - 10,
          pageViews: prev.pageViews + Math.floor(Math.random() * 50),
          events: prev.events + Math.floor(Math.random() * 100),
          conversions: prev.conversions + Math.floor(Math.random() * 5),
          errors: Math.max(0, prev.errors + Math.floor(Math.random() * 3) - 1),
          avgResponseTime: prev.avgResponseTime + Math.floor(Math.random() * 20) - 10
        }));
      }, 2000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRealTimeEnabled]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDuration = (seconds: number): string => {
    if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    if (seconds >= 60) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    return `${seconds.toFixed(1)}s`;
  };

  const getPerformanceScore = (metrics: PerformanceMetrics): number => {
    const scores = {
      loadTime: Math.max(0, 100 - (metrics.loadTime - 1) * 50),
      fcp: Math.max(0, 100 - (metrics.firstContentfulPaint - 0.5) * 100),
      lcp: Math.max(0, 100 - (metrics.largestContentfulPaint - 1) * 50),
      cls: Math.max(0, 100 - metrics.cumulativeLayoutShift * 1000),
      fid: Math.max(0, 100 - (metrics.firstInputDelay - 10) * 2)
    };
    return Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const MetricCard: React.FC<{ 
    title: string; 
    value: string | number; 
    change?: number; 
    icon: React.ReactNode; 
    color?: string;
    subtitle?: string;
  }> = ({ title, value, change, icon, color = 'text-blue-600', subtitle }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>}
          {change !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${
              change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {change > 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {Math.abs(change)}%
            </div>
          )}
        </div>
        <div className={`${color} opacity-80`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Page Views"
          value={formatNumber(userBehaviorMetrics.pageViews)}
          change={12.5}
          icon={<Eye className="w-6 h-6" />}
        />
        <MetricCard
          title="Unique Visitors"
          value={formatNumber(userBehaviorMetrics.uniqueVisitors)}
          change={8.3}
          icon={<Users className="w-6 h-6" />}
          color="text-green-600"
        />
        <MetricCard
          title="Avg Session Duration"
          value={`${userBehaviorMetrics.sessionDuration}m`}
          change={-2.1}
          icon={<Clock className="w-6 h-6" />}
          color="text-purple-600"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${userBehaviorMetrics.conversionRate}%`}
          change={15.7}
          icon={<Target className="w-6 h-6" />}
          color="text-orange-600"
        />
      </div>

      {/* Performance Score */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2" />
          Performance Score
        </h3>
        <div className="flex items-center justify-center">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                className={getScoreColor(getPerformanceScore(performanceMetrics))}
                strokeDasharray={`${getPerformanceScore(performanceMetrics) * 3.14} 314`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-3xl font-bold ${getScoreColor(getPerformanceScore(performanceMetrics))}`}>
                {getPerformanceScore(performanceMetrics)}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{performanceMetrics.loadTime}s</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Load Time</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{performanceMetrics.firstContentfulPaint}s</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">FCP</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{performanceMetrics.largestContentfulPaint}s</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">LCP</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{performanceMetrics.cumulativeLayoutShift}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">CLS</div>
          </div>
        </div>
      </div>

      {/* Traffic Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Globe className="w-5 h-5 mr-2" />
            Traffic Sources
          </h3>
          <div className="space-y-3">
            {[
              { source: 'Organic Search', percentage: 45.2, color: 'bg-blue-500' },
              { source: 'Direct', percentage: 28.7, color: 'bg-green-500' },
              { source: 'Social Media', percentage: 15.3, color: 'bg-purple-500' },
              { source: 'Referral', percentage: 10.8, color: 'bg-orange-500' }
            ].map(item => (
              <div key={item.source} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                  <span className="text-gray-900 dark:text-gray-100">{item.source}</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Monitor className="w-5 h-5 mr-2" />
            Device Types
          </h3>
          <div className="space-y-3">
            {[
              { device: 'Desktop', percentage: 52.4, icon: <Monitor className="w-4 h-4" /> },
              { device: 'Mobile', percentage: 38.9, icon: <Smartphone className="w-4 h-4" /> },
              { device: 'Tablet', percentage: 8.7, icon: <Tablet className="w-4 h-4" /> }
            ].map(item => (
              <div key={item.device} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-gray-600 dark:text-gray-400">{item.icon}</div>
                  <span className="text-gray-900 dark:text-gray-100">{item.device}</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const PerformanceTab = () => (
    <div className="space-y-6">
      {/* Core Web Vitals */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Zap className="w-5 h-5 mr-2" />
          Core Web Vitals
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className={`text-3xl font-bold ${getScoreColor(Math.max(0, 100 - (performanceMetrics.largestContentfulPaint - 1) * 50))}`}>
              {performanceMetrics.largestContentfulPaint}s
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Largest Contentful Paint</div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Good: &lt; 2.5s</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className={`text-3xl font-bold ${getScoreColor(Math.max(0, 100 - performanceMetrics.firstInputDelay))}`}>
              {performanceMetrics.firstInputDelay}ms
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">First Input Delay</div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Good: &lt; 100ms</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className={`text-3xl font-bold ${getScoreColor(Math.max(0, 100 - performanceMetrics.cumulativeLayoutShift * 1000))}`}>
              {performanceMetrics.cumulativeLayoutShift}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Cumulative Layout Shift</div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Good: &lt; 0.1</div>
          </div>
        </div>
      </div>

      {/* System Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="CPU Usage"
          value={`${systemMetrics.cpuUsage}%`}
          icon={<Cpu className="w-6 h-6" />}
          color="text-blue-600"
        />
        <MetricCard
          title="Memory Usage"
          value={`${systemMetrics.memoryUsage}%`}
          icon={<MemoryStick className="w-6 h-6" />}
          color="text-green-600"
        />
        <MetricCard
          title="Network Latency"
          value={`${systemMetrics.networkLatency}ms`}
          icon={<Network className="w-6 h-6" />}
          color="text-purple-600"
        />
        <MetricCard
          title="Error Rate"
          value={`${systemMetrics.errorRate}%`}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="text-red-600"
        />
      </div>

      {/* Performance Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <LineChart className="w-5 h-5 mr-2" />
          Performance Timeline
        </h3>
        <div className="space-y-4">
          {[
            { metric: 'DNS Lookup', time: 15, color: 'bg-blue-500' },
            { metric: 'TCP Connection', time: 25, color: 'bg-green-500' },
            { metric: 'SSL Handshake', time: 35, color: 'bg-purple-500' },
            { metric: 'Request', time: 45, color: 'bg-orange-500' },
            { metric: 'Response', time: 120, color: 'bg-red-500' },
            { metric: 'DOM Processing', time: 200, color: 'bg-indigo-500' },
            { metric: 'Resource Loading', time: 800, color: 'bg-pink-500' }
          ].map(item => (
            <div key={item.metric} className="flex items-center space-x-4">
              <div className="w-32 text-sm text-gray-600 dark:text-gray-400">{item.metric}</div>
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${item.color}`}
                  style={{ width: `${Math.min(100, (item.time / 800) * 100)}%` }}
                ></div>
              </div>
              <div className="w-16 text-sm font-medium text-gray-900 dark:text-gray-100">{item.time}ms</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const BehaviorTab = () => (
    <div className="space-y-6">
      {/* User Engagement Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Bounce Rate"
          value={`${userBehaviorMetrics.bounceRate}%`}
          change={-5.2}
          icon={<Navigation className="w-6 h-6" />}
          color="text-red-600"
        />
        <MetricCard
          title="Pages per Session"
          value="3.7"
          change={8.1}
          icon={<FileText className="w-6 h-6" />}
          color="text-blue-600"
        />
        <MetricCard
          title="Engagement Score"
          value={userBehaviorMetrics.engagementScore}
          change={12.3}
          icon={<Star className="w-6 h-6" />}
          color="text-yellow-600"
        />
        <MetricCard
          title="Return Visitors"
          value="42.8%"
          change={6.7}
          icon={<RotateCcw className="w-6 h-6" />}
          color="text-green-600"
        />
      </div>

      {/* User Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <MousePointer className="w-5 h-5 mr-2" />
          Top User Actions
        </h3>
        <div className="space-y-3">
          {[
            { action: 'Page View', count: 15420, icon: <Eye className="w-4 h-4" /> },
            { action: 'Button Click', count: 8750, icon: <MousePointer className="w-4 h-4" /> },
            { action: 'Form Submit', count: 2340, icon: <FileText className="w-4 h-4" /> },
            { action: 'Search', count: 1890, icon: <Search className="w-4 h-4" /> },
            { action: 'Download', count: 1250, icon: <Download className="w-4 h-4" /> },
            { action: 'Share', count: 890, icon: <Share2 className="w-4 h-4" /> },
            { action: 'Bookmark', count: 670, icon: <Bookmark className="w-4 h-4" /> }
          ].map(item => (
            <div key={item.action} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="text-gray-600 dark:text-gray-400">{item.icon}</div>
                <span className="text-gray-900 dark:text-gray-100">{item.action}</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{formatNumber(item.count)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Target className="w-5 h-5 mr-2" />
          Conversion Funnel
        </h3>
        <div className="space-y-4">
          {[
            { step: 'Landing Page', users: 10000, percentage: 100, color: 'bg-blue-500' },
            { step: 'Product View', users: 6500, percentage: 65, color: 'bg-green-500' },
            { step: 'Add to Cart', users: 2800, percentage: 28, color: 'bg-yellow-500' },
            { step: 'Checkout', users: 1200, percentage: 12, color: 'bg-orange-500' },
            { step: 'Purchase', users: 340, percentage: 3.4, color: 'bg-red-500' }
          ].map((item, index) => (
            <div key={item.step} className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-900 dark:text-gray-100 font-medium">{item.step}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-900 dark:text-gray-100 font-semibold">{formatNumber(item.users)}</span>
                  <span className="text-gray-600 dark:text-gray-400">({item.percentage}%)</span>
                  {index > 0 && (
                    <span className="text-red-600 dark:text-red-400 text-sm">
                      -{((1 - item.percentage / 100) * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full ${item.color}`}
                  style={{ width: `${item.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const HeatmapsTab = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <MousePointer className="w-5 h-5 mr-2" />
          Click Heatmap
        </h3>
        <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg h-96 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
            {/* Simulated webpage layout */}
            <div className="p-4">
              <div className="bg-white dark:bg-gray-800 rounded shadow-sm p-4 mb-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white dark:bg-gray-800 rounded shadow-sm p-4">
                  <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded shadow-sm p-4">
                  <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
                </div>
              </div>
            </div>
            
            {/* Heatmap points */}
            {heatmapData.map(point => (
              <div
                key={`${point.x}-${point.y}`}
                className="absolute w-8 h-8 rounded-full pointer-events-none"
                style={{
                  left: point.x,
                  top: point.y,
                  backgroundColor: `rgba(255, 0, 0, ${point.intensity})`,
                  transform: 'translate(-50%, -50%)'
                }}
              ></div>
            ))}
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">Intensity:</span>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-200 rounded"></div>
              <span className="text-xs text-gray-500">Low</span>
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-xs text-gray-500">Medium</span>
              <div className="w-4 h-4 bg-red-800 rounded"></div>
              <span className="text-xs text-gray-500">High</span>
            </div>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {heatmapData.length} click points recorded
          </div>
        </div>
      </div>

      {/* Heatmap Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Most Clicked Elements</h4>
          <div className="space-y-2">
            {[
              { element: 'Main CTA Button', clicks: 1247 },
              { element: 'Navigation Menu', clicks: 892 },
              { element: 'Footer Links', clicks: 634 },
              { element: 'Search Box', clicks: 456 }
            ].map(item => (
              <div key={item.element} className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{item.element}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{item.clicks}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Scroll Depth</h4>
          <div className="space-y-3">
            {[
              { depth: '25%', users: 95.2 },
              { depth: '50%', users: 78.6 },
              { depth: '75%', users: 52.3 },
              { depth: '100%', users: 28.9 }
            ].map(item => (
              <div key={item.depth} className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">{item.depth}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="h-2 bg-blue-500 rounded-full"
                      style={{ width: `${item.users}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.users}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Attention Time</h4>
          <div className="space-y-2">
            {[
              { section: 'Header', time: '12.3s' },
              { section: 'Hero Section', time: '8.7s' },
              { section: 'Features', time: '15.2s' },
              { section: 'Footer', time: '3.1s' }
            ].map(item => (
              <div key={item.section} className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{item.section}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const ABTestsTab = () => (
    <div className="space-y-6">
      {abTests.map(test => (
        <div key={test.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{test.name}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{test.description}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              test.status === 'running' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
              test.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
              test.status === 'paused' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
              'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
            }`}>
              {test.status}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {test.variants.map(variant => (
              <div key={variant.id} className={`p-4 rounded-lg border-2 ${
                variant.isWinner 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">{variant.name}</h4>
                  {variant.isWinner && (
                    <div className="flex items-center text-green-600 dark:text-green-400">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      <span className="text-xs font-medium">Winner</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Traffic:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{variant.traffic}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Conversions:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{variant.conversions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Rate:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{variant.conversionRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Confidence:</span>
                    <span className={`font-medium ${
                      variant.confidence >= 95 ? 'text-green-600 dark:text-green-400' :
                      variant.confidence >= 90 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>{variant.confidence}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div>
              Started: {new Date(test.startDate).toLocaleDateString()}
              {test.endDate && ` • Ended: ${new Date(test.endDate).toLocaleDateString()}`}
            </div>
            <div>Metric: {test.metric}</div>
          </div>
        </div>
      ))}
    </div>
  );

  const ErrorsTab = () => (
    <div className="space-y-6">
      {/* Error Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Errors"
          value={errorEvents.length}
          icon={<Bug className="w-6 h-6" />}
          color="text-red-600"
        />
        <MetricCard
          title="Critical Errors"
          value={errorEvents.filter(e => e.severity === 'critical').length}
          icon={<AlertCircle className="w-6 h-6" />}
          color="text-red-600"
        />
        <MetricCard
          title="Resolved"
          value={errorEvents.filter(e => e.resolved).length}
          icon={<CheckCircle className="w-6 h-6" />}
          color="text-green-600"
        />
        <MetricCard
          title="Error Rate"
          value={`${systemMetrics.errorRate}%`}
          icon={<TrendingDown className="w-6 h-6" />}
          color="text-orange-600"
        />
      </div>

      {/* Error List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Bug className="w-5 h-5 mr-2" />
          Recent Errors
        </h3>
        <div className="space-y-4">
          {errorEvents.map(error => (
            <div key={error.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      error.severity === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                      error.severity === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                      error.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {error.severity}
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      error.resolved 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {error.resolved ? 'Resolved' : 'Open'}
                    </div>
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">{error.message}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {error.url} • Line {error.line}:{error.column}
                  </p>
                  <details className="text-sm">
                    <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                      Stack trace
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-x-auto">
                      {error.stack}
                    </pre>
                  </details>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-500">
                  {formatDuration((Date.now() - error.timestamp) / 1000)} ago
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                <div>User: {error.userId || 'Anonymous'}</div>
                <div>{error.userAgent.split(' ')[0]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const RealTimeTab = () => (
    <div className="space-y-6">
      {/* Real-time Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Real-time Analytics</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              isRealTimeEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`}></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isRealTimeEnabled ? 'Live' : 'Paused'}
            </span>
          </div>
          <button
            onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isRealTimeEnabled
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isRealTimeEnabled ? (
              <><Pause className="w-4 h-4 mr-2 inline" />Pause</>
            ) : (
              <><Play className="w-4 h-4 mr-2 inline" />Start</>
            )}
          </button>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Active Users"
          value={formatNumber(realTimeData.activeUsers)}
          icon={<Users className="w-6 h-6" />}
          color="text-green-600"
        />
        <MetricCard
          title="Page Views"
          value={formatNumber(realTimeData.pageViews)}
          icon={<Eye className="w-6 h-6" />}
          color="text-blue-600"
        />
        <MetricCard
          title="Events"
          value={formatNumber(realTimeData.events)}
          icon={<Activity className="w-6 h-6" />}
          color="text-purple-600"
        />
        <MetricCard
          title="Conversions"
          value={realTimeData.conversions}
          icon={<Target className="w-6 h-6" />}
          color="text-orange-600"
        />
        <MetricCard
          title="Errors"
          value={realTimeData.errors}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="text-red-600"
        />
        <MetricCard
          title="Avg Response Time"
          value={`${realTimeData.avgResponseTime}ms`}
          icon={<Timer className="w-6 h-6" />}
          color="text-indigo-600"
        />
      </div>

      {/* Live Activity Feed */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2" />
          Live Activity Feed
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {[
            { user: 'User #1247', action: 'Viewed product page', time: '2s ago', location: 'New York, US' },
            { user: 'User #1248', action: 'Added item to cart', time: '5s ago', location: 'London, UK' },
            { user: 'User #1249', action: 'Completed purchase', time: '8s ago', location: 'Tokyo, JP' },
            { user: 'User #1250', action: 'Started checkout', time: '12s ago', location: 'Berlin, DE' },
            { user: 'User #1251', action: 'Signed up', time: '15s ago', location: 'Sydney, AU' },
            { user: 'User #1252', action: 'Downloaded file', time: '18s ago', location: 'Toronto, CA' },
            { user: 'User #1253', action: 'Shared content', time: '22s ago', location: 'Paris, FR' },
            { user: 'User #1254', action: 'Left review', time: '25s ago', location: 'Mumbai, IN' }
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{activity.user}</span>
                  <span className="text-gray-600 dark:text-gray-400 ml-2">{activity.action}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 dark:text-gray-500">{activity.time}</div>
                <div className="text-xs text-gray-400 dark:text-gray-600">{activity.location}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <BarChart3 className="w-8 h-8 text-blue-600 mr-3" />
              Analytics & Monitoring
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Enterprise-grade performance tracking and user behavior analytics
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            <button
              onClick={() => setIsLoading(true)}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          {[
            { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
            { id: 'performance', label: 'Performance', icon: <Zap className="w-4 h-4" /> },
            { id: 'behavior', label: 'User Behavior', icon: <Users className="w-4 h-4" /> },
            { id: 'heatmaps', label: 'Heatmaps', icon: <MousePointer className="w-4 h-4" /> },
            { id: 'abtests', label: 'A/B Tests', icon: <Target className="w-4 h-4" /> },
            { id: 'errors', label: 'Errors', icon: <Bug className="w-4 h-4" /> },
            { id: 'realtime', label: 'Real-time', icon: <Activity className="w-4 h-4" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="transition-all duration-300">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'performance' && <PerformanceTab />}
          {activeTab === 'behavior' && <BehaviorTab />}
          {activeTab === 'heatmaps' && <HeatmapsTab />}
          {activeTab === 'abtests' && <ABTestsTab />}
          {activeTab === 'errors' && <ErrorsTab />}
          {activeTab === 'realtime' && <RealTimeTab />}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsMonitoring;
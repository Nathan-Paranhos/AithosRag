// Enterprise Dashboard Component - Advanced Analytics & KPIs
// Real-time metrics, interactive charts, business intelligence

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Users, DollarSign, Activity, Target, Zap, Globe, Clock, AlertCircle, CheckCircle, RefreshCw, Download, Filter, Calendar, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { useAuth } from '../services/jwtAuthService';

interface KPIMetric {
  id: string;
  title: string;
  value: number;
  previousValue: number;
  unit: string;
  format: 'number' | 'currency' | 'percentage' | 'time';
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  target?: number;
  category: 'revenue' | 'users' | 'performance' | 'engagement' | 'conversion';
  icon: React.ComponentType<{ className?: string; size?: number; }>;
  color: string;
}

interface ChartData {
  name: string;
  value: number;
  previousValue?: number;
  timestamp?: number;
  category?: string;
  [key: string]: string | number | undefined;
}

interface RealtimeMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  threshold: {
    warning: number;
    critical: number;
  };
  history: Array<{ timestamp: number; value: number }>;
}

interface BusinessAlert {
  id: string;
  type: 'opportunity' | 'warning' | 'critical' | 'info';
  title: string;
  message: string;
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  actionRequired: boolean;
  estimatedImpact?: {
    revenue?: number;
    users?: number;
    performance?: number;
  };
}

const EnterpriseDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d' | '90d'>('24h');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isRealTime, setIsRealTime] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  
  const { user, hasPermission } = useAuth();
  
  // Mock KPI data
  const [kpiMetrics] = useState<KPIMetric[]>([
    {
      id: '1',
      title: 'Total Revenue',
      value: 2847650,
      previousValue: 2654320,
      unit: '$',
      format: 'currency',
      trend: 'up',
      trendPercentage: 7.3,
      target: 3000000,
      category: 'revenue',
      icon: DollarSign,
      color: 'text-green-400'
    },
    {
      id: '2',
      title: 'Active Users',
      value: 45678,
      previousValue: 43210,
      unit: '',
      format: 'number',
      trend: 'up',
      trendPercentage: 5.7,
      target: 50000,
      category: 'users',
      icon: Users,
      color: 'text-blue-400'
    },
    {
      id: '3',
      title: 'Conversion Rate',
      value: 3.42,
      previousValue: 3.18,
      unit: '%',
      format: 'percentage',
      trend: 'up',
      trendPercentage: 7.5,
      target: 4.0,
      category: 'conversion',
      icon: Target,
      color: 'text-purple-400'
    },
    {
      id: '4',
      title: 'Avg Response Time',
      value: 245,
      previousValue: 312,
      unit: 'ms',
      format: 'time',
      trend: 'down',
      trendPercentage: -21.5,
      target: 200,
      category: 'performance',
      icon: Zap,
      color: 'text-yellow-400'
    },
    {
      id: '5',
      title: 'User Engagement',
      value: 78.5,
      previousValue: 76.2,
      unit: '%',
      format: 'percentage',
      trend: 'up',
      trendPercentage: 3.0,
      target: 80.0,
      category: 'engagement',
      icon: Activity,
      color: 'text-orange-400'
    },
    {
      id: '6',
      title: 'Global Reach',
      value: 127,
      previousValue: 119,
      unit: ' countries',
      format: 'number',
      trend: 'up',
      trendPercentage: 6.7,
      target: 150,
      category: 'users',
      icon: Globe,
      color: 'text-cyan-400'
    }
  ]);
  
  // Mock chart data
  const [revenueData] = useState<ChartData[]>([
    { name: 'Jan', value: 2400000, previousValue: 2200000 },
    { name: 'Feb', value: 2100000, previousValue: 1900000 },
    { name: 'Mar', value: 2800000, previousValue: 2500000 },
    { name: 'Apr', value: 3200000, previousValue: 2800000 },
    { name: 'May', value: 2900000, previousValue: 2600000 },
    { name: 'Jun', value: 3400000, previousValue: 3100000 },
    { name: 'Jul', value: 2847650, previousValue: 2654320 }
  ]);
  
  const [userGrowthData] = useState<ChartData[]>([
    { name: 'Week 1', newUsers: 1200, activeUsers: 42000, churnRate: 2.1 },
    { name: 'Week 2', newUsers: 1450, activeUsers: 43200, churnRate: 1.8 },
    { name: 'Week 3', newUsers: 1680, activeUsers: 44100, churnRate: 2.3 },
    { name: 'Week 4', newUsers: 1320, activeUsers: 45678, churnRate: 1.9 }
  ]);
  
  const [performanceData] = useState<ChartData[]>([
    { name: '00:00', responseTime: 180, throughput: 850, errorRate: 0.2 },
    { name: '04:00', responseTime: 165, throughput: 920, errorRate: 0.1 },
    { name: '08:00', responseTime: 245, throughput: 1200, errorRate: 0.3 },
    { name: '12:00', responseTime: 290, throughput: 1450, errorRate: 0.5 },
    { name: '16:00', responseTime: 320, throughput: 1380, errorRate: 0.4 },
    { name: '20:00', responseTime: 275, throughput: 1100, errorRate: 0.2 }
  ]);
  
  const [categoryDistribution] = useState<ChartData[]>([
    { name: 'Enterprise', value: 45, color: '#3B82F6' },
    { name: 'SMB', value: 30, color: '#10B981' },
    { name: 'Startup', value: 15, color: '#F59E0B' },
    { name: 'Individual', value: 10, color: '#EF4444' }
  ]);
  
  const [realtimeMetrics] = useState<RealtimeMetric[]>([
    {
      id: '1',
      name: 'CPU Usage',
      value: 67.5,
      unit: '%',
      status: 'warning',
      threshold: { warning: 70, critical: 85 },
      history: Array.from({ length: 20 }, (_, i) => ({
        timestamp: Date.now() - (19 - i) * 30000,
        value: 60 + Math.random() * 20
      }))
    },
    {
      id: '2',
      name: 'Memory Usage',
      value: 45.2,
      unit: '%',
      status: 'healthy',
      threshold: { warning: 75, critical: 90 },
      history: Array.from({ length: 20 }, (_, i) => ({
        timestamp: Date.now() - (19 - i) * 30000,
        value: 40 + Math.random() * 15
      }))
    },
    {
      id: '3',
      name: 'Active Connections',
      value: 1247,
      unit: '',
      status: 'healthy',
      threshold: { warning: 1500, critical: 2000 },
      history: Array.from({ length: 20 }, (_, i) => ({
        timestamp: Date.now() - (19 - i) * 30000,
        value: 1000 + Math.random() * 500
      }))
    }
  ]);
  
  const [businessAlerts] = useState<BusinessAlert[]>([
    {
      id: '1',
      type: 'opportunity',
      title: 'Revenue Growth Opportunity',
      message: 'Enterprise segment showing 15% higher conversion rates. Consider increasing marketing spend.',
      timestamp: Date.now() - 1800000,
      priority: 'high',
      category: 'Revenue',
      actionRequired: true,
      estimatedImpact: { revenue: 450000 }
    },
    {
      id: '2',
      type: 'warning',
      title: 'Performance Degradation',
      message: 'Response times increased by 12% in the last hour. Investigating potential causes.',
      timestamp: Date.now() - 3600000,
      priority: 'medium',
      category: 'Performance',
      actionRequired: true,
      estimatedImpact: { users: -150 }
    },
    {
      id: '3',
      type: 'info',
      title: 'New Market Expansion',
      message: 'Successfully launched in 3 new countries. User acquisition trending positively.',
      timestamp: Date.now() - 7200000,
      priority: 'low',
      category: 'Growth',
      actionRequired: false,
      estimatedImpact: { users: 2500 }
    }
  ]);
  
  useEffect(() => {
    if (isRealTime) {
      const interval = setInterval(() => {
        setLastUpdated(Date.now());
        // Simulate real-time updates
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isRealTime]);
  
  const handleRefresh = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLastUpdated(Date.now());
    setLoading(false);
  };
  
  const handleExport = () => {
    const data = {
      kpiMetrics,
      revenueData,
      userGrowthData,
      performanceData,
      categoryDistribution,
      realtimeMetrics,
      businessAlerts,
      timeRange,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enterprise-dashboard-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const formatValue = (value: number, format: string, unit: string) => {
    switch (format) {
      case 'currency':
        return `${unit}${value.toLocaleString()}`;
      case 'percentage':
        return `${value.toFixed(1)}${unit}`;
      case 'time':
        return `${value}${unit}`;
      default:
        return `${value.toLocaleString()}${unit}`;
    }
  };
  
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUpRight className="w-4 h-4" />;
      case 'down': return <ArrowDownRight className="w-4 h-4" />;
      default: return <Minus className="w-4 h-4" />;
    }
  };
  
  const getTrendColor = (trend: string, isPositive: boolean = true) => {
    if (trend === 'stable') return 'text-gray-400';
    const positive = (trend === 'up' && isPositive) || (trend === 'down' && !isPositive);
    return positive ? 'text-green-400' : 'text-red-400';
  };
  
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <TrendingUp className="w-5 h-5 text-green-400" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'critical': return <AlertCircle className="w-5 h-5 text-red-400" />;
      default: return <CheckCircle className="w-5 h-5 text-blue-400" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400 bg-green-500/20';
      case 'warning': return 'text-yellow-400 bg-yellow-500/20';
      case 'critical': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };
  
  const filteredKPIs = selectedCategory === 'all' 
    ? kpiMetrics 
    : kpiMetrics.filter(kpi => kpi.category === selectedCategory);
  
  if (!hasPermission('dashboard:read')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">Access Denied</h3>
          <p className="text-gray-500">You don't have permission to view the enterprise dashboard.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Enterprise Dashboard</h1>
          <p className="text-gray-400">
            Real-time business intelligence and performance metrics
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="all">All Categories</option>
            <option value="revenue">Revenue</option>
            <option value="users">Users</option>
            <option value="performance">Performance</option>
            <option value="engagement">Engagement</option>
            <option value="conversion">Conversion</option>
          </select>
          
          {/* Time Range */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          
          {/* Real-time Toggle */}
          <button
            onClick={() => setIsRealTime(!isRealTime)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isRealTime
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-white/10 text-gray-400 border border-white/20 hover:bg-white/20'
            }`}
          >
            <Activity className="w-4 h-4" />
            Real-time
          </button>
          
          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-3 py-2 text-white text-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          {/* Export */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-2 text-white text-sm transition-all"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>
      
      {/* Last Updated */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Clock className="w-4 h-4" />
        Last updated: {new Date(lastUpdated).toLocaleString()}
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {filteredKPIs.map(kpi => {
          const Icon = kpi.icon;
          const isPerformanceMetric = kpi.category === 'performance';
          
          return (
            <div key={kpi.id} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6 hover:bg-white/15 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${kpi.color.replace('text-', 'bg-').replace('-400', '-500/20')}`}>
                  <Icon className={`w-6 h-6 ${kpi.color}`} />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  getTrendColor(kpi.trend, !isPerformanceMetric)
                }`}>
                  {getTrendIcon(kpi.trend)}
                  {Math.abs(kpi.trendPercentage)}%
                </div>
              </div>
              
              <div className="mb-2">
                <h3 className="text-2xl font-bold text-white mb-1">
                  {formatValue(kpi.value, kpi.format, kpi.unit)}
                </h3>
                <p className="text-gray-400 text-sm">{kpi.title}</p>
              </div>
              
              {kpi.target && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Progress to target</span>
                    <span>{((kpi.value / kpi.target) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${kpi.color.replace('text-', 'bg-').replace('-400', '-500')}`}
                      style={{ width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(17, 24, 39, 0.8)', 
                  border: '1px solid rgba(75, 85, 99, 0.3)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value: number) => [`$${(value / 1000000).toFixed(2)}M`, 'Revenue']}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#10B981" 
                fill="url(#revenueGradient)" 
                strokeWidth={2}
              />
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* User Growth */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">User Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(17, 24, 39, 0.8)', 
                  border: '1px solid rgba(75, 85, 99, 0.3)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="newUsers" stroke="#3B82F6" strokeWidth={2} name="New Users" />
              <Line type="monotone" dataKey="activeUsers" stroke="#10B981" strokeWidth={2} name="Active Users" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Performance & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Metrics */}
        <div className="lg:col-span-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Performance Metrics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(17, 24, 39, 0.8)', 
                  border: '1px solid rgba(75, 85, 99, 0.3)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="responseTime" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.3} name="Response Time (ms)" />
              <Area type="monotone" dataKey="throughput" stackId="2" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} name="Throughput" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Customer Distribution */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Customer Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {categoryDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(17, 24, 39, 0.8)', 
                  border: '1px solid rgba(75, 85, 99, 0.3)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value: number) => [`${value}%`, 'Share']}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Real-time Metrics */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Real-time System Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {realtimeMetrics.map(metric => (
            <div key={metric.id} className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-medium">{metric.name}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(metric.status)}`}>
                  {metric.status.toUpperCase()}
                </span>
              </div>
              <div className="text-2xl font-bold text-white mb-2">
                {metric.value.toLocaleString()}{metric.unit}
              </div>
              <div className="h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metric.history}>
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke={metric.status === 'healthy' ? '#10B981' : metric.status === 'warning' ? '#F59E0B' : '#EF4444'} 
                      strokeWidth={2} 
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Business Alerts */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Business Intelligence Alerts</h3>
        <div className="space-y-4">
          {businessAlerts.map(alert => (
            <div key={alert.id} className="bg-white/5 rounded-lg p-4 border-l-4 border-l-blue-500">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.type)}
                  <div>
                    <h4 className="text-white font-semibold mb-1">{alert.title}</h4>
                    <p className="text-gray-400 text-sm mb-2">{alert.message}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Category: {alert.category}</span>
                      <span>Priority: {alert.priority.toUpperCase()}</span>
                      <span>{new Date(alert.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                {alert.estimatedImpact && (
                  <div className="text-right">
                    <div className="text-sm text-gray-400 mb-1">Estimated Impact</div>
                    {alert.estimatedImpact.revenue && (
                      <div className={`text-sm font-medium ${
                        alert.estimatedImpact.revenue > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {alert.estimatedImpact.revenue > 0 ? '+' : ''}${alert.estimatedImpact.revenue.toLocaleString()}
                      </div>
                    )}
                    {alert.estimatedImpact.users && (
                      <div className={`text-sm font-medium ${
                        alert.estimatedImpact.users > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {alert.estimatedImpact.users > 0 ? '+' : ''}{alert.estimatedImpact.users.toLocaleString()} users
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EnterpriseDashboard;
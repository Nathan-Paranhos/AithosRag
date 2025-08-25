// Security Dashboard Component - Enterprise Security Monitoring
// Real-time security monitoring, threat detection, compliance tracking

import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Eye, Lock, Users, Activity, TrendingUp, TrendingDown, RefreshCw, Download, Filter, Search, Calendar, MapPin, Smartphone, Monitor, Globe, Zap } from 'lucide-react';
import { useAuth } from '../services/jwtAuthService';

interface SecurityMetrics {
  totalThreats: number;
  blockedAttacks: number;
  activeUsers: number;
  failedLogins: number;
  suspiciousActivities: number;
  complianceScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastUpdated: number;
}

interface ThreatEvent {
  id: string;
  type: 'malware' | 'phishing' | 'brute_force' | 'data_breach' | 'unauthorized_access' | 'suspicious_login' | 'policy_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: string;
  target: string;
  timestamp: number;
  status: 'active' | 'investigating' | 'resolved' | 'false_positive';
  assignedTo?: string;
  location?: {
    country: string;
    city: string;
    ip: string;
  };
  metadata: Record<string, any>;
}

interface SecurityAlert {
  id: string;
  type: 'security' | 'compliance' | 'performance' | 'system';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  acknowledged: boolean;
  resolvedAt?: number;
  actions: string[];
}

interface ComplianceCheck {
  id: string;
  name: string;
  category: 'gdpr' | 'hipaa' | 'sox' | 'pci_dss' | 'iso27001';
  status: 'compliant' | 'non_compliant' | 'warning' | 'unknown';
  score: number;
  lastCheck: number;
  nextCheck: number;
  issues: string[];
  recommendations: string[];
}

interface UserActivity {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  timestamp: number;
  ipAddress: string;
  userAgent: string;
  location?: {
    country: string;
    city: string;
  };
  riskScore: number;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
}

const SecurityDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'threats' | 'alerts' | 'compliance' | 'activity' | 'analytics'>('overview');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [isRealTime, setIsRealTime] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  const { user, hasPermission } = useAuth();
  
  // Mock data - in real app, this would come from APIs
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalThreats: 1247,
    blockedAttacks: 892,
    activeUsers: 2456,
    failedLogins: 23,
    suspiciousActivities: 7,
    complianceScore: 94.2,
    riskLevel: 'medium',
    lastUpdated: Date.now()
  });
  
  const [threats] = useState<ThreatEvent[]>([
    {
      id: '1',
      type: 'brute_force',
      severity: 'high',
      title: 'Brute Force Attack Detected',
      description: 'Multiple failed login attempts from suspicious IP addresses',
      source: '192.168.1.100',
      target: 'login.aithos.com',
      timestamp: Date.now() - 300000,
      status: 'investigating',
      assignedTo: 'security-team',
      location: {
        country: 'Russia',
        city: 'Moscow',
        ip: '192.168.1.100'
      },
      metadata: {
        attempts: 47,
        usernames: ['admin', 'root', 'user'],
        blocked: true
      }
    },
    {
      id: '2',
      type: 'suspicious_login',
      severity: 'medium',
      title: 'Unusual Login Location',
      description: 'User logged in from an unusual geographic location',
      source: '10.0.0.50',
      target: 'user@company.com',
      timestamp: Date.now() - 600000,
      status: 'active',
      location: {
        country: 'China',
        city: 'Beijing',
        ip: '10.0.0.50'
      },
      metadata: {
        userId: 'user123',
        previousLocation: 'New York, US',
        riskScore: 7.2
      }
    },
    {
      id: '3',
      type: 'policy_violation',
      severity: 'low',
      title: 'Password Policy Violation',
      description: 'User attempted to set weak password',
      source: 'internal',
      target: 'password-service',
      timestamp: Date.now() - 900000,
      status: 'resolved',
      metadata: {
        userId: 'user456',
        policyViolated: 'minimum_complexity',
        autoResolved: true
      }
    }
  ]);
  
  const [alerts] = useState<SecurityAlert[]>([
    {
      id: '1',
      type: 'security',
      priority: 'critical',
      title: 'Multiple Failed Login Attempts',
      message: 'Detected 50+ failed login attempts in the last hour',
      timestamp: Date.now() - 180000,
      acknowledged: false,
      actions: ['Block IP', 'Notify Admin', 'Enable 2FA']
    },
    {
      id: '2',
      type: 'compliance',
      priority: 'high',
      title: 'GDPR Compliance Warning',
      message: 'Data retention period exceeded for 15 user records',
      timestamp: Date.now() - 3600000,
      acknowledged: true,
      actions: ['Review Records', 'Delete Data', 'Update Policy']
    },
    {
      id: '3',
      type: 'system',
      priority: 'medium',
      title: 'Security Update Available',
      message: 'Critical security patches available for authentication service',
      timestamp: Date.now() - 7200000,
      acknowledged: false,
      actions: ['Schedule Update', 'Review Changes', 'Test Environment']
    }
  ]);
  
  const [complianceChecks] = useState<ComplianceCheck[]>([
    {
      id: '1',
      name: 'GDPR Data Protection',
      category: 'gdpr',
      status: 'compliant',
      score: 96,
      lastCheck: Date.now() - 86400000,
      nextCheck: Date.now() + 86400000 * 6,
      issues: [],
      recommendations: ['Regular audit of data processing activities']
    },
    {
      id: '2',
      name: 'ISO 27001 Security Controls',
      category: 'iso27001',
      status: 'warning',
      score: 88,
      lastCheck: Date.now() - 172800000,
      nextCheck: Date.now() + 86400000 * 5,
      issues: ['Incomplete access control documentation'],
      recommendations: ['Update access control policies', 'Conduct security training']
    },
    {
      id: '3',
      name: 'PCI DSS Payment Security',
      category: 'pci_dss',
      status: 'compliant',
      score: 94,
      lastCheck: Date.now() - 259200000,
      nextCheck: Date.now() + 86400000 * 4,
      issues: [],
      recommendations: ['Regular vulnerability scans']
    }
  ]);
  
  const [userActivities] = useState<UserActivity[]>([
    {
      id: '1',
      userId: 'user123',
      userName: 'John Doe',
      action: 'Login',
      resource: 'Dashboard',
      timestamp: Date.now() - 300000,
      ipAddress: '192.168.1.50',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      location: { country: 'US', city: 'New York' },
      riskScore: 2.1,
      deviceType: 'desktop'
    },
    {
      id: '2',
      userId: 'user456',
      userName: 'Jane Smith',
      action: 'File Download',
      resource: 'sensitive-data.xlsx',
      timestamp: Date.now() - 600000,
      ipAddress: '10.0.0.25',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
      location: { country: 'US', city: 'San Francisco' },
      riskScore: 6.8,
      deviceType: 'mobile'
    },
    {
      id: '3',
      userId: 'user789',
      userName: 'Bob Johnson',
      action: 'Permission Change',
      resource: 'User Management',
      timestamp: Date.now() - 900000,
      ipAddress: '172.16.0.10',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      location: { country: 'US', city: 'Austin' },
      riskScore: 4.5,
      deviceType: 'desktop'
    }
  ]);
  
  useEffect(() => {
    if (isRealTime) {
      const interval = setInterval(() => {
        // Simulate real-time updates
        setMetrics(prev => ({
          ...prev,
          totalThreats: prev.totalThreats + Math.floor(Math.random() * 3),
          blockedAttacks: prev.blockedAttacks + Math.floor(Math.random() * 2),
          failedLogins: Math.max(0, prev.failedLogins + Math.floor(Math.random() * 5) - 2),
          lastUpdated: Date.now()
        }));
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isRealTime]);
  
  const handleRefresh = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
  };
  
  const handleExport = () => {
    // Simulate export functionality
    const data = {
      metrics,
      threats,
      alerts,
      complianceChecks,
      userActivities,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'low': return 'text-green-400 bg-green-500/20 border-green-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-red-400 bg-red-500/20';
      case 'investigating': return 'text-yellow-400 bg-yellow-500/20';
      case 'resolved': return 'text-green-400 bg-green-500/20';
      case 'false_positive': return 'text-gray-400 bg-gray-500/20';
      default: return 'text-blue-400 bg-blue-500/20';
    }
  };
  
  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-400 bg-green-500/20';
      case 'warning': return 'text-yellow-400 bg-yellow-500/20';
      case 'non_compliant': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };
  
  const getRiskColor = (score: number) => {
    if (score >= 8) return 'text-red-400';
    if (score >= 6) return 'text-orange-400';
    if (score >= 4) return 'text-yellow-400';
    return 'text-green-400';
  };
  
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Smartphone className="w-4 h-4" />;
      case 'desktop': return <Monitor className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };
  
  const filteredThreats = threats.filter(threat => {
    const matchesSearch = threat.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         threat.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = selectedSeverity === 'all' || threat.severity === selectedSeverity;
    const matchesStatus = selectedStatus === 'all' || threat.status === selectedStatus;
    return matchesSearch && matchesSeverity && matchesStatus;
  });
  
  if (!hasPermission('security:read')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">Access Denied</h3>
          <p className="text-gray-500">You don't have permission to view security dashboard.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Security Dashboard</h1>
          <p className="text-gray-400">
            Real-time security monitoring and threat detection
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
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
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-3 py-2 text-white text-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          {/* Export Button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-2 text-white text-sm transition-all"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>
      
      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-white/5 rounded-xl p-1">
        {[
          { id: 'overview', label: 'Overview', icon: Shield },
          { id: 'threats', label: 'Threats', icon: AlertTriangle },
          { id: 'alerts', label: 'Alerts', icon: Zap },
          { id: 'compliance', label: 'Compliance', icon: Lock },
          { id: 'activity', label: 'Activity', icon: Eye },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
      
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <span className="text-red-400 text-sm font-medium">+12%</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{metrics.totalThreats.toLocaleString()}</h3>
              <p className="text-gray-400 text-sm">Total Threats</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Shield className="w-6 h-6 text-green-400" />
                </div>
                <span className="text-green-400 text-sm font-medium">+8%</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{metrics.blockedAttacks.toLocaleString()}</h3>
              <p className="text-gray-400 text-sm">Blocked Attacks</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <span className="text-blue-400 text-sm font-medium">+3%</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{metrics.activeUsers.toLocaleString()}</h3>
              <p className="text-gray-400 text-sm">Active Users</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Lock className="w-6 h-6 text-purple-400" />
                </div>
                <span className="text-purple-400 text-sm font-medium">{metrics.complianceScore}%</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">Compliant</h3>
              <p className="text-gray-400 text-sm">Security Score</p>
            </div>
          </div>
          
          {/* Risk Level Indicator */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Current Risk Level</h3>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                metrics.riskLevel === 'critical' ? 'bg-red-500/20 text-red-400' :
                metrics.riskLevel === 'high' ? 'bg-orange-500/20 text-orange-400' :
                metrics.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                {metrics.riskLevel.toUpperCase()}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400 mb-1">{metrics.failedLogins}</div>
                <div className="text-gray-400 text-sm">Failed Logins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400 mb-1">{metrics.suspiciousActivities}</div>
                <div className="text-gray-400 text-sm">Suspicious Activities</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">
                  {new Date(metrics.lastUpdated).toLocaleTimeString()}
                </div>
                <div className="text-gray-400 text-sm">Last Updated</div>
              </div>
            </div>
          </div>
          
          {/* Recent Threats */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Threats</h3>
            <div className="space-y-3">
              {threats.slice(0, 3).map(threat => (
                <div key={threat.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      threat.severity === 'critical' ? 'bg-red-500' :
                      threat.severity === 'high' ? 'bg-orange-500' :
                      threat.severity === 'medium' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}></div>
                    <div>
                      <div className="text-white font-medium">{threat.title}</div>
                      <div className="text-gray-400 text-sm">{threat.description}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(threat.status)}`}>
                      {threat.status.replace('_', ' ').toUpperCase()}
                    </div>
                    <div className="text-gray-400 text-xs mt-1">
                      {new Date(threat.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Threats Tab */}
      {activeTab === 'threats' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search threats..."
                  className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>
            
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="false_positive">False Positive</option>
            </select>
          </div>
          
          {/* Threats List */}
          <div className="space-y-4">
            {filteredThreats.map(threat => (
              <div key={threat.id} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(threat.severity)}`}>
                      {threat.severity.toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-1">{threat.title}</h4>
                      <p className="text-gray-400 mb-2">{threat.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Source: {threat.source}</span>
                        <span>Target: {threat.target}</span>
                        {threat.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {threat.location.city}, {threat.location.country}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(threat.status)}`}>
                      {threat.status.replace('_', ' ').toUpperCase()}
                    </div>
                    <div className="text-gray-400 text-sm mt-2">
                      {new Date(threat.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                {/* Metadata */}
                {Object.keys(threat.metadata).length > 0 && (
                  <div className="bg-white/5 rounded-lg p-3 mt-4">
                    <h5 className="text-sm font-medium text-white mb-2">Additional Information</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {Object.entries(threat.metadata).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-400 capitalize">{key.replace('_', ' ')}:</span>
                          <span className="text-white">
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Other tabs would be implemented similarly... */}
      {activeTab !== 'overview' && activeTab !== 'threats' && (
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-8 text-center">
          <div className="text-gray-400 mb-4">
            <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Tab</h3>
            <p>This section is under development and will be available soon.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityDashboard;
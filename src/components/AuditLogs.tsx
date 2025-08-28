// Audit Logs Component - Enterprise Activity Tracking
// Comprehensive audit trail with advanced filtering and analysis

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Download,
  Eye,
  AlertTriangle,
  Shield,
  User,
  Clock,
  MapPin,
  Globe,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Activity,
  Database,
  Settings,
  Lock,
  FileText,
  Edit3,
  RefreshCw
} from 'lucide-react';

// Types
type AuditEventType = 
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'data_modification'
  | 'system_configuration'
  | 'user_management'
  | 'security'
  | 'api_access'
  | 'file_operation'
  | 'admin_action';

type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';
type AuditStatus = 'success' | 'failure' | 'warning' | 'info';

interface AuditEvent {
  id: string;
  timestamp: number;
  eventType: AuditEventType;
  action: string;
  description: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  resourceId?: string;
  resourceType?: string;
  severity: AuditSeverity;
  status: AuditStatus;
  ipAddress: string;
  userAgent: string;
  location?: {
    country: string;
    city: string;
    coordinates?: [number, number];
  };
  metadata: Record<string, unknown>;
  sessionId?: string;
  requestId?: string;
  duration?: number;
  changes?: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
  tags: string[];
}

interface AuditFilter {
  search: string;
  eventTypes: AuditEventType[];
  severities: AuditSeverity[];
  statuses: AuditStatus[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  users: string[];
  resources: string[];
  ipAddresses: string[];
  tags: string[];
}

interface AuditStats {
  totalEvents: number;
  eventsByType: Record<AuditEventType, number>;
  eventsBySeverity: Record<AuditSeverity, number>;
  eventsByStatus: Record<AuditStatus, number>;
  topUsers: Array<{ userId: string; userName: string; count: number }>;
  topResources: Array<{ resourceId: string; resourceType: string; count: number }>;
  timelineData: Array<{ timestamp: number; count: number }>;
  securityEvents: number;
  failedAttempts: number;
  suspiciousActivity: number;
}

const AuditLogs: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<AuditEvent[]>([]);
  const [,] = useState<AuditEvent | null>(null); // selectedEvent will be used for event details modal
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  
  const [filter, setFilter] = useState<AuditFilter>({
    search: '',
    eventTypes: [],
    severities: [],
    statuses: [],
    dateRange: { start: null, end: null },
    users: [],
    resources: [],
    ipAddresses: [],
    tags: []
  });
  
  const [viewMode, setViewMode] = useState<'list' | 'timeline' | 'analytics'>('list');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval] = useState(30000);

  // Mock data generation
  const generateMockEvents = (): AuditEvent[] => {
    const eventTypes: AuditEventType[] = [
      'authentication', 'authorization', 'data_access', 'data_modification',
      'system_configuration', 'user_management', 'security', 'api_access',
      'file_operation', 'admin_action'
    ];
    
    const actions = {
      authentication: ['login', 'logout', 'password_change', 'mfa_setup', 'session_timeout'],
      authorization: ['permission_granted', 'permission_denied', 'role_assigned', 'access_revoked'],
      data_access: ['view_record', 'search_data', 'export_data', 'download_file'],
      data_modification: ['create_record', 'update_record', 'delete_record', 'bulk_update'],
      system_configuration: ['config_change', 'feature_toggle', 'maintenance_mode', 'backup_created'],
      user_management: ['user_created', 'user_updated', 'user_deleted', 'role_changed'],
      security: ['security_scan', 'vulnerability_detected', 'firewall_rule', 'encryption_key_rotation'],
      api_access: ['api_call', 'rate_limit_exceeded', 'api_key_created', 'webhook_triggered'],
      file_operation: ['file_upload', 'file_download', 'file_delete', 'file_share'],
      admin_action: ['system_restart', 'database_backup', 'user_impersonation', 'audit_export']
    };
    
    const users = [
      { id: 'user1', name: 'John Doe', role: 'admin' },
      { id: 'user2', name: 'Jane Smith', role: 'user' },
      { id: 'user3', name: 'Bob Johnson', role: 'moderator' },
      { id: 'user4', name: 'Alice Brown', role: 'user' },
      { id: 'user5', name: 'Charlie Wilson', role: 'admin' }
    ];
    
    const locations = [
      { country: 'United States', city: 'New York' },
      { country: 'United Kingdom', city: 'London' },
      { country: 'Germany', city: 'Berlin' },
      { country: 'Japan', city: 'Tokyo' },
      { country: 'Australia', city: 'Sydney' }
    ];
    
    const ipAddresses = [
      '192.168.1.100', '10.0.0.50', '172.16.0.25',
      '203.0.113.10', '198.51.100.5', '192.0.2.15'
    ];
    
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
      'Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0'
    ];
    
    return Array.from({ length: 500 }, (_, i) => {
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const action = actions[eventType][Math.floor(Math.random() * actions[eventType].length)];
      const user = users[Math.floor(Math.random() * users.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];
      const severity: AuditSeverity = ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as AuditSeverity;
      const status: AuditStatus = ['success', 'failure', 'warning', 'info'][Math.floor(Math.random() * 4)] as AuditStatus;
      
      return {
        id: `audit_${Date.now()}_${i}`,
        timestamp: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000, // Last 7 days
        eventType,
        action,
        description: `${action.replace('_', ' ')} performed by ${user.name}`,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        resourceId: `resource_${Math.floor(Math.random() * 100)}`,
        resourceType: ['document', 'user_profile', 'system_config', 'api_endpoint'][Math.floor(Math.random() * 4)],
        severity,
        status,
        ipAddress: ipAddresses[Math.floor(Math.random() * ipAddresses.length)],
        userAgent: userAgents[Math.floor(Math.random() * userAgents.length)],
        location,
        metadata: {
          requestMethod: ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)],
          responseCode: status === 'success' ? 200 : status === 'failure' ? 500 : 400,
          dataSize: Math.floor(Math.random() * 10000),
          processingTime: Math.floor(Math.random() * 5000)
        },
        sessionId: `session_${Math.floor(Math.random() * 1000)}`,
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        duration: Math.floor(Math.random() * 5000),
        changes: Math.random() > 0.7 ? {
          before: { status: 'inactive', role: 'user' },
          after: { status: 'active', role: 'admin' }
        } : undefined,
        tags: ['audit', eventType, severity].concat(
          Math.random() > 0.5 ? ['automated'] : ['manual']
        )
      };
    }).sort((a, b) => b.timestamp - a.timestamp);
  };

  // Load audit events
  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        const mockEvents = generateMockEvents();
        setEvents(mockEvents);
        setError(null);
      } catch {
        setError('Failed to load audit events');
      } finally {
        setLoading(false);
      }
    };
    
    loadEvents();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      // In real implementation, fetch new events
      console.log('Auto-refreshing audit events...');
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Filter events
  useEffect(() => {
    let filtered = events;
    
    // Search filter
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(event => 
        event.description.toLowerCase().includes(searchLower) ||
        event.userName?.toLowerCase().includes(searchLower) ||
        event.action.toLowerCase().includes(searchLower) ||
        event.resourceType?.toLowerCase().includes(searchLower)
      );
    }
    
    // Event type filter
    if (filter.eventTypes.length > 0) {
      filtered = filtered.filter(event => filter.eventTypes.includes(event.eventType));
    }
    
    // Severity filter
    if (filter.severities.length > 0) {
      filtered = filtered.filter(event => filter.severities.includes(event.severity));
    }
    
    // Status filter
    if (filter.statuses.length > 0) {
      filtered = filtered.filter(event => filter.statuses.includes(event.status));
    }
    
    // Date range filter
    if (filter.dateRange.start && filter.dateRange.end) {
      filtered = filtered.filter(event => 
        event.timestamp >= filter.dateRange.start!.getTime() &&
        event.timestamp <= filter.dateRange.end!.getTime()
      );
    }
    
    // User filter
    if (filter.users.length > 0) {
      filtered = filtered.filter(event => 
        event.userId && filter.users.includes(event.userId)
      );
    }
    
    setFilteredEvents(filtered);
  }, [events, filter]);

  // Calculate statistics
  const stats = useMemo((): AuditStats => {
    const eventsByType: Record<AuditEventType, number> = {
      authentication: 0,
      authorization: 0,
      data_access: 0,
      data_modification: 0,
      system_configuration: 0,
      user_management: 0,
      security: 0,
      api_access: 0,
      file_operation: 0,
      admin_action: 0
    };
    
    const eventsBySeverity: Record<AuditSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };
    
    const eventsByStatus: Record<AuditStatus, number> = {
      success: 0,
      failure: 0,
      warning: 0,
      info: 0
    };
    
    const userCounts: Record<string, { name: string; count: number }> = {};
    const resourceCounts: Record<string, { type: string; count: number }> = {};
    
    let securityEvents = 0;
    let failedAttempts = 0;
    let suspiciousActivity = 0;
    
    filteredEvents.forEach(event => {
      eventsByType[event.eventType]++;
      eventsBySeverity[event.severity]++;
      eventsByStatus[event.status]++;
      
      if (event.userId && event.userName) {
        if (!userCounts[event.userId]) {
          userCounts[event.userId] = { name: event.userName, count: 0 };
        }
        userCounts[event.userId].count++;
      }
      
      if (event.resourceId && event.resourceType) {
        if (!resourceCounts[event.resourceId]) {
          resourceCounts[event.resourceId] = { type: event.resourceType, count: 0 };
        }
        resourceCounts[event.resourceId].count++;
      }
      
      if (event.eventType === 'security') securityEvents++;
      if (event.status === 'failure') failedAttempts++;
      if (event.severity === 'critical' || event.severity === 'high') suspiciousActivity++;
    });
    
    const topUsers = Object.entries(userCounts)
      .map(([userId, data]) => ({ userId, userName: data.name, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    const topResources = Object.entries(resourceCounts)
      .map(([resourceId, data]) => ({ resourceId, resourceType: data.type, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Generate timeline data (last 24 hours)
    const timelineData: Array<{ timestamp: number; count: number }> = [];
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;
    
    for (let i = 23; i >= 0; i--) {
      const hourStart = now - (i * hourMs);
      const hourEnd = hourStart + hourMs;
      const count = filteredEvents.filter(event => 
        event.timestamp >= hourStart && event.timestamp < hourEnd
      ).length;
      
      timelineData.push({ timestamp: hourStart, count });
    }
    
    return {
      totalEvents: filteredEvents.length,
      eventsByType,
      eventsBySeverity,
      eventsByStatus,
      topUsers,
      topResources,
      timelineData,
      securityEvents,
      failedAttempts,
      suspiciousActivity
    };
  }, [filteredEvents]);

  // Event handlers
  const handleExport = () => {
    const dataStr = JSON.stringify(filteredEvents, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const getEventIcon = (eventType: AuditEventType) => {
    const icons = {
      authentication: Lock,
      authorization: Shield,
      data_access: Eye,
      data_modification: Edit3,
      system_configuration: Settings,
      user_management: User,
      security: AlertTriangle,
      api_access: Globe,
      file_operation: FileText,
      admin_action: Database
    };
    return icons[eventType] || Activity;
  };

  const getSeverityColor = (severity: AuditSeverity) => {
    const colors = {
      low: 'text-green-600 bg-green-50',
      medium: 'text-yellow-600 bg-yellow-50',
      high: 'text-orange-600 bg-orange-50',
      critical: 'text-red-600 bg-red-50'
    };
    return colors[severity];
  };

  const getStatusColor = (status: AuditStatus) => {
    const colors = {
      success: 'text-green-600 bg-green-50',
      failure: 'text-red-600 bg-red-50',
      warning: 'text-yellow-600 bg-yellow-50',
      info: 'text-blue-600 bg-blue-50'
    };
    return colors[status];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading audit events...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Logs</h2>
          <p className="text-gray-600 mt-1">
            Comprehensive activity tracking and security monitoring
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              autoRefresh
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <RefreshCw className={`h-4 w-4 mr-2 inline ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </button>
          
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2 inline" />
            Export
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEvents.toLocaleString()}</p>
            </div>
            <Activity className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Security Events</p>
              <p className="text-2xl font-bold text-gray-900">{stats.securityEvents}</p>
            </div>
            <Shield className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Failed Attempts</p>
              <p className="text-2xl font-bold text-gray-900">{stats.failedAttempts}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Suspicious Activity</p>
              <p className="text-2xl font-bold text-gray-900">{stats.suspiciousActivity}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          <button
            onClick={() => setFilter({
              search: '',
              eventTypes: [],
              severities: [],
              statuses: [],
              dateRange: { start: null, end: null },
              users: [],
              resources: [],
              ipAddresses: [],
              tags: []
            })}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Clear All
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={filter.search}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                placeholder="Search events..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Event Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Types
            </label>
            <select
              multiple
              value={filter.eventTypes}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value) as AuditEventType[];
                setFilter({ ...filter, eventTypes: values });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="authentication">Authentication</option>
              <option value="authorization">Authorization</option>
              <option value="data_access">Data Access</option>
              <option value="data_modification">Data Modification</option>
              <option value="system_configuration">System Configuration</option>
              <option value="user_management">User Management</option>
              <option value="security">Security</option>
              <option value="api_access">API Access</option>
              <option value="file_operation">File Operation</option>
              <option value="admin_action">Admin Action</option>
            </select>
          </div>
          
          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severity
            </label>
            <select
              multiple
              value={filter.severities}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value) as AuditSeverity[];
                setFilter({ ...filter, severities: values });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              multiple
              value={filter.statuses}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value) as AuditStatus[];
                setFilter({ ...filter, statuses: values });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Audit Events ({filteredEvents.length})
            </h3>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded text-sm ${
                  viewMode === 'list'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1 rounded text-sm ${
                  viewMode === 'timeline'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewMode('analytics')}
                className={`px-3 py-1 rounded text-sm ${
                  viewMode === 'analytics'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Analytics
              </button>
            </div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {filteredEvents.slice(0, 50).map((event) => {
            const EventIcon = getEventIcon(event.eventType);
            const isExpanded = expandedEvents.has(event.id);
            
            return (
              <div key={event.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <EventIcon className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {event.description}
                        </h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          getSeverityColor(event.severity)
                        }`}>
                          {event.severity}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          getStatusColor(event.status)
                        }`}>
                          {event.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {event.userName || 'Unknown User'}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {new Date(event.timestamp).toLocaleString()}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {event.ipAddress}
                        </div>
                        {event.location && (
                          <div className="flex items-center">
                            <Globe className="h-4 w-4 mr-1" />
                            {event.location.city}, {event.location.country}
                          </div>
                        )}
                      </div>
                      
                      {isExpanded && (
                        <div className="mt-4 space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Event Type:</span>
                              <span className="ml-2 text-gray-600">{event.eventType}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Action:</span>
                              <span className="ml-2 text-gray-600">{event.action}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Resource:</span>
                              <span className="ml-2 text-gray-600">
                                {event.resourceType} ({event.resourceId})
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Session:</span>
                              <span className="ml-2 text-gray-600">{event.sessionId}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Request ID:</span>
                              <span className="ml-2 text-gray-600 font-mono text-xs">{event.requestId}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Duration:</span>
                              <span className="ml-2 text-gray-600">{event.duration}ms</span>
                            </div>
                          </div>
                          
                          {event.changes && (
                            <div>
                              <span className="font-medium text-gray-700">Changes:</span>
                              <div className="mt-2 bg-gray-50 rounded p-3">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium text-red-600">Before:</span>
                                    <pre className="mt-1 text-xs text-gray-600">
                                      {JSON.stringify(event.changes.before, null, 2)}
                                    </pre>
                                  </div>
                                  <div>
                                    <span className="font-medium text-green-600">After:</span>
                                    <pre className="mt-1 text-xs text-gray-600">
                                      {JSON.stringify(event.changes.after, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div>
                            <span className="font-medium text-gray-700">User Agent:</span>
                            <p className="mt-1 text-xs text-gray-600 font-mono">{event.userAgent}</p>
                          </div>
                          
                          <div>
                            <span className="font-medium text-gray-700">Metadata:</span>
                            <pre className="mt-1 text-xs text-gray-600 bg-gray-50 rounded p-2">
                              {JSON.stringify(event.metadata, null, 2)}
                            </pre>
                          </div>
                          
                          <div>
                            <span className="font-medium text-gray-700">Tags:</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {event.tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toggleEventExpansion(event.id)}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        {filteredEvents.length === 0 && (
          <div className="p-12 text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No audit events found</h3>
            <p className="text-gray-600">Try adjusting your filters to see more results.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
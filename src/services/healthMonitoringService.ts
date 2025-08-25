// Health Monitoring Service - Enterprise System Health Tracking
// Comprehensive health monitoring with real-time metrics and alerting

// Types
type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
type MetricType = 'counter' | 'gauge' | 'histogram' | 'timer';

interface HealthCheck {
  id: string;
  name: string;
  description: string;
  category: string;
  check: () => Promise<HealthCheckResult>;
  interval: number;
  timeout: number;
  retries: number;
  enabled: boolean;
  dependencies: string[];
  tags: string[];
  critical: boolean;
}

interface HealthCheckResult {
  status: HealthStatus;
  message: string;
  data?: Record<string, any>;
  duration: number;
  timestamp: number;
  error?: Error;
}

interface SystemHealth {
  overall: HealthStatus;
  services: Record<string, ServiceHealth>;
  dependencies: Record<string, HealthStatus>;
  metrics: SystemMetrics;
  alerts: Alert[];
  uptime: number;
  lastCheck: number;
}

interface ServiceHealth {
  status: HealthStatus;
  checks: Record<string, HealthCheckResult>;
  metrics: ServiceMetrics;
  uptime: number;
  lastHealthy: number;
  errorCount: number;
  warningCount: number;
}

interface SystemMetrics {
  cpu: {
    usage: number;
    load: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    connectionsActive: number;
  };
  application: {
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
    activeUsers: number;
  };
}

interface ServiceMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  availability: number;
  lastError?: {
    message: string;
    timestamp: number;
    stack?: string;
  };
}

interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  source: string;
  timestamp: number;
  acknowledged: boolean;
  resolved: boolean;
  resolvedAt?: number;
  data?: Record<string, any>;
  tags: string[];
}

interface Metric {
  name: string;
  type: MetricType;
  value: number;
  timestamp: number;
  labels: Record<string, string>;
  unit?: string;
}

interface HealthMonitorConfig {
  checkInterval: number;
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
  retentionPeriod: number;
  enableAlerting: boolean;
  enableMetrics: boolean;
  enableNotifications: boolean;
}

// Health Monitoring Service
class HealthMonitoringService {
  private checks = new Map<string, HealthCheck>();
  private results = new Map<string, HealthCheckResult[]>();
  private metrics = new Map<string, Metric[]>();
  private alerts: Alert[] = [];
  private timers = new Map<string, NodeJS.Timeout>();
  private systemStartTime = Date.now();
  private lastSystemCheck = 0;
  
  private config: HealthMonitorConfig = {
    checkInterval: 30000, // 30 seconds
    alertThresholds: {
      responseTime: 5000, // 5 seconds
      errorRate: 5, // 5%
      cpuUsage: 80, // 80%
      memoryUsage: 85, // 85%
      diskUsage: 90 // 90%
    },
    retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
    enableAlerting: true,
    enableMetrics: true,
    enableNotifications: true
  };

  constructor(config?: Partial<HealthMonitorConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.initializeDefaultChecks();
    this.startSystemMonitoring();
  }

  // Register health check
  registerCheck(check: Omit<HealthCheck, 'id'>): string {
    const id = `${check.category}_${check.name}_${Date.now()}`;
    const fullCheck: HealthCheck = { ...check, id };
    
    this.checks.set(id, fullCheck);
    this.results.set(id, []);
    
    if (fullCheck.enabled) {
      this.startCheck(id);
    }
    
    return id;
  }

  // Unregister health check
  unregisterCheck(id: string): boolean {
    const timer = this.timers.get(id);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(id);
    }
    
    this.checks.delete(id);
    this.results.delete(id);
    
    return true;
  }

  // Start individual health check
  private startCheck(id: string): void {
    const check = this.checks.get(id);
    if (!check) return;
    
    // Run initial check
    this.runCheck(id);
    
    // Schedule recurring checks
    const timer = setInterval(() => {
      this.runCheck(id);
    }, check.interval);
    
    this.timers.set(id, timer);
  }

  // Run single health check
  private async runCheck(id: string): Promise<void> {
    const check = this.checks.get(id);
    if (!check || !check.enabled) return;
    
    const startTime = Date.now();
    let result: HealthCheckResult;
    
    try {
      // Execute with timeout and retries
      result = await this.executeWithRetries(check);
    } catch (error) {
      result = {
        status: 'unhealthy',
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
        timestamp: startTime,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
    
    // Store result
    this.storeResult(id, result);
    
    // Check for alerts
    this.checkAlerts(check, result);
    
    // Record metrics
    if (this.config.enableMetrics) {
      this.recordMetrics(check, result);
    }
  }

  // Execute check with retries
  private async executeWithRetries(check: HealthCheck): Promise<HealthCheckResult> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= check.retries; attempt++) {
      try {
        const result = await this.executeWithTimeout(check);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < check.retries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError;
  }

  // Execute check with timeout
  private async executeWithTimeout(check: HealthCheck): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Health check timeout after ${check.timeout}ms`));
      }, check.timeout);
      
      check.check()
        .then(result => {
          clearTimeout(timer);
          resolve({
            ...result,
            duration: Date.now() - startTime,
            timestamp: startTime
          });
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  // Store check result
  private storeResult(id: string, result: HealthCheckResult): void {
    const results = this.results.get(id) || [];
    results.push(result);
    
    // Keep only recent results
    const cutoff = Date.now() - this.config.retentionPeriod;
    const filteredResults = results.filter(r => r.timestamp > cutoff);
    
    this.results.set(id, filteredResults);
  }

  // Check for alerts
  private checkAlerts(check: HealthCheck, result: HealthCheckResult): void {
    if (!this.config.enableAlerting) return;
    
    // Check for status-based alerts
    if (result.status === 'unhealthy' && check.critical) {
      this.createAlert({
        severity: 'critical',
        title: `Critical Health Check Failed: ${check.name}`,
        message: result.message,
        source: check.id,
        data: { check: check.name, category: check.category, result }
      });
    } else if (result.status === 'degraded') {
      this.createAlert({
        severity: 'warning',
        title: `Health Check Degraded: ${check.name}`,
        message: result.message,
        source: check.id,
        data: { check: check.name, category: check.category, result }
      });
    }
    
    // Check for performance-based alerts
    if (result.duration > this.config.alertThresholds.responseTime) {
      this.createAlert({
        severity: 'warning',
        title: `Slow Health Check: ${check.name}`,
        message: `Health check took ${result.duration}ms (threshold: ${this.config.alertThresholds.responseTime}ms)`,
        source: check.id,
        data: { check: check.name, duration: result.duration, threshold: this.config.alertThresholds.responseTime }
      });
    }
  }

  // Create alert
  private createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged' | 'resolved' | 'tags'>): void {
    const fullAlert: Alert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      acknowledged: false,
      resolved: false,
      tags: []
    };
    
    this.alerts.push(fullAlert);
    
    // Emit alert event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('healthAlert', {
        detail: fullAlert
      }));
    }
    
    console.warn('Health Alert:', fullAlert);
  }

  // Record metrics
  private recordMetrics(check: HealthCheck, result: HealthCheckResult): void {
    const timestamp = Date.now();
    const labels = {
      check: check.name,
      category: check.category,
      status: result.status
    };
    
    // Response time metric
    this.recordMetric({
      name: 'health_check_duration_ms',
      type: 'histogram',
      value: result.duration,
      timestamp,
      labels,
      unit: 'ms'
    });
    
    // Status metric
    this.recordMetric({
      name: 'health_check_status',
      type: 'gauge',
      value: result.status === 'healthy' ? 1 : 0,
      timestamp,
      labels
    });
  }

  // Record custom metric
  recordMetric(metric: Metric): void {
    if (!this.config.enableMetrics) return;
    
    const metrics = this.metrics.get(metric.name) || [];
    metrics.push(metric);
    
    // Keep only recent metrics
    const cutoff = Date.now() - this.config.retentionPeriod;
    const filteredMetrics = metrics.filter(m => m.timestamp > cutoff);
    
    this.metrics.set(metric.name, filteredMetrics);
  }

  // Get system health
  async getSystemHealth(): Promise<SystemHealth> {
    const now = Date.now();
    const services: Record<string, ServiceHealth> = {};
    const dependencies: Record<string, HealthStatus> = {};
    
    // Collect service health
    for (const [id, check] of this.checks.entries()) {
      const results = this.results.get(id) || [];
      const latestResult = results[results.length - 1];
      
      if (!services[check.category]) {
        services[check.category] = {
          status: 'healthy',
          checks: {},
          metrics: this.calculateServiceMetrics(check.category),
          uptime: this.calculateUptime(check.category),
          lastHealthy: now,
          errorCount: 0,
          warningCount: 0
        };
      }
      
      if (latestResult) {
        services[check.category].checks[check.name] = latestResult;
        
        // Update service status
        if (latestResult.status === 'unhealthy') {
          services[check.category].status = 'unhealthy';
          services[check.category].errorCount++;
        } else if (latestResult.status === 'degraded' && services[check.category].status !== 'unhealthy') {
          services[check.category].status = 'degraded';
          services[check.category].warningCount++;
        }
      }
    }
    
    // Calculate overall status
    const statuses = Object.values(services).map(s => s.status);
    let overall: HealthStatus = 'healthy';
    
    if (statuses.includes('unhealthy')) {
      overall = 'unhealthy';
    } else if (statuses.includes('degraded')) {
      overall = 'degraded';
    } else if (statuses.length === 0) {
      overall = 'unknown';
    }
    
    return {
      overall,
      services,
      dependencies,
      metrics: await this.getSystemMetrics(),
      alerts: this.getActiveAlerts(),
      uptime: now - this.systemStartTime,
      lastCheck: this.lastSystemCheck
    };
  }

  // Calculate service metrics
  private calculateServiceMetrics(category: string): ServiceMetrics {
    const checks = Array.from(this.checks.values()).filter(c => c.category === category);
    const allResults = checks.flatMap(c => this.results.get(c.id) || []);
    
    if (allResults.length === 0) {
      return {
        requestCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        throughput: 0,
        availability: 0
      };
    }
    
    const durations = allResults.map(r => r.duration).sort((a, b) => a - b);
    const errorCount = allResults.filter(r => r.status === 'unhealthy').length;
    
    return {
      requestCount: allResults.length,
      errorCount,
      averageResponseTime: durations.reduce((a, b) => a + b, 0) / durations.length,
      p95ResponseTime: durations[Math.floor(durations.length * 0.95)] || 0,
      p99ResponseTime: durations[Math.floor(durations.length * 0.99)] || 0,
      throughput: allResults.length / (this.config.retentionPeriod / 1000),
      availability: ((allResults.length - errorCount) / allResults.length) * 100
    };
  }

  // Calculate uptime
  private calculateUptime(category: string): number {
    const checks = Array.from(this.checks.values()).filter(c => c.category === category);
    const allResults = checks.flatMap(c => this.results.get(c.id) || []);
    
    if (allResults.length === 0) return 0;
    
    const healthyResults = allResults.filter(r => r.status === 'healthy');
    return (healthyResults.length / allResults.length) * 100;
  }

  // Get system metrics
  private async getSystemMetrics(): Promise<SystemMetrics> {
    // Simulate system metrics (in real implementation, use actual system APIs)
    return {
      cpu: {
        usage: Math.random() * 100,
        load: [Math.random() * 2, Math.random() * 2, Math.random() * 2]
      },
      memory: {
        used: Math.random() * 8 * 1024 * 1024 * 1024, // 8GB
        total: 8 * 1024 * 1024 * 1024,
        percentage: Math.random() * 100
      },
      disk: {
        used: Math.random() * 500 * 1024 * 1024 * 1024, // 500GB
        total: 1024 * 1024 * 1024 * 1024, // 1TB
        percentage: Math.random() * 100
      },
      network: {
        bytesIn: Math.random() * 1024 * 1024,
        bytesOut: Math.random() * 1024 * 1024,
        connectionsActive: Math.floor(Math.random() * 1000)
      },
      application: {
        requestsPerSecond: Math.random() * 1000,
        averageResponseTime: Math.random() * 500,
        errorRate: Math.random() * 5,
        activeUsers: Math.floor(Math.random() * 10000)
      }
    };
  }

  // Get active alerts
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  // Acknowledge alert
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  // Resolve alert
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      return true;
    }
    return false;
  }

  // Get metrics
  getMetrics(name?: string): Metric[] {
    if (name) {
      return this.metrics.get(name) || [];
    }
    
    return Array.from(this.metrics.values()).flat();
  }

  // Initialize default health checks
  private initializeDefaultChecks(): void {
    // API Health Check
    this.registerCheck({
      name: 'api_endpoint',
      description: 'Check if main API endpoint is responding',
      category: 'api',
      check: async () => {
        try {
          // Simulate API check
          const isHealthy = Math.random() > 0.1; // 90% success rate
          return {
            status: isHealthy ? 'healthy' : 'unhealthy',
            message: isHealthy ? 'API is responding normally' : 'API is not responding',
            data: { endpoint: '/api/health', responseTime: Math.random() * 100 }
          } as HealthCheckResult;
        } catch (error) {
          throw error;
        }
      },
      interval: 30000,
      timeout: 5000,
      retries: 2,
      enabled: true,
      dependencies: [],
      tags: ['api', 'critical'],
      critical: true
    });
    
    // Database Health Check
    this.registerCheck({
      name: 'database_connection',
      description: 'Check database connectivity',
      category: 'database',
      check: async () => {
        const isHealthy = Math.random() > 0.05; // 95% success rate
        return {
          status: isHealthy ? 'healthy' : 'unhealthy',
          message: isHealthy ? 'Database connection is healthy' : 'Database connection failed',
          data: { connectionPool: Math.floor(Math.random() * 10), queryTime: Math.random() * 50 }
        } as HealthCheckResult;
      },
      interval: 60000,
      timeout: 10000,
      retries: 3,
      enabled: true,
      dependencies: [],
      tags: ['database', 'critical'],
      critical: true
    });
    
    // Cache Health Check
    this.registerCheck({
      name: 'cache_service',
      description: 'Check cache service availability',
      category: 'cache',
      check: async () => {
        const isHealthy = Math.random() > 0.02; // 98% success rate
        return {
          status: isHealthy ? 'healthy' : 'degraded',
          message: isHealthy ? 'Cache service is operational' : 'Cache service is slow',
          data: { hitRate: Math.random() * 100, memoryUsage: Math.random() * 100 }
        } as HealthCheckResult;
      },
      interval: 45000,
      timeout: 3000,
      retries: 1,
      enabled: true,
      dependencies: [],
      tags: ['cache'],
      critical: false
    });
  }

  // Start system monitoring
  private startSystemMonitoring(): void {
    setInterval(async () => {
      this.lastSystemCheck = Date.now();
      
      // Check system metrics and create alerts if needed
      const metrics = await this.getSystemMetrics();
      
      if (metrics.cpu.usage > this.config.alertThresholds.cpuUsage) {
        this.createAlert({
          severity: 'warning',
          title: 'High CPU Usage',
          message: `CPU usage is ${metrics.cpu.usage.toFixed(1)}% (threshold: ${this.config.alertThresholds.cpuUsage}%)`,
          source: 'system_monitor'
        });
      }
      
      if (metrics.memory.percentage > this.config.alertThresholds.memoryUsage) {
        this.createAlert({
          severity: 'warning',
          title: 'High Memory Usage',
          message: `Memory usage is ${metrics.memory.percentage.toFixed(1)}% (threshold: ${this.config.alertThresholds.memoryUsage}%)`,
          source: 'system_monitor'
        });
      }
      
      if (metrics.disk.percentage > this.config.alertThresholds.diskUsage) {
        this.createAlert({
          severity: 'error',
          title: 'High Disk Usage',
          message: `Disk usage is ${metrics.disk.percentage.toFixed(1)}% (threshold: ${this.config.alertThresholds.diskUsage}%)`,
          source: 'system_monitor'
        });
      }
    }, this.config.checkInterval);
  }

  // Cleanup
  destroy(): void {
    this.timers.forEach(timer => clearInterval(timer));
    this.timers.clear();
    this.checks.clear();
    this.results.clear();
    this.metrics.clear();
    this.alerts = [];
  }
}

// Export singleton instance
export const healthMonitor = new HealthMonitoringService();

export { HealthMonitoringService };
export type {
  HealthStatus,
  AlertSeverity,
  MetricType,
  HealthCheck,
  HealthCheckResult,
  SystemHealth,
  ServiceHealth,
  SystemMetrics,
  ServiceMetrics,
  Alert,
  Metric,
  HealthMonitorConfig
};
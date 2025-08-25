// Auto-Scaling Service - Enterprise Resource Management
// Intelligent resource scaling based on metrics and demand patterns

// Types
type ScalingAction = 'scale_up' | 'scale_down' | 'maintain';
type ScalingTrigger = 'cpu' | 'memory' | 'requests' | 'response_time' | 'queue_length' | 'custom';
type ResourceType = 'api_instances' | 'worker_processes' | 'cache_nodes' | 'database_connections';

interface ScalingRule {
  id: string;
  name: string;
  description: string;
  resourceType: ResourceType;
  trigger: ScalingTrigger;
  enabled: boolean;
  conditions: ScalingCondition[];
  actions: ScalingActionConfig[];
  cooldownPeriod: number;
  priority: number;
  tags: string[];
}

interface ScalingCondition {
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
  threshold: number;
  duration: number; // How long condition must be true
  aggregation: 'avg' | 'max' | 'min' | 'sum' | 'count';
}

interface ScalingActionConfig {
  action: ScalingAction;
  amount: number; // Number of instances/resources to add/remove
  minInstances: number;
  maxInstances: number;
  stepSize: number;
  targetUtilization?: number;
}

interface ResourceMetrics {
  resourceType: ResourceType;
  currentInstances: number;
  targetInstances: number;
  utilization: {
    cpu: number;
    memory: number;
    network: number;
    requests: number;
  };
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    queueLength: number;
  };
  costs: {
    current: number;
    projected: number;
    savings: number;
  };
  timestamp: number;
}

interface ScalingEvent {
  id: string;
  timestamp: number;
  resourceType: ResourceType;
  action: ScalingAction;
  reason: string;
  ruleId: string;
  beforeInstances: number;
  afterInstances: number;
  metrics: Record<string, number>;
  success: boolean;
  error?: string;
  duration: number;
}

interface ScalingPrediction {
  resourceType: ResourceType;
  timeHorizon: number; // minutes
  predictedLoad: number;
  recommendedInstances: number;
  confidence: number;
  factors: string[];
  estimatedCost: number;
}

interface AutoScalingConfig {
  enabled: boolean;
  evaluationInterval: number;
  metricsRetentionPeriod: number;
  defaultCooldownPeriod: number;
  enablePredictiveScaling: boolean;
  enableCostOptimization: boolean;
  maxScalingEventsPerHour: number;
  emergencyScaling: {
    enabled: boolean;
    cpuThreshold: number;
    memoryThreshold: number;
    responseTimeThreshold: number;
  };
}

// Auto-Scaling Service
class AutoScalingService {
  private rules = new Map<string, ScalingRule>();
  private metrics = new Map<ResourceType, ResourceMetrics[]>();
  private events: ScalingEvent[] = [];
  private lastScalingActions = new Map<string, number>();
  private resourceInstances = new Map<ResourceType, number>();
  private evaluationTimer?: NodeJS.Timeout;
  
  private config: AutoScalingConfig = {
    enabled: true,
    evaluationInterval: 60000, // 1 minute
    metricsRetentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
    defaultCooldownPeriod: 5 * 60 * 1000, // 5 minutes
    enablePredictiveScaling: true,
    enableCostOptimization: true,
    maxScalingEventsPerHour: 10,
    emergencyScaling: {
      enabled: true,
      cpuThreshold: 90,
      memoryThreshold: 85,
      responseTimeThreshold: 10000
    }
  };

  constructor(config?: Partial<AutoScalingConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.initializeDefaultResources();
    this.initializeDefaultRules();
    
    if (this.config.enabled) {
      this.startEvaluation();
    }
  }

  // Add scaling rule
  addRule(rule: Omit<ScalingRule, 'id'>): string {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullRule: ScalingRule = { ...rule, id };
    
    this.rules.set(id, fullRule);
    
    console.log(`Auto-scaling rule added: ${fullRule.name}`);
    return id;
  }

  // Remove scaling rule
  removeRule(id: string): boolean {
    const removed = this.rules.delete(id);
    if (removed) {
      console.log(`Auto-scaling rule removed: ${id}`);
    }
    return removed;
  }

  // Update scaling rule
  updateRule(id: string, updates: Partial<ScalingRule>): boolean {
    const rule = this.rules.get(id);
    if (!rule) return false;
    
    const updatedRule = { ...rule, ...updates, id };
    this.rules.set(id, updatedRule);
    
    console.log(`Auto-scaling rule updated: ${updatedRule.name}`);
    return true;
  }

  // Record resource metrics
  recordMetrics(resourceType: ResourceType, metrics: Omit<ResourceMetrics, 'resourceType' | 'timestamp'>): void {
    const fullMetrics: ResourceMetrics = {
      ...metrics,
      resourceType,
      timestamp: Date.now()
    };
    
    const resourceMetrics = this.metrics.get(resourceType) || [];
    resourceMetrics.push(fullMetrics);
    
    // Keep only recent metrics
    const cutoff = Date.now() - this.config.metricsRetentionPeriod;
    const filteredMetrics = resourceMetrics.filter(m => m.timestamp > cutoff);
    
    this.metrics.set(resourceType, filteredMetrics);
  }

  // Get current resource metrics
  getCurrentMetrics(resourceType: ResourceType): ResourceMetrics | null {
    const metrics = this.metrics.get(resourceType);
    if (!metrics || metrics.length === 0) return null;
    
    return metrics[metrics.length - 1];
  }

  // Get scaling predictions
  async getPredictions(resourceType: ResourceType, timeHorizon: number = 60): Promise<ScalingPrediction> {
    const metrics = this.metrics.get(resourceType) || [];
    const currentInstances = this.resourceInstances.get(resourceType) || 1;
    
    if (metrics.length < 10) {
      // Not enough data for prediction
      return {
        resourceType,
        timeHorizon,
        predictedLoad: 50, // Default assumption
        recommendedInstances: currentInstances,
        confidence: 0.3,
        factors: ['insufficient_data'],
        estimatedCost: currentInstances * 10 // $10 per instance per hour
      };
    }
    
    // Simple trend analysis (in real implementation, use ML models)
    const recentMetrics = metrics.slice(-10);
    const avgCpu = recentMetrics.reduce((sum, m) => sum + m.utilization.cpu, 0) / recentMetrics.length;
    const avgMemory = recentMetrics.reduce((sum, m) => sum + m.utilization.memory, 0) / recentMetrics.length;
    const avgRequests = recentMetrics.reduce((sum, m) => sum + m.utilization.requests, 0) / recentMetrics.length;
    
    // Predict load based on trends
    const cpuTrend = this.calculateTrend(recentMetrics.map(m => m.utilization.cpu));
    const memoryTrend = this.calculateTrend(recentMetrics.map(m => m.utilization.memory));
    const requestsTrend = this.calculateTrend(recentMetrics.map(m => m.utilization.requests));
    
    const predictedCpu = Math.max(0, Math.min(100, avgCpu + (cpuTrend * timeHorizon / 60)));
    const predictedMemory = Math.max(0, Math.min(100, avgMemory + (memoryTrend * timeHorizon / 60)));
    const predictedRequests = Math.max(0, avgRequests + (requestsTrend * timeHorizon / 60));
    
    const predictedLoad = Math.max(predictedCpu, predictedMemory);
    
    // Calculate recommended instances
    let recommendedInstances = currentInstances;
    if (predictedLoad > 80) {
      recommendedInstances = Math.ceil(currentInstances * (predictedLoad / 70));
    } else if (predictedLoad < 30) {
      recommendedInstances = Math.max(1, Math.floor(currentInstances * (predictedLoad / 50)));
    }
    
    const factors = [];
    if (Math.abs(cpuTrend) > 5) factors.push('cpu_trend');
    if (Math.abs(memoryTrend) > 5) factors.push('memory_trend');
    if (Math.abs(requestsTrend) > 10) factors.push('requests_trend');
    
    return {
      resourceType,
      timeHorizon,
      predictedLoad,
      recommendedInstances: Math.max(1, Math.min(20, recommendedInstances)),
      confidence: Math.min(0.9, metrics.length / 100),
      factors: factors.length > 0 ? factors : ['stable_load'],
      estimatedCost: recommendedInstances * 10 * (timeHorizon / 60)
    };
  }

  // Calculate trend from data points
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
    const sumX2 = values.reduce((sum, _, index) => sum + (index * index), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope || 0;
  }

  // Start evaluation loop
  private startEvaluation(): void {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
    }
    
    this.evaluationTimer = setInterval(() => {
      this.evaluateScalingRules();
    }, this.config.evaluationInterval);
    
    console.log('Auto-scaling evaluation started');
  }

  // Stop evaluation loop
  stopEvaluation(): void {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
      this.evaluationTimer = undefined;
    }
    
    console.log('Auto-scaling evaluation stopped');
  }

  // Evaluate all scaling rules
  private async evaluateScalingRules(): Promise<void> {
    if (!this.config.enabled) return;
    
    const now = Date.now();
    const recentEvents = this.events.filter(e => now - e.timestamp < 60 * 60 * 1000); // Last hour
    
    // Check if we've exceeded max scaling events per hour
    if (recentEvents.length >= this.config.maxScalingEventsPerHour) {
      console.warn('Max scaling events per hour reached, skipping evaluation');
      return;
    }
    
    // Evaluate each rule
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      
      // Check cooldown period
      const lastAction = this.lastScalingActions.get(rule.id);
      if (lastAction && (now - lastAction) < rule.cooldownPeriod) {
        continue;
      }
      
      await this.evaluateRule(rule);
    }
    
    // Check emergency scaling
    if (this.config.emergencyScaling.enabled) {
      await this.checkEmergencyScaling();
    }
  }

  // Evaluate single scaling rule
  private async evaluateRule(rule: ScalingRule): Promise<void> {
    const metrics = this.getCurrentMetrics(rule.resourceType);
    if (!metrics) return;
    
    // Check all conditions
    const conditionsMet = rule.conditions.every(condition => {
      return this.evaluateCondition(condition, metrics, rule.resourceType);
    });
    
    if (!conditionsMet) return;
    
    // Execute scaling actions
    for (const actionConfig of rule.actions) {
      await this.executeScalingAction(rule, actionConfig, metrics);
    }
  }

  // Evaluate single condition
  private evaluateCondition(condition: ScalingCondition, currentMetrics: ResourceMetrics, resourceType: ResourceType): boolean {
    let value: number;
    
    // Get metric value
    switch (condition.metric) {
      case 'cpu':
        value = currentMetrics.utilization.cpu;
        break;
      case 'memory':
        value = currentMetrics.utilization.memory;
        break;
      case 'requests':
        value = currentMetrics.utilization.requests;
        break;
      case 'response_time':
        value = currentMetrics.performance.responseTime;
        break;
      case 'error_rate':
        value = currentMetrics.performance.errorRate;
        break;
      case 'queue_length':
        value = currentMetrics.performance.queueLength;
        break;
      default:
        return false;
    }
    
    // Apply aggregation if needed (simplified - in real implementation, look at historical data)
    if (condition.aggregation !== 'avg') {
      const historicalMetrics = this.metrics.get(resourceType) || [];
      const recentValues = historicalMetrics
        .filter(m => Date.now() - m.timestamp <= condition.duration)
        .map(m => {
          switch (condition.metric) {
            case 'cpu': return m.utilization.cpu;
            case 'memory': return m.utilization.memory;
            case 'requests': return m.utilization.requests;
            case 'response_time': return m.performance.responseTime;
            case 'error_rate': return m.performance.errorRate;
            case 'queue_length': return m.performance.queueLength;
            default: return 0;
          }
        });
      
      if (recentValues.length === 0) return false;
      
      switch (condition.aggregation) {
        case 'max':
          value = Math.max(...recentValues);
          break;
        case 'min':
          value = Math.min(...recentValues);
          break;
        case 'sum':
          value = recentValues.reduce((sum, val) => sum + val, 0);
          break;
        case 'count':
          value = recentValues.length;
          break;
      }
    }
    
    // Evaluate condition
    switch (condition.operator) {
      case 'gt': return value > condition.threshold;
      case 'gte': return value >= condition.threshold;
      case 'lt': return value < condition.threshold;
      case 'lte': return value <= condition.threshold;
      case 'eq': return value === condition.threshold;
      case 'neq': return value !== condition.threshold;
      default: return false;
    }
  }

  // Execute scaling action
  private async executeScalingAction(rule: ScalingRule, actionConfig: ScalingActionConfig, metrics: ResourceMetrics): Promise<void> {
    const currentInstances = this.resourceInstances.get(rule.resourceType) || 1;
    let targetInstances = currentInstances;
    
    switch (actionConfig.action) {
      case 'scale_up':
        targetInstances = Math.min(
          actionConfig.maxInstances,
          currentInstances + actionConfig.amount
        );
        break;
      case 'scale_down':
        targetInstances = Math.max(
          actionConfig.minInstances,
          currentInstances - actionConfig.amount
        );
        break;
      case 'maintain':
        targetInstances = currentInstances;
        break;
    }
    
    if (targetInstances === currentInstances) return;
    
    // Create scaling event
    const event: ScalingEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      resourceType: rule.resourceType,
      action: actionConfig.action,
      reason: `Rule: ${rule.name}`,
      ruleId: rule.id,
      beforeInstances: currentInstances,
      afterInstances: targetInstances,
      metrics: {
        cpu: metrics.utilization.cpu,
        memory: metrics.utilization.memory,
        requests: metrics.utilization.requests,
        responseTime: metrics.performance.responseTime
      },
      success: false,
      duration: 0
    };
    
    const startTime = Date.now();
    
    try {
      // Execute scaling (simulate)
      await this.scaleResource(rule.resourceType, targetInstances);
      
      event.success = true;
      event.duration = Date.now() - startTime;
      
      // Update last action time
      this.lastScalingActions.set(rule.id, Date.now());
      
      console.log(`Scaling executed: ${rule.resourceType} from ${currentInstances} to ${targetInstances} instances`);
      
    } catch (error) {
      event.success = false;
      event.error = error instanceof Error ? error.message : String(error);
      event.duration = Date.now() - startTime;
      
      console.error(`Scaling failed: ${event.error}`);
    }
    
    this.events.push(event);
    
    // Emit scaling event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('scalingEvent', {
        detail: event
      }));
    }
  }

  // Scale resource (simulate)
  private async scaleResource(resourceType: ResourceType, targetInstances: number): Promise<void> {
    // Simulate scaling delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
    
    // Update instance count
    this.resourceInstances.set(resourceType, targetInstances);
    
    // In real implementation, this would call cloud provider APIs
    console.log(`Scaled ${resourceType} to ${targetInstances} instances`);
  }

  // Check emergency scaling conditions
  private async checkEmergencyScaling(): Promise<void> {
    for (const [resourceType, metrics] of this.metrics.entries()) {
      const currentMetrics = metrics[metrics.length - 1];
      if (!currentMetrics) continue;
      
      const { emergencyScaling } = this.config;
      
      // Check emergency conditions
      const emergencyConditions = [
        currentMetrics.utilization.cpu > emergencyScaling.cpuThreshold,
        currentMetrics.utilization.memory > emergencyScaling.memoryThreshold,
        currentMetrics.performance.responseTime > emergencyScaling.responseTimeThreshold
      ];
      
      if (emergencyConditions.some(condition => condition)) {
        const currentInstances = this.resourceInstances.get(resourceType) || 1;
        const targetInstances = Math.min(20, currentInstances * 2); // Double instances, max 20
        
        console.warn(`Emergency scaling triggered for ${resourceType}`);
        
        const event: ScalingEvent = {
          id: `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          resourceType,
          action: 'scale_up',
          reason: 'Emergency scaling - critical resource utilization',
          ruleId: 'emergency',
          beforeInstances: currentInstances,
          afterInstances: targetInstances,
          metrics: {
            cpu: currentMetrics.utilization.cpu,
            memory: currentMetrics.utilization.memory,
            requests: currentMetrics.utilization.requests,
            responseTime: currentMetrics.performance.responseTime
          },
          success: false,
          duration: 0
        };
        
        try {
          const startTime = Date.now();
          await this.scaleResource(resourceType, targetInstances);
          
          event.success = true;
          event.duration = Date.now() - startTime;
        } catch (error) {
          event.success = false;
          event.error = error instanceof Error ? error.message : String(error);
        }
        
        this.events.push(event);
      }
    }
  }

  // Get scaling events
  getScalingEvents(limit?: number): ScalingEvent[] {
    const events = [...this.events].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? events.slice(0, limit) : events;
  }

  // Get resource status
  getResourceStatus(): Record<ResourceType, { instances: number; metrics?: ResourceMetrics }> {
    const status: Record<string, any> = {};
    
    for (const resourceType of this.resourceInstances.keys()) {
      status[resourceType] = {
        instances: this.resourceInstances.get(resourceType) || 0,
        metrics: this.getCurrentMetrics(resourceType)
      };
    }
    
    return status as Record<ResourceType, { instances: number; metrics?: ResourceMetrics }>;
  }

  // Initialize default resources
  private initializeDefaultResources(): void {
    this.resourceInstances.set('api_instances', 2);
    this.resourceInstances.set('worker_processes', 1);
    this.resourceInstances.set('cache_nodes', 1);
    this.resourceInstances.set('database_connections', 10);
  }

  // Initialize default scaling rules
  private initializeDefaultRules(): void {
    // CPU-based scaling for API instances
    this.addRule({
      name: 'API CPU Scaling',
      description: 'Scale API instances based on CPU utilization',
      resourceType: 'api_instances',
      trigger: 'cpu',
      enabled: true,
      conditions: [
        {
          metric: 'cpu',
          operator: 'gt',
          threshold: 70,
          duration: 2 * 60 * 1000, // 2 minutes
          aggregation: 'avg'
        }
      ],
      actions: [
        {
          action: 'scale_up',
          amount: 1,
          minInstances: 1,
          maxInstances: 10,
          stepSize: 1
        }
      ],
      cooldownPeriod: 5 * 60 * 1000, // 5 minutes
      priority: 1,
      tags: ['cpu', 'api']
    });
    
    // Memory-based scaling for worker processes
    this.addRule({
      name: 'Worker Memory Scaling',
      description: 'Scale worker processes based on memory usage',
      resourceType: 'worker_processes',
      trigger: 'memory',
      enabled: true,
      conditions: [
        {
          metric: 'memory',
          operator: 'gt',
          threshold: 80,
          duration: 3 * 60 * 1000, // 3 minutes
          aggregation: 'avg'
        }
      ],
      actions: [
        {
          action: 'scale_up',
          amount: 1,
          minInstances: 1,
          maxInstances: 5,
          stepSize: 1
        }
      ],
      cooldownPeriod: 10 * 60 * 1000, // 10 minutes
      priority: 2,
      tags: ['memory', 'worker']
    });
    
    // Response time-based scaling
    this.addRule({
      name: 'Response Time Scaling',
      description: 'Scale based on response time degradation',
      resourceType: 'api_instances',
      trigger: 'response_time',
      enabled: true,
      conditions: [
        {
          metric: 'response_time',
          operator: 'gt',
          threshold: 2000, // 2 seconds
          duration: 1 * 60 * 1000, // 1 minute
          aggregation: 'avg'
        }
      ],
      actions: [
        {
          action: 'scale_up',
          amount: 2,
          minInstances: 1,
          maxInstances: 15,
          stepSize: 2
        }
      ],
      cooldownPeriod: 3 * 60 * 1000, // 3 minutes
      priority: 3,
      tags: ['response_time', 'performance']
    });
  }

  // Cleanup
  destroy(): void {
    this.stopEvaluation();
    this.rules.clear();
    this.metrics.clear();
    this.events = [];
    this.lastScalingActions.clear();
    this.resourceInstances.clear();
  }
}

// Export singleton instance
export const autoScaler = new AutoScalingService();

export { AutoScalingService };
export type {
  ScalingAction,
  ScalingTrigger,
  ResourceType,
  ScalingRule,
  ScalingCondition,
  ScalingActionConfig,
  ResourceMetrics,
  ScalingEvent,
  ScalingPrediction,
  AutoScalingConfig
};
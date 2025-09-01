import React, { useState } from 'react';
import { Activity, Zap, Clock, MemoryStick, TrendingUp, AlertTriangle } from 'lucide-react';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { cn } from '../utils/cn';

interface PerformanceMonitorProps {
  enabled?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  compact?: boolean;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  enabled = process.env.NODE_ENV === 'development',
  position = 'bottom-right',
  compact = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    metrics,
    isLoading,
    fps,
    renderTime,
    componentCount,
    performanceGrade,
    recommendations,
    refresh
  } = usePerformanceMonitor(enabled);

  if (!enabled || !metrics) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-400';
      case 'B': return 'text-blue-400';
      case 'C': return 'text-yellow-400';
      case 'D': return 'text-orange-400';
      case 'F': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const formatTime = (time: number) => {
    if (time < 1000) return `${Math.round(time)}ms`;
    return `${(time / 1000).toFixed(1)}s`;
  };

  const formatBytes = (bytes: number) => {
    return `${bytes}MB`;
  };

  if (compact) {
    return (
      <div className={cn(
        'fixed z-50 bg-black/80 backdrop-blur-sm rounded-lg p-2 text-xs text-white border border-white/20',
        positionClasses[position]
      )}>
        <div className="flex items-center space-x-2">
          <div className={cn('font-bold', getGradeColor(performanceGrade))}>
            {performanceGrade}
          </div>
          <div className="text-green-400">{fps} FPS</div>
          {metrics.memory && (
            <div className="text-blue-400">
              {formatBytes(metrics.memory.used)}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'fixed z-50 bg-black/90 backdrop-blur-sm rounded-lg border border-white/20 text-white transition-all duration-300',
      positionClasses[position],
      isExpanded ? 'w-80' : 'w-16 h-16'
    )}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute top-2 right-2 p-2 hover:bg-white/10 rounded-lg transition-colors"
      >
        <Activity className="w-4 h-4" />
      </button>

      {isExpanded ? (
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Performance Monitor</h3>
            <div className="flex items-center space-x-2">
              <span className={cn('font-bold text-lg', getGradeColor(performanceGrade))}>
                {performanceGrade}
              </span>
              <button
                onClick={refresh}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title="Refresh metrics"
              >
                <TrendingUp className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Core Metrics */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white/5 rounded-lg p-2">
              <div className="flex items-center space-x-1 mb-1">
                <Zap className="w-3 h-3 text-green-400" />
                <span className="text-gray-300">FPS</span>
              </div>
              <div className="font-mono text-green-400">{fps}</div>
            </div>

            <div className="bg-white/5 rounded-lg p-2">
              <div className="flex items-center space-x-1 mb-1">
                <Clock className="w-3 h-3 text-blue-400" />
                <span className="text-gray-300">FCP</span>
              </div>
              <div className="font-mono text-blue-400">
                {formatTime(metrics.firstContentfulPaint)}
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-2">
              <div className="flex items-center space-x-1 mb-1">
                <Clock className="w-3 h-3 text-yellow-400" />
                <span className="text-gray-300">DCL</span>
              </div>
              <div className="font-mono text-yellow-400">
                {formatTime(metrics.domContentLoaded)}
              </div>
            </div>

            {metrics.memory && (
              <div className="bg-white/5 rounded-lg p-2">
                <div className="flex items-center space-x-1 mb-1">
                  <MemoryStick className="w-3 h-3 text-purple-400" />
                  <span className="text-gray-300">Memory</span>
                </div>
                <div className="font-mono text-purple-400">
                  {formatBytes(metrics.memory.used)}
                </div>
              </div>
            )}
          </div>

          {/* Render Performance */}
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-xs text-gray-300 mb-1">Render Performance</div>
            <div className="flex justify-between text-xs">
              <span>Max Render Time:</span>
              <span className="font-mono">{renderTime.toFixed(2)}ms</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Components Rendered:</span>
              <span className="font-mono">{componentCount}</span>
            </div>
          </div>

          {/* Network Timing */}
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-xs text-gray-300 mb-1">Network Timing</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>DNS Lookup:</span>
                <span className="font-mono">{formatTime(metrics.dnsLookup)}</span>
              </div>
              <div className="flex justify-between">
                <span>TCP Connect:</span>
                <span className="font-mono">{formatTime(metrics.tcpConnect)}</span>
              </div>
              <div className="flex justify-between">
                <span>Server Response:</span>
                <span className="font-mono">{formatTime(metrics.serverResponse)}</span>
              </div>
            </div>
          </div>

          {/* Memory Details */}
          {metrics.memory && (
            <div className="bg-white/5 rounded-lg p-2">
              <div className="text-xs text-gray-300 mb-1">Memory Usage</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Used:</span>
                  <span className="font-mono">{formatBytes(metrics.memory.used)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total:</span>
                  <span className="font-mono">{formatBytes(metrics.memory.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Limit:</span>
                  <span className="font-mono">{formatBytes(metrics.memory.limit)}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
                  <div 
                    className="bg-purple-400 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${(metrics.memory.used / metrics.memory.limit) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2">
              <div className="flex items-center space-x-1 mb-2">
                <AlertTriangle className="w-3 h-3 text-orange-400" />
                <span className="text-xs text-orange-400 font-medium">Recommendations</span>
              </div>
              <div className="space-y-1">
                {recommendations.slice(0, 2).map((rec, index) => (
                  <div key={index} className="text-xs text-orange-200">
                    • {rec}
                  </div>
                ))}
                {recommendations.length > 2 && (
                  <div className="text-xs text-orange-300">
                    +{recommendations.length - 2} more...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className={cn('font-bold text-lg', getGradeColor(performanceGrade))}>
            {performanceGrade}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;
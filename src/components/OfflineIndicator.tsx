import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Download, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

interface OfflineIndicatorProps {
  className?: string;
}

interface NetworkStats {
  downloadSpeed: number;
  uploadSpeed: number;
  latency: number;
  effectiveType: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ className = '' }) => {
  const { isOnline } = usePWA();
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Show indicator when offline or when connection changes
  useEffect(() => {
    if (!isOnline) {
      setIsVisible(true);
      setLastOnlineTime(new Date());
    } else {
      setReconnectAttempts(0);
      setIsReconnecting(false);
      // Show briefly when coming back online
      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 3000);
    }
  }, [isOnline]);

  // Get network information if available
  useEffect(() => {
    const updateNetworkInfo = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          setNetworkStats({
            downloadSpeed: connection.downlink || 0,
            uploadSpeed: connection.uplink || 0,
            latency: connection.rtt || 0,
            effectiveType: connection.effectiveType || 'unknown'
          });
        }
      }
    };

    updateNetworkInfo();
    
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection?.addEventListener('change', updateNetworkInfo);
      
      return () => {
        connection?.removeEventListener('change', updateNetworkInfo);
      };
    }
  }, []);

  // Auto-reconnect attempts when offline
  useEffect(() => {
    if (!isOnline && !isReconnecting) {
      const interval = setInterval(() => {
        setIsReconnecting(true);
        setReconnectAttempts(prev => prev + 1);
        
        // Simulate connection check
        fetch('/api/health', { 
          method: 'HEAD',
          cache: 'no-cache'
        })
        .then(() => {
          // Connection restored - this will be handled by the online event
        })
        .catch(() => {
          // Still offline
          setIsReconnecting(false);
        });
      }, 10000); // Try every 10 seconds

      return () => clearInterval(interval);
    }
  }, [isOnline, isReconnecting]);

  const getConnectionQuality = () => {
    if (!networkStats) return 'unknown';
    
    const { downloadSpeed, latency } = networkStats;
    
    if (downloadSpeed >= 10 && latency < 100) return 'excellent';
    if (downloadSpeed >= 5 && latency < 200) return 'good';
    if (downloadSpeed >= 1 && latency < 500) return 'fair';
    return 'poor';
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const formatSpeed = (speed: number) => {
    if (speed >= 1) return `${speed.toFixed(1)} Mbps`;
    return `${(speed * 1000).toFixed(0)} Kbps`;
  };

  const getTimeSinceOffline = () => {
    if (!lastOnlineTime) return '';
    
    const now = new Date();
    const diff = now.getTime() - lastOnlineTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s ago`;
    }
    return `${seconds}s ago`;
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={`fixed top-4 right-4 z-50 ${className}`}
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className={`
          px-4 py-3 rounded-xl shadow-lg backdrop-blur-lg border
          ${isOnline 
            ? 'bg-green-50/90 dark:bg-green-900/20 border-green-200/50 dark:border-green-700/50' 
            : 'bg-red-50/90 dark:bg-red-900/20 border-red-200/50 dark:border-red-700/50'
          }
        `}>
          <div className="flex items-center gap-3">
            {/* Connection Icon */}
            <motion.div
              animate={{ 
                rotate: isReconnecting ? 360 : 0,
                scale: isReconnecting ? [1, 1.1, 1] : 1
              }}
              transition={{ 
                rotate: { duration: 1, repeat: isReconnecting ? Infinity : 0 },
                scale: { duration: 0.5, repeat: isReconnecting ? Infinity : 0 }
              }}
            >
              {isOnline ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : isReconnecting ? (
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
            </motion.div>

            {/* Status Text */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${
                  isOnline 
                    ? 'text-green-800 dark:text-green-200' 
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {isOnline ? 'Online' : isReconnecting ? 'Reconnecting...' : 'Offline'}
                </span>
                
                {!isOnline && reconnectAttempts > 0 && (
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    (Attempt {reconnectAttempts})
                  </span>
                )}
              </div>
              
              {!isOnline && lastOnlineTime && (
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Last seen: {getTimeSinceOffline()}
                </span>
              )}
            </div>

            {/* Network Stats (when online) */}
            {isOnline && networkStats && (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-300 dark:border-gray-600">
                <div className="flex items-center gap-1">
                  <Download className="w-3 h-3 text-gray-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {formatSpeed(networkStats.downloadSpeed)}
                  </span>
                </div>
                
                {networkStats.uploadSpeed > 0 && (
                  <div className="flex items-center gap-1">
                    <Upload className="w-3 h-3 text-gray-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {formatSpeed(networkStats.uploadSpeed)}
                    </span>
                  </div>
                )}
                
                <div className={`w-2 h-2 rounded-full ${getQualityColor(getConnectionQuality())}`} />
              </div>
            )}
          </div>

          {/* Additional Info */}
          {!isOnline && (
            <motion.div
              className="mt-2 pt-2 border-t border-red-200/50 dark:border-red-700/50"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-xs text-red-700 dark:text-red-300">
                Some features may be limited. Changes will sync when connection is restored.
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OfflineIndicator;
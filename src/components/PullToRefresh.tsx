import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ChevronDown } from 'lucide-react';
import { useGestures } from '../hooks/useGestures';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  threshold?: number;
  maxPullDistance?: number;
  refreshingText?: string;
  pullText?: string;
  releaseText?: string;
  className?: string;
  disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 80,
  maxPullDistance = 120,
  refreshingText = 'Refreshing...',
  pullText = 'Pull to refresh',
  releaseText = 'Release to refresh',
  className = '',
  disabled = false
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [canRefresh, setCanRefresh] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);

  // Handle pull-to-refresh gesture
  const { ref: gestureRef, pullProgress } = useGestures({
    onPullToRefresh: async () => {
      if (disabled || isRefreshing) return;
      
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        setCanRefresh(false);
      }
    },
    pullThreshold: threshold,
    enabled: !disabled && !isRefreshing
  });

  // Handle touch events for custom pull behavior
  const handleTouchStart = (e: TouchEvent) => {
    if (disabled || isRefreshing || window.scrollY > 0) return;
    
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging.current || disabled || isRefreshing) return;
    
    currentY.current = e.touches[0].clientY;
    const deltaY = currentY.current - startY.current;
    
    if (deltaY > 0 && window.scrollY === 0) {
      e.preventDefault();
      
      // Apply resistance curve for natural feel
      const resistance = Math.min(deltaY / 2.5, maxPullDistance);
      const progress = Math.min(resistance / threshold, 1);
      
      setPullDistance(resistance);
      setCanRefresh(resistance >= threshold);
      
      // Add haptic feedback at threshold
      if (resistance >= threshold && !canRefresh && 'vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }
  };

  const handleTouchEnd = async () => {
    if (!isDragging.current) return;
    
    isDragging.current = false;
    
    if (canRefresh && !isRefreshing && !disabled) {
      setIsRefreshing(true);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    // Animate back to original position
    setPullDistance(0);
    setCanRefresh(false);
  };

  // Bind touch events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, isRefreshing, canRefresh, threshold, maxPullDistance]);

  // Calculate animation values
  const localPullProgress = Math.min(pullDistance / threshold, 1);
  const iconRotation = localPullProgress * 180;
  const iconScale = 0.8 + (localPullProgress * 0.4);
  const refresherOpacity = Math.min(pullDistance / 40, 1);

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
    >
      {/* Pull-to-refresh indicator */}
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            className="absolute top-0 left-0 right-0 z-10 flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-transparent dark:from-blue-900/20 dark:to-transparent"
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: isRefreshing ? 80 : Math.min(pullDistance, maxPullDistance),
              opacity: refresherOpacity
            }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="flex flex-col items-center justify-center py-4">
              {/* Refresh Icon */}
              <motion.div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  canRefresh 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
                animate={{
                  rotate: isRefreshing ? 360 : iconRotation,
                  scale: iconScale
                }}
                transition={{
                  rotate: isRefreshing 
                    ? { duration: 1, repeat: Infinity, ease: 'linear' }
                    : { type: 'spring', stiffness: 300, damping: 30 },
                  scale: { type: 'spring', stiffness: 300, damping: 30 }
                }}
              >
                {isRefreshing ? (
                  <RefreshCw size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </motion.div>
              
              {/* Status Text */}
              <motion.p
                className={`text-sm font-medium mt-2 transition-colors ${
                  canRefresh
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
                animate={{ opacity: refresherOpacity }}
              >
                {isRefreshing 
                  ? refreshingText 
                  : canRefresh 
                    ? releaseText 
                    : pullText
                }
              </motion.p>
              
              {/* Progress Indicator */}
              {!isRefreshing && (
                <motion.div
                  className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-2 overflow-hidden"
                  animate={{ opacity: refresherOpacity }}
                >
                  <motion.div
                    className={`h-full rounded-full transition-colors ${
                      canRefresh
                        ? 'bg-blue-500'
                        : 'bg-gray-400 dark:bg-gray-500'
                    }`}
                    animate={{ width: `${pullProgress * 100}%` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Content */}
      <motion.div
        ref={gestureRef}
        animate={{
          y: isRefreshing ? 80 : Math.min(pullDistance * 0.5, maxPullDistance * 0.5)
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative z-0"
      >
        {children}
      </motion.div>
      
      {/* Loading Overlay */}
      <AnimatePresence>
        {isRefreshing && (
          <motion.div
            className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-blue-50/80 to-transparent dark:from-blue-900/40 dark:to-transparent backdrop-blur-sm z-20 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <RefreshCw size={16} />
              </motion.div>
              <span className="text-sm font-medium">{refreshingText}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PullToRefresh;